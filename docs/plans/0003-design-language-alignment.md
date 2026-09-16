# Plan 0003 — Design Language Alignment

- Status: In Progress
- Date: 16/09/2026
- Approved scope: align current UI and transform the public homepage into an illustrated project-introduction page with GSAP ScrollTrigger motion

## Objective

Apply the accepted AHSO design language to all existing user-facing routes without changing authentication, APIs, data, roles, or business rules.

## Mandatory rules

- Remove eyebrow/pre-title labels and non-essential title descriptions.
- Use direct task/action labels and large, obvious controls.
- Keep large titles to one line whenever the viewport permits it.
- Align equal-height boxes and actions within a shared row.
- Move optional non-critical help to tooltips; retain visible safety, validation, consent, loading, permission, and recovery information.

## Current-state audit

| Area | Finding | Alignment work |
| --- | --- | --- |
| Landing | Hero has an eyebrow, a general summary, two competing CTAs, and explanatory proof copy. | Keep direct task/title and one primary action per area; retain only facts needed to choose the demo path. |
| Auth shell | `AuthPage` requires eyebrow and description props; all auth routes inherit the extra hierarchy. | Make the shell title-led; keep only route-specific safety information where it is required. |
| Login and registration | Cross-route links are clear, but the surrounding shell contains generic context copy. | Preserve the links and validation; simplify title/header copy. |
| OTP, reset, and password change | Some descriptions carry security consequences. | Remove generic instructions; retain visible security consequences or attach non-critical help to relevant controls. |
| Onboarding | Intro uses an eyebrow and explanatory paragraph beside the form. | Reduce to the setup task and only required workspace context. |
| Demo and Platform | Placeholder/administration views use eyebrow and explanatory copy above actions. | Replace with direct task titles and clear capability/action labels. |
| Controls | Form submit buttons are generally large; header/action variants and icon controls need a route-by-route size audit. | Enforce 48px primary/form actions and 40px minimum header/icon targets. |
| Layout | Current form grids are mostly equal-column; card and panel heights have not been visually verified across all breakpoints. | Align same-row panels/actions and visually verify desktop plus narrow responsive layouts. |

## Implementation phases

1. **Documentation and audit — Done**
   - Publish `docs/DESIGN_LANGUAGE.md`.
   - Update UI architecture references and record the current audit.
2. **Shared shell and tokens — Done**
   - Simplify the reusable auth shell API and establish shared action-size/layout utilities.
   - Do not remove required field, security, consent, or status copy.
3. **Route alignment — Done**
   - Refactor landing, auth, onboarding, demo, and Platform route-by-route.
   - Preserve existing navigation, form payloads, validation, and permissions.
4. **Visual acceptance — Pending**
   - Inspect light/dark desktop and narrow layouts.
   - Confirm target sizes, title wrapping, equal-height rows, focus states, and reduced-motion behavior.
5. **Homepage project introduction — Done**
   - Replace the trial-only landing with project purpose, core capability, trial, and honest project-status sections.
   - Reuse the local warehouse image with section-specific framing.
   - Add GSAP ScrollTrigger reveal motion and CSS hover feedback for public landing content only.

## Non-goals

- No API, database, auth, permission, or workflow change.
- No dependency beyond the approved `gsap` package for public landing scroll motion.
- No removal or hiding of required safety, validation, consent, loading, permission, or recovery information.

## Definition of done

- Each active route follows `docs/DESIGN_LANGUAGE.md`.
- All non-essential eyebrow/subtitle copy is removed.
- Actions use direct labels and meet the defined target sizes.
- Same-row boxes/actions align at supported responsive breakpoints.
- Required feedback remains visible and light/dark contrast is preserved.
