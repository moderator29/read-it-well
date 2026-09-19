# R3: product and platform audit, 19 September 2026

Recorded by the lead from R3's report. R3 could not write this file itself
(the harness refuses a report file from a subagent), so this is the lead's
transcription and the ledger's copy of record. R3 read the ledger, the
handoff, RECOMMENDATIONS.md, the discovery report and the design direction,
then read code. It ran no dev server, per ledger 10.6, so every visual claim
in it is source reading rather than a rendered observation.

## Two that need the founder's word

**F-17. Account deletion cannot complete for anyone who has transacted, and
Apple rejects for exactly this. CRITICAL, and it blocks submission.**
`bookings.guest_id` and `wallets.user_id` are both declared
`references auth.users (id) on delete restrict`, and no later migration
alters either. `lib/profile/actions.ts` calls `admin.auth.admin.deleteUser`,
which the first restricting row aborts, so the person is told to email
support. A wallet row is created lazily on the first transfer, funding or
booking payment, so the trap catches precisely the people who have paid
money. App Store Review guideline 5.1.1(v) requires in-app account deletion
for any app that supports account creation, and "email us and we will do it
by hand" is the named rejection case rather than a workaround. It is also a
promised NDPA right that does not function. The fix is a deletion routine,
not a delete call: pseudonymise the person on rows that must outlive them (a
booking is a financial record, a wallet is a ledger), delete what is theirs
alone, purge their storage objects, then remove the auth row. Days of work,
designed against ledger integrity.

**F-01. The product is built around a domain it is not served from.
CRITICAL.** `lib/brand-domain.ts` sets `vallo.ng` and admits in its own
comment that nobody confirmed it is registered; production serves
www.vallospaces.com. Every deep-link artefact hardcodes the wrong host: the
Android manifest verifies `vallo.ng`, the iOS entitlements declare
`applinks:vallo.ng`. Android App Links and iOS Universal Links both verify
by exact host, so both fail silently and permanently: every shared Vallo
link opens a browser forever, and the failure is invisible unless somebody
goes looking. The founder states the domain once and it is then hours of
work, plus a test asserting the manifest hosts, the entitlement hosts and
`BRAND_DOMAIN` are the same string so it cannot drift again.

## Small, on system, reversible: queued

| # | Finding | Severity | Owner |
| --- | --- | --- | --- |
| F-02 | The whole Stays side is invisible to deep links: the Android manifest and the Apple site association list `/listing/`, `/around/`, `/u/`, `/post/`, `/stories/` and none of `/stay/`, `/stays/`, `/restaurant/`, `/restaurants/`. The side law is correct and never gets to run because the OS hands the URL to a browser. | High | B4 |
| F-03 | The assistant sends every hotel and restaurant into the Property shell: `app/api/assistant/route.ts` sets `href: /listing/<id>` unconditionally, and `/listing` forces the Property shell. This is the side law the ledger names as law, on the surface most likely to be screenshotted. | High | F4 |
| F-04 | A completed inspection has no route to paying the rent. `InspectionRows.tsx` draws controls for CONFIRMED and nothing for COMPLETED, so the screen a person opens the morning after a viewing does not mention the pay step that now exists. | High | F5 |
| F-05 | The inspection row renders the property title as dead text, so a person comparing three viewings cannot get back to any of the three properties. | Medium | F5 |
| F-06 | A booking thread and a reservation thread have no route to the thing they are about. The context card with its chevron is drawn only on the listing branch; `BookingFace.tsx` contains no link at all. Named miss against the governing chat image. | High | F5 |
| F-07 | A stay-booking notification deep-links into the Property shell: the notify migration writes `/bookings` on every branch, which flips a hotel guest out of the Stays shell. Four lines, one migration. | High | B4 |
| F-08 | `/bookings` and `/trips` render the same rows under two names, both calling `getMyBookings`, and every notification points at `/bookings` only. | Medium | F3 |
| F-09 | The wallet receipt is a dead end: it answers how much and never what for. No route from a payment to the booking, tenancy or listing it paid for. | Medium | F3 |
| F-10 | Four share surfaces have no share card: `/stay/[id]`, `/restaurant/[id]`, `/u/[handle]` and `/post/[id]` export metadata with no `openGraph`. In a WhatsApp-first market the forwarded link is the growth loop, and the product tells people their address is `/u/handle` then publishes it with no card. | High | F2 |
| F-11 | The manifest names `/pwa/shots/narrow-stays.jpg`, which is not on disk, so Chrome falls back to the plain install dialogue instead of the rich install card. | Medium | F2 |
| F-12 | The installed app opens on a sign-in wall: `start_url` is `/home`, which the proxy redirects for a signed-out reader, while `/`, `/stays`, `/search` and `/listing` are all public. | Medium | F2 |
| F-13 | The verified badge cannot be tapped where a person needs to trust it. The ladder is fully modelled in `lib/trust/verification.ts` and rendered only on `/standards` and in the docs. The one signal the product rests on is an unexplained tick. | Medium | F3 |
| F-14 | Two hardcoded English strings on the governing chat surface ("Rental enquiry" in `ThreadContextBanner.tsx` and `ThreadView.tsx`). | Low | F5 |
| F-15 | Dead code, one piece carrying banned vocabulary: `ComingSoon.tsx` has no callers and renders a surface badged as a preview, which the rules ban outright; `StayCategoryRail.tsx` has no callers; `public/brand/scenes/` duplicates about 1.2MB already in `photos/`. | Low | F3, lead |
| F-16 | `docs/MOBILE.md` still reserves `ng.rentme.app`; the real identifier is `ng.vallo.app`. Low unless the founder follows that checklist, in which case critical, because a bundle identifier cannot change after first submission. | Low | lead |

