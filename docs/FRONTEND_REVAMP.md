# The frontend revamp

**A survey, not a change.** This session sliced, cut, named and committed the
new glass artwork, and audited the frontend. It did not rewire a single call
site. Nothing in this document has been implemented. The product renders exactly
what it rendered before.

Companion to `docs/HANDOFF_03_FRONTEND.md`, which is the brief this answers.
`RECOMMENDATIONS.md` is untouched and unrenumbered: its 645 entries keep their
IDs and the thirty ticked in its section 5 are still the thirty. The
recommendations here are a separate set with their own prefixes.

---

## 1. Where the frontend actually stands

Written after the work below, so it reflects what was found rather than what was
expected.

*(Filled in at the end of this document, once the audit sections below have been
read. See section 8.)*

---

## 2. The icon artwork

### 2.1 What was supplied and what came out

Twelve PNG sheets. **Two were byte-for-byte duplicates** of two others,
confirmed by checksum before anything was deleted: `3C03D844` duplicated
`B04429B0`, and `6D730F28` duplicated `ECFA9C34`. So there are **ten unique
sheets**, not twelve.

`docs/HANDOFF_03_FRONTEND.md` section 4 says "seven remaining sheets, dark
only". After deduplication there are **six**: ten unique, minus the two hero
sheets, minus the two transaction sheets. That matters because it is six sets of
light artwork that do not exist, not seven.

| Sheet | Objects | What it is |
| --- | ---: | --- |
| `0B2E4D21` | 25 | Actions and concepts, drawn in detail |
| `9795AD6E` | 25 | Places, drawn as scenes |
| `ECFA9C34` | 25 | The same places, drawn as single objects |
| `B04429B0` | 25 | Actions, drawn as single objects |
| `FDA04DD1` | 25 | Trust and money, drawn in detail |
| `2676C1FC` | 25 | Stays and trust, drawn as single objects |
| `CF5A4150` | 24 | Transactions and outcomes, on dark glass tiles |
| `C0F67033` | 24 | The same 24, frosted white glass on white |
| `7EE388E5` | 6 | Hero scenes: the assistant, trips, schedule |
| `8DBE517E` | 6 | Hero scenes: property, reach, growth, trust, app, support |

**210 objects.** All 210 are sliced, keyed to alpha and named. 140 are delivered
as files: 104 objects, 24 light twins, 12 hero scenes, **3.3MB in total against
6.5MB for the 87 objects in `brand/icons` today.**

### 2.2 The sheets are three passes over one vocabulary, not three vocabularies

This is the single most useful thing found. The ten sheets are not ten different
sets. `shield-check` is drawn four times, `chart-growth` three, `beach-house`
three. One pass draws places as scenes with a pool and four palms, another draws
the same places as single objects, and the same split runs through the actions.

That means **the new artwork lands on the names the product already uses.**
73 of the 87 objects `BrandIcon` draws today have a like-for-like glass
replacement under the same name. A swap is a file change, not a code change.

It also means a choice had to be made about which drawing wins, and the rule is
about size rather than taste. `BrandIcon` defaults to 56px and its largest use
asks for 160px. A scene with a pool and four palms is the better picture and the
worse icon: at 24px it is a blue smudge. **The single-object passes win by
default** and the detailed passes are used only where the simple sheets do not
carry the object at all. `CANONICAL` in `scripts/icon-manifest.mjs` records
every one of those decisions, and every alternate drawing is one command away.

### 2.3 How the artwork was cut, and why a threshold would have ruined it

The objects glow. The glow fades continuously into the black ground over forty
or fifty pixels, and **any brightness threshold cuts that ramp at an arbitrary
point**: above the line you keep dark navy pixels that read as grime on a pale
card, below it you amputate the bloom, which is half of what makes the mark look
like the logo.

The artwork is additive light on black, so the render is close to `object +
black` and **brightness is opacity**. So alpha comes from luminance, normalised
between a floor and a ceiling, and the colour is then unpremultiplied by that
alpha. This is not an approximation of a cutout, it is the inverse of how the
image was formed. Composited back onto black it returns the original pixel for
pixel; composited onto navy, onto a card or onto white the glow falls off
smoothly, because there is no edge to see: the alpha ramp is the glow.

Verified on four real surfaces from `packages/design-tokens/src/tokens.css`. See
`docs/img/glass-on-four-grounds.png`, which is the evidence for section 2.6.

