import { redirect } from "next/navigation";

import { UnitManager } from "@/components/catalog/unit-manager";
import { CatalogNavbar } from "@/components/catalog/catalog-navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WorkspaceNavbar } from "@/components/workspace-navbar";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";
import { getWorkspaceAccessState } from "@/lib/server/workspace-lifecycle";

export const metadata = { title: "Đơn vị tính | AHSO Warehouse" };

export default async function UnitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== AUTH_ROLES.DEMO_USER) redirect("/platform");
  if (user.mustChangePassword) redirect("/change-password");

  const workspace = await db.workspace.findUnique({
    where: { ownerUserId: user.id },
    include: {
      limits: true,
      units: {
        orderBy: { code: "asc" },
        include: { _count: { select: { baseProducts: true, conversions: true } } },
      },
    },
  });

  if (!workspace) redirect("/onboarding");
  const access = getWorkspaceAccessState(workspace);

  return (
    <main className="app-placeholder-shell">
      <WorkspaceNavbar workspaceName={workspace.displayName} />
      <section className="warehouse-page">
        {!access.writable ? <Alert className="warehouse-access-alert"><AlertTitle>Chỉ xem</AlertTitle><AlertDescription>{access.message}</AlertDescription></Alert> : null}
        <CatalogNavbar />
        <UnitManager
          units={workspace.units.map((unit) => ({
            id: unit.id,
            code: unit.code,
            name: unit.name,
            version: unit.version,
            usageCount: unit._count.baseProducts + unit._count.conversions,
          }))}
          writable={access.writable}
        />
      </section>
    </main>
  );
}
