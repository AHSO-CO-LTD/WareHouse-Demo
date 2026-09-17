# Database Foundation

## Current engine and tooling

- PostgreSQL is the source of truth.
- Prisma 7.10.0 owns schema and migrations.
- The PostgreSQL driver adapter is used by the shared Prisma Client.
- Deployment uses `prisma migrate deploy`; `db push` is not part of the workflow.

## Initial migration

`prisma/migrations/20260915032000_init_foundation/migration.sql` creates:

- Better Auth identity tables: `user`, `session`, `account`, `verification`.
- Tenant foundation: `workspace`, `workspace_limit`, `consent_record`.
- Platform controls: `support_session`, `platform_setting`, `audit_log`.

`20260915090000_email_otp_auth` adds normalized phone/profile/consent and forced-password-change fields to `user`, plus `email_delivery` metadata for deduplicated non-OTP transactional messages. OTP content is never stored in `email_delivery`. A functional unique index on `LOWER(email)` and a unique E.164 phone constraint protect registration under concurrent requests.

`20260916130000_add_warehouse_hierarchy` adds the tenant-isolated location hierarchy: `warehouse`, `zone`, `rack`, `rack_level`, and `slot`. Each row carries `workspaceId`, an optimistic `version`, timestamps, and an optional `StorageClass`. Composite parent/workspace foreign keys prevent cross-workspace hierarchy links; parent deletion is restrictive and workspace deletion remains cascading.

`20260916143000_enforce_workspace_location_codes` adds a required code to `rack_level` and a shared `location_code_registry`. It reserves every location code once per workspace across all five hierarchy tables, normalizes persisted codes to uppercase, and refuses migration if existing codes are ambiguous. Both hierarchy migrations have been applied to the configured PostgreSQL database.

`20260916150000_enforce_parent_scoped_location_names` enforces unique names at the direct parent scope: workspace for warehouses, then warehouse, zone, rack, and rack level respectively. It refuses migration if existing names conflict and permits the same name under a different parent.

`20260916170000_add_rack_configured_level_count` stores each rack's available level positions independently of the currently existing `RackLevel` rows. It backfills the highest existing position, preserving deliberate empty positions after a level is deleted.

`20260917021352_add_product_catalog` adds workspace-scoped `unit`, `product`, `product_unit_conversion`, `inventory_lot` and immutable `product_cost_history` records. Product code/name and unit code/name are unique per workspace; current cost and conversion factors use PostgreSQL Decimal types. Lots have generated per-product sequences but no quantity or slot relation until the inventory ledger phase.

`20260917023000_add_unit_sequence` adds a non-null, workspace-scoped unit sequence. Existing units are assigned a stable sequence from creation order without rewriting their codes; new units use immutable generated `UOM-001…` codes.

`20260917040000_add_inventory_foundation` adds immutable inventory documents and lines, ledger entries, and current balances. Quantities retain eight Decimal places and balances are unique by workspace, product, optional-lot key, slot and status. Composite workspace foreign keys prevent a product, lot, unit or slot from another workspace being referenced by a stock record.

The external identity pair `(providerId, accountId)` is unique. A user owns at most one workspace. Workspace limits are copied into a one-to-one snapshot so a future global policy change does not silently alter an existing demo.

## Lifecycle

- `ONBOARDING`: identity exists but company/contact setup is incomplete.
- `ACTIVE`: business mutations are allowed.
- `READ_ONLY`: demo has expired and reads remain available during grace time.
- `PURGE_PENDING`: deletion is due or running.
- `PURGED`: tenant business data has been removed; minimal lifecycle/audit evidence may remain according to the final retention policy.

## Mutation rules

- Workspace scope comes from the verified session, never from a client-supplied tenant identifier.
- Important business mutations and their audit entry share one transaction.
- Optimistic concurrency uses the `version` field where concurrent updates are possible.
- Domain tables introduced in later phases must carry `workspaceId` and query-supporting indexes.
- Warehouse hierarchy create/update/delete actions use serializable transactions with bounded retry. Every mutation is scoped to the workspace derived from the session and writes an audit row in the same transaction.
- Location codes are normalized to uppercase and unique across every warehouse location type within a workspace. The registry is updated in the same transaction as create/update/delete.
- Location names are unique within their direct parent. Database conflicts are mapped to an explicit domain validation message.
- Rack layers and each layer's configured slot count are created and synchronized in the same serializable transaction. A rack keeps its configured level positions even if a middle level is removed. Empty levels can compact the levels above only while none has product assignments; explicit move/swap operations otherwise regenerate affected level/slot codes and registry records atomically.
- At purge time, warehouse hierarchy data is deleted child-first in the same transaction that marks the workspace `PURGED`.
- At the day-30 `READ_ONLY` transition no business data is deleted. At terminal purge, inventory ledger/balance/line/document records, catalog history/lots/conversions/products/units, and then hierarchy records are deleted child-first in the same transaction as the terminal audit entry.
- Inventory quantity and money will use PostgreSQL decimal types, not floating point.

## Migration status

All ten migration folders in the current checkout have been applied successfully to the configured local PostgreSQL database. Application workflow and cross-workspace isolation still require dedicated runtime verification.