### 2.4 Table one: every current object and what replaces it

73 of 87. Same name, same call site, new file.

| Current object | Cut from | Other drawings available |
| --- | --- | --- |
| `beach-house` | `ecfa9c34` #01 | 2 |
| `bell-badge` | `b04429b0` #15 | none |
| `booking-instant` | `0b2e4d21` #10 | none |
| `bot` | `b04429b0` #10 | none |
| `bungalow` | `ecfa9c34` #02 | 1 |
| `calendar-check` | `2676c1fc` #24 | 2 |
| `calendar-clock` | `2676c1fc` #25 | 1 |
| `calendar-home` | `0b2e4d21` #13 | none |
| `calendar-time` | `0b2e4d21` #14 | none |
| `camera` | `b04429b0` #22 | none |
| `card-lock` | `0b2e4d21` #03 | 1 |
| `chart-growth` | `2676c1fc` #22 | 3 |
| `chat-duo` | `b04429b0` #16 | none |
| `clock-check` | `2676c1fc` #20 | none |
| `cluster-home` | `ecfa9c34` #03 | none |
| `container-home` | `ecfa9c34` #04 | 1 |
| `coworking-space` | `2676c1fc` #09 | 1 |
| `doc-lock` | `2676c1fc` #16 | 1 |
| `doc-shield` | `2676c1fc` #15 | 2 |
| `duplex` | `ecfa9c34` #22 | 1 |
| `farm-house` | `ecfa9c34` #06 | 1 |
| `gift` | `0b2e4d21` #06 | 1 |
| `gift-star` | `2676c1fc` #21 | 3 |
| `globe-pin` | `0b2e4d21` #24 | none |
| `heart-home` | `b04429b0` #13 | none |
| `home-check` | `2676c1fc` #18 | 1 |
| `home-search` | `b04429b0` #01 | 1 |
| `hotel` | `ecfa9c34` #16 | 2 |
| `hotel-star` | `b04429b0` #21 | 1 |
| `house-boat` | `ecfa9c34` #07 | 2 |
| `key-cycle` | `0b2e4d21` #19 | none |
| `keys-home` | `b04429b0` #14 | 1 |
| `keys-tag` | `0b2e4d21` #18 | none |
| `lake-house` | `ecfa9c34` #08 | 1 |
| `land-plot` | `2676c1fc` #07 | 2 |
| `listing-search` | `fda04dd1` #14 | 1 |
| `loft` | `ecfa9c34` #10 | 1 |
| `luggage-check` | `0b2e4d21` #15 | none |
| `luggage-plane` | `b04429b0` #24 | 1 |
| `mansion` | `ecfa9c34` #11 | 1 |
| `map-route` | `0b2e4d21` #23 | none |
| `map-spot` | `b04429b0` #06 | none |
| `mini-flat` | `ecfa9c34` #12 | none |
| `modern-house` | `ecfa9c34` #13 | 2 |
| `mountain-cabin` | `ecfa9c34` #14 | 2 |
| `naira-hand` | `fda04dd1` #16 | 1 |
| `office-space` | `ecfa9c34` #25 | none |
| `penthouse` | `ecfa9c34` #15 | 1 |
| `pin-map` | `fda04dd1` #25 | none |
| `report-stats` | `2676c1fc` #23 | 2 |
| `reviews` | `2676c1fc` #19 | 1 |
| `search-home` | `0b2e4d21` #20 | none |
| `serviced-apartment` | `2676c1fc` #04 | none |
| `shared-apartment` | `ecfa9c34` #17 | 1 |
| `shield-check` | `2676c1fc` #11 | 2 |
| `shield-home` | `2676c1fc` #12 | 2 |
| `shield-lock` | `2676c1fc` #13 | 1 |
| `shop-retail` | `2676c1fc` #10 | 1 |
| `studio-apartment` | `ecfa9c34` #18 | 1 |
| `support-chat` | `2676c1fc` #14 | none |
| `support-shield` | `fda04dd1` #09 | none |
| `tag-hash` | `0b2e4d21` #05 | 1 |
| `tag-percent` | `b04429b0` #05 | 2 |
| `terrace-house` | `ecfa9c34` #19 | 1 |
| `tour-360` | `b04429b0` #23 | 1 |
| `townhouse` | `ecfa9c34` #20 | none |
| `tree-house` | `ecfa9c34` #21 | 1 |
| `twin-house` | `ecfa9c34` #05 | 1 |
| `user-check` | `2676c1fc` #17 | 1 |
| `user-verified` | `b04429b0` #17 | none |
| `villa` | `ecfa9c34` #23 | 2 |
| `wallet-secure` | `0b2e4d21` #02 | 1 |
| `warehouse` | `ecfa9c34` #24 | 2 |
### 2.5 Table two: new objects with no current equivalent

