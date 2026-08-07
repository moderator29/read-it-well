# Mobile readiness

Written 2026-08-06. Everything below was checked against the repository rather
than assumed, and the counts are reproducible with the commands quoted beside
them.

The short version: this platform is already a serious mobile product, and it was
a **Progressive Web App** only. Packaging it for the App Store and Google Play
needed one architectural decision, and section 3 below is where that decision
was priced.

**The owner has since chosen, and Path A is built.** Capacitor 8 is installed,
both native projects are generated, and the operating manual is
`docs/MOBILE.md`. Section 2 is retained because it is still the reason the
architecture is what it is, and section 3 is retained because Path C remains
the better long-term answer for iOS.

Updated 2026-08-07.

---

## 1. What is already there

None of this is aspiration. It is in the tree today.

| Piece | Where | State |
|---|---|---|
| Web app manifest | `apps/web/src/app/manifest.ts` | Typed route, brand navy, `display: standalone`, `start_url: /home`, portrait |
| Launcher icons | `public/pwa/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Generated from the canonical cutout, maskable held inside the 80 per cent safe zone |
| Offline shell | `public/sw.js`, `apps/web/src/app/offline/page.tsx` | Precached at install, serves the offline route on a failed navigation |
| Service worker registration | `components/app/ServiceWorkerRegistrar.tsx` | Production only, after load |
| Safe areas | `css/chips.css`, `css/chrome.css`, `css/overlays.css` | `safe-area-inset` honoured in the three places that sit against a device edge |
| Mobile-first layout | Throughout | 390px is the design origin, not a breakpoint bolted on afterwards |
| Reduced motion | Token collapse | Honoured platform-wide |
| Self-hosted faces | `public/fonts` | Seven immutable woff2 files, `max-age=31536000`, preloaded per locale |

An installed home-screen RentMe on a mid-range Android already behaves like an
app: its own icon, its own splash colour, no browser chrome, and a designed
answer when the network drops. For the audience this platform is built for,
often on a metered data bundle, that is real reach rather than decoration.

---

## 2. Why Capacitor cannot wrap this build today

Capacitor packages a **static web bundle** from `webDir` into a native shell.
The alternative it offers, `server.url`, does not package anything: it points a
WebView at a hosted origin.

This application cannot produce a static bundle. That is not a gap to close, it
is what the product is:

```
grep -rln '"use server"' apps/web/src   # 40 files
grep -rln 'from "next/headers"' apps/web/src   # 10 files
```

- **40 files declare server actions.** Every mutation on the platform speaks the
  `ActionResult` envelope through a server action: booking, wallet, payment,
  messaging, listing, moderation. `output: 'export'` refuses to build a project
  containing one.
- **`apps/web/src/middleware.ts` is the session lock.** It refreshes the
  Supabase token on every navigation and holds the door on 22 product segments.
  Static export runs no middleware, so a static bundle has no session layer and
  no route protection.
- **Every route is dynamically rendered already.** The root layout awaits
  `getLocale()`, which reads `cookies()`. There is nothing to prerender.
- **`next/image` optimisation is server-side**, with an allowlist in
  `next.config.ts` covering Unsplash and the Supabase storage CDN.

So the honest statement is: **the web build has no static output to package, and
producing one would mean rebuilding the platform as a client-only application
against a separate API.** That is a rewrite, not an integration, and the ONE LAW
in `docs/HANDOFF.md` is the reason not to start one halfway.

### The conflict worth naming

`ROADMAP.md` Phase 6 records the mobile plan as **an Expo application sharing
the token and i18n packages**. The Phase 3 instruction that prompted this
document asks for **Capacitor**. Those are different answers to the same
question and only the owner can settle which one stands. Nothing in this
document assumes either; section 3 prices all three.

---

## 3. The three paths, priced honestly

### Path A. Capacitor as a remote-URL shell

`capacitor.config.ts` sets `server.url` to the production origin. The native
project holds no application code, only the WebView, the icons and the
permission declarations.

- **Cost:** small. Days, not weeks.
- **Buys:** a real installable binary, push notification tokens, native share,
  biometric unlock, a store listing.
- **Costs you:** no offline beyond what the service worker already does, and it
  cannot ship in the binary. More importantly, Apple's App Review guideline
  4.2 ("minimum functionality") rejects thin web wrappers, and a shell that is
  only a WebView pointed at a website is the textbook case. Google Play is far
  more tolerant.
- **Verdict:** viable for Play, genuinely risky for the App Store. Do not
  present it to the owner as a solved store submission.
- **CHOSEN AND BUILT.** The native capabilities in `apps/web/src/lib/native/`
  are the argument against 4.2: hardware back, status bar bound to the theme,
  keyboard insets, splash control, and the system-browser handoff that makes
  Google sign-in possible at all inside a web view. They are an argument and
  not a guarantee.

### Path B. Capacitor over a client-rendered twin

A second build target that renders the product client-side against the Supabase
JS client directly, statically exported, packaged into the shell. The server
actions become client calls guarded by RLS.

- **Cost:** very large. The 40 server actions carry validation, rate limiting,
  idempotency and the ledger invariants. Moving that logic clientward moves it
  where a user can edit it, and Master Rule 48 forbids trusting the frontend for
  financial calculations. Each action would need a Supabase Edge Function or a
  hosted route to keep its guarantees.
- **Verdict:** technically achievable, and it is a quarter of work, not a
  sprint. It also creates a second implementation of every flow, which is the
  duplication the architecture rules exist to prevent.

### Path C. Expo, as `ROADMAP.md` already planned

A native application sharing `packages/design-tokens` and `packages/i18n`,
talking to the same Supabase project and the same hosted server routes.

- **Cost:** large, but it is the cost the roadmap already budgeted, and it is
  additive rather than duplicative: the shared packages mean the design system
  and all four locales come across intact.
- **Buys:** a genuinely native product that passes 4.2 without argument, real
  push, real background behaviour, and no second copy of the web app.
- **Verdict:** the recommendation, and it is what the repository already
  decided before this instruction arrived.

**Recommended sequence:** ship the PWA properly now, since it is finished and
costs nothing more. Take Path A to Google Play only if the owner wants a Play
listing this quarter and accepts it is a wrapper. Build Path C for iOS.

Nothing here is blocked on code. It is blocked on the owner picking one.

---

## 4. Permission inventory

Every permission the product can request, why it exists, and whether a native
build would need to declare it. This is the list a store questionnaire asks for.

| Permission | Requested by | Why | Denial handling |
|---|---|---|---|
| Geolocation | `components/app/search/MapCanvas.tsx`, the locate-me control | Centres the map on the person searching | Falls back to the fitted viewport, and the control reports its own status through a live region |
| Photo library / file read | `ProfilePhotos`, `StoryComposer`, `Composer`, `MessageThread`, `ApplyWizard` | Listing photos, avatars, agent verification documents, message attachments | A standard file input, so the platform never sees a denial, only an empty selection |
| Camera | **Declared on iOS only**, `NSCameraUsageDescription` | No `getUserMedia` call exists anywhere, and the web still sends `camera=()`. This key is about a different mechanism: three file inputs carry `accept="image/*"`, iOS draws a "Take Photo or Video" row in its own picker for those, and iOS terminates an app that reaches the camera with no purpose string. The choice was a purpose string or a crash mid-upload | The picker is the operating system's own, so a refusal returns an empty selection |
| Microphone | Not requested | Nothing records audio | n/a |
| Notifications | Not requested in the browser today | Notifications are database rows rendered in-product. Web Push is not wired | n/a |
| Contacts, calendar, background location | Never | Nothing needs them, and asking would be a store review question with no good answer | n/a |

The edge already declares the negative half of this in `next.config.ts`:

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), interest-cohort=()
```

