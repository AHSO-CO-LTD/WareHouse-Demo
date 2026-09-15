# AHSO Warehouse Demo

Public, time-limited product demo for AHSO Warehouse. The demo lets a single Google-authenticated user explore warehouse structure, inventory operations, projects, costing, quotations, and a scaled 2D warehouse layout in an isolated workspace.

This repository is **not** the production warehouse product. A signed customer implementation is discovered, designed, and deployed separately.

## Current status

- Discovery: complete
- Plan: approved
- Implementation: Phase 0 complete, Phase 1 in progress

See [PROJECT_PROFILE.md](PROJECT_PROFILE.md) and the [approved implementation plan](docs/plans/0001-warehouse-demo-implementation-plan.md).

## Prerequisites

- Node.js 24.x
- npm 11.x
- PostgreSQL

## Local setup

1. Copy `.env.example` to `.env.local` and provide local values.
2. Install the exact locked dependencies with `npm ci`.
3. Generate Prisma Client with `npm run db:generate`.
4. Apply development migrations with `npm run db:migrate:dev`.
5. Start the app with `npm run dev`.

The initial migration is committed but has not been applied to a real database in this checkout.

## Platform bootstrap

After the migration is applied, create the first DEV interactively so the password is not stored in source or shell history:

```powershell
npm run auth:create-platform-user -- --email dev@example.com --name "AHSO DEV" --role platform_dev
```

Use `--force` only when intentionally adding a platform account to a database that already contains users. Runtime role changes will use application-owned guarded operations so the last DEV cannot be demoted or deleted.

Better Auth schema regeneration writes to the ignored review file `prisma/auth.generated.prisma`. Review and merge auth model changes into `prisma/schema.prisma`; never replace the application schema blindly.

Do not commit real database, OAuth, SMTP, or bootstrap credentials.

## Quality commands

- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
- `npm run build`
- `npm run db:validate`

Run verification in accordance with the approved phase plan.
