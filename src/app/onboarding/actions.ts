"use server";

import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CURRENT_POLICIES } from "@/config/policies";
import { getServerEnv } from "@/config/server-env";
import { getCurrentUser } from "@/data/current-user";
import { type OnboardingState } from "@/app/onboarding/state";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";
import { sendDemoActivatedEmail } from "@/lib/server/email";

const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
});

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

  if (
    !user ||
    !user.emailVerified ||
    user.role !== AUTH_ROLES.DEMO_USER ||
    user.mustChangePassword
  ) {
    return {
      message: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
      fieldErrors: {},
    };
  }

  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return {
      message: "Vui lòng kiểm tra lại thông tin.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const existingWorkspace = await db.workspace.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });

  if (existingWorkspace) {
    redirect("/demo");
  }

  const registration = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      phoneNumber: true,
      marketingEmailConsent: true,
      termsAcceptedAt: true,
      privacyAcceptedAt: true,
      termsVersion: true,
      privacyVersion: true,
    },
  });

  if (
    !registration?.phoneNumber ||
    !registration.termsAcceptedAt ||
    !registration.privacyAcceptedAt
  ) {
    return {
      message:
        "Hồ sơ đăng ký chưa đầy đủ. Vui lòng liên hệ AHSO để được hỗ trợ.",
      fieldErrors: {},
    };
  }

  const termsAcceptedAt = registration.termsAcceptedAt;
  const privacyAcceptedAt = registration.privacyAcceptedAt;

  const env = getServerEnv();
  const startedAt = new Date();
  const expiresAt = addDays(startedAt, env.DEMO_DURATION_DAYS);
  const purgeAt = addDays(expiresAt, env.DEMO_GRACE_DAYS);
  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip");
  const userAgent = requestHeaders.get("user-agent");

  let activatedWorkspace:
    | {
        id: string;
        displayName: string | null;
        startedAt: Date | null;
        expiresAt: Date | null;
      }
    | undefined;

  try {
    activatedWorkspace = await db.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.create({
        data: {
          ownerUserId: user.id,
          displayName: parsed.data.displayName,
          contactName: registration.name,
          contactEmail: registration.email,
          contactPhone: registration.phoneNumber,
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
          startedAt: true,
          expiresAt: true,
        },
      });

      await transaction.consentRecord.createMany({
        data: [
          {
            workspaceId: workspace.id,
            type: "TERMS_OF_SERVICE",
            granted: true,
            policyKey: CURRENT_POLICIES.terms.key,
            policyVer:
              registration.termsVersion ?? CURRENT_POLICIES.terms.version,
            source: "registration",
            ipAddress,
            userAgent,
            recordedAt: termsAcceptedAt,
          },
          {
            workspaceId: workspace.id,
            type: "PRIVACY_POLICY",
            granted: true,
            policyKey: CURRENT_POLICIES.privacy.key,
            policyVer:
              registration.privacyVersion ?? CURRENT_POLICIES.privacy.version,
            source: "registration",
            ipAddress,
            userAgent,
            recordedAt: privacyAcceptedAt,
          },
          {
            workspaceId: workspace.id,
            type: "MARKETING_EMAIL",
            granted: registration.marketingEmailConsent,
            policyKey: "marketing-email",
            policyVer: "2026-09-15",
            source: "registration",
            ipAddress,
            userAgent,
          },
        ],
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
          ipAddress,
          userAgent,
        },
      });

      return workspace;
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

  if (
    activatedWorkspace?.displayName &&
    activatedWorkspace.startedAt &&
    activatedWorkspace.expiresAt
  ) {
    void sendDemoActivatedEmail(db, env, {
      userId: user.id,
      workspaceId: activatedWorkspace.id,
      email: registration.email,
      name: registration.name,
      workspaceName: activatedWorkspace.displayName,
      startedAt: activatedWorkspace.startedAt,
      expiresAt: activatedWorkspace.expiresAt,
    });
  }

  redirect("/demo");
}