Camera and microphone are switched off outright, geolocation is same-origin
only, and the cohort opt-out is set. A native build should mirror exactly this
list and add nothing to it.

---

## 5. Data inventory

The privacy disclosure a store listing needs is not guesswork here, because
every table is in `supabase/migrations/` and every one carries RLS. The
categories that matter for a disclosure form:

| Category | Where it lives | Leaves the platform? |
|---|---|---|
| Account identity, name, email, phone | `profiles`, Supabase `auth.users` | No |
| Authentication tokens | HTTP-only cookies, rotated by the middleware | No |
| Payment records | `payments`, the kobo ledger | Card details never touch the platform. Paystack holds them |
| Wallet balances | Append-only ledger, balances derived | No |
| Uploaded media | Supabase storage buckets, `social-media` and the private verification bucket | Verification documents are read only through short-lived signed URLs |
| Messages | `messages`, RLS-scoped to the thread | No |
| Location | Listing coordinates only. A searcher's own position is used in the browser and never posted | No |
| Analytics | None. There is no analytics vendor in this codebase | n/a |
| Crash reporting | None wired | n/a |
| Local storage | Theme choice (`nf_theme`), locale cookie, saved-item cache, search memory | No |

**Worth the owner knowing:** there is no analytics and no crash reporting in
this product at all. That makes the privacy disclosure short and honest, and it
also means nobody will know why a release is failing in the field. Adding crash
reporting is a real decision with a real privacy cost, and it should be made
deliberately rather than discovered during a store review.

---

## 6. What a store submission still needs from the owner

None of these can be done from inside the repository.

- [ ] Decide Path A, B or C in section 3. Everything else waits on this.
- [ ] Apple Developer Program enrolment, and payment of the annual fee
- [ ] Google Play Console registration, and the one-off fee
- [ ] Code signing: an iOS distribution certificate and provisioning profiles, an Android upload keystore
- [ ] Bundle identifiers reserved on both stores, for example `ng.rentme.app`
- [ ] Codemagic (or another CI) account, connected to the repository, holding the signing material
- [ ] Store screenshots at every required device size, and the marketing copy to go with them
- [ ] The privacy policy URL, which exists in-product at `/privacy` and needs a public canonical address
- [ ] Data safety and App Privacy questionnaires, answerable from section 5
- [ ] Age rating questionnaires
- [ ] `pg_cron` enabled on Supabase, which is a toggle rather than code, and which currently blocks the stale booking hold sweep, badge awarding and gist expiry

---

## 7. What was NOT done, and why

Superseded in part. This section described the state before Capacitor was
installed. What still stands:

- **No native build has ever run here.** The sandbox proxy denies
  `dl.google.com`, so the Android SDK and the Android Gradle Plugin cannot be
  fetched, and there is no macOS. `docs/MOBILE.md` section 6 lists precisely
  what was verified and what was not, and it is the honest record.
- **Push notifications are still not wired.** The notification layer exists as
  database rows with triggers, which is the hard half. Delivery to a device is
  a separate piece of work and it spends the one permission prompt a person
  will ever grant, so it should ship with something worth saying.
- **No device testing happened.** Every mobile claim is about code and
  viewport, not about a handset. Layout is verified at 390px by the Playwright
  specs.

No longer true, and left here only so the change is legible: this section
previously said no `capacitor.config.ts` was added and no `android/` or `ios/`
project was generated. All three now exist.
