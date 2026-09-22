# On-platform sweep

**Every place Vallo currently sends a person off our own surface, and exactly how each
one is brought back in.**

Research only. Nothing in this document has been built, no product code was changed, no
database was written, and git was never run. Written against the working tree at
`/home/user/read-it-well` on 22 September 2026.

---

## 0. The rule, restated

The founder's instruction, verbatim:

> "I want to make payment paystack is up but would take me to another link to complete
> it, it should happen on our platform you feel me check all areas too that have or
> stuffs like this would happen and tell it to build it all no leaving our platform only
> if you want to receive email"

Read as a build rule, that is three sentences:

1. **A payment finishes on our surface.** No other company's address bar, no other
   company's page, no tab that is not ours.
2. **The same applies everywhere else.** Sign-in, verification, documents, maps, sharing,
   support, partner inventory. Anywhere the shape of "we hand you to somebody else and
   hope you come back" exists, it is wrong.
3. **One exception, and only one.** Handing the person to their own email client because
   they asked to be emailed.

There is a second, subtler reading that matters for the native shell. Capacitor's
in-app browser tab (`SFSafariViewController`, Chrome Custom Tab) keeps the app alive
behind it, but it **shows the third party's URL bar**. On the founder's rule that is
still leaving: the person sees `checkout.paystack.com` in a chrome that is not ours.
This document treats the in-app tab as a *departure*, not as a fix, and says so at every
row where the current code relies on it.

### Verdict in one paragraph

