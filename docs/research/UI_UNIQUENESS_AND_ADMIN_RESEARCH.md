# UI uniqueness, the toggle defect, the sign-in marks, and the admin console

> **Track A, 25 September 2026.** Vallo no longer holds customer money: the wallet, escrow and held payments are retired. Where this document describes them it describes the past; the current truth is [`docs/MONEY_ARCHITECTURE.md`](/docs/MONEY_ARCHITECTURE.md).

Research only. Nothing in this document has been applied to product code. No
git command was run, no database was written, no component was modified. This
file is the single artefact of the investigation.

Written 22 September 2026, against `apps/web` at the working tree as read.
Governing law: `docs/DESIGN_DIRECTION.md`, in particular rule 4, THE SHAPE LAW,
and its ratio clause: "THE TEST IS THE DRAWN RADIUS AS A FRACTION OF THE DRAWN
SHORT SIDE: at or above 0.5 the element is a capsule however it was spelled, and
anything above about 0.35 is looked at on the running page rather than in the
file" (`docs/DESIGN_DIRECTION.md:80`).

Method. Every claim below is an arithmetic consequence of source that is cited
by `path:line`. Two throwaway scanners were run from the scratchpad, one over
the stylesheets and one over the TSX, computing radius over declared short side
for every rule and every className that declares both. There is no browser in
this environment, so nothing here is a measurement of a rendered page. Where a
number depends on rendered text width it is marked as an estimate and the
arithmetic that does not depend on text width is given separately. See the
honesty log at the end.

Token values used throughout, all from `packages/design-tokens/src/tokens.css`:

| Token | Value | Line |
|---|---|---|
| `--nf-radius-xs` | 6px | 1782 |
| `--nf-radius-sm` | 10px | 1783 |
| `--nf-radius-md` | 14px | 1784 |
| `--nf-radius-lg` | 18px | 1785 |
| `--nf-radius-xl` | 22px | 1786 |
| `--nf-radius-2xl` | 32px | 1787 |
| `--nf-radius-pill` | 999px | 1788 |
| `--nf-radius-control` | `var(--nf-radius-md)` = 14px | 1835 |
| `--nf-border-width` | 1px | 1901 |
| `--nf-space-3xs` / `2xs` / `xs` / `sm` / `md` | 2 / 4 / 8 / 12 / 16 px | 1983 to 1987 |
| `--nf-gap-inline` / `--nf-gap-inline-tight` | 8px / 4px | 2055 to 2056 |
| `--nf-text-body-sm` / `caption` / `overline` | 0.875 / 0.8125 / 0.75 rem | 2476 to 2478 |

---

# PART 1. THE TOGGLE DEFECT

The founder's report, verbatim: "toogles fixes its currently outside the toggle
areas".

There are **eleven** distinct toggle-like control families in the product. They
are listed first, then the defects, in severity order.

## 1.1 The full inventory of toggle-like controls

| # | Control | Markup | Material | Travel mechanism |
|---|---|---|---|---|
| 1 | Platform switch | `components/ui/Switch.tsx:71` | `.nf-switch` `app/css/controls.css:689` **and** `app/settings-rows.css:329` | inline `transform: translate(1.125rem, -50%)`, `Switch.tsx:131` |
| 2 | Settings-row switch | `components/app/account/rows.tsx:260` | `.nf-switch` + `.nf-switch__knob` `app/settings-rows.css:360` | CSS `transform: translate(1.1875rem, -50%)`, `app/settings-rows.css:375` |
| 3 | Listing-wizard switch | `app/agent/list/ListingWizard.tsx:320` | inline Tailwind, hand-rolled | inline `left: 1.625rem` / `0.25rem`, `ListingWizard.tsx:331` |
| 4 | Segmented primitive | `components/ui/Segmented.tsx:139` | `.nf-segmented` `app/css/buttons.css:512` | measured capsule, `Segmented.tsx:161` |
| 5 | Segmented, glass-rail variant | `Segmented.tsx:146` (`shape="pill"`) | `.nf-segmented--pill` `app/css/chips.css:823` | same measured capsule |
| 6 | View toggle (list / map) | `components/app/filters/ViewToggle.tsx:27` | `.nf-segmented` + `.nf-segmented__link` `app/css/buttons.css:555` | none; `aria-current` fill |
| 7 | Feed segment (For you / Following) | `components/social/feed/FeedMasthead.tsx:38` | `.nf-feed-seg` `app/social-feed.css:3014` | none; `aria-current` fill |
| 8 | Profile tabs | `components/social/profile/ProfileTabs.tsx:155` | `.nf-glass-seg` `app/social.css:586` | none; `aria-selected` fill |
| 9 | Settings segment | `components/app/account/rows.tsx:400` | `.nf-segment` `app/settings-rows.css:389` | none; `aria-pressed` fill |
| 10 | Landing search segments | `components/site/landing/SearchPill.tsx:66` | `.nf-landing-pill-segments` `app/css/landing.css:925` | none; `aria-checked` fill |
| 11 | Bottom dock | `components/app/MobileTabBar.tsx:313` | `.nf-tabbar` `app/css/chrome.css:228` | formula pill, `app/css/chrome.css:370` |

Two more that answer the same shape of question but are not segmented controls,
listed for completeness because the founder named them: the side flip coin
(`components/app/SideSwitch.tsx:69`, a card, not a toggle) and the personal /
agent mode control (`components/agent/ModeSwitcher.tsx:47` menu variant and
`:67` picker variant, a button and a popover, not a toggle).

## 1.2 DEFECT T1, SEVERITY HIGH. The landing search pill reserves four columns for three segments

**Evidence.**

`components/site/landing/SearchPill.tsx:33`:

```
const ORDER: Segment[] = ["buy", "rent", "stay"];
```

Three segments. `Segment` is a three-member union; `ROUTES` at
`SearchPill.tsx:28` declares exactly `buy`, `rent`, `stay`.

`app/css/landing.css:925`:

```
.nf-landing-pill-segments {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
```

**The numbers.** Four equal columns are laid down. Three grid items are placed
into them, auto-placement filling columns 1, 2 and 3. Column 4 receives no item
and is not collapsed, because an `fr` track with no content still takes its
share of the free space. The last segment therefore ends at 75 per cent of the
track's inner width and a full quarter of the control, minus the trailing gap,
is empty glass with the track's border and fill still painted around it.

At a 390px viewport, with the pill's own 8px padding
(`--nf-gap-inline`, `app/css/landing.css:880`), 1px border and the segment
track's 4px padding (`--nf-space-2xs`, `landing.css:930`) and 1px border, and
three 4px gaps (`--nf-gap-inline-tight`, `landing.css:929`), the inner track is
`W - 2 - 8 - 12` wide across four columns. Taking a 16px page gutter, `W` is
340px and each column is `(340 - 2 - 8 - 12) / 4 = 79.5px`. **79.5px of the
control, about 23 per cent of its width, is dead space to the right of "Stay".**

This reads on screen exactly as "the toggle is outside the toggle area": the
selected segment's brand fill sits left of centre in a track that visibly
extends past it.

Above 640px the rule at `app/css/landing.css:935` swaps the grid for
`display: flex`, so the fourth track disappears and the desktop composition is
correct. **The defect is phone-only**, which is consistent with the founder
noticing it and nobody catching it in a desktop review.

**Root cause.** `docs/DESIGN_DIRECTION.md:108` names the governing hero's
segments as "Buy / Rent / Stay / Invest", four of them. `ORDER` was cut to
three and the grid template was not. The stylesheet and the component disagree
about how many segments exist, and the stylesheet wins because it is the one
that draws the track.

**Fix.** Two lines, either of which closes it, and the first is correct:

1. Drive the count from the data, the way `.nf-glass-seg` already does at
   `app/social.css:588` (`repeat(var(--nf-seg-count, 2), minmax(0, 1fr))`).
   Set `--nf-seg-count` inline from `ORDER.length` in `SearchPill.tsx` and read
   it in `landing.css:927`. Then adding Invest back is a data change, not a CSS
   change.
2. Or `grid-template-columns: repeat(3, minmax(0, 1fr))` at
   `app/css/landing.css:927`, which is correct today and wrong the moment the
   fourth segment returns.

Take option 1.

## 1.3 DEFECT T2, SEVERITY HIGH. Search-pill segments overflow their track in Hausa and Igbo

**Evidence.**

`app/css/landing.css:940`:

```
.nf-landing-pill-seg {
  display: inline-flex;
  ...
  min-height: 2.5rem;
  padding: 0 var(--nf-space-sm);
  ...
  white-space: nowrap;
```

The button is a grid item. `minmax(0, 1fr)` at `landing.css:927` removes the
**track's** automatic minimum, not the **item's**: a grid item keeps
`min-width: auto` unless it is given `min-width: 0` or an overflow value other
than `visible`. `.nf-landing-pill-seg` has neither, and it has
`white-space: nowrap`.

**The numbers.** Per segment, the fixed chrome is:

- icon, `UiIcon size={16}` at `SearchPill.tsx:81` = 16px
- gap, `--nf-gap-inline-tight` at `landing.css:944` = 4px
- padding, `0 var(--nf-space-sm)` at `landing.css:946` = 12 + 12 = 24px

Total 44px before a single letter. Against the 79.5px column computed in T1,
that leaves **35.5px for the word** at `--nf-text-body-sm` (14px) weight 600.

The strings, from `packages/i18n/src/locales/`:

| Locale | buy | rent | stay | Line |
|---|---|---|---|---|
| en | Buy | Rent | Stay | `en.ts:414` to `416` |
| yo | Rà | Yá | Gbé | `yo.ts:319` to `321` |
| ha | Saya | Haya | **Masauki** | `ha.ts:320` to `322` |
| ig | Zụta | **Gbazite** | Biri | `ig.ts:321` to `323` |

"Masauki" is seven characters and "Gbazite" is seven. At 14px semibold Inter an
average advance of roughly 0.55em gives about 54px, which is **19px past the
35.5px the column allows**. With `white-space: nowrap` and no clipping, the
content paints outside its column; on the third segment, which is the last one
placed, it paints past the track's 4px padding and 1px border and out of the
control.

The character count and the column arithmetic are exact. The 54px is an
estimate; see the honesty log.

**Fix.** At `app/css/landing.css:940`, add to `.nf-landing-pill-seg`:

```
min-inline-size: 0;
overflow: hidden;
text-overflow: ellipsis;
```

and wrap the label in its own span so the ellipsis has a block to act on, since
`text-overflow` does not apply to a flex container's anonymous text runs. The
pattern already exists correctly at `components/ui/Segmented.tsx:198`
(`<span className="whitespace-nowrap">{o.label}</span>`), but that one is
missing the clip too; see T4.

## 1.4 DEFECT T3, SEVERITY HIGH. The bottom dock's labels paint outside the dock

**Evidence.**

`app/css/chrome.css:513`:

```
.nf-tab {
  flex: 1 1 0;
  min-width: 0;
}
```

`app/css/chrome.css:562`:

```
.nf-tab__label {
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
```

`.nf-tab` correctly takes `min-width: 0`, so the **boxes** are equal fifths and
the travelling pill at `app/css/chrome.css:370` tracks them exactly. The
arithmetic there is right: width is
`(100% - 2*pad - (count-1)*gap) / count` and the travel is
`i * (100% + gap)`, which for `i = count - 1` lands the right edge at
`100% - pad`. The pill is not the bug.

The **label** is. `.nf-tab__label` is `white-space: nowrap` with no
`overflow: hidden` and no `text-overflow`, inside a box that can be narrower
than the text.

**The numbers, all exact except the text width.**

- The dock is `fixed inset-x-4` at `components/app/MobileTabBar.tsx:308`, so at
  390px it is `390 - 32 = 358px` wide.
- `--nf-tab-pad: 0.375rem` = 6px each side, `app/css/chrome.css:230`.
- `--nf-tab-gap: var(--nf-space-2xs)` = 4px, `app/css/chrome.css:229`.
- Five slots: three tabs, More, profile (`MobileTabBar.tsx:292`,
  `const slots = [...tabs, null, profile]`).
- Per-slot width = `(358 - 12 - 4*4) / 5 = 66px`.
- `.nf-tab__link` has `padding-inline: var(--nf-space-2xs)` = 4px each side,
  `app/css/chrome.css:534`, so **58px of text room per slot**.

