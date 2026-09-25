# Light mode survey: what is broken on paper, and why

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

Written 22 September 2026 against the working tree at `/home/user/read-it-well`.
Commissioned on the founder's report: "our light mode in our platform is so
fucking worst ... images not showing icons bad containers color so bad switch
stays that's showing icon don't show like it's many many areas our light mode
is so fucking terrible."

A source and asset survey with measured colour arithmetic. **I had no browser.**
Nothing here was seen rendered. Every number was computed from the token files,
the stylesheets and the PNG artwork with scripts written for this survey, and
every claim carries a `path:line`. Findings that depend on what a browser
painted are marked INFERRED, and the honesty log repeats them.

The founder is right, and the cause is smaller than "many many areas". Five
mechanisms account for nearly all of it, and the first alone accounts for every
"images not showing" symptom in all four screenshots.

---

## 0. Summary of the five root causes

| # | Root cause | Evidence | Symptoms it explains |
|---|---|---|---|
| R1 | **121 of 144 glass objects have no light twin and are painted on a navy chip instead.** The chip is `--nf-icon-ground`, `#052A6D` in daylight. Blue glass on a blue chip loses a measured 33 per cent of its median contrast against the object's ground. | `packages/design-tokens/src/tokens.css:2990`, `apps/web/src/design-system/icons/BrandIcon.tsx:243-267`, `apps/web/src/app/css/glass.css:1021-1038` | Flip cover, side splash, drawer coin, settings hub, stays hero, home tiles, every list-row object on the platform |
| R2 | **The container ladder collapses on paper.** The card ring tops out at 2.53:1 and rests at 1.31:1; elevation rung 1 is ink at 5 per cent; the surface ladder spans 1.09:1 end to end; the light `--nf-elev-*-rim` is white on white; and eleven light-theme `box-shadow` declarations across admin, agent, host, messages and inspections are **invalid CSS and are dropped**. | `packages/design-tokens/src/tokens.css:3071-3106`, `:3336-3338`, `:2762-2767`, `:1022-1024`, and the eleven rules in section 3.5 | "containers color so bad" |
| R3 | **Glass fills invert on paper and 23 rules never got the memo.** `--nf-glass-fill` is white at 7.5 per cent at night and white at 86 per cent on paper, so every rule that used it to LIFT something now paints white on white. | `packages/design-tokens/src/tokens.css:3021-3023`, and the 23 rules listed in section 5 | Dead row hovers across drawer, messages, wallet, settings, crypto and admin; the coin's white disc; the KYC banner |
| R4 | **Four large stylesheets have no paper twin at all.** `side-flip.css` (590 lines), `chrome.css` (844), `overlays.css` (328), `ambient.css` (644) contain zero `[data-theme="light"]` rules. | table in section 6 | The whole flip ceremony, the dock, the sheets |
| R5 | **Nothing in the build checks the paper twin.** The CSS gate explicitly excludes `[data-theme]` selectors, its property-shape check fails a gradient in `box-shadow` but passes a colour, the contrast probe covers four elements on one route, and the shape sweep runs in one theme. | `apps/web/scripts/check-css-tokens.mjs:575-589`, `:456`, `apps/web/scripts/probe-contrast.mjs:33-43` | Why every one of the above survived |

The codebase already knows about R1 in two places and says so in its own words.
`apps/web/src/app/(app)/settings/SettingsHub.tsx:148-151`: "none of the six has
a light twin, so on paper all six take the pack's navy chip and the group
becomes six dark squares punched into a white card. That is the icon ground in
the lead's layer and is reported, not worked around." And
`apps/web/src/app/settings-rows.css:941-945` repeats it. Two authors filed it
upward and nobody in the lead's layer picked it up.

---

## 1. How light mode is applied, and what it is made of

### 1.1 The switch

The theme is an attribute on the document element, not an OS preference.
`apps/web/src/components/app/account/settings-store.ts:219` describes the read:
`nf_theme` in storage, `data-theme="light"` on the root for light, nothing for
dark. `apps/web/src/components/site/ThemeToggle.tsx:12` writes it. An inline
script sets it before React exists (`settings-store.ts:301`).

The token sheet declares the default palette on two selectors,
`packages/design-tokens/src/tokens.css:35-36`:

```
:root,
[data-theme="dark"] {
```

and the paper palette on one, `:2754`:

```
:root[data-theme="light"] {
```

Consequence, which matters in section 9.5: a nested element carrying
`data-theme="dark"` takes the dark PALETTE for its subtree, but every component
rule keyed `:root[data-theme="light"] .nf-x` still MATCHES inside it, because
the first half of that selector is about the document and the second is a
descendant. `app/(auth)/layout.tsx:45-48` states this and acts on it by keeping
light rules out of `auth.css`. Three rules elsewhere leak in anyway.

### 1.2 The size of the paper twin

306 tokens are declared in the dark block and 143 in the light block. Of the
164 names that appear only in the dark block, 53 resolve to the same colour in
both themes, which is the honest count of frozen colour; the rest are spacing,
radius, z-index, type, easing and alias chains onto themed tokens, all correct.

The stylesheet coverage is where the imbalance shows, counted by
`grep -c 'data-theme="light"'` over every partial:

The eleven partials with ZERO light rules, largest first, and the five with the
most:

```
light rules  lines  file
0            844    apps/web/src/app/css/chrome.css       header, dock
0            816    apps/web/src/app/css/utilities.css
0            644    apps/web/src/app/css/ambient.css      correct: light.css switches it off
0            590    apps/web/src/app/css/side-flip.css    the flip and its cover
0            441    apps/web/src/app/css/animation.css
0            328    apps/web/src/app/css/overlays.css     sheets, drawer, backdrops
0            291    apps/web/src/app/css/base.css
0            232    apps/web/src/app/css/symbols.css
0            197    apps/web/src/app/css/explore.css
0            150    apps/web/src/app/css/typography.css
0            148    apps/web/src/app/css/map.css
...
25          3564    apps/web/src/app/social-feed.css
29          1456    apps/web/src/app/css/threads.css
33          1018    apps/web/src/app/css/admin.css
42          2233    apps/web/src/app/css/catalogue.css
57           717    apps/web/src/app/css/light.css
```

Between those ends: `side-nav.css` 5 in 728, `glass.css` 7 in 1286,
`controls.css` 8 in 828, `settings-rows.css` 9 in 954, `agent.css` 10 in 428,
`crypto.css` 10 in 333, `system.css` 13 in 654, `chips.css` 15 in 1039,
`wallet.css` 17 in 714, `home.css` 21 in 1292, `landing.css` 22 in 1957, and
`auth.css`, `buttons.css` and `motion.css` at 3 each.

Three hundred and fifty-eight light rules against 22,521 lines of stylesheet.
That ratio is not itself a fault, because most rules are theme-neutral by
construction. It becomes a fault exactly where a rule's material is chosen for
one ground, and sections 3 to 6 are the list of those.

### 1.3 Colour discipline, which is good, and is worth saying

There is not one raw hex or `rgb()` literal in any component stylesheet outside
a comment. I grepped all 37 partials; the only matches are prose in
`admin.css:983-991`, `chrome.css:659` and `home.css:1003-1004`, authors
recording measurements. `nf/no-raw-colour` has done its job. Every defect below
is a correctly-tokenised rule whose token is wrong for paper, which is a harder
class of bug and a better problem to have.

---

## 2. Root cause R1: the icon ground, and why the artwork disappears

### 2.1 The inventory, counted rather than quoted

`docs/ICON_SYSTEM.md:18` says 103 glass objects with 23 twins; `:96` says
`BrandIcon` lists 144. The two halves disagree and the code is the authority.
Counted from disk:

```
apps/web/public/brand/glass/*.png         144 objects
apps/web/public/brand/glass/hero/*.png     12 hero scenes
apps/web/public/brand/glass/light/*.png    24 light twins on disk
apps/web/public/brand/icons/*.png          87 retired clay objects, nothing draws them
apps/web/public/brand/scenes/               8 photographs + a README
apps/web/public/brand/photos/              60 files (20 images at three sizes each)
```

`BRAND_ICONS` at `apps/web/src/design-system/icons/BrandIcon.tsx:76-221` lists
exactly 144 names, matching the directory one for one. `LIGHT_TWINS` at
`:243-267` holds 23. The twenty-fourth file on disk is `escrow-hold.png`, cut
and deliberately withheld because escrow does not exist
(`BrandIcon.tsx:236-241`, `scripts/icon-manifest.mjs:145-151`).

**So 121 of 144 objects, 84 per cent of the pack, have no light artwork.**

There is one light source sheet and only one. `scripts/icon-manifest.mjs:572`
declares `LIGHT_SHEET = "c0f67033"`; `:168-174` lists its 24 objects, the
transaction and outcome set, the same set as `cf5a4150` index for index
(`:161-166`). No other sheet carries light artwork, and
`docs/ICON_SYSTEM.md:130-132` plus `BrandIcon.tsx:33-37` both record that no
filter produces one from the dark, because the difference is which parts of the
object are transparent, and that this was tested rather than assumed.

### 2.2 The swap mechanism, and what happens when a twin is missing

`BrandIcon` puts both files in the markup and lets CSS choose
(`BrandIcon.tsx:424-446`):

```tsx
const twinned = LIGHT_TWINS.has(object);
...
<Image src={`/brand/glass/${object}.png`}
       className={`nf-brand-icon ${twinned ? "nf-brand-icon--night" : ""} ...`} />
{twinned ? <Image src={`/brand/glass/light/${object}.png`}
       className={`nf-brand-icon nf-brand-icon--day ...`} /> : null}
```

`apps/web/src/app/css/glass.css:949-957` does the choosing:

```css
.nf-brand-icon--day { display: none; }
:root[data-theme="light"] .nf-brand-icon--day { display: block; }
:root[data-theme="light"] .nf-brand-icon--night { display: none; }
```

This is correct and safe for the untwinned case, because `--night` is only
applied when `twinned` is true, so an untwinned object keeps painting its dark
artwork on paper. Nothing 404s and nothing is missing at the network layer. I
checked that first, because "images not showing" reads like a broken `src` and
it is not one.

What happens instead is the chip. `BrandIcon.tsx:461-469` wraps every untiled
object in `.nf-brand-icon-ground`, and `glass.css:1021-1038` paints it:

```css
.nf-brand-icon-ground {
  ...
  aspect-ratio: 1;
  border-radius: var(--nf-radius-squircle);   /* 26 per cent */
  background: var(--nf-icon-ground);
  padding: 7%;
}
```

`--nf-icon-ground` is `transparent` at night (`tokens.css:771`) and on paper it
is, at `tokens.css:2990`:

```css
--nf-icon-ground: color-mix(in oklab, var(--nf-brand-primary) 62%, var(--nf-ink-950));
```

Resolved: `#094BA9` at 62 per cent mixed with `#010118` in OKLab gives
**`#052A6D`**, a deep navy, relative luminance 0.0279. Against the white page
that is 13.47:1, which is to say the chip is one of the highest-contrast
objects on any paper screen in the product.