There are **twenty-eight distinct departure points** in `apps/web/src`, plus **eight
half-built flows** where a naive next commit would add one. Of the twenty-eight, **one
is genuinely impossible to keep in-app** (the operating system dialler behind `tel:`),
**three are only possible by replacing the feature with an in-app equivalent** (native
share sheet, App Store badges, a user's own profile link), and **all twenty-four
others, including every single payment path, can be closed**. The single largest fact in
this report: `initializeTransaction` already returns Paystack's `access_code`
(`apps/web/src/lib/payments/paystack.ts:101`, `:136`) and **not one caller in the
codebase reads it**. The whole server half of an in-app checkout is already built and
being thrown away on every transaction.

---

## 1. Method and coverage

Every pattern the brief named was run across the whole of `apps/web/src`, on `.ts` and
`.tsx`, including tests, then narrowed to non-test files.

| Pattern | Hits (non-test) | Where they are |
| --- | --- | --- |
| `window.open` | 1 | `lib/native/external-links.ts:112` |
| `window.location.assign` / `.href =` | 9 | 8 payment redirects, 1 in-app deep link |
| `target="_blank"` | 9 | 3 admin doc links, 2 map credits, 1 social link, 2 site footer/store, 2 same-origin legal |
| `rel="noopener"` | 6 | alongside the above |
| `<a href="http` literal | 0 | every external href is an expression or from data |
| `redirect(` to an external origin | 1 | `lib/auth/actions.ts:695` |
| `NextResponse.redirect` to an external origin | 0 | every route handler answers same-origin |
| `authorization_url` | 1 read, 8 uses | `lib/payments/paystack.ts:120` |
| `checkout.paystack` / `paystack.com` | 4 | `lib/security/csp.ts:156-159` (form-action only) |
| `js.paystack.co` | 0 | **no Paystack browser script anywhere today** |
| `mailto:` | 6 | all via `lib/support-email.ts:34` |
| `tel:` | 3 | listing gate, message thread, inspection sheet |
| `wa.me` / `whatsapp:` | 0 | one notification preference toggle only, no link |
| `Browser.open` (Capacitor) | 1 | `lib/native/external-links.ts:100` |
| `@capacitor/browser` | 2 imports | `external-links.ts:3`, `deep-links.ts:4` |
| `InAppBrowser` | 0 | not installed |
| `signInWithOAuth` | 1 | `lib/auth/actions.ts:676` |
| OAuth callback handling | 1 | `app/auth/callback/page.tsx` |
| `navigator.share` | 4 | listing, profile, story, receipt |
| LiteAPI / Booking.com / partner link | 0 live | removed 2026-08-09, see `docs/ENVIRONMENT.md:82` |
| Map provider link | 3 | `lib/maps/tiles.ts:47,79,88` |
| Documentation / support link | 6 | `lib/support-email.ts` consumers |
| App store link | 2 | `components/site/landing/AppBand.tsx:32-33` |

---

# PART ONE: PAYSTACK

## 2. What is built today, end to end

### 2.1 What is initialised server side

`apps/web/src/lib/payments/paystack.ts` is the only file in the repository that speaks to
Paystack. It is `import "server-only"` (`:1`), the secret key is read lazily (`:33-35`),
and `API_BASE` is `https://api.paystack.co` (`:19`).

`initializeTransaction` (`:109-139`) POSTs to `/transaction/initialize` with exactly:

```
email, amount (integer kobo), currency: "NGN", reference, callback_url, metadata?
```

and returns (`:134-138`):

```ts
{ authorizationUrl: data.authorization_url,
  accessCode:       data.access_code,
  reference:        data.reference }
```

**`accessCode` is declared at `:101`, populated at `:136`, and read by nothing.** A grep
for `accessCode` across `apps/web/src` returns only the estate gate access code on
listings (`components/app/listing/ListingUtilities.tsx:183`,
`app/agent/list/ListingWizard.tsx:179`) and the Paystack type itself. That field is the
entire input to an in-app checkout and it is already in hand on every one of the four
initialise call sites.

Note also what is **not** sent: no `channels` array. Paystack therefore offers every
channel enabled on the merchant account (card, bank, bank transfer, USSD, QR, EFT, Apple
Pay) on the hosted page. Any in-app replacement must preserve that or explicitly narrow
it, and narrowing it silently is a revenue decision disguised as a technical one.

### 2.2 The four places an authorisation URL is minted

| # | Server call site | Purpose | Reference prefix | Callback URL |
| --- | --- | --- | --- | --- |
| 1 | `lib/bookings/checkout.ts:311-322` | stay or rent booking, card | `rm-book-` (`:292`) | `checkoutReturnPath(...)` (`:308`), `?paid=1&reference=` |
| 2 | `lib/wallet/actions.ts:234-264` | wallet top-up, hosted | `rm-fund-` (`:230`) | `/wallet?funded=1&reference=` (`:231`) |
| 3 | `lib/payments/methods-actions.ts:183-207` | save a card, ₦50 setup charge | `rm-fund-` (`:179`) | `/wallet?funded=1&reference=` (`:180`) |
| 4 | `lib/payments/charge-saved-card.ts:195-204` | 3-D Secure fallback after a saved-card decline | **reuses the caller's reference** (`:198`) | caller's, or `/wallet?funded=1&...` (`:199-201`) |

Call site 4 is the important one for design. `chargeAuthorization`
(`lib/payments/paystack.ts:399-433`) has no 3DS challenge path at all: the note at
`:391-393` states it plainly, "There is no 3DS challenge on this path: when the bank
insists on authenticating, or the token has gone stale, Paystack declines, and the caller
falls back to a hosted checkout rather than retrying." So **every 3-D Secure challenge in
this product is currently served by throwing the person at a hosted page.**

### 2.3 The eight places the browser actually leaves

| # | file:line | Trigger |
| --- | --- | --- |
| 1 | `app/(app)/checkout/[bookingId]/PayPanel.tsx:254` | "Pay by card" on a stay booking |
| 2 | `app/(app)/checkout/[bookingId]/PayPanel.tsx:569` | "Continue to your bank" after a saved-card 3DS decline |
| 3 | `app/(app)/rent/pay/[inspectionId]/PayPanel.tsx:191` | "Pay by card" on rent |
| 4 | `app/(app)/rent/pay/[inspectionId]/PayPanel.tsx:426` | rent 3DS fallback |
| 5 | `app/(app)/wallet/WalletDeck.tsx:443` | hosted wallet top-up |
| 6 | `app/(app)/wallet/WalletDeck.tsx:452` | saved-card top-up that needs 3DS, via `fundingStep` |
| 7 | `components/app/payments/PaymentMethodsPanel.tsx:98` | "Add a card" |
| 8 | `components/app/wallet/CryptoTopUp.tsx:36` | Yellow Card crypto collection (not Paystack, same shape) |

All eight are a bare `window.location.assign(...)`. There is no `window.open`, no iframe,
no sheet. The tab that was Vallo becomes the tab that is Paystack.

### 2.4 How the callback returns

Paystack redirects the browser to `callback_url`, which is always on our origin
(`siteOrigin()` at `lib/wallet/actions.ts:132-139` prefers `NEXT_PUBLIC_SITE_URL`, else
the forwarded host).

- Wallet: `/wallet?funded=1&reference=...` renders `FundingVerifier`
  (`app/(app)/wallet/page.tsx:74`), which calls the `verifyFunding` server action once on
  mount (`app/(app)/wallet/FundingVerifier.tsx:31-54`) and credits idempotently.
- Booking: `/checkout/<id>?paid=1&reference=...` or `/rent/pay/<id>?paid=1&reference=...`
  (`lib/rent/return-path.ts:33`), handled by `PaymentReturn`.

So the **return leg is already fully on-platform and idempotent against the webhook.**
Nothing in this document needs to change it; an in-app checkout simply stops using it as
the primary path and keeps it as the recovery path for an interrupted session.

### 2.5 What the webhook does

`app/api/paystack/webhook/route.ts` (713 lines) is the authority. Signature is HMAC
SHA-512 of the raw body (`lib/payments/paystack.ts:442-453`). The status-code contract at
`:59-69` is the load-bearing part: 200 only for a decision we stand by, 503 for a missing
service-role key, 500 for a write that threw, both of which mean "retry". Routing is by
reference prefix (`:81-89`): `rm-fund-` credits the wallet, `rm-wd-` settles a transfer,
`rm-book-` settles a booking through `lib/bookings/settlement.ts`.

Critically: **the webhook, not the browser, is what moves money.** `deep-links.ts:59-61`
says it in as many words. That is why an in-app checkout is safe to build: the UI's only
job is to *learn* that the money moved, not to *cause* it.

### 2.6 What the UI looks like while the person is away

Nothing. The tab is gone. `app/(app)/checkout/[bookingId]/PayPanel.tsx:78-79` has a
`card-redirecting` phase with a ten-second slow clock and a twenty-five-second give-up
clock (`:71-72`, `:203-213`), but those only cover the gap between the tap and the
navigation. Once `assign` lands, the React tree is destroyed. If the person abandons
Paystack and presses back, they arrive at a remounted `PayPanel` in `idle` with no memory
of the attempt, and the only thing that saves them from paying twice is the "Check your
stays before you try again" copy at `:587-588`.

### 2.7 What the CSP currently allows, and what it forbids

`apps/web/src/lib/security/csp.ts` is deliberately hostile to an embedded checkout and
says so:

- `script-src` (`:237-242`): `'self' https: 'nonce-…' 'strict-dynamic'`. Under
  strict-dynamic a nonced script may load whatever it likes, **so `js.paystack.co` would
  load without a policy change**, but only if our own nonced bootstrap injects it.
- `connect-src` (`:358`): `'self'` plus Supabase only. The comment at `:355-357` states
  "Every payment call is server side, so Paystack does not belong here: if a browser ever
  starts calling an API directly, this directive is what reports it."
- **`frame-src` (`:368`): `'none'`.** Comment: "We frame nothing either. No embedded
  checkout, no third-party widget." This single directive blocks both Option A and Option
  B below and must be changed deliberately.
- `form-action` (`:400`): `'self'` plus the four Paystack origins at `:155-160`, added
  because Chrome applies `form-action` to a whole redirect chain (`:380-387`).
- `PAYSTACK_ORIGINS` comment at `:150-154`: "Read by `form-action`, and by nothing else:
  no Paystack script runs in this app and no browser code calls their API, so these
  origins are not in `script-src` or `connect-src` and must not be added there without a
  reason written down beside them."

That last sentence is an instruction to whoever builds this: **add the reason beside the
line.** `lib/security/security.test.ts:146-147,173-174` asserts the current shape, so the
tests move with the policy.

---

## 3. The three in-app options, measured

Researched from the published `@paystack/inline-js` package (v2.25.0, pulled from the npm
registry and read directly, because `paystack.com` is blocked by this session's egress
proxy) and from Paystack's public documentation via search.

### Option A: Inline JS v2 popup, resumed from our access code

**Script:** `https://js.paystack.co/v2/inline.js`, or `npm i @paystack/inline-js`
(package `main` is `lib/inline.js`, `module` is `es/inline.js`).

**The call we want** is `PaystackPop.resumeTransaction(accessCode, callbacks)`, documented
in the package README as resuming "a transaction using the access code created on your
server with the Paystack API". Callbacks are `onLoad({id, customer, accessCode})`,
`onSuccess({id, reference, message})`, `onCancel()`, `onError({message})`.

**What it renders:** a `PopupTransaction` whose `checkoutIframe` property is "The iframe
where the payment happens". The dist bundle creates exactly one iframe
(`document.createElement("iframe")`, `frameBorder=0`, `allowtransparency=true`, mounted
hidden then shown) and the only checkout origin in the bundle is
`https://checkout.paystack.com`. The iframe also loads
`checkout.paystack.com/static/vendor/pusher.min.js`, which is how the checkout gets
real-time charge status without us polling.

**What the person sees:** our page, our URL bar, our background, with a modal over it.
**No third-party address bar at any point.** That is the exact shape the founder asked
for.

**Channels inside the popup, and how each behaves:**

| Channel | Inside the iframe? | Notes |
| --- | --- | --- |
| Card, no challenge | Yes | PAN, expiry, CVV collected by Paystack inside their iframe. We never touch card data, so PCI scope is unchanged from today. |
| Card, 3-D Secure / OTP | Yes | `PopupTransaction.getStatus()` exposes a documented `auth` state: "external authentication in progress". The bank's ACS page renders inside the same iframe. This is the single biggest win: today 3DS is call sites 2, 4 and 6 above, all full-page departures. |
| Card, PIN + OTP (Nigerian domestic) | Yes | Handled by the checkout UI, not by us. |
| Bank transfer | Yes | Paystack shows a one-time virtual account number in the iframe and flips to success over Pusher when the transfer lands. |
| USSD | Partially | The iframe shows the code. The person dials it on their own dialler, which is an operating-system action outside any browser. Completion still arrives in the iframe over Pusher plus our webhook. This is not "leaving our platform" in the founder's sense: no other company's web page is shown. |
| QR (NQR / Visa QR) | Partially | Same shape: we show the code, another app scans it, settlement returns to us. |
| EFT | Yes | Present in the bundle (`eft` appears in the channel constants). |
| Apple Pay | Yes, natively | `PaystackPop.paymentRequest()` mounts a real Apple Pay button into a div we supply, and `PaystackPop.checkout()` shows a pre-checkout modal when a wallet is available. On iOS this becomes the system sheet, which is the most on-platform payment experience available anywhere. |
| Mobile money | Not in this bundle | Zero occurrences of `mobile_money` in v2.25.0. Irrelevant for a Nigeria-first product. |

**Capacitor WebView behaviour:** this is a same-page iframe, not a popup window and not a
navigation, so none of the three mechanisms that currently push us out of the shell are
engaged. `lib/native/external-links.ts` intercepts (a) anchor clicks and (b) the
Navigation API's `navigate` event (`:151-187`). An iframe load is neither. The
`limitsNavigationsToAppBoundDomains: false` setting at `apps/web/capacitor.config.ts:96`
already permits the WebView to load a non-app-bound origin in a subframe. Browser support
is stated in the package README as Chrome and Safari on all platforms, which is the
WKWebView and the Android System WebView.

**Risks, honestly:**
- Requires `frame-src https://checkout.paystack.com` and probably
  `https://checkout.paystack.co` in the CSP, replacing `'none'` at `csp.ts:368`.
- Requires a public key in the browser. `docs/ENVIRONMENT.md:101` currently says
  "`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`: Not needed" and `docs/DEPLOY.md:125-126` repeats it.
  Both documents become wrong the day this ships. `resumeTransaction(accessCode)` may not
  need the key at all, since the access code is already scoped to the merchant, and the
  README's signature takes only the access code and callbacks. **Verify against a test
  key before wiring the env var**, and if it is genuinely not needed, keep
  `docs/DEPLOY.md:125` true as written.
- Third-party cookies. The checkout iframe is cross-site. Safari's ITP and Chrome's
  eventual third-party cookie removal do not break it today, because Paystack's checkout
  is a first-party page inside the frame carrying its own session, but this is the thing
  to retest each iOS release. The README's own fallback pattern (`:255-277`, cancel after
  ten seconds and redirect) exists precisely for this.

