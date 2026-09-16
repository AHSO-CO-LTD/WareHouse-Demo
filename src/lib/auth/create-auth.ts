import { createHmac } from "node:crypto";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { admin } from "better-auth/plugins/admin";
import { z } from "zod";

import { CURRENT_POLICIES } from "@/config/policies";
import type { ServerEnv } from "@/config/server-env-schema";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  AUTH_ROLES,
  platformAccessControl,
  platformAuthRoles,
} from "@/lib/auth/platform-access";
import {
  isNormalizedPhoneNumber,
  isValidBirthYear,
} from "@/lib/auth/registration";
import {
  sendOtpEmail,
  sendPasswordChangedEmail,
  sendVerifiedWelcomeEmail,
} from "@/lib/server/email";

function getRequestIpAddress(request?: Request | null): string | undefined {
  const forwarded = request?.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return forwarded || request?.headers.get("x-real-ip") || undefined;
}

async function completePasswordChange(
  database: PrismaClient,
  env: ServerEnv,
  input: { userId: string; request?: Request | null },
): Promise<void> {
  const changedAt = new Date();
  let user: { id: string; email: string };

  try {
    user = await database.user.update({
      where: { id: input.userId },
      data: { mustChangePassword: false },
      select: { id: true, email: true },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        source: "password-change",
        message: "Password changed but user state update failed",
        userId: input.userId,
        errorType: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      }),
    );
    return;
  }

  await database.auditLog
    .create({
      data: {
        actorUserId: user.id,
        action: "auth.password.change",
        resource: "user",
        resourceId: user.id,
        result: "SUCCESS",
        ipAddress: getRequestIpAddress(input.request),
        userAgent: input.request?.headers.get("user-agent") ?? undefined,
      },
    })
    .catch((error: unknown) => {
      console.error(
        JSON.stringify({
          level: "error",
          source: "password-change-audit",
          message: "Password change audit write failed",
          userId: user.id,
          errorType: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        }),
      );
    });

  void sendPasswordChangedEmail(database, env, {
    userId: user.id,
    email: user.email,
    changedAt,
    eventId: `${user.id}:${changedAt.toISOString()}`,
    ipAddress: getRequestIpAddress(input.request),
  });
}