The dock labels, from `MobileTabBar.tsx:257` to `270`, are `t.nav.stays`,
`t.nav.search`, `t.nav.feed`, `t.nav.home`, `t.nav.more`, `t.nav.profile`:

| Locale | feed | profile | Lines |
|---|---|---|---|
| en | Feed (4) | Profile (7) | `en.ts:233`, `en.ts:228` |
| yo | Ìtàn àdúgbò (11) | Àkọọ́lẹ̀ (7 plus combining marks) | `yo.ts:197`, `yo.ts:192` |
| ha | Labarai (7) | **Bayanan martaba (15)** | `ha.ts:198`, `ha.ts:193` |
| ig | Akụkọ ógbè (10) | Profaịlụ (8) | `ig.ts:199`, `ig.ts:194` |

At 11px semibold, 58px holds roughly nine to ten characters. Hausa's
"Bayanan martaba" is fifteen and Yoruba's "Ìtàn àdúgbò" is eleven. Both paint
over the neighbouring slot; the profile slot is last, so its overflow paints
past the dock's 6px padding and its 1px `--nf-brand-edge-soft` border
(`app/css/chrome.css:315`) and out of the floating capsule onto the page
behind it.

**Fix.** At `app/css/chrome.css:562`, add to `.nf-tab__label`:

```
max-inline-size: 100%;
overflow: hidden;
text-overflow: ellipsis;
```

`.nf-tab__link` is `flex-direction: column` with `align-items: center`
(`app/css/chrome.css:530` to `532`), so the label is already a block-level flex
item and `max-inline-size: 100%` gives `text-overflow` something to clip
against. The dock keeps its rhythm and long locales elide rather than escape.

A second, independent fix worth taking at the same time: the accessible name
already carries the full word (`MobileTabBar.tsx:66` records that labels moved
into `aria-label`), so eliding costs a sighted reader nothing that the screen
reader loses.

## 1.5 DEFECT T4, SEVERITY MEDIUM. The Segmented primitive's capsule can be drawn outside its own track

**Evidence.**

`components/ui/Segmented.tsx:183` to `193`, the item:

```
"nf-segmented__item relative z-1 inline-flex items-center justify-center gap-inline rounded-[var(--nf-radius-control)] font-semibold transition-colors",
seg,
full ? "flex-1" : "",
```

and `Segmented.tsx:198`:

```
<span className="whitespace-nowrap">{o.label}</span>
```

Tailwind's `flex-1` is `flex: 1 1 0%`. It does **not** set `min-width: 0`.
A flex item's automatic minimum size is its min-content width, and with
`whitespace-nowrap` on the label the min-content width is the whole word. So
when the sum of the items' min-content widths exceeds the track, the items
overflow the track's `w-full` box.

The capsule then follows them out. `Segmented.tsx:161` to `163`:

```
className="nf-segmented__capsule"
style={{ transform: `translateX(${capsule.x}px)`, width: `${capsule.w}px` }}
```

where `capsule.x` is `item.offsetLeft` and `capsule.w` is `item.offsetWidth`
(`Segmented.tsx:107`). The measurement is honest: it reports where the item
really is. If the item is outside the track, the capsule is drawn outside the
track, over whatever follows it on the page. `.nf-segmented` at
`app/css/buttons.css:512` sets no `overflow`, so nothing clips it.

**Where this bites.** The `full` call sites:

- `app/(app)/messages/Inbox.tsx:322` with `full`, three tabs, `size` default
  `md` so `px-md` = 16px each side, plus a `count` badge on the Requests tab
  (`Inbox.tsx:331`).
- `app/(app)/bookings/MyBookings.tsx:320` with `full`, three tabs.

For MyBookings at 390px with a 16px page gutter: track 358px, minus 2px border
and 8px padding (`p-2xs`, `Segmented.tsx:135`) = 348px, divided three ways =
**116px per item**. Each item spends `px-md` = 32px on padding, leaving **84px
for the word**.

The Yoruba labels, `packages/i18n/src/locales/yo.ts:3130` to `3132`, are
"Tó ń bọ̀", "Tí ó parí" and "Tí a fagilé". "Tí a fagilé" is eleven characters
with three combining diacritics at `--nf-text-body-sm` (14px) weight 600, which
lands at roughly 84px on the estimate above, i.e. exactly on the boundary.
Hausa's "An soke" (`ha.ts:1758`) is short and safe; Igbo's "Akagbuola"
(`ig.ts:2500`) is nine.

So this one is on the edge rather than clearly broken, and it is on the edge on
a control the whole product depends on. It should be closed whether or not it
is what the founder saw.

**Fix.** At `components/ui/Segmented.tsx:183`, add `min-w-0` to the item class
list, and at `:198` change the label span to
`className="min-w-0 truncate"` (Tailwind `truncate` is
`overflow:hidden;text-overflow:ellipsis;white-space:nowrap`, which keeps the
nowrap the design wants and adds the clip it needs). The capsule then can never
leave the track, because the item cannot.

A second, smaller correction while in this file: `Segmented.tsx:136` gives
`size="sm"` an `h-9` (36px) item, which is under the 44px tap floor. The note
at `Inbox.tsx:324` already records this and works around it by never passing
`sm`; `components/app/crypto/CryptoMarket.tsx:108` and `:120` and
`components/app/crypto/CoinDetail.tsx:119` all pass `size="sm"` and are
therefore shipping 36px targets.

## 1.6 DEFECT T5, SEVERITY MEDIUM. `.nf-segment__option` cannot shrink and is a near-capsule

**Evidence.** `app/settings-rows.css:397`:

```
.nf-segment__option {
  flex: 1 1 0;
  min-height: 2rem;
  padding: 0 0.625rem;
  border-radius: var(--nf-radius-control);
```

Two defects in one rule.

**Overflow.** `flex: 1 1 0` with no `min-width: 0`, inside `.nf-segment`
(`app/settings-rows.css:389`) which is `display: flex` with no `flex-wrap` and
no `overflow`. Same mechanism as T4. The markup at
`components/app/account/rows.tsx:400` renders the label as a bare text node, so
there is nothing to clip even if a clip were declared.

**Shape.** `--nf-radius-control` is 14px and `min-height: 2rem` is 32px.
`14 / 32 = 0.438`. That is above the 0.35 watch line of
`docs/DESIGN_DIRECTION.md:82` and within a hair of the 0.5 capsule line. The
same file already reasons its way to the correct answer for a 28px chip at
`app/css/landing.css:707`: "on one 28px tall it is half the height, which draws
a capsule again ... So the small chips take the 10px rung".

**Fix.** `min-width: 0;` and `border-radius: var(--nf-radius-sm);`
(`10 / 32 = 0.313`) at `app/settings-rows.css:397`, plus a truncating span
around the label at `components/app/account/rows.tsx:408`.

## 1.7 DEFECT T6, SEVERITY MEDIUM. Two stylesheets define `.nf-switch` and they disagree

**Evidence.** `.nf-switch` is declared twice, in two files, both inside
`@layer components`:

- `app/settings-rows.css:329`: `position: relative; flex: none; width: 3.125rem; height: 1.875rem; border-radius: var(--nf-radius-control); border: 1px solid var(--nf-border-subtle); background: color-mix(...12%...)`
- `app/css/controls.css:689`: `background: var(--nf-well-fill); border: var(--nf-border-width) solid var(--nf-border-default); box-shadow: inset 0 1px 3px var(--nf-shade-2)`

`app/globals.css:25` imports `./settings-rows.css`; `app/globals.css:68`
imports `./css/controls.css`. Equal specificity, same layer, later wins, so
**`controls.css` supplies the paint and `settings-rows.css` supplies the
geometry**. Neither file says so, and `components/ui/Switch.tsx:87` states that
the material is "`.nf-switch` NOW (controls.css)" without mentioning that the
size it will be drawn at, for the OTHER consumer of the class, comes from a file
it does not reference.

`app/globals.css:42` is explicit that "THE ORDER IS THE CASCADE" and names
three deliberate double declarations. `.nf-switch` is a fourth and it is not in
that list, so this is drift rather than a decision.

**The two knob families.** `components/ui/Switch.tsx:128` draws
`.nf-switch__thumb`; `components/app/account/rows.tsx:262` draws
`.nf-switch__knob`. `controls.css:705` and `:709` style only `__thumb`;
`settings-rows.css:360` and `:374` style only `__knob`. So:

- The settings-row switch at `rows.tsx:260` never receives the on-state bloom
  at `controls.css:709` (`box-shadow: var(--nf-elev-1), 0 0 8px var(--nf-glow-2)`).
- The platform switch at `Switch.tsx:71` never receives
  `settings-rows.css:374`'s travel, which is fine because it carries its own,
  but it DOES silently inherit `settings-rows.css:329`'s `width` and `height`
  and only escapes them because Tailwind utilities sit in a later layer than
  `components`.

**Geometry, all three switches, worked through.** Every box is
`box-sizing: border-box` from Tailwind preflight, so the containing block for
the absolutely positioned knob is the track's padding box.

| | Platform | Settings row | Listing wizard |
|---|---|---|---|
| Markup | `Switch.tsx:93`, `:128` | `settings-rows.css:329`, `:360` | `ListingWizard.tsx:320`, `:331` |
| Track, border box | `h-8 w-13` = 52 x 32 | 3.125rem x 1.875rem = 50 x 30 | `h-7 w-12` = 48 x 28 |
| Border | 1px, `controls.css:690` | 1px, `controls.css:690` | none |
| Padding box | 50 x 30 | 48 x 28 | 48 x 28 |
| Knob | `size-6` = 24 | 1.375rem = 22 | `h-5 w-5` = 20 |
| Inset, off | `left-1` = 4 | `inset-inline-start` 0.1875rem = 3 | `left` 0.25rem = 4 |
| Travel | 1.125rem = 18 | 1.1875rem = 19 | to `left` 1.625rem, i.e. 22 |
| Knob when on | 22 to 46 | 22 to 44 | 26 to 46 |
| Gap left / right | 4 / 4 | 3 / 4 | 4 / 2 |
| Verdict | Symmetric, contained | Contained, 1px out | Contained, 2px out |
| Correct travel | as is | `1.25rem` (20px) | `left: 1.5rem` (24px) |

The comment at `Switch.tsx:129` calls the platform travel "1.25rem of travel
... less the hairline", which is correct arithmetic reached by a slightly wrong
description: it is 1.25rem less 2px of border, not one hairline.

**So no knob actually escapes its track**, which matters: whatever the founder
saw, it was not a switch knob. It was one of T1, T2 or T3. But the three
geometries (52 x 32 with a 24px knob, 50 x 30 with a 22px knob, 48 x 28 with a
20px knob), the two knob class names, the two competing `.nf-switch` blocks and
the two asymmetries are a real mess and are the subject of Part 2.

**Fix.**

1. Delete `.nf-switch`, `.nf-switch__knob` and
   `.nf-switch[aria-checked="true"] .nf-switch__knob` from
   `app/settings-rows.css:329` to `:376`.
2. Move `width: 3.25rem; height: 2rem;` into `.nf-switch` at
   `app/css/controls.css:689` so the geometry lives with the paint, and drop
   `h-8 w-13` from `components/ui/Switch.tsx:93` so the size stops depending on
   layer order.
3. Rewrite `components/app/account/rows.tsx:255` to `:265` to render
   `<Switch>` from `components/ui/Switch.tsx`. It is a five-line change; the
   props already line up (`checked`, `onChange` to `onCheckedChange`,
   `label` to `aria-label`).
4. Rewrite `app/agent/list/ListingWizard.tsx:295` to `:333` to render `<Switch>`
   as well. Note it currently paints `var(--nf-gradient-agent)` when on
   (`ListingWizard.tsx:322`) while every other switch on the platform paints
   `var(--nf-brand-primary)`; that difference should not survive the merge.

## 1.8 DEFECT T7, SEVERITY LOW. `.nf-feed-seg` uses `1fr` where it needs `minmax(0, 1fr)`

`app/social-feed.css:3014`:

```
.nf-feed-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
```

`1fr` is shorthand for `minmax(auto, 1fr)`, so the track floor is the item's
min-content width. `.nf-feed-seg__link` at `app/social-feed.css:3036` has no
`min-inline-size: 0` and its label is a bare text node
(`components/social/feed/FeedMasthead.tsx:48`).

