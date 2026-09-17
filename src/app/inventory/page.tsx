import { redirect } from "next/navigation";

import { InventoryManager } from "@/components/inventory/inventory-manager";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WorkspaceNavbar } from "@/components/workspace-navbar";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";
import { getWorkspaceAccessState } from "@/lib/server/workspace-lifecycle";

export const metadata = { title: "Tồn kho | AHSO Warehouse" };

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== AUTH_ROLES.DEMO_USER) redirect("/platform");
  if (user.mustChangePassword) redirect("/change-password");

  const workspace = await db.workspace.findUnique({
    where: { ownerUserId: user.id },
    include: {
      limits: true,
      products: {
        where: { status: "ACTIVE" },
        orderBy: { code: "asc" },
        include: {
          baseUnit: true,
          conversions: { include: { unit: true }, orderBy: { unit: { code: "asc" } } },
          lots: { orderBy: { sequence: "asc" } },
        },
      },
      slots: { orderBy: { code: "asc" } },
      inventoryBalances: {
        where: { quantity: { gt: 0 } },
        orderBy: [{ product: { code: "asc" } }, { slot: { code: "asc" } }],
        include: { product: { include: { baseUnit: true } }, lot: true, slot: true },
      },
      inventoryDocuments: {
        orderBy: { postedAt: "desc" },
        take: 10,
        include: { _count: { select: { lines: true } } },
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
        <InventoryManager
          balanceLimit={workspace.limits?.inventoryTransactionLimit ?? 0}
          balanceRows={workspace.inventoryBalances.map((balance) => ({
            id: balance.id,
            productId: balance.product.id,
            productCode: balance.product.code,
            productName: balance.product.name,
            unitName: balance.product.baseUnit.name,
            lotCode: balance.lot?.code ?? null,
            quantity: balance.quantity.toString(),
            slotCode: balance.slot.code,
            slotName: balance.slot.name,
          }))}
          documents={workspace.inventoryDocuments.map((document) => ({
            code: document.code,
            lineCount: document._count.lines,
            postedAt: document.postedAt.toISOString(),
            type: document.type,
          }))}
          products={workspace.products.map((product) => ({
            id: product.id,
            code: product.code,
            name: product.name,
            baseUnit: { id: product.baseUnit.id, code: product.baseUnit.code, name: product.baseUnit.name },
            conversions: product.conversions.map((conversion) => ({ unit: { id: conversion.unit.id, code: conversion.unit.code, name: conversion.unit.name }, factor: conversion.factor.toString() })),
            lots: product.lots.map((lot) => ({ id: lot.id, code: lot.code })),
          }))}
          slots={workspace.slots.map((slot) => ({ id: slot.id, code: slot.code, name: slot.name }))}
          transactionCount={await db.inventoryDocument.count({ where: { workspaceId: workspace.id } })}
          writable={access.writable}
        />
      </section>
    </main>
  );
}
