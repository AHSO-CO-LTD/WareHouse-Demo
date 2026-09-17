import "server-only";

import { db } from "@/lib/server/db";
import { assertWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import type { Prisma } from "@/generated/prisma/client";
import type { LocationCodeKind, StorageClass } from "@/generated/prisma/enums";

type NodeKind = "warehouse" | "zone" | "rack" | "level" | "slot";
type Parent = { id: string; storageClass: StorageClass | null };
type SlotPlan = { sequence: number; slotCount: number };

const nodeLabel: Record<NodeKind, string> = {
  warehouse: "kho",
  zone: "phân khu",
  rack: "kệ",
  level: "tầng kệ",
  slot: "ô chứa",
};

const locationCodeKind: Record<NodeKind, LocationCodeKind> = {
  warehouse: "WAREHOUSE",
  zone: "ZONE",
  rack: "RACK",
  level: "RACK_LEVEL",
  slot: "SLOT",
};

export class WarehouseDomainError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

function enforceStorageClass(parent: Parent | null, storageClass: StorageClass | null) {
  if (parent?.storageClass && storageClass && parent.storageClass !== storageClass) {
    throw new WarehouseDomainError("STORAGE_CLASS_MISMATCH", "Phân loại tải của cấp con phải khớp với cấp cha.");
  }
  return parent?.storageClass ?? storageClass;
}

function generatedLevelCode(rackCode: string, sequence: number) {
  const code = `${rackCode}-F${String(sequence).padStart(2, "0")}`;
  if (code.length > 40) {
    throw new WarehouseDomainError("GENERATED_LEVEL_CODE_TOO_LONG", "Mã kệ quá dài để tạo mã tầng tự động.");
  }
  return code;
}

function generatedSlotCode(levelCode: string, sequence: number) {
  const code = `${levelCode}-L${String(sequence).padStart(2, "0")}`;
  if (code.length > 40) throw new WarehouseDomainError("GENERATED_SLOT_CODE_TOO_LONG", "Mã tầng quá dài để tạo mã ô chứa tự động.");
  return code;
}

function generatedChildCode(parentCode: string, localCode: string, label: string) {
  const code = `${parentCode}-${localCode}`;
  if (code.length > 40) {
    throw new WarehouseDomainError("GENERATED_CHILD_CODE_TOO_LONG", `Mã ${label} sau khi nối với mã cấp cha không được quá 40 ký tự.`);
  }
  return code;
}

function validateSlotPlans(slotPlans: SlotPlan[] | undefined, levelCount: number, slotLimit: number) {
  if (!slotPlans || slotPlans.length !== levelCount) throw new WarehouseDomainError("SLOT_PLAN_REQUIRED", "Hãy cấu hình số ô chứa cho từng tầng.");
  const plans = new Map(slotPlans.map((plan) => [plan.sequence, plan.slotCount]));
  if (plans.size !== levelCount) throw new WarehouseDomainError("SLOT_PLAN_INVALID", "Cấu hình tầng không hợp lệ.");
  for (let sequence = 1; sequence <= levelCount; sequence += 1) {
    const slotCount = plans.get(sequence);
    if (slotCount === undefined || slotCount < 0 || slotCount > slotLimit) throw new WarehouseDomainError("SLOT_COUNT_INVALID", `Số ô chứa mỗi tầng phải từ 0 đến ${slotLimit}.`);
  }
  return plans;
}

async function createManagedRackLevel(
  transaction: Prisma.TransactionClient,
  input: { workspaceId: string; rackId: string; rackCode: string; sequence: number; storageClass: StorageClass | null },
) {
  const code = generatedLevelCode(input.rackCode, input.sequence);
  const item = await transaction.rackLevel.create({
    data: {
      workspaceId: input.workspaceId,
      rackId: input.rackId,
      code,
      sequence: input.sequence,
      name: `Tầng ${input.sequence}`,
      storageClass: input.storageClass,
    },
  });
  try {
    await reserveLocationCode(transaction, input.workspaceId, "level", item.id, code);
  } catch (error) {
    const errorCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (errorCode === "P2002") throw new WarehouseDomainError("DUPLICATE_GENERATED_LEVEL_CODE", `Mã tầng tự sinh ${code} đã tồn tại trong kho này.`);
    throw error;
  }
  return item;
}

async function syncManagedRackLevels(
  transaction: Prisma.TransactionClient,
  input: { workspaceId: string; rackId: string; rackCode: string; previousLevelCount: number; levelCount: number; levelLimit: number; storageClass: StorageClass | null },
) {
  if (input.levelCount < 1 || input.levelCount > input.levelLimit) {
    throw new WarehouseDomainError("LEVEL_COUNT_INVALID", `Số tầng phải từ 1 đến ${input.levelLimit}.`);
  }

  const levels = await transaction.rackLevel.findMany({
    where: { rackId: input.rackId, workspaceId: input.workspaceId },
    select: { id: true, sequence: true },
    orderBy: { sequence: "asc" },
  });

  const removed = levels.filter((level) => level.sequence > input.levelCount);
  if (removed.length > 0) {
    const slots = await transaction.slot.count({ where: { workspaceId: input.workspaceId, rackLevelId: { in: removed.map((level) => level.id) } } });
    if (slots > 0) throw new WarehouseDomainError("RACK_LEVELS_HAVE_SLOTS", "Không thể giảm số tầng khi tầng cần xóa vẫn có ô chứa.");
    for (const level of removed) {
      await releaseLocationCode(transaction, input.workspaceId, "level", level.id);
      await transaction.rackLevel.delete({ where: { id: level.id } });
    }
  }

  for (let sequence = input.previousLevelCount + 1; sequence <= input.levelCount; sequence += 1) {
    if (levels.some((level) => level.sequence === sequence)) continue;
    await createManagedRackLevel(transaction, { ...input, sequence });
  }
}

async function syncManagedSlots(
  transaction: Prisma.TransactionClient,
  input: { workspaceId: string; rackLevelId: string; levelCode: string; storageClass: StorageClass | null; slotCount: number },
) {
  const slots = await transaction.slot.findMany({
    where: { workspaceId: input.workspaceId, rackLevelId: input.rackLevelId },
    select: { id: true, code: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  if (input.slotCount < slots.length) {
    const removedSlots = slots.slice(input.slotCount);
    const inventoryLineCount = await transaction.inventoryDocumentLine.count({
      where: { workspaceId: input.workspaceId, slotId: { in: removedSlots.map((slot) => slot.id) } },
    });
    if (inventoryLineCount > 0) throw new WarehouseDomainError("SLOTS_HAVE_INVENTORY_HISTORY", "Không thể giảm số ô chứa khi ô cần xóa đã có lịch sử tồn kho.");
    for (const slot of removedSlots.reverse()) {
      await releaseLocationCode(transaction, input.workspaceId, "slot", slot.id);
      await transaction.slot.delete({ where: { id: slot.id } });
    }
    return;
  }

  const reservedCodes = new Set(slots.map((slot) => slot.code));
  let sequence = 1;
  let created = slots.length;
  while (created < input.slotCount) {
    const code = generatedSlotCode(input.levelCode, sequence);
    sequence += 1;
    if (reservedCodes.has(code)) continue;
    const item = await transaction.slot.create({ data: { workspaceId: input.workspaceId, rackLevelId: input.rackLevelId, code, name: `Ô ${sequence - 1}`, storageClass: input.storageClass } });
    try {
      await reserveLocationCode(transaction, input.workspaceId, "slot", item.id, code);
    } catch (error) {
      const errorCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (errorCode === "P2002") throw new WarehouseDomainError("DUPLICATE_GENERATED_SLOT_CODE", `Mã ô chứa tự sinh ${code} đã tồn tại trong kho này.`);
      throw error;
    }
    reservedCodes.add(code);
    created += 1;
  }
}

async function syncRackSlotPlans(
  transaction: Prisma.TransactionClient,
  input: { workspaceId: string; rackId: string; storageClass: StorageClass | null; slotPlans: Map<number, number> },
) {
  const levels = await transaction.rackLevel.findMany({ where: { workspaceId: input.workspaceId, rackId: input.rackId }, select: { id: true, code: true, sequence: true }, orderBy: { sequence: "asc" } });
  for (const level of levels) {
    const slotCount = input.slotPlans.get(level.sequence);
    if (slotCount === undefined) throw new WarehouseDomainError("SLOT_PLAN_INVALID", "Thiếu cấu hình ô chứa cho tầng.");
    await syncManagedSlots(transaction, { workspaceId: input.workspaceId, rackLevelId: level.id, levelCode: level.code, storageClass: input.storageClass, slotCount });
  }
}

function requireLocationCode(code: string | undefined): string {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) throw new WarehouseDomainError("LOCATION_CODE_REQUIRED", "Mã vị trí là bắt buộc.");
  return normalized;
}

async function reserveLocationCode(
  transaction: Prisma.TransactionClient,
  workspaceId: string,
  kind: NodeKind,
  locationId: string,
  code: string,
) {
  await transaction.locationCodeRegistry.create({
    data: { workspaceId, code, locationType: locationCodeKind[kind], locationId },
  });
}

async function changeLocationCode(
  transaction: Prisma.TransactionClient,
  workspaceId: string,
  kind: NodeKind,
  locationId: string,
  code: string,
) {
  const updated = await transaction.locationCodeRegistry.updateMany({
    where: { workspaceId, locationType: locationCodeKind[kind], locationId },
    data: { code },
  });
  if (updated.count !== 1) throw new WarehouseDomainError("LOCATION_CODE_REGISTRY_MISSING", "Không thể đồng bộ mã vị trí.");
}

async function releaseLocationCode(
  transaction: Prisma.TransactionClient,
  workspaceId: string,
  kind: NodeKind,
  locationId: string,
) {
  await transaction.locationCodeRegistry.deleteMany({
    where: { workspaceId, locationType: locationCodeKind[kind], locationId },
  });
}

async function getWorkspace(userId: string) {
  const workspace = await db.workspace.findUnique({
    where: { ownerUserId: userId },
    include: { limits: true },
  });
  if (!workspace) throw new WarehouseDomainError("WORKSPACE_NOT_FOUND", "Không tìm thấy không gian kho.");
  assertWorkspaceWritable(workspace);
  if (!workspace.limits) throw new WarehouseDomainError("WORKSPACE_LIMITS_MISSING", "Thiếu cấu hình hạn mức kho.");
  const limits = workspace.limits;
  return { ...workspace, limits };
}

async function writeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new WarehouseDomainError("CONCURRENCY_CONFLICT", "Không thể lưu vì dữ liệu vừa thay đổi. Vui lòng thử lại.");
}

function mapCreateDatabaseError(error: unknown, kind: NodeKind, locationCode?: string): never {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "P2002") {
    const target = typeof error === "object" && error && "meta" in error && typeof error.meta === "object" && error.meta && "target" in error.meta ? error.meta.target : null;
    const targetFields = Array.isArray(target) ? target.map(String) : [];
    if (targetFields.includes("name")) {
      throw new WarehouseDomainError("DUPLICATE_LOCATION_NAME", `Tên ${nodeLabel[kind]} đã tồn tại trong cùng cấp cha.`);
    }
    if (kind === "level" && targetFields.includes("sequence")) {
      throw new WarehouseDomainError("DUPLICATE_LEVEL_SEQUENCE", "Số thứ tự tầng này đã tồn tại trong kệ.");
    }
    throw new WarehouseDomainError("DUPLICATE_LOCATION_CODE", locationCode ? `Mã ${locationCode} đã tồn tại trong kho này.` : `Mã ${nodeLabel[kind]} đã tồn tại trong kho này.`);
  }
  throw error;
}

async function writeWithLocationCodeError<T>(kind: NodeKind, locationCode: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await writeWithRetry(operation);
  } catch (error) {
    mapCreateDatabaseError(error, kind, locationCode);
  }
}

