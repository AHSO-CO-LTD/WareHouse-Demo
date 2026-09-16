# AHSO Warehouse Design Language

- Status: Accepted
- Date: 16/09/2026
- Applies to: every public, onboarding, demo, and Platform interface

## Intent

The interface is a calm, direct warehouse-operation product. It should make the next action obvious without introductory copy, decorative hierarchy, or small hard-to-hit controls.

## Content hierarchy

- Start a page or section with one concise title that names the task or result.
- Do not use eyebrow text, pre-title labels, marketing-style taglines, or a generic subtitle below a title.
- Remove copy that does not help the user decide or complete the current action.
- Put optional, non-critical explanation in a shadcn Tooltip attached to the relevant control or label.
- Keep required information visible: validation errors, consent text, destructive/sensitive consequences, loading state, permission state, and recovery guidance must never be hidden in a tooltip.
- Prefer one-line titles. Do not insert decorative line breaks; responsive wrapping is allowed only when the viewport cannot accommodate the title.

## Naming

- Every heading, button, and control must communicate its task without surrounding context.
- Use action-first labels: `Đăng nhập`, `Tạo tài khoản`, `Tạo kho demo`, `Gửi mã OTP`, `Đăng xuất`.
- Avoid vague labels such as `Tài khoản AHSO`, `Tiếp tục`, or `Xác nhận` unless the object and outcome are visible in the same control or dialog.

## Actions and touch targets

- Each content area has one visually dominant primary action.
- Primary and form-submit buttons use at least 48px height. Header actions may use 40px when space is limited.
- Icon-only controls have at least a 40px target, an accessible name, and a Tooltip. Use a text label whenever the icon alone is not universally obvious.
- Secondary actions remain visible but never compete visually with the primary action.

## Layout and surfaces

- Prefer one clear layout over nested cards, decorative panels, or redundant separators.
- A group of boxes in the same visual row must share the same height and align their key content and actions on common axes.
- Use responsive grid/flex layouts; do not rely on fixed line breaks or fixed heights that clip localized text.
- Keep visual density low: spacing, contrast, and hierarchy must make clickable areas obvious before adding explanatory copy.

## Theme, components, and feedback

- Use semantic shadcn tokens and the AHSO light/dark palette. Text and controls must remain readable in both themes.
- Use primitives from `src/components/ui`; use Sonner only for meaningful asynchronous feedback.
- Keep field validation inline. Do not use native browser dialogs or native-looking product controls.
- Motion must be optional, non-blocking, and respect `prefers-reduced-motion`.
- Use GSAP ScrollTrigger only for narrative scroll motion on the public project-introduction page; keep hover feedback lightweight and CSS-driven.

## Review checklist

Before accepting a UI change, confirm:

1. The title and every action name the user task directly.
2. No non-essential eyebrow, subtitle, or explanatory paragraph remains.
3. Primary actions are large, readable, and easy to tap/click.
4. Same-row boxes have equal height and aligned actions.
5. The screen is understandable without a paragraph of instructions.
6. Required safety, validation, and status information remains visible.
7. Light and dark themes preserve contrast and hierarchy.