31 objects, and **24 of them are one set**: the transactions and outcomes sheet.
Nothing in the 87 objects the platform draws today covers a payout, a refund, a
failed payment, a receipt, a signed contract or a handover of keys, and nothing
covers the three outcomes a confirmation screen has to show.

| New object | Cut from | Where it belongs |
| --- | --- | --- |
| `badge-success` | `cf5a4150` #12 | The confirmation system. Emerald-adjacent rosette with a tick |
| `badge-pending` | `cf5a4150` #13 | The confirmation system. The same rosette with an hourglass. **This is the bright cyan pending state the house rules ask for and the product has never had an object for** |
| `badge-failed` | `cf5a4150` #14 | The confirmation system. The same rosette with a cross |
| `payout-hand` | `cf5a4150` #01 | Agent payout screens, the wallet payout sheet |
| `deposit` | `cf5a4150` #02 | Wallet top up |
| `refund` | `cf5a4150` #05 | Cancellation and refund states |
| `payment-failed` | `cf5a4150` #04 | The failed checkout screen, which today has no object at all |
| `receipt-check` | `cf5a4150` #08 | Booking receipts, wallet statements |
| `contract-sign` | `cf5a4150` #24 | Tenancy agreement, the point the lease is signed |
| `key-handover` | `cf5a4150` #23 | Move in. The moment the product exists for |
| `id-check` | `cf5a4150` #20 | The verification wizard |
| `doc-search` | `cf5a4150` #21 | A document under review |
| `doc-failed` | `cf5a4150` #22 | A rejected document, with the reason |
| `ledger-check` | `cf5a4150` #11 | The wallet ledger |
| `savings-pot` | `cf5a4150` #10 | Savings |
| `cash-box` | `cf5a4150` #09 | Held funds |
| `wallet-add` | `cf5a4150` #06 | Add money |
| `wallet-send` | `cf5a4150` #07 | Send money |
| `coin-naira` | `cf5a4150` #03 | A single amount |
| `hourglass` | `cf5a4150` #15 | Anything waiting |
| `clock-expired` | `cf5a4150` #19 | An expired hold or offer |
| `chart-donut` | `cf5a4150` #16 | Admin and agent breakdowns |
| `alert-warning` | `cf5a4150` #17 | The warning state, which today borrows a bell |
| `info` | `cf5a4150` #18 | The informational state |
| `wallet` | `b04429b0` #03 | A plain wallet, where `wallet-secure` overstates it |
| `naira-coins` | `b04429b0` #04 | A balance |
| `doc-home` | `b04429b0` #19 | A listing as a document |
| `home-lock` | `fda04dd1` #07 | A secured or locked listing |
| `concierge-bell` | `fda04dd1` #05 | Hotel and serviced stays |
| `hotel-room` | `2676c1fc` #02 | A room rather than a building |
| `shortlet` | `2676c1fc` #03 | The shortlet market, which today borrows `studio-apartment` |

**The transaction objects arrive on their own rounded glass tile.** That is
correct for a confirmation screen, where the object is the subject, and wrong
inside a list row. `BrandIcon`'s `tile` prop already makes that distinction, so
these should be used with `tile={false}` and the artwork's own tile allowed to
be the chip, rather than a tile drawn around a tile. That is a real constraint
on where they can be used and it is the one thing about this set to watch.

### 2.6 Table three: current objects with no replacement, and what happens

14 of the 87. **Six of them are already dead code**, in the sense that they are
never named anywhere in `apps/web/src` outside the `BRAND_ICONS` inventory in
`BrandIcon.tsx`, so nothing draws them today either.

