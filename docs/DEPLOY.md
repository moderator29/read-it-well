# Vallo deploy runbook

Written for the owner, to be worked top to bottom. Every step is either a
value to paste, a dashboard screen to visit, or a command to run. Where
something cannot be automated from this repository it says so, and where a
capability is not built yet it says that too, in section 9.

Target platform: Vercel (Next.js 16 App Router, Turbopack). Database, auth
and storage: Supabase project `uccixoonmbhrnyczyigt` (eu-west-1, Postgres 17).
Payments: Paystack. Transactional email: Resend. Deploy branch policy:
`main` is never pushed to from a working session, so the production branch on
Vercel should be whichever branch the owner promotes deliberately.

Order of operations, because some steps depend on earlier ones:

1. Create the Vercel project and set the environment variables (section 2).
2. Deploy once, so a real HTTPS URL exists (section 3).
3. Feed that URL back into `NEXT_PUBLIC_SITE_URL`, Supabase auth and Paystack
   (sections 3, 4, 5), then redeploy.
4. Work the pre-launch checklist (section 7) and the post-deploy smoke test
   (section 8).

---

## 1. What is in the box

Counts corrected 2026-08-09. They said 36 routes and 23 migrations, which was
true on 2026-07-29 and understated the platform by a factor of three.

- **85 page routes**, plus four API routes under `apps/web/src/app/api`:
  `/api/assistant`, `/api/paystack/webhook`, `/api/support`, `/api/csp-report`.
- **120 applied migrations, 71 tables**, RLS on every one, `private.*`
  security-definer helpers. Nothing in this runbook needs a migration run by
  hand unless section 4.6 says so.
- **`pg_cron` installed with six active jobs.** They run whether or not the web
  application is up. ADR-014.
- An installable PWA: `apps/web/src/app/manifest.ts` serves
  `/manifest.webmanifest`, `apps/web/public/sw.js` is the hand written service
  worker, `/offline` is the offline shell, and the icon set lives in
  `apps/web/public/pwa/`.
- Five branded Supabase auth email templates in `supabase/templates/`, which
  must be pasted into the dashboard by hand (section 4.4).

---

## 2. Environment variables

Set every one of these in Vercel under **Project Settings, Environment
Variables**, for the Production and Preview environments. Anything marked
SERVER ONLY must never be given the `NEXT_PUBLIC_` prefix, because that prefix
inlines the value into the browser bundle.

The template in `apps/web/.env.example` is the starting point for local
development (`cp apps/web/.env.example apps/web/.env.local`), and it is now
the **only** template: the second one at the repository root is a signpost
pointing here, because Next.js loads `.env.local` from the application
directory and a value set at the workspace root is read by nothing.

Every variable in that template is read by code, and every variable the code
reads is in it. Section 2.5 lists what was removed to make that true, so that
nobody re-adds a key on the strength of having seen it here once.

### 2.1 Required for the platform to do anything real

| Variable | If it is missing | Where to obtain it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The whole Supabase layer switches off. Every client is env-guarded, so nothing crashes: discovery returns **nothing** and every screen draws its designed empty state, sign-in and sign-up render as honest disabled states. The seed catalogue this row used to promise as a fallback was deleted, deliberately, and an honest absence replaced it (ADR-005). Nothing writes to a database. | Supabase dashboard, Project Settings, API. Already known for this project: `https://uccixoonmbhrnyczyigt.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above. The URL alone is not enough; `isSupabaseConfigured()` requires both, and the auth middleware becomes a pass-through. | Supabase dashboard, Project Settings, API, "anon public" key |
| `SUPABASE_SERVICE_ROLE_KEY` (SERVER ONLY) | **Set this first, and verify it.** Every path that must bypass RLS legitimately stops working, and the worst one does so silently: the Paystack webhook answers HTTP 200 with `{received:false}` and no log (`app/api/paystack/webhook/route.ts:242-243`), so Paystack never retries and a funding that was paid for is lost permanently. The redirect verify path takes the same branch. This is the most probable cause of the reported wallet failure: `RECOMMENDATIONS.md` W-1. Also affected: booking `confirm`, and anonymous support escalation (there is deliberately no anon insert policy on `support_tickets`). Signed-in user paths under their own RLS keep working. | Supabase dashboard, Project Settings, API, "service_role" key. Treat as a root password |
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs fall back to `http://localhost:3000`. Consequences: Open Graph and canonical URLs in page metadata point at localhost, Paystack callback URLs built by the wallet actions point at localhost, and rendered email links point at localhost. This is the single most commonly forgotten variable and the damage is invisible until someone shares a link. | Your own production URL, for example `https://rentme.ng`. No trailing slash |

