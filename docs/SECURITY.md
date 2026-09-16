# Security Baseline

## Identity

- Public demo users register and sign in with normalized email/password.
- Email and E.164 phone are unique. Database constraints are authoritative under concurrent registration.
- Email verification uses a six-digit OTP valid for 10 minutes, stored as a hash and invalidated when resent.
- Verification and password-reset OTP allow five attempts and at most five sends per hour; the UI adds a 60-second resend cooldown.
- Password length is 12-128 characters and Better Auth stores the password hash.
- Password reset revokes existing sessions.
- The bootstrap DEV uses an approved temporary password entered outside source and must change it before accessing platform functions.

## Email behavior

- OTP email is sent only on explicit registration, resend or reset actions.
- Welcome, demo activation and password-change messages are deduplicated by business-event key.
- OTP values and email bodies are never stored in delivery logs.
- Marketing email requires explicit consent and remains separate from mandatory account-security messages.

## Authorization

- Backend checks are authoritative on every Server Action and Route Handler.
- Demo User, Platform ADMIN and Platform DEV are distinct roles.
- Better Auth admin permissions intentionally omit impersonation for every role.
- Direct role mutation and account deletion are not granted through the generic admin plugin. Application-owned guarded operations will enforce the last-DEV invariant.

## Tenant isolation

- `workspaceId` is resolved from the current authenticated user in the server-only Data Access Layer.
- Business operations must query by both resource ID and workspace scope.
- Platform cross-workspace mutation is allowed only inside an active Support Session with reason, expiry and audit.

## Secrets and logging

- Database, SMTP, Better Auth, scheduled-job and Server Action keys remain outside Git.
- Passwords, access tokens, reset tokens and secrets must never be logged or written into audit metadata.
- Production errors return safe user messages; technical details belong in structured logs with a correlation ID.

## Remaining release gates

- Distributed rate-limit storage if deployment expands beyond one VPS instance.
- Tenant isolation and authorization integration tests against PostgreSQL.
- SMTP verification/reset flow, OTP expiry/attempt limits and delivery deduplication.
- Support Mode enforcement and before/after audit tests.
- HTTPS, trusted proxy/origin and secure-cookie verification on the VPS.