| Current object | Drawn today? | What happens |
| --- | --- | --- |
| `cleaning` | no | **Delete.** Never drawn, no glass equivalent, no screen asks for it |
| `home-cam` | no | **Delete.** Superseded by `camera` |
| `home-refresh` | no | **Delete.** `key-cycle` covers the same idea and is drawn |
| `home-swap` | no | **Delete.** Never drawn |
| `parking-space` | no | **Delete**, unless parking becomes a listing kind. It is not one of the nine markets in `CategoryRail.tsx` |
| `swimming-pool` | no | **Delete.** It was an amenity icon in a product whose amenities are text |
| `phone-home` | no | **Delete the small object**, and use `hero/hero-app` where the idea is needed at size |
| `bell-alert` | yes | **Substitute `bell-badge`.** The alert is a state, and `BrandIcon` already carries `state="alert"` |
| `chat` | yes | **Substitute `chat-duo`.** One bubble against two is not a distinction any screen is making |
| `bot-chat` | yes | **Substitute `bot`** at small sizes, `hero/hero-assistant-chat` at size |
| `bot-home` | yes | **Substitute `bot`** at small sizes, `hero/hero-assistant-home` at size |
| `listing-review` | yes | **Substitute `doc-home`**, or `doc-search` where the sense is specifically "under review" |
| `homes-sparkle` | yes | **Commission.** No glass object carries "several homes, recommended". Interim: `cluster-home` |
| `house-sparkle` | yes | **Commission.** Interim: `modern-house` |

**Two objects to commission, not fourteen.** That is the answer to the question
the brief asks, and it is a much better answer than expected.

A separate finding from the same scan, and it is worth acting on regardless of
the glass work: **33 of the 87 objects in `brand/icons` are never named anywhere
outside the inventory.** 2.82MB of artwork ships to every visitor's cache and is
never drawn. Most of them are property types waiting for a screen that browses
by type beyond the nine tiles in `CategoryRail.tsx`.

### 2.7 The twelve hero scenes

Six per sheet, three by two, each on a lit glass plinth, at roughly five times
the pixel area of a small object and **wider than they are tall**.

| Hero scene | Cut from |
| --- | --- |
| `hero/hero-app` | `8dbe517e` #05 |
| `hero/hero-assistant` | `7ee388e5` #01 |
| `hero/hero-assistant-chat` | `7ee388e5` #02 |
| `hero/hero-assistant-home` | `7ee388e5` #03 |
| `hero/hero-globe` | `8dbe517e` #02 |
| `hero/hero-growth` | `8dbe517e` #03 |
| `hero/hero-map-stay` | `7ee388e5` #05 |
| `hero/hero-property` | `8dbe517e` #01 |
| `hero/hero-protected` | `8dbe517e` #04 |
| `hero/hero-schedule` | `7ee388e5` #06 |
| `hero/hero-support` | `8dbe517e` #06 |
| `hero/hero-trip` | `7ee388e5` #04 |
They are **not icons and must never be given an icon's name**, which is why they
carry a `hero-` prefix and live in their own directory: a hero scene at 24px is a
blue blur, and a small object blown up to fill a landing panel is a small object
blown up. They are also the only artwork on this platform that is not square, and
they are written at source resolution rather than resized, because squaring a
wide scene crops it.

**Recommended treatment.** One per section, never two in view at once. Sit it on
the section's own ground with no card, no border and no tile: it already carries
its own plinth and its own light, and putting a glass card behind a glass plinth
is the nested-chrome problem this platform already has. Maximum rendered width
**440px at 1440px, 320px at 768px, and 260px at 390px**, centred, with the
section's headline below it rather than beside it at 390px. Below 390px it should
not shrink further; it should be the thing that sets the section's minimum.

**Order and copy, proposed.** These six carry the product's argument in the order
somebody meets it:

1. `hero-property` with the headline. A real place, a pin, a plinth. This is the
   landing hero and it answers "what is this" in one picture.
2. `hero-app` for "it is a real app". Phone, listing, a booking confirmed.
3. `hero-map-stay` for discovery. Pin, building, a bed.
4. `hero-protected` for trust. Shield, house, tick. **This is the one that has to
   say nothing about escrow**, because the platform holds nobody's money. The
   copy beside it is about verification and inspection, not custody.
5. `hero-schedule` for inspection and move in.
6. `hero-support` for the assistant and 24/7 help.