export async function createWarehouseNode(input: {
  actorUserId: string; kind: NodeKind; parentId?: string; code?: string; name: string; sequence?: number; levelCount?: number; slotPlans?: SlotPlan[]; storageClass: StorageClass | null;
}) {
  const workspace = await getWorkspace(input.actorUserId);
  const requestedCode = requireLocationCode(input.code);
  try {
    return await writeWithRetry(() => db.$transaction(async (tx) => {
    const base = { workspaceId: workspace.id, name: input.name, storageClass: input.storageClass };
    if (input.kind === "warehouse") {
      const code = requestedCode;
      const count = await tx.warehouse.count({ where: { workspaceId: workspace.id } });
      if (count >= workspace.limits.warehouseLimit) throw new WarehouseDomainError("QUOTA_EXCEEDED", "Đã đạt hạn mức kho.");
      const item = await tx.warehouse.create({ data: { ...base, code } });
      await reserveLocationCode(tx, workspace.id, input.kind, item.id, code);
      await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "warehouse.create", resource: "warehouse", resourceId: item.id, result: "SUCCESS", after: { code: item.code, name: item.name } } });
      return item;
    }
    if (!input.parentId) throw new WarehouseDomainError("PARENT_REQUIRED", "Cần chọn cấp cha.");
    if (input.kind === "zone") {
      const parent = await tx.warehouse.findFirst({ where: { id: input.parentId, workspaceId: workspace.id }, select: { id: true, code: true, storageClass: true } });
      if (!parent) throw new WarehouseDomainError("PARENT_NOT_FOUND", "Không tìm thấy kho cha.");
      const code = generatedChildCode(parent.code, requestedCode, "phân khu");
      const count = await tx.zone.count({ where: { warehouseId: parent.id } });
      if (count >= workspace.limits.zonesPerWarehouseLimit) throw new WarehouseDomainError("QUOTA_EXCEEDED", "Đã đạt hạn mức phân khu.");
      const item = await tx.zone.create({ data: { ...base, warehouseId: parent.id, code, storageClass: enforceStorageClass(parent, input.storageClass) } });
      await reserveLocationCode(tx, workspace.id, input.kind, item.id, code);
      await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "warehouse.zone.create", resource: "zone", resourceId: item.id, result: "SUCCESS", after: { code: item.code, name: item.name } } });
      return item;
    }
    if (input.kind === "rack") {
      const parent = await tx.zone.findFirst({ where: { id: input.parentId, workspaceId: workspace.id }, select: { id: true, code: true, storageClass: true } });
      if (!parent) throw new WarehouseDomainError("PARENT_NOT_FOUND", "Không tìm thấy phân khu cha.");
      const code = generatedChildCode(parent.code, requestedCode, "kệ");
      const count = await tx.rack.count({ where: { zoneId: parent.id } });
      if (count >= workspace.limits.racksPerZoneLimit) throw new WarehouseDomainError("QUOTA_EXCEEDED", "Đã đạt hạn mức kệ.");
      if (!input.levelCount || input.levelCount > workspace.limits.levelsPerRackLimit) throw new WarehouseDomainError("LEVEL_COUNT_INVALID", `Số tầng phải từ 1 đến ${workspace.limits.levelsPerRackLimit}.`);
      const slotPlans = validateSlotPlans(input.slotPlans, input.levelCount, workspace.limits.slotsPerLevelLimit);
      const item = await tx.rack.create({ data: { ...base, zoneId: parent.id, code, configuredLevelCount: input.levelCount, storageClass: enforceStorageClass(parent, input.storageClass) } });
      for (let sequence = 1; sequence <= input.levelCount; sequence += 1) {
        await createManagedRackLevel(tx, { workspaceId: workspace.id, rackId: item.id, rackCode: item.code, sequence, storageClass: item.storageClass });
      }
      await syncRackSlotPlans(tx, { workspaceId: workspace.id, rackId: item.id, storageClass: item.storageClass, slotPlans });
      await reserveLocationCode(tx, workspace.id, input.kind, item.id, code);
      await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "warehouse.rack.create", resource: "rack", resourceId: item.id, result: "SUCCESS", after: { code: item.code, name: item.name, levelCount: input.levelCount, slotPlans: input.slotPlans } } });
      return item;
    }
    if (input.kind === "level") {
      throw new WarehouseDomainError("RACK_LEVELS_MANAGED_BY_RACK", "Hãy thiết lập số tầng khi tạo hoặc sửa kệ.");
    }
    throw new WarehouseDomainError("RACK_SLOTS_MANAGED_BY_RACK", "Hãy cấu hình số ô chứa cho từng tầng khi tạo hoặc sửa kệ.");
    }, { isolationLevel: "Serializable" }));
  } catch (error) {
    mapCreateDatabaseError(error, input.kind, requestedCode);
  }
}

