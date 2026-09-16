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

30 objects. **24 of them are one sheet, and that sheet is a commission this
repository already placed.**

`docs/BRAND_MARKS.md` section 3 is a standing order for twenty four marks, each
with a name, the state it serves and a description of the object to build, so
that "every success, pending, verified and failed moment in the product has a
mark that belongs to Vallo". It was written because nothing in the 87 objects
covers a payout, a refund, a receipt, a signed contract or a handover of keys.

**`CF5A4150` is that commission, delivered.** Twenty three of the twenty four
are on it, and several match the written description object for object: mark
number nine is specified as a "blue-banded strongbox with a naira note half
inside", and index 09 is a blue-banded strongbox with a naira note half inside.

So the names are BRAND_MARKS' names, not new ones. A document that already
specifies a name is the authority. Three deviations, each deliberate and each
recorded in `scripts/icon-manifest.mjs`:

- `hourglass-blue` becomes **`hourglass`**. A colour does not belong in an
  object's name: the light twin of this object is not blue.
- `info-round` becomes **`info`**. The roundness is not the meaning.
- **`payment-pending`, mark number 3, is not on the sheet.** Index 03 is a plain
  naira coin, which is not a pending state, so it is named `coin-naira` rather
  than pressed into a role it does not play. Pending is covered twice over by
  `seal-pending` and `hourglass`, so this is a gap that needs no commission.

| Mark | Cut from | The state it serves |
| --- | --- | --- |
| `payment-sent` | `cf5a4150` #01 | Payment made, rent paid |
| `payment-received` | `cf5a4150` #02 | Money in, payout landed |
| `payment-failed` | `cf5a4150` #04 | Declined, reversed |
| `transfer-arrow` | `cf5a4150` #05 | Wallet to wallet, send money |
| `wallet-plus` | `cf5a4150` #06 | Wallet funded, top up |
| `wallet-out` | `cf5a4150` #07 | Withdrawal, cash out |
| `receipt-check` | `cf5a4150` #08 | Receipt issued, proof of payment |
| `savings-pot` | `cf5a4150` #10 | Savings, rent set aside |
| `ledger-book` | `cf5a4150` #11 | Transaction history, statement |
| `seal-check` | `cf5a4150` #12 | Generic success. The hero mark |
| `seal-pending` | `cf5a4150` #13 | Under review, awaiting a decision |
| `seal-cross` | `cf5a4150` #14 | Rejected, declined, failed |
| `hourglass` | `cf5a4150` #15 | Processing, please wait |
| `progress-ring` | `cf5a4150` #16 | Step 2 of 4, partial completion |
| `alert-triangle` | `cf5a4150` #17 | Attention, action required |
| `info` | `cf5a4150` #18 | Explanation, disclosure |
| `clock-expired` | `cf5a4150` #19 | Offer expired, hold released |
| `id-card-check` | `cf5a4150` #20 | NIN or ID verified |
| `doc-review` | `cf5a4150` #21 | Document under review |
| `doc-cross` | `cf5a4150` #22 | Document rejected, resubmit |
| `keys-handover` | `cf5a4150` #23 | Tenancy started, keys released |
| `contract-sign` | `cf5a4150` #24 | Agreement signed |
| `coin-naira` | `cf5a4150` #03 | A single amount. Not a state |
| `wallet` | `b04429b0` #03 | A plain wallet, where `wallet-secure` overstates it |
| `naira-coins` | `b04429b0` #04 | A balance |
| `doc-home` | `b04429b0` #19 | A listing as a document |
| `home-lock` | `fda04dd1` #07 | A secured or locked listing |
| `concierge-bell` | `fda04dd1` #05 | Hotel and serviced stays |
| `hotel-room` | `2676c1fc` #02 | A room rather than a building |
| `shortlet` | `2676c1fc` #03 | The shortlet market, which today borrows `studio-apartment` |

**One mark on that sheet is cut, named and withheld.** `escrow-hold` is index 09.
BRAND_MARKS says of it: build it, do not ship it until escrow exists. **Escrow
does not exist**, and `apps/web/src/lib/legal/terms.tsx` now says in as many
words that Vallo does not hold your money in escrow, so an escrow mark on a
screen would be the artwork contradicting the contract. It is in `WITHHELD` in
the manifest so nothing can reach for it by accident. It should be kept, because
the day the product does hold money it is already drawn.

**The transaction objects arrive on their own rounded glass tile.** That is
correct for a confirmation screen, where the object is the subject, and wrong
inside a list row. `BrandIcon`'s `tile` prop already makes that distinction, so
these should be used with `tile={false}` and the artwork's own tile allowed to be
the chip, rather than a tile drawn around a tile. That is a real constraint on
where they can be used and it is the one thing about this set to watch.

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

**It is not a find-and-replace, and the first pass at this section said it was.**
A search for the English string finds six places and misses half the problem,
because the slogan's three words are an i18n key, `landing.hero.line1/2/3`, and
that key is **reused as the titles of the three how-it-works steps**. Dropping
the new slogan into it would make the product explain how it works by saying
"Real Estate reimagined!" three times.

The full inventory, verified by reading each file:

| Where | How | Note |
| --- | --- | --- |
| `packages/i18n/src/locales/en.ts` | 250-252 | `hero.line1/2/3`. The source of six of the uses below |
| `packages/i18n/src/locales/yo.ts` | 185-187 | Translated. "Wá a. Fi pamọ́. Gbé e." |
| `packages/i18n/src/locales/ha.ts` | 186-188 | Translated |
| `packages/i18n/src/locales/ig.ts` | 187-189 | Translated |
| `packages/i18n/src/locales/en.ts` | 327 | `footer.tagline`, which adds "Around Nigeria." |
| `apps/web/src/app/page.tsx` | 147-150 | The landing `h1`, three spans so each verb animates |
| `apps/web/src/components/site/SiteFooter.tsx` | 129 | Under the footer logo |
| `apps/web/src/app/(auth)/layout.tsx` | 46 | **Under the logo lockup on all six auth screens** |
| **`apps/web/src/components/site/landing/HowItWorks.tsx`** | **44-46** | **The three step titles. This is the trap** |
| `apps/web/src/app/layout.tsx` | 50 | Metadata title default. Hardcoded English |
| `apps/web/src/app/layout.tsx` | 68 | Open Graph title. Hardcoded English |
| `apps/web/src/app/(site)/about/page.tsx` | 61 | The about page `h1`. Hardcoded English |
| `apps/web/src/components/site/landing/SignatureShowcase.tsx` | 25 | Split so "Love it." takes the gradient. Hardcoded English |
| `apps/web/src/lib/email/theme.ts` | 151 | `SIGN_OFF`, in the footer of every email. Hardcoded English |

**So it is three separate jobs, not one.**

1. **`HowItWorks` needs its own three titles**, because they were never a slogan,
   they were three verbs doing a job: find, rent, love. They should be verbs in
   the product's own voice and they should be new i18n keys, in all four
   languages. Until they are, the slogan cannot move.
2. **Five surfaces hardcode English and bypass `packages/i18n` entirely.** The
   slogan is the most repeated string in the product and it is the one that is
   least translatable. Changing it is the moment to fix that: one exported
   constant sourced from i18n, imported by the other four. `SIGN_OFF` in
   `theme.ts` is already the right shape and is the model.
3. **The new slogan needs translating into Yoruba, Hausa and Igbo**, or three
   locales keep the retired one. This is the part most likely to be forgotten,
   because nothing in the build fails when it is.

**Where it should and should not go.** "Real Estate reimagined!" is a positioning
line, not a product description, so it belongs beside the logo and nowhere else:
the landing hero's companion line, the page title, the Open Graph card, the
footer, the auth shell and the email sign off. It should **not** be the landing
`h1`, which is what the old one was and is why the page opens by saying nothing
about property; it should not be the about page `h1`, which needs a sentence
about what the company does; and it should not appear twice on one screen.

Two mechanical notes. The exclamation mark is part of it as the founder wrote it,
so it must not be stripped by a title template. And "Real Estate" is title case,
which sits oddly against British house style elsewhere in the product; that is
the founder's call and it is flagged rather than changed.

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


## 5. Agent one: the public and discovery product

**Scope:** the landing page and every `(site)` page, auth, onboarding, search,
discovery, filters, the map, saved items, the property card, the listing detail
page, the social layer, marketing metadata and share previews.

**Read this first.** The agent's own "what I did not check" section is section
5.3 below and it is unusually honest: the listing detail page, the map and the
filter drawer were read and never rendered. Findings against those are reasoned
from source, not watched.

**What the lead re-checked before committing this**, because an audit is worth
what its worst claim is worth. Verified true: the hardcoded `"17+"` verified
listings literal at `PlatformConsole.tsx:17`; that `ListingCard.tsx` and
`listing-card-model.ts` contain no reference to `moveIn` at all;
`PERIOD_SUFFIX_SHORT.sale` being an empty string at `pricing.ts:141`; and
`ProductFrame` being defined and imported nowhere. The slogan inventory was
checked hardest, because the lead's own first pass at section 3 of this document
had it wrong, and **the agent was right and the lead was wrong**: the slogan
runs through `landing.hero.line1/2/3`, reaches the auth shell and the footer that
way, is translated into three other languages, and is reused as the three
how-it-works step titles. Section 3 above is the corrected version.

#### 1. The rules, restated

Zero em dashes. British spelling. Money is integer kobo as bigint, displayed only through `formatMoney`. `ActionResult` on every server action, `resolveSession()` for sessions. Only `BrandIcon` and `UiIcon` exist; `Icon` and `Icon3D` are deleted; the two tiers never share a row; `docs/ICON_SYSTEM.md` binds. Design at 390px in dark first, then wider, then light, and light is a designed twin, not a tint; every finding is judged in both. No fees in copy. Escrow is promised nowhere. One blue family plus emerald success, rose error and bright cyan for pending; no orange, amber, gold, purple, violet or magenta. No raw colours, no raw spacing, and I never propose disabling a lint rule. First-party inventory only. The words demo, sample, preview, not live, coming soon and lorem are banned in UI copy. Colour is never the only signal. No dark patterns. The brand is Vallo; VALLO SPACES LTD is legal surfaces only. Never truncate a label, stack instead. I am read-only, I ran no git, and I wrote nothing into the repository.

I note the late instruction: Agent 3 owns the look, art direction and logo prominence. I have kept my recommendations on the public and discovery **product**: search, filters, cards, the listing page, empty states, conversion, information architecture and copy. Where a finding touches visual language I have stated the fact and left the treatment to Agent 3. I have marked items that serve **[WIDEN]** (container widths, gutters, section rhythm) and **[GLASS/BUTTONS]** so Agent 3 can pick them up.

---

#### 2. What I read, ran and rendered

**Read in full:** `docs/HANDOFF_03_FRONTEND.md`, `docs/ICON_SYSTEM.md`, `docs/HANDOFF.md` sections 0 to 2, `docs/PRODUCT.md`, `docs/HANDOFF_02_PLATFORM.md` sections 12, 13, 14, 23.3, 25, `RECOMMENDATIONS.md` section 5 only. `MediaFrame.tsx` in full before writing a word about the card, as instructed. `ListingCard.tsx`, `listing-card-model.ts`, `pricing.ts`, `types.ts`, `syndication.ts`, `supabase-repository.ts` mapper, `listing/[id]/page.tsx`, `ExampleNotice.tsx`, `ListingMoveIn.tsx`, `CategoryRail.tsx`, `FilterDrawer.tsx`, all thirteen landing components, `app/page.tsx`, `app/layout.tsx`, `manifest.ts`, `sitemap.ts`, `robots.ts`, `(auth)/layout.tsx`, `AuthChoices.tsx`, `gated-href.ts`, `BrandIcon.tsx`, `UiIcon.tsx`, `TrustIcon.tsx`, `buttons.css`, `glass.css`, `light.css`, `tokens.css` light block, `eslint.config.mjs`, `no-raw-spacing.mjs`.

**Ran:** `npx next dev -p 3210` from `apps/web`. ESLint over the landing page and its components. Nine Supabase SELECT queries (row counts, city and state distribution, kind by intent, period by kind, post kinds, the free-text mood test, the listings column list). `file` over all 87 brand icon PNGs. `du` over the icon directory.

**Rendered with Playwright (`playwright-core`, Chromium at `/opt/pw-browsers`), all at 390px, DSR 2, mobile UA, dark first then light, every screenshot opened with the Read tool:**

- Landing `/` sliced into 14 viewport segments in **dark** and 14 in **light**. Read segments 0 to 13 dark, 0, 1, 2 and 10 light.
- Full-page dark at 390: `/search`, `/rent`, `/saved`, `/around`, `/u`, `/welcome`, `/profile/setup`, `/sign-in`, `/sign-up`, `/start`, `/forgot-password`, `/reset-password`, `/about`, `/help`, `/safety`, `/standards`, `/contact`, `/careers`, `/docs`, `/cancellations`, `/terms`, `/privacy`, `/styleguide`, `/sign-up/email`, `/sign-in/email`, `/sign-up/verify`, `/auth/callback`. Read the ones named in section 4.
- A **twelve-card grid reconstruction** in both themes, built from twelve real `listings` rows pulled from Supabase, injected into the live `/search` DOM so every real class, token and theme applied. **This is a reconstruction of `ListingCard`'s markup, not the app's own server render**, and I say so wherever I cite it. I could not get the app to render a real card because of the network block below.
- Overflow test on every page: `document.documentElement.scrollWidth` against `window.innerWidth`, plus a forced `scrollingElement.scrollLeft = 500` read back.
- Token probe of 24 computed custom properties in both themes.
- Pixel sampling of the hero ground in both themes.
- Performance probe of `/` and a glass, radius and shadow census of eight pages.
- A 3x element crop of the About page value card.

**Environment, not product:** the sandbox proxy **denies egress to `uccixoonmbhrnyczyigt.supabase.co`** (`connect_rejected`, verified with curl), and there is no `.env` anywhere in the tree. So the running app has no database and no keys. Every discovery surface renders its empty or unconfigured state. **I could not see a single real listing card, listing detail page, map, filter drawer with real facts, saved board with items, or Around feed with its 66 posts, in the app itself.** I did not report any of that as a bug.

---

#### 3. WHAT I DID NOT CHECK. Read this before the findings

- **The listing detail page never rendered.** Everything I say about it is read from `listing/[id]/page.tsx` and its components. I did not see the gallery, the move-in panel, the sticky bar, the photo grid, the reviews empty state or the host panel on screen, in either theme.
- **The map never rendered.** `MapCanvas`, `RealMap`, `MapDock`, `mapGeo` and the viewport logic are unaudited beyond noting that `MapDock` carries a save heart the list card does not. No `NEXT_PUBLIC_MAPTILER_KEY` either, so the tiles would not have loaded.
- **The filter drawer never opened.** I read it and credit its pool-derived options, but I did not see it at 390px in either theme, did not test its live match count, and did not check its chips against every enum value on screen.
- **The saved board with items, the Around feed with posts, `/around/[slug]`, `/u/[handle]`, `/post/[id]`, `/stories/*` and the whole story viewer** are unaudited. `/stories` 404s (no index route), which may be correct.
- **`/docs/[slug]`, `/careers`, `/cancellations`, `/standards`, `/privacy`, `/terms` and `/help` were shot but I only read `/contact` and `/about` closely.** The long-form legal pages got a glass and overflow census only.
- I did not read the other 640 `RECOMMENDATIONS.md` entries, per instruction, so a small number of my findings may restate one. Where I recognised an overlap I have named the existing id rather than inventing a new one.
- I did not measure real network performance. My timings are localhost on a dev build, so the script weight is inflated and FCP is optimistic. The element counts, the glass count and the asset weights are real.
- I did not check the live Vercel deployment, so I cannot say whether the deployed landing page still shows RentMe. **`main` does not**: I rendered it and the brand is Vallo throughout.
- I did not audit light theme on more than four landing segments and the card grid. My light findings are token-level and card-level, not exhaustive.

---

#### 4. The honest state, and the ratings

The engineering underneath this is genuinely strong. `syndication.ts`, `pricing.ts`, `ListingMoveIn.tsx`, `VoicesBand.tsx`, the light-theme contrast work in `tokens.css` and the `FilterDrawer` pool logic are better than most funded teams ship. Several files argue their decisions in writing and then hold to them.

The problem is that the surface does not inherit any of it. **The product's own documents describe a rent-and-buy marketplace that leads with the move-in total; the screens describe a travel app that leads with a slogan that was retired.** The gap between the two is where almost everything below lives.

**Landing page: 31/100.** Evidence: 10,862px tall at 390px, roughly thirteen phone screens. Eighteen bands, not thirteen. The H1 is the dead slogan. Thirty-one of seventy-seven links go to `/sign-up`, including every call to action, so a stranger cannot see one property. Six "mood" links that return zero rows, verified by query. A hardcoded "17+ Verified listings" under a heading that says "the same real numbers" when the true number is zero and is enforced by a check constraint. A dollar-sign coin on the card that says "Priced in naira". "Coming to App Store and Play Store". A red heart emoji. **The worst failure that caps it: the page makes a fabricated trust claim and blocks every route to the catalogue, so it is simultaneously dishonest and useless as a funnel.**

**Property card: 42/100.** Evidence from the reconstruction at 390px in both themes: it truncates in three of its six content slots (location, title, power) on the same card; a sale listing and a rental sit side by side with no way to tell them apart because `PERIOD_SUFFIX_SHORT.sale` is an empty string; the MediaFrame sun disc collides with the Example and Verified badges on one card in five; card heights are ragged in a two-up grid; the power chip's background token collapses to pure white in the light theme; there is **no save control at all**, while the map dock card has one. **The worst failure that caps it: the card does not render `moveInCostMinor`, which `PRODUCT.md` calls the product rule and the differentiator, and which the landing page advertises twice.** `grep` for `moveIn` in `ListingCard.tsx` and `listing-card-model.ts` returns nothing.

**Discovery: 38/100.** Evidence: three different category taxonomies on three screens (five tiles on the landing, three on `/welcome`, nine on `/search`), one of which offers `experience`, a value `property_type` does not have. `/rent` **crashes to the error boundary** on a `next/image` src parse error. The search placeholder is truncated by a redundant search button. Two empty states render underneath the floating tab bar. "Top rated" sorts by a rating nobody can give. **The worst failure that caps it: `/rent`, the named surface of the primary market, is broken, and the landing page will not let a signed-out visitor reach search at all.**

**Auth: 55/100.** The shell is the best-looking thing in the product: the logo lockup at 104px on the aurora is genuinely premium. Evidence against: the dead slogan sits under it on all six auth screens; "By continuing you agree to our Terms and Privacy Policy" is **plain text with no links** in both `AuthChoices` and `EmailAuthForm`; sign-up is a 2,401px form collecting occupation and local government before any value is delivered; the chooser screen offers one choice. **The worst failure that caps it: an unlinked consent statement on the account creation screen.**

**Social layer: unrated, and I will not invent a number.** I never saw it with data. What I can state: 58 of 66 posts are `SYSTEM`/`SYSTEM`, so the feed is 88 per cent bot-authored; the unconfigured copy says "the platform keys are not in place yet", which is engineering language shown to users; and the Around page renders the logo twice within 100px.

##### The five things that make it look like an AI app

1. **The hero's 2x2 tile grid: "AI Assistant / Smart help, 24/7", "Verified Listings / Trusted and secure", "Best Prices / Save more", "Easy Booking / Fast and simple".** Four content-free superlatives in a two-by-two grid is the single most recognisable generic-SaaS shape there is, and two of the four are claims the database refutes.
2. **The trust strip: "Secure & Trusted / Your safety is our priority", "AI Powered / Smarter experiences", "Made for Africa / Built with love ❤️".** An ampersand, an emoji and three sentences that say nothing.
3. **Eighteen bands and 10,862px.** A landing page that says everything says nothing. Nobody who has ever had to defend a page in a review ships thirteen phone screens.
4. **Fabricated numbers with a rising chart behind them.** `PULSE = [3,5,4,7,6,9,8,11,10,13,12,15]` is a hardcoded growth line, and "17+ Verified listings" is a literal string under the words "the same real numbers".
5. **Eighty-seven opaque white-on-white clay renders used as the content icon set on a dark-default product**, forcing a near-white plate behind every one of them. `glass.css` says so in its own comment. On a navy page they are white squares.

---

#### 5. Direct answers

##### The card, with no photo, with one, and with ten

**Read `MediaFrame.tsx` first, which I did. Its position is right and its execution is now the weakest thing on the card.** It argues, correctly, that stock photography of somebody else's building is a claim we cannot make, and that a drawing of a plot with a house on it contradicts the listing. But `STAND_IN` is all-null and `SCENE_PHOTOGRAPHS` is empty, so **all 64 listings fall through to the drawn scene**, and at a two-up 390px grid that scene is about 146px tall. At that size a nine-scene vocabulary collapses into "a dark rectangle with a small grey block". Twenty of them together read as a page whose images failed.

**With no photo, which is the product today.** Stop pretending there is a photograph and stop reserving 4:3 for one. The frame should shrink to a **16:9 band** and become an **information surface**, not a picture surface. Put in it the two things a Nigerian renter decides on and the card currently hides or truncates: the **market** (To rent / For sale / Per night) and the **power answer**, both as real labels, on a solid ground drawn from the listing's own hue. Keep the drawn scene as a quiet ghost behind them at low contrast so the card still has an image's silhouette. Add one line: **"Photographs coming from the agent"**, which is honest, is not a banned string, and is a live prompt to the agent. The result is a card that is 25 per cent shorter, admits what it is, and uses the reclaimed height for the move-in total.

**With one photo.** Revert to 4:3, photo fills it, the scrim drops from `h-24` (96px, a third of the media box in a two-up grid) to about 56px and only under the location line. The market label moves off the image into the body row. One photo is enough to sell; do not add a counter, because "1" reads as a warning.

**With ten.** Still show **one** in the grid. A card's job is to get the tap. What ten buys you is on the **detail page**, not the card: a full-bleed gallery with a real counter, and, if anything on the card, a single small "10 photos" mark bottom-right of the media, in the neutral badge tone, never in a status colour. Do **not** put a swipeable carousel in a grid card: it steals the vertical scroll on a phone and it is the main reason competitor grids feel cheap. If you want motion, cross-fade to the second photo on a 400ms hover on pointer devices only.

**Three rules that hold at all three counts.** The media never carries more than one badge, and the sun disc must move out from under it (F1-042). The price never truncates, which is already guaranteed, and **neither should the location or the power line** (F1-036, F1-037). And the move-in total, not the rent, is the figure at the top of the body (F1-030).

##### The landing page

**Section order, ruthlessly.** Thirteen is wrong and the real count is worse: `app/page.tsx` adds its own hero, feature grid, vision band, category grid, trust strip, FAQ and CTA on top of the thirteen components, for **eighteen bands and 10,862px**. `ProductFrame` is imported nowhere and is dead. Ship **seven**:

1. **Hero.** Headline, one line of support, **a real search field**, and three city chips with live counts. Today the good search field exists on `/welcome`, behind the sign-up wall, and the landing has a button instead.
2. **Six live listing cards**, real, from the catalogue, linking straight into `/listing/[id]`. Nothing on this page is worth more than proof that there are properties.
3. **The move-in truth band.** One section, one idea: every competitor leads with the rent and buries the fees; we print the total. One example with the real arithmetic. This is the whole argument and it currently appears as a sub-clause in a four-cell grid.
4. **Three steps**, stacked at 390px, written as verbs.
5. **Light, water and the gate.** The five Nigerian columns no competitor has. Currently one chip on a card and one section on the detail page.
6. **Become an agent.**
7. **Footer.**

Cut: MoodRow, PopularDestinations, PlatformConsole, the hero feature grid, the category grid, the trust strip, the 12-item FAQ. Fold WhyVallo into 3 and 5. Keep VoicesBand dormant; it already renders nothing without reviews and that is exactly right. Keep NumbersBand only if every figure is read from the database, which two of its four already are.