`hero-assistant`, `hero-assistant-chat` and `hero-assistant-home` belong to the
assistant surface rather than the landing page, and `hero-growth` and
`hero-globe` belong to the agent pitch. **`hero-globe` should be used carefully
or not at all**: it is a globe showing Africa with an aeroplane round it, which
is a travel idea rather than a Nigerian property idea.

### 2.8 The light theme, answered with evidence

This is the question `docs/HANDOFF_03_FRONTEND.md` section 2.5 asks, and the
answer is not the one that was expected. Two images in this repository are the
evidence: `docs/img/glass-on-four-grounds.png` and
`docs/img/glass-in-daylight.png`.

**What was tested.** Every combination of the dark artwork and its light twin
against the four real surfaces in `tokens.css`: `#000010` dark canvas, `#000020`
dark card, `#F4F5F7` light canvas, `#FFFFFF` light card.

**What it shows.**

- The dark artwork on the two dark surfaces is **excellent**, with no halo
  anywhere and no edge.
- The dark artwork on the two light surfaces is **washed out**. It renders as a
  pale cyan haze. It is not broken, it is weak, and weak is worse: a broken image
  gets fixed and a weak one ships.
- The light twin on the light surfaces is **excellent**.
- The light twin on the dark surfaces **fails hard**. The white tick inside
  `badge-success` turns black, and the paper in `receipt-check` goes to near
  black. A frosted white object keyed off white leaves the white as the
  transparent part, so on a dark ground the object inverts.

**So the twins are genuinely necessary and a filter is genuinely not enough.**
No `invert()`, no `hue-rotate()`, no opacity change gets from one of these to the
other, because the difference is which parts of the object are transparent.

**And only 24 of the 104 objects have a twin.** So the recommendation is three
parts, and the middle one is the important one:

1. **Use the twins for the 24 that have them.** They share their names with their
   dark counterparts on purpose, so a theme-aware `BrandIcon` is a directory
   prefix and a single line: `/brand/glass/light/${name}.png` against
   `/brand/glass/${name}.png`. No lookup table, no second inventory.

2. **For the other 80, put the object on a navy chip in daylight.** This was
   tested rather than assumed, and it is in `docs/img/glass-in-daylight.png`: the
   dark artwork on `#010118` on a white card is not a workaround, **it is better
   than the bare object on white**, and it is the most premium the set looks
   anywhere. The mechanism already exists. `--nf-icon-ground` is the flat plate
   `BrandIcon` draws behind an untiled object; it resolves to `transparent` in
   the light theme today because the current clay artwork needs nothing there.
   Change that one token to the base navy and 80 objects are solved. **One token,
   not 80 files.**

3. **Commission the light pass of the remaining six sheets** only for the places
   an object must sit bare on paper with no chip allowed: email, print, and a
   light-theme empty state where a chip would read as a hole. The founder's
   renderer already produced `C0F67033` from `CF5A4150`, so the light pass is a
   repeat of something that has been done once, not a new commission.

There is one honest limit. **A glass object is see-through by design**, so its
alpha is partial across the interior. That is correct on a dark surface and reads
thin on a pale one, and it is the reason point 2 works: the chip gives the glass
something to be glass against.

### 2.9 Where the files live

```
assets/brand-sheets/            the ten supplied sheets, moved off the repo root
assets/brand-sliced/            derived, git-ignored, 210 squares
assets/brand-cut/               derived, git-ignored, 210 with alpha
assets/icon-replacement.json    the generated coverage report
scripts/slice-icon-sheets.mjs   measure the geometry, cut
scripts/cut-icon-ground.mjs     key out the ground, recover the glow
scripts/icon-manifest.mjs       what all 210 are, and which drawing wins
scripts/name-icon-objects.mjs   write the named set and the report
apps/web/public/brand/glass/    104 objects, 256px
apps/web/public/brand/glass/light/   24 light twins
apps/web/public/brand/glass/hero/    12 wide scenes, source resolution
apps/web/public/brand/icons/    the 87 clay objects, UNTOUCHED and still live
```

The twelve sheets were sitting in the repository root. They are source, so they
are kept, but the root of a repository is not where source artwork belongs.

**The two intermediate directories are git-ignored deliberately.** They are 37MB
and they are one command away from existing again. The named set is committed,
because that is what gets served.

**Nothing is wired up.** The glass set sits beside `brand/icons` rather than on
top of it, so the artwork can be reviewed in place, at real sizes, in both
themes, before anything moves. Rebuilding the whole set from the sheets is three
commands and is documented in `assets/README.md`.

