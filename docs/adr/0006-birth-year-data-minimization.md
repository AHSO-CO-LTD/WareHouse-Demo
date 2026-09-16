# ADR 0006 — Optional Birth Year Data Minimization

- Status: Accepted
- Date: 16/09/2026
- Supersedes in part: ADR 0005 for optional date-of-birth collection

## Context

The public registration form previously collected an optional full date of birth. The demo does not use the day or month for account eligibility, onboarding, authorization, or reporting.

## Decision

- Replace the optional `dateOfBirth` user field with optional integer `birthYear`.
- Registration accepts a four-digit birth year from the current year back to 120 years earlier.
- Existing date values are migrated to their calendar year before the precise date column is removed.

## Consequences

- The application retains less personal information while still supporting any future age-range display need.
- The migration permanently removes existing day and month precision; rollback after deployment requires a database backup taken before the migration.
