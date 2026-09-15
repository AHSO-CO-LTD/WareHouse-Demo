"use server";

import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerEnv } from "@/config/server-env";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";

const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(100),
  contactPhone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value === "" || /^[+\d][\d\s().-]+$/.test(value)),
});

export type OnboardingState = {
  message: string | null;
  fieldErrors: {
    displayName?: string[];
    contactName?: string[];
    contactPhone?: string[];
  };
};

export const initialOnboardingState: OnboardingState = {
  message: null,
  fieldErrors: {},
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function createWorkspaceAction(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getCurrentUser();

  if (!user || user.role !== AUTH_ROLES.DEMO_USER) {
    return {
      message: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
      fieldErrors: {},
    };
  }

  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
  });

  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors;

    return {
      message: "Vui lòng kiểm tra lại thông tin.",
      fieldErrors: {
        displayName: errors.displayName,
        contactName: errors.contactName,
        contactPhone: errors.contactPhone,
      },
    };
  }

  const existingWorkspace = await db.workspace.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });

  if (existingWorkspace) {
    redirect("/demo");
  }

  const env = getServerEnv();
  const startedAt = new Date();
  const expiresAt = addDays(startedAt, env.DEMO_DURATION_DAYS);
  const purgeAt = addDays(expiresAt, env.DEMO_GRACE_DAYS);

  try {
    await db.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.create({
        data: {
          ownerUserId: user.id,
          displayName: parsed.data.displayName,
          contactName: parsed.data.contactName,
          contactEmail: user.email,
          contactPhone: parsed.data.contactPhone || null,
          status: "ACTIVE",
          startedAt,
          expiresAt,
          purgeAt,
          limits: {
            create: {
              durationDays: env.DEMO_DURATION_DAYS,
              graceDays: env.DEMO_GRACE_DAYS,
              warehouseLimit: 1,
              zonesPerWarehouseLimit: 2,
              racksPerZoneLimit: 3,
              levelsPerRackLimit: 3,
              slotsPerLevelLimit: 2,
              productLimit: 20,
              projectLimit: 5,
              partyProfileLimit: 5,
              supplierLimit: 5,
              commercialDocumentLimit: 10,
              inventoryTransactionLimit: 100,
            },
          },
        },
        select: {
          id: true,
          displayName: true,
          status: true,
          startedAt: true,
          expiresAt: true,
          purgeAt: true,
        },
      });

      await transaction.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorUserId: user.id,
          action: "workspace.activate",
          resource: "workspace",
          resourceId: workspace.id,
          result: "SUCCESS",
          after: workspace,
        },
      });
    });
  } catch {
    const workspace = await db.workspace.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    if (!workspace) {
      return {
        message: "Chưa thể khởi tạo bản demo. Vui lòng thử lại.",
        fieldErrors: {},
      };
    }
  }

  redirect("/demo");
}