### Option B: the hosted page inside our own full-screen sheet

Load `authorizationUrl` into a full-bleed `<iframe>` in a Vallo sheet.

**Verdict: do not build this.** Paystack's hosted checkout is served with framing
protections (we could not measure them from this session because `paystack.com` and
`checkout.paystack.com` are both blocked by the egress proxy, see the honesty log), and
even where it framed, we would be re-implementing Option A badly: no `onSuccess`, no
`onCancel`, no `getStatus()`, no way to know the person finished except polling. Option A
*is* this, done by the vendor, with a message channel.

The one place a variant of this survives is the native shell fallback, see section 5.

### Option C: server-side Charge API with the whole UI ours

POST `/charge` with card details we collect, then respond to Paystack's status machine:
`send_pin` to `/charge/submit_pin`, `send_otp` to `/charge/submit_otp`, `send_phone` to
`/charge/submit_phone`, `open_url` for 3DS, `pay_offline` for USSD.

**Verdict: no, and the reason is regulatory rather than technical.** The moment a PAN
enters a form we render, Vallo is in PCI-DSS SAQ D scope instead of SAQ A. That is a
compliance programme, not a sprint. `lib/payments/paystack.ts:320-323` already states the
platform's position: "There is no card number anywhere in this shape and there never will
be: Paystack tokenises, and the platform stores what the processor gives it and nothing it
does not." Option C contradicts a written architectural commitment.

**But two pieces of Option C are worth taking**, because they are card-free and therefore
carry no PCI cost:

- `/charge` with `bank_transfer` returns a dedicated virtual account. We can render that
  account number in a pure Vallo sheet, with our own copy-to-clipboard and our own
  countdown, and settle on the webhook. Zero Paystack pixels.
- `/charge` with `ussd` returns `pay_offline` and a bank's USSD string. We can render our
  own "dial `*737*000*ref#`" card. The GitHub documentation for USSD confirms there is no
  polling requirement: "the merchant relies on webhook notifications" and "for this to
  work properly as expected, webhooks must be set up".

Both are strictly more on-platform than Option A for those two channels, and both are
phase two.

### The recommendation

| Surface | Build |
| --- | --- |
| Card, first time, and every 3-D Secure challenge | **Option A**, `resumeTransaction(accessCode)` |
| Saved card, no challenge | **unchanged**: `chargeAuthorization` server side, already invisible (`lib/payments/charge-saved-card.ts:154`) |
| Saved card, bank insists on a challenge | **Option A** with the same reference, replacing the four hosted redirects at call sites 2, 4, 6 and `charge-saved-card.ts:204` |
| Bank transfer | Option A now, **Option C `/charge` phase two** for a fully Vallo-drawn virtual account |
| USSD | Option A now, **Option C `/charge` phase two** |
| Apple Pay on iOS | `PaystackPop.paymentRequest()` into our own div |
| Yellow Card crypto | see section 7 |

This keeps the person on `vallospaces.com` for every card transaction and every 3-D
Secure challenge, which is 100% of what the founder was actually looking at when they
wrote the directive.

---

## 4. The resolution loop, so the UI settles without a URL bar

Three independent signals, in priority order. The point is that **no single one of them is
trusted**, which is already this codebase's stance on money.

1. **`onSuccess(reference)` from the popup.** Fastest. Treated as a hint, never as truth.
   On receipt, call the existing verifier: `verifyFunding(reference)`
   (`app/(app)/wallet/FundingVerifier.tsx:36`) for wallet, the settlement action for
   bookings. Those already write idempotently against the same unique reference the
   webhook uses (`webhook/route.ts:83-85`).
2. **The webhook.** Unchanged. `app/api/paystack/webhook/route.ts`. It is what actually
   posts the ledger row and it already wins every race by construction.
3. **A bounded poll**, new. A small server action `paymentState(reference)` that reads
   *our own* `transactions` / `wallet_entries` row, never Paystack, called every two
   seconds from the sheet for at most ninety seconds. This covers the case
   `onSuccess` never fires: the iframe was killed, the WebView was backgrounded by iOS,
   the network dropped between Pusher and us.

