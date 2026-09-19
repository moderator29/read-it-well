# HANDOFF 06: what Vallo is after the true-face build

**Written 19 September 2026 by the Build 06 lead.**
`docs/BUILD_06_LEDGER.md` is the commit-tied record this file summarises.
`docs/HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md` (third edition) was the
brief; `docs/DESIGN_DIRECTION.md` remains the law of the frontend;
`docs/HANDOFF_04_MARKETPLACE.md` section 13 still binds every worker.

This file is written to be read by somebody who was not here. Where a claim
is not proven, it says so. Nothing in it is a plan; everything in it either
happened or is named as outstanding.

## 1. What Vallo now is

A two-sided property platform on Next.js 16, React 19, Tailwind 4 and
Supabase, serving www.vallospaces.com from Vercel. The Property side rents,
sells and manages; the Stays side hosts hotels, shortlets, resorts, guest
houses and restaurants; one account crosses between them through the flip
coin in the side drawer.

What changed in this build is the face. The product had the machinery and
did not look like the renders it was designed from. It now does, on the
surfaces listed in section 3, and the founder's own photographs of
production are filed beside the renders in
`docs/design/references/founder/` so the next session can see what was
being judged.

The design system carries the change rather than the pages. The founder's
word for the shipped product was "dull", and the cause was one missing rung
in the token layer: there was nothing between a bare hairline and the
strong glow reserved for the one object a screen is built around, so every
resting card wore a 50 per cent outline with its bloom set too far back to
see. `--nf-glow-edge` is that rung, and `.nf-glass--card`,
`.nf-glass--tile` and `.nf-icon-btn` wear it. The dock capsule is blue
glass, the primary button rests in its own bloom, and the glass secondary
beside it is brand-ringed. A worker who needs the founder's "shiny glass
edge" now asks for a class, not for a shadow of their own.

## 2. What landed, with commits

The ledger's section 4 is the full table. The spine of it:

| What | Commit |
| --- | --- |
| The ledger, the rules restated, the baseline, the preview harness | `1656781` |
| The founder's photography as product assets, twenty plates and eight scene plates | `1c97d71` |
| The B0 money audit verdict | `d9e313d` |
| The chrome: five-slot labelled dock, the header on every in-app page, the drawer as a designed surface | `6e2e2ac` |
| The flip's lit rim and glass back pane | `9fd7af3` |
| `middleware.ts` becomes `proxy.ts` (Next 16) | `17556f4` |
| A missing translation can no longer break the build (the English fallback) | `776ba64` |
| The fifteen workers' first stints | `f82c4ff`..`3b0f97f` |
| BA's lifecycle jobs, b4 applied and live-probed | `c838b57` |
| BB's rent seams and the seeded-photo path | `536046c` |
| BC and BD's desks on the console table | `383fe16` |
| The five frontend scopes | `6dc50c0` |
| `--nf-glow-edge`, the glass ladder's brand outline, the blue dock capsule | `3e1413f` |
| The lit primary, the brand-ringed glass secondary, the lit icon plate, and the production fix | `bf4d63f` |
| The founder's send-backs: home, the listing page, search, the filter sheet, the threads and desks | `d3611d1` |
| A compacted figure keeps its value | `b4999de` |

Applied live on the Supabase project, each read line by line first and
probed in a rolled-back transaction: BB's b2 (example stays and their
photographs) and b3 (a thread per table, the rent charge), BD's b7
(`admin_user_id_by_email`), BC's b5 (a block holds in messaging), BA's b4
(booking lifecycle sweeps, inventory drift, cron watch) and the badge-sweep
fix. `database.types.ts` was regenerated after them.

## 3. What is proven

Proven means a screenshot on disk taken from the running product and read
beside its governing image, or a test, or a live database probe. The
ledger's section 6 holds the proof table and section 7 the probes.

- **Screenshot proofs on disk:** the lead's drawer, dock and flip; F1's
  sign-in, welcome, home (rebuilt), home cities, assistant and
  notifications at 390 dark and light and home at 1280; F2's landing at
  1440 and 390; F3's fourteen catalogue proofs including the rebuilt
  listing detail, search, filters, stay detail, restaurant, move-in,
  stays, trips and bookings; F5's ten thread and console proofs including
  the booking thread, the rental face, inspections and the admin queue at
  390 and 1440; BC's audit desk; BD's four money desks; G2's forty-one
  glass objects.
- **Tests:** 1,937 passing across 101 files.
- **Gates:** typecheck zero errors, the CSS token checker clean on all
  eight of its rules across 36 partials, lint zero errors, and `next build`
  exit 0. All five are now run before every push.
