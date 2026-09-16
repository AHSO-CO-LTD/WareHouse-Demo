# Plan 0002 — shadcn/ui and Sonner Refactor

- Status: Complete
- Date: 16/09/2026
- Approved scope: all current public UI routes and reusable UI components

## Objective

Adopt shadcn/ui as the mandatory UI primitive system and Sonner as the only toast system while preserving the existing AHSO brand, application behavior, authentication, APIs, and database.

## Mandatory Requirements

- Every new interactive UI primitive must come from `src/components/ui` shadcn components or an approved composition of them.
- Use Sonner for asynchronous success, system feedback, and non-field errors.
- Keep validation errors inline at their fields; do not replace field validation with toast notifications.
- Do not use native browser select/datalist popups for product controls.
- Preserve the Vietnamese-first interface, light/dark support, favicon/logo, and existing route behavior.

## Current-State Findings

- Next.js App Router, Tailwind CSS 4, `src/` directory, and the `@/*` alias are already configured.
- The project has no shadcn configuration, UI primitive directory, Radix dependencies, or Sonner dependency.
- Current routes use custom CSS classes for layout and controls; no backend or database changes are needed.

## Implementation Phases

1. **Foundation — Done**
   - Initialize shadcn/ui with the Radix base and project aliases.
   - Add design tokens that preserve the AHSO palette and Be Vietnam Pro typography.
   - Add shared UI primitives, Sonner Toaster, and a small UI usage convention.
2. **Shared Shell and Landing — Done**
   - Refactor navigation, brand actions, theme toggle, cards, CTA buttons, and status surfaces.
3. **Authentication and Registration — Done**
   - Refactor login, registration, OTP, password recovery, reset, and password change controls.
   - Keep the custom birth-year composition on shadcn Input and Button primitives so it remains a typed, browser-independent control.
4. **Onboarding, Demo, and Platform — Done**
   - Refactor forms, status panels, platform account controls, and confirmation surfaces.
5. **Cleanup and Documentation — Done**
   - Remove superseded primitive CSS, retain only brand/layout CSS where required.
   - Update project documentation and record verification actually performed.

## Component Baseline

Button, Input, Label, Checkbox, Card, Badge, Separator, Field, Alert, Alert Dialog, Popover, Command/Combobox, Scroll Area, Input OTP, Skeleton, Tooltip, and Sonner.

## Dependencies

The shadcn CLI will add component-specific dependencies for the Radix base. Sonner is added explicitly for notifications. No React, Next.js, Better Auth, Prisma, or database dependency is replaced.

## Risks and Mitigations

- **Visual drift:** preserve existing color and typography tokens, migrate route-by-route.
- **Behavioral drift:** leave API calls, form payloads, and validation contracts unchanged.
- **Notification spam:** retain inline field errors and restrict toast use to meaningful asynchronous outcomes.
- **Native-looking controls:** use shadcn Radix components for selection, menus, dialogs, and checkboxes.

## Non-goals

- No API, database, authentication, role, permission, or business-workflow change.
- No new form-state library or redesign of product copy.

## Definition of Done

- Current UI routes use the shadcn primitive layer for interactive elements.
- Sonner is mounted globally and used only where appropriate.
- No native product dropdown/datalist popup remains.
- Existing user flows and inline field errors remain intact.
- Obsolete primitive CSS is removed or reduced to layout/brand concerns.
