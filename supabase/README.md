# Supabase

Configuration and assets for the RentMe Supabase project
(`uccixoonmbhrnyczyigt`, region eu-west-1, Postgres 17).

## Auth email templates

`templates/` holds the branded RentMe versions of the Supabase auth emails.
They are generated, not hand-edited, so the masthead, palette, glow and trust
language stay identical across every message and can be moved in one place. To
change them, edit `scripts/build-auth-emails.mjs` and regenerate:

```bash
node scripts/build-auth-emails.mjs
```

| File | Supabase template | Purpose it is written for |
|---|---|---|
| `templates/confirmation.html` | Confirm signup | A welcome. What the account unlocks |
| `templates/magic-link.html` | Magic Link | Quick and frictionless sign-in |
| `templates/recovery.html` | Reset Password | Calm and reassuring recovery |
| `templates/email-change.html` | Change Email Address | A security confirmation to audit |
| `templates/invite.html` | Invite user | An invitation, warmly worded |

Each template is composed from shared blocks in the generator rather than being
one shell with swapped words: the masthead purpose line, kicker, heading, panels
and closing sentence all change with the job the email is doing.

### Applying them

Two supported paths:

1. **Dashboard.** Authentication then Email Templates. Paste each file's contents
   into the matching template and save.
2. **Management API.** `PATCH` the auth config with the template bodies, keyed by
   `mailer_templates_<action>_content` (for example
   `mailer_templates_confirmation_content`). Keep the source of truth here in the
   repo and treat the dashboard as a deploy target.

### Template variables

Only variables Supabase actually provides are used. Do not add others.

| Variable | Where it appears |
|---|---|
| `{{ .ConfirmationURL }}` | All five: button, plain-text fallback link |
| `{{ .Token }}` | Confirm signup, magic link, recovery (the flows Supabase exposes it for) |
| `{{ .SiteURL }}` | All five, to resolve the logo |
| `{{ .Email }}` | All five, in the footnote; also in the email change audit panel |
| `{{ .NewEmail }}` | Email change only |

### Dependencies

- The lockup image resolves from `{{ .SiteURL }}/brand/rentme-logo.png`, so the
  transparent cutout at `apps/web/public/brand/rentme-logo.png` must be served at
  the deployed site URL. It is the only remote image in these emails: the
  gradient wordmark beside it is styled text, so the lockup still reads when
  images are blocked, which is the default in many clients. The larger artwork
  PNGs in that directory are deliberately not referenced, since they are over a
  megabyte each and far too heavy to send.
- Design values are mirrored from `packages/design-tokens/src/tokens.css` as
  literals, because email HTML cannot read CSS custom properties. If the brand
  palette or the CTA gradient changes there, update the constants at the top of
  `scripts/build-auth-emails.mjs` and regenerate.

### Compatibility notes

The web product's glass system is rebuilt out of email-safe parts, because
`backdrop-filter` does not exist in email and shadows are unreliable. Depth comes
from layered table backgrounds: a luminous gradient cap, a 1px gradient ring
drawn as table padding, a masthead panel a shade lighter than the card, hairlines
that fade out at both ends, and soft inner panels for the code and note blocks.

- Table layout only. No flex, no grid, no positioning.
- Every colour and dimension is inline on the element. The one `<style>` block
  carries a light-mode courtesy and nothing more: no layout or legibility depends
  on it.
- System font stack only, no web fonts.
- `background-color` is always declared **before** `background-image`, because
  the Word rendering engine in Outlook drops background images and keeps the
  colour. So every gradient has a deliberate solid fallback, and the CTA degrades
  to a solid electric blue pill with white text.
- The wordmark uses gradient-clipped text with a solid blue colour declared
  first, since many clients ignore `background-clip` and would otherwise render
  nothing at all.
- Container is 560px wide, fluid down to 320px, and is checked to read on a
  390px Android screen in Gmail.
- Every template keeps the plain-text fallback link, because clients strip
  buttons, and a hidden preheader so the inbox line is deliberate rather than
  scraped from body copy.
- Dark is the default and these are dark-first designs. In light mode the card
  stays dark on purpose, because the mark is a cutout made for dark surfaces:
  only the paper behind the card and the small print sitting on that paper
  change, which keeps the light-mode risk to two declarations.