- **Live probes, rolled back:** b4 (room spine, cron failures), b3 (the
  rent path), b2 (the example shelf's counts), and the stays search.

Not proven, and named as such: F4's feed, profile and settings, and E's
wallet, payments and crypto, shipped their last design change unseen
because the box was too loaded to screenshot them. Both are under proof now.
No crypto surface has ever been proven against live market data, because
this sandbox has no outbound internet and no key.

## 4. What remains, file-precisely

1. **The landing page** to the founder's full send-back
   (`docs/design/references/founder/landing-fullpage-target.png`): the
   compact phone hero with the plate behind the words, the folded nav, the
   eight photo category tiles, the six feature tiles, the community band's
   real stats, how-it-works, the stays band, the app band and the footer.
   `components/site/**`, `app/css/landing.css`, `app/css/site.css`.
2. **`components/site/landing/ListingMini.tsx`** paints the listing title
   over the photograph and the "Per night" pill collides with it. The
   founder photographed this one.
3. **The listing page's pinned foot** overlaps the section tabs at 390, and
   its three parts collide. `components/app/listing/ListingStickyBar.tsx`,
   `app/css/catalogue.css`.
4. **Stay detail** has the lead card and the price row but not the hairline
   spec strip, the host row inside About, or the titled Check Availability
   card. `app/(app)/stay/[id]/StayDetailView.tsx`.
5. **The search card's fact row** wraps to two lines at 390 where the render
   has one. The render's size is below the type scale's floor, so it needs a
   different answer, not a smaller one.
6. **No call control in a thread header**, which the render draws:
   `loadThread` in `lib/messages/live.ts` carries no `counterpartPhone`, and
   `Inspection` in `lib/inspections/types.ts` carries none either. A button
   there today would be a dead control.
7. **`lib/bookings/queries.ts`** still renders a rent booking on `/bookings`
   as a one-night stay with a date range; it should branch on
   `rent_payments` the way `arrival.ts` now does.
8. **`lib/saved/places-actions.ts`** is an action layer with no UI caller:
   nothing outside `lib/saved/` imports it.
9. **`PLACE_COPY.unconfigured`** in `lib/social/places-schema.ts` holds a
   banned sentence. Nothing renders it today.
10. **`CoinImage`** passes `unoptimized` to `next/image` because
    CoinGecko's asset hosts are not in `next.config.ts`.
11. **Hausa, Igbo and Yoruba** carry the new market names, the cities
    strings and the search placeholder but not the listing-count plurals or
    the invest block; those fall back to English key by key and want a
    native speaker.
12. **`components/app/stays/StayCategoryRail.tsx`** is dead code whose
    grammar now contradicts the tile grammar.

## 5. What needs the founder

1. The seeded login, so a signed-in surface can be proven rather than drawn
   from fixtures.
2. `COINGECKO_API_KEY`. The Crypto surface is built and dark until it lands.
3. M6 and the landmark seed, both drafted and parked in
   `supabase/migrations/pending/`.
4. The parked revoke,
   `pending/20260918150300_b5_verification_is_required_is_not_a_client_call.sql`.
   Revokes are on the stop list, so it waits for a word.
5. Leaked-password protection in the Supabase Auth dashboard: an advisor
   warning, a dashboard switch, no code.
6. Inherited and still open: the four `private` tables the advisor flags,
   the MapTiler key, and LiteAPI and Booking.com for Phase F.

## 6. How the next session starts

1. `git pull origin main`.
2. Read this file, then `docs/BUILD_06_LEDGER.md` sections 0, 4, 6, 7 and 8,
   then `docs/DESIGN_DIRECTION.md`, then `docs/design/CATALOGUE.md` beside
   the images in `docs/design/references/` and the founder's own in
   `docs/design/references/founder/`.
3. Run the five gates before believing anything: `npx tsc --noEmit -p
   apps/web`, `npx eslint src`, `node scripts/check-css-tokens.mjs`, `npx
   vitest run`, and `npx next build`. The fifth is not optional: skipping
   it took production down for twenty minutes in this build, and the
   ledger's section 7.0 explains exactly how.
4. Four concurrent workers is what this box holds. Fifteen, and then nine,
   drove the load average above 100 on four cores, which OOM-killed
   typechecks, panicked Turbopack's PostCSS worker into 500ing every
   preview route, and made workers report machine faults as code faults.
5. A worker's proof is only worth the tree it was shot from. Two workers in
   this build finished a stint having changed a design they had never seen
   rendered.
