import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { WorkspaceStatus } from "@/generated/prisma/enums";

type LifecycleWorkspace = {
  id: string;
  status: WorkspaceStatus;
  expiresAt: Date | null;
  purgeAt: Date | null;
};

export type WorkspaceAccessState = {
  status: WorkspaceStatus;
  writable: boolean;
  message: string;
};

export type WorkspaceLifecycleReport = {
  lockedCount: number;
  purgePendingCount: number;
  purgedCount: number;
};

const MAX_LIFECYCLE_BATCH_SIZE = 100;

function hasReached(date: Date | null, now: Date): boolean {
  return date !== null && date <= now;
}

export function getEffectiveWorkspaceStatus(
  workspace: Pick<LifecycleWorkspace, "status" | "expiresAt" | "purgeAt">,
  now = new Date(),
): WorkspaceStatus {
  if (workspace.status === "PURGED" || hasReached(workspace.purgeAt, now)) {
    return "PURGED";
  }

  if (workspace.status === "PURGE_PENDING") {
    return "PURGE_PENDING";
  }

  if (workspace.status === "READ_ONLY" || hasReached(workspace.expiresAt, now)) {
    return "READ_ONLY";
  }

  return workspace.status;
}

export function getWorkspaceAccessState(
  workspace: Pick<LifecycleWorkspace, "status" | "expiresAt" | "purgeAt">,
  now = new Date(),
): WorkspaceAccessState {
  const status = getEffectiveWorkspaceStatus(workspace, now);

  switch (status) {
    case "ACTIVE":
      return { status, writable: true, message: "Bản dùng thử đang hoạt động." };
    case "READ_ONLY":
      return {
        status,
        writable: false,
        message: "Bản dùng thử đã hết hạn và chỉ còn chế độ xem.",
      };
    case "PURGE_PENDING":
      return {
        status,
        writable: false,
        message: "Dữ liệu bản dùng thử đang chờ xóa theo chính sách.",
      };
    case "PURGED":
      return {
        status,
        writable: false,
        message: "Bản dùng thử đã kết thúc và dữ liệu nghiệp vụ đã được xóa.",
      };
    case "ONBOARDING":
      return {
        status,
        writable: false,
        message: "Hãy hoàn tất khởi tạo kho trước khi sử dụng.",
      };
  }
}

export class WorkspaceWriteDeniedError extends Error {
  readonly code = "WORKSPACE_NOT_WRITABLE";

  constructor(readonly access: WorkspaceAccessState) {
    super(access.message);
  }
}

export function assertWorkspaceWritable(
  workspace: Pick<LifecycleWorkspace, "status" | "expiresAt" | "purgeAt">,
  now = new Date(),
): void {
  const access = getWorkspaceAccessState(workspace, now);

  if (!access.writable) {
    throw new WorkspaceWriteDeniedError(access);
  }
}

async function lockWorkspace(
  database: PrismaClient,
  workspace: LifecycleWorkspace,
  now: Date,
): Promise<boolean> {
  return database.$transaction(async (transaction) => {
    const updated = await transaction.workspace.updateMany({
      where: {
        id: workspace.id,
        status: "ACTIVE",
        expiresAt: { lte: now },
      },
      data: {
        status: "READ_ONLY",
        lockedAt: now,
        version: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      return false;
    }

    await transaction.locationCodeRegistry.deleteMany({ where: { workspaceId: workspace.id } });
    await transaction.slot.deleteMany({ where: { workspaceId: workspace.id } });
    await transaction.rackLevel.deleteMany({ where: { workspaceId: workspace.id } });
    await transaction.rack.deleteMany({ where: { workspaceId: workspace.id } });
    await transaction.zone.deleteMany({ where: { workspaceId: workspace.id } });
    await transaction.warehouse.deleteMany({ where: { workspaceId: workspace.id } });

    await transaction.auditLog.create({
      data: {
        workspaceId: workspace.id,
        action: "workspace.trial.lock",
        resource: "workspace",
        resourceId: workspace.id,
        result: "SUCCESS",
        before: { status: "ACTIVE" },
        after: { status: "READ_ONLY", lockedAt: now.toISOString() },
        metadata: { source: "workspace-lifecycle-job" },
      },
    });

    return true;
  });
}

async function markWorkspaceForPurge(
  database: PrismaClient,
  workspace: LifecycleWorkspace,
  now: Date,
): Promise<boolean> {
  return database.$transaction(async (transaction) => {
    const updated = await transaction.workspace.updateMany({
      where: {
        id: workspace.id,
        status: "READ_ONLY",
        purgeAt: { lte: now },
      },
      data: {
        status: "PURGE_PENDING",
        version: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      return false;
    }

    await transaction.auditLog.create({
      data: {
        workspaceId: workspace.id,
        action: "workspace.trial.purge_pending",
        resource: "workspace",
        resourceId: workspace.id,
        result: "SUCCESS",
        before: { status: "READ_ONLY" },
        after: { status: "PURGE_PENDING" },
        metadata: { source: "workspace-lifecycle-job" },
      },
    });

    return true;
  });
}

async function completeWorkspacePurge(
  database: PrismaClient,
  workspace: LifecycleWorkspace,
  now: Date,
): Promise<boolean> {
  return database.$transaction(async (transaction) => {
    const updated = await transaction.workspace.updateMany({
      where: {
        id: workspace.id,
        status: "PURGE_PENDING",
        purgeAt: { lte: now },
      },
      data: {
        status: "PURGED",
        purgedAt: now,
        version: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      return false;
    }

    await transaction.auditLog.create({
      data: {
        workspaceId: workspace.id,
        action: "workspace.trial.purge_complete",
        resource: "workspace",
        resourceId: workspace.id,
        result: "SUCCESS",
        before: { status: "PURGE_PENDING" },
        after: { status: "PURGED", purgedAt: now.toISOString() },
        metadata: {
          source: "workspace-lifecycle-job",
          domainDataPurge: "warehouse-hierarchy",
        },
      },
    });

    return true;
  });
}

export async function processDueWorkspaceLifecycle(
  database: PrismaClient,
  now = new Date(),
  batchSize = MAX_LIFECYCLE_BATCH_SIZE,
): Promise<WorkspaceLifecycleReport> {
  const take = Math.min(Math.max(batchSize, 1), MAX_LIFECYCLE_BATCH_SIZE);
  const select = { id: true, status: true, expiresAt: true, purgeAt: true } as const;

  const activeWorkspaces = await database.workspace.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    select,
    orderBy: { expiresAt: "asc" },
    take,
  });
  let lockedCount = 0;

  for (const workspace of activeWorkspaces) {
    if (await lockWorkspace(database, workspace, now)) {
      lockedCount += 1;
    }
  }

  const readOnlyWorkspaces = await database.workspace.findMany({
    where: { status: "READ_ONLY", purgeAt: { lte: now } },
    select,
    orderBy: { purgeAt: "asc" },
    take,
  });
  let purgePendingCount = 0;

  for (const workspace of readOnlyWorkspaces) {
    if (await markWorkspaceForPurge(database, workspace, now)) {
      purgePendingCount += 1;
    }
  }

  const purgePendingWorkspaces = await database.workspace.findMany({
    where: { status: "PURGE_PENDING", purgeAt: { lte: now } },
    select,
    orderBy: { purgeAt: "asc" },
    take,
  });
  let purgedCount = 0;

  for (const workspace of purgePendingWorkspaces) {
    if (await completeWorkspacePurge(database, workspace, now)) {
      purgedCount += 1;
    }
  }

  return { lockedCount, purgePendingCount, purgedCount };
}
