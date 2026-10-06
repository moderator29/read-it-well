# The API plan for the upgraded wide platform build

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

The authoritative integration plan for the marketplace era. Distilled on
18 September 2026 from `docs/research/API_INVENTORY_RESEARCH.md`, which holds
the full evidence, the provider-by-provider detail and the verification log.
Where the two disagree, the research file is the evidence and this file is the
decision.

**Cost honesty rule:** figures below are search-derived from provider
materials and every one of them requires provider confirmation before money is
committed. Nothing here is invented; where nothing credible was found the cost
column says so. The founder adds all keys personally.

---

## 1. What is already connected, from code and not memory

| Service | What it already does in this codebase | Cost today |
| --- | --- | --- |
| Supabase | Database, auth, storage, RLS, Vault, cron | Plan in use; confirm image-transform entitlement |
| Paystack | Cards, transfers, payout recipients, bank list, account-name lookup for the payout rung, HMAC SHA-512 webhook, reconcile route, money observability | Per-transaction fees, roughly 1.5% + NGN 100 capped at NGN 2,000 local (confirm in dashboard) |
| Resend | Transactional and auth email | Free to 3,000 emails a month, then paid |
| Anthropic | The assistant and support summariser | Pay as you go, already budgeted |
| MapTiler + CARTO fallback | Map tiles, already wired in `lib/maps/tiles.ts` | Free tier exists; the CARTO fallback is non-commercial, so the key must be funded before launch |
| Yellow Card | Crypto on-ramp, fully built, never proven against a live merchant account | Needs live keys only |
| Capacitor shell | iOS and Android wrappers, no push plugin yet | Apple Developer $99 a year when native push ships |

## 2. Required for this build

| Provider | Purpose | Cost shape | Status |
| --- | --- | --- | --- |
| **LiteAPI (Nuitée)** | Partner stays: content, live rates, prebook, whitelabel fulfilment for Model 1 | Commission and margin model, no upfront fee found; confirm | Self-serve. The 889-line client in git history proves prior sandbox access with non-zero Nigerian listings |
| **PostGIS** | Radius, bounding box, landmarks, clustering | Included in Postgres. Already installed live, 3.3.7 | Enable-and-use, no vendor |
| **Postgres FTS + pg_trgm + unaccent** | The one search | Included | `unaccent` available, not yet installed |
| **MapTiler key, funded** | Commercial tile licence | Free tier then paid plans; confirm | Licensing item, not code |
| **Supabase storage transforms** | Stay and restaurant galleries | Plan-dependent; confirm entitlement | Config check |

## 3. Apply-now paperwork, code later

| Provider | Why now | Cost shape |
| --- | --- | --- |
| Booking.com Demand API | Deepest inventory; managed affiliate contract takes time | Revenue share of their commission; confirm |
| RateHawk (ETG) | Net-rate second provider, light registration, async booking flow | Net rates, margin is ours; confirm |
| LiteAPI production account | Sandbox to production step | Commission model; confirm |

## 4. Next wave, after the backbone holds

| Provider | Purpose | Cost shape |
| --- | --- | --- |
| Paystack Dedicated Virtual Accounts | Fund the wallet by bank transfer, per-user NUBAN | Search-derived roughly 1% capped at NGN 300 per credit; confirm. Needs BVN consent flow and privacy notice update first |
| FCM web push, then native | Booking and message notifications | FCM free; Apple $99 a year for native |
| Termii | SMS and OTP with DND-aware transactional routes | Roughly $0.0075 to $0.28 per message by route; confirm |
| Smile ID and Dojah sandboxes | KYC rung evidence behind one `IdentityProvider` interface; decide on tested Nigerian pass rates and quoted prices | Dojah sandbox free; production contracts require quotes |
| Yellow Card live keys | Prove `createCollection` and `parseWebhook` against the real API | Existing integration, keys only |
| OSM POI import | Storable landmark and restaurant base layer | Free under ODbL attribution duties |

> **Superseded, 6 October 2026 (Session 2).** Virtual accounts are not a plan. Payluk's virtual-account endpoint answers `410 Gone` since 2 September 2026, citing CBN rules, and the founder's directives forbid building a Vallo-held wallet or account to replace it. Money is held, where it must be, in a provider's escrow; see `docs/payments/PAYLUK_LIVE_DOCS_FINDINGS.md`.

## 5. Later, and only if earned

Google Places (about $32 per 1,000 for Details Advanced, display rules
constrain storage; the vault's `7f9a7a4d` batching salvages if it returns),
Foursquare (free tier then per-call; probe Nigerian depth first), Google Maps
Platform fallback ($200 monthly credit shape), Hotelbeds and Expedia Rapid
(second-wave inventory, certification programmes), Flutterwave (second
market, local cards about 1.4% + NGN 100 same cap; confirm), Africa's
Talking (second market SMS), Plausible or self-hosted Umami (about $9 a
month or hosting), Cloudflare Turnstile (free), Sentry (`SENTRY_DSN` already
reserved in env). Amadeus is unsuitable: Self-Service was decommissioned
17 July 2026, Enterprise is contract-only, and it stays dead without the
founder's word.

## 6. The architecture every integration obeys

- Frontend, then Vallo API, then the service layer, then the provider. The
  browser never holds a provider credential
- Provider interfaces where lock-in would hurt: `HotelProvider`,
  `MapProvider`, `PaymentProvider`, `NotificationProvider`,
  `IdentityProvider`. The restored registry from the vault carries the
  per-provider kill switches, the 2.5 second `allSettled` budget and the
  dedupe law
- Every webhook verifies its signature, tolerates duplicates and delay, and
  never answers 200 to a swallowed failure. The `unconfigured` outcome in
  `lib/payments/observability.ts` is the loud-failure pattern
- Freshness is policy per source and stale is never sold as live
- A missing key degrades honestly everywhere except a payment webhook, where
  it logs loudly (W-1's law)
- No scraping, ever. Licensed data only, attribution where owed

## 7. The credential checklist

Placeholders only; the founder holds every real value. Full table with
webhook and callback paths: `docs/research/API_INVENTORY_RESEARCH.md`
section 10. The immediate ones: `HOTEL_PROVIDER_API_KEY` (sandbox first),
`HOTEL_PROVIDER_WHITELABEL_DOMAIN`, `NEXT_PUBLIC_MAPTILER_KEY`
(referrer-restricted). Registered webhooks that already exist in code:
`/api/paystack/webhook`, `/api/yellowcard/webhook`, `/api/auth/email-hook`.
New ones this build creates get signature verification the day they exist.

## 8. The one risk that outranks the rest

**Nigerian inventory depth is unverified on every partner provider.** LiteAPI
is proven non-zero and nothing more. The mitigations are binding: a
Lagos-and-Abuja coverage count recorded on the day keys land, before any
density claim in copy, and first-party host onboarding treated as the primary
Nigerian supply, with partner feeds as the widener rather than the shelf.