export async function updateWarehouseNode(input: {
  actorUserId: string; kind: NodeKind; id: string; version: number; code?: string; name: string; sequence?: number; levelCount?: number; slotPlans?: SlotPlan[]; storageClass: StorageClass | null;
}) {
  const workspace = await getWorkspace(input.actorUserId);
  const requestedCode = requireLocationCode(input.code);
  return writeWithLocationCodeError(input.kind, requestedCode, () => db.$transaction(async (tx) => {
    if (input.kind === "warehouse") {
      const code = requestedCode;
      const current = await tx.warehouse.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
      if (!current) throw new WarehouseDomainError("NODE_NOT_FOUND", "Không tìm thấy kho cần sửa.");
      const childCount = await tx.zone.count({ where: { warehouseId: current.id } });
      if (childCount > 0 && (current.code !== code || current.storageClass !== input.storageClass)) throw new WarehouseDomainError("NODE_HAS_CHILDREN", "Không thể đổi mã hoặc tải trọng của kho đang có phân khu.");
      const updated = await tx.warehouse.updateMany({ where: { id: current.id, workspaceId: workspace.id, version: input.version }, data: { code, name: input.name, storageClass: input.storageClass, version: { increment: 1 } } });
      if (updated.count !== 1) throw new WarehouseDomainError("CONCURRENCY_CONFLICT", "Vị trí kho vừa thay đổi. Vui lòng mở lại và thử lại.");
      if (current.code !== code) await changeLocationCode(tx, workspace.id, input.kind, current.id, code);
      await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "warehouse.update", resource: "warehouse", resourceId: current.id, result: "SUCCESS", before: { code: current.code, name: current.name, storageClass: current.storageClass }, after: { code, name: input.name, storageClass: input.storageClass } } });
      return;
    }
    if (input.kind === "zone") {
      const current = await tx.zone.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
      if (!current) throw new WarehouseDomainError("NODE_NOT_FOUND", "Không tìm thấy phân khu cần sửa.");
      const parent = await tx.warehouse.findFirst({ where: { id: current.warehouseId, workspaceId: workspace.id }, select: { id: true, code: true, storageClass: true } });
      if (!parent) throw new WarehouseDomainError("PARENT_NOT_FOUND", "Không tìm thấy kho cha.");
      const code = generatedChildCode(parent.code, requestedCode, "phân khu");
      const childCount = await tx.rack.count({ where: { zoneId: current.id } });
      if (childCount > 0 && (current.code !== code || current.storageClass !== input.storageClass)) throw new WarehouseDomainError("NODE_HAS_CHILDREN", "Không thể đổi mã hoặc tải trọng của phân khu đang có kệ.");
      const updated = await tx.zone.updateMany({ where: { id: current.id, workspaceId: workspace.id, version: input.version }, data: { code, name: input.name, storageClass: enforceStorageClass(parent, input.storageClass), version: { increment: 1 } } });
      if (updated.count !== 1) throw new WarehouseDomainError("CONCURRENCY_CONFLICT", "Vị trí kho vừa thay đổi. Vui lòng mở lại và thử lại.");
      if (current.code !== code) await changeLocationCode(tx, workspace.id, input.kind, current.id, code);
      await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "warehouse.zone.update", resource: "zone", resourceId: current.id, result: "SUCCESS", before: { code: current.code, name: current.name, storageClass: current.storageClass }, after: { code, name: input.name, storageClass: input.storageClass } } });
      return;
    }
    if (input.kind === "rack") {
      const current = await tx.rack.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
      if (!current) throw new WarehouseDomainError("NODE_NOT_FOUND", "Không tìm thấy kệ cần sửa.");
      const parent = await tx.zone.findFirst({ where: { id: current.zoneId, workspaceId: workspace.id }, select: { id: true, code: true, storageClass: true } });
      if (!parent) throw new WarehouseDomainError("PARENT_NOT_FOUND", "Không tìm thấy phân khu cha.");
      const code = generatedChildCode(parent.code, requestedCode, "kệ");
      const childCount = await tx.rackLevel.count({ where: { rackId: current.id, workspaceId: workspace.id } });
      if (childCount > 0 && (current.code !== code || current.storageClass !== input.storageClass)) throw new WarehouseDomainError("NODE_HAS_CHILDREN", "Không thể đổi mã hoặc tải trọng của kệ đang có tầng.");
      const storageClass = enforceStorageClass(parent, input.storageClass);
      const levelCount = input.levelCount ?? current.configuredLevelCount;
      const slotPlans = validateSlotPlans(input.slotPlans, levelCount, workspace.limits.slotsPerLevelLimit);
      const updated = await tx.rack.updateMany({ where: { id: current.id, workspaceId: workspace.id, version: input.version }, data: { code, name: input.name, configuredLevelCount: levelCount, storageClass, version: { increment: 1 } } });
      if (updated.count !== 1) throw new WarehouseDomainError("CONCURRENCY_CONFLICT", "Vị trí kho vừa thay đổi. Vui lòng mở lại và thử lại.");
      if (current.code !== code) await changeLocationCode(tx, workspace.id, input.kind, current.id, code);
      await syncManagedRackLevels(tx, { workspaceId: workspace.id, rackId: current.id, rackCode: code, previousLevelCount: current.configuredLevelCount, levelCount, levelLimit: workspace.limits.levelsPerRackLimit, storageClass });
      await syncRackSlotPlans(tx, { workspaceId: workspace.id, rackId: current.id, storageClass, slotPlans });
      await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "warehouse.rack.update", resource: "rack", resourceId: current.id, result: "SUCCESS", before: { code: current.code, name: current.name, storageClass: current.storageClass, levelCount: childCount }, after: { code, name: input.name, storageClass, levelCount, slotPlans: input.slotPlans } } });
      return;
    }
    if (input.kind === "level") {
      const current = await tx.rackLevel.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
      if (!current) throw new WarehouseDomainError("NODE_NOT_FOUND", "Không tìm thấy tầng kệ cần sửa.");
      const parent = await tx.rack.findFirst({ where: { id: current.rackId, workspaceId: workspace.id }, select: { id: true, code: true, storageClass: true } });
      if (!parent) throw new WarehouseDomainError("PARENT_NOT_FOUND", "Không tìm thấy kệ cha.");
      const code = generatedLevelCode(parent.code, current.sequence);
      const childCount = await tx.slot.count({ where: { rackLevelId: current.id } });
      if (childCount > 0 && (current.code !== code || current.storageClass !== input.storageClass)) throw new WarehouseDomainError("NODE_HAS_CHILDREN", "Không thể đổi mã hoặc tải trọng của tầng đang có ô chứa.");
      const updated = await tx.rackLevel.updateMany({ where: { id: current.id, workspaceId: workspace.id, version: input.version }, data: { code, sequence: current.sequence, name: input.name, storageClass: enforceStorageClass(parent, input.storageClass), version: { increment: 1 } } });
      if (updated.count !== 1) throw new WarehouseDomainError("CONCURRENCY_CONFLICT", "Vị trí kho vừa thay đổi. Vui lòng mở lại và thử lại.");
      if (current.code !== code) await changeLocationCode(tx, workspace.id, input.kind, current.id, code);
      await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "warehouse.level.update", resource: "rack_level", resourceId: current.id, result: "SUCCESS", before: { code: current.code, sequence: current.sequence, name: current.name, storageClass: current.storageClass }, after: { code, sequence: current.sequence, name: input.name, storageClass: input.storageClass } } });
      return;
    }
    const current = await tx.slot.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
    if (!current) throw new WarehouseDomainError("NODE_NOT_FOUND", "Không tìm thấy ô chứa cần sửa.");
    const code = current.code;
    const parent = await tx.rackLevel.findFirst({ where: { id: current.rackLevelId, workspaceId: workspace.id }, select: { id: true, storageClass: true } });
    const updated = await tx.slot.updateMany({ where: { id: current.id, workspaceId: workspace.id, version: input.version }, data: { code, name: input.name, storageClass: enforceStorageClass(parent, input.storageClass), version: { increment: 1 } } });
    if (updated.count !== 1) throw new WarehouseDomainError("CONCURRENCY_CONFLICT", "Vị trí kho vừa thay đổi. Vui lòng mở lại và thử lại.");
    if (current.code !== code) await changeLocationCode(tx, workspace.id, input.kind, current.id, code);
    await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "warehouse.slot.update", resource: "slot", resourceId: current.id, result: "SUCCESS", before: { code: current.code, name: current.name, storageClass: current.storageClass }, after: { code, name: input.name, storageClass: input.storageClass } } });
  }, { isolationLevel: "Serializable" }));
}