export function createAuth(database: PrismaClient, env: ServerEnv) {
  return betterAuth({
    appName: "AHSO Warehouse Demo",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: prismaAdapter(database, {
      provider: "postgresql",
    }),
    user: {
      additionalFields: {
        phoneNumber: {
          type: "string",
          required: false,
          unique: true,
          validator: {
            input: z.string().refine(isNormalizedPhoneNumber),
          },
        },
        companyName: {
          type: "string",
          required: false,
          validator: {
            input: z.string().trim().min(2).max(120),
          },
          transform: {
            input: (value) =>
              typeof value === "string" && value.trim() ? value.trim() : null,
          },
        },
        birthYear: {
          type: "number",
          required: false,
          validator: {
            input: z.number().int().refine(isValidBirthYear),
          },
        },
        termsAcceptedAt: {
          type: "date",
          required: false,
          returned: false,
          validator: {
            input: z.date(),
          },
          transform: {
            input: () => new Date(),
          },
        },
        privacyAcceptedAt: {
          type: "date",
          required: false,
          returned: false,
          validator: {
            input: z.date(),
          },
          transform: {
            input: () => new Date(),
          },
        },
        termsVersion: {
          type: "string",
          required: false,
          returned: false,
        },
        privacyVersion: {
          type: "string",
          required: false,
          returned: false,
        },
        marketingEmailConsent: {
          type: "boolean",
          required: false,
          defaultValue: false,
        },
        mustChangePassword: {
          type: "boolean",
          required: false,
          input: false,
          defaultValue: false,
        },
      },
      validateUserInfo: ({ user, source }) => {
        if (source.method !== "email-password") {
          return;
        }

        if (
          typeof user.phoneNumber !== "string" ||
          !isNormalizedPhoneNumber(user.phoneNumber)
        ) {
          return {
            error: "INVALID_PHONE_NUMBER",
            errorDescription: "Số điện thoại không hợp lệ.",
          };
        }

        if (
          !(user.termsAcceptedAt instanceof Date) ||
          !(user.privacyAcceptedAt instanceof Date) ||
          user.termsVersion !== CURRENT_POLICIES.terms.version ||
          user.privacyVersion !== CURRENT_POLICIES.privacy.version
        ) {
          return {
            error: "CONSENT_REQUIRED",
            errorDescription:
              "Bạn cần đồng ý Điều khoản sử dụng và Chính sách bảo mật.",
          };
        }
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      afterEmailVerification: async (user, request) => {
        await database.auditLog
          .create({
            data: {
              actorUserId: user.id,
              action: "auth.email.verify",
              resource: "user",
              resourceId: user.id,
              result: "SUCCESS",
              ipAddress: getRequestIpAddress(request),
              userAgent: request?.headers.get("user-agent") ?? undefined,
            },
          })
          .catch((error: unknown) => {
            console.error(
              JSON.stringify({
                level: "error",
                source: "email-verification-audit",
                message: "Email verification audit write failed",
                userId: user.id,
                errorType:
                  error instanceof Error ? error.name : "UNKNOWN_ERROR",
              }),
            );
          });
        void sendVerifiedWelcomeEmail(database, env, user);
      },
    },
    hooks: {
      after: createAuthMiddleware(async (context) => {
        if (isAPIError(context.context.returned)) {
          return;
        }

        if (context.path === "/change-password") {
          const userId = context.context.session?.user.id;

          if (userId) {
            await completePasswordChange(database, env, {
              userId,
              request: context.request,
            });
          }
          return;
        }

        if (context.path !== "/email-otp/reset-password") {
          return;
        }

        const body = context.body as Record<string, unknown> | undefined;
        const email =
          typeof body?.email === "string"
            ? body.email.trim().toLowerCase()
            : "";

        if (!email) {
          return;
        }

        const user = await database.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true },
        });

        if (!user) {
          return;
        }

        await completePasswordChange(database, env, {
          userId: user.id,
          request: context.request,
        });
        void sendVerifiedWelcomeEmail(database, env, user);
      }),
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 3_600, max: 5 },
      },
    },
    disabledPaths: [
      "/sign-in/email-otp",
      "/forget-password/email-otp",
      "/email-otp/request-email-change",
      "/email-otp/change-email",
      "/change-email",
      "/link-social",
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user, context) => {
            if (
              user.role !== AUTH_ROLES.PLATFORM_DEV &&
              user.role !== AUTH_ROLES.PLATFORM_ADMIN
            ) {
              return;
            }

            await database.auditLog
              .create({
                data: {
                  actorUserId: context?.context.session?.user.id,
                  action: "platform.account.create",
                  resource: "user",
                  resourceId: user.id,
                  result: "SUCCESS",
                  after: { role: user.role },
                  ipAddress: getRequestIpAddress(context?.request),
                  userAgent:
                    context?.request?.headers.get("user-agent") ?? undefined,
                },
              })
              .catch((error: unknown) => {
                console.error(
                  JSON.stringify({
                    level: "error",
                    source: "platform-account-audit",
                    message: "Platform account audit write failed",
                    userId: user.id,
                    errorType:
                      error instanceof Error ? error.name : "UNKNOWN_ERROR",
                  }),
                );
              });
          },
        },
      },
    },
    advanced: {
      database: {
        joins: true,
      },
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP(data) {
          if (data.type === "sign-in") {
            return;
          }

          await sendOtpEmail(env, data);
        },
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: {
          hash: async (otp) =>
            createHmac("sha256", env.BETTER_AUTH_SECRET)
              .update(otp)
              .digest("base64url"),
        },
        resendStrategy: "rotate",
        disableSignUp: true,
        overrideDefaultEmailVerification: true,
        rateLimit: {
          window: 3_600,
          max: 5,
        },
      }),
      admin({
        ac: platformAccessControl,
        roles: platformAuthRoles,
        defaultRole: AUTH_ROLES.DEMO_USER,
        bannedUserMessage:
          "Tài khoản không khả dụng. Vui lòng liên hệ AHSO để được hỗ trợ.",
      }),
    ],
  });
}
