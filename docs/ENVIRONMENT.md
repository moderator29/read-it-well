# Environment and third-party accounts

Every credential the platform reads, what breaks without it, and where to go
and get it. Compiled by grepping `process.env.*` across `apps/`, `packages/`
and `supabase/` and then reading each call site, so this is what the code
actually does rather than what a template once hoped it would do.

Three things to know before the tables:

- **`NEXT_PUBLIC_` is not a decoration.** Anything with that prefix is compiled
  into the browser bundle and is readable by anyone who opens devtools. A key
  that must stay secret must never carry it.
- **Nothing here throws on startup.** Every integration is checked lazily, at
  the moment it is used, and degrades to an honest state. That is deliberate:
  the platform must boot and be walkable with an empty environment. The "what
  happens without it" column is the real, tested behaviour.
- **Vercel is the deploy target.** Every value below has to be entered at
  *Project Settings → Environment Variables*, for the Production environment
  and, if you want previews to work, for Preview too. A key set only in
  `.env.local` exists on your laptop and nowhere else.

---

## 1. Required, the platform is not itself without these

| Variable | Where to get it | Without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | [Supabase → Settings → API](https://supabase.com/dashboard/project/uccixoonmbhrnyczyigt/settings/api). Already known: `https://uccixoonmbhrnyczyigt.supabase.co` | No accounts, no listings, no state/LGA/occupation lists. Every picker shows "we could not load the list". |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, the **anon / publishable** key. Safe in the browser, because it only ever acts through Row Level Security. | Same as above. **This is the first thing to check if the sign-up dropdowns are empty in production.** |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, the **service role** key. **SERVER ONLY.** It bypasses RLS entirely. `serviceRoleKey()` throws if it is ever evaluated in a browser bundle, so it cannot leak by accident, but never give it the `NEXT_PUBLIC_` prefix. | Admin jobs and any server task that must read across users fail. |
| `NEXT_PUBLIC_SITE_URL` | Your own production URL, e.g. `https://vallo.ng`. No account needed. | Auth redirects and every link inside an email point at the wrong host. On Vercel previews the platform's own `VERCEL_URL` covers for it; production needs it set explicitly. |

---

## 2. Accounts to go and open

Each row is a service to sign up for. The "free tier reaches" column is there
so you know which ones cost money before launch and which do not.

| Service | Sign-up | What it powers here | Free tier reaches |
|---|---|---|---|
| **Supabase** | [supabase.com](https://supabase.com/dashboard), already open, project `uccixoonmbhrnyczyigt` | Database, auth, storage, RLS | Yes, to a real amount of traffic |
| **Anthropic** | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | The AI assistant and the support-escalation summariser | No, pay as you go |
| **Paystack** | [dashboard.paystack.com → Settings → API Keys & Webhooks](https://dashboard.paystack.com/#/settings/developers) | Card, transfer and USSD payments in naira | No fee to hold an account; per-transaction fee |
| **Resend** | [resend.com/api-keys](https://resend.com/api-keys) | Booking confirmations, receipts, every transactional email | Yes, 3k emails/month |
| **MapTiler** | [cloud.maptiler.com/account/keys](https://cloud.maptiler.com/account/keys) | Map tiles. **A licence, not a feature**: unset, the map draws on CARTO's public basemaps, which are non-commercial use only, and a marketplace taking bookings is a commercial use | Free tier, and this is the only item here that can cost you a letter rather than a bug report |
| **Apple Developer** | [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers) | The App Store, code signing, the Team ID the deep links need | $99/year, which you need anyway to ship on iOS |

### Three services this file used to list and no longer needs

Corrected 2026-08-09.

- **Google Cloud (Places API New)** and **LiteAPI (Nuitée Connect)** powered
  third-party hotel and restaurant inventory. **The owner removed third-party
  inventory from the product** and `apps/web/src/lib/inventory/` no longer
  exists, so neither key does anything. Delete `GOOGLE_PLACES_API_KEY`,
  `GOOGLE_ROUTES_API_KEY`, `LITEAPI_KEY` and `LITEAPI_WHITELABEL_DOMAIN` from
  every environment. ADR-013. Residue still in the database is
  `RECOMMENDATIONS.md` S-2.
- **Google Cloud (OAuth)** powered "Continue with Google". **No Google or Apple
  sign in.** The buttons and the server actions are still in the tree and are
  being removed (`RECOMMENDATIONS.md` N-4). Do not enable a provider in the
  Supabase dashboard and do not set `NEXT_PUBLIC_AUTH_PROVIDERS`. Removing
  Google also removes the Apple obligation: guideline 4.8 requires Sign in with
  Apple only when another third-party sign-in is offered.

The Apple Developer account is still needed, for the store and for signing.

---

## 3. Optional, each one switches a feature on

| Variable | Scope | Without it |
|---|---|---|
| `NEXT_PUBLIC_AUTH_PROVIDERS` | public | **Leave unset, permanently.** The product is email and password only. Setting this to `google` or `apple` enables buttons whose OAuth return journey is not closed on native (`docs/MOBILE.md` section 6), and the whole path is being deleted (`RECOMMENDATIONS.md` N-4). Unset, the two rows render disabled with a plain explanation, which is itself a defect while they exist. |
| `ANTHROPIC_API_KEY` | **server** | The assistant answers 200 with an honest "not configured" message rather than pretending; support falls back to its keyword FAQ store, so support never goes dark. |
| `ASSISTANT_MODEL` | server | Defaults to `claude-sonnet-5`. Only set to pin a different model. |
| `SUPPORT_MODEL` | server | Same, for the support route. |
| `PAYSTACK_SECRET_KEY` | **server** | Checkout cannot take money. The flow explains itself rather than failing at the card form. |
| `RESEND_API_KEY` | **server** | `sendEmail` returns `{sent: false, reason: "unconfigured"}` and nothing leaves the process. No booking confirmations, no receipts. |
| `EMAIL_FROM` | server | Defaults to `Vallo <hello@vallo.ng>`. Must be a **verified sender on your Resend domain** or delivery is rejected outright. |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_ROUTES_API_KEY`, `LITEAPI_KEY`, `LITEAPI_WHITELABEL_DOMAIN` | none | **Gone, 2026-08-09.** All four powered third-party inventory. `apps/web/src/lib/inventory/` no longer exists, so nothing reads any of them and setting them does nothing at all. Delete them from every environment. ADR-013. |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` / `AMADEUS_ENV` | none | **Gone.** The provider was removed on 2026-08-07 along with these variables. Amadeus decommissioned its Self-Service portal on 17 July 2026 and disabled the keys, so nothing could ever configure it again. Setting these now does nothing at all; delete them from any environment that still carries them. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | public | Six surfaces show a support address. Until this names a real mailbox they show the in-app route instead of an address that bounces. |
| `NEXT_PUBLIC_MAPTILER_KEY` | public | **A licence, not a feature.** Unset, the map draws on CARTO's public basemaps, which are **non-commercial use only**, and a marketplace taking a booking fee is a commercial use. Set it and the map switches provider, zoom ceiling and attribution together. [cloud.maptiler.com/account/keys](https://cloud.maptiler.com/account/keys) |
| `NEXT_PUBLIC_NGN_USD_RATE` | public | The wallet's naira→dollar toggle simply does not appear. It is gated rather than defaulted because a made-up FX rate on a wallet balance is a lie about money. |
| `CSP_ENFORCE` | **server** | **Leave it unset. The Content Security Policy enforces by default now.** It used to read `=== "true"`, which meant an unset variable, a typo or a new environment all landed on report-only, and a report-only policy blocks nothing. Set to the literal `false`, and only that, to step back to reporting while chasing a directive: violations post to `/api/csp-report` and appear as `[csp]` lines in the deployment log. Every other value, including no value, enforces. |
| `NF_DATA_SOURCE` | server | `repository` (default) or `api`. Selects the listing/agent data source. Leave unset. |

---

## 4. Documented but NOT wired to anything yet

These appear in older templates. Nothing in the codebase reads them today.
Setting them changes nothing; they are listed so nobody wastes an afternoon
wondering why.

| Variable | Status |
|---|---|
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Not needed. Checkout is a server-initiated redirect, so the browser never holds a Paystack key. |
| `TERMII_API_KEY` | Phone/SMS OTP has not shipped. |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | No analytics client is installed. |
| `SENTRY_DSN` | No error reporting client is installed. |

---

## 5. Test-harness only

Read by specs under `apps/web/tests/`, never by the application: `BASE_URL`,
`SOCIAL_AREA`, `SOCIAL_HANDLE`, `SOCIAL_STANDIN_PORT`, `SOCIAL_STANDIN_DELAY_MS`.

---

## 6. Order of work

Reordered 2026-08-09. Steps 5 and 6 used to send the reader to spend an afternoon
on Google OAuth and two inventory providers that the product no longer has.

1. **`SUPABASE_SERVICE_ROLE_KEY`, first, before anything.** It was step 1 already
   and it is now called out on its own line, because a missing service role key
   does not degrade honestly: the Paystack webhook answers HTTP 200 with no log,
   Paystack never retries, and a paid funding is lost permanently. That is the
   most probable cause of the reported wallet failure.
   `RECOMMENDATIONS.md` W-1.
2. **`NEXT_PUBLIC_SUPABASE_URL`, the anon key and `NEXT_PUBLIC_SITE_URL`.**
   Everything else is decoration until these are right in Vercel.
3. **Anthropic.** The assistant is a headline feature and the key takes a
   minute.
4. **Resend + a verified sending domain.** A booking with no confirmation email
   is a support ticket, and `EMAIL_FROM` must be a verified sender or delivery
   is rejected outright.
5. **Paystack.** Required before anyone can pay.
6. **Supabase dashboard: turn on leaked password protection.** Authentication,
   Policies. One toggle, and it is the only real item on the security advisor
   list. `docs/DATABASE_AUDIT.md` section 1.1.
7. **`NEXT_PUBLIC_MAPTILER_KEY`.** Wired now, see section 3. It is a
   licensing item rather than a feature item, and it is the only one on this
   list that can cost you a letter rather than a bug report.