### 2.2 Required per feature

| Variable | If it is missing | Where to obtain it |
|---|---|---|
| `PAYSTACK_SECRET_KEY` (SERVER ONLY) | Wallet funding, withdrawal and transfer answer honestly that the capability switches on the moment the key lands, rather than pretending. The webhook route cannot verify a signature, so no ledger entry is ever settled. Money never moves. This is the **only** Paystack variable: funding redirects to Paystack's hosted checkout so no public key is read in the browser, and Paystack issues no separate webhook secret, signing each callback with an HMAC SHA-512 of the raw body keyed by this same key. | Paystack dashboard, Settings, API Keys and Webhooks. Use the **live** secret key in Production and a test key in Preview. Set the webhook URL on that same screen to `https://<your-domain>/api/paystack/webhook` |
| `ANTHROPIC_API_KEY` (SERVER ONLY) | `/api/assistant` answers 200 with an honest message instead of streaming. The assistant UI still renders and the thread store still works; the model simply never speaks. | https://console.anthropic.com/settings/keys |
| `ASSISTANT_MODEL` | Optional. Falls back to the default model pinned in `app/api/assistant/route.ts`. Only set this to move the assistant to a different model deliberately. | Not a secret. A model identifier |
| `SUPPORT_MODEL` | Optional. The same, for the support escalation summariser in `app/api/support/route.ts`. Falls back to its own pinned default. | Not a secret. A model identifier |
| `RESEND_API_KEY` (SERVER ONLY) | `isEmailConfigured()` returns false, `sendEmail` returns `{sent: false, reason: "unconfigured"}` and nothing leaves the process. Every event that would have emailed still fires its in-app notification, so users are not left uninformed, only un-emailed. Email and password sign-in is unaffected: Supabase issues that session itself. | https://resend.com/api-keys. The sending domain must be verified in Resend first, or Resend rejects the send |
| `EMAIL_FROM` | Optional. Defaults to `Vallo <hello@rentme.ng>`. If that domain is not the one verified in Resend, every send is rejected, so set this to match the verified domain. | Your verified sending address |
| `NF_DATA_SOURCE` | Optional. Selects the repository implementation for listings, agents and messages. Leave unset for the default. Setting it to `api` throws on the agent repository, which is not implemented. | Not a secret |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | **Leave unset, permanently.** Email and password only, by owner decision. Section 4.2 says why, and `RECOMMENDATIONS.md` N-4 removes the code. | Do not set |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | All six "contact support" surfaces point at `/contact` instead of a `mailto:`. That is a working channel, not a fallback: the form writes a real `support_tickets` row under RLS and the reply notifies the sender. Set this only once the mailbox genuinely receives mail, because an address that bounces fails silently while the person who wrote believes they have asked. | Your own mailbox, once it exists |
| `NEXT_PUBLIC_NGN_USD_RATE` | The wallet's currency toggle does not render and balances show in naira only. There is deliberately no fallback rate in code: an invented or stale figure sitting where somebody reads their balance is worse than no conversion. | Naira per one US dollar |

### 2.3 Optional, safe to leave empty at launch

| Variable | If it is missing | Where to obtain it |
|---|---|---|
| `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_ENV` (SERVER ONLY) | Third-party hotel inventory stays absent. The provider layer is not built yet (see section 9). | https://developers.amadeus.com/register, then My Self-Service Workspace, Create app. Start on `test` |
| `GOOGLE_PLACES_API_KEY` (SERVER ONLY) | No restaurant discovery or address autocomplete from Places. Not built yet. | https://console.cloud.google.com/apis/credentials with "Places API (New)" enabled |
| `BASE_URL` | Nothing in the product. Read only by the Playwright specs in `apps/web/tests`, each of which defaults to its own localhost port. Set it only to point the suite at a deployed build. | Not a secret |