**On cancel** (`onCancel()`): return the panel to `idle`, and say the reference is still
open so a retry resumes rather than double-charges. Paystack's own abandoned-transaction
resumption (README: "`newTransaction()` first checks if there is any abandoned transaction
attempted with the same parameters") means our existing one-reference-per-attempt
discipline (`lib/payments/references.ts`) is already the right shape.

**On error** (`onError({message})`): this is the one that must not lie. Today the copy is
"The secure payment page could not be opened. Nothing was charged"
(`lib/wallet/actions.ts:277`). That sentence stays true for an `onError` before `onLoad`,
and becomes false for an error after a charge attempt. Two messages, chosen on whether
`onLoad` fired.

**The phase machine to add**, replacing `card-redirecting`
(`app/(app)/checkout/[bookingId]/PayPanel.tsx:79`):

```
idle → initialising (server action, mint reference + accessCode)
     → checkout-open  (popup mounted, onLoad seen; our scrim, our sheet)
     → settling       (onSuccess seen OR 90s poll running)
     → paid | failed | cancelled | stalled
```

`stalled` keeps the existing twenty-five-second give-up clock and the existing "Check your
stays before you try again" copy (`:587-588`), which is already correct.

**The return path stays.** `/wallet?funded=1&reference=` and `?paid=1&reference=` remain
wired, because a person whose app was killed mid-checkout must still be able to land on a
settled screen. It stops being the happy path and becomes the recovery path.

---

# PART TWO: EVERY OTHER DEPARTURE

## 5. Sign-in with Google and Apple

### What happens today

`lib/auth/actions.ts:663-696`. `startOAuth` calls `supabase.auth.signInWithOAuth`
(`:676`) with `redirectTo` pointing at `${authOrigin()}/auth/callback?next=…&intent=…`
(`:688-690`), then `redirect(data.url)` at `:695`. `data.url` is on the Supabase project
domain, which 302s onward to `accounts.google.com`. Two full-page departures per sign-in.

The landing is `app/auth/callback/page.tsx`, a **page** (not a route handler) that renders
`Verifying` and runs `completeEmailVerification` as a server action (`:57-67`).

Apple is configured off by default (`lib/auth/providers.ts:69`, `DEFAULT_SOCIALS =
["google"]`), with the reasoning at `:33-37`.

### Why the current native answer is not good enough

`lib/native/external-links.ts:24-29` argues, correctly, that Google refuses OAuth in an
embedded WebView with `disallowed_useragent`, so the system browser is "the answer Google
documents and the only one that works". That was true for the *redirect* flow. It is no
longer the only option, and `deep-links.ts:62-64` already admits the current arrangement
is broken end to end: "Sign in with Google is therefore NOT closed on the native shell
until the association files ship", plus the cookie-jar hazard at `:66-73`.

### The in-app design

**On the web (`vallospaces.com` in a browser):**

Use Google Identity Services with FedCM. `use_fedcm_for_prompt: true` renders the
browser's own native credential UI: no popup, no redirect, no navigation. The user taps
"Continue as …" and GIS hands us an ID token in a JavaScript callback. We pass it to
`supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })`. The page never
navigates. Where FedCM is unsupported, fall back to `ux_mode: 'popup'`, which is a child
window rather than a full-page departure, and only then to today's
`signInWithOAuth` redirect.

**On iOS in the Capacitor shell:**

- Apple: native `ASAuthorizationController` (Sign in with Apple), which is the system
  sheet, not a web page. Hash the raw nonce to SHA-256 for Apple's `identityToken`, then
  `signInWithIdToken({ provider: 'apple', token, nonce: rawNonce })`. Apple's Services ID
  must be **first** in the Supabase Client IDs list, because Supabase uses the first entry
  for the web `signInWithOAuth` flow while the native `signInWithIdToken` flow accepts any
  ID in the list as a valid audience.
- Google: `ASWebAuthenticationSession` at minimum, native `GIDSignIn` ideally, then the
  same `signInWithIdToken`.

**On Android in the shell:** Credential Manager with the Google ID option, then
`signInWithIdToken`. Never a WebView.

### What this means for our code

| Change | File |
| --- | --- |
| Keep `startOAuth` as the fallback only | `lib/auth/actions.ts:663-696` |
| Add a client-side ID-token path calling a new server action that wraps `signInWithIdToken` | new, beside `lib/auth/actions.ts` |
| The new action must set the session cookies on **our** jar, exactly as `exchangeCodeForSession` does today at `:554` | `lib/auth/actions.ts` |
| Add `https://accounts.google.com` to `connect-src` and (for FedCM) permit the browser's own credential UI | `lib/security/csp.ts:358` |
| Delete the "IMPOSSIBLE" paragraph | `lib/native/external-links.ts:24-29`, which is now only true of the *redirect* flow |
| Correct the stale claim that `/auth/callback` is a route handler | `lib/native/deep-links.ts:30-31`; it has been a page since `app/auth/callback/page.tsx` landed |

**Residual departure:** none on any surface, once built. The deep-link association files
(`public/.well-known/assetlinks.json`, `apple-app-site-association`) named at
`deep-links.ts:49-54` stop being load-bearing for sign-in, and are then only needed for
the Paystack recovery path and for shared listing links.

## 6. Bank account verification

**Already fully in-app. No change needed, and worth saying so.**

`lib/payments/bank-accounts-actions.ts`. The bank list comes from
`listBanks()` → `/bank?currency=NGN` server side (`lib/payments/paystack.ts:564-569`),
cached one hour (`bank-accounts-actions.ts:93-102`). The account name comes from
`resolveAccountNumber()` → `/bank/resolve` server side
(`lib/payments/paystack.ts:587-602`). The person types ten digits and the real name
appears, inside our own sheet (`components/app/payments/AddBankAccountSheet.tsx`). The
stored name is never the person's typing (`bank-accounts-actions.ts:8-10`).

This is the model every other integration on this platform should copy: **the third party
is a server-side fact source, not a destination.**

## 7. Crypto top-up (Yellow Card)

`components/app/wallet/CryptoTopUp.tsx:36` assigns `state.data.paymentUrl`, minted by
`createCollection` (`lib/payments/yellowcard.ts:217-250`) which POSTs
`/business/collections` and reads `paymentUrl` or `url` (`:245`). Callback is
`${siteOrigin()}/wallet` (`lib/wallet/actions.ts:1378`). The copy at `CryptoTopUp.tsx:44`
says outright "You are on your way to Yellow Card to pay."

**Nothing here is live.** `isYellowCardConfigured()` requires three env vars
(`yellowcard.ts:99-101`) and the file's own header at `:34-48` says the collection shape
"has NOT been executed against a real merchant account".

**In-app replacement:** Yellow Card's Payments API returns a deposit instruction (network,
asset, address, amount, expiry) as data, not only as a hosted page. Ask for the structured
collection response and render an entirely Vallo sheet: the address as copyable text, a QR
we draw ourselves, the countdown, and the settlement state driven by
`app/api/yellowcard/webhook/route.ts`. Same shape as the Paystack bank-transfer plan in
section 3, Option C.

