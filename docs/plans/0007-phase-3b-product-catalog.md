# Plan 0007 — Phase 3B Product Catalog

- Status: Complete — user accepted; automated verification is not recorded for the latest checkout
- Date: 17/09/2026
- Approved scope: product master data, units, conversion factors, lots and cost history only

## Objective

Create the tenant-isolated catalog that Phase 4 inventory will use, without storing stock, assigning products to slots, or creating simulated inventory transactions.

## Approved rules

- A product code and name are unique inside its workspace; the 20-product demo quota is enforced server-side.
- A workspace owns reusable units. Unit codes are generated as immutable `UOM-001…`; users enter only the display name. Each product has one mandatory base unit and optional alternate units with a positive Decimal conversion factor.
- Current product cost is VND Decimal data. Every create/change writes a `ProductCostHistory` record in the same transaction and never rewrites history.
- A lot belongs to one product, has an internally generated code, optional supplier lot reference and optional manufacture/expiry dates. A lot carries no quantity or slot yet.
- Product/unit/lot mutations require an active workspace, verified demo ownership, optimistic version checks where applicable, and one audit entry in the same transaction.
- Delete is blocked when future dependent data exists. In this phase a product can only be deleted after its lots and conversions are removed; base units cannot be deleted while referenced.

## Data model

| Table | Key constraints |
| --- | --- |
| `unit` | unique workspace code and name |
| `product` | workspace scope, unique code/name, required base unit, Decimal current cost, version |
| `product_unit_conversion` | unique product/unit; positive Decimal factor |
| `inventory_lot` | product scope, generated sequence and code, optional dates/reference, version |
| `product_cost_history` | immutable product cost change evidence with actor |

## Delivery

1. Add Prisma schema/migration and extend lifecycle purge child-first.
2. Add catalog domain service: scope, quota, validation, transactions, optimistic checks and audit.
3. Add `/products` with product/unit/lot create, edit and safe delete dialogs using shadcn/Sonner.
4. Preserve the existing light/dark, lifecycle read-only and empty-state behavior.
5. Update database/project documentation.

## Explicit non-goals

- No stock balance, slot assignment, receiving, issue, transfer, reservation, FEFO/FIFO, barcode/QR generation or supplier/CRM entity.
- No fake inventory counts. These begin only with the Phase 4 immutable ledger.

## Definition of Done

- Catalog records are tenant-isolated and lifecycle/quota protected server-side.
- Costs/conversions use Decimal data and history/audit writes are atomic.
- The catalog UI is usable in empty, active and read-only workspaces.
- Migration is reversible by restoring a pre-migration database backup; no destructive data transform is included.
