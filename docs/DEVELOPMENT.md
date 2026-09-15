# Development Guide

## Runtime

- Node.js 24.x
- npm 11.x
- PostgreSQL

Dependencies are pinned exactly. Use `npm ci` for a clean installation.

## Environment

Copy `.env.example` to `.env.local` and replace every placeholder. Never commit `.env.local` or real credentials.

Required groups:

- App and Better Auth URLs/secrets
- PostgreSQL connection URL
- Google OAuth client
- SMTP configuration
- Demo lifecycle durations

For a self-hosted deployment, keep `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` stable across builds and instances.

## Database workflow

```powershell
npm run db:generate
npm run db:migrate:dev
```

Generate the Better Auth-only review schema with `npm run auth:schema:generate`. The command writes an ignored comparison file. Merge reviewed auth changes into the main Prisma schema, create a Prisma migration and regenerate the client.

Create the first Platform DEV only after migrations succeed. Omit `--password` so the CLI requests it interactively.

## Architecture boundaries

- `src/app`: routes, Server Actions and route handlers.
- `src/components`: UI only; no direct Prisma access.
- `src/data`: server-only session-aware Data Access Layer and safe DTOs.
- `src/lib/server`: database and server authentication runtime.
- `src/lib/auth`: shared auth policy and client integration.
- `prisma`: schema and migrations.

Every mutation authenticates, authorizes and validates again at its own entry point. Tenant scope is derived from session state.

## Quality commands

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run db:validate
npm run build
```

Run database, OAuth, SMTP and lifecycle smoke tests only against configured non-production resources unless an approved deployment plan says otherwise.