### 2.4 Social sign-in: do not configure it

**Corrected 2026-08-09. This section used to tell you how to set Google and
Apple up. Do not.** The product is email and password only, by owner decision.
Leave `NEXT_PUBLIC_AUTH_PROVIDERS` unset and enable nothing in the Supabase
Authentication, Providers screen.

The code has not caught up yet: `startGoogleOAuth` and `startAppleOAuth` still
exist in `apps/web/src/lib/auth/actions.ts` and the buttons still render,
disabled, because no provider is listed. Removing them is
`RECOMMENDATIONS.md` N-4. Until then, setting that variable would enable a path
whose native return journey is not closed (`docs/MOBILE.md` section 6), leaving
the mobile application signed out after a successful sign-in.

For the record of how it worked, because the migration
`20260807125555_a_google_account_arrives_with_its_name_and_its_face` is still
applied and reads Google identity metadata on signup: provider secrets went into
the Supabase dashboard and never into this application, which only ever read
which buttons to draw.

### 2.5 Removed from the template, and why

This document previously told you to set the eleven groups below. **The code
reads none of them.** Verified by scanning every `process.env` reference in
`apps/web`, `packages` and `scripts`; each has zero hits. They are listed here
rather than deleted silently, so that finding one in an old deploy or an old
commit does not read as an accidental omission.

| Variable | Why it is gone |
|---|---|
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Funding redirects to Paystack's hosted checkout page (`authorization_url`), so the browser never initialises the Paystack SDK. Only the secret key is read |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack issues no such thing. Webhooks are signed with an HMAC SHA-512 of the raw body keyed by the secret key. The phantom variable sent somebody hunting a dashboard field that does not exist |
| `AUTH_DATABASE_URL` | A leftover of the pre-Supabase auth layer. `lib/auth/providers.ts` reads exactly one variable now, and this is not it |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Same leftover. These belong in the Supabase dashboard, per 2.4 |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Same |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | Sign in with X was never built, and its API tier is paid |
| `NEXT_PUBLIC_MAPTILER_KEY` | The map runs on Carto tiles and never reads a MapTiler key. The non-commercial licensing question is real and is tracked in `RECOMMENDATIONS.md` M-1, but an unread environment variable does not answer it |
| `GOOGLE_MAPS_SERVER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Same. Google Maps is not the map provider. `GOOGLE_PLACES_API_KEY` is separate and is read |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Media goes to Supabase Storage |
| `TERMII_API_KEY` | No SMS or OTP path calls it |
| `TRAVELGATE_API_KEY` | Requires a signed commercial agreement that does not exist, and no code path awaits it |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Error tracking is not wired. Route errors log to the server console via `app/error.tsx` |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Product analytics is not wired |

If you have any of these set in Vercel today, they are inert; clearing them
changes nothing. Adding one back is only correct alongside the code that reads
it, in the same change.

---

## 3. Vercel project setup

1. **Import the repository.** Vercel detects the monorepo. Set **Root
   Directory** to `apps/web`. Framework preset: Next.js.
2. **Build command**: leave the default (`next build`). Install command:
   leave the default; npm workspaces resolve `@naijafinds/design-tokens` and
   `@naijafinds/i18n` from the repository root, and both are listed in
   `transpilePackages` so they compile in place.
3. **Node version**: 20.9 or newer, per the `engines` field in the root
   `package.json`.
4. **Production branch**: set it deliberately. Do not leave it pointing at a
   working branch.
5. Paste the environment variables from section 2. Deploy.
6. Take the resulting URL, set `NEXT_PUBLIC_SITE_URL` to it, and redeploy.
   Nothing in section 4 or 5 can be finished before this URL exists.
7. **Custom domain**: add it under Project Settings, Domains, then update
   `NEXT_PUBLIC_SITE_URL` again and redeploy. Every URL in sections 4 and 5
   must use the final domain, not the `*.vercel.app` preview host.

Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, HSTS with preload) are already applied
to every route by `apps/web/next.config.ts`. Do not duplicate them in Vercel's
headers configuration.

**The Content Security Policy is the one exception, and it is set elsewhere.**
It lives in `apps/web/src/lib/security/csp.ts` and is applied per request by
`apps/web/src/middleware.ts`, because it carries a fresh nonce every time and a
static header cannot. Do not move it into `next.config.ts` and do not add a
second policy in Vercel: two `Content-Security-Policy` headers are intersected
by the browser, so the stricter one wins and the nonce in ours stops matching,
which takes the whole application down rather than degrading it.

Two things in that policy follow the environment rather than being fixed, so
check them after any change of Supabase project or payment provider:

- The Supabase origin in `connect-src`, `img-src` and `form-action` is derived
  from `NEXT_PUBLIC_SUPABASE_URL`. A deployment without that variable simply
  contributes no origin, which matches how the rest of the platform degrades.
- `form-action` also names Paystack's checkout host, because a server action
  that finishes with a `redirect()` off-origin is a form navigation on the
  no-JavaScript path. The reasoning is written out in full in `csp.ts`.

`apps/web/tests/csp.spec.mjs` proves the policy against a running browser,
including that nothing on the page is actually blocked. Run it after any change
to the header.

Note on HSTS: `Strict-Transport-Security` is sent with `max-age=63072000`,
`includeSubDomains` and `preload`. That is a two year commitment for the domain
and all of its subdomains. Be certain every subdomain you will ever use can
serve HTTPS before pointing a real domain at this deployment.

---

## 4. Supabase dashboard, by hand

These steps cannot be done from this repository. Every one of them is in the
dashboard for project `uccixoonmbhrnyczyigt`.

### 4.1 Site URL and the redirect allow list

**Authentication, URL Configuration.**

- **Site URL**: your production URL, for example `https://rentme.ng`. This is
  what `{{ .SiteURL }}` expands to inside the email templates, so the logo in
  every auth email resolves from here. Get it wrong and every auth email shows
  a broken image.