With only two segments and no padding on the link, there is a great deal of
room, so this does not overflow today. It is listed because it is the same
defect as T2 and T5 in a control that has not yet been given a longer word, and
because `.nf-glass-seg` at `app/social.css:588` already spells the correct form
(`repeat(var(--nf-seg-count, 2), minmax(0, 1fr))`) twelve files away.

**Fix.** `grid-template-columns: repeat(2, minmax(0, 1fr));` at
`app/social-feed.css:3016`, plus `min-inline-size: 0` on the link.

## 1.9 DEFECT T8, SEVERITY LOW. `.nf-chip` at `size="sm"` does not draw at the size its class says

`components/ui/Chip.tsx:135`:

```
const HEIGHT: Record<ChipSize, string> = { sm: "h-9", md: "h-11" };
```

`app/css/chips.css:81`:

```
.nf-chip {
  ...
  min-height: 44px;
```

`height: 2.25rem` (36px) from the utility layer and `min-height: 44px` from the
component layer are different properties, so they do not compete: the used
height is 44px. A `size="sm"` chip therefore paints at 44px, not 36px, and any
author reading `h-9` and computing `14 / 36 = 0.389` against the shape law
reaches the wrong ratio. The true ratio is `14 / 44 = 0.318`, which passes.

This is precisely the failure mode `docs/DESIGN_DIRECTION.md:86` warns about in
the other direction: "A source grep proves what was written; it never proves
what the browser drew."

**Fix.** Either drop `min-height: 44px` from `app/css/chips.css:85` and let the
component own the height, or drop `HEIGHT` from `components/ui/Chip.tsx:135` and
let the stylesheet own it. Not both. The stylesheet is the better owner, because
the class is also worn by markup that does not come through the component.

## 1.10 Summary of Part 1

| ID | Where | Severity | One-line fix |
|---|---|---|---|
| T1 | `app/css/landing.css:927` | High | Drive the column count from `ORDER.length`; it is 3, the CSS says 4 |
| T2 | `app/css/landing.css:940` | High | `min-inline-size: 0` plus a clipped label span |
| T3 | `app/css/chrome.css:562` | High | `max-inline-size: 100%; overflow: hidden; text-overflow: ellipsis` |
| T4 | `components/ui/Segmented.tsx:183`, `:198` | Medium | `min-w-0` on the item, `truncate` on the label |
| T5 | `app/settings-rows.css:397` | Medium | `min-width: 0` and `--nf-radius-sm` (0.438 ratio) |
| T6 | `app/settings-rows.css:329` vs `app/css/controls.css:689` | Medium | One `.nf-switch` block, one switch component |
| T7 | `app/social-feed.css:3016` | Low | `minmax(0, 1fr)` |
| T8 | `components/ui/Chip.tsx:135` vs `app/css/chips.css:85` | Low | One owner of the height |

The founder's report is most likely T1, because it is the only defect that is
visible with English copy, on the first screen of the product, on a phone, with
nothing else wrong on the page. T2 and T3 are the same complaint in Hausa,
Yoruba and Igbo.

---

# PART 2. UI UNIQUENESS SWEEP

The question is whether the interface reads as one product. It does not, and the
reasons are countable.

## 2.1 There are eleven ways to draw a segmented control

This is the single largest uniqueness failure in the product.

| Family | Selector | Line | Shape | Travel | Consumers |
|---|---|---|---|---|---|
| Segmented, raised | `.nf-segmented` + `__capsule` | `app/css/buttons.css:512`, `:519` | rect, `--nf-radius-control` | measured, spring | `Inbox.tsx:322`, `MyBookings.tsx:320`, `CryptoMarket.tsx:105`, `:115`, `CoinDetail.tsx:119` |
| Segmented, glass rail | `.nf-segmented--pill` | `app/css/chips.css:823` | rect | measured | `Segmented.tsx:146`, no product caller found |
| Segmented, link form | `.nf-segmented__link` | `app/css/buttons.css:555` | rect | none | `ViewToggle.tsx:39` |
| Feed segment | `.nf-feed-seg` | `app/social-feed.css:3014` | rect, `--nf-radius-lg` track | none | `FeedMasthead.tsx:38` |
| Glass segment | `.nf-glass-seg` | `app/social.css:586` | rect, `--nf-radius-lg` track | none | `ProfileTabs.tsx:155` |
| Settings segment | `.nf-segment` | `app/settings-rows.css:389` | rect | none | `rows.tsx:400` |
| Landing segments | `.nf-landing-pill-segments` | `app/css/landing.css:925` | rect | none | `SearchPill.tsx:66` |
| Console tab strip | `.nf-admin-tab` | `app/css/admin.css:306` | rect | none | `AdminNav.tsx` |
| Dock | `.nf-tabbar` + `__pill` | `app/css/chrome.css:228`, `:370` | rect | formula | `MobileTabBar.tsx:313` |
| Underline tab, social | `.nf-social-tab` + `::after` | `app/social.css:331`, `:353` | 2px stroke | none | `StoryRail.tsx:81` |
| Underline tab, catalogue | `.nf-detail-tabs > a` + `::after` | `app/css/catalogue.css:1068`, `:1091` | 2px bar | none | catalogue detail pages |

Plus one that is not even a family: `components/social/feed/Composer.tsx:344` to
`357` hand-rolls a `role="radiogroup"` of three buttons at `h-9` with
`rounded-[var(--nf-radius-control)]` and inline brand fill, wearing no class
from any of the eleven.

**Canonical.** `components/ui/Segmented.tsx`. It is the only one that measures
real boxes (`Segmented.tsx:107`), the only one that re-measures on font load
(`Segmented.tsx:124`), the only one with a roving tabindex and arrow keys
(`Segmented.tsx:130`), and the only one that offers both `tablist` and
`radiogroup` semantics (`Segmented.tsx:172` to `180`). Its own file documents
that it was written to end exactly this proliferation
(`Segmented.tsx:18`: "There were five separate implementations").

**Fix, in order of value.**

1. `components/social/feed/Composer.tsx:344` to `357` becomes
   `<Segmented semantics="radio" full />`. It currently has no keyboard
   handling at all and is 36px tall.
2. `components/app/account/rows.tsx:388` to `413` (`Segment`) becomes a thin
   adapter over `Segmented`, exactly as `account/Toggle.tsx` is a thin adapter
   over `Switch`. Delete `.nf-segment` and `.nf-segment__option` from
   `app/settings-rows.css:389` to `:415`.
3. `.nf-glass-seg` (`app/social.css:586`) and `.nf-feed-seg`
   (`app/social-feed.css:3014`) are the same object with different padding
   (4px versus 3px), the same gap policy and different track radii
   (`--nf-radius-lg` in both, on short sides of 56px and 52px, giving 0.321 and
   0.346). Merge into `.nf-glass-seg` with `--nf-seg-count`, and have
   `FeedMasthead` and `ProfileTabs` both wear it.
4. `.nf-social-tab` (`app/social.css:331`) and `.nf-detail-tabs > a`
   (`app/css/catalogue.css:1068`) are two underline tabs whose active marks are
   a 28px stroke and a full-width 2px bar respectively. Pick one. The social one
   is the better drawing and it names its reasoning at `app/social.css:348`.
5. `.nf-social-tab__count` is applied at
   `components/social/profile/ProfileTabs.tsx:190` inside a
   `.nf-glass-seg__tab`. The count class belongs to the underline family and the
   tab belongs to the glass family, so a class from one segmented system is
   riding inside another. That is the clearest single symptom of the
   proliferation.

## 2.2 There are three switch implementations and three adapters over them

Implementations: `components/ui/Switch.tsx:71`,
`components/app/account/rows.tsx:255`, `app/agent/list/ListingWizard.tsx:294`.
Geometry and colour divergence is set out in 1.7.

Adapters over `components/ui/Switch.tsx`, all rendering the same
label-left-control-right row:

| Adapter | Line | Label type | Description slot |
|---|---|---|---|
| `components/app/account/Toggle.tsx:38` | row with `py-sm first:pt-0 last:pb-0` | `--nf-text-body-sm` | yes |
| `components/app/filters/FilterDrawer.tsx:244` | `SwitchRow` | see file | see file |
| `components/app/stays/StayFilterSheet.tsx:184` | `SwitchRow` | see file | see file |
| `components/ui/Switch.tsx:141` | the primitive's own `label` branch | `--nf-text-body-lg` | yes |

Four row layouts for one control, and the primitive's own built-in row uses a
larger type rung (`--nf-text-body-lg`, `Switch.tsx:151`) than the adapter that
is meant to be the settings row (`--nf-text-body-sm`, `Toggle.tsx:60`).

**Canonical.** `components/ui/Switch.tsx` for the control, and the primitive's
own `label` branch for the row. Delete the three adapters; pass `label` and
`description` to the primitive. Reconcile the type rung to
`--nf-text-body-sm`, which is what the settings surfaces already read at.

## 2.3 There are six page-header families

Counted by class prefix across the TSX:

| Class | Occurrences | Owner |
|---|---|---|
| `nf-agent-head` | 10 | agent workspace |
| `nf-hub-head` | 6 | hub screens |
| `nf-app-header` | 6 | app chrome |
| `nf-admin-head` | 6 | console |
| `nf-site-head-*` | 5 | marketing |
| `nf-pay-head` | 1 | payments |

Plus `components/app/PageHeader.tsx:24`, a React component with `title`,
`subtitle`, `subtitleHref`, `actions`, `leading`, `tone` and `layout`, which is
the only one that also carries the platform back flow
(`PageHeader.tsx:20` and `lib/ui/history.ts`).

And inside the console alone there are **two** implementations of the same
header: `app/admin/_components/ui.tsx:269` (`QueueHeader`, takes `lede` and an
optional `count`) and `app/admin/_components/QueueTable.tsx:206`
(`QueueHeadline`, takes `sub`). Both render `<header className="nf-admin-head">`
with an `h1.nf-admin-head__title` and a `p.nf-admin-head__sub`. `QueueHeadline`
is used by `app/admin/page.tsx:80` and `QueueHeader` by every other desk, so the
overview page is the one console screen whose heading cannot show a count.

**Canonical.** `components/app/PageHeader.tsx` for in-app surfaces;
`app/admin/_components/ui.tsx:269` `QueueHeader` for the console. Delete
`QueueHeadline` at `QueueTable.tsx:206` and switch `app/admin/page.tsx:80` and
`:130` to `ui.QueueHeader`.

## 2.4 Buttons: 393 component uses against 123 raw class strings

`grep -c "<Button"` across `apps/web/src` gives 393. `grep` for a `nf-btn`
class literal in markup, excluding the component itself, gives 123 lines.

The raw users are not a random sprinkle. They cluster:

- `components/social/profile/*`: `ProfilePosts.tsx:123`, `:127`,
  `ProfileHeader.tsx:247`, `ProfileMenu.tsx:214`, `:221`, `:358`, `:366`,
  `ProfilePhotos.tsx:190`, `:209`, `PeopleList.tsx:116`, `:140`, `:235`,
  `ProfileEditor.tsx:374`, `:378`
- `components/auth/AuthChoices.tsx:98`
- `components/social/story/StoryComposer.tsx:78`,
  `components/social/bloom/CreateBloom.tsx:416`

`components/social/profile/ProfileMenu.tsx:358` is the sharpest example:
`className="nf-btn nf-social-danger flex-1"`. `nf-social-danger` is a
social-layer-only destructive treatment standing where `variant="danger"` would
go, so the social layer's delete button does not look like the platform's delete
button.

`components/social/profile/ProfilePhotos.tsx:190` is the second:
`"nf-btn nf-btn--glass gap-inline-tight px-sm py-xs text-[var(--nf-text-overline)]"`,
which is a button primitive with its padding and type overridden inline, i.e. a
size rung invented at the call site.

**Canonical.** `components/ui/Button.tsx` and `ButtonLink`. Every raw
`nf-btn` string in markup becomes a component call. The class stays for the
component's own use.

## 2.5 The auth folder is a different hand

`components/auth/**` bypasses both the type scale and the spacing scale, in a
way no other folder does:

