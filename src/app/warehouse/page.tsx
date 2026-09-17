import { redirect } from "next/navigation";

import { CreateNodeForm } from "@/components/warehouse/create-node-form";
import { LocationEmptySlot } from "@/components/warehouse/location-empty-slot";
import { LocationQrDialog } from "@/components/warehouse/location-qr-dialog";
import { LocationRow } from "@/components/warehouse/location-row";
import { NodeActions } from "@/components/warehouse/node-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WorkspaceNavbar } from "@/components/workspace-navbar";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";
import { getWorkspaceAccessState } from "@/lib/server/workspace-lifecycle";

export const metadata = { title: "Quản lý kho | AHSO Warehouse" };

function capacityLabel(used: number, limit: number | undefined, label: string) {
  return `${used} / ${limit ?? "—"} ${label}`;
}

export default async function WarehousePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== AUTH_ROLES.DEMO_USER) redirect("/platform");
  if (user.mustChangePassword) redirect("/change-password");

  const workspace = await db.workspace.findUnique({
    where: { ownerUserId: user.id },
    include: {
      limits: true,
      warehouses: {
        orderBy: { code: "asc" },
        include: {
          zones: {
            orderBy: { code: "asc" },
            include: {
              racks: {
                orderBy: { code: "asc" },
                include: {
                  levels: {
                    orderBy: { sequence: "asc" },
                    include: { slots: { orderBy: { code: "asc" } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!workspace) redirect("/onboarding");
  const access = getWorkspaceAccessState(workspace);
  const limits = workspace.limits;

  return (
    <main className="app-placeholder-shell">
      <WorkspaceNavbar workspaceName={workspace.displayName} />
      <section className="warehouse-page">
        <header className="warehouse-page-heading"><h1>Quản lý kho</h1><span className="warehouse-page-capacity">{capacityLabel(workspace.warehouses.length, workspace.limits?.warehouseLimit, "kho")}</span></header>
        {!access.writable ? (
          <Alert className="warehouse-access-alert">
            <AlertTitle>Chỉ xem</AlertTitle>
            <AlertDescription>{access.message}</AlertDescription>
          </Alert>
        ) : null}

        {workspace.warehouses.length === 0 ? (
          <section className="warehouse-empty-state">
            <h2>Bạn chưa có kho nào</h2>
            {access.writable ? <CreateNodeForm kind="warehouse" triggerLabel="Tạo kho mới" /> : null}
          </section>
        ) : (
          <ol className="warehouse-hierarchy">
            {workspace.warehouses.map((warehouse) => (
              <LocationRow
                key={warehouse.id}
                code={warehouse.code}
                level={0}
                name={warehouse.name}
                summary={capacityLabel(warehouse.zones.length, limits?.zonesPerWarehouseLimit, "phân khu")}
                hasChildren={warehouse.zones.length > 0}
                type="Kho"
                actions={access.writable ? <NodeActions kind="warehouse" id={warehouse.id} version={warehouse.version} code={warehouse.code} name={warehouse.name} storageClass={warehouse.storageClass} label="kho" /> : null}
              >
                {warehouse.zones.map((zone) => (
                  <LocationRow
                    key={zone.id}
                    code={zone.code}
                    level={1}
                    name={zone.name}
                    summary={capacityLabel(zone.racks.length, limits?.racksPerZoneLimit, "kệ")}
                    hasChildren={zone.racks.length > 0}
                    type="Phân khu"
                    actions={access.writable ? <NodeActions kind="zone" id={zone.id} version={zone.version} code={zone.code} codePrefix={warehouse.code} name={zone.name} storageClass={zone.storageClass} inheritedStorageClass={warehouse.storageClass} label="phân khu" /> : null}
                  >
                    {zone.racks.map((rack) => (
                      <LocationRow
                        key={rack.id}
                        code={rack.code}
                        level={2}
                        name={rack.name}
                        summary={capacityLabel(rack.levels.length, rack.configuredLevelCount, "tầng")}
                        hasChildren={rack.levels.length > 0}
                        type="Kệ"
                        utility={<LocationQrDialog code={rack.code} label="kệ" />}
                        actions={access.writable ? <NodeActions kind="rack" id={rack.id} version={rack.version} code={rack.code} codePrefix={zone.code} name={rack.name} levelCount={rack.configuredLevelCount} levelLimit={limits?.levelsPerRackLimit} slotLimit={limits?.slotsPerLevelLimit} slotPlans={rack.levels.map((level) => ({ sequence: level.sequence, slotCount: level.slots.length }))} storageClass={rack.storageClass} inheritedStorageClass={zone.storageClass} label="kệ" /> : null}
                      >
                        {rack.levels.map((level) => (
                          <LocationRow
                            key={level.id}
                            code={level.code}
                            level={3}
                            name={level.name}
                            summary={capacityLabel(level.slots.length, limits?.slotsPerLevelLimit, "ô chứa")}
                            hasChildren={level.slots.length > 0}
                            type={`Tầng ${level.sequence}`}
                            actions={access.writable ? <NodeActions kind="level" id={level.id} version={level.version} code={level.code} name={level.name} sequence={level.sequence} levelCount={rack.configuredLevelCount} levelPositions={rack.levels.map((item) => ({ sequence: item.sequence, version: item.version }))} storageClass={level.storageClass} inheritedStorageClass={rack.storageClass} label="tầng kệ" /> : null}
                          >
                            {level.slots.map((slot) => (
                              <LocationRow
                                key={slot.id}
                                code={slot.code}
                                level={4}
                                name={slot.name}
                                type="Ô chứa"
                                utility={<LocationQrDialog code={slot.code} label="ô chứa" />}
                                actions={access.writable ? <NodeActions kind="slot" id={slot.id} version={slot.version} code={slot.code} name={slot.name} storageClass={slot.storageClass} inheritedStorageClass={level.storageClass} label="ô chứa" /> : null}
                              />
                            ))}
                          </LocationRow>
                        ))}
                        {access.writable && rack.levels.length === 0 ? <LocationEmptySlot><NodeActions kind="rack" id={rack.id} version={rack.version} code={rack.code} codePrefix={zone.code} name={rack.name} levelCount={rack.configuredLevelCount} levelLimit={limits?.levelsPerRackLimit} slotLimit={limits?.slotsPerLevelLimit} storageClass={rack.storageClass} inheritedStorageClass={zone.storageClass} editLabel="Thiết lập tầng" hideDelete label="kệ" /></LocationEmptySlot> : null}
                      </LocationRow>
                    ))}
                    {access.writable && zone.racks.length < (limits?.racksPerZoneLimit ?? 0) ? <LocationEmptySlot><CreateNodeForm kind="rack" parentId={zone.id} inheritedStorageClass={zone.storageClass} levelLimit={limits?.levelsPerRackLimit} slotLimit={limits?.slotsPerLevelLimit} triggerLabel="Thêm kệ" /></LocationEmptySlot> : null}
                  </LocationRow>
                ))}
                {access.writable && warehouse.zones.length < (limits?.zonesPerWarehouseLimit ?? 0) ? <LocationEmptySlot><CreateNodeForm kind="zone" parentId={warehouse.id} inheritedStorageClass={warehouse.storageClass} triggerLabel="Thêm phân khu" /></LocationEmptySlot> : null}
              </LocationRow>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