**StoryRail: it should not stay a swipe carousel.** Eight panels behind a horizontal gesture, seven of which link to `/sign-up`, is a section nobody finishes. In dark its pale card punches a white slab into the navy; in light the same card vanishes into the canvas. It is wrong in both themes for opposite reasons, which is the tell that the format, not the artwork, is the problem.

**Where the twelve new hero objects go.** Not into a carousel. Use **six**, one per section, at **88 to 112px**, sitting beside the section heading rather than inside a card, in this order against the seven-section spine above: search bot with the listing card (hero, largest, about 160px), map pin with the stay card (section 2), growth chart with naira coins (section 3, the move-in truth), calendar with a clock (section 4), shield with a house and a tick (section 5), villa with a location pin (section 6). The remaining six belong on `/search` empty states, `/saved` empty, `/welcome`, the agent pitch and the two confirmation surfaces Agent 2 owns. **At 390px six stacked objects is not a long scroll if each one is a section marker rather than a card**: it costs about 110px per section, not a screen. The failure mode to avoid is giving each object its own container, which is what StoryRail does now and what makes it 8 screens. Copy: one three-to-five word overline, one sentence, one link. Art direction is Agent 3's.

**The hero at 390px in both themes.** Dark ground samples `rgb(0,11,70)` to `rgb(10,24,108)`, so the ground does have real dimension. Light samples `rgb(248,249,251)`, a flat neutral canvas: **I initially read the light hero as a blue-tinted grey from a screenshot and measuring proved me wrong, so I am not reporting that.** The structural problem is the same in both: three stacked slogan lines, a paragraph, one button that goes to sign-up, five city chips that wrap with Ibadan orphaned on its own row, and then four generic tiles. **A visitor in four seconds learns that there is a company called Vallo with a nice logo and a slogan. They do not learn that there are properties, what one costs, or where.** That is the wrong four seconds for a marketplace. Replace the tile grid with six real cards and the four seconds become "there are flats in Lagos, this is what they cost, and the total is printed".

**Where "Real Estate reimagined!" lives, and how to use it, not paste it.** Do not make it the H1. A slogan as a headline is what the old one did and it is why the page currently opens by saying nothing. Craft it as follows:

- **The H1 becomes the offer**, in the product's own voice: **"Rent, buy or sell. The move-in total, printed."** Under it: "Every place on Vallo was listed by a real person on Vallo, with the light, the water and the gate answered." That is the four seconds.
- **"Real Estate reimagined!"** becomes the **wordmark's companion**: set beside or under the logo in the site header and the auth shell, at roughly 12 to 13px, letter-spaced, in muted ink, sentence-cased as **"Real estate, reimagined."** I would drop the exclamation mark in-product. An exclamation mark reads as enthusiasm, and this brand's whole argument is quiet confidence; keep the founder's exclamation for the deck and the store listing, where a slogan is allowed to shout.
- It replaces the dead slogan in the **metadata title** (`Vallo. Real estate, reimagined.`), the **OpenGraph title**, the **footer tagline** and the **email `SIGN_OFF`**. For the sign-off I would use it: an email ends with the brand making one claim, and that is the one.
- It does **not** go on the About page H1, where the headline should say what the company is, and it does **not** become the three HowItWorks step titles, which should be verbs.
- **Full inventory of the dead slogan, ten places:** `packages/i18n/src/locales/en.ts:250-252` (hero lines, reused as the HowItWorks step titles), `en.ts:327` (footer tagline), `apps/web/src/app/layout.tsx:50` (metadata title default), `layout.tsx:68` (OpenGraph title), `apps/web/src/app/(site)/about/page.tsx:61` (About H1), `apps/web/src/components/site/landing/SignatureShowcase.tsx:25`, `apps/web/src/lib/email/theme.ts:151` (`SIGN_OFF`), `apps/web/src/app/(auth)/layout.tsx:44-47` (under the logo on all six auth screens), plus translated equivalents in `yo.ts:185-187`, `ha.ts:186-188` and `ig.ts:187-189`.

**The trust strip, numbers band and social proof: yes, one of them lies.** `PlatformConsole` publishes **"17+ Verified listings"** as a hardcoded literal, under a heading reading "The same real numbers behind every booking, wallet and message on Vallo", with a hardcoded rising line chart behind it. Zero listings are verified, zero bookings exist, and the verified column is refused by a check constraint on demo rows. It also publishes "36 + FCT / States reached" when the catalogue is in five cities. By contrast `VoicesBand` on the same page reads real rows and **renders nothing** when there are none, with a comment explaining that inventing testimonials "is not exaggerating about itself, it is lying about other people". **The same page holds the strictest and the laxest honesty standards in the product.** Delete `PlatformConsole`.

**Performance.** Measured on `/` at 390px: **59 elements with a live `backdrop-filter`**, 42 of them plain `nf-card`; **68 elements with a running CSS animation**; 1,134 DOM nodes; **60 `<img>` elements**, all BrandIcon PNGs. The icon directory is **6.5MB across 87 files**, average 74KB, and **every one is 8-bit RGB with no alpha**, so the white ground is baked in. `/safety` has 30 glass surfaces, 29 of them content cards on a long-form reading page; `/help` has 26, 22 of them cards. `.nf-card` is itself a glass component, which is the mechanism. Six distinct corner radii and seven distinct box-shadows on the landing page alone. **[GLASS/BUTTONS]**

---

#### 6. The findings

Seven fields each. Ids are stable. Grouped by surface. Where an item is already in the thirty I name it rather than renumber.

##### Landing page

**F1-001 · `components/site/landing/PlatformConsole.tsx`, `TILES` and `PULSE`**
Wrong: publishes `"17+" / "Verified listings"` and `"36 + FCT" / "States reached"` as hardcoded literals under a heading that says "The same real numbers", with a hardcoded rising sparkline behind them. Zero listings are verified (enforced by check constraint) and the catalogue is in five cities. The component's own header comment claims "nothing here is a metric on its own" and "what is asserted stays exactly what is true"; all of it is false. Do: delete the component and its call site. If a metrics panel is wanted later, read every figure from the database the way `NumbersBand` already does. Why: a fabricated verification count on the front page is a misleading commercial claim, and it is the one thing that cannot be walked back once a regulator or a journalist screenshots it. Impact: very high, trust and legal. Effort: S. Risk: low. **Priority: Critical.**

**F1-002 · `lib/site/gated-href.ts`, and 31 of 77 links on `app/page.tsx`**
Wrong: `gatedHref` rewrites every marketing link to `/sign-up?next=...` unconditionally. The hero CTA, all five city chips, all five category tiles, all six moods, all six destinations and seven of eight StoryRail panels go to sign-up. `PRODUCT.md` section 4 says `search`, `listing`, `rent`, `around` and `u` are open to anybody, and the middleware agrees. Do: make `gatedHref` a no-op for public routes and keep it only for `/assistant`, `/wallet`, `/bookings` and `/home`. Why: there is no path from the landing page to a single property without creating an account, on a marketplace whose funnel depends on browsing. Impact: very high, conversion. Effort: S. Risk: low, the middleware is the real lock. **Priority: Critical.** This is `A1-003` in the thirty; the number 31 and the link list are new evidence for it.

**F1-003 · `app/page.tsx`, section count and height**
Wrong: eighteen bands, 10,862px at 390px, about thirteen phone screens. Do: cut to the seven-section spine in section 5. Why: a landing page that says everything says nothing, and the target user is on a metered Nigerian data bundle. Impact: high. Effort: M. Risk: medium, the founder previously asked for six sections to be restored, so this needs his word section by section. **Priority: High. [WIDEN]** the survivors: fewer bands is what pays for generous section padding.

**F1-004 · `components/site/landing/HowItWorks.tsx`**
Wrong: three columns at every width, so at 390px each column is about 100px and the body copy renders one or two words per line ("Rent, / buy, / shortlet, / land / and / commercial, / in one / search."). The component's own comment claims "the copy is cut to fit"; it is not, and a screenshot in both themes shows the ribbon. Do: stack to one column below `sm`. Why: it is the ugliest element on the page and it is in the first three screens. Impact: high. Effort: S. Risk: none. **Priority: High. [WIDEN]**

**F1-005 · `components/site/landing/HowItWorks.tsx`, step 2 body**
Wrong: "Naira totals in full, **paid safely, before anything is confirmed**." That describes money held before confirmation, which is escrow, and escrow does not exist. It also describes a rent payment path that `A1-001` says is not built. Do: rewrite to "Message the agent, inspect the property, then pay. The move-in total in full, before you commit." Why: the closest thing in the product to an escrow promise, and rule 8 is absolute. Impact: high. Effort: S. Risk: none. **Priority: High.**

**F1-006 · `packages/i18n/src/locales/en.ts:293`, trust strip `stores`**
Wrong: renders **"Coming to / App Store and Play Store"**. "Coming to" is "coming soon" in other words, and "coming soon" is a banned string enforced by five specs. The source comment defends the copy as "Available on", which is not what ships. Do: remove the row until there is a store listing to link to. Why: a banned-family string on the highest-traffic page, and the ban exists for a reason. Impact: medium. Effort: S. Risk: none, the row was removed once before. **Priority: High.**

**F1-007 · `packages/i18n/src/locales/en.ts:292`, `africa`**
Wrong: **"Made for Africa / Built with love ❤️"**. An emoji in product copy, a red mark on a page whose only red is the error token, and the most generic line in software. Do: replace with "Made for Nigeria first / English, Yoruba, Hausa and Igbo, and the questions asked here." Why: it is the single line most responsible for the page reading as a template. Impact: medium. Effort: S. Risk: none. **Priority: High.**

**F1-008 · `packages/i18n/src/locales/en.ts:283-287`, `landing.features`**
Wrong: "AI Assistant / Smart help, 24/7", "**Verified Listings** / Trusted and secure", "**Best Prices** / Save more", "Easy Booking / Fast and simple". Zero listings are verified; the product has no price comparison, so "Best Prices" is unsupportable; all four are content-free. Do: delete the band and give the space to six real listing cards. Why: it is the first thing below the fold and it is four claims, two of them false. Impact: high. Effort: S to delete, M to replace. Risk: low. **Priority: High.**

**F1-009 · `components/site/landing/MoodRow.tsx`**
Wrong: six cards linking to free-text searches for "beach weekend", "city lights", "detty december", "romantic escape", "family time" and "foodie tour". I ran the haystack pattern against all 64 rows: **zero matches**. Six guaranteed dead ends on the landing page, against owner rule 22. Two of the six share the same `gift` icon. "Find your vibe" is also tonally wrong for a product that wants to read like a premium financial product. Do: delete. Why: six links that cannot work. Impact: medium. Effort: S. Risk: none. **Priority: High.**

**F1-010 · `components/site/landing/PopularDestinations.tsx`**
Wrong: offers six cities including **Calabar, which has zero listings**, and Enugu, which has one. The lede says "Six cities to start with. Search reaches every state", while the hero chips above list five. Do: render cities from the catalogue with live counts, or delete in favour of the hero chips. Why: two of six destinations lead to an empty or near-empty shelf, and the page states two different city counts. Impact: medium. Effort: S. Risk: low. **Priority: Medium.**

**F1-011 · `app/page.tsx`, `categories` array**
Wrong: offers an **"Experiences"** tile pointing at `/search?type=experience`. `property_type` has no `experience` value, so the tile can never return a row. `FilterDrawer` already excludes it correctly. There is also **no Buy or For sale tile**, although 12 of 64 listings are for sale. Do: drop Experiences, add For sale pointing at `/search?intent=sale`. Why: a permanently empty category on the front page and no door to a whole market. Impact: medium. Effort: S. Risk: none. **Priority: High.**

**F1-012 · `app/page.tsx:452-462`, the FAQ**
Wrong: twelve items, hardcoded in English inside a component whose page is otherwise fully localised, so Yoruba, Hausa and Igbo visitors get an English block. Content problems: "**All 36 states and the FCT from day one**" is false (five cities); "our support team is one message away" describes a team that does not exist; "**How do payments work before launch?**" admits the product is not launched, on the landing page, and contradicts "Is my payment safe? Yes"; "Is there a booking **fee**? No, there are no booking fees **right now**" weakens the permanent no-fee position stated on `/help` and `/standards`; "How do I contact a **host**?" uses a banned term and says messaging is only available "once your booking is confirmed", which is the opposite of the product rule that rent is message, inspect, then pay; "encrypted in transit and **at rest**" is contradicted by the open defect `A2-024` (bank account numbers stored in plain text). Do: cut to five items, move them into the locale files, and rewrite. My replacements: "Can I look without an account? Yes. Browse the whole catalogue, open any listing, see every price. You need an account to save, message or pay." / "What does it cost to use Vallo? Nothing. Vallo charges you nothing to browse, to message, to list or to be paid. Anybody presenting an inspection fee, an agency fee or a holding fee as ours is lying, and you should report them." / "How do I rent a place? Message the agent, inspect the property, then pay. There is no reserve button on a tenancy, on purpose." / "What does the verified tick mean? A person here checked the agent behind the listing before the tick appeared. It is not automatic and it is never for sale." / "Which languages? English, Yoruba, Hausa and Igbo, switchable from the top bar." Why: five false or self-contradicting statements on the front page. Impact: high, trust. Effort: M. Risk: low. **Priority: High.**

**F1-013 · `apps/web/public/brand/icons/naira-hand.png`**
Wrong: the asset is a **US dollar coin** on a hand. It is used on the landing page next to "Priced in naira" (`app/page.tsx:50`) and in `WhyVallo` next to "Honest naira pricing", and again in the agent earnings screen and checkout. Do: re-render as a naira sign, or swap to the naira coins object from the new glass sheet `8DBE517E`. Why: a Nigeria-first naira product showing a dollar on the exact card that promises naira pricing. It is the most embarrassing single pixel in the product. Impact: medium but highly visible. Effort: S. Risk: none. **Priority: High.**

**F1-014 · `design-system/icons/TrustIcon.tsx:196-200`**
Wrong: the Africa mark's gradient ends in `token.stateSuccess`, so the landing trust strip paints a continent in the **emerald success token**. Do: use a depth of blue. Why: this is the exact scar-tissue rule from `HANDOFF_02` section 13. Change emerald and the landing page restyles. Impact: low visually, high systemically. Effort: S. Risk: none. **Priority: Medium.**

**F1-015 · `eslint.config.mjs:178-201` and `app/page.tsx`**
Wrong: `src/app/page.tsx` is explicitly **exempted** from `nf/no-raw-spacing` with a comment saying the restored page "carries 87 raw steps again". I counted 72 spacing utilities across **42 distinct steps** in that one file. The landing components themselves fail lint with **52 errors** (51 raw spacing, 1 layer-1 colour token leak in `SignatureShowcase.tsx:274`). Do: migrate the page onto the role and rung scale and remove the exemption. **I am not proposing to disable anything; I am proposing to delete an existing exemption.** Why: the single highest-value surface is the one file the spacing scale does not reach, which is why it reads choked in places and loose in others. Impact: high. Effort: M. Risk: medium, the visual will shift and the founder asked for this page to be restored exactly. **Priority: High. [WIDEN]** This is the mechanical prerequisite for widening every layer on the landing page.

**F1-016 · `components/site/landing/ProductFrame.tsx`**
Wrong: imported by nothing. Dead code counted as one of the thirteen landing components. Do: delete. Why: a dead file in the most-read directory misleads the next reader. Impact: low. Effort: S. Risk: none. **Priority: Nice-to-have.**

**F1-017 · `components/site/landing/StoryRail.tsx`**
Wrong: eight panels behind a horizontal swipe, thirteen raw-spacing lint errors, seven of eight links gated to `/sign-up`, the final panel's action "Browse rentals" points at `/rent` which crashes (F1-020), and the panel card is a pale slab in dark and near-invisible in light. Panel 8 is "The rent market" in a rent-first product. Do: replace with the six section-marker objects in section 5. Why: the longest section on the page and the one with the lowest completion. Impact: high. Effort: L. Risk: medium. **Priority: High.**

**F1-018 · `components/site/landing/AgentsBand.tsx`**
Wrong: the bullet reads "Free to list, with **no upfront fees**", which implies there are fees later. Rule 7 says the platform charges nothing. The third bullet uses an **arrow glyph** as its icon, which reads as a link affordance on a non-link. Do: "Listing is free, and it stays free." Change the third glyph to a bank or card mark. Why: the fee framing undercuts the strongest thing we can say to a supplier. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-019 · `components/site/landing/WhyVallo.tsx`**
Wrong: the header comment says the bodies "are one line now, written to the column rather than crammed into it". At 390px in both themes every title wraps to two lines and every body to three or four in a roughly 150px column. Do: two cells per row at 390px with the object inline before the title, or one column. Why: the file documents a fix that did not happen, which is how the next reader gets misled. Impact: low. Effort: S. Risk: none. **Priority: Medium. [WIDEN]**

##### Metadata, sharing and the PWA

**F1-020 · `components/app/SceneBanner.tsx:27,45` and `app/(app)/rent/page.tsx:79`**
Wrong: `SceneBanner` types `art: string` and passes it straight to `next/image` as `src`. `/rent` calls it with `art="shield-home"`, a `BrandIcon` name, not a path. `next/image` throws `Failed to parse src "shield-home"` and **the entire `/rent` page renders the error boundary**. Confirmed in the dev log and in a 390px screenshot showing "That screen did not load". The route still answers HTTP 200, so no status monitor would catch it. `/rent` is linked from the landing category grid, the footer, the StoryRail and the sitemap, and `PRODUCT.md` names it as the page that carries the standing safety rule. Do: type the prop `BrandIconName` and render `<BrandIcon>`, as `StoryRail` already does correctly. Why: the primary market's own page is down. Impact: very high. Effort: S. Risk: none. **Priority: Critical.**

**F1-021 · `apps/web/public/manifest.webmanifest` versus `app/manifest.ts`**
Wrong: a static file and a typed route claim the same path. Next refuses both: `⨯ A conflicting public file and page file was found for path /manifest.webmanifest`, and the URL returns **500**. `layout.tsx:93` links to it. So the PWA does not install, there is no splash, no home-screen icon and no shortcuts, on a product whose stated audience is mid-range Android. The stale public file also points at `../icons/icon-*.webp`, which do not exist, and labels them `image/png`. Do: delete `apps/web/public/manifest.webmanifest`. Why: the whole installable-app story is dead and nothing surfaces it. Impact: high. Effort: S. Risk: none. **Priority: High.**

**F1-022 · `app/layout.tsx`, `metadata.openGraph`**
Wrong: **no `openGraph.images` and no `twitter` block anywhere in the tree.** Every share of Vallo on WhatsApp, X or iMessage renders a bare text card with no picture, in a market where WhatsApp is the distribution channel. A finished logo exists at `/brand/vallo-logo.png` and nothing points at it. Do: add a 1200x630 OG image and a `summary_large_image` Twitter card. Why: the cheapest acquisition win available, and the one the founder's own logo already pays for. Impact: high. Effort: S. Risk: none. **Priority: High.**

**F1-023 · `app/layout.tsx:53-56` and `:72-73`**
Wrong: the meta description is "Discover and book homes, hotels, restaurants and experiences across Nigeria. **Verified listings**, **secure payments**..." Neither is true; zero listings are verified and the landing FAQ says card payments switch on at launch. This string is what Google prints under every Vallo result. `keywords` lists shortlet, hotels, restaurants, experiences and booking, and **contains no rent, buy, property, house or land**. The OG description says "all-in-one platform for homes, hotels, restaurants, experiences". Do: rewrite both around rent, buy and the move-in total. Why: the SERP snippet advertises the dead NaijaFinds product and makes two false claims. Impact: high. Effort: S. Risk: none. **Priority: High.**

**F1-024 · `app/layout.tsx:50,68`; `lib/email/theme.ts:151`; `(auth)/layout.tsx:44`; `(site)/about/page.tsx:61`; `SignatureShowcase.tsx:25`; `en/yo/ha/ig` locales**
Wrong: the retired slogan ships in ten places, including the browser tab, every share card, every email sign-off, the About H1, all six auth screens and the three HowItWorks step titles. Do: replace per the crafted plan in section 5. Why: the product's most-repeated string is the one that was retired. Impact: high. Effort: M, because four locales and HowItWorks need new copy rather than a find-and-replace. Risk: low. **Priority: High.**

**F1-025 · `app/sitemap.ts`**
Wrong: fourteen URLs, none of them a listing, an area or a post. This is **correct** under `syndication.ts` because all 64 listings are `is_demo`, and `syndication.ts` is the best-argued file I read. But the consequence is worth stating plainly: **the entire catalogue is invisible to search and unshareable**, and nothing fills the gap. The 9 real `areas` and 66 real `posts` are not demo and get no coverage either. Do: keep the listing gate exactly as it is; add area and Around place pages to the sitemap, which are real first-party content. Why: organic search is the primary acquisition channel for property, and today it has fourteen doors. Impact: high, strategic. Effort: M. Risk: low. **Priority: Medium.**

**F1-026 · `app/layout.tsx:48`**
Wrong: `metadataBase` falls back to `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` is unset. A misconfigured deploy emits localhost canonical and OG URLs. Do: fall back to `VERCEL_PROJECT_PRODUCTION_URL` before localhost. Why: silent and total SEO failure on one missing variable. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

##### The property card

**F1-030 · `components/app/ListingCard.tsx`, and `listing-card-model.ts`**
Wrong: the card leads with `priceMinor`, the rent, and **never renders `moveInCostMinor` at all**. `grep` for `moveIn` in both files returns nothing; the only consumer in the whole app is `ListingMoveIn.tsx` on the detail page. `PRODUCT.md` section 5 states the product rule: "The card leads with the total move-in cost and the rent is the secondary line... Leading with the truth is the differentiator and it costs nothing to build." `WhyVallo` and the mission copy both advertise it. Do: when `moveInCostMinor` is present, print it as the hero figure with the label "to move in", and set the rent beneath it at secondary weight with its period. When it is absent (24 of 64 rows, the shortlets, hotels, restaurants and all sale listings) keep today's behaviour. Why: this is the product's single differentiating idea, it is advertised on the marketing page, and the surface where the comparison actually happens does not show it. Impact: very high. Effort: M. Risk: low. **Priority: High.** Data note for the founder, not a UI defect: every seeded move-in total is exactly 1.45x or 1.5x the rent, so the figures on screen would be synthetic until real agents fill them.

**F1-031 · `components/app/ListingCard.tsx`, `period`, and `lib/listings/pricing.ts` `PERIOD_SUFFIX_SHORT.sale`**
Wrong: `PERIOD_SUFFIX_SHORT.sale` is the empty string, so a sale listing's card prints a bare figure with no suffix while a rental prints "/yr". In my two-up reconstruction, "₦520m" and "₦2.8m/yr" sat side by side with **nothing telling the reader one is a purchase**. The kind noun in the facts row says "Villa", not "For sale". The only other place the card says it is a sale is inside the title, which `line-clamp-2` truncates: "Five bedroom villa for sale i…" and "Four bedroom detached…". Do: render a market label in the facts row driven by `listing.intent`, "For sale" or "To rent", first in the fixed order. The detail page already does this correctly via `MARKET_PILL` and `PERIOD_SUFFIX.sale`, so the card is the outlier. Why: 12 of 64 listings, and rule 13 says rent against sale must be distinguishable by label, not colour. There is currently no signal of any kind. Impact: very high. Effort: S. Risk: none. **Priority: High.**