type PositionedLevel = {
  id: string;
  sequence: number;
  code: string;
  name: string;
  storageClass: StorageClass | null;
  slots: Array<{ id: string; code: string; createdAt: Date }>;
};

async function levelsHaveProductAssignments(transaction: Prisma.TransactionClient, levelIds: string[]) {
  if (levelIds.length === 0) return false;
  const count = await transaction.slot.count({
    where: {
      rackLevelId: { in: levelIds },
      inventoryLines: { some: {} },
    },
  });
  return count > 0;
}

async function removeLevelWithSlots(transaction: Prisma.TransactionClient, workspaceId: string, level: PositionedLevel) {
  for (const slot of level.slots) {
    await releaseLocationCode(transaction, workspaceId, "slot", slot.id);
    await transaction.slot.delete({ where: { id: slot.id } });
  }
  await releaseLocationCode(transaction, workspaceId, "level", level.id);
  await transaction.rackLevel.delete({ where: { id: level.id } });
}

async function applyLevelPositions(
  transaction: Prisma.TransactionClient,
  input: { workspaceId: string; rackCode: string; levels: PositionedLevel[]; positions: Map<string, number> },
) {
  const affected = input.levels.filter((level) => input.positions.get(level.id) !== level.sequence);
  if (affected.length === 0) return;

  for (const level of affected) {
    for (const slot of level.slots) await releaseLocationCode(transaction, input.workspaceId, "slot", slot.id);
    await releaseLocationCode(transaction, input.workspaceId, "level", level.id);
  }

  for (const level of affected) {
    for (const slot of level.slots) {
      await transaction.slot.update({ where: { id: slot.id }, data: { code: `~S${slot.id}`, version: { increment: 1 } } });
    }
    await transaction.rackLevel.update({ where: { id: level.id }, data: { code: `~F${level.id}`, sequence: -level.sequence, version: { increment: 1 } } });
  }

  for (const level of affected) {
    const sequence = input.positions.get(level.id);
    if (sequence === undefined) throw new WarehouseDomainError("LEVEL_POSITION_INVALID", "Thiếu vị trí tầng mới.");
    const code = generatedLevelCode(input.rackCode, sequence);
    const name = level.name === `Tầng ${level.sequence}` ? `Tầng ${sequence}` : level.name;
    await transaction.rackLevel.update({ where: { id: level.id }, data: { code, name, sequence, version: { increment: 1 } } });
    await reserveLocationCode(transaction, input.workspaceId, "level", level.id, code);

    const slots = [...level.slots].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      const slotCode = generatedSlotCode(code, index + 1);
      await transaction.slot.update({ where: { id: slot.id }, data: { code: slotCode, version: { increment: 1 } } });
      await reserveLocationCode(transaction, input.workspaceId, "slot", slot.id, slotCode);
    }
  }
}

