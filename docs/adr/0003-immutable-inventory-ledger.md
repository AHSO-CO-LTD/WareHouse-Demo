# ADR 0003 — Immutable Inventory Ledger with Derived Totals

- Status: Accepted
- Date: 15/09/2026

## Context

The main business problem is that spreadsheet users can overwrite quantities without reliable traceability. Warehouse totals must remain consistent with location stock, and historical project cost must not change when a product's current cost changes.

## Alternatives

1. Store and edit a current quantity on each product.
2. Store separate totals at warehouse, rack and slot levels.
3. Use immutable ledger entries with transactional balance records at slot level.

## Decision

- Record posted warehouse movements as immutable ledger entries.
- Maintain transactional balances at `product + lot + slot + status`.
- Derive level, rack, zone and warehouse totals from slot balances.
- Correct posted errors through linked reversal or adjustment documents.
- Store current cost on the product and snapshot cost/conversion data on historical document lines.

## Rationale

- Provides traceability and prevents silent historical edits.
- Avoids disagreement between independently stored totals.
- Supports FIFO/FEFO, stock states, transfers, reservations and project costing.

## Consequences

- Posting requires database transactions and concurrency protection.
- Reversal/idempotency rules are mandatory.
- Balance reconciliation checks are needed even though the ledger remains the audit source.
- Product cost changes affect current valuation but not historical project cost.