## Large: the founder chooses what is funded before submission

- **F-18. `saved_searches` is a live table with RLS, an `alert_enabled`
  column and no product on top of it.** R3 calls this the single most
  valuable item on its list, and the reasoning is right: a property
  marketplace does not retain people by being beautiful, it retains them by
  telling them when the thing they wanted appeared, and Vallo has no
  mechanism that brings a person back next week. The schema has been sitting
  there since July. Three pieces, all on existing systems: a save control on
  the two search pages writing the URL state that already drives them, a
  saved-search list in the drawer, and one job on the existing cron harness
  sending one notification per saved search per day through the notifier that
  already honours preferences. No urgency, no counts, no manufactured
  scarcity. Days.
- **F-19. Shipping to two app stores with no crash or error reporting at
  all.** The privacy posture that buys is genuinely valuable and should not
  be traded lightly, but a native WebView shell on a thousand Android
  handsets on networks that drop is a category of failure this team has no
  instrument for. Error-only, no session replay, no analytics, PII scrubbing
  on, disclosed. Half a day to wire, days to scrub and disclose properly.
- **F-20. The feed will feel slow on a Nigerian network.** 31 raw `<img>`
  tags survive, and the ones that matter are content: every post photograph,
  every story and the profile media grid are bare `<img>` at up to 1600px
  with no `srcset`, no `sizes` and no modern format, served to a 390px
  screen. Ten posts is several megabytes off a metered bundle, on the one
  surface built to be scrolled for minutes. The stop list already forbids
  this. Half a day to a day.
- **F-21. The decision screen has no neighbourhood, no map and no
  alternatives, and the data for the first exists.** `area_intel`, which
  reads what residents posted about a place, is wired to exactly one
  consumer, the assistant, whose own prompt calls it the one thing no other
  website in Nigeria can tell them. The listing page is the screen the whole
  funnel points at and the most defensible asset is one hop away and mounted
  nowhere. Attribution discipline must be copied verbatim. Days.
- **F-22. A photoless listing shares as a generic card, and most listings
  have no photograph.** A generated OG image composing what the product
  already draws (the scene, the price, the area, the counts, the verified
  mark where earned) turns the forwarded link into the screenshot. Days.
- **F-23. Four locales are advertised and roughly one line in six falls back
  to English.** About 600 keys per language, no native review. Not a code
  defect; a claim the product half keeps, and a reviewer can check it in
  thirty seconds. Days plus an external cost.
- **F-24. Offline gives a person a beautiful card and nothing of their own.**
  The service worker's caution is correct and should stand. One narrow
  designed exception: a read-only local copy of the saved shortlist and
  confirmed upcoming bookings, stamped with the time it was taken so it can
  never be mistaken for live, never a balance and never a message. Days.

## Security and data posture, as R3 found it

Strong overall: CSP fails closed, HSTS with preload, a tight image
allowlist, a permissions policy shutting camera and microphone, rate
limiting across auth, money, social and messaging, backup disabled on
Android with a written argument, no cleartext on any of the three layers,
and no third-party analytics or crash vendor anywhere. Location never leaves
the device.

Three open items R3 would close first, in this order: `message_flags.matched`
still stores bank account numbers in plain text, which duplicates the most
sensitive string in the product into a moderation table; the admin flags
screen loads whole private conversations; and there is no audit row when an
admin opens an identity document, which decides whether the company can ever
answer "who looked at my NIN".

## What R3 could not check

Nothing was rendered, so every visual and interaction claim is source
reading: focus order, tap-target reachability and sheet behaviour under a
screen reader are unmeasured. No native build has ever run anywhere, so
F-01, F-02 and F-11 deserve a real handset. The live database was not
reached, so F-17's two constraints should be confirmed against the live
catalogue before the fix is designed. Performance was not measured; F-20 is
arithmetic from the upload cap and the markup.

One flagged for R1 rather than filed: `safe-area-inset-left` and
`safe-area-inset-right` appear nowhere while the iOS plist permits landscape
on iPhone, so on a notched handset in landscape the gutter will sit under
the notch. Worth one look at 844 by 390.