async function deleteRackLevel(input: { actorUserId: string; workspaceId: string; id: string }) {
  return writeWithRetry(() => db.$transaction(async (tx) => {
    const current = await tx.rackLevel.findFirst({
      where: { id: input.id, workspaceId: input.workspaceId },
      include: { slots: { select: { id: true, code: true, createdAt: true } } },
    });
    if (!current) throw new WarehouseDomainError("NODE_NOT_FOUND", "Không tìm thấy tầng kệ cần xóa.");
    const rack = await tx.rack.findFirst({ where: { id: current.rackId, workspaceId: input.workspaceId }, select: { id: true, code: true, configuredLevelCount: true } });
    if (!rack) throw new WarehouseDomainError("PARENT_NOT_FOUND", "Không tìm thấy kệ cha.");

    const levels = await tx.rackLevel.findMany({
      where: { rackId: rack.id, workspaceId: input.workspaceId },
      include: { slots: { select: { id: true, code: true, createdAt: true } } },
      orderBy: { sequence: "asc" },
    });
    const higherLevels = levels.filter((level) => level.sequence > current.sequence);
    if (await levelsHaveProductAssignments(tx, [current.id])) {
      throw new WarehouseDomainError("LEVEL_HAS_PRODUCTS", "Không thể xóa tầng khi ô chứa còn sản phẩm.");
    }

    await removeLevelWithSlots(tx, input.workspaceId, current);
    const canCompact = !(await levelsHaveProductAssignments(tx, higherLevels.map((level) => level.id)));
    if (canCompact) {
      await applyLevelPositions(tx, {
        workspaceId: input.workspaceId,
        rackCode: rack.code,
        levels: higherLevels,
        positions: new Map(higherLevels.map((level) => [level.id, level.sequence - 1])),
      });
    }

    await tx.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        action: "warehouse.level.delete",
        resource: "rack_level",
        resourceId: current.id,
        result: "SUCCESS",
        before: { code: current.code, sequence: current.sequence },
        after: { compacted: canCompact, configuredLevelCount: rack.configuredLevelCount },
      },
    });
  }, { isolationLevel: "Serializable" }));
}