- **Redirect URLs**: add every origin that will ever complete an auth flow.
  Supabase rejects a redirect that is not on this list, and the failure looks
  like a silent bounce back to sign-in:
  - `https://rentme.ng/**`
  - `https://<your-project>.vercel.app/**` for preview deploys
  - `http://localhost:3000/**` and `http://localhost:3210/**` for local work
    (3210 is the port the Playwright specs and the screenshot harness expect)

### 4.2 and 4.3 Google and Apple sign-in: SKIP BOTH

**Corrected 2026-08-09. These two sections used to walk you through configuring
Google and Apple. Do neither.** The product is email and password only, by owner
decision, and the code that would use them is being removed
(`RECOMMENDATIONS.md` N-4).

Leave Authentication, Providers alone. Leave `NEXT_PUBLIC_AUTH_PROVIDERS` unset.
Enabling a provider today would light up a path whose native return journey is
not closed, so a mobile sign-in would complete in the system browser and leave
the application signed out (`docs/MOBILE.md` section 6).

One consequence worth knowing: App Store guideline 4.8 requires Sign in with
Apple only when another third-party sign-in is offered. Offering neither removes
the obligation and removes the paid-key work that came with it.

### 4.4 Auth email delivery and the five templates

Supabase's built-in email service is rate limited and unsuitable for
production. Configure your own sender.

**Project Settings, Authentication, SMTP Settings.** Enable custom SMTP and
fill in:

- Host: `smtp.resend.com`, port `465`, username `resend`, password: your
  Resend API key. (Any SMTP provider works; Resend is already the choice for
  transactional mail, so using it for auth mail keeps one sending domain and
  one reputation to manage.)
- Sender email and sender name: an address on the domain you verified in
  Resend, for example `hello@rentme.ng` and `Vallo`.

Then **Authentication, Email Templates**, and paste each file from
`supabase/templates/` into the matching template. All five, or the ones you
skip send Supabase's unbranded defaults:

