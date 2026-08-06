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
| `NEXT_PUBLIC_SITE_URL` | Your own production URL, e.g. `https://rentme.ng`. No account needed. | Auth redirects and every link inside an email point at the wrong host. On Vercel previews the platform's own `VERCEL_URL` covers for it; production needs it set explicitly. |

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
| **Google Cloud** | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials), enable **Places API (New)** | Restaurant discovery and address autocomplete | Monthly credit, then paid |
| **Amadeus Self-Service** | [developers.amadeus.com/register](https://developers.amadeus.com/register) → My Self-Service Workspace → Create app | Third-party hotel inventory | Test environment free; production after certification |
| **Google Cloud (OAuth)** | Same console, **Credentials → OAuth client ID** | "Continue with Google" | Free |
| **Apple Developer** | [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers) | "Continue with Apple", **required by App Store guideline 4.8** if any other third-party sign-in is offered | $99/year, which you need anyway to ship on iOS |

### The two OAuth ones do not go in this file

Google and Apple client secrets are pasted into **Supabase → Authentication →
Providers**, never into the app. Supabase performs the handshake and issues the
session; the app never sees a provider secret. All the app needs is to be told
which buttons are safe to show, which is `NEXT_PUBLIC_AUTH_PROVIDERS` below.

---

## 3. Optional, each one switches a feature on

| Variable | Scope | Without it |
|---|---|---|
| `NEXT_PUBLIC_AUTH_PROVIDERS` | public | Comma-separated: `google,apple`. Empty means email-only, and the Google/Apple rows render disabled with a plain explanation. Only list a provider **after** enabling it in the Supabase dashboard, because listing one that is off sends people to an error page. |
| `ANTHROPIC_API_KEY` | **server** | The assistant answers 200 with an honest "not configured" message rather than pretending; support falls back to its keyword FAQ store, so support never goes dark. |
| `ASSISTANT_MODEL` | server | Defaults to `claude-sonnet-5`. Only set to pin a different model. |
| `SUPPORT_MODEL` | server | Same, for the support route. |
| `PAYSTACK_SECRET_KEY` | **server** | Checkout cannot take money. The flow explains itself rather than failing at the card form. |
| `RESEND_API_KEY` | **server** | `sendEmail` returns `{sent: false, reason: "unconfigured"}` and nothing leaves the process. No booking confirmations, no receipts. |
| `EMAIL_FROM` | server | Defaults to `RentMe <hello@rentme.ng>`. Must be a **verified sender on your Resend domain** or delivery is rejected outright. |
| `GOOGLE_PLACES_API_KEY` | **server** | Restaurant discovery and address autocomplete return nothing. Server-only on purpose: the key never ships to the browser and responses can be policy-cached. |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` | **server** | No partner hotel inventory. Own listings are unaffected. Partner stock never carries the verified badge and never opens in-platform messaging, see `docs/HYBRID_INVENTORY.md`. |
| `AMADEUS_ENV` | server | `test` or `production`. Defaults to `test`. Switch after certification. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | public | Six surfaces show a support address. Until this names a real mailbox they show the in-app route instead of an address that bounces. |
| `NEXT_PUBLIC_MAPTILER_KEY` | public | **A licence, not a feature.** Unset, the map draws on CARTO's public basemaps, which are **non-commercial use only**, and a marketplace taking a booking fee is a commercial use. Set it and the map switches provider, zoom ceiling and attribution together. [cloud.maptiler.com/account/keys](https://cloud.maptiler.com/account/keys) |
| `NEXT_PUBLIC_NGN_USD_RATE` | public | The wallet's naira→dollar toggle simply does not appear. It is gated rather than defaulted because a made-up FX rate on a wallet balance is a lie about money. |
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

1. **Supabase URL + anon key + service role + site URL.** Everything else is
   decoration until these four are right in Vercel.
2. **Anthropic.** The assistant is a headline feature and the key takes a
   minute.
3. **Resend + a verified sending domain.** A booking with no confirmation email
   is a support ticket.
4. **Paystack.** Required before anyone can pay.
5. **Google OAuth, then Apple.** Apple is mandatory for the App Store the
   moment Google is offered.
6. **Google Places, then Amadeus.** Both widen inventory; neither blocks launch.
7. **`NEXT_PUBLIC_MAPTILER_KEY`.** Wired now, see section 3. It is a
   licensing item rather than a feature item, and it is the only one on this
   list that can cost you a letter rather than a bug report.
