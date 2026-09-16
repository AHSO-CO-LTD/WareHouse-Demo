# Plan 0004 — Phase 2A Workspace Lifecycle

- Status: Implementation complete — verification pending
- Date: 16/09/2026
- Approved scope: workspace trial lifecycle and lifecycle-readiness only

## Objective

Enforce the 30-day trial lifecycle already represented in `Workspace` without introducing warehouse, catalog, or inventory models ahead of Phase 3.

## Approved rules

- A workspace becomes `READ_ONLY` at `expiresAt` (day 30).
- A workspace progresses through `PURGE_PENDING` and then `PURGED` at `purgeAt` (day 37).
- A `PURGED` workspace remains attached to its owner; the same email cannot create another trial.
- Lifecycle execution is idempotent, authenticated with `INTERNAL_JOB_SECRET`, bounded, and audited.
- Only `ACTIVE` workspaces are writable. This rule is exposed as a shared server-side guard for later domain mutations.

## Current-state findings

- `Workspace`, `WorkspaceLimit`, lifecycle timestamps and the required status enum already exist in Prisma.
- Onboarding already writes `startedAt`, `expiresAt`, `purgeAt`, limits and activation audit atomically.
- No warehouse, catalog, product, inventory, project, or quotation tables exist yet; real sample data, reset and quota counting cannot be implemented truthfully.
- The internal unverified-account purge endpoint establishes the authenticated scheduled-job pattern.

## Implementation

1. Add a server-only lifecycle service for effective access state, write guards and idempotent transitions.
2. Add an authenticated internal job endpoint that processes a bounded batch and records state-transition audits.
3. Expose lifecycle status on the current demo workspace screen, including the effective read-only state when a scheduler is delayed.
4. Reuse the timing-safe internal-job authorization helper for the existing cleanup job.
5. Update stable architecture documentation and the main implementation plan.

## Deferred to after Phase 3

- Warehouse/catalog/inventory sample data and reset-to-seed.
- Real quota enforcement against domain records.
- Lifecycle email reminders and delivery operations; these require the bounded-retry email worker planned for Phase 6.
- Platform lifecycle management screens and manual reset/delete controls.

## Risks and mitigations

- Scheduler delay: access evaluation treats an expired `ACTIVE` workspace as read-only until the job persists the transition.
- Concurrent job invocations: each transition uses conditional update plus audit in one database transaction.
- No domain data exists to purge: the current purge records the terminal lifecycle state only; future Phase 3 data purge must be added before production release.

## Definition of Done

- Job transitions due workspaces safely and reports counts.
- Transition audit exists once per successful state change.
- Demo user receives an explicit active/read-only/purged status.
- Shared write guard rejects non-active or time-expired workspaces.
- No seed/reset, quota enforcement, email reminder, or domain-data deletion is claimed before its required models exist.