| File | Supabase template |
|---|---|
| `supabase/templates/confirmation.html` | Confirm signup |
| `supabase/templates/magic-link.html` | Magic Link |
| `supabase/templates/recovery.html` | Reset Password |
| `supabase/templates/email-change.html` | Change Email Address |
| `supabase/templates/invite.html` | Invite user |

The templates are generated, not hand-edited. To change one, edit
`scripts/build-auth-emails.mjs` and run `node scripts/build-auth-emails.mjs`,
then paste again. Each template loads the logo from
`{{ .SiteURL }}/brand/rentme-logo.png`, which is why section 4.1 has to be
right first. (`supabase/README.md` still refers to `/brand/mark.png`; the
generated templates use `/brand/rentme-logo.png`, which is the file that
actually exists.)

### 4.5 Storage buckets

All three buckets already exist, created by the `storage_buckets` migration and
tightened by `storage_policy_hardening`. Confirm them under **Storage**, do not
recreate them:

| Bucket | Public | Path convention | Policy |
|---|---|---|---|
| `listing-photos` | yes | `<user_id>/...` | Owner-scoped read, insert, update and delete. Objects in a public bucket also serve through their public URL regardless of RLS, which is why the broad read policy was deliberately removed |
| `avatars` | yes | `<user_id>/...` | Same shape as above |
| `message-attachments` | no | `<conversation_id>/...` | Access decided by `private.attachment_path_access`, which resolves the leading path segment through `private.in_conversation` |

If you add a bucket later, add its RLS policies in the same commit. The
project has an event trigger that enables RLS automatically on new tables; it
does not do that for storage policies.

### 4.6 Three database items to settle before launch

Rewritten 2026-08-09. Both original items were resolved and one of them said the
opposite of the truth.

- **Turn on leaked password protection.** Authentication, Policies. It is off,
  and it is the only genuine item on the security advisor list. Credential
  stuffing against a marketplace with a naira wallet behind it is exactly what
  it prevents. `docs/DATABASE_AUDIT.md` section 1.1.
- **Drop `private.probe_as` before real people's data arrives.** It sets
  `request.jwt.claims` so a probe can run as a signed-in person under RLS, which
  is the only way to test a policy. It is revoked from every role but
  `service_role` and no application code calls it. It is still the wrong thing
  to leave on a production database. `RECOMMENDATIONS.md` V-4.
- **The migration mirror disagrees on eight filenames.** Not a missing
  migration: 120 applied, 120 committed, eight of them under a hand-rounded
  timestamp rather than the real one. `RECOMMENDATIONS.md` T-4 has the table and
  the two whose names also differ. The previously reported genuinely-missing file
  (`20260729174306_rls_initplan_and_fk_index`) is committed.

Rate limiting and idempotency are applied and live
(`20260730013645_rate_limits_and_idempotency.sql` plus the ambiguity fix in
`20260730013758`). They stay inert until `SUPABASE_SERVICE_ROLE_KEY` is set,
because the limiter fails open by design.

### 4.7 Run the advisors

**Advisors, Security Advisor** and **Performance Advisor**. Security returns
eleven items and **ten of them are correct by design**: read
`docs/DATABASE_AUDIT.md` section 4, the do-not-fix list, before changing
anything. "Fixing" any of those five breaks the landing page, the agent trust
panel or the machinery that stops a payment being taken twice. Performance shows
multiple-permissive-policy notes and unused indexes on empty tables; that is
expected pre-launch noise, not a regression. Re-run both after the first real
month, which is the first point at which the performance list means anything.

---

## 5. Paystack

1. **Register the webhook.** Paystack dashboard, **Settings, API Keys and
   Webhooks**, Webhook URL:

   ```
   https://rentme.ng/api/paystack/webhook
   ```

   Substitute your real production domain. This **must** be the live HTTPS URL
   on your own domain. Paystack will not reach `localhost`, and pointing it at
   a preview deployment means production charges settle nowhere. There is one
   webhook URL per Paystack account per mode, so use the test mode webhook for
   Preview and the live mode webhook for Production.