| File:line | Value | Should be |
|---|---|---|
| `components/auth/Verifying.tsx:142` | `mt-5 text-[0.8125rem]` | `mt-md text-[var(--nf-text-caption)]` |
| `components/auth/ForgotPasswordForm.tsx:37` | `-ml-1 mb-3 text-[0.8125rem]` | `-ml-2xs mb-sm text-[var(--nf-text-caption)]` |
| `components/auth/ForgotPasswordForm.tsx:44` | `mb-6 text-[0.875rem]` | `mb-lg text-[var(--nf-text-body-sm)]` |
| `components/auth/ForgotPasswordForm.tsx:52` | `px-4 text-[0.8125rem]` | `px-md text-[var(--nf-text-caption)]` |
| `components/auth/EmailAuthForm.tsx:137` | `-ml-1 mb-3 text-[0.8125rem]` | as above |
| `components/auth/EmailAuthForm.tsx:300` | `mt-4 text-[0.8125rem]` | `mt-md ...` |
| `components/auth/EmailAuthForm.tsx:337` | `text-[0.8125rem]` | `--nf-text-caption` |
| `components/auth/fields.tsx:38` | `text-[0.9375rem]` | not on the scale at all |
| `components/auth/fields.tsx:41` | `text-[0.6875rem]` | not on the scale at all |
| `components/auth/fields.tsx:46` | `text-[0.75rem]` | `--nf-text-overline` |
| `components/auth/fields.tsx:76` | `px-2 py-0.5 text-[0.625rem]` | not on either scale |
| `components/auth/fields.tsx:359` | `text-[0.6875rem]` | not on the scale |
| `components/auth/VerifyCodeForm.tsx:93` | `mt-2 text-[0.9375rem]` | not on the scale |
| `components/auth/VerifyCodeForm.tsx:144` | `text-[1.25rem] tracking-[0.32em]` | not on the scale |
| `components/auth/VerifyCodeForm.tsx:178` | `mt-6 text-[0.8125rem]` | `mt-lg ...` |
| `components/auth/EmailTakenNotice.tsx:81` | `mt-2 text-[0.8125rem]` | `mt-xs ...` |
| `components/auth/ResetPasswordForm.tsx:38` | `mb-6 mt-xs text-[0.875rem]` | mixed: one scaled, one not, on one element |

`ResetPasswordForm.tsx:38` is the tell: `mb-6 mt-xs` puts a raw value and a
scaled value on the same element, which is how a folder drifts rather than how
it is designed.

Two more type-scale bypasses outside auth:

- `components/app/account/ProfileIdentityCard.tsx:92` uses `text-2xl`, the only
  bare Tailwind type class in the product.
- `components/app/listing/ListingMoveIn.tsx:108` uses
  `text-[1.75rem] ... sm:text-[2rem]`, and
  `components/app/listing/ListingReviews.tsx:75` uses `text-[1.75rem]`. Neither
  is on the `--nf-text-*` ladder.

Raw numeric spacing, top offenders by count of distinct lines per file:

| File | Raw spacing classes |
|---|---|
| `app/agent/listings/ListingsWorkspace.tsx` | 13 |
| `components/agent/ApplyWizard.tsx` | 12 |
| `app/(app)/settings/DeleteAccountPanel.tsx` | 10 |
| `components/verification/KycFlow.tsx` | 9 |
| `app/agent/analytics/AnalyticsWorkspace.tsx` | 9 |
| `components/social/profile/ProfileEditor.tsx` | 8 |
| `components/auth/fields.tsx` | 8 |

**Note on the token checker.** `apps/web/scripts/check-css-tokens.mjs` is wired
into `npm run lint` (`apps/web/package.json`, `"lint"`). Its rule 10 covers pill
radii on controls (`docs/DESIGN_DIRECTION.md:69`). It evidently does not cover
raw `text-[Nrem]` or raw numeric Tailwind spacing in TSX, since the table above
is in the tree and the lint passes. Adding those two rules is the cheapest way
to stop this class of drift reopening.

## 2.6 Remaining capsules by ratio, not by name

Scanner output, stylesheets, every rule declaring both a radius and a height or
min-height, ratio at or above 0.34, non-shape elements only:

| Ratio | Selector | Line | Radius / short side | Verdict |
|---|---|---|---|---|
| 0.467 | `.nf-switch` | `app/settings-rows.css:329` | 14 / 30 | Exempt. A switch track is a SHAPE (`DESIGN_DIRECTION.md:54`) |
| 0.438 | `.nf-segment__option` | `app/settings-rows.css:397` | 14 / 32 | **Violation.** Text-bearing. Take `--nf-radius-sm` |
| 0.438 | `.nf-detail-tag` | `app/css/catalogue.css:868` | 14 / 32 | **Violation.** Text-bearing tag. Take `--nf-radius-sm` |
| 0.412 | `.nf-story__send` | `app/social-feed.css:1746` | 14 / 34 | Watch. Icon-only, but `GOVERNING-chat-booking-card.png` draws these as rounded squares |
| 0.412 | `.nf-enter__back` | `app/social-feed.css:2642` | 14 / 34 | Watch. Same case |
| 0.409 | `.nf-nav--drawer .nf-nav__row` | `app/side-nav.css:311` | 18 / 44 | **Violation.** A drawer row carries text. Take `--nf-radius-control` |
| 0.389 | `.nf-site-footer-social__link` | `app/css/site.css:374` | 14 / 36 | Watch, icon-only |
| 0.389 | `.nf-nav__close` | `app/side-nav.css:91` | 14 / 36 | Watch, icon-only |
| 0.368 | `.nf-feedtab` | `app/css/chips.css:219` | 14 / 38 | Watch. Text-bearing at 38px |
| 0.368 | `.nf-district__chip` | `app/social-feed.css:2402` | 14 / 38 | Watch. Text-bearing at 38px |
| 0.357 | `.nf-landing-float-badge` | `app/css/landing.css:714` | 10 / 28 | Watch. Already on `sm`; nothing lower is on the ladder except `xs` |
| 0.357 | `.nf-landing-tag` | `app/css/landing.css:1349` | 10 / 28 | Watch, same |
| 0.350 | `.nf-admin-chip` | `app/css/admin.css:428` | 14 / 40 | Watch |
| 0.350 | `.nf-landing-pill-seg` | `app/css/landing.css:940` | 14 / 40 | Watch |
| 0.346 | `.nf-nav__row` | `app/side-nav.css:531` | 18 / 52 | Pass, just |

Scanner output, TSX, same rule, non-skeleton:

| Ratio | File:line | Radius / height | Verdict |
|---|---|---|---|
| **0.583** | `components/social/feed/PostCard.tsx:472` | 14 / 24 | **CAPSULE.** A text link, "Around {areaName}", at `h-6` on `--nf-radius-control` |
| 0.389 | `components/social/feed/Composer.tsx:349` | 14 / 36 | Watch, and under the tap floor |
| 0.389 | `app/(app)/listing/[id]/ReserveTable.tsx:214`, `:237` | 14 / 36 | Watch, icon-only steppers |
| 0.389 | `app/(app)/listing/[id]/TenancyTerm.tsx:150` | 14 / 36 | Watch, icon-only |
| 0.350 | `components/agent/AgentMobileNav.tsx:57`, `:103` | 14 / 40 | Watch, icon-only |

`components/social/feed/PostCard.tsx:472` is the headline finding of this
section and it is exactly the failure the shape law predicts. The class list is:

```
"mt-sm inline-flex h-6 items-center rounded-[var(--nf-radius-control)] border border-[var(--nf-border-subtle)] px-sm text-[var(--nf-text-overline)] font-semibold text-[var(--nf-content-muted)]"
```

`--nf-radius-control` is the correct token name, the grep for `rounded-full`
passes, rule 10 of the token checker passes, and 14px on a 24px box draws a
capsule with a 4px straight edge down each side. It is on every post card in the
feed that has an area.

**Fix.** `rounded-[var(--nf-radius-sm)]` and `h-7`. `10 / 28 = 0.357`, which is
on the watch line rather than over it, and it matches
`.nf-landing-float-badge` (`app/css/landing.css:714`), which is the same object
on the landing page and already reasons itself to exactly that pair.

Two further notes on `PostCard.tsx:472`: the link is a bespoke chip where
`components/ui/Chip.tsx` exists, and its label is the hardcoded English string
`Around {post.areaName}` in a four-locale product.

## 2.7 Skeletons, empty states, error states

| Kind | Implementations | Canonical |
|---|---|---|
| Skeleton material | `.nf-skeleton` `app/css/controls.css:465`, `.nf-skeleton--glass` `:763`, `.nf-social-skeleton` `app/social.css:276`, `.nf-wait` `app/css/system.css:357` | `components/ui/Skeleton.tsx` over `.nf-skeleton` |
| Skeleton shapes | `components/ui/Skeleton.tsx`, `components/app/ScreenSkeleton.tsx`, `components/agent/AgentScreenSkeleton.tsx`, `app/admin/_components/QueueSkeleton.tsx`, plus 14 `loading.tsx` files hand-assembling `nf-social-skeleton` spans | `Skeleton.tsx` |
| Empty state | `components/app/Screen.tsx` `EmptyState`, `components/social/profile/EmptyPanel.tsx` (already an adapter over `EmptyState`, `EmptyPanel.tsx:2`), `app/admin/_components/ui.tsx` `QueueEmpty`, `components/app/Unreachable.tsx` | `EmptyState` |
| Toast | `.nf-social-toast` at `components/social/profile/ProfileShare.tsx:78`, an inline `role="status"` at `components/app/IntentTune.tsx:194` | neither; there is no toast primitive |

The social layer's empty state has already been unified. `EmptyPanel.tsx:17` to
`:31` records the exact argument this whole section is making: "This kept the
social layer internally consistent and, in doing so, kept it looking like a
different application bolted onto the side of Vallo ... Two products, one
account." That work should now be repeated for skeletons and for the console's
`QueueEmpty`.

The fourteen `loading.tsx` files in `app/(app)/**` hand-assemble slabs, for
example `app/(app)/around/loading.tsx:52` to `:59`, six spans each declaring
`nf-social-skeleton block h-3 w-N rounded-[var(--nf-radius-xs)]`. That is the
exact hazard `components/ui/Skeleton.tsx:9` predicted: "Nobody is going to
hand-assemble a card's worth of slabs at a call site, so nobody did." Somebody
did, fourteen times, in a second material.

**There is no toast primitive at all.** Two surfaces invent one. This should be
a `components/ui/Toast.tsx` in the register, because notices are otherwise going
to keep being invented per surface.

## 2.8 Icon tier mixing

`BrandIcon` (glass objects) and `UiIcon` (stroked navigation) appear in the same
file in 30 components. That is not by itself wrong; the design direction puts
glass on content and strokes on navigation (`DESIGN_DIRECTION.md:175`). The
problem is where they appear in the same ROW.

Worked examples:

- `components/app/SideSwitch.tsx:81` draws `BrandIcon name="hotel" size={30}`
  and `SideSwitch.tsx:95` draws `UiIcon name="chevron-right" size={18}` in the
  same flex row. That is correct: the mark is content and the chevron is
  navigation.
- `components/agent/ModeSwitcher.tsx:48` draws `BrandIcon size={24}` in a
  menu ROW, where every neighbouring row in the same rail draws `UiIcon`. In
  the picker below it, `ModeSwitcher.tsx:96` draws `BrandIcon size={40}`. So the
  same control's two variants use a 24px glass object and a 40px glass object,
  and the 24px one sits in a list of 24px strokes.
- `app/admin/switches/page.tsx:118` draws `UiIcon name="info" size={16}` where
  every other glyph on the console's headers is 20 or 24
  (`app/admin/layout.tsx:88`, `size={20}`).

**Rule to enforce.** Within one row or one list, one tier and one size. The
`UI_ICON_SIZES` ladder is 16, 20, 24, 28, 32, 40
(`app/admin/_components/ui.tsx:98`), and `ModeSwitcher`'s menu variant should be
`UiIcon` at the rail's own rung.

## 2.9 Hardcoded English in a four-locale product

Every string below is a user-visible literal in a product that ships `en`, `ha`,
`ig` and `yo` (`packages/i18n/src/locales/`).

