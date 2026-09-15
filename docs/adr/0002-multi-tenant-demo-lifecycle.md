# ADR 0002 — Isolated Single-User Demo Workspaces

- Status: Accepted
- Date: 15/09/2026

## Context

The demo is publicly accessible. Each registrant must be able to test the system without seeing another registrant's data. Resources and retention must be bounded. Platform administrators need analytics and a controlled support capability.

## Alternatives

1. One shared sample workspace for all users.
2. One isolated workspace per Google account.
3. Multi-user organization workspaces with invitations.

## Decision

- Create one isolated workspace for each verified Google account.
- Do not support invitations or account linking inside a demo tenant.
- Apply fixed quotas and a 30-day lifetime.
- Lock the workspace on day 30 and purge tenant business data on day 37.
- Provide Platform DEV/ADMIN with a reason-bound, time-limited Support Mode instead of impersonation.

## Rationale

- Prevents users from overwriting a shared dataset.
- Keeps demo collaboration and permission complexity bounded.
- Makes cost and lifecycle predictable.
- Allows support without hiding the platform actor responsible for a mutation.

## Consequences

- Two employees from the same company receive separate demo workspaces.
- Two-person approvals cannot operate correctly and are locked off in demo.
- Tenant scoping and isolation tests are release gates.
- The system needs scheduled reminders, lock and purge jobs.
- Support access and cross-tenant reads/writes require audit records.
