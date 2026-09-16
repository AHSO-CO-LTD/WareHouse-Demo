# ADR 0007 — shadcn/ui Primitives and Sonner Notifications

- Status: Accepted
- Date: 16/09/2026

## Context

The early demo used custom CSS controls. As the number of screens grows, this creates duplicated accessibility, focus, overlay, and state behavior. The project requires a single maintained UI primitive system and a consistent notification surface.

## Decision

- Use shadcn/ui with the Radix base for every new interactive primitive.
- Store generated shadcn components in `src/components/ui` and compose them rather than copying primitive styles into individual pages.
- Use Sonner as the only toast system. Keep validation errors inline with their fields.
- Do not use native browser select or datalist popups for product controls.
- Follow the accepted `docs/DESIGN_LANGUAGE.md` for content hierarchy, direct action labels, action target sizes, same-row alignment, tooltip use, and light/dark accessibility.

## Consequences

- The project gains component-specific dependencies managed by the shadcn CLI and Sonner.
- Existing custom controls are migrated incrementally during the approved refactor; layout and AHSO brand CSS remain where they provide project-specific value.
- New UI work must start with an existing shadcn primitive before creating a custom component.
- UI copy and layout changes must keep safety, validation, consent, loading, permission, and recovery information visible even when the rest of the screen is simplified.