export async function repositionRackLevel(input: { actorUserId: string; id: string; version: number; targetSequence: number; targetVersion?: number }) {
  const workspace = await getWorkspace(input.actorUserId);
  return writeWithRetry(() => db.$transaction(async (tx) => {
    const current = await tx.rackLevel.findFirst({
      where: { id: input.id, workspaceId: workspace.id },
      include: { slots: { select: { id: true, code: true, createdAt: true } } },
    });
    if (!current) throw new WarehouseDomainError("NODE_NOT_FOUND", "Không tìm thấy tầng kệ cần chuyển.");
    if (current.version !== input.version) throw new WarehouseDomainError("CONCURRENCY_CONFLICT", "Tầng kệ vừa thay đổi. Vui lòng mở lại và thử lại.");
    const rack = await tx.rack.findFirst({ where: { id: current.rackId, workspaceId: workspace.id }, select: { id: true, code: true, configuredLevelCount: true } });
    if (!rack) throw new WarehouseDomainError("PARENT_NOT_FOUND", "Không tìm thấy kệ cha.");
    if (input.targetSequence < 1 || input.targetSequence > rack.configuredLevelCount || input.targetSequence === current.sequence) {
      throw new WarehouseDomainError("LEVEL_POSITION_INVALID", "Vị trí tầng đích không hợp lệ.");
    }

    const target = await tx.rackLevel.findFirst({
      where: { rackId: rack.id, workspaceId: workspace.id, sequence: input.targetSequence },
      include: { slots: { select: { id: true, code: true, createdAt: true } } },
    });
    if (target && target.version !== input.targetVersion) throw new WarehouseDomainError("CONCURRENCY_CONFLICT", "Tầng đích vừa thay đổi. Vui lòng mở lại và thử lại.");

    const positions = new Map<string, number>([[current.id, input.targetSequence]]);
    const changedLevels: PositionedLevel[] = [current];
    if (target) {
      positions.set(target.id, current.sequence);
      changedLevels.push(target);
    }
    await applyLevelPositions(tx, { workspaceId: workspace.id, rackCode: rack.code, levels: changedLevels, positions });
    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: input.actorUserId,
        action: target ? "warehouse.level.swap" : "warehouse.level.move",
        resource: "rack_level",
        resourceId: current.id,
        result: "SUCCESS",
        before: { sequence: current.sequence, code: current.code },
        after: { sequence: input.targetSequence, targetSequence: target?.sequence ?? null, targetId: target?.id ?? null },
      },
    });
  }, { isolationLevel: "Serializable" }));
}

