"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient } from "better-auth/client/plugins";

import {
  platformAccessControl,
  platformAuthRoles,
} from "@/lib/auth/platform-access";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    adminClient({
      ac: platformAccessControl,
      roles: platformAuthRoles,
    }),
  ],
});
