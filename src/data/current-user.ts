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
    role: session.user.role ?? null,
  };
});