| File:line | String | Note |
|---|---|---|
| `app/(app)/messages/Inbox.tsx:64` to `66` | "All", "Primary", "Requests" | The inbox's three tabs |
| `app/admin/page.tsx:37` to `43` | "All", "Listings", "Agents", "Reports", "Support", "Flags" | The console overview's six tabs |
| `app/admin/_components/QueueTable.tsx:84` to `90` | "ID", "Type", "Title / user", "Status", "Submitted", "Action" | Every console table head |
| `app/admin/_components/QueueTable.tsx:116` | "View" | Every console row |
| `app/admin/_components/QueueFilters.tsx:252` | `aria-label="Filter by status"` | Every console filter row |
| `app/admin/_components/QueueFilters.tsx:258` | "All" | The all-statuses chip |
| `app/admin/_components/nav.ts:150` onward | "Wallets", "Escrow", "Payments", "Verification", "Fees", "Audit log", "Examples", "Businesses" | Console rail; the file explains why at `nav.ts:22` |
| `app/admin/_components/nav.ts:71`, `:82`, `:116`, `:142`, `:170` | "Safety", "Supply", "People", "Money", "Platform" | Console rail band headings; explained at `nav.ts:55` |
| `app/admin/layout.tsx:73` | "Operations Console" | |
| `app/admin/layout.tsx:88` | `aria-label="Notifications"` | |
| `app/admin/layout.tsx:99` | "Admin" | |
| `app/admin/_components/QueueTable.tsx:222` | "Vallo Operations Console" | |
| `components/site/ThemeToggle.tsx:60` | "Switch to light mode" / "Switch to dark mode" | |
| `components/site/ThemeToggle.tsx:92` | "Light mode" / "Dark mode" | A side-drawer row, next to translated rows |
| `components/social/feed/PostCard.tsx:474` | `Around {post.areaName}` | |
| `components/app/stays/StayFilterSheet.tsx:398` to `400` | "Wi-Fi", "Air conditioning", "Parking" | Three of six rows in the same group ARE translated (`:401`, `:415`, `:416`), the other three are not |
| `components/app/stays/StayFilterSheet.tsx:403` | `facility.code.charAt(0).toUpperCase() + facility.code.slice(1)` | A raw database enum value used as a UI label |

`StayFilterSheet.tsx:398` to `:416` is the sharpest case, because in one visual
group four labels come from the dictionary and three are English literals and
one is a database column. `app/admin/_components/QueueFilters.tsx:141` to `:148`
already states the principle exactly: "A control that is half translated is
worse than one that is not, because the half that is translated is the half that
tells the reader the rest is a bug."

The console's English is at least documented and reasoned
(`app/admin/_components/nav.ts:22`, `:55`) as a deliberate stopgap because
`packages/i18n` is another owner's file. `ThemeToggle`, `Inbox`, `PostCard` and
`StayFilterSheet` are not.

## 2.10 Master inconsistency table

| # | Inconsistency | Evidence | Canonical | Fix |
|---|---|---|---|---|
| U1 | Eleven segmented families | table in 2.1 | `components/ui/Segmented.tsx` | Migrate; delete `.nf-segment`, merge `.nf-feed-seg` into `.nf-glass-seg` |
| U2 | Three switch implementations | `Switch.tsx:71`, `rows.tsx:255`, `ListingWizard.tsx:294` | `components/ui/Switch.tsx` | See 1.7 fix list |
| U3 | Four switch-row adapters | `Toggle.tsx:38`, `FilterDrawer.tsx:244`, `StayFilterSheet.tsx:184`, `Switch.tsx:141` | the primitive's own row | Delete three; reconcile the type rung |
| U4 | Two `.nf-switch` blocks | `settings-rows.css:329`, `controls.css:689` | `controls.css` | Delete the `settings-rows` one |
| U5 | Two knob class names | `Switch.tsx:128` `__thumb`, `rows.tsx:262` `__knob` | `__thumb` | Falls out of U2 |
| U6 | Six page-header families | 2.3 | `PageHeader.tsx` and `ui.QueueHeader` | Delete `QueueHeadline` |
| U7 | 123 raw `nf-btn` strings | 2.4 | `components/ui/Button.tsx` | Convert; social profile folder first |
| U8 | `nf-social-danger` beside `variant="danger"` | `ProfileMenu.tsx:358` | `Button variant="danger"` | Delete the social-only tone |
| U9 | Invented size rung at call site | `ProfilePhotos.tsx:190`, `:209` | `Button size` | Use a rung |
| U10 | 17 ad hoc font sizes in `components/auth` | 2.5 | `--nf-text-*` | Map each; add a lint rule |
| U11 | `text-2xl` | `ProfileIdentityCard.tsx:92` | `--nf-text-*` | Map |
| U12 | Off-ladder display sizes | `ListingMoveIn.tsx:108`, `ListingReviews.tsx:75` | `--nf-text-h*` | Map or extend the ladder |
| U13 | Raw numeric spacing | 2.5 table | `--nf-space-*` aliases | Add a lint rule |
| U14 | Capsule at 0.583 | `PostCard.tsx:472` | `--nf-radius-sm` at `h-7` | See 2.6 |
| U15 | Capsules at 0.438 | `settings-rows.css:397`, `catalogue.css:868` | `--nf-radius-sm` | See 2.6 |
| U16 | Drawer row at 0.409 | `side-nav.css:311` | `--nf-radius-control` | 14 / 44 = 0.318 |
| U17 | Four skeleton materials | 2.7 | `.nf-skeleton` via `Skeleton.tsx` | Convert the 14 `loading.tsx` files |
| U18 | Four empty states | 2.7 | `Screen.tsx` `EmptyState` | Fold in `QueueEmpty` and `Unreachable` |
| U19 | No toast primitive | 2.7 | none exists | Write `components/ui/Toast.tsx` |
| U20 | Icon tier and size mixed in a row | 2.8 | one tier per row | `ModeSwitcher.tsx:48` first |
| U21 | 17 hardcoded English surfaces | 2.9 table | the dictionary | `ThemeToggle`, `Inbox`, `PostCard`, `StayFilterSheet` first |
| U22 | `Chip` height declared twice | `Chip.tsx:135`, `chips.css:85` | the stylesheet | Delete `HEIGHT` |
| U23 | `Segmented size="sm"` is 36px | `Segmented.tsx:136` | 44px floor | Either raise `sm` or delete it; three crypto call sites use it |
| U24 | `StatusPill shape="pill"` still reachable | `components/ui/StatusPill.tsx:186`, `:208` | delete the prop | Deprecated at `:184`, only `app/(dev)/preview/g1/` passes it |

---

# PART 3. THE SIGN-IN BUTTON MARKS

## 3.1 What is actually drawn today

There is exactly one social sign-in control in the product.
`components/auth/AuthChoices.tsx:112` to `:126`:

```tsx
<form action={startGoogleOAuth}>
  {next ? <input type="hidden" name="next" value={next} /> : null}
  <input type="hidden" name="intent" value={mode} />
  <button type="submit" className="nf-auth__door nf-tap">
    {/* A typographic mark rather than the four-colour glyph: the
        palette holds one blue family and nothing in this tree draws
        a third party's colours. The word beside it says which door
        this is. */}
    <span className="nf-auth__door-mark" aria-hidden="true">
      G
    </span>
    {t.auth.continueWithGoogle}
  </button>
</form>
```

**The mark is the literal character `G`.** It is not a `UiIcon`, not an inline
`<svg>`, not an `<img>`. It is a text node in a span.

Its material, `app/css/auth.css:356` to `:368`:

```css
.nf-auth__door-mark {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--nf-radius-circle);
  background: var(--nf-content-primary);
  color: var(--nf-content-inverse);
  font-family: var(--nf-font-display);
  font-size: var(--nf-text-body);
  font-weight: 700;
  line-height: 1;
}
```

## 3.2 Why it comes out white

`--nf-content-primary` is `var(--nf-mist-100)`, which is `#FFFFFF`
(`packages/design-tokens/src/tokens.css:458` and `:69`).
`--nf-content-inverse` is `#0B0D14` (`tokens.css:463`).

So in the dark theme the mark is a **28px pure white disc with a near-black
capital G set in Poppins** (`--nf-font-display` is
`var(--nf-font-poppins), ...`, `tokens.css:2319`). In the light theme the two
tokens flip (`tokens.css:2769` `--nf-content-primary: #16181D`, `tokens.css:2784`
`--nf-content-inverse: #FFFFFF`) and it becomes a near-black disc with a white G.

That is the founder's report, precisely: "a white or generic G". It is not a
`currentColor` inheritance bug, not a mask, not a fill override and not a
missing asset. It is deliberate, argued for in the comment at
`AuthChoices.tsx:119`, and the argument is wrong for the reason set out in 3.5.

There is no Google brand asset anywhere in the repository. A whole-tree search
for files named for either brand returns only
`apps/web/public/.well-known/apple-app-site-association` (universal links) and
`apps/web/public/pwa/apple-touch-icon.png` (a PWA icon). Neither is a sign-in
mark.

## 3.3 The Apple button does not exist

`lib/auth/actions.ts:659` exports `startAppleOAuth`. Nothing imports it. A
search for `apple` across `apps/web/src/components/auth` returns no matches at
all. `lib/auth/providers.ts:35` explains why and is right to: Apple sign-in
needs an Apple Developer team, a Services ID and a signing key, and
"drawing the button before then is a control that can only fail, which is the
same defect as a Reserve button on a listing nobody can book".

`lib/auth/providers.ts:76` defaults socials to `["google"]` only, and the
environment override `NEXT_PUBLIC_AUTH_PROVIDERS=google,apple` turns Apple on
the day the credentials land.

So the founder's report of an Apple button rendering a generic glyph is
**not reproducible today**: the button is not drawn. What IS true is that when
Apple is switched on, `AuthChoices.tsx` has no Apple branch at all, so the
provider would be enabled server side with no door on screen. That is a real
gap and it should be built now, correctly, rather than improvised on the day.

## 3.4 The brand rules

Both primary sources are blocked by this environment's egress proxy
(`developers.google.com` and `developer.apple.com` both return
`EGRESS_BLOCKED`). What follows is from search-result summaries of those pages,
and every figure should be re-verified against the live page before
implementation. See the honesty log.

**Google, Sign in with Google branding guidelines.**

- The mark: "Regardless of the text, you can't change the size or color of the
  Google 'G' logo." It must be the standard colour version, the four-colour
  super G.
- The mark alone is not allowed: "Don't use the Google icon or logo by itself
  without the button boundary and without text to indicate the user action."
- Permitted call-to-action text: "Sign in with Google", "Sign up with Google",
  or "Continue with Google".
- Button themes: pre-approved assets ship in **Light, Neutral and Dark**, in PNG
  and SVG, for all platforms, in Google's own `signin-assets.zip`.
- Button font: **Google Sans Medium, 14/20**.
- Padding: **Android and web, 12px before the logo, 10px after it, 12px after
  the text**. iOS, 16 / 12 / 16.
- Scaling: you may scale the button for different devices and screen sizes
  while preserving the aspect ratio, so the logo is never stretched.
- Related Google surfaces (Wallet) state a minimum button height of 48dp and
  8dp of clear space; treat that as the family's floor rather than as the
  Sign in with Google number, which the blocked page holds.

**Apple, Sign in with Apple Human Interface Guidelines.**

- Styles: black, white, and **white with an outline** (`.whiteOutline`).
- Height: "Use the PNG files only in buttons that are 44 points tall, which is
  the default (and recommended) button height in iOS." Minimum size is quoted
  as 140 x 30pt. Use SVG or PDF for buttons at any other size; PNG only at
  44 x 44pt for the logo-only form.
- Corner radius: "By default, the Sign in with Apple button has rounded corners,
  and in iOS, macOS, and the web, you can change the corner radius to produce a
  button with square corners or a pill-shaped button. You should adjust the
  corner radius to match the appearance of other buttons in your app."
- Margins: "Maintain a minimum margin between the title and the right edge of
  the button. The margin should measure at least 8% of the button's width."
- Proportions: "The title should be at 43% of the button height", and a
  logo-only button "always has a 1:1 aspect ratio, and the artwork already
  includes the correct padding on all sides."
- You may "use a stroke to emphasize the button bezel or add a drop shadow", and
  "use a corner radius value that matches the other buttons in your UI".
- The logo itself is supplied artwork and is not redrawn or recoloured; the
  colour decision is made by choosing one of the three button styles.

## 3.5 Where the brand rules collide with THE SHAPE LAW, and the resolution

**The collision is narrower than it looks, and it is only with Google.**