`glass.css:1058-1060` adds a hairline to it in daylight and nothing else. So on
paper, every untwinned object is a hard navy rounded square with a 1px ring,
sitting on white.

### 2.3 The measurement: how much of the object survives on that chip

A script opens each PNG, takes every pixel with alpha above 30, composites it
over the ground and reports the contrast of the median object pixel against it.
Two grounds: `#052A6D`, the daylight chip, and `#010118`, the night canvas the
object sits on when `--nf-icon-ground` is transparent. Across all 121 untwinned
objects:

```
LIGHT, median object pixel vs the navy chip:     median 1.60:1   mean 1.59   min 1.15   max 2.15
DARK,  median object pixel vs the night canvas:  median 2.42:1   mean 2.21   min 1.14   max 3.27
median loss moving the ground from #010118 to #052A6D:  33 per cent
45 of 121 objects have a median pixel under 1.5:1 against the chip
108 of 121 are under 2.0:1
```

The fourteen worst, by median object pixel on the chip:

```
guest-house 1.15   role-switch-tile 1.15   bank-column 1.16   card-tile 1.16
person-card 1.16   bell-tile 1.17         globe 1.17         headset 1.17
palette 1.17       bookmark-ribbon 1.19   shield-check-tile 1.19
wallet-tile 1.20   send-plane-tile 1.21   phone-tile 1.22
```

Every one is a TILE-FORM object, one of the 41 render crops that arrives on its
own rounded glass tile. The chip hurts those most, for the reason
`glass.css:1040-1046` gives for the twinned set: a chip behind a tile is a tile
around a tile. The twinned marks are excused from the chip; the 41 crops have
the same shape and are not.

The specific objects the founder photographed:

```
object              cover%  LIGHT mean/p50/p90   DARK mean/p50/p90
hotel                55.9    3.65 / 2.11 / 8.98   5.44 / 3.20 / 13.73
flip-coin            50.5    2.11 / 1.44 / 3.86   2.73 / 1.77 /  5.42
stays-hotel-palms    29.4    1.90 / 1.38 / 3.51   2.56 / 1.80 /  5.17
shortlet             47.5    3.13 / 1.67 / 7.50   4.57 / 2.51 / 11.48
serviced-apartment   42.5    3.13 / 2.11 / 6.97   4.63 / 3.17 / 10.64
```

A median pixel at 2.11:1 inside a chip that is itself 13.47:1 against the page
means the eye resolves the SQUARE and not the object in it. That is the whole
mechanism of "images not showing": the image is there, and the chip is louder
than it by a factor of six.

### 2.4 Where it lands: the call-site census

I parsed every `<BrandIcon>` element in `apps/web/src`, resolved the seven
`LEGACY_ALIASES` (`BrandIcon.tsx:291-305`) and split by twinned status.

```
static call sites with a literal name:  100
  untwinned, so a navy chip on paper:    89   (89 per cent)
  twinned, so a real light twin:         11
dynamic call sites (name from a table or a ternary):  46
```

The eleven twinned sites are the entire correct half of the platform's daylight
iconography: `payment-received` x3, `seal-pending` x2, `transfer-arrow` x2,
`alert-triangle`, `coin-naira`, `doc-review`, `payment-sent`, on
`/wallet/receive`, `/wallet/send`, `/admin/money` and the host wizard.

Everything else takes the chip. The dynamic 46 matter most, because they are
the grids and the rails, and every table behind them is untwinned:

- `components/app/home/MarketTiles.tsx:47` from `home/markets.ts`, nine tiles
- `components/app/stays/StayCategoryTiles.tsx:19-23,40`: `hotel-room`,
  `studio-apartment`, `beach-house`, `bungalow`, `serviced-apartment`
- `components/app/search/CategoryRail.tsx:79-87,161`: nine objects
- `components/site/landing/CategoryGrid.tsx:105`, `FeatureChips.tsx:37`,
  `HowVallo.tsx:35`, `StaysBand.tsx:59`
- `app/(app)/settings/SettingsHub.tsx:165` with six tile-form objects, the
  worst case in the pack
- `app/(app)/profile/AccountBody.tsx:102`, `app/(app)/bookings/page.tsx:213`,
  `app/(app)/trips/TripSpine.tsx:256`, `app/(app)/checkout/[bookingId]/PayPanel.tsx:111`
- `app/agent/dashboard/page.tsx:174`, `app/agent/earnings/EarningsWorkspace.tsx:48`,
  `app/agent/analytics/AnalyticsWorkspace.tsx:92`
- `components/app/flip/SideCover.tsx:76,88` and `components/app/SideSwitch.tsx:80`,
  which are sections 7.1 and 7.2

### 2.5 The acceptance test the code wrote for itself, and its arithmetic

`glass.css:986-993` states the exit condition for the chip:

> ONE: THE TWIN COUNT REACHES ZERO. ... 103 marks ship and 23 are twinned, so
> 80 are not; the live number is `103 - LIGHT_TWINS.size`.

The live number is `144 - 23 = 121`, not 80. The comment predates the 41 render
crops, which `docs/ICON_SYSTEM.md:130` says have no twin and can have none. So
the stated exit condition has moved 51 per cent further away since it was
written, and nobody updated the count. The "TWO: THE CUTOUT TEST" clause at
`glass.css:995-1006` asks a human to look at the untwinned marks on white with
the chip set to transparent. That test has not been run; there is no proof file
for it in `docs/design/proofs/` and the note names none.

---

## 3. Root cause R2: the container ladder collapses on paper

This is "containers color so bad", and it is measurable.

### 3.1 The edge ladder

Every card, chip, control, dock island and icon plate on the platform wears one
of these. Flattened over the white card and over the canvas, with the dark
equivalents for comparison:

```
token                        light on #FFFFFF  ratio   on #F4F5F7  ratio | dark on #010118  ratio
--nf-edge-stride-base                 #DEE1E6   1.31      #D5D8DF   1.31 |         #1A2240   1.32
--nf-edge-stride-lit                  #A9C0E1   1.86      #A2BADC   1.83 |         #01358B   1.85
--nf-edge-stride-peak                 #84A5D4   2.53      #7FA0D0   2.46 |         #004AB9   2.63
--nf-brand-edge-soft                  #A9C0E1   1.86      #A2BADC   1.83 |         #012568   1.45
--nf-brand-edge                       #84A5D4   2.53      #7FA0D0   2.46 |         #01358B   1.85
--nf-brand-edge-strong                #5381C3   3.97      #507EC0   3.79 |         #004AB9   2.63
--nf-glow-brand-rim                   #225DB2   6.42      #215CB1   5.97 |         #005FE7   3.71
--nf-glass-border                     #E7E8E8   1.23      #DDDFE1   1.23 |         #1D1D31   1.25
--nf-border-subtle                    #ECECED   1.18      #E2E3E5   1.18 |         #15152A   1.15
--nf-border-default                   #E0E1E1   1.31      #D7D8DA   1.31 |         #222236   1.33
--nf-border-strong                    #CBCCCD   1.61      #C2C4C6   1.61 |         #39394B   1.82
--nf-elev-1-border                    #E7E8E8   1.23      #DDDFE1   1.23 |         #1D1D31   1.25
```

`--nf-brand-edge` is the workhorse. It is the border of `.nf-icon-tile`
(`glass.css:1128`), of `.nf-dock-island` (`chrome.css:452`), of
`.nf-flip-cover__miniature > li` (`side-flip.css:331`), of `.nf-whocta`
(`side-nav.css:281`), of `.nf-pcard__mark` (`catalogue.css:240`), and it is the
middle layer of `--nf-glow-edge` (`tokens.css:3323`), which is the ring every
card and control now wears. **On white it measures 2.53:1, below the 3:1 WCAG
1.4.11 floor for a user-interface boundary.**

`--nf-edge-stride-base` at 1.31:1 is worse, and it is worse in the place that
matters most. `apps/web/src/app/css/light.css:34-40` gives the daylight card
the same conic stride ring the night card has:

```css
:root[data-theme="light"] .nf-card {
  background:
    linear-gradient(var(--nf-surface-primary), var(--nf-surface-primary)) padding-box,
    conic-gradient(from var(--nf-stride-angle), var(--nf-edge-stride-stops)) border-box;
  box-shadow: var(--nf-elev-1);
}
```

`--nf-edge-stride-stops` (`tokens.css:1766-1777`) puts `base` across 132 of the
360 degrees twice over, so roughly three-quarters of every card's circumference
on paper is a 1.31:1 line, with two short 2.53:1 flashes.

### 3.2 The elevation ladder

```
--nf-elev-1
  dark : 0 1px 1px rgb(0 0 0 / 0.30), 0 4px 12px -2px rgb(0 0 0 / 0.34)
  light: 0 1px 2px rgb(18 21 26 / 0.05), 0 4px 14px -3px rgb(18 21 26 / 0.07)
--nf-elev-2
  dark : 0 2px 3px rgb(0 0 0 / 0.32), 0 10px 26px -4px rgb(0 0 0 / 0.42)
  light: 0 2px 4px rgb(18 21 26 / 0.06), 0 10px 28px -6px rgb(18 21 26 / 0.11)
```

Rung 1 on paper is ink at 5 and 7 per cent. Against white that is the
difference between `#FFFFFF` and roughly `#F3F3F4`, a 1.06:1 step at the
darkest part of the blur. `.nf-card` on paper therefore has a 1.31:1 ring and a
1.06:1 shadow, and that is its entire boundary.

### 3.3 The rim, which paints nothing on paper

`tokens.css:3074` sets the light rim:

```css
--nf-elev-1-rim: inset 0 1px 0 rgb(255 255 255 / 0.9);
```