2. **Verify signature handling is intact.** The route reads the raw request
   body, computes HMAC SHA-512 with the secret key, and compares against the
   `x-paystack-signature` header before parsing anything. Never introduce a
   body parser ahead of it.

3. **Events consumed.** `charge.success` settles a funding reference
   (`rm-fund-<uuid>`). `transfer.success`, `transfer.failed` and
   `transfer.reversed` settle a withdrawal hold (`rm-wd-<uuid>`). Internal
   transfers use paired `rm-p2p-<uuid>-out` and `-in` legs and never touch
   Paystack. The route routes purely on these reference prefixes, so never
   invent a new reference shape without updating it.

4. **Enable the payment channels the audience actually uses**: card, bank
   transfer and USSD. A card-only checkout loses a large share of Nigerian
   customers at the last step.

5. **Settlement account.** Paystack will not pay out until a settlement bank
   account is added and the business is verified. Do this early, because
   verification is not instant.

6. Note that the platform charges its users nothing for using it. Paystack's
   own charges to the merchant are a separate commercial matter between the
   owner and Paystack, and no such amount is ever surfaced to a user.

---

## 6. The PWA

Nothing to configure. It is worth understanding what ships, because a service
worker is the one artefact that can outlive a bad deploy on a user's phone.

- **Manifest**: `apps/web/src/app/manifest.ts`, served at
  `/manifest.webmanifest`. `start_url` is `/home`, `scope` is `/`, display
  `standalone`, orientation portrait, both colours the brand navy `#010118`.
  Shortcuts (long-press the home-screen icon) go to `/search`, `/bookings` and
  `/wallet`.
- **Icons**: `apps/web/public/pwa/`, generated from the canonical brand cutout
  `/brand/rentme-logo.png`, cropped to the house-and-R mark and centred on the
  brand navy. 192, 512, a maskable 512 held inside the 80 per cent safe zone,
  a 180 Apple touch icon, and three 96px shortcut icons. All small, because
  data is expensive.
- **Service worker**: `apps/web/public/sw.js`. Registered by
  `components/app/ServiceWorkerRegistrar.tsx` after the window `load` event, in
  production only, silently. It precaches the offline shell (`/offline`, the
  192px icon, the manifest, and the offline page's stylesheet discovered from
  the precached HTML), serves navigations network-first with `/offline` as the
  fallback, and applies stale-while-revalidate to `/_next/static/`, `/brand/`,
  `/icons/` and `/pwa/` only.
- **What it will never cache**: any HTML document other than the static
  `/offline` page, and anything whose first path segment is `api`, `admin`,
  `agent`, `wallet`, `messages`, `notifications` or `auth`. Any response
  carrying `Authorization`, `Set-Cookie`, `Vary: Cookie` or a `no-store` or
  `private` cache directive is passed straight through. A money or messaging
  surface can never serve a stale answer.
- **Save-Data**: when the hint is present the asset cache is read but never
  written, because filling a cache is itself paid-for traffic.
- **Versioning**: `CACHE_VERSION` at the top of `sw.js`. **Bump it in the same
  commit as any change to that file.** The `activate` step deletes every
  `vallo-` cache not in the current set, so a deploy cannot leave a user on
  last week's shell.

If you ever need to retire the worker entirely, replace `sw.js` with a script
that calls `self.registration.unregister()` and deletes all caches. Deleting
the file is not enough on its own, because an installed worker keeps running
from the client's own storage.

---

## 7. Pre-launch checklist

Run from the repository root unless stated.

```bash
# 1. Types. Must exit 0.
cd apps/web && npx tsc --noEmit

# 2. Clean build. Concurrent builds corrupt .next, so clear it first.
rm -rf apps/web/.next && npm run build

# 3. Start the built app on the port the specs expect.
cd apps/web && npx next start -p 3210
```

Two scripts in `package.json` do not run today, and neither is a blocker:
`npm run lint` fails because no ESLint flat config (`eslint.config.mjs`) exists
in `apps/web` yet, and `npm test` finds no Vitest files because none have been
written. Typecheck plus the Playwright specs are the real gate.

With that server up, in a second shell:

```bash
# 4. Playwright golden paths. Each is a plain node script, no runner.
for spec in pwa admin agent-listings assistant bookings messages profile saved wallet; do
  BASE_URL=http://localhost:3210 node apps/web/tests/$spec.spec.mjs || echo "FAILED: $spec"
done

# 5. The 390px screenshot pass. Writes PNGs to scripts/.shots/.
node scripts/verify-shots.mjs / /home /search /offline /wallet /bookings /messages
node scripts/verify-shots.mjs --light / /home /search /offline
```

Then, by eye:

- **390px** is the reference width. Every touched surface is checked there
  first, in dark mode, then in light.
- Listing photos and map tiles render as grey placeholders in this sandbox
  because it has no outbound access to Unsplash or the tile servers. They load
  on a real deploy. This is not a bug to fix.
- `grep -rn "Vallo" apps/web/src packages/i18n/src` should find nothing in
  user-facing copy.
- Em dash scan: `grep -rn "$(printf '\xe2\x80\x94')" apps packages docs` should
  find nothing.
- No "sample", "preview", "demo" or "not live" wording in any UI string, and no
  mention of any charge for using the platform.
- Supabase Security Advisor: zero lints (section 4.7).

---

## 8. Post-deploy smoke test

Against the real production URL, on a real Android phone if possible.

1. `https://rentme.ng/manifest.webmanifest` returns JSON with `"name":
   "Vallo"` and `"start_url": "/home"`.
2. Chrome on Android offers "Install app" or "Add to Home screen". Install it.
   The home-screen icon shows the house-and-R mark on navy, not a screenshot of
   the page and not a blank tile.
3. Open the installed app. It launches without browser chrome, opens on
   `/home`, and the status bar is navy rather than a pale strip.
4. Long-press the home-screen icon. Search, Bookings and Wallet appear as
   shortcuts, and each opens the right surface.
5. In DevTools, Application, Service Workers: `sw.js` is activated and running.
   Application, Cache Storage shows `vallo-shell-v1` and `vallo-assets-v1`.
6. Turn on airplane mode and navigate anywhere. The designed `/offline` screen
   appears with its heading, its three-point list and a working Try again
   button. Turn airplane mode off, tap Try again, and the app carries on.
7. In Cache Storage, confirm no entry exists for `/wallet`, `/messages`,
   `/api/...` or any admin or agent path. This is the check that matters most.
8. Sign in with Google. Sign in with Apple. Request a password reset and
   confirm the email that arrives is the branded Vallo template, with the logo
   loading.
9. Fund the wallet with the smallest amount Paystack will accept, on a real
   card. Confirm the balance moves, the transaction appears, and the
   notification fires. Then check the Paystack dashboard shows the webhook
   delivered a 200.
10. Withdraw that amount back out and confirm the hold settles.

---

## 9. Not yet wired, honestly

Do not promise any of this at launch. It is either unbuilt or unconfigured, and
the product is written to behave gracefully in each case rather than pretend.

**Rewritten 2026-08-09.** Seven of the twelve entries this section carried were
closed and one of them, "the admin console is not built", had been false for
almost two weeks. The full and current list is `RECOMMENDATIONS.md`; what
follows is only the part an operator needs before pressing deploy.

- **There is no inventory.** `public.listings` holds zero rows, and so do
  `agents` and `agent_applications`. That is a supply problem, not a code
  problem: the whole chain from agent application to admin approval to published
  listing works. Discovery correctly shows its designed empty state. The seed
  catalogue that used to fill it was deleted because twenty-two of its
  twenty-three places carried a verified badge on an address that does not
  exist. **Do not put one back.**
- **The product cannot express a sale.** Vallo is for renting, buying and
  selling, and `public.listings` has no sale price, no intent and no tenure
  field. `RECOMMENDATIONS.md` P-1.
- **Escrow does not exist.** Zero implementation, and correctly promised nowhere
  in product copy. Nothing in a launch announcement may mention it.
  `RECOMMENDATIONS.md` E-1.
