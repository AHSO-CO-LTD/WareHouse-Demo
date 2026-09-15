# Security Baseline

## Identity

- Public demo users sign in with Google.
- Email/password sign-up is disabled; credentials are reserved for provisioned Platform accounts.
- Password length is 12-128 characters and Better Auth stores the password hash.
- Password reset revokes existing sessions.
- OAuth tokens are encrypted at rest by Better Auth.

## Account linking

- Implicit same-email linking is disabled.
- A signed-in user must explicitly start Google linking.
- Different-email linking and unlinking the last authentication method are disabled.

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

- Database, OAuth, SMTP, Better Auth and Server Action keys remain outside Git.
- Passwords, access tokens, reset tokens and secrets must never be logged or written into audit metadata.
- Production errors return safe user messages; technical details belong in structured logs with a correlation ID.

## Remaining release gates

- Rate limiting for login, reset, onboarding, consultation and expensive exports.
- Tenant isolation and authorization integration tests against PostgreSQL.
- SMTP reset flow and one-time token acceptance.
- Support Mode enforcement and before/after audit tests.
- HTTPS, trusted proxy/origin and secure-cookie verification on the VPS.
