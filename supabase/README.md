# Supabase

Configuration and assets for the NaijaFinds Supabase project
(`uccixoonmbhrnyczyigt`, region eu-west-1, Postgres 17).

## Auth email templates

`templates/` holds the branded NaijaFinds versions of the Supabase auth emails.
They are generated, not hand-edited, so the lockup, colour and gradient stay
identical across every message. To change them, edit
`scripts/build-auth-emails.mjs` and regenerate:

```bash
node scripts/build-auth-emails.mjs
```

| File | Supabase template |
|---|---|
| `templates/confirmation.html` | Confirm signup |
| `templates/magic-link.html` | Magic Link |
| `templates/recovery.html` | Reset Password |
| `templates/email-change.html` | Change Email Address |
| `templates/invite.html` | Invite user |

### Applying them

Two supported paths:

1. **Dashboard.** Authentication then Email Templates. Paste each file's contents
   into the matching template and save.
2. **Management API.** `PATCH` the auth config with the template bodies, keyed by
   `mailer_templates_<action>_content` (for example
   `mailer_templates_confirmation_content`). Keep the source of truth here in the
   repo and treat the dashboard as a deploy target.

### Dependencies

- The lockup image resolves from `{{ .SiteURL }}/brand/mark.png`, so the mark at
  `apps/web/public/brand/mark.png` must be served at the deployed site URL. Until
  the site is live, the gradient wordmark next to it is the visual fallback.
- Design values are mirrored from `packages/design-tokens/src/tokens.css` as
  literals, because email HTML cannot read CSS custom properties. If the brand
  palette or primary gradient changes there, update the constants at the top of
  `scripts/build-auth-emails.mjs` and regenerate.

### Compatibility notes

Table layout, fully inline styles, no external CSS and no web fonts. The button
carries the brand gradient as a background image over a solid violet fill, so it
degrades to solid violet on clients that drop background images (Outlook). The
wordmark uses gradient-clipped text with the same solid-violet fallback. A
one-time `{{ .Token }}` code is shown alongside the link on the flows Supabase
exposes it for, so the email still works if the link is stripped.