- **Money has never actually moved.** No charge or transfer has been made
  against the live Paystack API from this project. Before the first one, read
  `RECOMMENDATIONS.md` W-1: a missing `SUPABASE_SERVICE_ROLE_KEY` makes the
  webhook answer HTTP 200 with no log, so Paystack never retries and a paid
  funding is lost permanently. There is also no transaction PIN, no rate limit on
  any money action, and no reconciliation job.
- **Signed-out visitors are locked out of the whole product**, which is the
  opposite of the intended rule and means a shared listing link goes to a sign-in
  wall. `RECOMMENDATIONS.md` N-1. Fix this before any marketing spend.
- **Transactional email is unproven.** Nine message builders and live sends from
  six places, all through `bestEffortEmail`, so a delivery failure is silent.
  Nothing has ever been sent from this project. `EMAIL_FROM` must be a verified
  sender on the Resend domain or every send is rejected.
- **The Content Security Policy enforces.** It served report-only for months
  behind a `CSP_ENFORCE` nobody set, which is a policy that blocks nothing. The
  default is inverted: unset enforces, and only the literal `false` steps back
  to reporting. Before flipping it, a production build was walked in a browser
  across eighteen routes signed out, and the one real violation found was a Zod
  feature probe calling `new Function("")`, now switched off at source in
  `src/instrumentation-client.ts` rather than paid for with `'unsafe-eval'`.
  Re-run `BASE_URL=... node apps/web/tests/csp.spec.mjs` against any deployment
  before trusting it. `RECOMMENDATIONS.md` SEC-1.
- **Map tiles are on the non-commercial CARTO endpoint** until
  `NEXT_PUBLIC_MAPTILER_KEY` is set. This is the only item on this page that can
  produce a letter from a lawyer rather than a bug report, and it costs one
  signup. `RECOMMENDATIONS.md` M-1.
- **Nothing tells a crawler anything.** No `robots.ts`, no `sitemap.ts`, no
  JSON-LD. `/admin` relies entirely on per-page `robots` metadata, so one page
  added without it is a console in a search index. `RECOMMENDATIONS.md` N-2.
- **The landing page claims NDPA compliance as a fact** and nothing in the
  repository can establish it. Change that sentence before launch, and start the
  NDPC registration, which has weeks of lead time. `RECOMMENDATIONS.md` LG-1.
- **No analytics and no error tracking.** `NEXT_PUBLIC_POSTHOG_KEY` and
  `SENTRY_DSN` are documented but nothing reads them. A production incident
  leaves only Vercel's own logs. That absence is also a genuine privacy asset:
  `docs/MOBILE_READINESS.md` section 5.
- **No CI.** There is no `.github/workflows` directory, and 83 browser specs
  plus 8 vitest files run only when a human remembers.
  `RECOMMENDATIONS.md` T-1.
- **Assistant threads do not read back.** Threads persist to `ai_conversations`
  and `ai_messages`, and the sidebar reads only `localStorage`, so history
  vanishes on a new device. `RECOMMENDATIONS.md` AI-1.
- **Universal Links and Android App Links are not configured**, so a
  WhatsApp-shared listing opens in the browser rather than the installed
  application. Both association files exist and carry loud placeholders that fail
  verification rather than looking plausible. `docs/MOBILE.md` section 5.
- **Push notifications are not implemented.** The service worker has no `push`
  or `notificationclick` handler by choice: a worker that asks for notification
  permission before the product has anything to say with it burns the one
  permission prompt a user will ever grant.
- **`apps/web/src/middleware.ts` still uses the middleware filename.** Next 16
  prefers `proxy.ts`. It works as-is; renaming it is deliberate follow-up work
  and was left alone rather than touched blind during a deploy pass.
- **Locale coverage is incomplete.** Yoruba, Hausa and Igbo are complete and
  functional and were not written by native speakers. Marketing copy in
  particular should be rewritten from intent rather than corrected word by word.

**Closed since this section was written, so nobody re-reports them:** the admin
console (14 destinations, built), agent listings CRUD, the unread badge on the
rail and the dock, the durable rate limiter replacing the in-process one, and
`pg_cron`, which is installed and running six jobs. Hybrid inventory is not
closed but removed: there is no provider layer and there will not be one
(ADR-013).