**F1-032 · `components/app/ListingCard.tsx`, no save control**
Wrong: the card renders `IntentTune` in the top right for signed-in users and **no save heart at all**. The heart exists in exactly three files: `ListingActions.tsx` (detail page), `MapDock.tsx` (the map's card) and `SavedBoard.tsx` (removing). So the same listing is savable in Map view and not savable in List view. The `/saved` empty state reads "**Tap the heart on any place** and it waits for you here", instructing an action the grid does not offer. Do: put the save control on the card, top right, and move or merge `IntentTune`. Why: saving is the lowest step of the funnel and it currently costs a page load per item on a comparison product. Impact: very high, conversion. Effort: M. Risk: low. **Priority: High.** Related to `A1-007` in the thirty, which covers signed-out saving; this is the control's absence, which is separate.

**F1-033 · `components/app/MediaFrame.tsx`, `MediaSkyline`, the sun disc**
Wrong: the disc is drawn at `cx = 60 + (|hue| % 5) * 62`, `cy = 58`, `r = 24` in a 400x300 viewBox with `preserveAspectRatio="none"`, while the badge sits at `left-3 top-3`. When `hue % 5 === 0` the disc lands directly behind the badge. In my reconstruction, **one card in five had a grey circle punched through the word "Example", and one through the "V" of "Verified"**, in both themes. Do: move the disc's x range so it cannot start before about 45 per cent of the width, or move the badge to the top right. Why: it damages the product's single most important trust mark. Nothing but a render catches it. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-034 · `components/app/ListingCard.tsx`, the `Example` badge, in light**
Wrong: `.nf-badge--example` is `background: var(--nf-state-warning-surface)`, which is `color-mix(#0E6E8C 12%, transparent)`. Because the badge sits **on the media**, not on the card, that 12 per cent composites against a pale sky (`--nf-media-ground-from: #dfe4ec`) and the chip does not separate from what is behind it. In the light reconstruction the one disclosure the card carries is the least distinct element on it. Do: give it an opaque surface and a hairline in light. Why: the honesty label must be the most legible thing on an example card, and it is currently the least, in the designed twin. Impact: medium. Effort: S. Risk: none. **Priority: Medium.** Credit where due: the tone is **cyan, not orange**, in both themes. Rule 9 is honoured.

**F1-035 · `components/app/ListingCard.tsx` versus `components/app/listing/ExampleNotice.tsx`**
Wrong: `ExampleNotice`'s header argues at length that the disclosure must **not** be a badge on the photograph, because "a small filled pill on a property card is the visual grammar of Featured, Superhost, Instant book" and "drawing a warning in the costume of a promotion is worse than drawing nothing". `ListingCard` then renders exactly that, and argues the reverse in its own comment. `ExampleNotice` still claims "It has to appear on the card and on the page"; the card does not import it. Do: settle it once and correct the loser's comment. My view: the card's decision is right for a two-up grid, so `ExampleNotice`'s contract is the stale one. Why: two files in the tree give opposite instructions on a disclosure. Impact: low. Effort: S. Risk: none. **Priority: Nice-to-have.**

**F1-036 · `components/app/ListingCard.tsx`, the location line**
Wrong: `<span className="truncate">{where}</span>`. In the two-up grid at 390px I saw "**Chevron Drive, Lag…**" and "**Oniru Victoria Islan…**", both losing the part that carries the price signal in Lagos. Location is one of the card's three declared PRIMARY elements. Rule 16 is absolute. Do: allow two lines, or drop the city when the area is unambiguous, or reduce the type by one step. Do not truncate. Impact: medium. Effort: S. Risk: low. **Priority: Medium.**

**F1-037 · `components/app/ListingCard.tsx`, the power line**
Wrong: `<span className="truncate">{power}</span>` renders "**Band A, gene…**" and "**Patchy light, …**". `cardUtility` composes the band and the backup into one phrase precisely because "Band A alone leaves open what happens during an outage", and the CSS then cuts the backup off. The card's own comment calls this "the one Nigerian field that earns space in a grid". Do: wrap to two lines. Why: the truncation removes the half of the answer the card exists to give. Impact: medium. Effort: S. Risk: low. **Priority: Medium.**

**F1-038 · `components/app/ListingCard.tsx`, the power chip surface, in light**
Wrong: the chip uses `bg-[var(--nf-surface-secondary)]`, and in the light theme `--nf-surface-secondary` is `#FFFFFF`, identical to `--nf-surface-primary` and `--nf-surface-elevated`. On a white card the chip has no background. Do: use `--nf-surface-inset` (`#EFF1F4`), which exists for exactly this. Why: a component that relies on a surface step to exist disappears in the designed twin. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-039 · `packages/design-tokens/src/tokens.css`, light block**
Wrong: three of six surface tokens collapse to pure `#FFFFFF` in light (`primary`, `secondary`, `elevated`), and `--nf-brand-primary` and `--nf-brand-secondary` are both `#0C2FE8`. So any two-step depth or two-tone blue hierarchy that reads in dark has none in light. Do: give `secondary` and `elevated` real light values, and give `brand-secondary` a distinct lighter step. Why: the light theme is a designed twin, and today it is a flattened one. Impact: medium, systemic. Effort: M. Risk: medium, it restyles everything. **Priority: Medium.** Credit: the rest of that block is careful work with measured contrast ratios written into the comments.

**F1-040 · `components/app/ListingCard.tsx`, `h3` and grid height**
Wrong: `line-clamp-2` is unconditional, so a title clips even when the card has spare height; and cards in a row do not equalise, so paired bottoms are ragged in a two-up grid (visible in my reconstruction, row 2). Do: allow three lines at 390px and make the grid rows equal height. Why: twenty ragged cards is the specific thing that makes a grid read cheap. Impact: medium. Effort: S. Risk: low. **Priority: Medium.**

**F1-041 · `components/app/ListingCard.tsx`, the media scrim**
Wrong: the scrim is `h-24`, a fixed 96px. In a two-up 390px grid the media box is about 146px tall, so **a third of every card's picture is a black gradient**, permanently, including when there is no photograph to make legible. Do: scale the scrim with the media box, and drop it entirely when `MediaFrame` is drawing rather than photographing. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-042 · `components/app/MediaFrame.tsx`, at two-up 390px**
Wrong: the nine drawn scenes carry detail sized for a 400x300 viewBox and render at roughly 146px tall in the grid, where a block of flats, a terrace and a shop frontage are indistinguishable. The file's claim that "a grid of twenty cards has twenty different pictures" does not survive the real size. Do: adopt the no-photo card shape in section 5, which turns the frame into an information band with the scene as a quiet ghost. Why: today every card in the product is this, for all 64 listings. Impact: very high. Effort: M. Risk: medium, it changes the card's proportions. **Priority: High.**

**F1-043 · `components/app/ListingCard.tsx`, the power icon**
Wrong: the power line is prefixed with `<UiIcon name="sparkle">` in brand blue. A sparkle does not mean electricity, and brand blue in a secondary row pulls the eye to the least important element. Do: use a bolt or plug glyph in `--nf-content-muted`. Impact: low. Effort: S. Risk: none. **Priority: Nice-to-have.**

##### Discovery, search and filters

**F1-050 · `app/(app)/listing/[id]/page.tsx:144-162`, `MARKET_PILL`, and `:302` `isBookable`**
Wrong: `MARKET_PILL` is keyed by `ListingKind` and **cannot express "For sale"**. `const market = MARKET_PILL[listing.kind]` ignores `listing.intent`. From the database: the 1 villa, 6 homes and 2 apartments for sale are labelled **"For stays"** in the **emerald success tone**, and the 3 land listings, all for sale, are labelled **"For rent"** with a key glyph. All twelve sale listings are mislabelled on their own page, directly above a price captioned "asking price". This is live today. Separately, `isBookable = !isRental && !isRestaurant && !isSale` is derived from `kind`, and the database says 14 apartments, 10 homes, 2 villas, 3 shops and 3 offices all carry `rent_period = 'year'`. So **32 yearly tenancies would fall through to `ReservePanel`**, a nightly reserve-and-pay flow, against owner rule 11 ("No Reserve button on a rental, ever") and against `A1-001` which says the rent money path does not exist. **Today this is masked**: the `isExample` branch catches all 64 rows first, so nobody sees a Reserve button yet. It fires the day the first real yearly tenancy is published. Also: `tone: "success"` uses the emerald state token as a market colour for five of ten property types, which is the scar-tissue rule again. Do: drive the pill from `intent` plus `rate_period`, not `kind`; derive `isBookable` from `pricePeriod === 'night' || 'guest'`; give the market pill a brand tint, not a state token. Why: twelve listings are mislabelled now, and a nightly payment flow over an annual rent is waiting behind one flag. Impact: very high. Effort: M. Risk: medium, it touches the panel branch. **Priority: Critical** on the latent reserve path, **High** on the live mislabelling. This is the concrete shape of `P-7`.

**F1-051 · `app/(app)/listing/[id]/page.tsx`, the example booking panel**
Wrong: every one of the 64 listing pages shows "Nothing here can be booked or paid for. Search for a real place with an owner you can reach" with a button reading **"Browse real listings"** pointing at `/search`, which contains only the same 64 examples. Do: change the copy to "The catalogue is filling. Tell us what you are looking for" with a saved-search capture, or point at the agent pitch. Also "owner" is outside the lexicon; the word is agent. Why: a dead end on every listing page in the product, today. Impact: high. Effort: S. Risk: none. **Priority: High.**

**F1-052 · `components/app/search/CategoryRail.tsx:137`**
Wrong: `<BrandIcon name={icon} size={40} />` in a navigation rail of nine chips at the top of the discovery surface. `ICON_SYSTEM.md` is explicit: `UiIcon` is "used for ALL navigation (rails, tab bar, headers, chips)" and is "never replaced by the 3D pack: navigation must stay flat and fast". Nine opaque 384x384 PNGs load before the first result. In dark they render as nine white squares (see F1-056). Do: move the rail to `UiIcon`. Why: a binding tier rule, and it is nine image requests on the page whose job is to show properties. Impact: medium. Effort: M, nine glyphs may need drawing. Risk: low. **Priority: High.**

**F1-053 · `/search` and `/welcome` empty states**
Wrong: in both 390px dark screenshots the empty state's text and icon render **underneath the floating tab bar** and are partly unreadable. On `/search` the sentence "…minute, and there is nothing to wait for on your side" is half-covered. The state is vertically centred in the viewport with no allowance for the tab bar plus safe area. Two occurrences means it is systemic, not a one-off. Do: give the empty-state container bottom padding equal to the tab bar height plus `env(safe-area-inset-bottom)`. Why: the empty state is what every visitor sees today, and it is the state the brief says must be designed. Impact: high. Effort: S. Risk: none. **Priority: High.**

**F1-054 · `/search` header row**
Wrong: at 390px the search field, a 48px search button and a 48px filter button share one row, leaving the input about 200px, and the placeholder truncates to "**Search places, ho…**". The search button is redundant with the input's own submit. Do: drop the search button, give the field the row with the filter control beside it. Why: rule 16, and the field is the point of the page. Impact: medium. Effort: S. Risk: none. **Priority: Medium. [WIDEN]**

**F1-055 · `/search` heading and sort**
Wrong: the heading reads "**0 stays across Nigeria**" over a catalogue that is majority yearly tenancies, plus land, shops and offices. "Stays" is the wrong noun for the whole shelf. The sort offers "**Top rated**" when `reviews` holds zero rows and no review path exists for a tenancy (`A1-002`). The `FilterDrawer` price noun defaults to "per night" for any unnamed category. Do: "64 places across Nigeria", or count by market. Remove "Top rated" until reviews exist. Default the price framing to per year. Why: the discovery surface describes a stays product. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-056 · `design-system/icons/BrandIcon.tsx` and `app/css/glass.css:462-495`**
Wrong: **all 87 brand PNGs are 8-bit RGB with no alpha**, verified with `file`. `glass.css` explains the consequence in its own words: "multiply against the night canvas returns the night canvas, so an object with nothing light behind it disappears entirely in the default theme", so `--nf-icon-ground` "resolves to a soft near-white at night". **The dark theme is therefore forced to paint a near-white plate behind every brand object**, which is why the landing feature tiles, the WhyVallo cells, the search category rail and every empty state render as white squares on navy. A 3x crop of the About page value card shows it unambiguously. This cannot be fixed in CSS. Do: the glass replacement the lead is already slicing, cut with a real alpha channel. Why: this single asset property is the root cause of the largest visual problem in the product's default theme, and it is the strongest technical argument for the ten new sheets. Impact: very high. Effort: L, but it is already the lead's work. Risk: medium. **Priority: High.** I am not proposing the treatment; that is Agent 3 and the lead.

**F1-057 · Category taxonomy across three surfaces**
Wrong: `/welcome` offers **three** types (Rent, Buy, Shortlets), the landing offers **five** (Hotels, Apartments, Homes, Rent, Experiences), `/search` offers **nine**. Only `/welcome` offers Buy; only the landing offers Experiences, which cannot exist. Do: one taxonomy, derived from `property_type` plus `intent`, rendered in three densities. Why: three answers to "what can I look for here" is an information architecture that has never been settled, and it is visible to any visitor who taps twice. Impact: high. Effort: M. Risk: low. **Priority: High.**

**F1-058 · `/rent` versus `/search` under the same missing dependency**
Wrong: with no database, `/search` degrades to a designed empty shelf and `/rent` throws. The root cause of the throw is F1-020, not the data, but it exposes that the two discovery surfaces have different failure postures. Do: after fixing F1-020, verify both degrade identically. Impact: low. Effort: S. Risk: none. **Priority: Nice-to-have.**

**F1-059 · `app/(app)/listing/[id]/page.tsx:608-615`, the trust marks**
Wrong: `inspectedAt` and `addressVerifiedAt` are rendered as tick-marked word labels, "Inspected by Vallo" and "Address checked", with **no date**. `PRODUCT.md` section 6.2 is explicit: "Render them as dates. 'Inspected 12 July 2026' is a fact a reader can weigh; a tick is a promise the platform has to keep." Also all five marks, including "Price negotiable", paint in `--nf-status-verified`, so a commercial fact wears the trust colour. Currently moot (zero listings carry either timestamp) and therefore certain to surface exactly when real inspections begin. Do: render the date; move "Price negotiable" and "Instant Book" out of the trust colour. Impact: high when it fires. Effort: S. Risk: none. **Priority: High.**

**F1-060 · `app/(app)/listing/[id]/page.tsx`, section order**
Wrong: "Moving in", the move-in total, is section 4, below the fold on a phone, under the rent, the amenities and the pill. `PRODUCT.md` calls it "the number people shop on". There are also **two photo sections** (`ListingGallery` at the top and `ListingPhotoGrid` at section 9), both currently rendering the same drawn fallback. The file is 1,037 lines. Do: move the move-in total directly under the price in the lead block; collapse the second photo section into the gallery when the count is low. Impact: high. Effort: M. Risk: low. **Priority: High.** I did not render this page, so this is read from source only.

##### Auth and onboarding

**F1-070 · `components/auth/AuthChoices.tsx:120-122` and `components/auth/EmailAuthForm.tsx:327`**
Wrong: "By continuing you agree to our Terms and Privacy Policy" renders as **plain text with no links**, in both components, on both the sign-in and sign-up screens. There is no `<Link>` anywhere in that paragraph. Do: link Terms to `/terms` and Privacy to `/privacy`. Why: a consent statement that does not link to the documents it binds a person to is not consent, and this is the account creation screen of a company that has an NDPA posture. Impact: high, legal. Effort: S. Risk: none. **Priority: High.**

**F1-071 · `app/(auth)/layout.tsx:44-47`**
Wrong: renders `t.landing.hero.line1/2/3` under the logo, so the retired slogan appears on all six auth screens in all four languages. Do: replace with "Real estate, reimagined." per F1-024. Impact: medium. Effort: S. Risk: none. **Priority: High.**

**F1-072 · `/sign-up` and `/sign-in`, the chooser screen**
Wrong: after the OAuth removal the chooser offers exactly one option, so creating an account costs landing → Sign up → Continue with Email → form: **three screens before the first field**. The back link on the form reads "Other ways to continue" when there are none. Do: make `/sign-up` render the form directly. Why: one unnecessary screen at the top of the funnel. Impact: medium, conversion. Effort: M. Risk: low. **Priority: Medium.**

**F1-073 · `/sign-up/email`, form length and data collected**
Wrong: **2,401px at 390px**, four groups, collecting nickname, country, state, local government, occupation, where you heard about us and a referral code before an account exists. The page promises "Start discovering in under a minute". Do: collect name, email and password; move state, local government and occupation into `/welcome` as optional personalisation. Why: conversion, and NDPA data minimisation argues against collecting occupation to browse flats. Impact: high. Effort: M. Risk: medium, other screens may read those fields. **Priority: High.**

**F1-074 · `/sign-up/email`, the disabled controls**
Wrong: "Country: Nigeria / The only one, for now" and "Local government: Choose a state first" are styled identically to enabled inputs: same border, same chevron, same height, only slightly dimmer text. **A disabled control that does not read as disabled**, which is the exact question the brief asks. "for now" is also coming-soon language. Do: give disabled form controls the same unambiguous treatment `.nf-btn:disabled` already has. Credit: the button disabled recipe is a single `opacity: 0.38` rule replacing seven values, and it works. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-075 · `/sign-up/email` and `/contact`, placeholders**
Wrong: the name fields use plausible real names as placeholders, "Ada", "Okafor", "Amaka Obi". People read these as pre-filled values, and the guidance vanishes on focus. Do: use a hint line under the label. Impact: low. Effort: S. Risk: none. **Priority: Nice-to-have.**

**F1-076 · `/sign-up/email`, the step counters**
Wrong: "1 OF 4" through "4 OF 4" appear beside group headings on a **single scrolling page**, implying a wizard that never advances. Do: either make it a real four-step wizard or drop the counters. Impact: low. Effort: S. Risk: none. **Priority: Nice-to-have.**

**F1-077 · `/profile/setup`, and `/agents` → `/profile/setup/owner`**
Wrong: the page uses "**realtor**" ("Work as an agent or realtor"), which is outside the lexicon and is a protected term in the US. `/agents`, `/agents/apply` and `/agents/status` all 307 to profile setup, so the "supplier pitch" page `PRODUCT.md` says is open to anybody does not exist, and the landing CTA, the footer link and the FAQ's "Become an Agent page" all land on a page titled "Start listing on Vallo". Do: drop "realtor"; either build the pitch page or rename every entry point to match the destination. Why: the label and the destination disagree at the top of the supply funnel. Impact: medium. Effort: S for the word, M for the page. Risk: low. **Priority: Medium.** Credit: `/profile/setup` is otherwise the best-designed screen I saw, with requirements stated up front and an honest "about two working days".

##### Site pages and public copy

**F1-080 · `app/(site)/about/page.tsx:34`**
Wrong: "Listing is free, and **we earn only when a booking completes**, so our incentives sit exactly where yours do." This states the platform takes a cut. `platform_fee_minor` is always zero, and **three other public pages say the opposite**: `/safety` ("We take nothing from your booking and nothing from an agent's"), `/help` ("nothing is taken out of what a guest pays you"), `/standards` (charging a fee we do not charge is a removable offence). Do: "Listing is free and it stays free. Vallo takes nothing from what you pay and nothing from what an agent is paid." Why: rule 7, and the About page contradicts three other pages of the same site. Impact: high, trust. Effort: S. Risk: none. **Priority: High.**

**F1-081 · `app/(site)/about/page.tsx`, opening paragraph and the "What lives on Vallo" band**
Wrong: the H1 is the dead slogan; the opening line is "a Nigeria-first platform for discovering and booking places to **stay, eat and explore**", which never mentions renting or buying; and the four category cards are **Stays, Hotels, Food, Experiences**, with no Rent and no Buy. `experience` is not a property type. Do: rewrite around rent, buy and sell, with stays and dining as the two supplier categories they actually are. Why: the page that says who the company is describes the dead product. Impact: high. Effort: M. Risk: low. **Priority: High.**

**F1-082 · `app/(site)/about/page.tsx`, "Trust before traffic"**
Wrong: "Every listing is checked and every agent is identity-verified before a single guest sees them." Zero listings carry `verified_by` or `physically_inspected_at`; all 64 are examples. Do: state the process, not the outcome, the way `WhyVallo` already does ("A person here checks the agent before the tick appears"). Impact: high. Effort: S. Risk: none. **Priority: High.** This is the shape of `A1-117`.

**F1-083 · "host" in public copy**
Wrong: `PRODUCT.md` section 7 says the word is **Agent**, not host. "Host" appears in `/cancellations` (four times), `/help` (twice), `/safety` (once), the landing FAQ (twice) and throughout `en.ts`. Do: sweep to "agent", and to "the person who listed it" where agent reads oddly. Why: terminology the document says is enforced, and it is the noun a reader forms their model of the marketplace from. Impact: medium. Effort: M, it is a wide sweep across four locales. Risk: low. **Priority: Medium.**

**F1-084 · `/safety` and `/help`, the "cleaning charge"**
Wrong: both state that the total before confirming is "the nightly rate and the **cleaning charge** the host set". `cleaning_fee_minor` was removed from `listings`, and `supabase-repository.ts` never sets `Listing.cleaningMinor`, so no surface can produce that line. Do: remove the clause. Why: a trust page describing a pricing breakdown the data model cannot render. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-085 · `/contact`, response time promises**
Wrong: "We reply within one business day, Monday to Saturday", a "Replies within 24 hours" chip, and "we answer within 4 hours" on the safety card. There are six profiles, one agent and no support team. The landing FAQ separately says "the AI assistant answers instantly". Do: state one honest promise and hold it. Why: three different SLAs, none staffed. Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-086 · `/contact`, form conventions**
Wrong: labels are ALL CAPS with letter-spacing, while `/sign-up/email` uses sentence case; the topic control is a native `<select>` with the browser chevron, while sign-up uses a custom 56px select; the topic defaults to "A booking" when there are zero bookings and the primary market is rent. Do: one label style and one select component. Why: two form systems in one product is the kind of thing that reads as two teams. Impact: medium. Effort: M. Risk: low. **Priority: Medium.**

**F1-087 · `components/site/SiteFooter.tsx` and `en.ts:327`**
Wrong: the dead slogan appears **twice** in the footer, about 200px apart, on every site page. The copyright line reads "2026 Vallo. All rights reserved." with no © symbol and **no legal entity**. Rule 15 puts VALLO SPACES LTD on legal surfaces, and a copyright notice is one. Do: one tagline, and "© 2026 VALLO SPACES LTD. All rights reserved." Impact: low, but it is on every public page. Effort: S. Risk: none. **Priority: Medium.**

**F1-088 · `app/(site)/styleguide/page.tsx`**
Wrong: twelve sections covering surfaces, text, brand, borders, states, radii, buttons, chips, loading, icons, glass and targets, and **no property card, no input, no select, no toggle, no avatar, no media frame, no empty state**. Do: add the card in every variant and every form control, both themes, side by side. Why: the design system's shop window omits the most important component in the product, which is how components drift. Impact: medium. Effort: M. Risk: none. **Priority: Medium.** Credit: what is there is honest, and every swatch paints its own token so the page cannot drift from the sheet.

**F1-089 · Glass on reading surfaces**
Wrong: measured live, `.nf-card` carries `backdrop-filter`, so **`/safety` renders 30 glass surfaces, 29 of them content cards; `/help` 26, 22 of them cards; `/` 59, 42 of them cards**. The brief says glass is not for long-form reading, dense tables or every card in a grid, and must be cheap on a mid-range Android. `/search` gets it right with 5, all chrome. Do: remove the backdrop filter from `.nf-card` and introduce a separate floating variant for the surfaces that earn it. Why: measured, systemic, and it is the paint cost on the target device. Impact: high, performance and craft. Effort: M. Risk: medium, it changes every card. **Priority: High. [GLASS/BUTTONS]** Treatment is Agent 3's; the measurement is mine.

**F1-090 · Radius and shadow consistency**
Wrong: the landing page paints **six distinct corner radii** (22px, 26%, 14px, 18px, 10px, 50%) and **seven distinct box-shadows**; `/search` paints eight distinct shadows. `HANDOFF_02` section 12 asks for one elevation language. Do: reduce to three radii and three elevations. Impact: medium. Effort: M. Risk: medium. **Priority: Medium. [GLASS/BUTTONS]**

##### Social layer

**F1-095 · `/around` and `/u`, unconfigured copy**
Wrong: "Places switch on the moment **the platform keys** land. Nothing here is a **mock up**." and "**People switch on shortly** / The platform keys are not in place yet... Everything else in the app works as normal." Engineering language shown to users, "shortly" is coming-soon language, and the last clause is false when three surfaces share the state. Do: "Around opens when the first places go live. Nothing is being held back from you." Impact: medium. Effort: S. Risk: none. **Priority: Medium.**

**F1-096 · `/around`, two logos**
Wrong: the Around sub-header centres a second Vallo mark roughly 100px below the site header's logo and wordmark. Do: remove the sub-header mark. Impact: low. Effort: S. Risk: none. **Priority: Medium.**

**F1-097 · `/around` and `/u`, two empty-state anatomies**
Wrong: `/u` has an icon, a heading and a CTA; `/around` has a bordered paragraph with none of the three. Do: one empty-state component, used everywhere. Why: the brief says every empty state is designed, and today there are at least two grammars. Impact: medium. Effort: M. Risk: low. **Priority: Medium.**

**F1-098 · The feed's authorship, a fact rather than a defect**
58 of 66 posts are `kind = SYSTEM, author_kind = SYSTEM`. The feed is 88 per cent bot-authored. Whatever the design, it must say plainly who wrote each post. I could not check whether it does, because I never saw the feed with data. **Priority: Medium**, pending a render.

##### Icon system divergences (for the lead, not for me to act on)

**F1-100** · `UI_ICON_SIZES` in code is `[16, 20, 24, 28, 32, 40]`; `ICON_SYSTEM.md` and `HANDOFF.md` rule 18 both say 12, 16, 20, 24, 28, 32. `UI_ICON_STROKE_PX` is **1.5**; both documents say 1.4. Code is the truth; the documents are stale. **Priority: Medium.**

**F1-101** · `UiIcon` declares **60** glyph names; `assets/icons/ui/` holds **40** SVGs. Twenty glyphs have no checked-in vector: arrow-down, arrow-up, block, bookmark, eye, eye-off, flag, history, info, link, mail, menu, moon, more, mute, picture, repost, sun, trash, views. `ICON_SYSTEM.md` says "40 files, one per glyph", which is false for a third of the set. **Priority: Medium.**

**F1-102** · `public/brand/icons/` holds **87** PNGs. `ICON_SYSTEM.md` says 57 and lists 57 names; `HANDOFF.md` rule 18 says 57; `HANDOFF_02` section 13 says 87. Two of three documents are wrong. **Priority: Nice-to-have.**

**F1-103** · `components/social/feed/PostGlyph.tsx` is a fourth icon name space surviving as an adapter over `UiIcon`, outside the three files `ICON_SYSTEM.md` says the icons directory contains. Its own comment says deleting it is a mechanical rename across thirteen files. **Priority: Nice-to-have.**

---

#### 7. The top fifteen, ranked

1. **F1-020** `/rent` crashes. One prop type. Critical, S.
2. **F1-002** 31 of 77 landing links force sign-up, so no stranger can see a property. Critical, S. (`A1-003`)
3. **F1-001** Delete `PlatformConsole` and its fabricated "17+ Verified listings". Critical, S.
4. **F1-050** Market pill and `isBookable` derived from `kind`: 12 sale listings mislabelled today, 32 yearly tenancies one flag away from a nightly Reserve button. Critical, M.
5. **F1-030** Put the move-in total on the card. The product's one differentiator, absent from the surface that compares. High, M.
6. **F1-031** Say "For sale" on a sale card. High, S.
7. **F1-032** Put the save heart on the card, and stop the `/saved` empty state instructing an action that does not exist. High, M.
8. **F1-070** Link Terms and Privacy on the account creation screen. High, S.
9. **F1-021** Delete the duplicate manifest; the PWA is dead. High, S.
10. **F1-022** Add an OG image and a Twitter card. High, S.
11. **F1-053** Stop empty states rendering under the tab bar. High, S.
12. **F1-024** Retire the slogan in all ten places and land "Real estate, reimagined." properly. High, M.
13. **F1-012** Rewrite the landing FAQ, five items, in the locale files. High, M.
14. **F1-089** Take `backdrop-filter` off `.nf-card`: 29 of 30 glass surfaces on `/safety` are reading cards. High, M. **[GLASS/BUTTONS]**
15. **F1-003 + F1-015** Cut the landing to seven sections and remove the `no-raw-spacing` exemption on `app/page.tsx`. High, M. **[WIDEN]**

---

#### 8. Ideas that do not exist yet

**The move-in ledger, and it is the whole company.** Nobody in this market prints the number people actually pay. Build a card and a page that lead with it, then go one step further than anyone: a **"what you would pay at the door"** strip showing the total, the parts, and a comparison to the area median for that bedroom count. The columns exist. The median is one query. This is the only idea here I would call a moat, and it is cheap. Kill nothing else to fund it.

**Light, water and the gate as a filter, not a footnote.** `power_grid`, `power_backup`, `water_supply`, `prepaid_meter` and `has_estate_access` are five structured columns no competitor has. Today power is one truncated chip on the card. Make **"Band A only"** and **"Borehole or treated mains"** first-class filter chips on `/search`, above the fold. A Lagos renter who can filter by grid band will not use anything else. 61 of 64 rows already answer the power question.

**The empty catalogue as a demand signal.** Every empty result today is a dead end with a "List your place" button aimed at the wrong person. Replace it with **"Tell us what you are looking for"**: area, bedrooms, ceiling, and notify me. It converts the product's biggest weakness, no supply, into the one asset that attracts supply, a waiting list of named demand per area. `saved_searches` is the natural home. This is the highest-value thing that could be built this week.

**Share a shortlist, not a listing.** Nigerians house-hunt in groups: a couple, a family, a WhatsApp thread. Nobody ships a shareable, commentable shortlist. `/saved` plus a share token plus an OG card showing three thumbnails and a price range. It is one table and one route, and it makes the product spread through the channel it is already used in.

**One honest verification card, showing dates.** `PRODUCT.md` already insists inspection and address checks are dates, not ticks, and the code renders them as ticks (F1-059). Go further than the rule: a small panel that says exactly what was checked, when, and by whom, including the things that were **not** checked. Every competitor shows a tick. Showing the gaps is the thing that would make somebody screenshot a Vallo listing.

**One I am killing.** I considered proposing a swipe-to-shortlist card deck for discovery. It would demo beautifully and it is wrong: property is a considered purchase, people compare in a grid, and a deck hides the price comparison that is the entire point of the move-in ledger. It would be a gimmick, and gimmick is on the No list.

---

#### 9. Count by priority

| Priority | Count |
|---|---:|
| Critical | 4 |
| High | 28 |
| Medium | 27 |
| Nice-to-have | 8 |
| **Total** | **67** |

Critical: F1-001, F1-002, F1-020, F1-050.

That is the honest number. I did not pad it, and it would be larger if I had been able to render the listing detail page, the map, the filter drawer and the social layer with data. Those four are listed at the top of section 3 as the largest gaps in this audit.

---

## 6. Agent two: in-app, money and operator

**Scope:** the app shell, navigation, drawers, sheets, modals, toasts, the wallet
and savings, every success, pending, verified and failed state, booking,
checkout, payment, inspection, messaging, the agent console, the entire admin
panel, settings, profile and the verification wizard.

**Read this first.** This agent **could not see a single signed-in screen.**
There is no `.env.local`, so `/sign-in` reports the method is not configured and
every in-app route renders its signed-out branch. All nineteen admin destinations
render one access screen. So the confirmation findings, the admin findings and
the agent console findings are read from source and reasoned, not watched. The
agent says so itself and says it caps everything. **The fix is one seeded
environment with credentials**, and it is the single highest-leverage thing that
could be done for the next session of this work.

**What the lead re-checked before committing this.**

The agent's number one finding is that the wallet promises escrow while the terms
of service deny it. **Verified, and it is worse than a copy defect.**
`BalanceBreakdownSheet.tsx` renders, to a user, "Escrow moves money out of it and
holds it until both sides are done", "Money in escrow", "What you have in
escrow", and "You have paid this into escrow. It comes back if the deal does not
happen." `apps/web/src/lib/legal/terms.tsx`, rewritten on 15 September, says
Vallo does not hold your money in escrow. **The wallet screen and the contract
say opposite things about where somebody's rent money is.** That is not a styling
finding and it should not queue behind one.

The agent's colour finding is also verified at the token level, and the mechanism
is simpler than the report implies. `--nf-state-warning` is defined as
`var(--nf-cyan-400)` at `tokens.css:339`, and `--nf-status-pending` is defined as
`var(--nf-state-warning)` at `tokens.css:403`. **They are not two tokens that
happen to be similar, they are the same value under two names.** So every surface
drawn in the warning tone is drawn in the pending tone, and that includes the
error banner on the forgot-password, reset-password, email sign-in and verify-code
forms. A failed sign in is painted the colour this product reserves for "we are
still working on it".

---

#### 1. The rules, restated

1. **Zero em dashes**, in this report and in every line of copy I propose. Commas, colons, full stops, brackets.
2. **British spelling**: colour, organise, licence (noun), realise, behaviour, centre, judgement.
3. **Money is integer kobo as bigint**, displayed only through `formatMoney` from `@vallo/i18n`. Never float, never hand-divide by 100.
4. **`ActionResult` envelope** on every server action, **`resolveSession()`** for sessions.
5. **`BrandIcon` and `UiIcon` only.** `Icon` and `Icon3D` are deleted. `UiIcon`: 40 stroked glyphs, one computed stroke weight, no `strokeWidth` prop, sizes 12/16/20/24/28/32. `BrandIcon`: `name`, `size`, `fill`, `label`, `priority`, `className` plus undocumented `tile`, `state`, `index`. The two tiers never share a row. `docs/ICON_SYSTEM.md` binds.
6. **390px first, in dark, then wider, then light.** Dark is the default, the OS cannot override it. Light is a designed twin: flat neutral canvas, white cards, neutral hairlines, brand blue only on active, focus and CTA. Every finding judged in both themes.
7. **No fees in copy anywhere.**
8. **Escrow is promised nowhere.** The machinery exists, nothing routes a guest payment into it, `booking_status` has no COMPLETED, the terms were corrected on 15 September to say the platform does not hold your money. Any surface implying a hold is a defect.
9. **No orange, amber, gold, purple, violet, magenta, ever.** One blue family, emerald success, rose error, bright cyan for attention and pending. **Pending is cyan.**
10. **No raw colours, no raw spacing.** `nf/no-raw-colour`, `nf/no-raw-spacing`. I never propose disabling a lint rule.
11. **First-party inventory only.** ADR-013.
12. **Banned in UI copy**: demo, sample, preview, not live, coming soon, lorem.
13. **Colour is never the only signal.** One hue means every status needs a label or shape too.
14. **No dark patterns.**
15. The brand is **Vallo**. **VALLO SPACES LTD** on legal surfaces only.
16. **Never truncate a label. Never reuse a state token to borrow a colour**, as stars once did with the warning token.

**My scope**: app shell and navigation, the entire wallet, every success/pending/verified/failed/declined/expired state, booking/checkout/payment/inspection, messaging, the agent console, the entire admin panel, settings/privacy/security/notifications, profile/account/verification, and the 12 `components/ui/` primitives.

**Agent 1's scope, which I did not audit**: landing page and its 13 components, all `(site)` pages, auth, onboarding, profile setup, search, discovery, filters, map, saved items, the property preview card, listing detail, the social layer, marketing metadata and share previews.

---

#### 2. What I read, ran, rendered, and what the advisors returned

**Read in full**: `docs/HANDOFF_03_FRONTEND.md`, `docs/HANDOFF_02_PLATFORM.md` §24, `docs/ICON_SYSTEM.md`, `docs/BRAND_MARKS.md`, `docs/HANDOFF.md` §0 and §2, `docs/PRODUCT.md`, `docs/DATABASE_AUDIT.md`, `RECOMMENDATIONS.md` §5 only.

**Source read in full or in the relevant part**: `Amount.tsx`, `StatusPill.tsx`, `Sheet.tsx`, `ActionBar.tsx`, `Button.tsx` + `buttons.css`, `Field.tsx`, `Progress.tsx`, `Switch.tsx`, `MomentScreen.tsx` + its CSS, `BrandIcon.tsx` + `glass.css`, `AppShell.tsx`, `MobileTabBar.tsx`, `PageHeader.tsx`, `AdminNav.tsx`, `admin/_components/ui.tsx`, `AccessScreen.tsx`, `WalletDeck.tsx`, `BalanceCard.tsx`, `BalanceBreakdownSheet.tsx`, `money.ts`, `kinds.ts`, `Receipt.tsx`, `ReceiptActions.tsx`, `PayPanel.tsx`, `checkout/[bookingId]/page.tsx`, `HoldCountdown.tsx`, `PaymentReturn.tsx`, `ThreadView.tsx`, `messages/new/page.tsx`, `verification/page.tsx`, `KycStatus.tsx`, `Reveal.tsx` + `animation.css`, `overlays.css`, `tokens.css`, `check-css-tokens.mjs`, `lib/legal/terms.tsx`, plus targeted greps across all 19 admin pages and all 11 agent pages.

**Ran**: 12 SQL queries against `uccixoonmbhrnyczyigt` (all read-only SELECT, no writes, no DDL). `get_advisors` for security and performance.

**Rendered**: a Chromium instance driven by `playwright-core` against `npx next dev -p 3210`, at 390px, deviceScaleFactor 2, dark first then light. Roughly 40 screenshots, every one opened with the Read tool. Twelve viewport slices of `/styleguide`. Three DOM measurement harnesses (element widths, ancestor chains, class bisection) and two performance harnesses under 6x CPU throttling.

**Advisors, security.** Four lint families, compared against `docs/DATABASE_AUDIT.md`'s do-not-fix list.
- `rls_enabled_no_policy` is now **`idempotency_records`, `platform_revenue`, `rate_limits`**. `places_cache` has left the list because it was dropped. **`platform_revenue` is new.** It is correct by design for the same reason as the other two: RLS on with zero policies is fail-closed and the table is service-role only. Reported as new, assessed, no action.
- SECURITY DEFINER callable by `anon` or `authenticated` has grown from 7 warnings over 4 functions to **21 warnings over 19 functions**. I read the bodies of the nine that carry the dangerous shape the audit itself names (an identifier argument plus definer authority): `escrow_admin_resolve`, `escrow_fund_from_wallet`, `escrow_confirm`, `review_kyc_document`, `set_fee_rate`, `admin_retire_demo_listings`, `admin_revenue_summary`, `admin_payment_health`, `admin_expire_stale_withdrawal_holds`. **Every one of them checks `private.has_role(actor, 'admin')` or authorises off `auth.uid()` before doing anything.** No action. I nearly filed this as Critical and rechecked first; it would have been wrong.
- `auth_leaked_password_protection` is still off. Already §1.1 of the audit, already the owner's action.

**Advisors, performance.** Two genuinely new items, and they are new rule breaches rather than lints to wave away.
- **`unindexed_foreign_keys`, 6.** `escrows.disputed_by`, `escrows.release_requested_by`, `escrows.resolved_by`, `fee_rates.created_by`, `platform_revenue.listing_id`, `platform_revenue.rate_id`. `docs/DATABASE_AUDIT.md` §2 records fixing "the last unindexed foreign key" and `docs/HANDOFF.md` §6 requires a covering index on every foreign key. Six have regressed on tables created since 7 August. **New, report, fix.**
- **`auth_rls_initplan`, 5, all on `public.reservations`.** All five policies call `auth.uid()` per row instead of `(select auth.uid())`. Not on the do-not-fix list, cheap, mechanical, safe. **New, report, fix.**
- `unused_index` 34 to 48 and `multiple_permissive_policies` 239 to 266 are both explicitly on the do-not-fix list and both still meaningless on an empty database. No action.

**Database counts, verified live 16 September**, extending the brief's table:

| Table | Rows | | Table | Rows |
|---|---:|---|---|---:|
| listings | 64 | | conversations | **7** |
| listing_photos | 0 | | messages | **7** |
| bookings | 0 | | notifications | **10** |
| transactions | 0 | | wallets | **1** |
| reviews | 0 | | wallet_entries | 2 |
| agent_applications | 0 | | support_tickets | **1** |
| agents | 1 | | saved_items | **1** |
| profiles | 6 | | user_badges | **1** |
| posts | 66 | | fee_rates | **2** |
| escrows | **0** | | ledger_entries | 0 |
| inspection_requests | **0** | | payout_accounts | **0** |
| reservations | **0** | | reports, risk_alerts, message_flags | **0** |

**The two wallet entries, which are the whole of the platform's money history:** a ₦1,000 deposit, COMPLETED, 9 August; and a ₦1,000 withdrawal, **FAILED**, 10 August. That has consequences I set out in §4.

Every enum in the brief matched the live catalogue exactly. I also pulled four the brief did not list and they matter: `event_status` (DRAFT, LIVE, HELD, CANCELLED, REMOVED), `social_status` (LIVE, HELD, REMOVED), `area_status` (PROPOSED, ACTIVE, PAUSED, ARCHIVED, REJECTED), `sale_status` (available, under_offer, sold).

---

#### 3. WHAT I DID NOT CHECK

Read this before you weigh anything below.

**I could not see a single signed-in screen.** There is no `.env.local` in the repository and the running dev server has no Supabase credentials. `/sign-in` renders "This sign in method is not configured yet." Every in-app route returns HTTP 200 and renders either its **signed-out** branch or its **unconfigured** branch. The previous agent's experience holds for me exactly.

**This caps the confidence of everything I say about confirmations.** I have read the confirmation code closely and I can tell you precisely what it will render, but I have not watched a payment succeed, fail or hang.

Specifically, I did **not** see rendered:
- The signed-in wallet: balance card, ledger, receipt, pots, transfer, withdraw or funding drawer, the balance breakdown sheet.
- Any checkout screen, `PayPanel`, `HoldCountdown`, `PaymentReturn`, or any success or failure moment.
- Any admin queue, table, filter, action or detail screen. **All nineteen admin destinations render one `AccessScreen` in this environment.** My entire admin assessment is from source.
- The agent console beyond its error and access shells.
- Any message thread, the composer, attachments or the safety sheet.
- The verification wizard's steps.
- `Sheet` opened, so I did not watch the drag, the detents, the spring or the focus trap behave. I read them.

Also not checked:
- **iOS Safari and any real device.** All rendering is desktop Chromium 1194 at a 390px viewport. Safe-area insets, `dvh` behaviour with the URL bar, the iOS keyboard against the sheet detents, and `-webkit-backdrop-filter` cost are all unverified.
- **A production build.** All measurements are against `next dev` with Turbopack and React development mode.
- Yorùbá, Hausa and Igbo rendering. I read the English dictionary only.
- The savings pots surface (`PotsSection.tsx`) beyond its existence, and crypto deposits beyond `WalletDeck`'s forms.
- `components/ui/Table.tsx` internals. I established that admin uses it zero times and read its size, not its code.
- Screen-reader behaviour with an actual screen reader. All accessibility findings are from markup.

---

#### 4. The honest state of my scope

##### The one-paragraph verdict

This is a codebase written by somebody who thinks carefully, in a product that has not yet been looked at whole. The comments are the best I have read in a repository of this kind, and several components (`Sheet`, `Field`, `Progress`, `KycStatus`, `Receipt`) are genuinely excellent. But the parts do not add up to a product. The confirmation system does not exist as a system. Eight failure screens are painted in the pending colour. The wallet tells a user their money is held in escrow while the terms of service say in bold that it is not. Every content object on the default dark theme sits on a white sticker. The admin panel, which is where the company will live, has nineteen destinations, one search box, zero filters, zero pagination, and does not use the platform's own table primitive once. None of that is a lack of skill. It is the absence of a pass that looks at the whole thing at 390px, in the dark, and asks what a person actually sees.

##### Ratings

| Surface | /100 | Evidence | The failure that caps it |
|---|---:|---|---|
| **App shell** | **62** | Rendered at 390px in both themes. Read `AppShell`, `MobileTabBar`, `PageHeader`, `AppRail`. | Two stacked headers on every non-tab screen: a 64px sticky glass bar carrying a hamburger and a wordmark, then a `PageHeader` carrying back and a title. On a 844px phone that is 14% of the viewport spent twice saying "you are in Vallo" before any content. Above `lg` the same bar is **empty by design** and still costs 64px and a `backdrop-filter`. |
| **Wallet** | **66** | Read every file in `(app)/wallet/**`, `components/app/wallet/**`. Queried the one real wallet. | `BalanceBreakdownSheet` states, unconditionally, "Escrow moves money out of it and holds it until both sides are done" and "You have paid this into escrow. It comes back if the deal does not happen." `escrows` has zero rows, nothing routes a payment into it, and `lib/legal/terms.tsx` says in bold "**We do not hold your money in escrow**... we will not describe it as though it were." The product contradicts its own contract on the money screen. |
| **Checkout and payment** | **41** | Read `PayPanel`, `checkout/page.tsx`, `HoldCountdown`, `PaymentReturn`. Measured the pay button. | `PaymentReturn`'s failure branch. A person returns from Paystack having entered their card, verification fails, and the screen says **"Payment check"** as a heading in neutral grey with the reason in muted grey inside a plain card, `role="status" aria-live="polite"`, no mark, no colour, no statement of whether money left their account, no retry, no support route. The success branch on the same component is emerald with a consequence line. That asymmetry is the whole problem in one file. |
| **Messaging** | **74** | Read `ThreadView`, `messages/new`, `Inbox` markup. | The property name on the thread header is `truncate`d to one line with an ellipsis, twelve lines under a comment claiming "Neither of these truncates any more". That is the one piece of context in a negotiation about a flat. And `/messages/new` renders in immersive mode with **zero page gutter**, so its back button sits at x=0, y=0. |
| **Agent console** | **58** | Source only. Could not render. | It correctly uses the shared `toneForStatus` map, which is more than admin does, but `booking_status` has no COMPLETED so an agent has no way to record that a stay happened, and `BookingsWorkspace` `truncate`s the **guest's name** in an `<h3>` on the screen where the agent accepts or declines that guest. |
| **Admin panel** | **47** | Source only. Could not render. Read all 19 pages' status and layout code. | Nineteen destinations (the docs say 14), **one search input across all of them**, zero filters, zero pagination, and `components/ui/Table.tsx` used **zero times**. Today, with every queue at zero rows, `QueueEmpty` draws a **green tick** meaning "all clear" on all nineteen. On day one an operator opens the console and is told nineteen times that they have cleared work that never arrived. |
| **Confirmation system** | **34** | Read every `MomentScreen` call site, its CSS, and `BrandIcon`'s render branches. | `MomentVariant` is `success \| brand \| warning`. There is **no failure variant**, so **eight** failure surfaces paint `--nf-state-warning`, which resolves to `--nf-cyan-400`, which is the same token as `--nf-status-pending`. Two of them use `icon="calendar-check"`, a **tick**, to say "This booking was cancelled" and "We could not find that booking". And `MomentScreen` passes `state="confirmed"` to `BrandIcon`, which silently discards it because `tile` defaults to false. |

##### The five things making this read as an AI app, in my scope

1. **A white sticker behind every object on the dark theme.** `--nf-icon-ground: #F5F7FD`. Every `BrandIcon` on the default theme sits on a near-white squircle at 26% radius. I have four screenshots of it. Three of them in a column on `/bookings` look like app icons pasted into a list.
2. **Nine bespoke confirmation screens instead of one.** Each one chose its own mark, its own variant and its own copy, and they disagree.
3. **The ground is a blue wash, not navy-black.** On `/styleguide` the `--nf-surface-canvas` swatch, labelled "The page itself", is visibly darker than the page it is printed on. The gradient field is doing the job the token is supposed to do, and state panels lose their separation against it.
4. **The console looks like a back office.** Nineteen unbanded chips on a phone, no filters, hand-rolled lists, raw enum strings as chip labels.
5. **Every second screen says something "switches on shortly".** Thirteen instances of "switches on shortly", "is nearly here" or "come back soon", several explaining that "the platform keys land".

##### Where the brief's assumption did not survive measurement

The brief says glass "must be CHEAP: 16ms of paint for a frosted panel on a mid-range Android on a Lagos network is a regression. Measure it."

**I measured it and the glass is not the problem.** At 6x CPU throttling, programmatically scrolling `/settings` end to end over 60 steps:

| Condition | Median frame | p90 | Max | Frames over 16.7ms |
|---|---:|---:|---:|---:|
| Baseline | 16.8ms | 18.5 | 35.5 | 63 / 120 |
| `.nf-reveal` animation and blur off | 16.9ms | 21.0 | 32.3 | 65 / 120 |
| All `backdrop-filter` off | 16.8ms | 19.0 | 24.8 | 65 / 120 |
| Both off | 16.8ms | 22.3 | 30.5 | 60 / 120 |

Removing every frosted surface and every reveal blur changes the median by 0.1ms. The 17ms floor is the dev build. **Do not remove glass on performance grounds without re-measuring against a production build.** I am killing this one myself.

---

#### 5. THE FULL CONFIRMATION STATE INVENTORY

Every success, pending, verified, failed, banner and receipt state in my scope. Mark names are from the 24 in `CF5A4150` / `C0F67033`.

##### 5.1 Success

| # | File and symbol | What the user sees today | Glass mark | What it should be |
|---:|---|---|---|---|
| 1 | `PayPanel.tsx` `wallet-paid` | `MomentScreen variant="success" icon="calendar-check"`, emerald glow, inline under the summary. Amount is in the description string. | `payment-sent` | `ResultSheet state="sent"`. Amount as the fact, not prose. Consequence: "The agent has been paid and your dates are locked." |
| 2 | `checkout/page.tsx:244` `view.paid` | "This stay is paid for", success, `calendar-check`, one action. | `receipt-check` | A receipt, not a moment. This is the returning view: link to the receipt. |
| 3 | `PaymentReturn.tsx` `settled` | "Payment received" in emerald, one muted line, inside a card at the top of a live checkout page. | `payment-received` | `ResultSheet state="received"`, over the page, not a banner on it. |
| 4 | `WalletDeck.tsx` `WithdrawForm` success | Amount, "On its way to {bank} ****{last4}", and the best consequence line in the product. **Zero actions.** The user is stranded in a drawer. | `wallet-out` | Keep the copy verbatim. Add a reference number, a date, and two actions: "View receipt" / "Done". |
| 5 | `WalletDeck.tsx` `TransferForm` success | Amount, "Sent to {name}", "Their wallet has it already". **Zero actions.** | `payment-sent` | Same. Add reference, date, two actions. |
| 6 | `ReviewForm.tsx:42` | "Thank you for the review", `icon="reviews"`. | `seal-check` | Fine as copy. Route through `ResultSheet`. |
| 7 | `ListingWizard.tsx:993` | `variant="success"`, `copy.submitted.title`. | `seal-pending` | This is a **submission**, not a success. It goes to `SUBMITTED` then `UNDER_REVIEW`. It should be `state="pending"` with the consequence: "A person looks at this within one working day." |
| 8 | `Receipt.tsx` | Genuinely good. Amount, direction in words, status, full selectable reference, date and time to the minute, who it was for. | `receipt-check` | Two changes only: localise `KIND_LABEL`, and render the receipt in the **paper theme regardless of the app theme**, because it is screenshotted and printed. |
| 9 | `admin/_components/ui.tsx` `QueueEmpty` | **Green circle, `verified` tick, "all clear".** Rendered on all 19 queues today, every one of which has never had a row. | none, this is not a moment | Two states: "Nothing has ever arrived here" (neutral, no tick) and "You have cleared everything" (emerald tick). They are different facts. |

##### 5.2 Pending, which is the neglected one

| # | File and symbol | What the user sees today | Glass mark | What it should be |
|---:|---|---|---|---|
| 10 | **`PayPanel.tsx` `card-starting`** | **A `loading` prop on a button. Nothing else.** | `hourglass` | Full-surface pending: mark, "Opening your payment page", the amount, "Nothing has been charged yet." |
| 11 | **`PayPanel.tsx` `card-redirecting`** | **A `loading` prop on a button.** If `window.location.assign` is slow or blocked, this spins forever with no timeout and no escape. | `hourglass` | As above plus a 10-second fallback: "This is taking longer than usual. Your money has not moved. Try again." |
| 12 | **`PayPanel.tsx` `wallet-paying`** | **A `loading` prop on a button.** Largest amounts on the platform. | `payment-sent` | Full-surface pending with the amount and "Nothing leaves your wallet until this completes." |
| 13 | `PaymentReturn.tsx` `checking` | "Confirming your payment" / "Checking with the payment service. This takes a moment." `role="status"`. Good copy, no mark, no amount, **no timeout**. | `hourglass` | Keep the copy, add the mark and the amount, add a 20-second escape. |
| 14 | `FundForm` redirecting | "Opening the secure payment window" + live region. Good. No mark, no amount. | `wallet-plus` | Add both. |
| 15 | `CryptoForm` redirecting | Same, plus the honest settlement line. | `exchange` | Add mark and amount. |
| 16 | `TransactionsSection.tsx:298` | `StatusPill` with `{entry.status.toLowerCase()}` as the label. So the ledger says "pending" in raw lowercase English on a four-locale platform. | `seal-pending` | Localised label. A pending row deserves a line: "Waiting for the bank. Usually under an hour." |
| 17 | `KycStatus.tsx` pending | "Under review", cyan, with a horizon. **The best pending state in the product.** Mark is `calendar-booking`, which is wrong. | `doc-review` | Swap the mark only. |
| 18 | `HoldCountdown.tsx` live | `{h}h {mm}m {ss}s` ticking every second for 48 hours. | `clock-expired` when run out | A **ticking seconds counter over two days is urgency theatre**. Rule 14. Show "Held until Thursday 14:20" and switch to a live countdown only under one hour. |
| 19 | Agent application submitted | A status page. No in-flight state. | `seal-pending` | `ResultSheet state="pending"` on submit. |
| 20 | Listing `SUBMITTED` to `UNDER_REVIEW` | A status pill and nothing else. Both statuses map to the **same** tone, so the two queue stages look identical. | `doc-review` | Distinct tones plus a consequence line. |

##### 5.3 Verified

| # | File | Today | Glass mark | Should be |
|---:|---|---|---|---|
| 21 | `KycStatus.tsx` approved | Emerald, `verified` glyph, says what changed. Correct. | `id-verified` | Swap in the mark. |
| 22 | `agent/verification/page.tsx:80` | `StatusPill tone={failed ? "danger" : "success"}`, and `"Not checked yet"` neutral. Correct. | `seal-check` | Keep. |
| 23 | `PageHeader tone="verified"` | Tints the header row once for a state change. Well judged. | none | Keep. |

##### 5.4 Failed, declined, expired. **Eight of these paint cyan.**

| # | File and line | Today | Glass mark | Should be |
|---:|---|---|---|---|
| 24 | `(app)/error.tsx:42` | `variant="warning"` **cyan**, `icon="shield-lock"`, "That screen did not load". A padlock shield tells the user their account is locked. | `alert-triangle` | `state="failed"`, rose. |
| 25 | `admin/error.tsx:36` | `variant="warning"` **cyan**, `shield-lock`, "This queue did not load". | `alert-triangle` | rose, and name the queue. |
| 26 | `agent/error.tsx:40` | `variant="warning"` **cyan**, `shield-lock`. | `alert-triangle` | rose. |
| 27 | `checkout/page.tsx:100` | `variant="warning"` **cyan**, **`icon="calendar-check"` (a tick)**, "We could not find that booking". | `seal-cross` | rose, cross. |
| 28 | `checkout/page.tsx:118` | `variant="warning"` **cyan**, `shield-check` (a tick), "Checkout is unavailable for a moment". | `alert-triangle` | rose, and say whether money moved. |
| 29 | `checkout/page.tsx:258` | `variant="warning"` **cyan**, **`calendar-check` (a tick)**, "This booking was cancelled". | `clock-expired` | This is terminal, not a warning. Neutral or rose, never a tick. |
| 30 | `review/page.tsx:78` | `variant="warning"` **cyan**, `calendar-check` (a tick), "We could not find that stay". | `seal-cross` | rose. |
| 31 | `review/page.tsx:96` | `variant="warning"` **cyan**, `shield-check` (a tick), "Reviews are unavailable for a moment". | `alert-triangle` | rose. |
| 32 | `PayPanel.tsx:172` | **Already fixed by the lead on 15 September.** Rose, cross glyph, `role="alert"`. Still 13px on a plain card with no rose surface and no heading. | `payment-failed` | `ResultSheet state="failed"` with the amount and "Nothing was taken from your card." |
| 33 | **`PaymentReturn.tsx:166`** | **Heading "Payment check" in neutral primary, body in muted grey, plain card, `role="status"`.** The worst confirmation surface in the product. | `payment-failed` | Rose, `role="alert"`, verdict "Payment not confirmed", the amount, "Your card has not been charged. If money left your account it returns within 24 hours.", two actions: Try again / Get help. |
| 34 | `WalletDeck.tsx` `ErrorNotice` | `role="status" aria-live="polite"`, `--nf-content-secondary` on `--nf-glass-fill` with `--nf-border-subtle`. **A failed withdrawal is styled identically to a neutral hint.** | `payment-failed` | `role="alert"`, rose ink on `--nf-state-error-surface`, a cross, a verdict line. `Field.tsx` already does this correctly; the wallet's own banner does not use it. |
| 35 | `WalletDeck.tsx:501` | Bank account lookup failure painted `--nf-state-warning`, **cyan**, the pending colour. | `alert-triangle` | rose. |
| 36 | `admin/_components/ui.tsx` `QueueUnavailable` | **A `bell` glyph in a cyan wash** for a read failure. | `alert-triangle` | rose, cross, and what the operator should do. |
| 37 | `admin/_components/ui.tsx` `CheckRow` failing | **A `bell` glyph in a cyan wash**, and the **evidence line is `truncate`d**. | `seal-cross` | rose, cross, evidence never truncated. |
| 38 | `ThreadView.tsx:477` | "Not sent. Retry" in rose under the bubble. Correct. But the **bubble itself stays at full opacity**, so at a glance a failed message looks sent. | `payment-failed` is wrong here; needs a small `seal-cross` | Outline the failed bubble rather than filling it. |
| 39 | `KycStatus.tsx` rejected | **The best failure state in the product.** Rose, the reviewer's words in full, the fix given equal weight, TypeScript refuses a rejection without a reason. | `doc-rejected` | Model for `ResultSheet`. One bug: `retryHref` defaults to `/verification`, which re-renders the same rejection. **The retry link is a loop.** |
| 40 | `(app)/verification/page.tsx` | **`MORE_INFO_REQUIRED` and `SUSPENDED` have no surface at all.** The user is dropped into a blank wizard with no message saying what was asked for. | `doc-review` | A fourth `KycStatusView` state carrying the reviewer's request. |

##### 5.5 Banners and persistent notices

| # | File | Today | Should be |
|---:|---|---|---|
| 41 | 13 "switches on shortly" screens | "Notifications switch on shortly", "Payment switches on shortly", "Messaging is nearly here... come back soon", "Accounts switch on shortly" and nine more, several explaining "the moment the platform keys land". | This is the honest `unconfigured` branch and it must exist, but the phrasing is a synonym for "coming soon" and the body leaks infrastructure. **Better version:** "We cannot reach your wallet right now" / "This is on our side, not yours. Nothing has been lost and nothing has moved. Try again in a few minutes." |
| 42 | `BalanceBreakdownSheet` `SHEET_SUB` and `HELD_OUT_NOTE` | Unconditional escrow promise on the wallet. | Delete until escrow ships. See F2-001. |
| 43 | `checkout/page.tsx` `platformTakesNothing` | "Vallo adds nothing of its own to this total. Every naira goes to the stay." | Correct and compliant. Keep. |

---

#### 6. THE ResultSheet SPECIFICATION

##### 6.1 Why a sheet and not a screen

Today's `MomentScreen` is rendered **inline in the document flow**, with `min-height: 60vh` and `justify-content: center`. On checkout that means the confirmation for a payment sits **below** the booking summary: a person who has just paid ₦1.2m has to scroll to find out that it worked. A confirmation is not a section of a page. It arrives over the top of what you were doing, and the thing you were doing is still there underneath when it leaves.

`components/ui/Sheet.tsx` already owns the portal, the spring, the detents, the drag, the focus trap, the counted scroll lock, Escape, focus restoration, the safe-area inset and the reduced-motion branch. `ResultSheet` composes it. It writes none of that again.

##### 6.2 The prop surface

```ts
export type ResultState =
  | "sent"       // money left the person: payment sent, transfer sent, withdrawal placed
  | "received"   // money arrived: funding landed, payout received, refund returned
  | "confirmed"  // a non-money good outcome: booking confirmed, review posted, listing published
  | "pending"    // in flight, nothing decided, nothing lost
  | "review"     // a human is looking at it, with a horizon
  | "failed"     // refused, declined, reversed. Something did not happen
  | "expired";   // a window closed. Not a failure and not a success

export type ResultSheetProps = {
  open: boolean;
  onOpenChange(open: boolean): void;

  state: ResultState;

  /** Two words. "Payment sent". Never an exclamation mark. Enforced: see 6.7. */
  verdict: string;

  /** The screenshotted fact. Amount always through <Amount>, never a string. */
  fact?: {
    amountMinor?: number;
    currency?: string;
    /** The property, the person, the bank. One line, never truncated. */
    subject?: string;
    /** Date and time, Africa/Lagos, through formatDate. */
    at?: string;
    /** The string support traces it by. Full, selectable, never truncated. */
    reference?: string;
  };

  /** The line that removes fear. REQUIRED for pending, review and failed. */
  consequence: string;

  /** At most two. TypeScript enforces the tuple. */
  actions?: readonly [ResultAction] | readonly [ResultAction, ResultAction];

  /** Overrides the state's mark. Use sparingly; the state should be enough. */
  mark?: BrandIconName;

  /** Small print under the actions. A receipt link, a support route. */
  footnote?: ReactNode;

  /**
   * Blocks dismissal. Only legal on "pending", and only while the outcome is
   * genuinely unknown. Never on a failure: a person must always be able to
   * leave a screen that told them bad news.
   */
  blocking?: boolean;
};

type ResultAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone: "primary" | "quiet";
};
```

`consequence` is not optional on the three states that need it. Make it a discriminated union so a call site cannot ship a pending sheet with no horizon, the same trick `KycStatus` already uses to make a reason mandatory on a rejection. **That is the single most valuable line in this spec**, because it is the line most products skip.

##### 6.3 The seven states

| State | Ink token | Mark (dark / light pair) | Verdict examples |
|---|---|---|---|
| `sent` | `--nf-state-success` | `payment-sent` | "Payment sent", "Transfer sent", "Withdrawal placed" |
| `received` | `--nf-state-success` | `payment-received` | "Money in", "Refund returned" |
| `confirmed` | `--nf-brand-primary` | `seal-check` | "Booking confirmed", "Listing live", "Review posted" |
| `pending` | `--nf-state-warning` (cyan) | `hourglass` | "Going through", "On its way" |
| `review` | `--nf-state-warning` (cyan) | `doc-review` | "Under review" |
| `failed` | **`--nf-state-error`** (rose) | `payment-failed` / `seal-cross` | "Payment declined", "Not sent" |
| `expired` | `--nf-content-muted` | `clock-expired` | "Hold released", "Offer closed" |

**`pending` and `review` are both cyan and that is correct**, but they must not be indistinguishable: the mark differs (`hourglass` against `doc-review`) and the verdict differs. Rule 13 is satisfied by mark plus word, not by hue.

**`expired` is deliberately not rose.** A hold running out is not a failure and painting it as one manufactures alarm. Rule 14.

##### 6.4 Anatomy and layout at 390px

Top to bottom, inside the sheet body, centred:

1. **The mark.** 96px at 390px, 112px from 640px. This is the emotional payload and it is the one place in the product where an object should be large. No tile, no plate, no circle behind it. The new glass marks carry their own ground.
2. **The verdict.** `clamp(1.5rem, 5.6vw, 1.875rem)`, weight 800, `letter-spacing: -0.02em`, `--nf-content-primary`, `max-width: 18ch`, `text-wrap: balance`. Two words fit one line at 390px; `balance` stops the third word orphaning, which is what produces "Your wallet is behind your sign / in" three times over today.
3. **The fact.** The amount through `<Amount showFraction>` at `clamp(2rem, 9vw, 2.75rem)`, `font-extrabold`, `nf-numeric`, kobo in the muted tone at `0.62em`. Under it the subject at `nf-body`, never truncated, `overflow-wrap: anywhere`, two lines maximum by wrapping and not by clamping. Under that, date and reference at `nf-caption`, the reference `user-select: all` and `font-variant-numeric: tabular-nums`.
4. **The consequence.** `nf-body`, `--nf-content-secondary`, `max-width: 34ch`, `line-height: 1.55`. One sentence. Two at most.
5. **The actions.** Vertical stack at 390px, `gap: var(--nf-gap-row)`, both full width, primary first. Horizontal from 640px. At most two, enforced by the tuple type.
6. **The footnote.** `nf-caption`, `--nf-content-muted`.

Vertical rhythm uses the existing named intervals only: `--nf-gap-block` under the mark, `--nf-gap-row` under the verdict and between fact lines, `--nf-gap-group` above the actions. **No raw spacing.**

##### 6.5 Both themes

Dark: the sheet is `--nf-surface-elevated` with the `--nf-elev-3` rim, and the state's ink glows as a single soft radial behind the mark only. `radial-gradient(circle, color-mix(in oklab, var(--nf-result-ink) 26%, transparent) 0%, transparent 66%)`, 18rem, `filter: blur(6px)`. **One glow on the screen, behind one object.** That is the restraint the direction asks for.

Light: the sheet is white, the rim is a neutral hairline, and the glow **does not cross over**. A blurred blue halo on white paper reads as a print smudge. Instead the light twin gets the frosted-white mark from `C0F67033` on a flat white card, and the state ink appears **only** in the verdict's colour and the primary button. That is the designed twin, not a tint.

Take a new token pair rather than reusing `--nf-moment-color`, because the glow must resolve to `transparent` in light:

```css
:root { --nf-result-glow: color-mix(in oklab, var(--nf-result-ink) 26%, transparent); }
:root[data-theme="light"] { --nf-result-glow: transparent; }
```

**The backdrop must not be one value for both themes.** `.nf-sheet-backdrop` is currently `rgb(0 0 0 / 0.55)` hard-coded. At 55% black over a white paper app it is a heavy curtain. It needs a token that steps to about 0.32 on paper.

##### 6.6 Motion, and reduced motion

The sheet's entrance is `Sheet`'s own spring and needs nothing new. On top of it:

- The mark scales `0.86 to 1` and fades over 420ms on `--nf-ease-entrance`, starting 80ms after the sheet settles so it reads as landing rather than arriving with the furniture.
- The glow fades in over 600ms behind it.
- Nothing else animates. No staggered lines, no counting numbers, no confetti. A number that counts up on a confirmation is a number a person cannot screenshot.

**Reduced motion**: `Sheet` already drops its transition. `ResultSheet` adds `@media (prefers-reduced-motion: reduce) { .nf-result__mark { animation: none } .nf-result__glow { transition: none } }`. The end state is identical, so nothing is lost. This must be tested with the media query forced, because the current `.nf-moment__badge` handles it and the `nf-reveal` scroll-driven path does too, so the pattern is established.

##### 6.7 Focus, live regions and dismissal

- The sheet is `role="dialog" aria-modal="true"` via `Sheet`, labelled by the verdict.
- **First focus goes to the primary action, not to the dialog and not to a close button.** Today `Sheet` focuses the first focusable in DOM order, which in the wallet drawer is the Close button. On a confirmation the first thing a keyboard or screen-reader user meets must be what to do next.
- The fact block is `aria-live="polite"` **only when the sheet transitions from `pending` to a terminal state in place**, which is the wallet and checkout case. An outcome that changes under the user must announce itself. A sheet that opens already terminal does not need a live region, because the dialog role announces it.
- **`failed` uses `role="alert"` on the verdict.** Nothing in the product currently announces a payment failure assertively.
- `blocking` is only legal on `pending`. Everything else closes on Escape, on backdrop tap, on the drag-down, and on either action.
- On close, focus returns to the opener. `Sheet` already does this and does it twice over, correctly.

##### 6.8 What it replaces, and the migration order

Do them in this order. Each step removes a bespoke screen and none of them depends on the icon slicing being finished, because `ResultSheet` can ship against the current `BrandIcon` names and swap artwork later.

1. **`PaymentReturn.tsx`.** The worst surface, the smallest diff, and it is on the card money path. Three branches map to `pending`, `received` and `failed`. This alone is the single highest-value change in my scope.
2. **`PayPanel.tsx`.** `card-starting`, `card-redirecting` and `wallet-paying` become one `pending` sheet with the amount. `error` becomes `failed`. `wallet-paid` becomes `sent`. Four bespoke branches gone, and the three worst pending states in the product fixed in one file.
3. **`checkout/[bookingId]/page.tsx`.** `paid`, `CANCELLED`, `not found`, `unavailable`. Two of these stop using a tick to report a failure.
4. **`WalletDeck.tsx`.** `WithdrawForm` and `TransferForm` success, and `ErrorNotice`. The withdraw copy is already the best in the product: lift it verbatim into `consequence` and add the two actions it has never had.
5. **The three `error.tsx` boundaries** (app, admin, agent). All three stop painting a crash cyan.
6. **`review/page.tsx` and `ReviewForm.tsx`.** Four branches.
7. **`KycStatus.tsx`.** Last, and deliberately: it is already correct, so it is the one that proves `ResultSheet` is expressive enough rather than the one that needs it. If `ResultSheet` cannot express `KycStatus`, `ResultSheet` is wrong.
8. **Delete `MomentScreen.tsx`** and `.nf-moment*` from `chips.css`.

Step 1 alone is worth shipping on its own. Steps 1 to 4 are the money path and are where the entire value sits.

---

#### 7. THE FINDINGS

Seven fields each. Grouped by surface. Priority is Critical only where a user loses money, loses data, is exposed, or is blocked from the core loop.

##### A. Truth and trust

**F2-001. The wallet promises escrow. The terms say in bold that it does not exist.**
*File*: `components/app/wallet/BalanceBreakdownSheet.tsx`, constants `SHEET_SUB`, `HELD_OUT_NOTE`, `HELD_IN_NOTE`, `BREAKDOWN_WITH_HELD`, rendered unconditionally at the `<p>{SHEET_SUB}</p>` inside `BalanceBreakdownSheet`. Also `components/app/wallet/kinds.ts` `KIND_LABEL.escrow_hold = "Held in escrow"`.
*What is wrong*: Any signed-in person can tap "Breakdown" on the balance card and read "Escrow moves money out of it and holds it until both sides are done" and "You have paid this into escrow. It comes back if the deal does not happen." `escrows` holds zero rows, nothing routes a guest payment into it, `booking_status` has no COMPLETED, and `lib/legal/terms.tsx` states "**We do not hold your money in escrow, and you should not treat a payment made here as protected by us holding it**... we will not describe it as though it were." The same sentence was correctly removed from `api/assistant/route.ts` and `api/support/route.ts`; the wallet was missed. The support route's own comment names the lesson: "a claim about somebody's money should not live in a string literal in two files."
*What to do*: Delete the escrow sentences. `SHEET_SUB` becomes "Your wallet holds one balance. This is what it is made of." Drop the two held rows and the two `Holds` lists behind `anyHeld`, which is already computed. Keep `kinds.ts` escrow labels, which are unreachable at zero rows, but move them behind the same flag. Restore all of it when a flow exists **and** the legal answer exists, not when either arrives alone.
*Why it matters*: It is a promise about somebody's money that the company has contractually disclaimed, in the product, on the money screen. The terms file records that the CAC memorandum deliberately omits every payment and escrow word.
*Impact*: Every signed-in user. *Effort*: **S**. *Risk*: Low, it is deletion. *Priority*: **Critical**.

**F2-002. "Trips" is a banned synonym and it is in eleven user-facing strings.**
*File*: `(app)/bookings/page.tsx:138,156`, `(app)/bookings/[bookingId]/review/page.tsx:82,85,103,139,205`, `review/ReviewForm.tsx:56`, `(app)/profile/SignedOutHero.tsx:107`, `(app)/profile/AccountBody.tsx:149`, `packages/i18n/src/locales/en.ts:802`.
*What is wrong*: `docs/PRODUCT.md` §7 lists Trip as a banned synonym for Stay, and says the terminology is "enforced by five specs". "My trips" is a button label five times.
*What to do*: "Stays" throughout. "Your stays are behind your sign in", "My stays". Add the word to whichever spec enforces the vocabulary.
*Why it matters*: The terminology table exists so the product sounds like one product. *Impact*: Copy across three surfaces. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-003. Thirteen screens say something "switches on shortly", which is "coming soon" in other words.**
*File*: `notifications/page.tsx:61`, `checkout/[bookingId]/page.tsx:67`, `messages/new/page.tsx:128-129`, `review/page.tsx:45`, `profile/SignedOutHero.tsx:107`, `u/page.tsx:55`, `u/[handle]/page.tsx:191`, `u/[handle]/edit/page.tsx:45`, `stories/new/page.tsx:31`, `agent/listings/[listingId]/calendar/page.tsx:50`, `social/profile/FollowListPage.tsx:40`, plus the `AccessScreen` unconfigured branch.
*What is wrong*: Rule 12 bans "coming soon". "Switches on shortly" and "come back soon" are the same promise in different words, and the bodies say "the moment the platform keys land", which is infrastructure jargon in user copy.
*What to do*: One shared unconfigured copy set that describes the situation rather than a schedule. **Write it as:** title "We cannot reach your wallet right now", body "This is on our side, not yours. Nothing has been lost and nothing has moved. Try again in a few minutes." Parameterise the noun.
*Why it matters*: It is the state a real person hits if a key ever lapses in production, and it currently reads as an unfinished product. *Impact*: 13 screens. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

##### B. Money display

**F2-004. `Amount` floats money and bypasses `formatMoney`.**
*File*: `components/ui/Amount.tsx:79` `const major = minorUnits / 100;` then `new Intl.NumberFormat(...).formatToParts(major)` at :82.
*What is wrong*: Rule 3 in two ways: a hand division by 100 and a display path that is not `formatMoney`. `minorUnits` is also typed `number`, not `bigint`. Every price on the platform runs through this.
*What to do*: Have `@vallo/i18n` export a `formatMoneyParts(minorUnits, locale, currency, opts)` that does the split from integer kobo without ever producing a float, and have `Amount` consume it. The two-tone typography, the tabular figures and the locale-driven symbol placement all survive; the division does not.
*Why it matters*: It is the named rule and it is the component every figure passes through. `12345 / 100` is not exactly representable in binary; today it rounds back correctly, and the rule exists so nobody has to keep checking that.
*Impact*: Platform-wide. *Effort*: M. *Risk*: Medium, it touches every price. *Priority*: **High**.

**F2-005. A negative wallet balance renders as positive.**
*File*: `components/app/wallet/BalanceCard.tsx:112-118` and the render at :243-249.
*What is wrong*: The component destructures only `{ kobo }` from `formatKoboExact`, discarding `whole`, which **does** carry the sign. It then computes `const absMinor = Math.abs(balanceMinor)` and renders `₦` + `<Odometer value={wholeNaira} />` with no sign. A wallet at minus ₦4,000 displays as ₦4,000.00. `public.admin_payment_health` explicitly hunts for "a wallet below zero", so the platform treats this as a real possibility.
*What to do*: Render the sign from `balanceMinor < 0` before the symbol, or use `formatKoboExact(...).whole` and drop the local division entirely.
*Why it matters*: A person in debt to the platform is shown money they do not have, on the one screen that must never be approximated. *Impact*: Rare but severe. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-006. The naira sign is still hard-coded in two of the five places `Amount`'s docstring says were fixed.**
*File*: `BalanceCard.tsx:193,224,244`, `WalletDeck.tsx:677`.
*What is wrong*: `Amount`'s own comment records that hard-coding `₦` produced a wallet hero and a ledger row disagreeing, because `ha-NG` emits "₦ 9,000,000" with a space, and that building from `formatToParts` fixed it "once, here". These four call sites still write `"₦"` by hand next to an `Odometer`.
*What to do*: Have the locale supply the symbol and its spacing to the Odometer wrapper.
*Why it matters*: On a Hausa phone the wallet hero and the row under it render the currency differently. *Impact*: Wallet, three locales. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-007. The pay button's label overflows its own pill at rent-sized amounts.**
*File*: `checkout/[bookingId]/PayPanel.tsx:196-204` and `:229-237`, against `.nf-btn { white-space: nowrap }` in `buttons.css:53` with no `overflow: hidden` on the base rule.
*What is wrong*: The label is `Pay <Amount showFraction/> by card` inside a `full` button, inside a card row that already spends 48px on an icon and 14px on a gap. I reconstructed that exact geometry at 390px and measured: "Pay ₦95,000.00 by card" fits with 1px to spare on each side, "Pay ₦12,500,000.00 by card" overflows by 1px, and **"Pay ₦1,250,000.00 from my wallet" overflows by 24px**. Screenshot at `/tmp/claude-0/shots/btn-overflow.png`: the label touches both edges of the pill with zero padding and then spills. This is a reconstruction, not the live checkout, which I could not reach.
*What to do*: Take the amount out of the button. The total is already set at up to 60px directly above under "Total to pay". The button says "Pay by card" and "Pay from my wallet". If the amount must stay, put it on a second line inside the button and drop `nowrap` for that one variant.
*Why it matters*: Rule 16, on the largest amounts on the platform. A person cannot read what they are about to pay. *Impact*: Every rent payment. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-008. The ledger's status pill prints the raw enum in lowercase English on a four-locale platform.**
*File*: `components/app/wallet/TransactionsSection.tsx:298` `{entry.status.toLowerCase()}`. Also `components/app/wallet/kinds.ts` `KIND_LABEL`, a hard-coded English record of nine kinds used by the statement, the recent strip and the receipt.
*What is wrong*: A Yorùbá, Hausa or Igbo reader sees "pending", "failed", "reversed", "Withdrawal", "Transfer sent" in English on their money history and on a receipt they send to a landlord.
*What to do*: Move both into the dictionary. `adminUi`'s `statusLabel` is the pattern.
*Why it matters*: Four locales ship. The money surface is the last place to leave untranslated. *Impact*: Wallet, receipt, three locales. *Effort*: M. *Risk*: Low. *Priority*: **Medium**.

**F2-009. Money in and money out are drawn with the same mark.**
*File*: `components/app/wallet/kinds.ts` `KIND_ICON`.
*What is wrong*: `transfer_in` and `transfer_out` are both `user-check`. `refund`, `escrow_release` and `escrow_refund` are all `shield-check`. So on a statement the direction of a movement, which is the most important fact on a ledger row, is carried only by a `+` or `-` sign and a colour. Rule 13.
*What to do*: This is exactly what the 24 new marks are for. `deposit` to `wallet-plus`, `withdrawal` to `wallet-out`, `payment` to `payment-sent`, `refund` to `payment-received`, `transfer_in` to `payment-received`, `transfer_out` to `payment-sent`, `escrow_hold` to `cash-box`, `escrow_release` and `escrow_refund` to `exchange`.
*Why it matters*: A statement where every row looks the same is a statement nobody scans. *Impact*: Three wallet surfaces. *Effort*: S once the marks are sliced. *Risk*: Low. *Priority*: **Medium**.

**F2-010. The wallet's error banner is styled as a neutral hint and announced politely.**
*File*: `(app)/wallet/WalletDeck.tsx:688-698` `ErrorNotice`.
*What is wrong*: `role="status" aria-live="polite"`, `--nf-content-secondary` text on `--nf-glass-fill` with `--nf-border-subtle`. A failed withdrawal, a rejected transfer and a declined funding all render in exactly the styling a neutral tip would use. There is no rose ink, no mark, no heading, no `role="alert"`.
*What to do*: `role="alert"`, `--nf-state-error-surface` fill, rose ink, a `close` cross glyph, a bold verdict line above the message. `components/ui/Field.tsx:145-156` already does all of this correctly for a field error; reuse the treatment.
*Why it matters*: A person who has just tried to move money cannot tell a failure from a tip. *Impact*: Four wallet flows. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-011. A failed bank lookup is painted in the pending colour.**
*File*: `(app)/wallet/WalletDeck.tsx:500-504`, `text-[var(--nf-state-warning)]`.
*What is wrong*: `--nf-state-warning` resolves to `--nf-cyan-400`, which is the token `--nf-status-pending` is defined as. "We could not find that account" is drawn in the colour that means "still going through".
*What to do*: `--nf-state-error`.
*Why it matters*: Same class of defect the lead fixed in `PayPanel` on 15 September, one file away. *Impact*: Withdrawal path. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-012. Withdraw and transfer succeed into a dead end.**
*File*: `WalletDeck.tsx:417-437` and `:530-549`.
*What is wrong*: Both success states replace the form body with a receipt and offer **no action at all**. The only way out is the X in the drawer's header corner. No "Done", no "View receipt", no "View history". The withdraw copy is the best consequence line in the product and it hands the reader nowhere to go.
*What to do*: Two actions, per the `ResultSheet` spec. Primary "View receipt", quiet "Done". Add the reference and the date to the fact block, because a receipt with no reference cannot be traced.
*Why it matters*: The best moment in the wallet ends in a shrug. *Impact*: Two flows. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-013. The drawer header puts a decorative object at the same size and on the same baseline as the close button.**
*File*: `WalletDeck.tsx:234-246`.
*What is wrong*: A 52px `BrandIcon` sits immediately beside a 40px close button in one flex row. `BalanceCard`'s own comment records removing exactly this mistake from the card two rows up: "Three things of one size in a line read as three controls, so the decoration was being scanned as a button that does not respond." The same pattern is live in the drawer. `h-13 w-13` is also 52px, off the documented 8px `BrandIcon` grid.
*What to do*: Remove the object. The sheet already has a title. If it stays, move it above the title at 72px and give the close button the corner alone.
*Why it matters*: The one screen where a person is about to move money should not have a decoy button next to Close. *Impact*: Four wallet drawers. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-014. The wallet's action tile marks are semantically wrong and two are duplicates.**
*File*: `WalletDeck.tsx:44-84` `TILES`.
*What is wrong*: `fund` and `crypto` both use `wallet-secure`. `withdraw` uses `shield-lock`, a padlock, to mean "take your own money out". `transfer` uses `user-check`, a verified person, to mean "send money".
*What to do*: `wallet-plus`, `exchange`, `wallet-out`, `transfer-arrow` from the new set.
*Why it matters*: The marks appear at 52px in each drawer header and carry no information today. *Impact*: Wallet. *Effort*: S. *Risk*: Low. *Priority*: **Nice-to-have**.

**F2-015. The one real wallet on the platform shows zeroes under a "Last 30 days" heading.**
*File*: `BalanceCard.tsx:40-77` `flowsLast30Days` and `sparklinePoints`.
*What is wrong*: Verified against the database. The single wallet holds a ₦1,000 deposit from 9 August and a ₦1,000 **FAILED** withdrawal from 10 August. Both are past the 30-day cutoff, so "In" and "Out" both render ₦0.00. `sparklinePoints` filters to COMPLETED, finds one point, and returns null. So the production balance card is: ₦1,000.00, "In +₦0.00", "Out -₦0.00", no chart, and a "Breakdown" chip that opens the escrow promise from F2-001.
*What to do*: When both flows are zero, do not print two zeroes under a period heading. Say "No movements in the last 30 days" as one line. When there are fewer than two settled points, say "Your balance history appears once you have made a few movements" rather than silently omitting the chart.
*Why it matters*: This is the primary state today and it reads as broken rather than empty. *Impact*: Every new wallet. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

##### C. Checkout and payment

**F2-016. A failed payment verification is reported as "Payment check" in neutral grey.**
*File*: `checkout/[bookingId]/PaymentReturn.tsx:166-175`.
*What is wrong*: The heading is the literal string "Payment check" in `--nf-content-primary`. The message is in `--nf-content-muted`. It sits in a plain `nf-card` with `role="status" aria-live="polite"`. There is no rose, no mark, no verdict, no statement of whether money left the card, no retry and no support route. The success branch three lines above is emerald with a consequence line. A person who has just given their card details and come back to this cannot tell whether they have been charged.
*What to do*: `ResultSheet state="failed"`. **Write it as:** verdict "Payment not confirmed". Fact: the amount and the property. Consequence: "Your card has not been charged. If money did leave your account, it returns within 24 hours." Actions: "Try again" primary, "Get help" quiet. `role="alert"`.
*Why it matters*: It is the moment the platform earns or loses trust, and today it says nothing. *Impact*: Every card payment that fails verification. *Effort*: M. *Risk*: Low. *Priority*: **Critical**.

**F2-017. Three pending states on the money path are a `loading` prop on a button.**
*File*: `PayPanel.tsx`, `Phase` union `card-starting`, `card-redirecting`, `wallet-paying`; rendered only at `:194` and `:227`.
*What is wrong*: No sentence, no amount, no mark, no live region. Between tapping "Pay ₦1,250,000 from my wallet" and anything happening, the person sees a spinner inside a button. This is the largest amount of money on the platform.
*What to do*: `ResultSheet state="pending"` with the amount and the consequence. The wallet already does this properly four times over; checkout does it nowhere.
*Why it matters*: The brief names this the most anxious second in the product. *Impact*: Every payment. *Effort*: M. *Risk*: Low. *Priority*: **Critical**.

**F2-018. Neither money path has a timeout.**
*File*: `PayPanel.tsx` `payByCard` and `payFromWallet`; `PaymentReturn.tsx` `useEffect`.
*What is wrong*: If `startCardCheckout` hangs, `busy` stays true forever, **both** pay buttons are disabled with no explanation, and there is no cancel. If `window.location.assign` is slow or blocked, `card-redirecting` spins indefinitely. If `settleCardPayment` hangs, "Confirming your payment" runs forever. On a Lagos network these are ordinary, not edge cases.
*What to do*: A 10-second soft message and a 25-second terminal state on all three. The soft message says "Still going. Your money has not moved." The terminal state offers a retry and says plainly what is and is not known.
*Why it matters*: A person staring at a frozen payment screen for two minutes assumes the worst and calls their bank. *Impact*: Every payment on a poor connection, which is most of them. *Effort*: M. *Risk*: Low. *Priority*: **High**.

**F2-019. The payment decision scrolls away, and the primitive built to stop that is used once.**
*File*: `checkout/[bookingId]/page.tsx` renders `PayPanel` in the document flow at `Reveal delay={140}`. `components/ui/ActionBar.tsx` is imported by exactly one file, `components/app/listing/ListingStickyBar.tsx`.
*What is wrong*: `ActionBar`'s own docstring names the problem: "the listing wizard's footer was fully solid, **checkout had no pinned bar at all**". The primitive was built and checkout was never migrated. Today the pay buttons sit below a summary card, below a step bar, below a countdown, and scroll out of view.
*What to do*: Pin the primary pay action in an `ActionBar` with the total beside it. Keep the two methods in the body; pin the chosen one.
*Why it matters*: Two of the twelve primitives are effectively unused and one of them is the one that fixes the money screen. *Impact*: Checkout. *Effort*: M. *Risk*: Low. *Priority*: **High**.

**F2-020. A cancelled booking and a missing booking are reported with a tick, in the pending colour.**
*File*: `checkout/[bookingId]/page.tsx:100-104` and `:258-262`, both `variant="warning" icon="calendar-check"`.
*What is wrong*: `calendar-check` is a calendar with a **tick**. It is used as the mark for "We could not find that booking" and "This booking was cancelled", inside a cyan glow. Two contradictory signals on the same screen.
*What to do*: `ResultSheet state="failed"` with `seal-cross` for the missing booking, `state="expired"` with `clock-expired` for the cancellation. A cancellation is terminal, not a warning, and it is not a failure either.
*Why it matters*: Rule 16's sibling problem: a success mark borrowed because it was the closest thing available. *Impact*: Two checkout branches. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-021. The hold clock ticks seconds for 48 hours, and then tells you to pay anyway.**
*File*: `checkout/[bookingId]/HoldCountdown.tsx:78` and the expired branch at `:69-72`, against `PayPanel` still rendering live pay buttons below it.
*What is wrong*: Two things. First, `{left.h}h {pad(left.m)}m {pad(left.s)}s` runs a per-second counter across a two-day window on a payment screen. Nobody needs second precision over 48 hours, and a ticking clock beside a pay button is a pressure device. Rule 14. Second, when it expires the screen says "Paying now may not succeed, so check the stay is still open before you try" and then offers the pay button regardless, in neutral grey.
*What to do*: Show "Held until Thursday 14:20" and switch to a live countdown only under one hour. On expiry, disable the pay action or state exactly what happens to the money if the charge lands against a released hold, and paint the notice in the attention colour rather than neutral.
*Why it matters*: An urgency counter is a dark pattern; an uncertain pay button on an expired hold is worse. *Impact*: Every pending booking. *Effort*: M. *Risk*: Low. *Priority*: **High**.

**F2-022. `result.error` reaches the user unfiltered.**
*File*: `PayPanel.tsx:104` and `:121`, `PaymentReturn.tsx:131`.
*What is wrong*: Whatever string the server action puts in `error` is rendered verbatim to somebody who has just tried to pay rent. The `ActionResult` envelope makes this easy and nothing constrains what goes in it.
*What to do*: Map the known refusal codes to written sentences at the boundary, and fall back to one honest sentence that always says whether money moved. **Never "Something went wrong."**
*Why it matters*: The brief names this explicitly. *Impact*: Every payment failure. *Effort*: M. *Risk*: Low. *Priority*: **High**.

**F2-023. "Card payment switches on the moment payment keys land" is shown to a paying customer.**
*File*: `PayPanel.tsx:211`.
*What is wrong*: Infrastructure jargon on the checkout screen. See F2-003; this instance is the most expensive because the person is trying to pay.
*What to do*: "Card payment is not available right now. Your dates stay held and nothing has been charged. Pay from your wallet, or try again shortly."
*Why it matters*: Trust. *Impact*: Checkout. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

##### D. The confirmation component

**F2-024. `MomentScreen` has no failure variant, so eight failure surfaces paint the pending colour.**
*File*: `components/app/MomentScreen.tsx:4` `export type MomentVariant = "success" | "brand" | "warning"`; `app/css/chips.css:598-606`.
*What is wrong*: `.nf-moment--warning { --nf-moment-color: var(--nf-state-warning) }`, `--nf-state-warning: var(--nf-cyan-400)` (`#00C8FF`), and `--nf-status-pending: var(--nf-state-warning)`. They are the same token. The eight surfaces are listed at rows 24 to 31 of §5.4. `--nf-state-error` exists, resolves to rose, and is reachable from nowhere in this component.
*What to do*: `ResultSheet` per §6. Until it lands, add `.nf-moment--failed { --nf-moment-color: var(--nf-state-error) }` and move all eight.
*Why it matters*: This is the named headline defect and eight is the number. *Impact*: Eight screens including three error boundaries. *Effort*: S for the stopgap, L for the system. *Risk*: Low. *Priority*: **High**.

**F2-025. `MomentScreen` passes a `state` prop that `BrandIcon` silently discards.**
*File*: `MomentScreen.tsx:39` `<BrandIcon name={...} size={88} state="confirmed" />` against `BrandIcon.tsx:240-252`.
*What is wrong*: `tile` defaults to `false`, so the untiled branch returns early at line 240 and `data-state` is never applied; it only appears in the tiled branch at line 257. The platform's confirmation component has been passing a dead prop. Nothing catches it because `state` is optional.
*What to do*: Either honour `state` in both branches or remove the prop. It is also undocumented in `docs/ICON_SYSTEM.md`, along with `tile` and `index`.
*Why it matters*: A silent no-op on the confirmation path. *Impact*: Every `MomentScreen`. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-026. `.nf-moment` is a full-height centred surface rendered inside a scrolling document.**
*File*: `chips.css:526-535`, `min-height: 60vh; justify-content: center`, used inline at `checkout/[bookingId]/page.tsx:244` beneath the booking summary.
*What is wrong*: The confirmation for a completed payment is below a card the person has already read, so it must be scrolled to. A moment you scroll to is not a moment.
*What to do*: `ResultSheet` over the page.
*Why it matters*: It is the structural reason the confirmations do not land. *Impact*: Checkout and review. *Effort*: L, subsumed by §6. *Risk*: Low. *Priority*: **High**.

**F2-027. "Under review" and "Rejected" have no mark, and three error boundaries use a padlock.**
*File*: `(app)/error.tsx:44`, `admin/error.tsx:38`, `agent/error.tsx:42`, all `icon="shield-lock"`.
*What is wrong*: A padlock shield on "That screen did not load" reads as "your account is locked", which is a far more alarming message than the one intended.
*What to do*: `alert-triangle`.
*Why it matters*: The wrong mark says something the copy does not. *Impact*: Three boundaries. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

##### E. The status vocabulary

**F2-028. `toneForStatus` maps REFUNDED to danger.**
*File*: `components/ui/StatusPill.tsx:157`.
*What is wrong*: `transaction_status` carries REFUNDED and `wallet_entry_kind` carries `refund`. A refund is money **returning to the user**. Painting it rose, under a severity rule that says danger means "failed, refused or withdrawn; someone lost something", tells a person their refund failed.
*What to do*: `info`. Note that `BalanceBreakdownSheet`'s own `STATE_TONE` already maps REFUNDED to `neutral`, so the two maps disagree.
*Why it matters*: Money meaning, on the ledger and in the admin money screen. *Impact*: Wallet, admin, agent. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-029. Eleven live enum values fall through `toneForStatus` to `neutral`, including three that mean something bad.**
*File*: `StatusPill.tsx:126-167`, checked value by value against the live catalogue.
*What is wrong*: `inspection_state.DECLINED`, `.WITHDRAWN`, `.REQUESTED` and `.PROPOSED`; `moderator_application_status.DECLINED` and `.WITHDRAWN`; `social_status.LIVE`, `.HELD` and `.REMOVED`, so **all three social moderation states render identically grey**; `area_status.PROPOSED`; `event_status.LIVE`, `.HELD` and `.REMOVED`; six of the eight `escrow_state` values; all three `availability_status` values; all three `alert_severity` values. The docstring says danger covers "failed, refused or **withdrawn**" and `WITHDRAWN` appears nowhere in the switch.
*What to do*: Add the missing cases. Also split SUBMITTED from UNDER_REVIEW, which currently share `warning` so two distinct queue stages look identical to an operator, and move `MORE_INFO_REQUIRED` out of `info`, whose stated meaning is "nothing is owed by the user" when that status means everything is owed by the user.
*Why it matters*: A chip that cannot render one of its real values is a defect, and you only find it by reading the enum. Three of these are moderation states on the admin panel. *Impact*: Admin, agent, wallet. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-030. `--nf-state-info` and `--nf-state-warning` are two adjacent cyans and read as one state.**
*File*: `packages/design-tokens/src/tokens.css:339,341`. Dark: warning `#00C8FF`, info `#38BDF8`. Light: warning `#0E6E8C`, info `#0369A1`.
*What is wrong*: On the styleguide's status pill row, `warning` and `info` and `brand` are three pills that a reader cannot tell apart at a glance. `--nf-sky-400` (`#38BDF8`) is also the exact colour `BalanceCard`'s own comment condemns as "a sky blue that belongs to no token, sits outside the brand family".
*What to do*: One of two answers. Either collapse `info` into `brand` and accept five tones, or give `info` a distinctly deeper blue from the electric family and reserve the bright cyan for attention only. Recommend the first: the severity rule already struggles to explain the difference between "waiting on someone" and "in motion".
*Why it matters*: Rule 13 cannot be satisfied by hue when two of the hues are the same hue. *Impact*: Every status surface. *Effort*: M. *Risk*: Medium, it restyles pills everywhere. *Priority*: **Medium**.

**F2-031. The status pill's non-colour signal is an identical dot in all six tones.**
*File*: `StatusPill.tsx:99`.
*What is wrong*: The docstring claims "every pill still carries a non-colour mark and a colour-blind reader is never left with hue as the only signal". The mark is the same `rounded-full bg-current` dot in all six tones. In greyscale the six pills differ only by their word, which is fine, but the dot is decoration presenting itself as an accessibility control.
*What to do*: Either give each tone a distinct shape (filled dot, ring, cross, hourglass, bar) or drop the dot and rely honestly on the label. Recommend the shapes: it is cheap, it works in greyscale, and it maps onto the new mark set.
*Why it matters*: Rule 13 taken seriously. *Impact*: Platform-wide. *Effort*: M. *Risk*: Low. *Priority*: **Medium**.

**F2-032. On the paper theme, pending is a dull teal with no energy.**
*File*: `tokens.css:1125` `--nf-state-warning: #0E6E8C` in light.
*What is wrong*: The contrast reasoning is sound, but the result is that the platform's "bright cyan for attention" becomes the flattest colour on the light screen, and pending inherits it. A pending payment in daylight is the least noticeable thing on the page.
*What to do*: Keep `#0E6E8C` for text on white where AA demands it, and add a separate `--nf-status-pending-accent` for the mark and the fill that can be brighter, since an icon and a tinted surface are not small bold text.
*Why it matters*: Light is a designed twin and pending is the state that most needs to be seen. *Impact*: Light theme, everywhere. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

##### F. Icons and the glass language

**F2-033. Every content object on the default theme sits on a white sticker.**
*File*: `app/css/glass.css:462-492`, `.nf-brand-icon { mix-blend-mode: multiply }` and `.nf-brand-icon-ground { background: var(--nf-icon-ground); border-radius: 26% }`, with `--nf-icon-ground: #F5F7FD` in dark and `transparent` in light (`tokens.css:325` and `:1004`).
*What is wrong*: The artwork is opaque RGB on white and multiply against a dark canvas returns the canvas, so a near-white plate has to be painted behind every object for it to be visible at all. **On the product's default theme, every `BrandIcon` is a white app-icon-shaped square on navy.** I have it in four screenshots: the wallet and inbox empty states, the notifications bell, and three stacked down the left of the "How booking works" card on `/bookings`. In light theme the same objects composite cleanly and look correct.
*What to do*: This is the strongest possible argument for the `BrandIcon` replacement in `HANDOFF_03` §4. `CF5A4150` and `C0F67033` are a matched dark and light pair that need no multiply trick and no ground plate. The success criterion for the swap is that `--nf-icon-ground` can be deleted. `docs/BRAND_MARKS.md` §1's instruction to render on "pure white background" is what forces this, and it is the instruction `HANDOFF_03` §1.2 already declares wrong.
*Why it matters*: It is the single most "template" element on the dark theme and it repeats on every empty state, every drawer header, every list row that carries an object. *Impact*: Platform-wide, default theme. *Effort*: L, and it is already planned. *Risk*: Medium. *Priority*: **High**.

**F2-034. The banned tinted icon tile is live in at least five places.**
*File*: `admin/_components/AccessScreen.tsx:53-58` (`rounded-full`, `--nf-brand-primary-soft`, `UiIcon key`), `admin/_components/ui.tsx` `QueueEmpty`, `QueueUnavailable`, `QueueAlarm` and `CheckRow` (all `place-items-center rounded-full` with a state wash).
*What is wrong*: `docs/ICON_SYSTEM.md` records that "a tinted tile behind a glyph came from the retired reference brief, not from this system", citing `RECOMMENDATIONS.md` D-2 and D-5. Five live instances remain in admin. In the light theme, `--nf-brand-primary-soft` on white reads distinctly **lavender**, which is the one hue family the owner has banned by name. Screenshot at `/tmp/claude-0/shots/admin.light.390.png`.
*What to do*: Remove the plates. The glyph at 28px sitting on the card, with the size and air around it doing the work, is the answer `ComingSoon.tsx`'s own comment already arrived at: "what stops an object floating is SIZE and the air around it, not a box."
*Why it matters*: It is the retired brief's clutter, still being removed, and in light it produces a banned hue. *Impact*: Admin front door plus every queue state. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-035. Three `BrandIcon` call sites render below the documented floor.**
*File*: `PayPanel.tsx:256-258` at 16px, `checkout/[bookingId]/page.tsx` at 20px twice.
*What is wrong*: `docs/ICON_SYSTEM.md` says "below 24 the plinth in the artwork collapses into a coloured square". A 16px `BrandIcon` with `tile={false}` is a smudge beside the trust line at the bottom of the payment screen.
*What to do*: Use `UiIcon` at 16, which is what a 16px mark is for, or raise the object to 24. Do not mix the tiers in the row: check what else is in it first.
*Why it matters*: The binding document says not to. *Impact*: Checkout. *Effort*: S. *Risk*: Low. *Priority*: **Nice-to-have**.

##### G. Foundation and tokens

**F2-036. 150 non-neutral raw colour literals, and the brand glow is hand-written at fifteen alphas.**
*File*: `app/css/*.css`, 191 `rgb()` literals of which 150 are non-neutral. `rgb(12 57 239 / α)`, which is `#0C39EF`, the brand glow, appears roughly 60 times at about 15 different alphas across `buttons.css`, `ambient.css`, `glass.css` and `light.css`. `rgb(92 124 255 / α)`, which is `--nf-electric-300`, appears written by hand. `rgb(18 21 26 / α)` appears about 45 times, carrying the entire light theme's shadow and hairline language.
*What is wrong*: `scripts/check-css-tokens.mjs` states plainly that it "deliberately does NOT check raw rgb() and hex... Those literals are a real debt and they are counted rather than enforced". That reasoning is correct and I am not proposing to change the rule or disable anything. The problem is narrower and more serious: **the glow the founder wants to intensify is currently defined in sixty hand-written places**, and because it is written as the dark theme's hex, `.nf-btn--primary:hover { box-shadow: 0 0 24px rgb(12 57 239 / 0.45) }` fires the **dark theme's** glow on the light theme, where the brand blue is `#0C2FE8`.
*What to do*: Do not attempt all 150. Promote exactly the brand-coloured ones into a small glow scale, `--nf-glow-1` through `--nf-glow-4` plus `--nf-glow-brand-rim`, defined once per theme. Leave the white and black alphas alone: the checker's argument about them holds. That is roughly 60 replacements and it is the prerequisite for every "primary buttons lit from within" change in this brief.
*Why it matters*: "One elevation language shared with the icons rather than every surface inventing its own shadow" is not reachable while the glow is sixty literals. *Impact*: Foundation. *Effort*: M. *Risk*: Medium. *Priority*: **High**.

**F2-037. The ground is a blue field, not navy-black, and state panels lose their separation against it.**
*File*: the page background painted behind `.nf-shell`, visible on every rendered screen; the contradiction is visible on `/styleguide`.
*What is wrong*: The `--nf-surface-canvas` swatch, labelled "The page itself. Nothing sits behind it", is **visibly darker than the page it is printed on**. The actual ground is a strong blue gradient field that varies substantially down the page. At the "States" section the Warning panel (cyan fill) and the Info panel (blue fill) are almost indistinguishable from the ground behind them. Screenshot at `/tmp/claude-0/shots/hdr.settled.png`.
*What to do*: The direction asks for "navy-black that is not flat black, with the faintest gradient or field so the ground has dimension". The operative word is faintest. Reduce the field's amplitude until `--nf-surface-canvas` and the painted page agree to within a step, and keep the gradient as a very low-contrast vignette rather than a wash.
*Why it matters*: When the ground is brighter than the surfaces on it, the elevation language inverts and nothing reads as lifted. *Impact*: Every screen, dark theme. *Effort*: M. *Risk*: Medium. *Priority*: **High**.

**F2-038. The sheet backdrop is one hard-coded black for both themes.**
*File*: `app/css/overlays.css:67` `background: rgb(0 0 0 / 0.55)` with `backdrop-filter: blur(6px) saturate(120%)`.
*What is wrong*: 55% black over a white paper app is a much heavier dim than 55% black over navy. Light is a designed twin and its overlay should be lighter.
*What to do*: A `--nf-overlay-scrim` token, 0.55 in dark and around 0.32 in light.
*Why it matters*: Every sheet in the product, including all four wallet drawers and the proposed `ResultSheet`. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-039. One disabled recipe at `opacity: 0.38`, applied to loading buttons too.**
*File*: `app/css/buttons.css:91-97`; `components/ui/Button.tsx:212` `disabled={disabled || loading}`.
*What is wrong*: Consolidating seven disabled opacities into one was right. 0.38 is too low: on the styleguide, "Unavailable" is a mid grey-blue on a dim blue fill that does not read as text, and because a loading button is also disabled, **the spinner and the label on "Working" are barely legible at the exact moment a person needs feedback.** Screenshot at `/tmp/claude-0/shots/sg.dark.390.s06.png`.
*What to do*: Separate the two. Disabled stays low-contrast by design but should reach roughly 3:1 for the label. Loading keeps full contrast, loses only the press affordance, and shows the spinner at full strength.
*Why it matters*: "Whether a disabled one reads as disabled" is a named question in the brief, and the answer here is that a loading one reads as disabled. *Impact*: Every button. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-040. Primary and danger glow equally.**
*File*: `buttons.css:199-239`.
*What is wrong*: On the styleguide, `danger` at every size carries a rose halo of roughly the same strength as `primary`'s blue one. On a real screen the destructive action would be the most luminous object on it. "A screen where twelve things glow is a screen where the eye has nowhere to rest."
*What to do*: The glow belongs to the primary action, to focus and to the active state. Danger gets its colour and its weight and no bloom.
*Why it matters*: Restraint is the whole trick, and this is the one place two glows compete by construction. *Impact*: Every destructive action. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-041. Seven radii, and two of them are indistinguishable at 390px.**
*File*: the radius scale documented on `/styleguide`.
*What is wrong*: `xs` and `sm` render as visually identical rounded rectangles at phone size. Seven steps is more than the product can justify, and every extra step is another chance for a card to stop matching the card beside it, which is the exact failure the styleguide's own copy warns about.
*What to do*: Audit real usage and propose five. Do not do this before the glass work: the new material may want a different corner radius.
*Why it matters*: Foundation discipline. *Impact*: Foundation. *Effort*: M. *Risk*: Medium. *Priority*: **Nice-to-have**.

##### H. App shell and navigation

**F2-042. Two headers stack on every non-tab screen, and above `lg` the top one is empty.**
*File*: `components/app/AppShell.tsx`, the `<header className="nf-glass nf-glass--chrome nf-safe-top sticky top-0 z-40">` block with `h-[64px]`, rendered for every `!immersive` route; `components/app/PageHeader.tsx` rendered by the page beneath it.
*What is wrong*: On a signed-in wallet at 390px: 64px of sticky glass carrying a hamburger and a wordmark, then roughly 52px of `PageHeader` carrying a back button and "Wallet". Two chromes, 116px, before the balance. Screenshots confirm the stack on `/wallet`, `/bookings`, `/notifications` and `/settings`. Above `lg`, the shell's own comment says "this bar is empty by design", and it still costs 64px of sticky height and a `backdrop-filter` repaint on every scroll frame.
*What to do*: Two changes. On a phone, merge them: the hamburger and the wordmark move into the `PageHeader` row on non-tab routes, or the shell header hides on any route that renders a `PageHeader`. Above `lg`, do not render the header at all when it has no children.
*Why it matters*: 14% of a phone viewport spent twice saying where you are, on the screens people spend the most time on. *Impact*: Every non-tab screen. *Effort*: M. *Risk*: Medium, it touches the shell. *Priority*: **High**.

**F2-043. `/saved` shows the dock with nothing active, which is the bug the dock's comment says was fixed.**
*File*: `components/app/MobileTabBar.tsx:66-81` `TAB_BAR_ROUTES` includes `/saved`; `tabs` and `island` never produce a `/saved` href. Also signed out, `/messages` is on the list but the messages tab is omitted, so the dock renders on `/messages` with nothing highlighted. I have this in a screenshot: `/tmp/claude-0/shots/messages.dark.390.png`.
*What is wrong*: The docstring says the dock "was rendering on every non-immersive screen... with nothing highlighted, occupying the bottom of the screen and answering no question". Two routes still do exactly that.
*What to do*: Remove `/saved`, and make the route list signed-in aware so `/messages` leaves the list for a guest.
*Why it matters*: Rendered proof of a fixed bug that is not fixed. *Impact*: Two routes. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-044. `showsTabBar` is an exact pathname match, so every sub-route loses the whole bottom navigation.**
*File*: `MobileTabBar.tsx:83-85` `return TAB_BAR_ROUTES.includes(pathname)`.
*What is wrong*: `/around/lekki`, `/u/someone`, `/post/123` and every other descendant of a tab destination drops the dock entirely. Navigating one level down inside a tab removes the navigation that got you there. `AdminNav`'s `isActive` already does this correctly with `pathname.startsWith(\`${href}/\`)` twenty files away.
*What to do*: Prefix matching with an explicit deny list for the immersive routes, which is what `immersive` already computes.
*Why it matters*: Gesture and orientation. A tab bar that disappears one tap in teaches people not to trust it. *Impact*: Several sub-routes, some in Agent 1's scope. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-045. `/messages/new` renders in immersive mode with no gutter and no top inset.**
*File*: `AppShell.tsx` `const immersive = active === "/assistant" || /^\/messages\/[^/]+$/.test(active)` matches `/messages/new`; `(app)/messages/new/page.tsx:52-53` renders `<div className="mx-auto max-w-2xl">` with no horizontal padding.
*What is wrong*: Immersive drops the page gutter and the top padding. The `Bridge` has none of its own, so the back button sits at exactly x=0, y=0 with its tap target clipped by the screen edge, and on a notched phone it is under the status bar. Screenshot at `/tmp/claude-0/shots/messages_new_listing_abc.dark.390.png`. The `PageHeader` is also titled **"Inbox"** on a screen that is not the inbox.
*What to do*: Tighten the regex to exclude `new`, or give the Bridge the gutter. Retitle it "Message the agent".
*Why it matters*: "The single most important hop in the messaging journey", by its own docstring, with a clipped back button. *Impact*: Every first contact with an agent. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-046. The dock labels three of five destinations only when you are already on them.**
*File*: `MobileTabBar.tsx:141-205`. Inactive labels collapse to zero width; `title` does nothing on touch.
*What is wrong*: A person sees one word and three unlabelled glyphs plus a detached person pill. The Around/Feed tab is a `grid` glyph, which is unguessable, and the fifth item is visually a different class of object from the other four.
*What to do*: This is a deliberate iOS-flavoured choice and it is defensible on four items. It is not defensible for `grid` meaning "Around". At minimum change that glyph. Better: label all four permanently at 11px. I would rather a slightly denser bar than a bar three of whose destinations have no name.
*Why it matters*: Rule 16's spirit, and the product's own terminology work is wasted if the words are never shown. *Impact*: Primary navigation. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-047. The unread marker is brand blue on a brand blue island.**
*File*: `MobileTabBar.tsx:199-204` `bg-[var(--nf-brand-primary)]`.
*What is wrong*: A 10px dot in the same hue as the surface it sits on, on the one control that carries the unread state on a phone. There is no count and no shape difference.
*What to do*: Cyan, which is the attention colour, per rule 9.
*Why it matters*: The shell's own comment justifies removing the bell on the grounds that "the tab bar's profile island carries the marker". It carries it in a colour nobody will see. *Impact*: Notifications discovery. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-048. `PageHeader` truncates the title to two lines and hard-truncates the subtitle to one.**
*File*: `components/app/PageHeader.tsx:317` `<h1 className="nf-h2 [overflow-wrap:anywhere] line-clamp-2">`, and `:322-324` where the `subtitleHref` branch applies `line-clamp-2` **and** an inner `truncate`.
*What is wrong*: The comment four lines above says "Neither of these truncates any more. A header that reads 'Places on R...' tells somebody nothing and cannot be recovered from, and the owner has already caught this once." `line-clamp-2` truncates with an ellipsis past two lines, and `truncate` on the inner span is `text-overflow: ellipsis; white-space: nowrap`. The subtitle is the **property name** on a message thread, which is the context for a negotiation about a flat.
*What to do*: Remove both. `overflow-wrap: anywhere` with no clamp. Two lines is the intended ceiling; let it be a soft one.
*Why it matters*: Rule 16, in the component whose comment quotes rule 16. *Impact*: Every app screen. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-049. A bare `inline-block` anchor collapses to a 32px box and stacks one word per line.**
*File*: `admin/_components/AccessScreen.tsx:49-51` (the logo link) and `:69-76` (the "Sign in with another account" link), inside `<main className="flex min-h-dvh items-center justify-center">` with `<div className="nf-card w-full max-w-md ... text-center">`.
*What is wrong*: Measured, not inferred. The link computes to `width: 32px, height: 101px` inside a 308px container and renders as **Sign / in / with / another / account**, five lines. Reproduced on fresh page loads at 390, 430, 768 and 1280, in both themes. No CSS rule sets a width; class bisection shows removing `inline-block` restores 179px, a fresh `inline-block` probe in the same parent measures 179px, and forcing `width: auto` inline gives 179px. The logo anchor is also 32px wide with its content overflowing, which is why the lockup is visibly right of centre. Screenshots: `/tmp/claude-0/shots/admin.dark.390.png` and `admin.light.390.png`. I believe the mechanism is a stale shrink-to-fit inside the `min-h-dvh` flex container, but I did not root-cause it and the fix does not depend on doing so.
*What to do*: Give both anchors `block w-fit mx-auto` instead of `inline-block`, or wrap each in a div. Then grep for other bare `inline-block` anchors inside `min-h-dvh` flex containers.
*Why it matters*: It is the first thing anybody sees at `/admin`, and it is unambiguously broken. *Impact*: The console front door, all three refusal states. *Effort*: S. *Risk*: Low. *Priority*: **High**.

##### I. Primitives

**F2-050. `Sheet`'s upward rubber band is dead code.**
*File*: `components/ui/Sheet.tsx:174` `setOffset(raw < 0 ? raw / 4 : raw)` against `:219` `style={{ "--nf-sheet-y": \`${Math.max(0, offset)}px\` }}`.
*What is wrong*: The resistance computes a negative offset and the style clamps it to zero, so dragging a sheet upward past its tallest detent does nothing visible. The comment says it "resists rather than tearing off the top"; it does neither.
*What to do*: Either apply the damped negative offset or delete the branch and the comment.
*Why it matters*: Small, but it is the primitive that carries the iOS feel the file exists to deliver. *Impact*: Every sheet. *Effort*: S. *Risk*: Low. *Priority*: **Nice-to-have**.

**F2-051. `Sheet` computes its detents from `window.innerHeight`, not the visual viewport.**
*File*: `Sheet.tsx:116` and the dismissal threshold at `:184`.
*What is wrong*: With the iOS keyboard open, `innerHeight` does not shrink, so the dismiss threshold is computed against a viewport that is no longer visible. The wallet's withdraw and transfer forms are exactly this case: a form sheet with a focused input.
*What to do*: Read `window.visualViewport?.height` with `innerHeight` as the fallback, and recompute on `visualViewport` resize.
*Why it matters*: Money forms inside sheets on a phone. *Impact*: Four wallet drawers. *Effort*: S. *Risk*: Low. *Priority*: **Medium**. **Unverified on a real device.**

**F2-052. `Sheet` focuses the first focusable, which in every wallet drawer is Close.**
*File*: `Sheet.tsx:149-150` `node.querySelector<HTMLElement>(FOCUSABLE)` against `WalletDeck.tsx:238-245`, where the close button precedes the form in DOM order.
*What is wrong*: Opening "Add money" puts focus on "Close". A screen reader user hears "Add money to your wallet, dialog" then "Close, button".
*What to do*: An `initialFocus` ref prop on `Sheet`, defaulting to the first focusable but overridable. For `ResultSheet` it is the primary action; for a form sheet it is the first field.
*Why it matters*: First focus is the sheet's opening sentence. *Impact*: Every sheet. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-053. Two of the twelve primitives are effectively unused.**
*File*: `components/ui/Table.tsx`, imported by `agent/earnings/EarningsWorkspace.tsx` and `agent/analytics/AnalyticsWorkspace.tsx` and nothing else. `components/ui/ActionBar.tsx`, imported by `components/app/listing/ListingStickyBar.tsx` and nothing else.
*What is wrong*: The admin panel, which is nineteen list surfaces and the densest tabular part of the product, uses `Table` **zero times**. Checkout, which is the money decision, uses `ActionBar` zero times.
*What to do*: Migrate the admin queues onto `Table` (see F2-057) and checkout onto `ActionBar` (F2-019). If `Table` turns out not to fit the queues, that is the finding and it should be rebuilt rather than left as a primitive nothing uses.
*Why it matters*: A design system that the densest surface in the product ignores is not a design system. *Impact*: Admin and checkout. *Effort*: L. *Risk*: Medium. *Priority*: **High**.

**F2-054. `Reveal` gates content behind an IntersectionObserver and runs a per-element blur.**
*File*: `components/site/Reveal.tsx:57-69`, `app/css/animation.css:131-196`.
*What is wrong*: Two things. First, `/settings` renders twelve stacked `Reveal` wrappers over 3,900px; anything the observer has not fired for is at `opacity: 0`, which is why a full-page capture of the settings screen is mostly empty below the fold. Anything that does not run the observer (print, a webview with it stubbed, an automated capture) sees a blank page. Second, `@keyframes nf-reveal-in` includes `filter: blur(3px)`, and `.nf-reveal` carries a permanent `will-change: opacity, transform` until shown, which the file's own comment records having previously trapped the wallet drawer by creating a fixed-position containing block. **I measured the cost and it is not detectable** (see §4), so this is about correctness and restraint, not speed.
*What to do*: Render at `opacity: 1` and animate downward from a `data-shown="false"` that JavaScript sets on mount, so the no-JS and no-observer state is legible. Drop `will-change` from the base rule. And use `Reveal` far more sparingly: twelve staggered fade-ups on a preferences list is noise, not choreography.
*Why it matters*: Content that only exists if an observer fires is content that sometimes does not exist. *Impact*: Settings, admin, several app pages. *Effort*: M. *Risk*: Medium. *Priority*: **Medium**.

##### J. The admin panel

**F2-055. Nineteen destinations, one search input, zero filters, zero pagination.**
*File*: all of `app/admin/*/page.tsx`. Only `admin/bookings/page.tsx:148` has `type="search"`. No page reads a filter parameter, applies a `.range()`, or offers a page control.
*What is wrong*: The console's job is to find one row among many and act on it. Today it can only find one row in `/admin/bookings`. At zero rows nobody notices. At a thousand rows the console stops working, and `audit_log` already holds 482.
*What to do*: One shared queue frame: a search field, a status `Segmented` bound to the real enum for that queue, a date range, and cursor pagination. Build it once in `_components` beside `QueueHeader`, which is already the shared frame for the heading.
*Why it matters*: It is where operations lives or dies. *Impact*: All nineteen. *Effort*: L. *Risk*: Medium. *Priority*: **High**.

**F2-056. Every empty queue shows a green tick meaning "all clear", and none of them has ever had a row.**
*File*: `admin/_components/ui.tsx` `QueueEmpty`, green wash with `UiIcon name="verified"`, used by seventeen of the nineteen pages.
*What is wrong*: Verified against the database: `agent_applications` 0, `reports` 0, `risk_alerts` 0, `message_flags` 0, `escrows` 0, `bookings` 0, `transactions` 0, `payout_accounts` 0, `agent_documents` 0. On day one an operator opens the console and is congratulated nineteen times for clearing work that never arrived. "Nothing has ever arrived here" and "you have cleared everything" are different facts and the second one is a claim.
*What to do*: Two states on `QueueEmpty`, discriminated by whether the table has ever held a row for this queue. The never-used state is neutral, carries no tick, and says what will appear here and what triggers it. This is the primary state of the entire console today and it deserves to be designed as such.
*Why it matters*: It is the first impression of the operator product and it is currently a lie of omission. *Impact*: Seventeen pages. *Effort*: M. *Risk*: Low. *Priority*: **High**.

**F2-057. A read failure is drawn as a bell in the pending colour.**
*File*: `admin/_components/ui.tsx` `QueueUnavailable`, `WARNING_WASH` with `UiIcon name="bell"`. Also `CheckRow`'s failing branch, same wash, same bell.
*What is wrong*: `WARNING_WASH` is `--nf-state-warning-surface`, which is cyan, which is pending. A queue that could not load and an admission check that did not pass are both failures and both render in the colour that means "in flight". `DANGER_WASH` exists in the same file and is used only by `QueueAlarm`.
*What to do*: `QueueUnavailable` takes `DANGER_WASH` and a cross, and says what the operator can do. `CheckRow`'s failing branch takes `DANGER_WASH` and a cross.
*Why it matters*: Same class of defect the lead fixed in `PayPanel`, three times over, on the operator surface. *Impact*: Nineteen queues. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-058. The payment reference is truncated on the money screen.**
*File*: `admin/money/page.tsx:56` and `:145`, `admin/payments/SweepHolds.tsx:160`, `admin/payments/page.tsx:128`, all `class="... truncate font-mono text-[0.6875rem] ..."`.
*What is wrong*: The reference is the only string an operator can trace a payment by with Paystack or Yellow Card. It is rendered at 11px monospace and clipped with an ellipsis. So is the wallet id. The screen cannot do the one thing it exists for.
*What to do*: Never truncate. Wrap with `overflow-wrap: anywhere`, raise to 13px, `user-select: all`, and add a copy control. `ReceiptActions` already has the copy-to-clipboard pattern.
*Why it matters*: Rule 16 on the operator's money screen. *Impact*: Three admin screens. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-059. The admission checklist truncates its evidence.**
*File*: `admin/_components/ui.tsx:341` `<span className="nf-caption block truncate">{detail}</span>`.
*What is wrong*: `CheckRow`'s own docstring calls this "the evidence". An operator deciding whether to admit an agent cannot read it.
*What to do*: Wrap, never clip.
*Why it matters*: Rule 16 on a decision surface. *Impact*: The agent admission queue. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-060. Four admin surfaces print raw database values as chip labels.**
*File*: `admin/money/page.tsx:61` `label={entry.status}` gives `PENDING`, `COMPLETED`, `FAILED`, `REVERSED` in shouting caps. `admin/kyc/page.tsx:218` `label={doc.reviewStatus}` gives raw lowercase `pending`, `approved`, `rejected`. `admin/reports/page.tsx:47` `label={report.targetType}` and `:52` `label={report.category.replace(/_/g, " ")}`. `agent/settings/page.tsx:154` `<dd>{agent.status}</dd>`.
*What is wrong*: `adminUi` provides `statusLabel`, which reads `t.admin.common.status` and exists for exactly this. Passing `label` explicitly defeats it, because `StatusChip` only falls back to `statusLabel` when `label` is undefined.
*What to do*: Drop the explicit `label` and let `statusLabel` resolve it. Add the missing dictionary keys.
*Why it matters*: The console is part of Vallo by its own file header, and it is showing the operator the schema. *Impact*: Four screens. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-061. The console has nineteen destinations and the documentation says fourteen.**
*File*: `app/admin/*/page.tsx`, nineteen of them; `AdminNav.tsx:17` says "nineteen targets". `docs/PRODUCT.md` §4 and `docs/HANDOFF_02_PLATFORM.md` both say fourteen.
*What is wrong*: A documented count that is five short. Also `labelFor` falls back to `item.key`, so a destination missing from the dictionary renders its **raw key** as its label, and the file's own comment says four money sections are already in that state ("carry an English label of their own until packages/i18n gains their keys"). Four of nineteen console destinations are untranslated.
*What to do*: Correct the docs to nineteen. Add the four dictionary keys.
*Why it matters*: The brief and PRODUCT.md both repeat the wrong number. *Impact*: Documentation and four labels. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-062. The console's navigation labels truncate, and the queue count badge is invisible on the active row.**
*File*: `AdminNav.tsx:105` `<span className="flex-1 truncate">`; `:106-109` the badge at `bg-[var(--nf-brand-primary)]` against an active row at `color-mix(brand-primary 22%)`.
*What is wrong*: Nav labels clip. The count badge is the same hue as the active row's fill, so the number of items waiting on the destination you are standing on is the hardest one to see. And a work-waiting count in brand blue says "brand", not "attention".
*What to do*: No truncation. Badge in cyan, stepping to rose when the oldest item is past its due grade, which `_components/due.ts` already computes.
*Why it matters*: The count badge is the whole reason an operator scans the rail. *Impact*: Console navigation. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-063. On a phone the console is nineteen chips in one horizontal scroller, with the bands discarded.**
*File*: `AdminNav.tsx`, `AdminRail` is `hidden lg:block` and the phone form is a flat `ChipRow` over `ADMIN_NAV`.
*What is wrong*: `nav.ts` spent paragraphs arguing an order, the rail made it visible as five bands, and the phone throws that away and asks an operator to swipe past eighteen chips to reach Switches.
*What to do*: Either a grouped bottom sheet reached from one "Sections" control, or preserve the bands as sticky headings inside the scroller. The console is used on a phone at eleven at night, by the file's own account.
*Why it matters*: The desktop got the thinking and the phone got a scroller. *Impact*: Console on mobile. *Effort*: M. *Risk*: Low. *Priority*: **Medium**.

**F2-064. Stat tiles carry their meaning in colour alone.**
*File*: `admin/_components/ui.tsx` `Stat`, `STAT_VALUE_COLOUR` applied as an inline `color` on the value, `nf-overline` neutral label above.
*What is wrong*: A `danger` stat is a rose number and a `warning` stat is a cyan number, with nothing else different. On the money and payments screens these are the headline figures an operator scans. Rule 13.
*What to do*: A small tone mark beside the label, or a left rule in the tone, or the word. Anything that survives greyscale.
*Why it matters*: The console's most-scanned numbers are the ones that fail the rule. *Impact*: Escrow, money, payments, standing. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

##### K. Agent console

**F2-065. The guest's name is truncated on the screen where the agent decides about that guest.**
*File*: `agent/bookings/BookingsWorkspace.tsx:247` `<h3 className="truncate ...">{booking.guestName}</h3>`, with the listing title truncated twice on the line below (`:248` and `:250`). Also `agent/messages/AgentInbox.tsx:37,43` and `agent/reviews/ReviewsWorkspace.tsx:113`.
*What is wrong*: Rule 16. Nigerian names are frequently long and hyphenated, and the guest's name is the whole of what the row is about.
*What to do*: Wrap. `EarningsWorkspace.tsx:31` already carries the comment explaining why a truncated figure was removed for exactly this reason; apply the same reasoning to names.
*Why it matters*: 39 truncations across the operator and money surfaces, concentrated on names, references and evidence. *Impact*: Agent bookings, inbox, reviews. *Effort*: S. *Risk*: Low. *Priority*: **High**.

**F2-066. An agent cannot record that a stay happened.**
*File*: `booking_status` is `PENDING, CONFIRMED, CANCELLED`, verified live. `agent/bookings/BookingsWorkspace.tsx` renders `t.status[booking.status]` over those three.
*What is wrong*: There is no COMPLETED, so the board has no terminal good state. A stay that finished looks identical to one that has not started. This is also the reason escrow has nothing to release on, per `lib/legal/terms.tsx`.
*What to do*: Out of scope for a frontend pass to fix, but the frontend consequence should be named: the board needs a fourth column and the enum needs a fourth value. Until then the board should at least separate "upcoming" from "past" by date so the operator is not reading a flat list.
*Why it matters*: It is the gap under `A1-002` and `E-2` and it shows in the console. *Impact*: The agent's daily screen. *Effort*: L. *Risk*: Medium. *Priority*: **Medium**.

**F2-067. `MORE_INFO_REQUIRED` and `SUSPENDED` have no verification surface.**
*File*: `(app)/verification/page.tsx:70-78` and `components/verification/KycStatus.tsx:26-35`, three states only.
*What is wrong*: The comment correctly argues that MORE_INFO_REQUIRED should not read as "wait". But then `status` stays null and the person is dropped into a blank `KycFlow` with no message saying what was asked for. The one state that requires the applicant to act is the one with no screen. `SUSPENDED` is the same.
*What to do*: A fourth `KycStatusView` state, `more_info`, carrying the reviewer's request with the same mandatory-reason discipline the rejection already has.
*Why it matters*: An agent blocked from listing with no idea why. *Impact*: The supply-side funnel. *Effort*: M. *Risk*: Low. *Priority*: **High**.

**F2-068. The rejection's "try again" link returns to the rejection.**
*File*: `KycStatus.tsx:37` `retryHref = "/verification"` against `(app)/verification/page.tsx:56-68`, where a failed rung always wins and always renders `KycStatus`.
*What is wrong*: A rejected applicant taps the recovery link and lands on the same screen. There is no query parameter or state that reaches the flow. It is a loop.
*What to do*: `/verification?resubmit=1` reaching `KycFlow` with the failed rung pre-selected.
*Why it matters*: `KycStatus` is otherwise the best failure state in the product and its one action does nothing. *Impact*: Every rejected applicant. *Effort*: S. *Risk*: Low. *Priority*: **High**.

##### L. Messaging

**F2-069. A message that failed to send looks sent.**
*File*: `(app)/messages/[id]/ThreadView.tsx:455-487`. `m.state === "sending"` dims the bubble to `opacity-70`; `m.state === "failed"` changes nothing about the bubble and adds a small rose line beneath it.
*What is wrong*: At a glance a failed message is a full-strength brand-filled bubble identical to a delivered one.
*What to do*: Outline the failed bubble instead of filling it, and keep the rose "Not sent. Retry" line.
*Why it matters*: On a platform whose safety rule is "keep every conversation inside Vallo", a message the agent never received must not look sent. *Impact*: Messaging. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-070. There is no read state at all.**
*File*: `ThreadView.tsx`, the bubble footer renders `m.state === "sending" ? "Sending" : m.timeLabel` and nothing else.
*What is wrong*: No delivered, no seen. A person who has messaged an agent about a flat has no idea whether it was read. This is a named item in my scope.
*What to do*: I would ship **delivered** and not **seen**. Delivered is a fact about the system and costs no privacy. Seen is a fact about a person and, on a platform where an agent may be juggling twenty enquiries, it manufactures an obligation to reply that will make agents slower to open messages, not faster to answer. Delivered plus the existing "Sending" and "Not sent" covers the anxiety without the cost.
*Why it matters*: It is the gap between a chat and a form. *Impact*: Messaging. *Effort*: M. *Risk*: Low. *Priority*: **Medium**.

##### M. Settings, profile, notifications

**F2-071. Settings is 3,900px of twelve stacked cards with no way to jump.**
*File*: `(app)/settings/page.tsx`, measured at 4,143px document height at 390px, twelve `Reveal`-wrapped cards. Five of them contain a single row.
*What is wrong*: No search, no grouping above the card level, no jump links. "Where you are signed in" is a 118px card holding one row and its own heading.
*What to do*: Collapse the single-row cards into their neighbours. Add a search field at the top, which is what iOS and Android settings both do and what a twelve-section list needs. Consider a two-level structure: six groups, each opening its own screen, which also removes eleven of the twelve `Reveal`s.
*Why it matters*: It is the screen a person reaches when something is wrong, and it is a 4,000px scroll. *Impact*: Settings. *Effort*: M. *Risk*: Low. *Priority*: **Medium**.

**F2-072. The same headline pattern orphans its last word on three screens.**
*File*: `(app)/wallet/page.tsx` "Your wallet is behind your sign in", `(app)/bookings/page.tsx:156` "Your trips are behind your sign in", and `MomentScreen`'s `.nf-moment__title` at `clamp(1.5rem, 5vw, 2rem)` with `max-width: 26rem` and no `text-wrap`.
*What is wrong*: At 390px each of these breaks as "...your sign / in", leaving a two-letter orphan under a centred headline with a large gap. Captured in three screenshots.
*What to do*: `text-wrap: balance` on `.nf-moment__title` and on the empty-state title, and rewrite the copy so it does not end in a two-word phrase. **Better version:** "Sign in to see your wallet" and "Sign in to see your stays", which is also shorter, more active, and matches the notifications screen, which already says "Sign in to see your notifications".
*Why it matters*: Three of the most-hit empty states in the product, and the fix is one CSS property plus better copy. *Impact*: Three screens. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-073. The empty-state action pair is inconsistent and the second action is often wrong.**
*File*: `(app)/wallet/page.tsx`, `notifications/page.tsx:63-67` and `:83-92`, `bookings/page.tsx`.
*What is wrong*: The wallet offers "Sign in" primary and "Explore places" ghost, both at intrinsic width. Notifications offers a **full-width** "Explore places" primary alone in one branch and "Sign in" plus "Keep exploring" in another. Three empty states, three button treatments. And "Explore places" as the alternative to seeing your own money is a non-sequitur: a person came for their balance.
*What to do*: One treatment: both actions full width, primary then quiet, stacked. And the quiet action should be relevant. On the wallet, "How the wallet works". On bookings, "Find somewhere to stay".
*Why it matters*: Empty states are the primary state of this product today. *Impact*: Every gated screen. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

##### N. Database

**F2-074. Six foreign keys have no covering index, on tables added since the last audit.**
*File*: `escrows.disputed_by`, `escrows.release_requested_by`, `escrows.resolved_by`, `fee_rates.created_by`, `platform_revenue.listing_id`, `platform_revenue.rate_id`.
*What is wrong*: `docs/HANDOFF.md` §6 requires a covering index on every foreign key and `docs/DATABASE_AUDIT.md` §2 records fixing "the last unindexed foreign key" on 7 August. Six have appeared since. Three of them run toward `auth.users`, which is the deletion path the audit itself flags as the expensive one because the scan happens inside a transaction holding a lock.
*What to do*: Six indexes, one migration.
*Why it matters*: New, and it is a stated rule rather than a lint to assess. *Impact*: Account deletion and escrow queries. *Effort*: S. *Risk*: Low. *Priority*: **Medium**.

**F2-075. All five `reservations` policies re-evaluate `auth.uid()` per row.**
*File*: `reservations_select_own`, `_select_host`, `_insert_own`, `_update_own`, `_update_host`.
*What is wrong*: `auth_rls_initplan`, five findings, not covered by the do-not-fix list. `reservations` is a new table and the fix is the mechanical `(select auth.uid())` wrap.
*What to do*: One migration, five policies.
*Why it matters*: The one performance advisory in this project that is cheap, safe and genuinely worth clearing. *Impact*: Restaurant reservations at scale. *Effort*: S. *Risk*: Low. *Priority*: **Nice-to-have**.

---

#### 8. The ideas that do not exist yet

Five, argued, and I have killed two of my own along the way.

**I-1. A "where is my money" state machine on the receipt, not just a status word.**
A Nigerian withdrawing ₦200,000 wants to know which of five things is true: you asked, we took it from your balance, we sent it to the bank, the bank has it, it is in your account. Today the receipt says one word. Give the receipt a four-step `Progress` rail with the timestamp of each step that has happened and the expected window for the next. `Progress` already exists, already has `role="progressbar"`, already has an indeterminate mode. This is the highest-value thing on this list and it is cheap, because the ledger already records the transitions. It also removes most of the reason somebody contacts support.

**I-2. The receipt renders in the paper theme regardless of the app theme.**
A receipt is screenshotted and sent to a landlord, an agent or a bank. A dark receipt in a WhatsApp thread on a white background reads as a screenshot of an app; a white one reads as a document. It also prints. `Receipt.tsx` would take a `data-theme="light"` scope. Half a day, and it changes how the platform looks to every third party who never opens it.

**I-3. One "operator queue" frame, and build the console out of it.**
Nineteen pages, each hand-rolling a list, is nineteen chances to disagree. One frame that takes a query, an enum for its filter chips, a row renderer and a decision panel would collapse most of §J into configuration and would make F2-055, F2-056, F2-058 and F2-060 structural rather than nineteen separate fixes. This is the largest item on this list and it is the one that decides whether the console is a product or a back office.

**I-4. Show "Platform fee: ₦0" on the checkout summary.**
`docs/PRODUCT.md` §3 already asks for this and it is not built: "Show 'Platform fee: 0 naira' from today rather than hiding the row, so the line is familiar long before it has a number in it." It costs one row and it is a competitive weapon in a market where every agency fee is a surprise. It does not breach rule 7, which bans mentioning a fee **as a thing that is charged**; stating zero is the opposite. I would put it directly above the total, at the same weight as the other lines.

**I-5. A "nothing has happened here yet" empty-state family, distinct from "you are up to date".**
Zero rows in nineteen queues, zero bookings, zero reviews, zero transactions. Today the product uses one empty state for both meanings and the console's version actively congratulates. A second family that says what will appear, what causes it to appear, and where it comes from, would turn the product's most common state from a shrug into an explanation. This is the single cheapest way to make the platform feel finished before it has any data.

**Two ideas I killed.**
- *A confetti or count-up animation on the payment confirmation.* I wanted it and it is wrong. The confirmation's job is to be screenshotted, and a number mid-count cannot be. It also fights the "expensive and calm" direction. Dropped.
- *Removing the glass to buy scroll performance.* I measured it at 6x CPU throttle across four conditions and removing every frosted surface and every reveal blur moves the median frame by 0.1ms. The premise was wrong and I am not going to recommend a change on it. Re-measure against a production build before anyone acts on the glass for speed.

---

#### 9. Count by priority

| Priority | Count | Ids |
|---|---:|---|
| **Critical** | **3** | F2-001, F2-016, F2-017 |
| **High** | **26** | F2-004, 005, 007, 010, 011, 018, 019, 020, 021, 022, 024, 026, 028, 029, 033, 036, 037, 042, 045, 048, 049, 053, 055, 056, 057, 058, 059, 065, 067, 068 |
| **Medium** | **35** | F2-002, 003, 006, 008, 009, 012, 013, 015, 023, 025, 027, 030, 031, 032, 034, 038, 039, 040, 043, 044, 046, 047, 051, 052, 054, 060, 061, 062, 063, 064, 066, 069, 070, 071, 072, 073, 074 |
| **Nice-to-have** | **5** | F2-014, 035, 041, 050, 075 |
| **Total** | **75** | |

*(The High row lists 30 ids; the counted total of 75 findings is correct and the per-row arithmetic should be taken from the id lists, which are authoritative. High is 30, Medium is 37, Critical is 3, Nice-to-have is 5, and I have not padded the list to reach a number.)*

**Corrected tally: Critical 3, High 30, Medium 37, Nice-to-have 5. Total 75.**

---

#### 10. The five things I would do first

1. **F2-016 and F2-017** together, via `ResultSheet` step 1 and 2. The card return path and the three button-spinner pending states. One component, two files, and it fixes the money path.
2. **F2-001.** Delete the escrow promise from the wallet. It is a deletion, it takes an hour, and the product currently contradicts its own terms of service.
3. **F2-024.** Add the failure variant and move the eight surfaces off cyan. One CSS rule and eight prop changes, ahead of the full system.
4. **F2-049.** Fix the anchor at `/admin`. It is the console's front door and it is visibly broken in both themes.
5. **F2-033.** Commit to deleting `--nf-icon-ground` as the acceptance test for the icon replacement, so the white sticker is what the swap is judged on rather than a side effect of it.

---

#### 11. What I would tell the founder in one paragraph

The engineering here is better than the product looks, and the gap is almost entirely in the moments where the software has to say something to a person. Nine different screens tell someone what just happened to their money, they disagree with each other, eight of them use the colour that means "still going" to say "it failed", and the screen you land on when a card payment does not verify says the words "Payment check" in grey. Fix that one system and a large part of the cheapness goes with it. The second thing is the white square behind every object on the dark theme, which is on every empty state in the product and is the strongest argument I can give for doing the icon replacement now rather than later. The third is the console, which nobody has looked at as a product and which will stop working the day it has a thousand rows in it. Everything else on my list is small, and small is most of what premium is made of.

**I could not see a single signed-in screen.** Everything I say about confirmations is read from the code and reasoned, not watched. Get one seeded environment with credentials in front of the next agent and the confidence of this whole section roughly doubles.

---

### 6.A Agent two's addendum: on widening, and on glass

Delivered after the founder's late instruction, and scoped to in-app, money and
operator surfaces only.

**On "widen every single layer".** Measured at 390px on the running app:
`.nf-shell` gives a 20px gutter each side and 32px top and bottom, so a card
inside it is 350px wide. **The gutter is not the problem. What happens inside it
is.**

- The money and operator rows are set two tiers tighter than the rest of the
  product. `PayPanel`'s option rows are `p-4 gap-3.5`, the checkout summary is
  `p-4 sm:p-5`, admin queue rows are `p-3.5 sm:p-4`, and the ledger row and the
  admin money row set metadata at 11px. **So the screen where somebody pays 1.2m
  naira and the screen where an operator decides whose money moves are the two
  most tightly packed surfaces in the product.** `admin/_components/ui.tsx`
  already records raising the console's type "UP a tier across the board" because
  it is "where somebody decides whose money moves, at eleven at night". That pass
  raised the type and never raised the space around it.
- **The vertical rhythm is fine and the horizontal one is abandoned.**
  `--nf-gap-block`, `--nf-gap-group` and `--nf-gap-row` exist and are obeyed
  vertically. Horizontally, call sites hand-write `p-4`, `p-3.5`, `gap-3`,
  `gap-2.5`. That is precisely why these screens read cramped side to side and
  airy top to bottom. **New finding F2-076**, priority High, effort M: route the
  horizontal padding and gaps through the same named scale and invent no new
  values. It will surface `nf/no-raw-spacing` violations, which is the point.
- **The single biggest widening win is not more gutter, it is removing the 39
  truncations** so content can occupy the width it already has. F2-007 (the pay
  button label overflows its pill by 24px at rent-sized amounts, measured),
  F2-048, F2-058, F2-059, F2-062 and F2-065 are all width failures wearing
  another name.
- **One place the instruction pulls against the operator.** The admin queue at a
  thousand rows needs more rows on screen, not fewer. Do F2-055, the shared queue
  frame with search, filters and pagination, **before** widening the console.

**On "premium glass, clean buttons, Apple".** Three structural facts, handed over
rather than designed:

- **The glow is not a token, and that blocks the whole exercise.** F2-036:
  `rgb(12 57 239 / alpha)`, the brand glow written by hand, appears roughly 60
  times at about 15 different alphas across `buttons.css`, `ambient.css`,
  `glass.css` and `light.css`. Nothing described as "premium glass" can be
  applied in one place until that is a small glow scale. It also means **the
  light theme currently fires the dark theme's glow on a primary button hover.**
  This is a prerequisite, not a recommendation.
- **`.nf-sheet` is a solid panel, and it is the obvious first place for real
  glass.** It is also the best-engineered component in the product: spring,
  velocity-aware detents, 1:1 drag, focus trap, counted scroll lock, safe area,
  reduced motion, all correct. One change, eight surfaces.
- **The iPhone standard is met in exactly one place and missed in two.** Met:
  `components/ui/Sheet.tsx`. Missed: the money decision is not pinned to the
  bottom edge, although `components/ui/ActionBar.tsx` exists, does exactly that,
  and its own docstring names checkout as the screen that lacks it. It is used in
  **one** place on the whole platform. Missed: **two stacked headers on every
  non-tab screen**, which on the wallet is 116px of chrome before the balance,
  and above `lg` the top bar is empty by the shell's own admission and still
  costs 64px and a backdrop filter.

**And one measurement that should stop a wrong decision.** At 6x CPU throttling,
across four conditions on a full-page scroll (baseline, reveal blur off, all
`backdrop-filter` off, both off), **the median frame moved by 0.1ms.** Removing
every frosted surface in the product buys nothing measurable. **Do not remove
glass for speed.** The agent asks for this to be re-measured on a production
build before anyone acts on it, which is the right caveat.
