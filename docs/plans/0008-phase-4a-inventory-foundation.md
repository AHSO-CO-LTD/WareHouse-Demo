# Plan 0008 — Phase 4A Inventory Foundation

- Status: Implementation complete — verification pending
- Date: 17/09/2026
- Approved scope: opening balance, receipts, issues, immutable ledger and slot balances.

## Objective

Provide real, tenant-isolated stock records without negative balances or editable posted history.

## Included

1. Inventory documents with multiple lines for `OPENING`, `RECEIPT` and `ISSUE`.
2. Base-unit quantity accounting, with unit-conversion and cost snapshots on each posted line.
3. Immutable ledger entries and derived balances by workspace, product, optional lot and slot.
4. `/inventory` balance screen and shadcn posting dialogs.
5. Server-side active-workspace, quota, idempotency, scoped-resource, non-negative balance, transaction and audit protection.
6. Dependency-aware location/catalog deletion and child-first lifecycle purge.

## Explicit non-goals

- Transfers, stocktakes, adjustments, reversals, reservations, FIFO/FEFO and expiry suggestions.
- Creating lots during receiving, QR scan lookup, supplier records or inventory imports.

## Data design

| Model | Core rule |
| --- | --- |
| `InventoryDocument` | generated code, type, idempotency key and immutable posted time |
| `InventoryDocumentLine` | product/slot required; lot optional; captures entered-unit, factor, base quantity and cost |
| `InventoryLedgerEntry` | one immutable signed movement per document line |
| `InventoryBalance` | current quantity unique by workspace/product/lot-key/slot/status |

`lotKey` is non-null and uses a reserved sentinel when no lot is selected, avoiding PostgreSQL nullable-unique duplicates.

## Safety and rollout

- Migration only adds tables, enums, relations and indexes; it does not transform or delete existing data.
- Posting writes the document, lines, ledger, balance updates and audit in one serializable transaction with bounded retry.
- Issue balance updates require sufficient quantity in the database predicate.
- Lifecycle purge removes ledger/balance children before catalog and location data.

## Implementation record

- Done in source: immutable document, line, ledger and balance models; the additive migration has been deployed to the configured local PostgreSQL database.
- Done in source: `/inventory` balance and recent-document screen, multi-line opening/receipt/issue dialogs, confirmation and unsaved-draft protection.
- Done in source: server-side workspace scope, active-workspace guard, quota, idempotency, Decimal conversion snapshots, non-negative issue predicate, serializable transaction and audit.
- Done in source: dependency guards for catalog and locations with inventory history, plus child-first inventory purge.
- Pending: automated typecheck/lint and runtime workflow, concurrent-posting and tenant-isolation verification.

## Definition of Done

- Opening, receipt and issue post atomically into immutable ledger and balance records.
- Each record is scoped to the active demo workspace; dependent records block unsafe deletes.
- The balance screen handles empty, active and read-only workspaces.
- Typecheck, lint and runtime workflow verification remain separately recorded when requested.
