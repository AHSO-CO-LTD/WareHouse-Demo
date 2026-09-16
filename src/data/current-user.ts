import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/server/auth";

export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    phoneNumber: session.user.phoneNumber ?? null,
    companyName: session.user.companyName ?? null,
    birthYear: session.user.birthYear ?? null,
    marketingEmailConsent: session.user.marketingEmailConsent,
    mustChangePassword: session.user.mustChangePassword,
    role: session.user.role ?? null,
  };
});
