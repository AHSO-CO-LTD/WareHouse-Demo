# Plan 0005 — Phase 3A Warehouse Hierarchy

- Status: Implemented; runtime verification pending
- Date: 16/09/2026
- Approved scope: warehouse location hierarchy only

## Objective

Deliver an audited, tenant-isolated hierarchy for `Warehouse → Zone → Rack → RackLevel → Slot`, ready for later product, lot, QR and inventory phases.

## Data design

| Entity | Required identity | Constraints |
| --- | --- | --- |
| Warehouse | `workspaceId`, `code`, `name` | `@@unique([workspaceId, code])`; one active warehouse by current demo quota |
| Zone | `warehouseId`, `code`, `name` | `@@unique([warehouseId, code])` |
| Rack | `zoneId`, `code`, `name` | `@@unique([zoneId, code])` |
| RackLevel | `rackId`, `sequence`, `name` | `@@unique([rackId, sequence])` |
| Slot | `workspaceId`, `rackLevelId`, `code`, `name` | `@@unique([workspaceId, code])` and `@@unique([rackLevelId, code])` |

All hierarchy FKs are restrictive. Each entity has an optimistic `version`, timestamps and optional `storageClass` (`LIGHT`, `MEDIUM`, `HEAVY`). A child must match an explicitly classified parent; a blank parent lets the child choose its own class.

## Implementation

1. Add Prisma schema and migration with tenant/query indexes.
2. Add server-only warehouse domain service and workspace-scoped data access helpers.
3. Enforce active lifecycle, demo-owner authorization, hierarchy validation and quotas in serializable transactions with bounded retry.
4. Audit create/update/delete in the same transaction; reject code/tier changes when a node has children and deletion when it has children.
5. Add `/warehouse` user screen with direct tree management, shadcn dialogs, inline validation and explicit empty/read-only states.
6. Replace the demo placeholder with a route to the warehouse screen.
7. Update database/project documentation and the main plan.

## Approved flow amendment — 16/09/2026

- A rack owns its layer configuration. Creating or editing a rack selects a layer count from `1` through the workspace's `levelsPerRackLimit`; individual layer creation is rejected.
- The same serializable transaction creates or synchronizes `RackLevel` records. Child codes are derived from their full parent code: zone and rack use the entered local suffix, layers use `F01`, and slots use `L01`.
- Reducing the count is rejected when a removed highest layer still has slots. This prevents silent data loss.
- Parent rows are setup controls only. Child creation is offered in a visible empty capacity row beneath the existing children and disappears at quota.
- Each rack configuration also carries a slot count for every generated `Tầng 1…N`, from `0` through `slotsPerLevelLimit`. Slots are generated or reduced atomically with the rack configuration; direct slot creation is not exposed in the hierarchy UI.
- Layer identifiers and ordinal positions remain managed by the rack. A layer name and each individual slot remain editable. An empty layer can be deleted directly; a layer that still has slots must have those slots deleted first.

## Non-goals

- No QR library or raster QR generation.
- No product, unit, lot, inventory balance, document or ledger model.
- No seed/reset of operational data until these domain models exist.
- No layout canvas, drag/drop or 2D map before Phase 7.

## Risks and mitigations

- Tenant leak: workspace is derived from the verified user server-side; client never selects a workspace.
- Quota race: hierarchy creates use serializable transactions with a bounded retry and count check in the transaction.
- Broken physical path: code is immutable once a node has children.
- Unsafe removal: restrictive FKs plus service-level child checks and confirmation dialogs.

## Definition of Done

- Done: hierarchy migrations are applied to PostgreSQL; location codes are unique across all hierarchy levels within a workspace and names are unique within their direct parent.
- Done in source: demo owner can manage allowed active-workspace locations only.
- Done in source: quota, storage-class inheritance, audit and concurrency checks are enforced server-side.
- Done in source: tree UI handles active, read-only and empty workspace states.
- Pending: perform runtime, tenant-isolation and UI verification.