### 2.10 What the swap actually costs, when it is approved

`BrandIcon` has **124 call sites**. The swap is a one-character change to one
template literal in `apps/web/src/design-system/icons/BrandIcon.tsx`: `icons`
becomes `glass`. Then:

- **The `mix-blend-mode: multiply` rule goes.** The current artwork is opaque RGB
  on white and the white is removed at paint time by multiply, which is why an
  untiled object needs `--nf-icon-ground` to be visible at all on dark. The glass
  artwork has a real alpha channel. The blend mode, the ground plate on dark, and
  the long comment in `BrandIcon.tsx` explaining why an object with nothing light
  behind it is invisible all become unnecessary.
- **8 names need substituting** first, per table three, or 8 screens lose an icon.
- **`BRAND_ICONS` gains 31 names and loses 14**, so it is a real edit to the union
  type and TypeScript will find every call site that used a deleted name.

---

## 3. The slogan

**"Real Estate reimagined!"** replaces "Find it. Rent it. Love it."

The old one is live in **six places**, and the way they are split is itself a
defect worth fixing at the same time:

| Where | Line | Note |
| --- | --- | --- |
| `packages/i18n/src/locales/en.ts` | 327 | `tagline: "Find it. Rent it. Love it. Around Nigeria."` **The only translatable copy of it**, and it carries an extra sentence the other five do not |
| `apps/web/src/app/layout.tsx` | 50 | Page title default |
| `apps/web/src/app/layout.tsx` | 68 | Open Graph title |
| `apps/web/src/app/(site)/about/page.tsx` | 61 | The about page `h1` |
| `apps/web/src/components/site/landing/SignatureShowcase.tsx` | 25 | Split across a span so "Love it." takes the gradient |
| `apps/web/src/lib/email/theme.ts` | 151 | `SIGN_OFF`, which `render.ts` puts in the footer of every email |

**Five of the six hardcode English and bypass `packages/i18n` entirely.** The
slogan is the single most repeated string in the product and it is the one that
is least translatable. Changing it is the moment to fix that: one exported
constant, sourced from i18n, imported by the other five. `SIGN_OFF` in
`theme.ts` is already the right shape and is the model.

**Where the new one should and should not go.** "Real Estate reimagined!" is a
positioning line, not a product description, so it belongs beside the logo and
nowhere else: the landing hero, the page title, the Open Graph card, the email
sign off. It should **not** be the about page `h1`, which needs a sentence about
what the product does rather than a claim about it, and it should not appear
twice on one screen.

Two mechanical notes. The exclamation mark is part of it, so it must not be
stripped by a title template. And it is title case on "Real Estate", which is
inconsistent with British house style elsewhere in the product; that is the
founder's call and it is flagged rather than changed.

---

## 4. The live database, and what it means for every screen below

Read from the live project, not assumed. **This is the single most important
context for the audit sections, because it changes what "empty state" means.**

| Table | Rows |
| --- | ---: |
| `listings` | 64, every one of them `status = 'PUBLISHED'` |
| `listings` where `is_demo = true` | **64** |
| `listings` with `address_verified_at` | **0** |
| `listings` with `physically_inspected_at` | **0** |
| `listing_photos` | **0** |
| `listings` with `total_move_in_cost_minor` | 40 of 64 |
| `profiles` | 6 |
| `bookings` | **0** |

**Every listing on the platform is a demo row, none is verified, none has been
inspected, not one has a photograph, and nobody has ever booked anything.** So:

- `MediaFrame.tsx` does not have a fallback path, it has **the only path**. What
  it draws is what every listing on the platform looks like, on every surface.
  `scripts/build-scene-manifest.mjs` and `docs/IMAGERY.md` exist to close that,
  and until a photograph is dropped in, the drawn scene is the product.
- A verified badge has **never been rendered against a true row**. Any audit
  finding about how verification reads is a finding about code that has not run.
- 24 of 64 listings cannot show a move in total, so the price block has a real
  branch that a demo catalogue exercises by accident.
- **Zero bookings.** Every checkout screen, every receipt, every wallet entry,
  every confirmation and every agent payout view in this product has only ever
  been seen against fixtures. That is not a reason to distrust the audit findings
  below, but it is the reason a finding that says "this state has never been
  rendered" appears more than once.

---