| Question | Brand rule | Vallo rule | Winner |
|---|---|---|---|
| The mark's colour | Google: four-colour G, never recoloured | `DESIGN_DIRECTION.md:33`: "one blue family (any warm hue in a render becomes its blue-family equivalent)" | **Google.** The one-blue-family rule governs Vallo's own marks. The Google G is not ours to restyle, and a monochrome G is a licence breach as well as a worse control |
| The mark's shape | Google: the supplied asset, unmodified | `DESIGN_DIRECTION.md:50`: an avatar and a bare icon button may be round | No conflict. The G asset is placed, not drawn |
| The button's corner | Google: scale while preserving aspect ratio; the pre-approved asset is a rounded rectangle | `--nf-radius-control`, 14px | **Vallo**, because Google's rule constrains the LOGO's aspect, not the button's corner, and Apple explicitly invites you to match your own UI |
| The button's corner, Apple | "You should adjust the corner radius to match the appearance of other buttons in your app" | `--nf-radius-control` | **Vallo**, and Apple says so in as many words |
| The wording | Google: one of three exact strings | our dictionary | **Google.** "Continue with Google" is one of the three permitted strings and is exactly what `packages/i18n/src/locales/en.ts:860` already says |
| The wording, localised | Google supplies localised assets | `ha.ts:586`, `ig.ts:583`, `yo.ts:581` already translate it | Use Google's localised asset where one exists for the locale; otherwise the English button, because a hand-translated Google button is not an approved asset |
| The button's height | Google family floor 48dp; Apple 44pt | `.nf-auth__door` is `min-height: 3.5rem` = 56px, `app/css/auth.css:330` | No conflict. 56 clears both |
| The button's radius ratio | n/a | `14 / 56 = 0.25` | Passes the shape law comfortably |

**The founder's framing is right and should be written down as the rule:
brand rules win on the mark itself; our radius governs the button's corner
where the brand permits.** Both brands permit it. Google's constraint is on the
logo's colour, size and aspect and on the presence of a boundary and a word;
Apple's is on the logo artwork and the title proportion, and it names the
corner radius as yours.

## 3.6 The fix

1. **Add the assets.** Download Google's `signin-assets.zip` and take the SVG G.
   Put it at `apps/web/public/brand/google-g.svg`. Take Apple's supplied
   logo artwork and put it at `apps/web/public/brand/apple-logo.svg`.
   These are third-party marks, so they do NOT go through
   `scripts/icon-manifest.mjs` and they are NOT `UiIcon` or `BrandIcon` names:
   both of those tiers inherit `currentColor`, which is the whole cause of this
   defect.

2. **Draw them as `<img>`, not as inline SVG.** An inline SVG in this codebase
   will sooner or later be given `fill="currentColor"` by a sweep. An `<img
   src="/brand/google-g.svg" alt="" aria-hidden="true" width="20" height="20"
   />` cannot be recoloured by a stylesheet, which is the property the brand
   rule needs. `next/image` is not needed for a 1KB SVG; a plain `<img>` with
   explicit `width` and `height` avoids layout shift.

3. **Replace `AuthChoices.tsx:120` to `:122`** with that `<img>`, and delete
   `.nf-auth__door-mark` from `app/css/auth.css:356` to `:368`, replacing it
   with a rule that only sizes and spaces the image:

   ```css
   .nf-auth__door-mark {
     display: grid;
     place-items: center;
     inline-size: 1.25rem;
     block-size: 1.25rem;
     flex: none;
   }
   ```

   No `background`, no `color`, no `border-radius`, no `font-family`. The mark
   brings its own colour.

4. **Set the Google padding.** `.nf-auth__door` at `app/css/auth.css:334`
   currently uses `padding: var(--nf-space-sm) var(--nf-space-md)` and
   `gap: var(--nf-gap-row)`, centred. Google's web spec is 12px before the
   logo, 10px between logo and text, 12px after the text. Give the Google door
   a modifier that sets `gap: 10px` and `padding-inline: 12px`, and keep
   `justify-content: center` because the pre-approved buttons centre their
   content.

5. **Choose the theme per `data-theme`.** Google ships Light, Neutral and Dark.
   `.nf-auth__door` is a glass control on a dark canvas, so Dark is the correct
   choice in the dark theme and Light in the light theme. If the product ships
   the button boundary itself (which it does, glass with a brand edge) rather
   than Google's supplied button image, the mark plus the word plus our boundary
   is the "custom button" path and the boundary is what Google's "don't use the
   icon by itself without the button boundary" rule is asking for.

6. **Build the Apple door now, behind the existing flag.** Add an
   `appleReady = configured("apple")` line beside
   `AuthChoices.tsx:55`'s `googleReady`, a second `<form action={startAppleOAuth}>`
   block, and the black-style logo at 1.25rem. Per Apple, the title is
   43 per cent of the button height: our door is 56px, so 24px, which is above
   `--nf-text-body`; use `--nf-text-body` (16px) and accept the deviation, or
   raise the door for the Apple variant only. Record whichever is chosen. The
   button stays hidden until `NEXT_PUBLIC_AUTH_PROVIDERS` names `apple`, so
   nothing ships that can only fail.

7. **Keep the wording.** "Continue with Google" is already one of the three
   permitted strings. For Apple the permitted titles are "Sign in with Apple",
   "Sign up with Apple" and "Continue with Apple"; `AuthChoices` already knows
   which mode it is in (`AuthChoices.tsx:52`, `isSignUp`), so it can pick the
   right one. Add the three strings to the dictionary in all four locales, and
   note that Apple supplies its own localised titles for the system button;
   this is a custom button, so ours are ours.

8. **Verify before merge.** Screenshot both buttons at 390px in both themes
   against the current live copies of the two guideline pages. Neither page was
   reachable from this environment.

---

# PART 4. THE ADMIN CONSOLE

## 4.1 What exists today

`apps/web/src/app/admin` holds 19 destinations and 76 files. There is no
`apps/web/src/components/admin`; the shared furniture lives in
`app/admin/_components/`.

**The shell.** `app/admin/layout.tsx`.

- Access decided once, on the server, before a queue is read
  (`layout.tsx:37`, `requireAdmin()`); a non-admin receives `AccessScreen`
  instead of children.
- Left rail, `.nf-admin-rail` (`app/css/admin.css:33`): brand lockup
  (`layout.tsx:59`), banded destinations with live counts
  (`layout.tsx:65`, `<AdminRail>`), a console card at the foot
  (`layout.tsx:67`).
- Top bar, `.nf-admin-bar` (`app/css/admin.css:166`): back control, logo on
  phone, `ConsoleSearch` with a keyboard hint, a bell, the signed-in person's
  initial and email (`layout.tsx:81` to `:103`).
- Phone tab strip, `<AdminTabs>` (`layout.tsx:106`), carrying the same map as
  the rail, derived from it at `app/admin/_components/nav.ts:200`.
- Console footer, `<ConsoleFooter>` (`layout.tsx:112`).

**The destinations**, `app/admin/_components/nav.ts:67` to `:192`, in five
bands:

| Band | Destinations | Badged |
|---|---|---|
| (none) | Overview `/admin` | no |
| Safety | Flags, Moderation, Alerts, Reports | all four |
| Supply | Agents, Stops, Listings, Businesses, Bookings | Agents, Listings |
| People | Support tickets, Around (social), Standing | Tickets |
| Money | Wallets, Escrow, Payments, Verification (KYC), Fees | Escrow |
| Platform | Audit log, Examples, Reference, Switches | Examples |

**The queue frame**, `app/admin/_components/QueueFilters.tsx`.

- A `<form method="get">` so a narrowed queue is a URL
  (`QueueFilters.tsx:23` to `:33`).
- Glass search field (`QueueFilters.tsx:190`), a native `<details>` disclosure
  holding a From / To date pair and Apply / Clear (`QueueFilters.tsx:215` to
  `:236`).
- A horizontal chip row of statuses drawn from the real enum
  (`QueueFilters.tsx:246` to `:280`), each chip a `<Link>` with `aria-current`.
- Four chip tones mapped from the machine value by `chipTone`
  (`QueueFilters.tsx:288` to `:296`): cyan pending, blue under review, emerald
  approved, rose rejected.
- Cursor pagination, `QueuePager` (`QueueFilters.tsx:310`), Next offered only
  when the page came back full. No total and no page count, by choice
  (`QueueFilters.tsx:43` to `:50`).
- Per-queue opt-outs `searchable` and `dateable`, each with a written reason
  (`QueueFilters.tsx:150`, `:163`).

**The table**, `app/admin/_components/QueueTable.tsx:69`.

- `.nf-admin-table` (`app/css/admin.css:513`), a lit glass pane.
- A list of rows on a grid rather than a `<table>`, so a row can carry its own
  detail under a native `<details>` (`QueueTable.tsx:22`).
- Seven columns on desktop, self-naming cells on phone
  (`QueueTable.tsx:84` to `:90`, `app/css/admin.css:528`, `:567`).
- Status drawn by `<StatusPill>` with the tone derived by `toneForStatus`
  (`QueueTable.tsx:4`), which is the single platform map.
- Deliberately absent: bulk actions and export, because no desk has a bulk
  write and no export exists (`QueueTable.tsx:27`).

**The shared furniture**, `app/admin/_components/ui.tsx`, handed out by
`adminUi(t, locale)` so locale and dictionary bind once:
`StatusChip` (`:252`), `QueueHeader` (`:269`), `Stat` (`:348`),
`StatRow` (`:388`), `QueueEmpty`, `QueueUnavailable`, `DetailRow`, `when`,
`statusLabel`.

**The desks with their own shapes**, beyond the queue frame:
`MoneyDecisions.tsx`, `AdminActions.tsx` (the decision controls and the
`SwitchControl` at `:663`), `AlertCards.tsx`, `AuditList.tsx`,
`ReservationCard.tsx`, `ReservationDecisions.tsx`, `BusinessDecisions.tsx`,
`RetireExamples.tsx`, `HoldDecision.tsx`, `MoneyRows.tsx`, `LookupPanel.tsx`,
`MethodLookup.tsx`, `SweepHolds.tsx`, `ReferenceEditors.tsx`,
`SocialDecisions.tsx`, `StandingDesk.tsx`, `StopsDesk.tsx`.

**What is missing against the founder's reference.** The mockup is a dark glass
operations console with a left rail, filter chips across the top, a data table
with coloured status pills, pagination, and **analytics graphs**. The console
already has every one of those except the graphs. There is not a single chart
anywhere under `app/admin`.

The platform's only two charts are hand-rolled SVG, in the agent workspace, not
the console: `components/agent/charts/AreaSparkline.tsx` and
`components/agent/charts/DonutChart.tsx`. `AreaSparkline.tsx:4` records the
constraint they were built under: "Pure SVG, no charting library (Master Rule
52, no unnecessary dependencies)."

One more console defect worth recording while inventorying: **the kill switches
are not switches.** `app/admin/switches/page.tsx` is titled for switches, and
`app/admin/_components/AdminActions.tsx:691` to `:699` draws a
`Button variant="dangerQuiet"` labelled "Switch off" or a
`Button variant="primary"` labelled "Switch on". A screen that says switch and
draws a button, on the one console surface an operator reaches for in an
incident, is a uniqueness failure in the founder's exact sense. The decision to
use a button is defensible (turning a surface off opens a confirmation sheet,
`AdminActions.tsx:707`), but then the screen should not be called switches, or
the control should be a `<Switch>` that opens the sheet.

## 4.2 The charting decision

Constraints, all of them real and all of them from the tree:

1. Next 16.2.12, React 19.2.0 (`apps/web/package.json`).
2. TypeScript 5.7.3, and the whole console renders on the server; queue pages
   are server components by design (`QueueFilters.tsx:35`).
3. Current runtime dependency count is thirteen, of which five are Capacitor
   and two are workspace-local. The repository has an explicit
   no-unnecessary-dependencies rule (`AreaSparkline.tsx:4`).
4. Palette: one blue family, emerald success, rose error, bright cyan pending.
   No orange, amber, gold or purple. Every default palette in every charting
   library breaks this on install.
5. The console is glass on a near-black canvas (`--nf-surface-canvas: #000612`,
   `tokens.css:433`) and must also work on paper
   (`--nf-surface-canvas: #F4F5F7`, `tokens.css:2762`).

### Bundle-size comparison

Figures are minified-and-gzipped and are drawn from 2026 comparison write-ups,
not from a build of this tree. See the honesty log.

