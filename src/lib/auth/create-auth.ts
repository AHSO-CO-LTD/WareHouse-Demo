import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";

import type { ServerEnv } from "@/config/server-env-schema";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  AUTH_ROLES,
  platformAccessControl,
  platformAuthRoles,
} from "@/lib/auth/platform-access";

export function createAuth(database: PrismaClient, env: ServerEnv) {
  return betterAuth({
    appName: "AHSO Warehouse Demo",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: prismaAdapter(database, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        trustedProviders: ["google"],
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
      },
    },
    advanced: {
      database: {
        joins: true,
      },
    },
    plugins: [
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