export async function deleteWarehouseNode(input: { actorUserId: string; kind: NodeKind; id: string }) {
  const workspace = await getWorkspace(input.actorUserId);
  if (input.kind === "level") return deleteRackLevel({ actorUserId: input.actorUserId, workspaceId: workspace.id, id: input.id });
  return writeWithRetry(() => db.$transaction(async (tx) => {
    const rules = {
      warehouse: { find: () => tx.warehouse.findFirst({ where: { id: input.id, workspaceId: workspace.id } }), children: () => tx.zone.count({ where: { warehouseId: input.id } }), remove: () => tx.warehouse.delete({ where: { id: input.id } }), resource: "warehouse", action: "warehouse.delete" },
      zone: { find: () => tx.zone.findFirst({ where: { id: input.id, workspaceId: workspace.id } }), children: () => tx.rack.count({ where: { zoneId: input.id } }), remove: () => tx.zone.delete({ where: { id: input.id } }), resource: "zone", action: "warehouse.zone.delete" },
      rack: { find: () => tx.rack.findFirst({ where: { id: input.id, workspaceId: workspace.id } }), children: () => tx.rackLevel.count({ where: { rackId: input.id } }), remove: () => tx.rack.delete({ where: { id: input.id } }), resource: "rack", action: "warehouse.rack.delete" },
      level: { find: () => tx.rackLevel.findFirst({ where: { id: input.id, workspaceId: workspace.id } }), children: () => tx.slot.count({ where: { rackLevelId: input.id } }), remove: () => tx.rackLevel.delete({ where: { id: input.id } }), resource: "rack_level", action: "warehouse.level.delete" },
      slot: { find: () => tx.slot.findFirst({ where: { id: input.id, workspaceId: workspace.id } }), children: async () => 0, remove: () => tx.slot.delete({ where: { id: input.id } }), resource: "slot", action: "warehouse.slot.delete" },
    } as const;
    const rule = rules[input.kind];
    const current = await rule.find();
    if (!current) throw new WarehouseDomainError("NODE_NOT_FOUND", "Không tìm thấy vị trí kho cần xóa.");
    if (await rule.children()) throw new WarehouseDomainError("NODE_HAS_CHILDREN", "Hãy xóa toàn bộ cấp con trước khi xóa vị trí này.");
    if (input.kind === "slot") {
      const inventoryLineCount = await tx.inventoryDocumentLine.count({ where: { workspaceId: workspace.id, slotId: input.id } });
      if (inventoryLineCount > 0) throw new WarehouseDomainError("SLOT_HAS_INVENTORY_HISTORY", "Không thể xóa ô chứa đã có lịch sử tồn kho.");
    }
    await releaseLocationCode(tx, workspace.id, input.kind, input.id);
    await rule.remove();
    await tx.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: rule.action, resource: rule.resource, resourceId: input.id, result: "SUCCESS", before: { id: current.id, kind: input.kind } } });
  }, { isolationLevel: "Serializable" }));
}