| Option | Approx. gzip | SSR / RSC | Theming | Verdict |
|---|---|---|---|---|
| Hand-rolled SVG, as today | ~1KB per chart, no dependency | Native. Deterministic server and client output (`AreaSparkline.tsx:5`) | CSS custom properties directly, both themes free | **Recommended for the console** |
| Recharts 3 | ~150KB | Renders under SSR; every chart is a client component | Props-based; defaults must be overridden per chart | Second choice |
| visx | Tree-shaken per primitive; smallest of the library options | Client | You draw the marks, so theming is yours | Third choice |
| Nivo | ~186KB, up to 500KB+ for a full install | SSR variants exist | Theme object | No |
| Chart.js via react-chartjs-2 | ~92KB core | Canvas, client-only, needs a dynamic import | Canvas, so no CSS custom properties, so the theme has to be read in JS | No |
| Apache ECharts | ~100KB tree-shaken | Client-only | Canvas, same problem | No |
| Tremor | ~200KB (bundles Recharts) | Client | Ships its own design system, which would fight ours | No |

### Recommendation

**Extend the existing hand-rolled SVG approach into a small
`components/ui/charts/` family, and do not add a charting dependency.**

The reasoning is not nostalgia for zero dependencies. It is that every property
the console needs is a property a library takes away:

- **Server rendering.** Every console page is a server component today. Recharts
  charts are client components; adopting it turns each charted desk into a
  client boundary and ships the queue's data twice, once as HTML and once as
  the RSC payload for hydration. Inline SVG stays on the server.
- **Theming.** The console's colours are CSS custom properties that change under
  `[data-theme="light"]`. An SVG `stroke="var(--nf-brand-primary)"` follows the
  theme with no JavaScript. Canvas libraries cannot read a custom property
  without resolving it in JS on the client, which means a flash of the wrong
  colour and a theme listener per chart. Recharts can take a CSS variable in a
  `stroke` prop but its axes, grids, tooltips and legends each need overriding.
- **The palette constraint.** Every library ships a categorical default that
  includes the four banned hues. Overriding them everywhere is more code than
  drawing the marks.
- **Size.** 150KB gzip for Recharts against a total of perhaps six charts.
- **Precedent.** Two correct hand-rolled charts already exist and are good:
  `DonutChart.tsx:32` computes proper arc offsets with gaps, and
  `AreaSparkline.tsx:36` builds a deterministic path with
  `vectorEffect="non-scaling-stroke"` so the line keeps its weight under a
  non-uniform `preserveAspectRatio`.

**What to build**, in `components/ui/charts/`, server-safe with no hooks:

| Component | Form | For |
|---|---|---|
| `TimeSeries.tsx` | line or area, one series, x = day | every "over the last N days" chart |
| `StackedBars.tsx` | horizontal stacked bar, one row | status composition of a queue |
| `Bars.tsx` | vertical bars, categorical | counts by kind |
| `Donut.tsx` | move `components/agent/charts/DonutChart.tsx` here | share of a total |
| `Sparkline.tsx` | move `components/agent/charts/AreaSparkline.tsx` here | inside a `Stat` tile |

Three rules the family must obey, taken from the data-visualisation method:

1. **One y-axis, ever.** Two measures of different scale become two charts.
2. **A legend whenever there are two or more series, and direct labels at four
   or fewer.** Identity is never colour alone, which also answers the
   `docs/` rule that colour is never the only signal (`ui.tsx:340`).
3. **Hover is not optional** on line, area, bar and dot forms. That means the
   charted desks need a thin client wrapper for the tooltip only, with the marks
   still rendered on the server. A crosshair plus tooltip on the time series and
   a per-mark tooltip on the bars.

An honest caveat on rule 3: a tooltip needs client JavaScript, so a charted
console page becomes partly client. The smallest arrangement is a server-rendered
`<svg>` wrapped by a tiny client component that owns only pointer position, so
the data does not cross the boundary twice.

### The validated palette

The default palettes of every library are unusable here, so the console needs
its own, and it was validated rather than eyeballed. Results from the
validator, dark surface `#000612`, light surface `#FFFFFF`:

**Status palette** (reserved, never reused as a series colour). These are the
existing product tokens and they are already correct:

| Role | Dark | Token | Light | Token |
|---|---|---|---|---|
| pending | `#00C8FF` | `--nf-cyan-400`, `tokens.css:165` | see `light` block | `--nf-status-pending` |
| in review | `#0069FE` | `--nf-electric-300`, `tokens.css:118` | `#094BA9` | `tokens.css:2787` |
| approved | `#10B981` | `--nf-emerald-400`, `tokens.css:201` | `#0A7A51` | `tokens.css:3151` |
| rejected | `#FF1744` | `--nf-rose-400`, `tokens.css:202` | `#C10E32` | `tokens.css:3158` |

Validated as a set on the dark surface: chroma floor PASS, colourblind
separation PASS (worst adjacent pair rose to emerald, deuteranope delta E 8.2,
tritanope 9.8), contrast against surface PASS for all four. The lightness-band
check FAILs, but that check is defined for categorical palettes and these are
status colours, which the method reserves and ships with a word and a shape
rather than colour alone. `.nf-admin-chip::before` at `app/css/admin.css:463`
already draws the shape and `QueueFilters.tsx:270` already prints the word, so
the console meets the condition the FAIL is guarding.

**Categorical palette for multi-series charts.** This is where the constraint
bites, and the finding is worth stating plainly:

**A four-slot categorical palette cannot be built honestly inside Vallo's
colour law.** Every candidate fails. Emerald against rose is deuteranope delta E
3.6 to 4.6, far under the 8 floor; blue against cyan is normal-vision delta E
11.1 to 14.0, under the 15 hard floor. Tested:

- `#4D96FF, #00C8FF, #10B981, #FF6B8A`: CVD FAIL 3.6, normal-vision FAIL 13.3
- `#0C6AEF, #00A6E0, #10B981, #FF4D6D`: CVD FAIL 3.7
- `#5C9FFF, #00C8FF, #34D399, #FB7185`: CVD FAIL 4.6, normal-vision FAIL 11.1
- `#0069FE, #0099CC, #12A075, #C2185B`: normal-vision FAIL 14.0

The three-slot palettes that pass every check:

| Theme | Palette | Result |
|---|---|---|
| Dark, surface `#000612` | `#0069FE`, `#00A0D6`, `#0F9E72` | Lightness PASS, chroma PASS, CVD PASS (worst 14.3 deutan), normal-vision PASS (15.1), contrast PASS |
| Light, surface `#FFFFFF` | `#094BA9`, `#0090B8`, `#0A7A51` | All five PASS (worst CVD 14.9, normal-vision 15.6) |

The light triple is especially good news: `#094BA9` is already
`--nf-brand-primary` in the light theme (`tokens.css:2787`) and `#0A7A51` is
already `--nf-state-success` (`tokens.css:3151`), so two of the three slots are
existing tokens.

**The practical consequence.** The console's charts should be **one series
almost everywhere**, with a **stacked bar** carrying the status composition
using the reserved status palette plus its shapes and words. Where a chart
genuinely needs four categories, use a sequential ramp of the one blue family
ordered by magnitude, or facet into small multiples, rather than inventing a
fourth hue. That is not a compromise: a single-hue sequential ramp is the right
encoding for magnitude anyway, and the console's questions are almost all
magnitude questions.

**Sequential ramp** for magnitude, one hue, light to dark, from the existing
family: `--nf-electric-300` `#0069FE` through `--nf-electric-400` `#0C6AEF`,
`--nf-electric-500` `#005DE0`, `--nf-electric-600` `#0056D0`,
`--nf-electric-700` `#003F98` (`tokens.css:161` to `:164`). Five steps, already
tokenised, already monotonic in lightness.

**No diverging pair is available**, because a diverging scale needs two opposed
hues and the palette has one warm ink (rose) which is reserved for errors.
Where a diverging encoding is wanted (above target versus below target), use
emerald and rose WITH a shape and a word, or split into two charts.

## 4.3 What each desk should chart, from data that actually exists

This is constrained to what the admin queries already return. Nothing below
requires a new table; the two that require a new aggregate are marked.

### Overview, `/admin`

Data: `getQueueCounts()` (`lib/admin/queries.ts:102`) returns seven counts
(`flags`, `alerts`, `applications`, `listings`, `reports`, `tickets`,
`moderation`), each an exact `count` read.

| Chart | Form | Encoding |
|---|---|---|
| Work waiting by queue | horizontal bars, one series | Sequential blue ramp ordered by magnitude, seven bars, direct-labelled |
| Total waiting over time | time series | **Needs a new daily snapshot.** `getQueueCounts` is a point-in-time read; there is no history. Either accept no trend, or add a `queue_snapshots` table written by a scheduled job. Do not fake it |

The honest answer for the overview today is the bar chart and a row of `Stat`
tiles, which `ui.StatRow` (`app/admin/_components/ui.tsx:388`) already provides.
A trend line would be an invented number, which
`app/admin/_components/ui.tsx:296` already refuses by name for the agent
dashboard.

### Money, `/admin/money`

Data: `MoneyConsole` (`lib/admin/money-queries.ts:70`) gives `wallets`,
`recent` (ledger entries), `stuck` (PENDING debits older than 30 minutes,
`money-queries.ts:79`), and `totals: { balanceMinor, heldMinor, walletCount }`.

| Chart | Form | Encoding |
|---|---|---|
| Settled versus held, right now | one stacked horizontal bar | Two segments, blue settled and cyan held (held is money in flight, which is what pending means), 2px gap, direct labels |
| Ledger volume by day, last 30 days | time series, one series | Blue. Derived from `recent[].createdAt`. Note the cap: `RECENT_LIMIT` is 60 (`money-queries.ts:81`), so the series is truthful only for very low volume. Raise the limit for the chart's own read or say the window is the last 60 entries |
| Stuck debits | `Stat` tile with a sparkline, not a chart | `stuck.length` with tone `danger` |

### Escrow, `/admin/escrow`

Data: `EscrowConsole` (`money-queries.ts:349`) gives `disputes`, `open`,
`settled`, and `totals: { heldMinor, openCount, disputeCount }` read separately
from their own two-column query so a filter cannot silently rescope them
(`money-queries.ts:371`).

| Chart | Form | Encoding |
|---|---|---|
| Escrow state composition | stacked bar, one row | Three segments from the status palette: open blue, disputed rose, settled emerald |
| Money held over time | time series | Derived from `open[].heldAt` cumulatively. Honest caveat: `SUMMARY_LIMIT` is 2000 (`money-queries.ts:316`), above which the figure is a floor, and the chart must say so |
| Time to settle | histogram, vertical bars | `releasedAt - heldAt` bucketed. Sequential blue ramp |

### Payments, `/admin/payments`

Data: `PaymentHealth` (`lib/admin/payments-queries.ts:83`) gives `overdrawn`,
`staleHolds`, `unsettled` and `totals: { frozenMinor, shortfallMinor,
unsettledMinor }`, with `STALE_HOLD_MINUTES = 30` (`payments-queries.ts:99`).

| Chart | Form | Encoding |
|---|---|---|
| Health, three counts | vertical bars | All three are failures, so all three take `--nf-state-error` with a word under each. Not a categorical palette |
| Hold age distribution | histogram | Buckets under 30 minutes in blue and over 30 minutes in rose, with the 30-minute line drawn and labelled |

### Bookings, `/admin/bookings`

Data: `AdminBookingBoard` (`lib/admin/bookings-queries.ts:133`) gives `live`,
`past`, `cancelled`; each row carries `checkIn`, `checkOut`, `nights`,
`totalMinor`, `status`, `createdAt` (`bookings-queries.ts:107`), and
`paidByBooking` (`bookings-queries.ts:163`) sums SUCCESSFUL transactions per
booking.

| Chart | Form | Encoding |
|---|---|---|
| Bookings by status | stacked bar | Status palette: confirmed emerald, pending cyan, cancelled rose |
| Bookings created per day | time series | Blue, from `createdAt` |
| Nights on the calendar, forward 90 days | vertical bars per day | Sequential blue ramp by occupancy. Derived from `checkIn` and `checkOut` |
| Value collected against value booked | two bars, not a dual axis | Same unit (kobo), so one axis, two bars |

### Revenue, wherever it is surfaced

Data: `RevenueSummary` (`lib/admin/revenue-queries.ts:51`) gives
`bySource[] { source, amountMinor, entries }`, `windowTotalMinor`,
`allTimeMinor`, `recent[]`, with `REVENUE_WINDOW_DAYS = 90`
(`revenue-queries.ts:58`). The enum has two sources,
`escrow_commission` and `listing_fee` (`revenue-queries.ts:31`), and the file
notes `listing_fee` has no charging path yet.