**Build instruction:** before the keys arrive, change `createCollection` to request the
structured collection rather than a hosted link, and treat `paymentUrl` as the fallback.
The seam is already isolated by design (`yellowcard.ts:45-48`: "the seam to check on the
day the keys arrive is `createCollection` and `parseWebhook`, and nothing else").

## 8. Documents: upload, preview, and the three admin links

### Upload is already in-app

`components/agent/ApplyWizard.tsx:303-360` and `components/verification/KycFlow.tsx`
upload straight to Supabase Storage from the browser. Accepted types include
`application/pdf` (`components/verification/kyc.ts:44`, `lib/host/onboarding.ts:81`).
Image previews use `URL.createObjectURL` (`ApplyWizard.tsx:320`). **PDFs get no preview at
all** (`:319-320`: `const preview = isPdf ? undefined : …`), which is a gap rather than a
departure.

### Preview is a departure, three times

| file:line | What |
| --- | --- |
| `app/admin/kyc/page.tsx:315-323` | "Open the document", `target="_blank"` |
| `app/admin/businesses/page.tsx:407-415` | "Open the file", `target="_blank"` |
| `app/admin/agents/page.tsx:230-239` | document chip, `target="_blank"` |

`doc.url` in all three is a Supabase Storage **signed** URL, minted server side with
`createSignedUrls` (`lib/admin/kyc-queries.ts:351-353`,
`lib/admin/business-queries.ts:466-468`, `lib/admin/queries.ts:593-600`). That is a
different origin, `<project>.supabase.co`. An operator reviewing somebody's national ID
currently does so on Supabase's domain with Supabase's URL in the bar, and on a phone that
means the PDF is handed to whatever the OS decided is the PDF viewer.

**In-app replacement:** a `DocumentViewer` sheet.

1. A route handler `app/api/documents/[id]/route.ts` that checks the operator's
   permission, fetches the object with the service role, and **streams it from our own
   origin** with `Content-Type` intact and `Content-Disposition: inline`. Signed URLs
   never reach the browser at all, which is also a security improvement: today a signed
   URL sits in the DOM and can be forwarded.
2. Images render in an `<img>` in a Vallo lightbox.
3. PDFs render with `pdf.js` compiled into our bundle, drawn to a canvas, with our own
   page controls. Not `<embed>`, not `<iframe src=…#toolbar=0>`, because both hand the
   rendering to the platform viewer.
4. `img-src` and `connect-src` need no new host, because everything is now `'self'`.

**Bonus:** the same viewer gives `ApplyWizard.tsx:319` a PDF thumbnail for the first time,
closing the "no preview for a PDF" gap in the same commit.

## 9. Maps

**Tiles are already in-app** and always have been: `lib/maps/tiles.ts:77` and `:87` are
raster tile URLs fetched as `<img>` by Leaflet inside our canvas
(`components/app/search/MapCanvas.tsx:239-241`). Both hosts are in `img-src`
(`lib/security/csp.ts:143-144`). Nobody navigates anywhere.

**There is no "view larger map" link.** A grep for `directions`, `open in maps`, `view
larger` and `google.com/maps` across `apps/web/src` returns zero navigational hits. The
only `directions` matches are estate gate directions as free text
(`components/app/listing/ListingUtilities.tsx:167-171`).

**The one departure is attribution.** `components/app/search/MapCanvas.tsx:834-841`
renders each credit as `<a href={credit.href} target="_blank">`, and the three hrefs are
`https://www.openstreetmap.org/copyright` (`lib/maps/tiles.ts:47`),
`https://www.maptiler.com/copyright/` (`:79`), `https://carto.com/attributions` (`:88`).

This one is delicate: both providers' licences **require** the attribution, and MapTiler's
terms require the mark in a given order (`tiles.ts:78`). The honest in-app answer is not
to delete the link:

**In-app replacement:** keep the credit text exactly as the licences demand, and make it
open a Vallo `/legal/map-attribution` page that reproduces the required notices verbatim
and carries the upstream links as plain visible text plus a copy button. The attribution
is still given, the link is still discoverable, and nobody is navigated to
openstreetmap.org from a search screen. If legal review insists the link itself must be
clickable, this becomes an accepted departure and goes in the impossible list.

## 10. Sharing

Four call sites use the Web Share API:

| file:line | Shares |
| --- | --- |
| `components/app/listing/ListingActions.tsx:212-220` | a listing URL |
| `components/social/profile/ProfileShare.tsx:49-53` | a profile URL |
| `components/social/story/StoryViewer.tsx:148-153` | a story URL |
| `components/app/wallet/ReceiptActions.tsx:43-50` | a receipt summary as text |

`navigator.share` opens the operating system share sheet. Strictly, that is not "another
website" and the app is not unloaded, but it **is** the person leaving our surface to
choose WhatsApp.

**Assessment:** this is the one category where the founder's rule and the product's
interest may diverge, and the answer should be a product decision rather than a
unilateral build. The strongest in-app version already half exists:
`components/social/ActionSheet.tsx:187-208` already offers "Share" and "Copy link" as two
distinct rows, and `ListingActions.tsx:202-207` already documents that in-Vallo sharing
(to a DM) is the first answer and `shareElsewhere` is "the second answer".

**Recommended build:** make the Vallo sheet the default on every one of the four sites:
send to a Vallo conversation, copy link, save to a collection. Keep "Share elsewhere" as a
secondary row that calls `navigator.share`. Nobody is forced out; the default is in.

**Copy-link fallbacks are already correct** and stay: `navigator.clipboard.writeText` plus
`copyByExecCommand` (`ListingActions.tsx:222-229`).

## 11. Support and contact

`lib/support-email.ts` is already the right architecture and is currently in its
**in-app** configuration. `SUPPORT_HREF` (`:34`) is `/contact` whenever
`NEXT_PUBLIC_SUPPORT_EMAIL` is unset, and `/contact` writes a real `support_tickets` row
read at `/admin/support` (`:14-18`). There is also an in-app assistant
(`components/app/account/SupportChat.tsx`) and an FAQ (`lib/support/faq.ts`).

**The departure is latent, not current.** The day someone sets
`NEXT_PUBLIC_SUPPORT_EMAIL`, six surfaces flip to `mailto:` in one environment change:

| file:line |
| --- |
| `app/(site)/contact/page.tsx:77` |
| `app/(site)/contact/ContactForm.tsx:65`, `:166`, `:187` |
| `components/site/MobileMenu.tsx:131-133` |
| `app/(site)/careers/page.tsx:124` |
| `app/(site)/delete-account/page.tsx:193` |
| `app/(site)/docs/chapters.tsx` (via `SUPPORT_HREF`) |

**This is the one permitted exception**, and it is permitted precisely because opening the
mail client is the person choosing to be emailed. Per the directive's own words, "only if
you want to receive email".

**Build instruction anyway:** invert the default at `lib/support-email.ts:34` so that even
when a mailbox exists, `SUPPORT_HREF` stays `/contact` and the address is shown as
copyable text with a secondary "open your email app" control. The mailto becomes an
opt-in per click rather than a default per deploy.

## 12. App Store and Google Play badges

`components/site/landing/AppBand.tsx:32-33`: `IOS_HREF` and `ANDROID_HREF` read
`NEXT_PUBLIC_APP_STORE_URL` and `NEXT_PUBLIC_PLAY_STORE_URL`, defaulting to `/start`.
Rendered at `:60` as `<Link href={IOS_HREF} prefetch={false}>`. Today, unset, they point
at `/start` and do not leave. Set, they navigate to `apps.apple.com`.

**Genuinely unavoidable in one case:** you cannot install an app from a store without
going to the store. But this band renders on the **marketing site**, and inside the native
shell the whole band is nonsense: a person already in the app does not need the badge.

**Build instruction:** hide the band entirely when `looksNative()`
(`lib/native/platform.ts`) is true, and on the web keep `/start` as the default so the
browser install prompt is offered first. Departure accepted only for a web visitor who
explicitly taps a store badge.

## 13. Social links in the site footer

`components/site/SiteFooter.tsx:147-153`, hrefs from `NEXT_PUBLIC_VALLO_X_URL` and
`NEXT_PUBLIC_VALLO_TELEGRAM_URL` (`:85-94`), rendered with `rel="me noopener noreferrer"
target="_blank"`.

**Unavoidable by nature**, and correct: an X profile lives on X. `rel="me"` is doing real
verification work (`:81-83`). This is a marketing-site footer, not a product surface.

**Build instruction:** hide the row when `looksNative()` is true, same as the store band.
A shipped app should not carry links out to X.

## 14. A user's own profile link

`components/social/profile/ProfileHeader.tsx:292-300`, `href={profile.link}`,
`rel="nofollow noopener noreferrer ugc" target="_blank"`. Normalised to `https://` at
`lib/social/profiles-schema.ts:105`.

**Unavoidable.** The feature is "one place people can find you"
(`components/social/profile/ProfileEditor.tsx:231`). Making it not leave would make it
nothing.

**Build instruction:** add an interstitial. Tapping the chip opens a Vallo sheet naming
the destination host in full, warning that Vallo has not checked it, with "Copy link" as
the primary action and "Open anyway" as the quiet one. That is one extra tap and it turns
an unannounced departure into a consented one. This also closes a real safety gap: today a
profile link is a one-tap phishing vector out of a property marketplace.

## 15. Phone numbers

| file:line | What |
| --- | --- |
| `components/app/listing/ListingUtilities.tsx:176` | estate security desk |
| `app/(app)/messages/[id]/ThreadView.tsx:622` | call the counterpart |
| `components/app/inspections/InspectionSheet.tsx:211` | call about an inspection |

**Genuinely impossible to keep in-app**, and the codebase already knows why:
`ThreadView.tsx:613-615` says "A plain `tel:` anchor, which is the one call control a web
app can honestly offer: it hands the number to the device's own dialler and nothing here
records, rings or logs anything."

A web application cannot place a telephone call. The only in-app alternative is WebRTC
voice, which is a product (call recording, consent, PSTN egress, NCC implications), not a
fix. **Accepted departure. Not a web page, not another company's chrome, and the person
returns to the app when the call ends.**

## 16. The two same-origin `target="_blank"` links that leave the native app

`components/host/HostWizard.tsx:1056` and `:1057`:

```tsx
<Link href="/terms" target="_blank" …>Host terms</Link>
<Link href="/privacy" target="_blank" …>Privacy policy</Link>
```

**This is a live bug in the shell, and it is subtle.** `externalHttpUrl` in
`lib/native/external-links.ts:66-82` returns `null` for our own origin (`:76`), so the
capture-phase click handler at `:167-168` deliberately does nothing. The WebView then
handles `target="_blank"` itself by asking for a new window, and Capacitor hands a new
window to the operating system browser. **Result: our own terms page opens in Chrome or
Safari, outside the app, during host onboarding.** The person is mid-wizard and is thrown
out by a link to our own document.

**Build instruction, two parts:**

1. Replace both with a Vallo sheet that renders the terms in place. The wizard already has
   sheet infrastructure.
2. Harden the interceptor: in `external-links.ts`, handle a **same-origin**
   `target="_blank"` anchor by calling `event.preventDefault()` and routing it through the
   in-app router instead of letting the WebView open a window. Today the function returns
   `null` for same-origin and the click escapes. This is a two-line change that prevents
   the whole class.

## 17. The native shell's own two departures

| file:line | What it does | Why it is a departure |
| --- | --- | --- |
| `lib/native/external-links.ts:100-104` | `Browser.open({ url, presentationStyle: "fullscreen" })` | An in-app tab shows the third party's real address bar. The file's comment at `:88-93` treats this as the answer; on the founder's rule it is not. |
| `lib/native/external-links.ts:112` | `window.open(url, "_blank")` when `Browser.open` throws | Hands the URL to the full system browser. App-switch. |

**These are the safety net, not the design, and they should shrink rather than disappear.**
Once Option A ships for payments and `signInWithIdToken` ships for auth, the only URLs
reaching this function are the residual ones in sections 9, 13, 14 and 15. Keep it, retitle
the comment block (the two flows it names at `:18-23` will no longer be true), and add the
same-origin fix from section 16.

**`deep-links.ts` stays as written.** It remains correct for the Paystack recovery path and
for shared links. Its stale claim at `:30-31` needs the one-line correction noted in
section 5.

## 18. Third-party stays inventory

**There is none, and there has not been since 2026-08-09.** `docs/ENVIRONMENT.md:82`
records the removal of `GOOGLE_PLACES_API_KEY`, `GOOGLE_ROUTES_API_KEY`, `LITEAPI_KEY` and
`LITEAPI_WHITELABEL_DOMAIN`, and states `apps/web/src/lib/inventory/` no longer exists.
`lib/listings/types.ts:48-51` confirms "THERE IS NO PARTNER SHAPE HERE ANY MORE".
`docs/HANDOFF_04_MARKETPLACE.md:102` confirms the CSP no longer whitelists any LiteAPI
host. `lib/security/csp.ts:313-320` confirms the `img-src https:` wildcard was closed for
the same reason.

So there is nothing to fix. There is something to **forbid**, and that is section 19.

---

## 19. Half-built flows where a naive next commit would leave

These are the ones that matter most, because they have no evidence in a grep for
`window.open` and will arrive as somebody's ordinary feature work.

| # | file:line | What is half-built | How a naive implementation leaves | The rule to write down now |
| --- | --- | --- | --- | --- |
| 1 | `lib/stays/types.ts:26` | `FulfilmentMode = "vallo" \| "external_completion" \| "partner_handoff"` exists in the domain types and in `lib/supabase/database.types.ts:5257`, and is read by **nothing** | The names are instructions. "external_completion" and "partner_handoff" describe sending a guest to a partner's booking page. The first implementation will be an anchor. | A `partner_handoff` row must be fulfilled through a server-side partner API with our own confirmation screen, or it must not be listed. No handoff link, ever. Enforce with a lint rule, not a comment. |
| 2 | `lib/host/schema.ts:159-165` | `menuUrl`, validated as "A menu link starts with https://", stored at `lib/host/actions.ts:596` as `menu_url`, column at `lib/stays/types.ts:184` | Rendered anywhere, it is a `target="_blank"` to a restaurant's own site. `components/app/listing/ListingStickyBar.tsx:29-30` already names the intended pairing: "a partner restaurant pairs its menu with directions". | Menus are ingested, not linked. Either the host uploads menu items as structured data, or we render the PDF through the in-app viewer from section 8. Never a link. |
| 3 | `components/app/listing/ListingStickyBar.tsx:39-44`, `:129-130` | `StickyAction.external` with the comment "Off-platform destinations open in a new tab", applied at `:278` and `:293`. **No call site passes `external: true`** (`app/(app)/listing/[id]/page.tsx:467-490` never sets it). | The prop exists so somebody will use it. The first partner or menu action sets it and the bar leaves. | Delete the prop and the spread at `:129-130`. A prop whose only purpose is to leave the platform should not exist. |
| 4 | `components/app/account/rows.tsx:125`, `:142-153` | `RowLink`'s `external` branch renders `<a target="_blank">`. **No call site passes it** (all seven `RowLink` uses in `app/(app)/profile/page.tsx:135-157` and `AccountBody.tsx:261,267` are internal). | Same as above: the first "Help centre" or "Status page" row sets it. | Delete the branch. Any settings row that needs external content gets the interstitial sheet from section 14. |
| 5 | `lib/stays/photos.ts:13` | "an absolute URL (an import, a partner …) pass through untouched" | A partner feed's CDN images would be loaded directly, leaking the user's IP to that CDN and failing `img-src` (`csp.ts:331`). | Photos are copied into our Supabase bucket at ingest, never hot-linked. |
| 6 | `lib/admin/queries.ts:911` | `if (path.startsWith("http://") \|\| path.startsWith("https://")) return path;` inside the listing photo resolver | Same class as 5, on the admin side. | Same rule. |
| 7 | `components/app/crypto/CoinImage.tsx:27,31` | Loads an arbitrary `https://` coin image with `unoptimized`, hosts not in `img-src` (`csp.ts:135-145`) or `next.config.ts:50-80` | Not a navigation, but it is the browser talking to CoinGecko's CDN, and under an enforcing CSP it is a broken image on the market page. | Proxy coin art through our own route and cache it, as section 8 does for documents. The file's own comment at `:12-13` already anticipates a remote-pattern request; proxying is the better answer. |
| 8 | `components/site/landing/CommunityBand.tsx:18-22` | "When partner rows land, this card is where a real one goes" | The first partner card will carry a partner link. | Same rule as 1. |

---

## 20. The master table

Every departure, one row each.

| # | file:line | What it does today | Why it leaves | In-app replacement | Build instruction |
| --- | --- | --- | --- | --- | --- |
| 1 | `app/(app)/checkout/[bookingId]/PayPanel.tsx:254` | `window.location.assign(authorizationUrl)` on "Pay by card" | Full-page navigation to `checkout.paystack.com` | Paystack Inline v2 `resumeTransaction(accessCode)` in an overlay on this page | Return `accessCode` from `startCardCheckout`; mount the popup; replace the `card-redirecting` phase with `checkout-open`; settle on `onSuccess` + poll |
| 2 | `app/(app)/checkout/[bookingId]/PayPanel.tsx:569` | "Continue to your bank" assigns the 3DS URL | Same | Same popup, same reference; 3DS renders inside the iframe (`getStatus()` state `auth`) | Change `saved-card-hosted` to carry `accessCode` instead of `authorizationUrl`; keep the cyan `review` styling and the "nothing has been charged" copy at `:551-553` |
| 3 | `app/(app)/rent/pay/[inspectionId]/PayPanel.tsx:191` | Card checkout for rent | Same | Same as row 1 | Identical change; these two panels should share one `<PaystackCheckout>` component |
| 4 | `app/(app)/rent/pay/[inspectionId]/PayPanel.tsx:426` | Rent 3DS fallback | Same | Same as row 2 | Identical change |
| 5 | `app/(app)/wallet/WalletDeck.tsx:443` | Hosted wallet top-up | Same | Same popup | `fundWallet` returns `accessCode`; `FundForm` mounts the popup instead of assigning |
| 6 | `app/(app)/wallet/WalletDeck.tsx:452` | Saved-card top-up needing 3DS, via `fundingStep` | Same | Same popup under the same reference | Change `FundingStep` (`components/app/wallet/funding-step.ts:17-28`) from `{kind:"hosted"; url}` to `{kind:"challenge"; accessCode}`; the tests at `funding-step.test.ts` move with it |
| 7 | `components/app/payments/PaymentMethodsPanel.tsx:98` | "Add a card" assigns the ₦50 setup URL | Same | Same popup, `channels: ["card"]` | `startCardSetup` (`lib/payments/methods-actions.ts:207`) returns `accessCode`; card is tokenised by the webhook exactly as today (`lib/payments/methods.ts`) |
| 8 | `components/app/wallet/CryptoTopUp.tsx:36` | Assigns Yellow Card's `paymentUrl` | Full-page navigation to Yellow Card | Vallo deposit sheet: asset, network, address, QR we draw, countdown, webhook-driven state | Change `createCollection` (`lib/payments/yellowcard.ts:217-250`) to request the structured collection; `paymentUrl` becomes the fallback. Do it before the keys arrive |
| 9 | `lib/auth/actions.ts:695` | `redirect(data.url)` into Supabase, then Google | Two full-page departures | Web: GIS with FedCM → `signInWithIdToken`. iOS: native Sign in with Apple / `ASWebAuthenticationSession`. Android: Credential Manager | New server action wrapping `signInWithIdToken`; keep `startOAuth` as the last fallback; update `lib/auth/providers.ts` so Apple can be switched on natively |
| 10 | `app/admin/kyc/page.tsx:315-323` | Signed Supabase URL, `target="_blank"` | Supabase origin in the URL bar; on mobile, the OS PDF viewer | In-app `DocumentViewer`: our route handler streams the object, `pdf.js` renders it | New `app/api/documents/[id]/route.ts` with a permission check; `lib/admin/kyc-queries.ts:351` stops returning signed URLs to the client |
| 11 | `app/admin/businesses/page.tsx:407-415` | Same | Same | Same viewer | Same; `lib/admin/business-queries.ts:466` |
| 12 | `app/admin/agents/page.tsx:230-239` | Same | Same | Same viewer | Same; `lib/admin/queries.ts:593` |
| 13 | `components/app/search/MapCanvas.tsx:834-841` + `lib/maps/tiles.ts:47,79,88` | Licence attribution anchors, `target="_blank"` | OSM / MapTiler / CARTO origins | `/legal/map-attribution`, reproducing the required notices verbatim with copyable upstream URLs | Change `credits` to `{label, href}` where `href` is our own page and the upstream URL moves to a `source` field rendered as text |
| 14 | `components/app/listing/ListingActions.tsx:212-220` | `navigator.share` | OS share sheet, person leaves to WhatsApp | Vallo share sheet first (send to a conversation, copy link), `navigator.share` as a secondary row | The sheet already exists at `components/social/ActionSheet.tsx:187-208`; make it the default on all four surfaces |
| 15 | `components/social/profile/ProfileShare.tsx:49-53` | Same | Same | Same | Same |
| 16 | `components/social/story/StoryViewer.tsx:148-153` | Same | Same | Same | Same |
| 17 | `components/app/wallet/ReceiptActions.tsx:43-50` | Shares receipt text | Same | Send the receipt into a Vallo conversation; keep copy | Same; the "no download" reasoning at `:9-14` stays correct |
| 18 | `lib/support-email.ts:34` (+ six consumers listed in section 11) | `mailto:` when `NEXT_PUBLIC_SUPPORT_EMAIL` is set | Opens the mail client | **Permitted exception.** Still: default to `/contact`, show the address as copyable text | Invert the default at `:34`; make mailto a secondary control rather than the href |
| 19 | `components/site/landing/AppBand.tsx:32-33`, `:60` | Store badges, defaulting to `/start` | `apps.apple.com` / `play.google.com` when the env vars are set | Hide the whole band in the native shell; keep `/start` first on web | Gate on `looksNative()` (`lib/native/platform.ts`) |
| 20 | `components/site/SiteFooter.tsx:147-153` | X and Telegram marks | Their origins | **Unavoidable on the web.** Hide in the native shell | Gate the `socials` block on `looksNative()` |
| 21 | `components/social/profile/ProfileHeader.tsx:292-300` | A user's own link | Arbitrary user-supplied origin | **Unavoidable**, but gate it: interstitial sheet naming the host, "Copy link" primary, "Open anyway" quiet | New `<ExternalLinkSheet>`; reuse for row 13 if legal insists on a live link |
| 22 | `components/app/listing/ListingUtilities.tsx:176` | `tel:` security desk | OS dialler | **Impossible.** A web app cannot place a call | Leave as is |
| 23 | `app/(app)/messages/[id]/ThreadView.tsx:622` | `tel:` counterpart | Same | **Impossible** | Leave as is; the comment at `:613-615` is already the right answer |
| 24 | `components/app/inspections/InspectionSheet.tsx:211` | `tel:` counterpart | Same | **Impossible** | Leave as is |
| 25 | `components/host/HostWizard.tsx:1056` | `<Link href="/terms" target="_blank">` | **Same-origin blank target escapes the WebView into the system browser** | Terms in an in-place sheet | Remove `target="_blank"`; render in a sheet; also fix the interceptor per row 27 |
| 26 | `components/host/HostWizard.tsx:1057` | Same, `/privacy` | Same | Same | Same |
| 27 | `lib/native/external-links.ts:66-82`, `:151-172` | `externalHttpUrl` returns `null` for same-origin, so same-origin `_blank` clicks escape | The WebView opens a new window and Capacitor hands it to the OS | Intercept same-origin anchors with a blank target and route them in-app | Add a same-origin branch before `:76` that prevents default and navigates with the app router |
| 28 | `lib/native/external-links.ts:100-104`, `:112` | `Browser.open` in-app tab, `window.open` on failure | The in-app tab shows the third party's URL bar; `window.open` switches app | **Keep as the safety net**, shrink its input set to near zero by building rows 1 to 12 | Update the header comment (`:18-29`), which will no longer describe the two flows it names |

**Not departures, listed so nobody re-flags them:**
`app/(app)/settings/devices/DeviceList.tsx:101` (`assign("/sign-in?…")`, our own path);
`lib/native/deep-links.ts:103` (assigns a path on our own origin, `:80` guards it);
`components/social/profile/ProfileTabs.tsx:121`, `components/social/PlacePicker.tsx:85`,
`components/app/search/map-viewport.ts:79` (all read `window.location.href` to build a
same-origin URL); `lib/email/render.ts:311` (`target="_blank"` inside an **email**, which
is the permitted lane and points back at us).

---

## 21. Build order

1. **`PaystackCheckout` component** (rows 1 to 7). One component, seven call sites. This is
   the founder's actual complaint and it is the largest single win. Server change is
   returning a field that already exists.
2. **CSP** (`lib/security/csp.ts:368`): `frame-src https://checkout.paystack.com
   https://checkout.paystack.co`, with the reason written beside it as `:150-154` demands.
   Update `lib/security/security.test.ts` and `tests/csp.spec.mjs` in the same commit.
3. **The same-origin `_blank` fix** (rows 25 to 27). Two-line interceptor change plus a
   sheet. Cheapest fix in this document and it is currently throwing host applicants out of
   the app.
4. **In-app `DocumentViewer`** (rows 10 to 12). Also a security improvement: signed URLs
   stop reaching the DOM.
5. **Native sign-in** (row 9). Largest, and it also unblocks Apple, which
   `lib/auth/providers.ts:33-37` is waiting on.
6. **Share sheet default** (rows 14 to 17) and **native gating** (rows 19 to 20).
7. **Yellow Card structured collection** (row 8), before the keys arrive.
8. **Phase two:** `/charge` bank transfer and USSD in fully Vallo-drawn sheets.
9. **Delete the escape hatches** (half-built rows 3 and 4 in section 19) so the class
   cannot come back.

---

## 22. Honesty log

Everything below is a claim I could not verify from this session, or a judgement rather
than a fact.

1. **`paystack.com` and `checkout.paystack.com` are blocked by this session's egress
   proxy.** I could not read Paystack's own documentation pages, could not fetch
   `https://js.paystack.co/v2/inline.js`, and could not inspect the `X-Frame-Options` or
   `frame-ancestors` headers on `checkout.paystack.com`. Everything I state about Inline
   v2 comes from (a) the `@paystack/inline-js` v2.25.0 tarball pulled from the npm
   registry and read directly, README and `dist/inline.js`, and (b) web search summaries
   of Paystack's docs. The README and the bundle are primary sources and I trust them; the
   search summaries are second-hand.
2. **I did not verify that `resumeTransaction` works without a public key.** The README's
   signature is `resumeTransaction(accessCode, callbacks)` with no `key`, which implies it
   does not need one. If it does, `docs/ENVIRONMENT.md:101` and `docs/DEPLOY.md:125` both
   become wrong and a `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` must be added. **Test this first,
   with a test key, before anything else in section 21.**
3. **I did not verify 3-D Secure renders inside the popup iframe rather than opening a
   window.** The evidence is the documented `PopupTransaction.getStatus()` state `auth`
   ("external authentication in progress") and the absence of any `window.open` call in
   `dist/inline.js`. That is strong but it is inference. **A live 3DS test card is the
   only proof.** If 3DS does open a window, rows 2, 4 and 6 fall back to the in-app tab and
   this document's central claim weakens for challenged cards specifically.
4. **I did not verify the checkout iframe behaves in a WKWebView.** The README claims
   Safari support on all platforms; WKWebView is not Safari. Third-party cookie policy in
   a WebView differs from the browser. **Test on a real device before shipping.**
5. **I did not test whether a same-origin `target="_blank"` actually escapes the Capacitor
   WebView.** I reasoned it from `externalHttpUrl` returning `null` at
   `external-links.ts:76` and from Capacitor handing new windows to the OS. It is
   consistent with the file's own comment at `:39-40` about `_blank` never reaching the
   navigation handler. **Verify on a device before calling it a bug in a commit message.**
6. **Yellow Card's structured collection response is assumed, not read.** I could not
   reach their API docs, and `lib/payments/yellowcard.ts:34-48` already admits the current
   shape is unproven. My recommendation in section 7 may not be available on their API.
7. **I did not read all 713 lines of the webhook**, only the header contract (`:40-90`) and
   its imports. I have assumed the per-reference routing behaves as documented there.
8. **MapTiler's and CARTO's licence terms were not read.** My section 9 recommendation
   assumes "attribution text plus a link to our own page reproducing the notice" satisfies
   them. That is a legal question, not an engineering one, and it should go to whoever
   owns the licences. `lib/maps/tiles.ts:78` and `:105-110` suggest the current
   arrangement was chosen carefully.
9. **The share recommendation is a product opinion.** Making the Vallo sheet the default
   may reduce off-platform sharing and therefore reach. I am reading the directive
   literally. The founder should confirm.
10. **Third-party inventory is absent today, confirmed by grep and by
    `docs/ENVIRONMENT.md:82`.** I did not audit the database for orphaned partner rows, and
    `lib/stays/types.ts:26` shows the enum still exists in `public.fulfilment_mode`. The
    enum is a loaded gun; I did not check whether any row uses a non-`vallo` value, because
    I was instructed not to touch the database.
11. **I did not test the CSP change.** Adding `frame-src` will interact with
    `frame-ancestors 'none'` (`csp.ts:365`) in no way I can see, but `tests/csp.spec.mjs`
    walks real routes and is the arbiter.
12. **Line numbers are from the working tree as of 22 September 2026** and will drift. Every
    citation was produced by `grep -n` or `awk` against the file at the time of writing.
