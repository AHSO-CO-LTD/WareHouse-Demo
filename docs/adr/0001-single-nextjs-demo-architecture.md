# ADR 0001 — Single Next.js Application for the Demo

- Status: Accepted
- Date: 15/09/2026

## Context

The product is a public, time-limited demonstration of AHSO Warehouse. It must be quick to operate and deploy on a VPS, but it is not the production warehouse product and will not be upgraded into that product after a contract is signed.

## Alternatives

1. Next.js frontend plus NestJS backend in a monorepo.
2. Single Next.js full-stack application.
3. Native/mobile-first system with a shared API.

## Decision

Use one TypeScript Next.js App Router application with PostgreSQL, Prisma 7 and Better Auth. Keep domain services and data access boundaries explicit so the code remains maintainable. Do not build NestJS, a Keyence client or offline synchronization for the demo.

## Rationale

- Reduces deployment and operational complexity for a public demo.
- Supports UI, server-side mutations, HTTP endpoints, authentication and PDF generation in one application.
- Avoids investing in production architecture before a signed customer's real constraints are known.

## Consequences

- The Next.js codebase must enforce module boundaries to avoid a monolith.
- Long-running work remains outside request handlers and is triggered by VPS scheduled tasks.
- The official product will be designed separately and may use a different architecture.
