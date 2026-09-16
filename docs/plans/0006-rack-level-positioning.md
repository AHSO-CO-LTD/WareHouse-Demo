# Plan 0006 — Rack Level Positions

- Status: Implemented; runtime verification pending
- Date: 16/09/2026
- Approved scope: stable rack level positions, safe empty-level deletion, explicit level move and swap

## Objective

Keep a rack's configured floor positions stable even when a middle floor is removed. A floor code is `F01` through `FNN`; a slot code is nested beneath its floor as `L01` through `LNN`.

## Business rules

- `Rack.configuredLevelCount` owns the available positions. Deleting a level does not silently reduce this count.
- A level and its slots can be removed only when none of those slots has product assignments. The current schema has no product assignment model, so this check is structured for the later relation and treats current slots as empty.
- If every higher level is also product-empty, deleting a level removes its empty slots and compacts the higher levels immediately. Their level and slot codes are regenerated in the same transaction.
- If a higher level has product assignments, deletion may leave an empty position; no populated level is moved automatically.
- A user may explicitly move a level to an empty position or swap it with another level. These operations are confirmed, optimistic-lock checked, audited and atomically update level/slot codes plus the global code registry.
- No product, lot, inventory or slot-product tables are added in this scope.

## Data design

- Add non-null `Rack.configuredLevelCount Int @default(1)`.
- Backfill existing racks with their highest existing `RackLevel.sequence` (minimum `1`). This is non-destructive.
- Keep `RackLevel.sequence` unique per rack. Empty positions have no `RackLevel` row.

## Implementation

1. Add schema migration and pass configured position count through rack create/edit flows.
2. Make rack synchronization operate on configured positions without recreating a deliberately empty middle position.
3. Add server-authoritative empty-product eligibility, compaction, move and swap operations using serializable transactions.
4. Regenerate affected level/slot identifiers and registry entries atomically; audit before/after positions.
5. Expose empty positions plus explicit Chuyển tầng / Đổi tầng dialogs in the hierarchy UI.
6. Update hierarchy documentation.

## Risks and mitigations

- Future inventory references: compaction never moves a populated level automatically.
- Code collisions during a move/swap: release and reserve the affected registry entries inside one transaction before final identifiers are written.
- Stale concurrent edits: use versions for the rack and selected levels; return a clear conflict.

## Definition of Done

- Done: migration and generated Prisma client are applied.
- Done in source: direct deletion, safe compaction, explicit move and swap are enforced server-side and audited.
- Done in source: the level action exposes Chuyển/đổi and requires confirmation for code-changing moves/swaps.
- Pending: runtime verification.
