import { redirect } from "next/navigation";

import { CatalogManager } from "@/components/catalog/catalog-manager";
import { CatalogNavbar } from "@/components/catalog/catalog-navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WorkspaceNavbar } from "@/components/workspace-navbar";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";
import { getWorkspaceAccessState } from "@/lib/server/workspace-lifecycle";

export const metadata = { title: "Sản phẩm | AHSO Warehouse" };

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== AUTH_ROLES.DEMO_USER) redirect("/platform");
  if (user.mustChangePassword) redirect("/change-password");

  const workspace = await db.workspace.findUnique({
    where: { ownerUserId: user.id },
    include: {
      limits: true,
      units: { orderBy: { code: "asc" } },
      products: {
        orderBy: { code: "asc" },
        include: {
          baseUnit: true,
          conversions: { orderBy: { unit: { code: "asc" } }, include: { unit: true } },
          lots: { orderBy: { sequence: "asc" } },
        },
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
        <CatalogManager
          productLimit={workspace.limits?.productLimit ?? 0}
          products={workspace.products.map((product) => ({
            id: product.id,
            version: product.version,
            code: product.code,
            name: product.name,
            description: product.description,
            barcode: product.barcode,
            status: product.status,
            currentCost: product.currentCost.toString(),
            baseUnit: { id: product.baseUnit.id, code: product.baseUnit.code, name: product.baseUnit.name, version: product.baseUnit.version },
            conversions: product.conversions.map((conversion) => ({ id: conversion.id, version: conversion.version, factor: conversion.factor.toString(), unit: { id: conversion.unit.id, code: conversion.unit.code, name: conversion.unit.name, version: conversion.unit.version } })),
            lots: product.lots.map((lot) => ({ id: lot.id, version: lot.version, code: lot.code, supplierLotCode: lot.supplierLotCode, manufacturedAt: lot.manufacturedAt?.toISOString() ?? null, expiresAt: lot.expiresAt?.toISOString() ?? null })),
          }))}
          units={workspace.units.map((unit) => ({ id: unit.id, code: unit.code, name: unit.name, version: unit.version }))}
          writable={access.writable}
        />
      </section>
    </main>
  );
}
