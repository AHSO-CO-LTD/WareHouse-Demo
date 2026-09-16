import { redirect } from "next/navigation";

import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";

export default async function AuthContinuePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  if (
    user.role === AUTH_ROLES.PLATFORM_ADMIN ||
    user.role === AUTH_ROLES.PLATFORM_DEV
  ) {
    redirect("/platform");
  }

  const workspace = await db.workspace.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });

  redirect(workspace ? "/demo" : "/onboarding");
}