and `:3313` sets `--nf-rim-lit-ink: #FFFFFF`, which `--nf-glow-edge` at `:3322`
puts on top of every lit container. In the dark theme the equivalent is white
against a near-black card and it is the layer doing most of the depth work
(`tokens.css:55-58` argues exactly this: "depth does not come from black drop
shadows here. It comes from the RIM"). On paper the rim is white at 90 per cent
on a `#FFFFFF` card. It is a no-op. So the light theme deleted the mechanism
the dark theme relies on for depth and replaced it with a 5 per cent shadow.

`light.css:379-382` puts the same no-op on the dock:

```css
:root[data-theme="light"] .nf-tabbar,
:root[data-theme="light"] .nf-dock-island {
  box-shadow:
    inset 0 1px 0 var(--nf-glass-rim-strong),   /* rgb(255 255 255 / 1) on near-white */
    0 16px 32px -14px var(--nf-wash-6);
}
```

`--nf-glass-rim-strong` is `rgb(255 255 255 / 1)` on paper (`tokens.css:3041`).
Pure white on a `#F4F5F7`-at-90-per-cent dock. Nothing is drawn.

### 3.4 The surface ladder

```
DARK                          LIGHT
--nf-surface-canvas   #000612  #F4F5F7
--nf-surface-primary  #000020  #FFFFFF
--nf-surface-secondary#000030  #FFFFFF
--nf-surface-elevated #000040  #FFFFFF
--nf-surface-raised   #000050  #F7F8FA
--nf-surface-inset    #00000A  #EFF1F4
```

`tokens.css:2762-2767`. Three of the six are the identical white, and the whole
span from inset to primary is 1.14:1. A card on the canvas is 1.09:1. A
recessed chip on the canvas (`--nf-surface-inset` over `--nf-surface-canvas`)
is **1.037:1**, which is not a distinguishable step. `light.css:129-134` makes
every `.nf-chip` recessed on paper with that token and removes its shadow:

```css
:root[data-theme="light"] .nf-chip {
  background: var(--nf-surface-inset);
  border-color: var(--nf-brand-edge-soft);
  color: var(--nf-content-primary);
  box-shadow: none;
}
```

The argument at `light.css:66-83` is sound, and the numbers do not carry it: a
recessed chip on a card is 1.13:1 of fill and a 1.86:1 hairline. On the canvas
it is 1.04:1 of fill. The filter row on `/search` in daylight is, by
arithmetic, eight outlines and no material.

### 3.5 The paper shadow is an invalid declaration, and it is dropped

`tokens.css:1024` declares:

```css
--nf-shadow-on-paper: rgb(18 21 26 / 0.18);
```

That is a shadow COLOUR with a shadow's NAME. Eleven rules, every one of them
inside a `:root[data-theme="light"]` block, write it into `box-shadow` as a
whole shadow layer:

```
admin.css:937    :root[data-theme="light"] .nf-admin-chip:not(--on), .nf-admin-table,
                 .nf-admin-row__tile, .nf-admin-row__view, .nf-admin-pager__page,
                 .nf-admin .nf-card
admin.css:944    :root[data-theme="light"] .nf-admin .nf-card.nf-admin-stat--flagged
admin.css:962    :root[data-theme="light"] .nf-admin-bar__search input,
                 .nf-admin-search__field input, .nf-admin-more__body
admin.css:1000   :root[data-theme="light"] .nf-admin-chip--on
agent.css:421    :root[data-theme="light"] .nf-agent-stat, .nf-agent .nf-card,
                 .nf-agent-panel, .nf-host-choice, .nf-host .nf-card, .nf-host-group
threads.css:1415 :root[data-theme="light"] .nf-bubble--theirs
threads.css:1432 :root[data-theme="light"] .nf-role-tag, .nf-composer__field,
                 .nf-thread__ring, .nf-msg__avatar, .nf-inbox-row__ring,
                 .nf-chat-card__room, .nf-insp-fact__glyph, .nf-insp-facts,
                 .nf-insp-notes__body
threads.css:1436 :root[data-theme="light"] .nf-chat-card, .nf-context-card
threads.css:1442 :root[data-theme="light"] .nf-bubble--mine
threads.css:1450 :root[data-theme="light"] .nf-insp-card, .nf-insp-facts,
                 .nf-insp-ladder, .nf-insp-notes, .nf-insp-step__tile
threads.css:1455 :root[data-theme="light"] .nf-insp-notes__body
```

The CSS grammar for a shadow is `<color>? && <length>{2,4} && inset?`. The
length pair is required, not optional. **`box-shadow: rgb(18 21 26 / 0.18)` is
therefore an invalid declaration and the parser drops it.** Every one of those
eleven rules paints no shadow at all on paper.

The worst of them is `admin.css:941-945`:

```css
/* On paper the rule stays and the night light goes, same as every other
   object that gained a catchlight for the container ruling. */
:root[data-theme="light"] .nf-admin .nf-card.nf-admin-stat--flagged {
  box-shadow:
    inset var(--nf-admin-stat-rule) 0 0 var(--nf-admin-stat-ink),
    var(--nf-shadow-on-paper);
}
```

An invalid layer invalidates the whole `box-shadow` declaration, not just that
layer. So the first layer, the 4px inset rule that IS the flag
(`admin.css:887,893`), goes with it. **The flagged admin stat card loses its
flag on paper**, which is a loss of information rather than of polish, and the
comment above it states the opposite intention word for word.

That token is also the sole light fill for the same surfaces:
`--nf-surface-on-paper` is `rgb(255 255 255 / 0.72)` (`tokens.css:1022`), which
over the white card is **1.000:1** and over the canvas is **1.065:1**. So on
paper an admin table, an agent panel, a host group, a chat bubble, a context
card and an inspection tile have a 1.00 to 1.07 fill and no shadow whatsoever.
They have no boundary at all beyond whatever border the base rule set, and
section 3.1 has those numbers.

### 3.6 What this adds up to

On the night canvas a container separates by being LIGHTER than its ground and
by a bright rim. On paper the light theme chose "be white, and draw a hairline
round it", then made the hairline 1.31:1 and the shadow 5 per cent. The founder
is describing a page of containers with no edges. That is precisely what these
numbers say the page is.

---

## 4. Root cause R3: the glass fill inverts and twenty-three rules did not follow

`tokens.css:3021-3023` inverts the glass fills for paper:

```
                      dark              light
--nf-glass-fill-thin  #FFFFFF @ 0.045   #FFFFFF @ 0.72
--nf-glass-fill       #FFFFFF @ 0.075   #FFFFFF @ 0.86
--nf-glass-fill-strong#FFFFFF @ 0.12    #FFFFFF @ 0.95
```

At night these are a faint lift on a dark ground. On paper they are almost the
page itself. Any rule that used a glass fill to make something VISIBLE against
a dark ground now paints white on white.

`light.css:686-706` identifies this exact fault for the Tailwind-utility form
and patches it:

```css
:root[data-theme="light"] .hover\:bg-\[var\(--nf-glass-fill\)\]:hover {
  background-color: var(--nf-interactive-hover);
}
```

and its note calls it "simply the WRONG TOKEN ... `--nf-interactive-hover` is
the token for 'a pointer is over this'". That analysis is right and the patch
only reaches utilities. The same wrong token is written directly in twenty-three
CSS rules that have no light override. I enumerated them by parsing every rule,
resolving its background in the light theme, and checking for a matching
`:root[data-theme="light"]` selector.

**No light override, background is a glass fill:**

```
.nf-nav__who              side-nav.css:134    fill-thin   the drawer's user card
.nf-nav__who:hover        side-nav.css:147    fill
.nf-nav__close:hover      side-nav.css:106    fill        the drawer's close control
a.nf-nav__row:hover       side-nav.css:564    fill-thin   EVERY drawer row hover
.nf-side-switch           side-flip.css:417   fill        the flip coin card
.nf-side-switch__coin     side-flip.css:510   fill-strong the coin disc itself
.nf-glass, .nf-site-bar   glass.css:140       fill        the base glass primitive
.nf-glass--thin           glass.css:217       fill-thin
.nf-glass--strong         glass.css:226       fill-strong used by ActionBar and listing detail
.nf-inbox-row:hover       threads.css:926     fill        messages inbox
.nf-share-row:hover       threads.css:1013    fill        the share picker
.nf-tx-row:hover          wallet.css:341      fill-thin   wallet transactions
a.nf-srow:hover           settings-rows.css:164 fill-thin every settings row
.nf-srow:has(> .nf-srow__select:hover) settings-rows.css:311 fill-thin
.nf-rows-sheet__close     settings-rows.css:536 fill-thin
.nf-coin-row:hover        crypto.css:119      fill-thin   crypto list
.nf-pair-row:hover        crypto.css:119      fill-thin
.nf-admin-nav__row:hover  admin.css:83        fill        admin rail
.nf-admin-kbd             admin.css:216       fill        the keyboard-shortcut chip
.nf-chip--pill:hover      chips.css:726       fill-strong
.nf-feedtabs              chips.css:307       fill        (no TSX consumer found; likely dead)
.nf-site-nav-glass:hover  landing.css:223     fill-strong on a photograph, so acceptable
.nf-site-nav-menu         landing.css:234     fill-strong on a photograph, so acceptable
```

And one Tailwind utility the patch cannot reach because it is not a hover:
`apps/web/src/components/agent/KycBanner.tsx:80` writes
`bg-[var(--nf-glass-fill-thin)]` with `border-[var(--nf-border-brand)]`. On
paper that is a white-at-72-per-cent plate with a 2.50:1 edge, on a white page.
The agent's KYC banner has no material on paper.

**Twelve of these are row hovers.** On paper, hovering a row in the drawer,
messages, the share picker, wallet transactions, settings, crypto and the admin
rail produces no visible change at all. That is not a cosmetic complaint; it is
the loss of the only affordance those rows have.

**The stale note.** `light.css:701-705` lists fifteen call sites still on the
utility and names them. The live count is eleven, and two of them
(`app/(app)/trips/TripSpine.tsx:247`, `components/app/wallet/Receipt.tsx:167`)
are not on the note's list, while RecentActivity, TransactionsSection, AdminNav,
LiveNotifications and Inbox have left it. The note is wrong in both directions.
The eleven, for the record:

```
components/app/Disclosure.tsx:73
components/app/wallet/Receipt.tsx:167
components/app/assistant/AssistantSidebar.tsx:137,157,186
components/app/assistant/AssistantSettingsSheet.tsx:166
components/agent/AgentMobileNav.tsx:57,103
components/agent/ModeSwitcher.tsx:47
app/(app)/listing/[id]/TenancyTerm.tsx:150
app/(app)/trips/TripSpine.tsx:247
```

---

## 5. Root cause R4: the stylesheets with no paper twin

Four partials carry no `[data-theme="light"]` rule at all and paint material
that is chosen for a dark ground.

### 5.1 `side-flip.css`, 590 lines, zero light rules

This is the founder's screenshot 1 and half of screenshot 2, and it is covered
in detail in section 7. The headline items:

- `side-flip.css:72-73` dims the outgoing page with
  `filter: brightness(0.45) saturate(0.8)`. On the night canvas that is the
  intended dim. On paper it turns a `#F4F5F7` page into roughly `#6D6E70`
  charcoal for the length of the turn. The flip, which
  `docs/DESIGN_DIRECTION.md:2` calls the product's signature, flashes dark grey
  on every use in daylight. INFERRED as to how it reads; the arithmetic of
  `brightness(0.45)` on `#F4F5F7` is not inferred.
- `side-flip.css:100-107` stacks `--nf-glow-brand-rim`, `--nf-glow-4`,
  `--nf-glow-3` and `--nf-glow-2` as the turning pane's lit edge. On paper
  `--nf-glow-4` flattens to `#89A9D6` at 2.42:1 and `--nf-glow-2` to `#CEDBEE`
  at 1.40:1, so three of the four rungs are invisible and the fourth is the
  outline. The pane has a hard blue line instead of a lit edge.
- `side-flip.css:236-250` paints the cover glow as two radial gradients of
  `--nf-side-accent` at 46 and 22 per cent. In daylight `--nf-side-accent`
  resolves to `--nf-mode-personal` or `--nf-mode-agent`, both saturated blues
  (`tokens.css:2806-2809`), so the glow is a strong blue wash on a white page:
  exactly the "blue glow around it" the founder reports.

### 5.2 `chrome.css`, 844 lines, zero light rules

The header and the dock live here. Their light answers are in `light.css`
instead, which is defensible, and `light.css` gives them exactly three rules
(`:377-391`), two of which include the white-on-white rim from section 3.3. The
header itself is token-clean (`chrome.css:720-735`); its light behaviour follows
`--nf-brand-tint-1` and `--nf-glow-edge`, and the latter is the 2.53:1 edge.

### 5.3 `overlays.css`, 328 lines, zero light rules

Token-clean throughout, with one arithmetic consequence worth naming.
`overlays.css:67` sets the drawer backdrop to `--nf-shade-3`, which on paper is
`rgb(18 21 26 / 0.18)`. Opening the side drawer in daylight dims the page by 18
per cent of ink. `--nf-overlay-backdrop` (`tokens.css:2829`) is 42 per cent and
is what the sheet backdrop uses at `overlays.css:162`. So the drawer and the
sheet dim the same page by 18 and 42 per cent respectively, and on paper the
18 per cent one is a haze rather than a scrim. In the dark theme 18 per cent of
near-black over a near-black page is also nearly nothing, so this is not a
light-only fault; it is simply more noticeable on paper because there is more
luminance to take away.

### 5.4 `ambient.css`, 644 lines, zero light rules

Correct by design: `light.css:286-310` switches the whole ambient layer off on
paper and replaces the ground with `--nf-canvas-daylight`. The one consequence
is the leak in section 9.5.

---

## 6. Root cause R5: nothing checks the paper twin

`apps/web/scripts/check-css-tokens.mjs` is the build gate. Its resting-edge
check, the one written for the founder's "our containers are dull" ruling,
excludes the light theme by name at `:587-589`:

```js
/* A state, or the paper twin. Neither is the resting edge this check is about. */
const NOT_RESTING =
  /(:hover|:active|:focus|:disabled|\[aria-pressed|\[aria-current|\[aria-disabled|\[data-on\b|\[data-loading|\[data-theme|\[disabled)/;
```

and `:575-577` states the reasoning: "what is left is exactly the fault: the
edge a control wears when nothing is happening to it, **in the theme that is
the product's default**." That reasoning is correct for what the check is for,
and its effect is that the gate has nothing to say about paper.

The shape rule (rule 10) runs over stylesheets and TSX and is theme-blind by
construction, so it is fine. The token-shape check at `:359-371` explicitly
refuses to follow alias chains "because an alias chain crosses theme blocks".
There is therefore no check anywhere that a token used on a light surface has a
light answer.

**And the gate has the exact machinery for section 3.5's fault and does not use
it.** `check-css-tokens.mjs:338-354` classifies every token's value as
`colour`, `gradient`, `shadow` or `unknown`, and `:449-459` fails a
property-shape mismatch. Its shadow clause, at `:456`, is:

```js
if (WANTS_SHADOW.has(property) && shape === "gradient")
  return `a gradient in \`${property}\`, which takes a shadow list`;
```

It fails a gradient in `box-shadow` and passes a COLOUR in `box-shadow`, which
is the one that happened, eleven times, in the light theme only. `!== "shadow"`
in place of `=== "gradient"` closes it.

The only contrast measurement in the repository is
`apps/web/scripts/probe-contrast.mjs`. It does run both themes (`:40-43`), and
it measures four elements on one route:

```js
const TARGETS = [
  ["stalled body", 'span:has-text("Do not send this again")'],
  ["stalled heading", 'span:text-is("We have not heard back")'],
  ["slow line", 'p:has-text("This is taking longer than usual")'],
  ["primary button label", 'a:has-text("See your history")'],
];
```

`scripts/design/compare-surface.mjs` is the shape sweep
(`docs/DESIGN_DIRECTION.md:4` cites `--shape-sweep`) and carries no theme
switch.

`light.css:230-233` wrote the governing sentence about all of this four months
ago:

> This is the only daylight-ONLY dead component found in the sweep, which is
> its own small lesson: a theme override is written once and then never looked
> at again by anybody working in the default theme, so it outlives the thing it
> overrides by longer than ordinary rules do.

The inverse is the fault this survey documents: a theme override that was never
written is never noticed by anybody working in the default theme either.

---

## 7. The four screenshots, explained

### 7.1 Screenshot 1: the Stays cover

The copy identifies it exactly. "Hotels, apartments, resorts and tables, booked
with the wallet you already have" is `coverStaysLine` at
`packages/i18n/src/locales/en.ts:151`, read by
`apps/web/src/components/app/flip/SideCover.tsx:63`. This is the flip cover,
the back face of `SideFlip`, not a separate splash.

**The large flat navy rounded square with a blue glow and no artwork.**
`SideCover.tsx:75-77` renders `<BrandIcon name={mark} size={128} priority />`
with `mark` = `"hotel"` from `COVER.stays` at `SideCover.tsx:30-33`. `hotel` is
not in `LIGHT_TWINS`, so it takes `.nf-brand-icon-ground` at `#052A6D`, 128px,
radius 26 per cent = 33px: a navy rounded square whose median object pixel
measures 2.11:1 while the square itself is 13.47:1 against the page.

The glow is `side-flip.css:273-278`:

```css
.nf-flip-cover__mark {
  filter:
    drop-shadow(0 0 14px color-mix(in oklab, var(--nf-side-accent) 80%, transparent))
    drop-shadow(0 0 48px color-mix(in oklab, var(--nf-side-accent) 50%, transparent));
  transform: scale(1.25);
}
```

`filter` applies to the element's whole rendered subtree, which on paper
includes the opaque navy chip, and a drop-shadow of an opaque square is a
square glow. So the founder gets a navy square with a blue halo, scaled up 25
per cent, which is his sentence word for word. On dark the chip is transparent,
the filter falls on the object's own alpha ramp, and the same rule produces the
lit glass building the reference draws. `.nf-flip-cover__glow`
(`side-flip.css:236-250`) adds a second blue radial behind it.

**The three small rounded squares that look like a step indicator.**
`SideCover.tsx:85-91` renders the miniature: three objects at 40px, `hotel`,
`shortlet` and `serviced-apartment` (`SideCover.tsx:32`). Each `li` is a 60px
tile (`side-flip.css:313-337`) filled
`linear-gradient(180deg, var(--nf-wash-3) 0%, transparent 60%), var(--nf-glass-card-fill)`
with `border: 1px solid var(--nf-brand-edge)`. On paper `--nf-glass-card-fill`
is `--nf-surface-primary` = `#FFFFFF` (`tokens.css:3031`) and `--nf-wash-3` is
ink at 9 per cent, so the tile is a near-white square with a 2.53:1 blue
hairline containing a 40px navy chip. Three 60px white tiles each holding a
40px navy square, in a row, under a heading, is a progress indicator to anybody
who has not been told otherwise. The founder read it as one and he read it
correctly.

"Two of which are flat grey-blue" matches the measurement: `shortlet` has a
median object pixel of 1.67:1 on the chip and `serviced-apartment` 2.11:1, so
two of the three show nothing and the third shows a little.

Note for the fix: the object the reference uses for this surface is
`stays-hotel-palms` (`docs/ICON_SYSTEM.md:161`, "the Stays side's mark"), which
is in the pack and used nowhere. `SideCover.tsx:31` uses `hotel` instead.
Changing that does not fix the chip.

### 7.2 Screenshot 2: the drawer

**The avatar as a flat blue disc with no image.** `AppRail.tsx:130-145`. With no
`avatarUrl` the fallback is `userName.slice(0, 1).toUpperCase()` (`:143`), one
initial, on `.nf-nav__avatar`: `background: var(--nf-gradient-brand)`
(`side-nav.css:167`), which on paper is
`linear-gradient(135deg, #005DE2 0%, #003A8C 100%)` (`tokens.css:3353`), with
`color: var(--nf-content-on-brand)` = white.

In the drawer the disc is 60px with a 20px initial and this ring
(`side-nav.css:241-249`): `0 0 0 3px var(--nf-glow-brand-rim)`,
`0 0 24px var(--nf-glow-3)`, `0 0 48px -8px var(--nf-glow-2)`. On paper
`--nf-glow-brand-rim` flattens to `#225DB2`, the same blue family as the disc's
own `#003A8C` to `#005DE2` gradient. A 3px ring in essentially the disc's own
colour, immediately against the disc, with two glow rungs behind it at 1.82:1
and 1.40:1. Ring and disc merge into one larger flat blue disc, and a 20px
white initial inside 60px of blue is a small mark in a large field. That is "a
flat blue disc with no image".

It is also `aria-hidden="true"` (`AppRail.tsx:130`), which is correct only
because the name is beside it. `RemoteImage`
(`components/ui/RemoteImage.tsx:61-74`) is robust and falls back to
`unoptimized` for unknown hosts, so this is not a broken image request: the
founder simply has no avatar set.

**The flip coin card showing a flat navy rounded square.**
`SideSwitch.tsx:78-82`:

```tsx
<span className="nf-side-switch__ring" aria-hidden="true">
  <span className="nf-side-switch__coin">
    <BrandIcon name={other === "stays" ? "hotel" : "keys-home"} size={30} />
  </span>
</span>
```

Two faults compound here.

First, the coin disc. `side-flip.css:509-518`:

```css
.nf-side-switch__coin {
  ...
  border-radius: var(--nf-radius-circle);
  background: var(--nf-glass-fill-strong);
  box-shadow: inset 0 0 0 1px var(--nf-glass-rim);
}
```

On paper `--nf-glass-fill-strong` is white at 95 per cent and `--nf-glass-rim`
is white at 90 per cent. Both are painted on a `.nf-glass--card` whose light
fill is `--nf-surface-primary` = white (`light.css:528-533`). The 44px circle
is white on white with a white rim. **It disappears entirely.**

Second, the object inside it. `hotel` is untwinned, so `BrandIcon` wraps it in
the navy chip, 30px, squircle radius 26 per cent, roughly 8px of corner. What
is left visible is a 30px navy ROUNDED SQUARE where a 44px circle with a coin in
it should be, which is exactly the founder's sentence.

Third, and this is a design note rather than a defect: the coin object here is
`hotel`, while `docs/ICON_SYSTEM.md:167` records `flip-coin` as "the two-faced
glass coin with the bars mark, from the drawer's Flip Coin card", cropped
specifically for this surface. `flip-coin` is in `BRAND_ICONS`
(`BrandIcon.tsx:121`) and has exactly two references in the whole tree, both of
them inventories: `BrandIcon.tsx:121` and
`app/(dev)/preview/g2/objects.ts:21`. **The object commissioned for this card is
not used on this card.**

**The Console row's shield-with-minus.** `components/app/nav-model.ts:270`:

```js
workspaces.push({ href: "/admin", label: t.nav.consoleLabel, icon: "shield-stop" });
```

`shield-stop` is a `UiIcon` glyph (`design-system/icons/UiIcon.tsx:79,379`).
`AppRail.tsx:207-213` states the product's own rule about it: "The only shield
in the pack is `shield-stop`, which this product has given one meaning, an agent
stopped from trading, and borrowing it for a link to the terms would teach that
shape a second one." The drawer then borrows it for the admin console, which is
the same violation the same file refuses two lines earlier. Theme-neutral; the
founder noticed it in light because the drawer is where he was looking.

### 7.3 Screenshot 3: further down the drawer

Everything in 7.2 applies. The "Dark mode" row is
`components/site/ThemeToggle.tsx:92`, which states the DESTINATION rather than
the state and is therefore correct while the user is in light mode. The row's
hover is one of the twelve dead ones from section 4
(`side-nav.css:564`).

### 7.4 Screenshot 4: home, and the dock

The founder is right that the category tiles render correctly here, and the
reason is instructive. `MarketTiles.tsx:47` passes `fill` rather than `size`,
and `home.css:149-153` gives the wrapper 28px. `glass.css:1073-1077` then gives
this one case a lit edge:

```css
.nf-home__market-art .nf-brand-icon-ground,
.nf-landing-cat-icon .nf-brand-icon-ground,
.nf-landing-orb .nf-brand-icon-ground {
  box-shadow: var(--nf-glow-edge);
}
```

So on the home grid the navy chip is DELIBERATE, framed, and reads as a small
dark plate carrying a mark rather than as a hole. That is the one surface where
the chip was designed in rather than defaulted to, and the founder's eye
confirms the difference. It is the model for the fix.

The clipping and the dock are section 8.

---

## 8. The dock arithmetic, and the safe area

### 8.1 What the dock occupies

`components/app/MobileTabBar.tsx:309` positions it:

```tsx
className="nf-dockrow fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 lg:hidden"
```

`chrome.css:426-432` sizes each island at `3.5rem` square, and `.nf-tabbar`
matches it (`chrome.css:246` sets `padding: var(--nf-tab-pad)` = 0.375rem
around a 48px row). So the dock band is 56px tall, offset 12px plus the inset
from the viewport edge.

`chrome.css:111-113` declares the token built for exactly this:

```css
:root {
  --nf-tabbar-clearance: calc(0.75rem + env(safe-area-inset-bottom, 0px) + 3.5rem + 0.75rem);
}
```

= 12 + inset + 56 + 12 = **80px + the safe-area inset**. On an iPhone with a
home indicator that is 80 + 34 = 114px.

### 8.2 What the app shell reserves

`components/app/AppShell.tsx:252`:

```tsx
: `min-w-0 flex-1 lg:pb-3xl ${showsTabBar(active) ? "pb-4xl" : "pb-xl"}`
```

`pb-4xl` maps through `apps/web/src/app/css/theme.css:62` to
`--nf-space-4xl`, which `tokens.css:1992` fixes at `6rem` = **96px, with no
safe-area term**. The inner `.nf-shell py-section-tight` (`AppShell.tsx:313`)
adds `--nf-gap-section-tight` = `clamp(2rem, 1.25rem + 3vw, 3rem)`, which at
390px viewport width evaluates to the 2rem floor = 32px.

Total reserved: **128px**. Required: **114px**. Margin: 14px.

That clears, barely, and it clears by accident, because the 32px comes from a
section rhythm token that has nothing to do with the dock. On a device with a
larger inset, at any viewport wide enough to push `py-section-tight` above its
floor in the wrong direction, or on any route that sets its own inner padding,
the margin goes. And `pb-4xl` is a fixed number where the correct value is a
declared token that already exists.

### 8.3 Who actually uses the token

Five consumers, and the app shell is not among them:

```
components/ui/ActionBar.tsx:59
app/(dev)/preview/f4/FeedPreview.tsx:28
app/(app)/around/loading.tsx:16
app/(app)/around/page.tsx:162
app/(app)/around/settings/page.tsx:89
```

`--nf-tabbar-clearance`'s own comment (`chrome.css:104-110`) says "Sticky
footers on tab-bar routes offset by this instead of guessing. The previous
guess was a flat 80px, which cleared nothing on a notch." The app shell is
still guessing, at 96.

There is also a documentation drift inside that comment: it says the offset is
"0.9rem + the home-indicator inset" while both the token and the component use
`0.75rem`.

### 8.4 Why the counts read as clipped, and what I cannot prove

The dock is `position: fixed` and therefore always overlaps whatever is
scrolling under it. What differs between themes is how much of that shows
through. `chrome.css:447`:

```css
background: color-mix(in oklab, var(--nf-surface-canvas) 90%, transparent);
```

Ten per cent of the content beneath leaks through in both themes, then is
blurred by `blur(var(--nf-glass-blur-strong))` = 40px (`chrome.css:453-454`,
`tokens.css:1165`). On the night canvas the content underneath is light ink on
near-black and the leak reads as a faint lightening. On paper the content
underneath is near-black ink on white and the leak reads as a grey smear inside
a near-white band. **INFERRED**: I could not render this. What is not inferred
is that the fill is a 90 per cent canvas wash in both themes and that the
theme with more luminance range under it will show more.

**The browser's own bottom bar overlapping the dock is also INFERRED and I
could not reproduce it.** The candidate mechanisms, in order of likelihood:

1. `apps/web/src/app/layout.tsx:201` sets `viewportFit: "cover"` and `:135-136`
   pairs it with `apple-mobile-web-app-status-bar-style: black-translucent`. In
   iOS Safari with the bottom address bar expanded, `env(safe-area-inset-bottom)`
   returns 0 and the layout viewport ends at the toolbar; with it collapsed the
   inset becomes about 34 and the fixed element moves. A screenshot taken during
   or just after that transition shows the dock sitting under the toolbar.
2. The shell uses `min-h-dvh` (`AppShell.tsx:185`) and `h-dvh` for immersive
   routes (`:251`). `dvh` tracks the dynamic viewport, but `position: fixed`
   bottom offsets do not, so the two disagree during a toolbar transition.
3. Nothing in the tree reads `window.visualViewport` for the dock.
   `components/ui/Sheet.tsx:82,323` is the only consumer, and it is for sheets.

A fix that does not need the diagnosis: give `.nf-dockrow` a
`padding-bottom: env(safe-area-inset-bottom)` on the ROW and put the 12px gap
inside, so the floor of the element is the true viewport floor rather than an
offset from it, and have the shell read `--nf-tabbar-clearance` instead of
`pb-4xl`.

---

## 9. Contrast audit

### 9.1 Method

I wrote three scripts rather than eyeballing hex values.

1. A resolver that parses both theme blocks of `tokens.css`, follows `var()`
   chains within the correct theme, and evaluates `color-mix(in oklab, ...)`
   with premultiplied alpha through a real sRGB to OKLab conversion.
2. A rule scanner that parses all 37 stylesheets into selector and declaration
   pairs, applies any matching `:root[data-theme="light"]` override, and
   evaluates the resulting foreground against the resulting background.
3. A pixel measurer using PIL for the artwork in section 2.3.

Thresholds: 4.5:1 for text (WCAG 2.2 AA at normal size), 3:1 for interface
elements and boundaries (1.4.11).

**Caveat, stated up front.** A static scanner cannot see an ancestor's
background, so for rules that set only `color` I evaluated against the two
grounds the light theme actually paints, `#FFFFFF` and `#F4F5F7`, and I
discarded every hit whose element sits on a photograph, a brand fill or the
story stage after reading the rule. What remains below is what I could stand
behind. This is a floor on the number of failures, not a ceiling.

### 9.2 Text failures, 4.5:1

**Confirmed, both properties in one rule and the ground is genuinely the one
computed:**

| ratio | element | evidence |
|---|---|---|
| **1.00:1** | settings hub avatar initials, white on white | `settings-rows.css:691` sets `color: var(--nf-content-on-brand)`; `settings-rows.css:947-952` sets the light padding-box to `--nf-surface-primary` (`#FFFFFF`). The initials are `#FFFFFF` on `#FFFFFF`. Dark equivalent is 20.29:1. |
| **1.07:1** | the "Example" disclosure chip on a listing card | `catalogue.css:263-270`. Ink is `--nf-state-warning`, which is `#00C8FF` at night and `#0E6E8C` on paper (`tokens.css:3155`). Ground is `--nf-overlay-media-strong`, black at 62 per cent, frozen in both themes (`tokens.css:521`). Dark 6.67:1 over a mid-grey photo, light 2.26:1; over the light no-photo plate, dark 3.97:1 and light **1.34:1**. |
| **3.35:1** | the heart control on a listing card | `catalogue.css:280-291`. White glyph on `--nf-overlay-media` (black 45 per cent) over the light no-photo plate. Theme-independent in token terms but only fails on paper because the plate under it is `--nf-media-ground-from/to` = `#DFE4EC` to `#C7CEDB` in light against `#1B2A52` to `#0B1226` in dark (`tokens.css:2837-2838`). |
| **4.13:1** | "No photo" plate label | `catalogue.css:310-320`, 12px overline, `--nf-content-on-media-muted` (white 72 per cent) on the same scrim over the light placeholder. |

The settings hub case is the clearest single defect in the survey. The light
rule exists, was written deliberately (`settings-rows.css:931-946` explains
itself at length), and changes the background while leaving the base rule's
white ink in place.

### 9.3 Interface failures, 3:1

The whole container edge ladder fails, and section 3.1 has the table. Stated as
findings:

| ratio on white | token | where it is the only boundary |
|---|---|---|
| 1.18:1 | `--nf-border-subtle` | `.nf-nav--rail` divider `side-nav.css:32`, `.nf-nav__who` `side-nav.css:142`, panels throughout |
| 1.20:1 | `--nf-divider` | every hairline separator |
| 1.23:1 | `--nf-glass-border`, `--nf-elev-1-border` | `.nf-glass--tile` light border `light.css:539` |
| 1.31:1 | `--nf-border-default`, `--nf-edge-stride-base` | `.nf-field` light border `light.css:204`; three-quarters of every card ring |
| 1.61:1 | `--nf-border-strong` | |
| 1.86:1 | `--nf-brand-edge-soft`, `--nf-edge-stride-lit` | `.nf-chip` resting edge on paper `light.css:131`; `.nf-glass--card` `light.css:535` |
| **2.50:1** | `--nf-border-brand` | frozen at `#005DE0` alpha 0.55 in the dark block only (`tokens.css:476`), used at 16 sites including `settings-rows.css:923` (the settings group and the profile card on paper) and `components/agent/KycBanner.tsx:80` |
| **2.53:1** | `--nf-brand-edge`, `--nf-edge-stride-peak` | `.nf-icon-tile` `glass.css:1128`, `.nf-dock-island` `chrome.css:452`, the middle layer of `--nf-glow-edge` `tokens.css:3323`, the flip miniature `side-flip.css:331` |
| 1.09:1 | the switch thumb when off | `controls.css:705` paints the thumb `--nf-content-on-brand` (white); `controls.css:714-718` gives the OFF track `--nf-surface-inset` (`#EFF1F4`) and does not touch the thumb. White knob on `#EFF1F4`. Only `--nf-elev-1` (ink at 5 per cent) separates them. |
| 1.00:1 | every light `*-rim` | `--nf-glass-rim-strong` is `rgb(255 255 255 / 1)` (`tokens.css:3041`), used on the dock at `light.css:380` |

`--nf-brand-edge-strong` at 3.97:1 and `--nf-glow-brand-rim` at 6.42:1 are the
only two rungs of the brand edge ladder that clear 3:1 on paper. Neither is the
resting edge of anything.

### 9.4 Frozen colour tokens used on light surfaces

Fifty-three colour tokens are declared only in the dark block and resolve to the
same value in both themes. Most are deliberate: the `-on-media` family is for
ink over photographs, the mask tokens are for `mask-image`, the palette ramps
are primitives. Three are used where paper actually is the ground:

- `--nf-surface-on-paper` = `rgb(255 255 255 / 0.72)` (`tokens.css:1022`). This
  one is NOT stranded: it is the deliberate paper fill for admin, agent and
  threads (`admin.css:936`, `agent.css:420`, `threads.css:1412,1449`). The
  correction matters for the fix and not for the symptom, because white at 72
  per cent measures 1.000:1 on a white card and 1.065:1 on the canvas. Chosen
  on purpose and worth nothing. See section 3.5.
- `--nf-shadow-on-paper` = `rgb(18 21 26 / 0.18)` (`tokens.css:1024`), likewise
  deliberate and likewise worth nothing, because it is a colour written where
  CSS requires a shadow and the declaration is dropped. Section 3.5.
- `--nf-border-brand` at 2.50:1, covered above.
- `--nf-content-on-media-accent` = `#B4D3FF` (`tokens.css:645`), 1.53:1 on
  white, used at `catalogue.css:301` for the pressed heart over a photo (fine)
  and at `landing.css:105,329` as `--nf-landing-accent` (also over the hero
  photograph, so fine).

### 9.5 The light rules that leak into the dark-locked surfaces

`app/(auth)/layout.tsx:57` and `components/app/welcome/WelcomeStage.tsx:26`
both render `<main className="nf-auth" data-theme="dark">`, and both files
carry a long note explaining that a rule keyed `:root[data-theme="light"] .nf-x`
still matches inside that subtree. `auth.css` was cleaned accordingly.

Three rules elsewhere were not, and they reach these screens whenever the user
is in light mode:

1. `light.css:305-310` sets `display: none` on `.nf-aurora` and
   `.nf-grid-veil`. `app/(auth)/layout.tsx:59-60` renders both of those
   elements. **In light mode the auth screen loses its aurora and its grid
   veil**, so the dark-locked sign-in surface renders as the photograph plus
   flat navy with two of its three atmosphere layers switched off.
2. `glass.css:1058-1060` puts a `--nf-edge-stride-base` inset hairline on every
   `.nf-brand-icon-ground`. Inside the dark subtree the token resolves to the
   DARK value (`#1A2240` at 14 per cent), so every object on
   `components/app/welcome/FirstRun.tsx:128,137` and
   `app/(auth)/start/StartCarousel.tsx:111` wears a faint box the dark theme
   never draws.
3. `glass.css:955-957` hides `.nf-brand-icon--night`. No twinned object is
   currently rendered inside either subtree (FirstRun uses `modern-house` and
   `hotel`, StartCarousel uses `home-search` and `home-check`, all untwinned),
   so this one is a live trap rather than a live bug. The first twinned mark
   anyone puts on the auth or welcome screen will render its white frosted
   light twin on a navy ground, for light-mode users only.

---

## 10. Surface by surface

For each: what breaks on paper, and where. A surface listed as "clean" means I
found no light-specific defect in its stylesheet beyond the platform-wide root
causes, which reach every surface by definition.

### 10.1 App header
`chrome.css:640-755`, plus `light.css:135-140` for the icon buttons. Clean in
token terms; `light.css:111-127` records that the icon buttons were a grey
square on paper (R1 finding A23) and fixes it. Inherits R2: the frosted state
at `chrome.css:726-735` separates from the page by `--nf-glow-edge`, whose
outline rung is 2.53:1. The unread dot (`chrome.css:650-663`) is correct and
its comment records the exact class of bug this survey is about: it used
`--nf-status-pending`, "whose daylight twin is `#0E6E8C`, so the dot rendered
teal-green on paper and a bell wearing the success colour said 'all good' where
it meant 'you have unread'."

### 10.2 Side drawer
`side-nav.css`, 728 lines, 5 light rules. Broken on paper:
- Every row hover is white on white (`side-nav.css:564`).
- The close control's hover is white on white (`side-nav.css:106`).
- The user card's fill and hover are white on white (`side-nav.css:134,147`).
- The avatar merges with its ring (section 7.2).
- Every row glyph that is a `BrandIcon` takes the chip. `NavTree` uses `UiIcon`
  for rows, so this is limited to the foot.
- The Console row borrows `shield-stop` (`nav-model.ts:270`).

### 10.3 The dock
Section 8. Plus: `light.css:380` paints a pure-white rim on a near-white dock,
`chrome.css:452` gives it a 2.53:1 edge, and the shell reserves 96 fixed pixels
where a 80-plus-inset token exists.

### 10.4 The flip and its cover
`side-flip.css`, 590 lines, **zero** light rules. Sections 5.1 and 7.1. Five
distinct defects: the `brightness(0.45)` dim on a white page, the cover glow as
a saturated blue wash, the 128px navy chip as the mark, the three miniature
tiles reading as a step indicator, and the coin disc vanishing white on white.
This is the worst-served surface in the product and it is the one
`docs/DESIGN_DIRECTION.md:2` calls the signature.

### 10.5 Welcome and first run
`components/app/welcome/WelcomeStage.tsx:26` locks it dark, correctly. The two
112px objects at `FirstRun.tsx:128,137` therefore do NOT take the chip, because
`--nf-icon-ground` resolves to the dark `transparent` inside the subtree. They
do pick up the stray hairline from `glass.css:1058` (section 9.5, item 2).

### 10.6 Sign in and the auth family
`app/(auth)/layout.tsx:57` locks it dark and `auth.css` has been cleaned of
light rules on purpose (three matches at `:222,502,832` are all prose). The
aurora and grid-veil leak in section 9.5 item 1 is the one live defect.
`light.css:336-359` still carries light rules for `.nf-auth-row` and
`.nf-auth-row__mark`; those are in `light.css` rather than `auth.css`, so the
cleanup the layout describes was only half done. Whether they are harmful
depends on whether `.nf-auth-row` appears outside the dark-locked subtree, which
I could not determine statically.

### 10.7 Landing page
`landing.css`, 1957 lines, 22 light rules. The most carefully themed surface in
the repository. `landing.css:86-98` sets a paper token set, `:99-111` swaps to
an on-ink set from 64rem because the desktop hero is a photograph, and
`:324-335` does the same for the mobile hero specifically. `site.css:235-271`
keeps the `(site)` page plate BELOW the title under 64rem and moves it behind
with a scrim above it, so the title is never dark ink on a dark photo. I found
no light defect here beyond R1 reaching `CategoryGrid`, `FeatureChips`,
`HowVallo` and `StaysBand`, and R2 reaching `.nf-site .nf-card`
(`site.css:346-355`).

### 10.8 Home
`home.css`, 1292 lines, 21 light rules. The market grid is the ONE place the
navy chip is designed in rather than defaulted to (`glass.css:1073-1077`), and
the founder confirms it reads. Everything else on the page inherits R2. The
count line is `--nf-content-link` (`home.css:169`), which resolves to
`#094DAF` on paper = 7.76:1 on white, correct.

### 10.9 Search and filters
`catalogue.css:2131-2231` is a substantial light block covering seventeen
classes, including `.nf-shelf-chip`, `.nf-filters__tile` and `.nf-filters__row`.
Clean, with two inherited problems: the nine `CategoryRail` objects take the
chip (`components/app/search/CategoryRail.tsx:79-87`) and the chip's recessed
fill is 1.04:1 against the canvas (section 3.4).

### 10.10 Listing detail
Covered by the same `catalogue.css` light block: `.nf-detail-tag`,
`.nf-detail-panel`, `.nf-spec-tile`, `.nf-amenity-tile`, `.nf-agent-card`,
`.nf-ledger-card`. Two open items: `.nf-glass--strong`, which the loading state
uses (`app/(app)/listing/[id]/loading.tsx:28`), has no light answer and is white
at 95 per cent on white (`glass.css:226`); and `TenancyTerm.tsx:150` is one of
the eleven dead hovers.

### 10.11 Stays
`catalogue.css:1716-1830`. The hero object at `app/(app)/stays/page.tsx:102` is
`BrandIcon name="hotel"` at full tile width inside `.nf-stays-hero__object`
(`catalogue.css:1730-1735`), which is `width: 100%` of a 7.5rem to 10rem column
with `drop-shadow(0 0 22px var(--nf-glow-2))`. That is a 120 to 160px navy chip
with a 1.40:1 blue drop-shadow on a white page: the same defect as the flip
cover at a slightly smaller size. The five category tiles
(`StayCategoryTiles.tsx:19-23`) are all untwinned.

`stays-hotel-palms`, the object `docs/ICON_SYSTEM.md:161` names as "the Stays
side's mark", is used nowhere.

### 10.12 Stay detail
`app/(app)/stay/[id]/StayDetailView.tsx:362` picks from `BUSINESS_OBJECT` with
a `?? "hotel"` fallback; all untwinned. `.nf-stay-facts`, `.nf-stay-fact`,
`.nf-stay-type`, `.nf-room-tile` and `.nf-stay-card__chip` are in the light
block at `catalogue.css:2146-2151`. Clean otherwise.

### 10.13 Trips
No dedicated stylesheet. Built from `.nf-card` and utilities, and its token use
is clean (13 uses of `--nf-content-muted`, 8 of `--nf-content-primary`, and so
on). Two items: `TripSpine.tsx:247` is a dead hover, and `TripSpine.tsx:256`
selects between `concierge-bell` and `hotel-room`, both untwinned.

### 10.14 Restaurants
No dedicated stylesheet and only three incidental matches across all partials.
Inherits everything and originates nothing.

### 10.15 Checkout
`app/(app)/checkout/[bookingId]/PayPanel.tsx:111` and `page.tsx:303,326` draw
`naira-hand` and `calendar-check`, both untwinned. `PayPanel.tsx:436` sets
`paddingBottom: "env(safe-area-inset-bottom, 0px)"` on the pinned bar, which is
correct. `HoldCountdown.tsx:134` draws `calendar-clock`, untwinned, on a money
surface. `.nf-pay-row` has a light answer (`wallet.css:704-710`) but its hover
does not, and `wallet.css:549` is white on white.

### 10.16 The wallet family
`wallet.css`, 714 lines, 17 light rules covering `.nf-wallet-hero`,
`.nf-wallet-tile`, `.nf-glyph-tile`, `.nf-tx-tile`, `.nf-recipient__avatar`,
`.nf-money .nf-card`, `.nf-pay-row`, `.nf-recipient-found`, `.nf-trust__badge`
and `.nf-result-mark--lit`. This is the best-served surface after catalogue and
it is also where the eleven twinned objects live, so `/wallet/send` and
`/wallet/receive` are the two screens in the product whose objects are actually
drawn for paper. Open items:
- `.nf-tx-row:hover` is white on white (`wallet.css:341`).
- `.nf-wallet-tile:hover` is white on white (`wallet.css:170`).
- `WalletDeck.tsx:147` draws `wallet` (untwinned) beside `seal-pending` at
  `:600` (twinned). Those two marks sit on the same surface and only one of
  them is drawn for paper, so the page mixes a navy chip and a frosted white
  mark in one column.
- `Receipt.tsx:167` is a dead hover, on a receipt.

### 10.17 Settings
`settings-rows.css`, 954 lines, 9 light rules. Two defects, one of them the
worst confirmed contrast failure in the survey:
- `.nf-hub-profile__avatar` initials are `#FFFFFF` on `#FFFFFF`
  (`settings-rows.css:691` and `:947-952`). 1.00:1.
- The six hub objects (`SettingsHub.tsx:244-290`: `person-card`, `bell-tile`,
  `shield-check-tile`, `palette`, `globe`, `headset`) are the six worst objects
  in the pack for the chip, with median pixels of 1.16, 1.17, 1.19, 1.17, 1.17
  and 1.17 to one. The file says so itself at `SettingsHub.tsx:148-151`.
- `a.nf-srow:hover` and `.nf-srow:has(> .nf-srow__select:hover)` are white on
  white (`settings-rows.css:164,311`).
- `.nf-rows-sheet__close` is white on white (`settings-rows.css:536`).

### 10.18 The feed and stories
`social-feed.css`, 3564 lines, 25 light rules, and `social.css`, 836 lines, 12.
The story surfaces are a deliberate dark stage in BOTH themes
(`motion.css:469-474`, `--nf-story-stage` at `tokens.css:1040`), and
`glass.css:1086-1089` correctly suppresses the icon chip inside it. That is the
right pattern and it is the only place in the product that uses it. The `-on-media`
tokens inside `.nf-story__*` are therefore correct, not failures, and I
discarded them from the audit.

Open items:
- `.nf-story__card-share`, `.nf-story__act-circle`, `.nf-story__commentbar`,
  `.nf-story__more` use `--nf-wash-on-media-1/2` with no light override
  (`social-feed.css:1552,1650,1731,1564,1709`). These sit on the dark stage, so
  they are fine today and they are fine by accident rather than by rule.
- `.nf-scene-chip` (`motion.css:487-493`) gives its brand border only to
  `:root:not([data-theme="light"])`, leaving light with
  `border: 1px solid var(--nf-wash-2)`, ink at 6 per cent, drawn around a DARK
  chip on a white card. The edge is inverted on the one theme where the chip is
  the dark object.
- The bloom FAB and its lozenges are covered (`social-feed.css:3517,3527,3537`).

### 10.19 Profile
`social.css:770-812` covers `.nf-social-cover__art`, `.nf-social-cover__scrim`,
`.nf-social-avatar`, `.nf-profile-avatar` and its badge.
`social-feed.css:866-870` covers `.nf-social-round` with an explicit inversion
and a good note. Clean. `ProfileHeader.tsx:267` and `ProfilePosts.tsx:112` draw
objects from tables; all untwinned.

### 10.20 Messages and the three thread faces
`threads.css`, 1456 lines, 29 light rules covering `.nf-bubble--theirs`,
`.nf-bubble--mine`, `.nf-context-card`, `.nf-chat-card`, `.nf-composer__field`,
`.nf-thread__ring`, `.nf-msg__avatar` and `.nf-inbox-row__ring`. Well served.
Open items:
- `.nf-inbox-row:hover` and `.nf-share-row:hover` are white on white
  (`threads.css:926,1013`).
- The paper fill for bubbles, cards, rings and avatars is
  `--nf-surface-on-paper` at 1.00:1 on a white card, and all six paper shadow
  rules (`threads.css:1415,1432,1436,1442,1450,1455`) are invalid declarations
  that paint nothing. Section 3.5. On paper the whole messaging and inspections
  surface has neither fill nor shadow.
- The three faces draw untwinned objects except one: `RentalFace.tsx:187`
  picks `seal-check` (twinned) or `calendar-clock` (untwinned) from the same
  ternary, so the same slot on the same card is drawn for paper in one state and
  not the other. `BookingFace.tsx:86` and `ThreadContextBanner.tsx:83,141,183`
  are all untwinned.

### 10.21 Inspections
`threads.css:1024-1060` and the light block at `:1444-1455` covering
`.nf-insp-card`, `.nf-insp-facts`, `.nf-insp-ladder`, `.nf-insp-notes` and
`.nf-insp-step__tile`. The block is written and three of its shadows
(`threads.css:1432,1450,1455`) are invalid and dropped, so the inspection
ladder has a 1.00:1 fill and no lift on paper. `.nf-insp-step__ring` sets white ink
(`threads.css:1316`) on a background declared elsewhere; the step ring is a
brand fill, so this is correct. `InspectionSheet.tsx:489` draws `home-check`,
untwinned.

### 10.22 Notifications
`home.css:633-650`. Two light rules, both correct, and the unread dot uses
`--nf-mark-unread` rather than a state colour with an explicit note about why
(`home.css:625-632`). Clean.

### 10.23 The host wizard
`agent.css:412-426` covers `.nf-host-choice`, `.nf-host .nf-card`,
`.nf-host-group` and `.nf-host-drop`. `components/host/HostWizard.tsx:431`
draws from `TYPE_MARK` (all untwinned property types) and `:1148` draws
`seal-pending` (twinned), so the wizard mixes both treatments.
`app/host/page.tsx:103` draws `hotel` (untwinned) and `:122` draws `doc-review`
(twinned) on the same page. `.nf-host-choice__ring` sets white ink
(`agent.css:289`) on a brand fill, correct.

### 10.24 The agent console
`agent.css`, 428 lines, 10 light rules covering `.nf-agent-stat`,
`.nf-agent .nf-card`, `.nf-agent-panel` and the search input. Open items:
- `KycBanner.tsx:80` has no fill on paper (section 4).
- `agent.css:420-421` gives `.nf-agent-stat`, `.nf-agent .nf-card`,
  `.nf-agent-panel`, `.nf-host-choice`, `.nf-host .nf-card` and
  `.nf-host-group` a 1.00:1 fill and an invalid shadow. Section 3.5.
- `AgentMobileNav.tsx:57,103` and `ModeSwitcher.tsx:47` are dead hovers.
- `ModeSwitcher.tsx:49,74` draw `homes-sparkle` and `user-check`; the first is
  a `LEGACY_ALIAS` onto `cluster-home` (`BrandIcon.tsx:303`) and both are
  untwinned.
- `app/agent/list/ListingWizard.tsx:2236` pins its footer with
  `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`, correct, and `:1025`
  reserves `pb-[calc(6.5rem+env(safe-area-inset-bottom))]` for it, also correct.
  This is the pattern `AppShell.tsx:252` should be using.

### 10.25 The admin desks
`admin.css`, 1018 lines, 33 light rules, the second-largest light block in the
repository, covering the rail, the tables, the chips, the tabs, the pager and
the search fields. Well served. Open items:
- `.nf-admin-nav__row:hover` is white on white (`admin.css:83`).
- `.nf-admin-kbd` has no fill on paper (`admin.css:216`).
- `admin.css:937,944,962,1000` are four invalid `box-shadow` declarations, and
  `:944` takes the flagged stat card's 4px inset rule down with it, so the
  flagged card loses its flag on paper. The paper fill beneath them is 1.00:1.
  Section 3.5. This is the single largest concentration of the fault.
- `app/admin/layout.tsx:70` draws `office-space`, untwinned, as the console's
  mark.
- `admin.css:983-991` contains a full contrast working for the chip inks in both
  themes, written by hand, and it is correct. It is the only such working in the
  repository and it is a model for what the rest of the product needs.

---

## 11. Ranked fix list

### Tier 0: the root causes, in the order that removes the most symptoms

**F1. Decide the daylight answer for an untwinned object, and stop defaulting.**
This is one decision that closes the flip cover, the side splash, the drawer
coin, the stays hero, the settings hub, the search rail, the stays tiles, the
landing grids, the bookings list, the checkout marks and roughly 130 call
sites. Three honest options, and the evidence points at the third:

- (a) Commission the remaining 121 light twins. Correct, and it is a render
  order, not a code change. `scripts/icon-manifest.mjs:572` shows the pipeline
  already accepts a light sheet; adding sheets is filing, not engineering.
- (b) Run the cutout test the code already specified
  (`glass.css:995-1006`): set the daylight `--nf-icon-ground` to `transparent`
  and look at the objects on white at 16px and at 160px. My measurements say
  most of them will fail it, because a glass object's interior alpha is partial
  and white shows through, and that is exactly what the note predicts.
- (c) **Generalise the home grid's treatment.** `glass.css:1073-1077` already
  frames the chip with `--nf-glow-edge` on the three surfaces where the object
  is the tile, and the founder's own screenshot 4 confirms it reads. Make the
  framed plate the DEFAULT for daylight rather than the exception, size it
  deliberately per slot, and the chip stops being a hole and becomes a
  container. This costs one rule and unblocks everything while (a) proceeds.

Whichever is chosen, two sub-fixes go with it immediately:
- The 41 render crops are tile-form objects and must never take a chip, for the
  same reason `glass.css:1040-1046` excuses the 23 twinned marks. Add them to
  the no-chip set. They are the fourteen worst measurements in section 2.3.
- Correct the count in `glass.css:986-993` from `103 - LIGHT_TWINS.size` to
  `144 - LIGHT_TWINS.size` = 121, and correct `docs/ICON_SYSTEM.md:18`.

**F2. Give the paper theme a real container boundary.** Three token changes:
- Raise the daylight `--nf-brand-edge` so the resting control edge clears 3:1.
  `--nf-brand-edge-strong` already measures 3.97:1, so the ladder needs a shift
  rather than a new colour.
- Raise `--nf-edge-stride-base` on paper. At 1.31:1 it is three-quarters of
  every card's ring and it is not a line.
- Replace the light `--nf-elev-*-rim` with something that is not white on white.
  On paper the analogue of a top highlight is a bottom shade, and
  `--nf-glass-floor` already exists.
- Fix `--nf-shadow-on-paper` (`tokens.css:1024`) so it is a shadow rather than a
  colour, or change the eleven call sites to `0 1px 2px var(--nf-shadow-on-paper)`
  or similar. Either way the eleven declarations in section 3.5 currently paint
  nothing, and `admin.css:944` also loses the flag it was written to preserve.
- Raise the light `--nf-surface-on-paper` off 1.00:1, or stop using it as the
  paper fill for admin, agent, host, messages and inspections.

**F3. Replace the glass fill with the right token in the 23 rules of section 4,
plus `KycBanner.tsx:80`.** `light.css:686-706` already names the correct token
(`--nf-interactive-hover`) and the correct argument. Twelve of the 23 are row
hovers, so this single substitution restores hover feedback across the drawer,
messages, wallet, settings, crypto and admin at once. Then delete
`light.css:707` and update the stale note.

**F4. Write the paper twin for `side-flip.css`.** Four rules:
- A light dim that is not `brightness(0.45)`.
- A cover glow that is a wash rather than a saturated blue radial.
- A cover mark that does not carry the chip.
- A coin disc that is not white on white.

**F5. Put a light-theme check in the build.** Three cheap ones, in ascending
order of value:
- A token-parity check: every colour token used in a rule that can match on
  `:root[data-theme="light"]` must resolve to something other than its dark
  value, or be on an explicit frozen list with a reason. This is the check that
  would have caught `--nf-surface-on-paper` on four paper surfaces.
- A white-on-white check: for each rule, resolve `color` and `background` in
  the light theme and fail under 3:1. My `pairs.py` approach is about 120 lines
  and found the settings-hub avatar in one pass.
- **One character in the gate that already exists.**
  `apps/web/scripts/check-css-tokens.mjs:456` reads
  `if (WANTS_SHADOW.has(property) && shape === "gradient")`. Change `=== "gradient"`
  to `!== "shadow"` and the eleven invalid declarations in section 3.5 fail the
  build today. The machinery for this check is already written at `:338-354`
  and `:430-459`; it simply does not test for the case that actually happened.
- Run `scripts/design/compare-surface.mjs` and `probe-contrast.mjs` in both
  themes, and extend the probe's `TARGETS` beyond four elements on one route.

### Tier 1: the individual confirmed defects

| # | Defect | Location | Measured |
|---|---|---|---|
| 6 | Settings hub avatar initials, white on white | `settings-rows.css:691` + `:947-952` | 1.00:1 |
| 7 | The "Example" disclosure chip, dark teal on a dark scrim | `catalogue.css:263-270` | 1.34:1 to 2.26:1 |
| 8 | The switch thumb when off, white on `#EFF1F4` | `controls.css:705` + `:714-718` | 1.09:1 |
| 9a | Eleven light-theme `box-shadow` declarations are invalid CSS and are dropped | `admin.css:937,944,962,1000`; `agent.css:421`; `threads.css:1415,1432,1436,1442,1450,1455` | paints nothing |
| 9b | The flagged admin stat card loses its 4px flag rule with the invalid layer | `admin.css:941-945` | information lost |
| 9c | `--nf-surface-on-paper` as the paper fill for those same surfaces | `tokens.css:1022`; `admin.css:936`, `agent.css:420`, `threads.css:1412,1449` | 1.000:1 on a card, 1.065:1 on the canvas |
| 10 | The app shell reserves 96 fixed px for a dock that needs 80 plus the inset | `AppShell.tsx:252` vs `chrome.css:111-113` | 14px of margin on a 34px inset |
| 11 | The dock's white-on-white rim | `light.css:380` | 1.00:1 |
| 12 | The auth screen loses its aurora and grid veil in light mode | `light.css:305-310` vs `app/(auth)/layout.tsx:59-60` | leak |
| 13 | Stray hairline on every object in the dark-locked subtrees | `glass.css:1058` | leak |
| 14 | The twinned-mark leak waiting on the auth and welcome screens | `glass.css:955-957` | trap, not yet live |
| 15 | `.nf-glass--thin` and `.nf-glass--strong` have no light answer | `glass.css:217,226` | 1.00:1 |
| 16 | `.nf-scene-chip` edge inverted on paper | `motion.css:487-493` | 1.18:1 |
| 17 | `--nf-border-brand` frozen at 2.50:1, 16 uses | `tokens.css:476` | 2.50:1 |
| 18 | "No photo" label and the heart on a light placeholder | `catalogue.css:310-320`, `:280-291` | 4.13:1, 3.35:1 |
| 19 | The recessed chip on the canvas is 1.04:1 | `light.css:129-134` + `tokens.css:2767` | 1.04:1 |
| 20 | The drawer scrim dims by 18 per cent while the sheet scrim dims by 42 | `overlays.css:67` vs `:162` | inconsistent |

### Tier 2: correctness and hygiene, found on the way

| # | Item | Location |
|---|---|---|
| 21 | The Console row borrows `shield-stop`, which this product has given one meaning | `nav-model.ts:270`, against `AppRail.tsx:207-213` |
| 22 | `flip-coin`, commissioned for the drawer's coin card, is used nowhere; the card draws `hotel` | `SideSwitch.tsx:80`, `docs/ICON_SYSTEM.md:167` |
| 23 | `stays-hotel-palms`, named as the Stays side's mark, is used nowhere; the cover and the hero draw `hotel` | `SideCover.tsx:31`, `app/(app)/stays/page.tsx:102`, `docs/ICON_SYSTEM.md:161` |
| 24 | Surfaces that mix a twinned and an untwinned mark in one column | `WalletDeck.tsx:147,600`; `RentalFace.tsx:187`; `app/host/page.tsx:103,122`; `HostWizard.tsx:431,1148` |
| 25 | `light.css:701-705` names 15 call sites; there are 11, two of which it does not name and five of which have moved on | section 4 |
| 26 | `glass.css:989` says 103 objects and 80 untwinned; the numbers are 144 and 121 | `glass.css:986-993` |
| 27 | `docs/ICON_SYSTEM.md:18` says 103 objects with 23 twins, `:96` says 144; the directory says 144 and 24 files with one withheld | `docs/ICON_SYSTEM.md` |
| 28 | `chrome.css:106` says the dock offset is "0.9rem + the inset"; the token and the component both use 0.75rem | `chrome.css:104-113` |
| 29 | `.nf-feedtabs` has no TSX consumer and is probably dead | `chips.css:307` |
| 30 | `state` on `BrandIcon` is a no-op without `tile`, and `ReservePanel.tsx` still passes it without one | `BrandIcon.tsx:344-366` |

---

## 12. Honesty log

**What I measured.**
- Every colour number in this document was computed by a script I wrote for
  this survey, from `packages/design-tokens/src/tokens.css` and the 37
  stylesheets under `apps/web/src`, with a real sRGB to OKLab implementation
  and premultiplied-alpha `color-mix` semantics. Nothing was eyeballed.
- The artwork measurements in section 2.3 come from opening all 144 PNGs with
  PIL, taking every pixel with alpha above 30, compositing over the two grounds
  and reporting per-pixel contrast percentiles.
- The file counts, the call-site census, the light-rule counts and the token
  diffs are all script output over the working tree.

**What I inferred and did not verify.**
- **I had no browser.** Nothing in this document was seen rendered. The
  repository has Playwright wired at `apps/web/scripts/probe-contrast.mjs:2`
  with a Chromium at `/opt/pw-browsers/chromium-1194`, and the product would
  have to be running on `localhost:3000` for it to be useful. I did not start
  the product and I did not run any browser.
- The dock being overlapped by the browser's own bottom bar (screenshot 4) is
  INFERRED. I listed three candidate mechanisms in section 8.4 and could not
  distinguish them without a device. The arithmetic fault I did prove,
  `pb-4xl` against `--nf-tabbar-clearance`, is separate and is real whether or
  not it is the cause of that particular screenshot.
- How much of the content beneath the dock shows through its 90 per cent canvas
  fill, and how that differs by theme, is INFERRED (section 8.4).
- Whether `brightness(0.45)` on the light page reads as "charcoal" or merely
  "dim" is INFERRED. The arithmetic is not.
- `.nf-auth-row` in `light.css:336-359`: I could not determine statically
  whether that class ever appears outside the dark-locked `(auth)` subtree, so
  I did not classify it as a defect.
- **One claim in this document is a reading of the CSS grammar rather than a
  measurement, and it carries more weight than anything else here.** Section
  3.5 asserts that `box-shadow: <colour>` with no length pair is invalid and
  dropped. That follows from `<shadow> = <color>? && <length>{2,4} && inset?`,
  in which the length pair is required, and from the rule that one invalid
  layer invalidates the whole declaration. I did not confirm it in a browser.
  It is one line to confirm and it should be confirmed before the fix is
  scoped, because if I am wrong about it, eleven rules and the admin flag are
  fine and only the 1.00:1 fill beneath them is a defect.
- **A correction I made to my own draft.** I first classified
  `--nf-surface-on-paper` and `--nf-shadow-on-paper` as dark-block tokens
  stranded on light surfaces. They are not: all eleven uses are inside
  `:root[data-theme="light"]` blocks and were chosen deliberately. The symptom
  is unchanged and the diagnosis was wrong, so section 9.4 now says so. I found
  this by re-reading the lines I had cited rather than trusting my own summary,
  which is the reason for this bullet.
- My contrast scanner applies a light override only when its selector's leading
  compound matches the base rule's leading compound. A light override written
  with a different but equivalent selector would be missed, which biases the
  audit towards reporting failures that are already handled. I read every
  reported hit and discarded the handled ones by hand; the ones in section 9
  are what survived that reading.
- Conversely, the scanner cannot see an ancestor's background, so it will MISS
  failures where the ground is set two elements up. Section 9.2 is a floor, not
  a ceiling. A real browser sweep will find more.

**What I did not do.**
- I ran no git command.
- I wrote to no database.
- I modified no product code. The only file I wrote is this one.
- I did not open `docs/design/references/`, `docs/BRAND_MARKS.md`,
  `docs/FRONTEND_REVAMP.md` or `docs/design/CATALOGUE.md`. Where I cite them it
  is because another file quotes them, and I have said so.

**Where I disagree with existing documentation, and why.**
`docs/ICON_SYSTEM.md:18` and `glass.css:989` both state counts that the
directory and `BRAND_ICONS` contradict. I took the directory and the code as
the authority, which is what `docs/ICON_SYSTEM.md:41-42` itself instructs. The
difference matters: the documented gap is 80 untwinned objects and the real gap
is 121, which is 51 per cent larger, and the stated exit condition for the chip
has been moving away from zero rather than towards it.

**The single most useful thing anybody can do next**, before any fix: start the
product, set `data-theme="light"`, and run
`document.querySelectorAll('.nf-brand-icon-ground').length` on `/home`,
`/stays`, `/settings`, `/wallet` and with the drawer open. That number is the
count of navy squares on the page, and it is the number this whole survey is
about.