| Chart | Form | Encoding |
|---|---|---|
| Revenue by source | donut or two bars | Two slots only, so the two-slot palette is easy. Blue and emerald |
| Revenue per day, 90 days | time series | Blue. From `recent[].createdAt` and `amountMinor` |
| All-time against window | two `Stat` tiles, not a chart | Two numbers of different scale with no shared axis |

This desk has no page of its own today; `revenue-queries.ts` exists and
`ADMIN_NAV_GROUPS` (`nav.ts:143`) has no Revenue entry. That is a gap worth
closing at the same time.

### Agent applications, `/admin/agents`

Data: `ApplicationQueue { waiting, decided }` (`queries.ts:639`), each
`ApplicationView` (`queries.ts:509`) carrying a status and timestamps.

| Chart | Form | Encoding |
|---|---|---|
| Applications by status | stacked bar | Status palette |
| Decision latency | histogram | Submitted to decided, bucketed, sequential blue |
| Applications per week | time series | Blue |

### Listings, `/admin/listings`

Data: `ListingQueue { waiting, decided }` (`queries.ts:955`), each
`ListingReviewView` (`queries.ts:747`) carrying `status`, `propertyType`, `city`,
`area`, `submittedAt`, plus `QualityCheck[]` (`queries.ts:745`).

| Chart | Form | Encoding |
|---|---|---|
| Submissions by status | stacked bar | Status palette |
| Quality checks passed and failed | stacked bar per check | Emerald and rose with words |
| Submissions by property type | horizontal bars | Sequential blue by magnitude, not categorical hues |
| Submissions per week | time series | Blue |

### Moderation, `/admin/moderation`

Data: `ModerationQueue` (`lib/admin/moderation-queries.ts:78`) holds held posts,
stories, story comments and bios, four separate arrays.

| Chart | Form | Encoding |
|---|---|---|
| Held by kind | horizontal bars, four | Sequential blue ramp by magnitude. Four categories, so this is exactly the case where the categorical constraint forbids four hues and the sequential ramp is the right answer anyway |
| Held per day | time series | Blue |

### Support, `/admin/support`

Data: `TicketView` (`queries.ts:1038`) with status and messages; the counts
already flow into `getQueueCounts`.

| Chart | Form | Encoding |
|---|---|---|
| Tickets by state | stacked bar | Status palette |
| First-response latency | histogram | From the ticket's first inbound and first outbound message (`TicketMessageView`, `queries.ts:1031`). Sequential blue |
| Waiting on us, over time | time series | Blue. The desk already computes "waiting on us" (`en.ts:3127`) |

### Verification (KYC), `/admin/kyc`

Data: `KycQueue` (`lib/admin/kyc-queries.ts:81`), `KycDocumentView`
(`:35`), `KycSubjectView` (`:59`), with
`ADDRESS_PROOF_MAX_AGE_DAYS = 92` (`kyc-queries.ts:33`).

| Chart | Form | Encoding |
|---|---|---|
| Documents by state | stacked bar | Status palette |
| Address proofs by age against the 92-day line | histogram | Blue under the line, rose over it, the line drawn and labelled |

### Stops and standing, `/admin/stops`, `/admin/standing`

Data: `StopsRead` / `AgentStanding` (`lib/admin/suspension-queries.ts:59`,
`:72`), `STOPS_STATUSES = ["APPROVED", "SUSPENDED"]` (`:93`); `ManualGrant`
(`lib/admin/standing-queries.ts:30`).

| Chart | Form | Encoding |
|---|---|---|
| Agents approved against suspended | one stacked bar | Emerald and rose, with words |
| Time under stop | histogram | Sequential blue. Only meaningful once there are stops; the desk has none today and the empty state must say so, per `ui.tsx:296` |

### Audit, `/admin/audit`

Data: `AuditPage { rows, full }` (`lib/admin/audit-queries.ts:61`),
`AuditRowView` (`:48`). The queue-frame note at `QueueFilters.tsx:18` records
that `audit_log` already holds 482 rows, which makes this the one desk with
enough history to chart honestly today.

| Chart | Form | Encoding |
|---|---|---|
| Actions per day | time series | Blue. The console's first genuinely populated chart |
| Actions by kind | horizontal bars | Sequential blue by magnitude |
| Actions by actor, top 10 | horizontal bars | Sequential blue |

### Examples, `/admin/examples`

Data: `ExamplesConsole` (`lib/admin/examples-queries.ts:61`), with
`isOverdue(retireAfter, today)` (`:103`) and `lagosToday()` (`:109`).

| Chart | Form | Encoding |
|---|---|---|
| Example listings by retirement date | vertical bars per week | Blue, with everything past `lagosToday()` in rose. The badge on the rail already counts overdue rows (`nav.ts:186`) |

## 4.4 Mixing the mockup with what exists

The reference the founder supplied is a dark glass operations console with a
left rail, top filter chips, a coloured-pill table, pagination and graphs.
Mapped onto the tree:

| Mockup element | Already built | Work |
|---|---|---|
| Dark glass shell | `app/css/admin.css:24` `.nf-admin` | none |
| Left navigation | `app/css/admin.css:33` `.nf-admin-rail`, banded at `nav.ts:67` | none |
| Filter chips across the top | `QueueFilters.tsx:246`, `.nf-admin-chip` `app/css/admin.css:428` | Translate "All" (`QueueFilters.tsx:258`) and the group label (`:252`) |
| Data table | `QueueTable.tsx:69`, `.nf-admin-table` `app/css/admin.css:513` | Translate the seven column heads (`QueueTable.tsx:84`) and "View" (`:116`) |
| Coloured status pills | `<StatusPill>` via `toneForStatus` (`QueueTable.tsx:4`) | none; this is already the single platform map |
| Pagination | `QueuePager` (`QueueFilters.tsx:310`) | none |
| **Analytics graphs** | nothing | Build `components/ui/charts/`, then add a charts band to each desk |

Suggested build order, smallest honest step first:

1. `components/ui/charts/TimeSeries.tsx` plus a client tooltip wrapper.
2. `/admin/audit`, because it is the only desk with real history (482 rows) and
   the chart will show something true on day one.
3. `components/ui/charts/StackedBars.tsx`, then the status composition bar on
   every queue desk, which is one component and eleven one-line call sites and
   is the single highest-value addition.
4. Move `components/agent/charts/*` into `components/ui/charts/` so the agent
   workspace and the console draw from one family. Note
   `AreaSparkline.tsx:52` hardcodes the gradient id `nf-spark-fill`, which
   collides if two sparklines render on one page; give it a `useId`.
5. The money and escrow charts, which are the ones an operator will actually
   open, once there is volume.
6. The overview trend, only if a `queue_snapshots` table is added. Not before.

---

# HONESTY LOG

Everything below is something this investigation could not establish and is
therefore stated rather than assumed away.

1. **There is no browser in this environment.** Not one rendered pixel was
   measured. `scripts/design/compare-surface.mjs --shape-sweep`, which
   `docs/DESIGN_DIRECTION.md:83` names as "the only check that can see this",
   was not run. Every ratio in Part 1 and Part 2 is computed from declared
   values, which is precisely the kind of proof `DESIGN_DIRECTION.md:86` warns
   is insufficient on its own: "A source grep proves what was written; it never
   proves what the browser drew." All of it should be re-checked on a running
   page before any fix is merged.

2. **Every text-width figure is an estimate.** Where this document says a label
   "is about 54px" it means: character count times an assumed average advance of
   roughly 0.55em at the stated size and weight for Inter. No font metrics were
   read and no text was laid out. The arithmetic that does NOT depend on text
   width (available box widths, column counts, padding sums, translate
   distances, radius ratios) is exact and is presented separately in each case.
   In particular, defects T2, T3 and T4 depend on a text-width estimate for
   their trigger; T1 does not and is exact.

3. **Defect T1 is the only Part 1 finding that is certainly visible in
   English.** The founder's report cannot be attributed with certainty. T1 is
   the most likely candidate on the evidence (phone-only, landing hero, English
   copy, a quarter of a control empty) but this was not confirmed against a
   screenshot.

4. **The cascade analysis in 1.7 assumes standard cascade-layer ordering.**
   `@layer components` from the stylesheets against Tailwind v4's utilities
   layer, with `settings-rows.css` imported before `css/controls.css` per
   `app/globals.css:25` and `:68`. This was reasoned from the import order and
   the layer declarations, not verified in devtools. If Tailwind v4's layer
   emission order differs from the assumption, the geometry of
   `components/ui/Switch.tsx` changes and 1.7 must be redone.

5. **`w-13` is assumed to resolve.** Tailwind v4's dynamic spacing scale should
   give `w-13` = 3.25rem = 52px. This was not confirmed against a built
   stylesheet. If it does not resolve, `components/ui/Switch.tsx:93` falls back
   to `settings-rows.css`'s 50px and the thumb's 1.125rem travel leaves a 2px
   asymmetry rather than a symmetric 4px.

6. **Both brand-guideline pages are blocked by this environment's egress
   proxy.** `developers.google.com/identity/branding-guidelines` and
   `developer.apple.com/design/human-interface-guidelines/sign-in-with-apple`
   both returned `EGRESS_BLOCKED`. Every brand quotation in Part 3.4 is taken
   from search-result summaries of those pages rather than from the pages
   themselves. The specific figures most at risk are: Google's 48dp minimum
   height (which the summary attributes to the Wallet button family, not
   necessarily to Sign in with Google), Google's 12 / 10 / 12 px padding, and
   Apple's 140 x 30pt minimum. **Re-verify all of Part 3.4 against the live
   pages before implementing.** The quoted sentences about not recolouring the G
   and about the corner radius being yours to match were consistent across
   multiple independent summaries and are the two the whole recommendation turns
   on.

7. **Bundle sizes in 4.2 are from 2026 comparison articles, not from a build.**
   No `npm install` and no bundle analysis was run against this tree. Recharts
   at ~150KB, Nivo at ~186KB, Chart.js at ~92KB and ECharts at ~100KB should be
   confirmed with `npx bundlejs` or an actual install before the decision is
   acted on. The recommendation does not depend on the exact figures, since it
   is to add nothing.

8. **The palette validation IS exact.** The numbers in 4.2 came from running
   the bundled validator against the stated surfaces, not from judgement. The
   finding that no four-slot categorical palette passes inside Vallo's colour
   law is a computed result over the candidates tested; it is not a proof that
   none exists, because the candidate space was not exhausted. Four candidates
   spanning the plausible range were tested and all four failed on the same two
   pairs (emerald against rose for CVD, blue against cyan for normal vision),
   which is strong but not conclusive.

9. **The admin metric proposals were checked against query return types, not
   against the database.** No SQL was run and no row was read. Where a chart
   needs a field, the field's existence was confirmed in the TypeScript type in
   `lib/admin/*-queries.ts`. Whether those tables hold enough rows for any given
   chart to be meaningful today is unknown, except for `audit_log`, which
   `app/admin/_components/QueueFilters.tsx:18` records as holding 482 rows, and
   the queues, which `app/admin/_components/ui.tsx:298` records as holding zero.

10. **Two caps are noted in the source and would make charts lie if ignored.**
    `RECENT_LIMIT = 60` in `lib/admin/money-queries.ts:81` and
    `SUMMARY_LIMIT = 2000` in `lib/admin/money-queries.ts:316`. Any chart built
    over those reads is truthful only within the cap and must say so on screen,
    the way `money-queries.ts:386` already says it in a comment.

11. **`app/(dev)/preview/**` and `app/(dev)/gallery/**` were excluded from the
    uniqueness findings** where the code is clearly a specimen harness, for
    example `app/(dev)/gallery/GalleryBoard.tsx:91`, which draws the pill radius
    deliberately as documentation of what it is for. `StatusPill shape="pill"`
    (U24) is listed because the prop is reachable from product code even though
    only the dev preview passes it today.

12. **The segmented-family count of eleven excludes the dev previews and the
    styleguide.** `app/(dev)/preview/g1/ControlsPreview.tsx:122` and `:136` use
    the canonical primitive.

13. **No count of `.nf-` selectors or CSS custom properties was verified.** The
    brief states 451 custom properties and 1,352 `.nf-` selectors. Those figures
    were taken on trust and not recounted, because nothing in this document
    depends on them.
