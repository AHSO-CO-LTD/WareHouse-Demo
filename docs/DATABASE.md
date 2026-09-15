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
- Inventory quantity and money will use PostgreSQL decimal types, not floating point.

## Migration status

The initial SQL was generated and schema validation passed. It has not been executed against a real PostgreSQL database yet, so database runtime behavior is not verified.
