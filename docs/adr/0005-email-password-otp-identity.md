# ADR 0005 — Email/Password Identity with Email OTP Verification

- Status: Accepted
- Date: 15/09/2026
- Supersedes: ADR 0002 for identity and registration decisions
- Superseded in part by: ADR 0006 for optional birth information

## Context

The public demo cannot depend on Google OAuth configuration. Registration must remain quick on desktop even when the user reads email on another device. Email and phone reuse must not allow repeated demo periods, and transactional email must be controlled to avoid spam.

## Alternatives

1. Keep Google OAuth as the only public identity method.
2. Use email verification links.
3. Use email/password with a six-digit email OTP.

## Decision

- Remove Google OAuth and account linking from all demo and platform accounts.
- Use normalized email as the only username; do not add a username field.
- Public registration requires name, email, phone, password and policy consent. Company and date of birth are optional.
- Normalize phone numbers to E.164 and enforce database uniqueness for both normalized email and phone.
- Verify email with a six-digit OTP valid for 10 minutes. Store only an OTP hash, allow five attempts and rotate the code on resend.
- Do not create a workspace or start the 30-day demo until onboarding is complete.
- Use the same OTP mechanism for password reset and revoke prior sessions after reset.
- Bootstrap one verified Platform DEV with a temporary deployment-time password and force a password change on first login. No password is committed to source.
- Keep one isolated workspace per verified account, fixed quotas, 30-day active lifetime and seven-day grace period from ADR 0002.

## Rationale

- OTP can be read on a phone and entered on the original desktop without transferring a browser session.
- Email/password removes external OAuth setup from the public demo.
- Database constraints protect uniqueness during concurrent registrations; application checks provide useful field-level feedback.
- Separating verification from activation avoids consuming demo time before the user finishes onboarding.

## Consequences

- SMTP becomes mandatory for registration and account recovery.
- Unverified accounts reserve their email and phone for seven days, then a protected scheduled job removes them.
- OTP and login endpoints require rate limits. Transactional email is deduplicated by business event; marketing requires explicit consent.
- A failed SMTP configuration blocks new verification/reset OTP delivery and must be covered by deployment smoke tests.
