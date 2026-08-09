# Audit 04 — Type system, numerals, metrics, charts, data presentation

> **SUPERSEDED 2026-08-09. Not a backlog, and every count in it needs re-measuring.**
> This audit grades the codebase against `00-reference-brief.md`, which is retired
> because it produced the visual overload the platform is now removing. Read the
> banner at the top of that file before acting on anything here. The current
> design and navigation work is `RECOMMENDATIONS.md` sections 2 and 3.


Scope: font loading, type scale, numeric rendering, metric blocks, charts, currency,
section headers, truncation, i18n resilience.
Yardstick: `PREMIUM_REFERENCE_BRIEF.md` §4.

Verdict up front: **the platform has the *vocabulary* of a premium type system and almost
none of the *grammar*.** There is a token scale, a `.nf-numeric` tabular class, an
`.nf-hero-figure` two-tone primitive and an odometer — and then 768 hard-coded
`text-[x.xxxrem]` literals, one single use of the two-tone primitive, a wallet ledger that
isn't tabular, four charts total (three of which a real user never sees), and zero
mixed-emphasis prose. The scale exists as documentation, not as a constraint.

---

## 1. WHAT EXISTS

### 1.1 Fonts

`apps/web/src/app/layout.tsx:17-33`

```
Inter   — next/font/google, subsets ["latin","latin-ext"], variable axis, display:"swap"
Poppins — next/font/google, subsets ["latin","latin-ext"], weight ["500","600","700","800"], display:"swap"
```

Both are self-hosted by `next/font` (no external CDN, no render-blocking `<link>`),
exposed as CSS variables `--nf-font-inter` / `--nf-font-poppins` and consumed through
`packages/design-tokens/src/tokens.css:236-238`:

```
--nf-font-display: var(--nf-font-poppins), var(--nf-font-inter), ui-sans-serif, …
--nf-font-sans:    var(--nf-font-inter), ui-sans-serif, system-ui, …
--nf-font-numeric: var(--nf-font-inter), ui-sans-serif, system-ui, …
```

`tokens.css:274-277` switches the display stack to Inter entirely for `lang="yo"` and
`lang="ig"` because Poppins lacks the dotted vowels. That is a genuinely thoughtful
decision and is the single best piece of type engineering in the repo.

### 1.2 The token scale

`packages/design-tokens/src/tokens.css:245-260` — eleven size tokens
(`display, hero, h1, h2, h3, h4, body-lg, body, body-sm, caption, overline`) plus four
tracking tokens.

### 1.3 The realised classes

`apps/web/src/app/globals.css`:

| class | line | what it defines |
|---|---|---|
| `.nf-numeric` | 107-112 | `tabular-nums`, `"tnum" 1`, `letter-spacing:-0.02em` |
| `.nf-display` | 1270-1275 | size, `line-height:.98`, `700`, `-0.035em` |
| `.nf-h1` | 1277-1282 | size, `1.14`, `700`, `-0.02em` |
| `.nf-h2` | 1284-1289 | size, `1.22`, `600`, `-0.02em` |
| `.nf-h3` | 1291-1296 | size, `1.3`, `600`, `-0.02em` |
| `.nf-overline` | 1298-1304 | 11px, uppercase, `+0.14em`, `650`, muted |
| `.nf-label` | 1561-1567 | *form field* label, not a metric label |
| `.nf-hero-figure` / `__unit` | 1767-1783 | the two-tone primitive |
| `.nf-count-badge` | 1747-1760 | tabular count pill |

Usage counts: `nf-h1` 29, `nf-h2` 18, `nf-h3` 54, `nf-overline` 50, `nf-label` 29,
`nf-numeric` 103, `nf-display` **2**, `nf-hero-figure` **1**.

### 1.4 Money

- `packages/i18n/src/index.ts:48-61` `formatMoney(minorUnits, locale, currency, {compact})`
  — integer kobo in, `Intl.NumberFormat` `style:"currency"`, `maximumFractionDigits:0`.
  Correct, single-source, no floats. Locale tags `en-NG / yo-NG / ha-NG / ig-NG`
  (`index.ts:35-40`), all three resolve in Node ICU 78.
- `apps/web/src/components/app/wallet/money.ts:12-20` `formatKoboExact` — integer split,
  returns `{whole, kobo}`. Genuinely correct kobo handling.
- `apps/web/src/lib/payments/money.ts:13-18` `nairaExact` — server-copy twin.
- `apps/web/src/lib/wallet/actions.ts:87-91` — a **third** copy of the same function.

### 1.5 Charts

Four, all hand-rolled SVG, no library:

| component | file | features |
|---|---|---|
| `AreaSparkline` | `components/agent/charts/AreaSparkline.tsx` | gradient area fill, 2.5px stroke, end dot |
| `DonutChart` | `components/agent/charts/DonutChart.tsx` | segmented ring, centre value, colour legend with % |
| `StatChart` | `components/site/StatChart.tsx` | gradient polygon + polyline, `aria-hidden` |
| wallet sparkline | `components/app/wallet/BalanceCard.tsx:195-213` | inline polyline, drop-shadow glow |

### 1.6 Metric hierarchy that does work

- `app/admin/page.tsx:73-94` — icon+uppercase label → `text-[2rem]` value → muted lede. Correct three-part shape.
- `components/agent/StatCard.tsx:47-71` — muted 12px label → 20/22px value → coloured signed delta + muted "vs last month".
- `app/agent/earnings/EarningsWorkspace.tsx:26-47` `Tile` — icon → muted label → bold value.
- `components/app/wallet/BalanceCard.tsx:132-171` — the only real two-tone numeral (see §2.1).

### 1.7 Section headers with trailing action

`t.common.viewAll` appears 5 times: `agent/dashboard/page.tsx:150,274`,
`agent/dashboard/RealDashboard.tsx:146,181`, `(app)/home/page.tsx:137`.

---

## 2. GAPS VS THE REFERENCE STANDARD

### 2.1 Two-tone display numerals — essentially absent · **P0**

The reference calls this "one of the strongest premium tells in the whole reference set."
Across the entire platform there is **exactly one** two-tone numeral:

`components/app/wallet/BalanceCard.tsx:154-171`
```tsx
<span className="text-[2.25rem] font-bold leading-none tracking-tight sm:text-[2.6rem]">
  {"₦"}<Odometer value={wholeNaira} className="nf-odometer-figure" />
</span>
<span className="text-[1.25rem] font-semibold text-[var(--nf-content-secondary)] sm:text-[1.4rem]">
  {kobo}
</span>
```
This is correct in spirit (big naira / small secondary kobo) but: it is **not tabular**
(no `nf-numeric` on either span), the primary figure is tinted brand blue by
`nf-odometer-figure` (`globals.css:756-761`) rather than near-white, and the kobo uses
`--nf-content-secondary` rather than muted.

Everywhere else the "secondary part" is either the same size/weight or is a *word*, not a
numeric fragment:

| location | rendered | what the reference wants |
|---|---|---|
| `globals.css:1767-1783` `.nf-hero-figure` | primitive exists | — |
| `(app)/checkout/[bookingId]/page.tsx:178-181` | `₦190,000` + `in full` | its ONLY use, and the "unit" is prose |
| `(app)/listing/[id]/page.tsx:326-332` | `₦90,000,000` @ **1.5rem** + `per year` | this is the hero price of a property page. 24px. |
| `(app)/listing/[id]/ReservePanel.tsx:193-195` | 1.5rem flat | — |
| `(app)/listing/[id]/RentalPanel.tsx:38-41` | 1.5rem flat | — |
| `components/app/ListingCard.tsx:271-281` | `₦25,000` 19px + `/ night` 12px muted | value+word, currency+grouping all one weight |
| `components/app/bookings/BookingsTabs.tsx:82-87` | `₦190,000` + `total` | — |
| `components/agent/StatCard.tsx:50-52` | `value: string` prop — **cannot** two-tone | `85%` renders `%` at full weight |
| `app/agent/dashboard/page.tsx:108,115` | `` `${d.occupancyPct}%` `` | `%` should be muted |
| `app/agent/dashboard/page.tsx:249` | `{l.occupancyPct}%` | same |
| `(app)/checkout/[bookingId]/HoldCountdown.tsx:78` | `{left.h}h {pad(m)}m {pad(s)}s` | `h/m/s` at full weight and full size. This is the literal "/8hrs" case. |
| `components/site/landing/PlatformConsole.tsx:15-19,53` | `"36 + FCT"`, `"24/7"`, `"17+"` as single strings | `36`/`24`/`17` big, `+ FCT` / `/7` / `+` muted |
| `components/site/landing/NumbersBand.tsx:31-33` | `Odometer suffix="/7"` | `Odometer.tsx:94` renders suffix in a bare `<span>` — same size, same colour |
| `components/agent/charts/DonutChart.tsx:69-71` | `{count} ({pct}%)` | muted but same size — half-right |
| `components/app/listing/ListingReviews.tsx:45-52` | `4.8` 22px + `1,204 reviews` 14px | the `.8` should be the muted part |

**`Odometer` cannot two-tone at all**: `components/site/Odometer.tsx:94` emits
`{suffix && <span>{suffix}</span>}` with no class hook.

### 2.2 Tabular figures — the one ledger on the platform is not tabular · **P0**

`.nf-numeric` (`globals.css:107-112`) is applied 103 times, but the highest-value column
of digits in the product misses it:

- **`components/app/wallet/TransactionsSection.tsx:182-189`** — the right-aligned amount
  column of the wallet ledger. `+₦50,000.00 / -₦8,500.00` stacked in a divided list.
  No `nf-numeric`. Digits will visibly jitter row to row. This is the single worst
  offender in the codebase.
- `components/app/wallet/BalanceCard.tsx:181,189` — "In / Out, last 30 days" pair. Two
  numbers side by side in a 2-col grid, no `nf-numeric`.
- `components/app/wallet/BalanceCard.tsx:156-168` — the hero balance spans themselves.
- `components/app/wallet/WalletActions.tsx:246-254` — the amount `<input>` has
  `className="nf-field"` only, while `components/app/filters/FilterDrawer.tsx:383,403`
  correctly uses `nf-field nf-numeric`. Inconsistent.
- `app/agent/earnings/EarningsWorkspace.tsx:116` — `{t.monthGross} {formatMoney(...)}` in
  the phone card, no `nf-numeric`.
- `(app)/listing/[id]/ReservePanel.tsx:267` — `₦25,000 × 3 nights` line, no `nf-numeric`.
- `(app)/search/page.tsx:281,348`, `components/app/filters/FilterDrawer.tsx:347`,
  `(app)/listing/[id]/page.tsx:290` — result counts, no `nf-numeric`.

**Tables** (only two exist, both agent-side) *are* tabular:
`app/agent/dashboard/page.tsx:247-252`, `app/agent/earnings/EarningsWorkspace.tsx:137-141`.
Their `<th>` headers are not, but headers are words.

**`.nf-numeric` is defined outside `@layer components`** (line 107, before the
`@layer components {` at line 137). Unlayered rules beat every Tailwind utility layer.
Consequence: any `tracking-*` utility on an `.nf-numeric` element is **dead code**.
14 sites are affected; the one where it actually breaks intent is:

`app/agents/status/page.tsx:99`
```tsx
<p className="nf-numeric mt-1.5 text-[1.5rem] font-bold tracking-[0.04em] sm:text-[1.75rem]">
```
An application reference ID deliberately asks for **+0.04em** and silently renders at
**−0.02em**. IDs need positive tracking; this is backwards. The file's own comment at
`globals.css:129-136` proves the authors understand the layering rule — `.nf-numeric` just
never got moved.

Secondary: `.nf-numeric`'s blanket `letter-spacing:-0.02em` is applied to 10-11px
timestamps and badges (`components/app/messages/MessageThread.tsx:192,219` at
`text-[0.65rem]`; `components/app/assistant/AssistantSidebar.tsx:153` at 11px). Negative
tracking on 10px digits reduces legibility. Tracking should scale with size, not be one
constant welded to the tabular class.

### 2.3 Type scale — a scale exists, the product ignores it · **P0**

Measured across `apps/web/src` `.tsx`:

- **768** arbitrary `text-[…]` literals
- **35** distinct rem values
- **6** uses of `text-[var(--nf-text-…)]` (all `body-lg`, at `app/page.tsx:120,143,244` and
  `components/site/landing/SignatureShowcase.tsx:26,137`)

Top literals: `0.8125rem` ×236, `0.75rem` ×140, `0.875rem` ×121, `0.9375rem` ×88,
`0.6875rem` ×34. Note `0.8125rem` **is** `--nf-text-caption` and `0.875rem` **is**
`--nf-text-body` — the tokens are being retyped as magic numbers 357 times.

Off-scale one-offs that exist nowhere in the token file:
`0.78rem` ×14, `0.9rem` ×11, `0.9063rem` ×8, `0.8438rem` ×5, `0.72rem` ×5, `0.7rem` ×7,
`0.66rem` ×2, `0.68rem`, `0.5625rem`, `1.05rem` ×2, `1.15rem`, `1.4rem` ×3, `1.6rem`,
`1.7rem`, `1.8rem`, `2.1rem`, `2.6rem` ×2.

Dead tokens (defined, never referenced anywhere): `--nf-text-hero`, `--nf-text-h4`,
`--nf-text-body-sm` (which is byte-identical to `--nf-text-body` — `tokens.css:252-253`),
`--nf-tracking-normal`, `--nf-font-numeric` (0 usages).

**No role carries a full recipe.** Only `display/h1/h2/h3/overline` bundle
size+weight+line-height+tracking. There is no `.nf-title`, `.nf-headline`, `.nf-body`,
`.nf-caption`, `.nf-metric-label`, `.nf-metric-value`, `.nf-metric-unit`. `.nf-label`
(`globals.css:1561`) is a form-input label, so the "label" role name is already taken by
something else.

**Negative tracking on large sizes**: present and correct where the classes are used
(`-0.035em` display, `-0.02em` h1-h3). But the largest *numerals* on the platform are set
with ad-hoc `tracking-tight` utilities that `.nf-numeric` then overrides (§2.2), and the
2.25/2.6rem wallet balance gets `tracking-tight` = −0.025em rather than a display-grade
−0.03em/−0.035em.

### 2.4 Metric hierarchy — right shape, wrong magnitude · **P1**

The three-part shape is followed in `admin/page.tsx`, `StatCard.tsx`, `EarningsWorkspace`
`Tile` and `PlatformConsole`. What is missing is **scale contrast**:

| block | label | value | ratio |
|---|---|---|---|
| `components/agent/StatCard.tsx:47,50` | 12px | 20-22px | 1.7× |
| `app/agent/earnings/EarningsWorkspace.tsx:41,42` | 12px | 17-20px | 1.5× |
| `components/site/landing/PlatformConsole.tsx:49,55` | 12px | 22-25.6px | 1.9× |
| `components/app/account/ProfileIdentityCard.tsx:190-191` | 12px | `text-lg` 18px | 1.5× |
| `app/admin/page.tsx:76,85` | 12px | 32-36px | 2.7× ✅ |
| reference (health dashboard, crypto wallet) | ~11-12px | 48-64px | 4-5× |

A "hero metric" at 20px next to a 12px label is a *table cell*, not a hero. The only block
that reaches reference proportion is the admin overview tile.

Also: `StatCard`'s `value: string` signature (`StatCard.tsx:31`) structurally prevents ever
two-toning the unit. Any fix must change the prop shape.

### 2.5 Mixed-emphasis paragraphs — zero · **P1**

`<strong>` / `<b>` / `<em>` appear **13 times in the whole app**, all in
`app/(site)/privacy/page.tsx:49-137`, and all as a bolded lead-in noun ("**Account data.**
Your name, …") — the inverse of the pollen-advisory pattern, which bolds the *actionable
clause* mid-sentence and greys the connective words.

Every advisory string in the product is a flat single-colour paragraph. Representative:
- `components/app/wallet/BalanceCard.tsx:172-174` "Naira wallet. Every movement is recorded to the kobo."
- `(app)/checkout/[bookingId]/page.tsx:184-186` "RentMe adds nothing of its own to this total. Every naira goes to the stay."
- `components/app/wallet/TransactionsSection.tsx:138-142` empty-state copy
- `app/admin/_components/ui.tsx:129-131,147-149,170-172` all lede/body copy

The reference's tinted "Insights" card with a lightning icon and one emphasised sentence
has no analogue anywhere.

### 2.6 Fonts — payload waste and one real risk · **P1**

1. **Poppins ships two unused weights.** `layout.tsx:30` requests `["500","600","700","800"]`.
   Actual usage across the codebase: `600` (`.nf-h2`, `.nf-h3`) and `700`
   (`.nf-display`, `.nf-h1`, and `font-bold` at `NumbersBand.tsx:31` /
   `app/page.tsx:220`). **500 and 800 are never rendered.** With `subsets:["latin","latin-ext"]`
   that is 4 extra woff2 files preloaded on every page for nothing.
2. **No FOIT risk** — `display:"swap"` on both; `next/font` self-hosts and injects
   metric-adjusted fallbacks, so CLS is mitigated. Correct.
3. **FOUT does exist** on Poppins-set headings (Inter fallback → Poppins swap). Because
   `--nf-font-display` lists `var(--nf-font-inter)` second, the swap is Inter→Poppins,
   which is a wider-to-narrower jump on an `-0.035em` display headline — visible reflow on
   the landing hero. Cheap fix: preload only the weights actually used, and set
   `.nf-display` to `font-optical-sizing` / accept Inter as the display face on the hero.
4. **Editorial display quality is not matched.** Reference 11 and 14 use "editorial serif
   or tight sans display". Poppins is a geometric sans with a very large x-height and
   circular bowls — at `-0.035em` and `line-height:0.98` (`globals.css:1272-1274`) the
   round `o/e/a` will collide. Poppins is also *only* on headings; there is no display face
   for numerals at all (`--nf-font-numeric` is unused, `Odometer` and every price render in
   Inter). The references' huge numerals are the visual centre of the screen; here they are
   body-font-at-a-larger-size.
5. **The `[lang]` fallback is only half-applied.** `tokens.css:274-277` swaps display to
   Inter for `yo`/`ig`. Hausa (`ha`) keeps Poppins, but Hausa uses ɓ ɗ ƙ ƴ — those live in
   Latin Extended-B, which Poppins' `latin-ext` subset does carry, so this is defensible.
   Worth an explicit comment; right now the omission reads as an oversight.

### 2.7 Charts — bare, and the real user sees none · **P1**

Feature matrix against the reference (sparkline w/ dotted grid, HR line chart with labelled
axes and gradient fill, gradient bar columns, multi-arc gauge, four labelled mini progress
bars, seven ring badges):

| | gradient fill | grid lines | axis labels | hover/active | tooltip | semantic colour | animation |
|---|---|---|---|---|---|---|---|
| `AreaSparkline` | ✅ (`:49-52`) | ❌ | ❌ | ❌ | ❌ | single mode-blue | ❌ |
| `StatChart` | ✅ (`:41-45`) | ❌ | ❌ | ❌ | ❌ | brand/success only | ❌ |
| `DonutChart` | ❌ | n/a | ✅ legend | ❌ | ❌ | ✅ per-segment hue | ❌ |
| wallet spark | ❌ (stroke only) | ❌ | ❌ | ❌ | ❌ | hard-coded `rgb(56 189 248)` | ❌ |

Specific defects:
- **`components/app/wallet/BalanceCard.tsx:205`** hard-codes `stroke="rgb(56 189 248 / 0.9)"`
  and `drop-shadow(0 0 5px rgb(56 189 248 / 0.75))` — a raw colour, violating the repo's
  own token rule (`tokens.css:4-11`), and it has no gradient fill while its two siblings do.
  Three sparklines, three different recipes.
- **`components/agent/charts/AreaSparkline.tsx:49`** uses a **hard-coded gradient id**
  `"nf-spark-fill"`. Two sparklines on one page collide. `StatChart.tsx:30` at least keys
  the id by tone, but two `tone="brand"` charts still share one def.
- Both line charts use `preserveAspectRatio="none"`, so the curve is horizontally stretched
  and vertically squashed by whatever box it lands in — geometry is not shape-stable.
  `vectorEffect="non-scaling-stroke"` rescues the stroke width but not the curve.
- **No progress bars, meters or gauges exist at all.** `grep` for
  `role="progressbar"|aria-valuenow|nf-progress|nf-meter` returns zero across the repo.
  The reference's three gradient progress columns, four HR-zone bars, seven ring badges and
  multi-arc gauge have no counterpart.
- **A real agent's dashboard has no charts.** `app/agent/dashboard/page.tsx:31-48` routes a
  signed-in approved agent to `RealDashboard.tsx`, which imports neither `AreaSparkline` nor
  `DonutChart`. Both charts render **only** on the seeded/demo branch
  (`page.tsx:138,263`). `/agent/analytics` is an `AgentComingSoon` stub
  (`app/agent/analytics/page.tsx:10`). So the only charts a real user can reach are the
  wallet's undecorated polyline and the marketing `StatChart`, which is `aria-hidden` and
  explicitly documented as "an unlabeled ambient line rather than a claim"
  (`PlatformConsole.tsx:8-12`).

### 2.8 Currency — correct arithmetic, inconsistent presentation · **P1**

Good: every amount is integer kobo; `formatMoney` is the only divider
(`packages/i18n/src/index.ts:54`); `formatKoboExact` splits with integer maths; no float
touches money. There are **no raw-kobo or float artefacts** anywhere I could find.

Problems:

1. **The `₦` glyph is hard-coded in five places**, bypassing `Intl` currency placement:
   `components/app/wallet/BalanceCard.tsx:157,163`,
   `app/(app)/wallet/WalletDeck.tsx:492`,
   `components/app/wallet/WalletActions.tsx:267`,
   `app/(app)/wallet/WalletDeck.tsx:470`.
   Verified against Node ICU 78: `ha-NG` renders `"₦ 9,000,000"` **with a space**, while
   `en/yo/ig-NG` render `"₦9,000,000"`. So in Hausa the wallet hero shows `₦258,450` and
   the ledger row directly beneath it shows `₦ 258,450`. Same screen, two spacings.
2. **`Odometer` formats with the browser's default locale.** `components/site/Odometer.tsx:32`:
   ```js
   const formatted = Math.max(0, Math.round(value)).toLocaleString();
   ```
   No locale argument. This is a `"use client"` component that Next still SSRs, so the
   server (`en-US` default in most deploys) and a browser set to `de-DE` produce
   `1,234,567` vs `1.234.567` — a hydration mismatch **and** grouping that disagrees with
   the `formatMoney` output sitting beside it. It is the wallet balance and the landing
   numbers band.
3. **Quick-amount chips are hard-coded English-grouped strings.**
   `components/app/wallet/WalletActions.tsx:230`: `const QUICK_AMOUNTS = ["5,000","20,000","50,000"]`,
   rendered as `₦{a}` at `:267`. Never passes through `formatMoney`.
4. **Compact and standard notation collide on one screen.**
   `app/agent/dashboard/page.tsx:87` renders total earnings as
   `formatMoney(d.totalEarningsMinor, locale, "NGN", {compact:true})` → `₦9M`,
   and `:130` renders **the same value** as `formatMoney(d.totalEarningsMinor, locale)` →
   `₦9,000,000`. Two representations of one number, ~200px apart.
5. **`nairaExact` is triplicated**: `lib/payments/money.ts:13`, `lib/wallet/actions.ts:87`,
   `lib/email/render.ts:74`. Plus `components/app/wallet/money.ts:12` as a fourth variant
   returning a tuple. Four implementations of "naira to the kobo".
6. **A money value is set to truncate.** `app/agent/earnings/EarningsWorkspace.tsx:42`:
   ```tsx
   <p className="nf-numeric mt-0.5 truncate text-[1.0625rem] font-bold …">{value}</p>
   ```
   In a `grid-cols-2` on a 390px phone this box is ~150px. `₦12,500,000` at 17px bold does
   not fit — the host's total earnings will render as `₦12,500,0…`. Truncating money is
   never acceptable.
7. **`rating.toFixed(1)`** at `components/app/ListingCard.tsx:241`,
   `components/app/listing/ListingReviews.tsx:47`, `(app)/listing/[id]/page.tsx:225` —
   raw JS decimal, bypasses `Intl`. Cosmetically fine for `-NG` tags today but it is an
   un-localised number.
8. **Raw counts bypass `formatNumber`**: `EarningsWorkspace.tsx:95` `String(earnings.settledStays)`,
   `agent/dashboard/page.tsx:218,248` `{l.bookings}`, `app/admin/page.tsx:54,90`,
   `components/app/ListingCard.tsx:243` `({listing.reviewCount})`. No grouping above 999.

### 2.9 Section headers — the pattern exists 5 times · **P2**

`t.common.viewAll` at `agent/dashboard/page.tsx:150,274`,
`RealDashboard.tsx:146,181`, `(app)/home/page.tsx:137`. Rendered as a 13px semibold
`--nf-electric-300` link — correct, though the reference's version is *muted grey*, not
brand-coloured.

Sections that carry a heading and **no** trailing action, where one belongs:
- `(app)/home/page.tsx:187` "Top experiences" (`nf-h2`, no action)
- `components/app/wallet/TransactionsSection.tsx:100` "Transactions" — has filter chips instead, no "See all"
- `agent/earnings/EarningsWorkspace.tsx:100` "By month", `:148` "How this works"
- `app/agent/dashboard/page.tsx:190` "Listing performance", `:262` "Booking sources", `:304` "Quick actions"
- `app/admin/page.tsx:102` "How this works"
- `components/app/listing/ListingReviews.tsx` — reviews block has no "See all reviews"

`t.common.seeAll` exists in all four locale files and is referenced **0 times**. Dead key.

### 2.10 Truncation and wrapping — one `line-clamp` in the entire app · **P0**

```
grep -rn "line-clamp" apps/web/src  →  1 hit
  components/app/listing/ListingAbout.tsx:30
```

Everything else uses single-line `truncate` (38 files). Concrete breakages:

- **`components/app/ListingCard.tsx:234-236`** — the listing title `<h3>` has *neither*
  `truncate` nor `line-clamp`. A long Nigerian listing title
  ("Fully Serviced 3 Bedroom Terrace Duplex with BQ, Chevron Drive, Lekki Phase 1") wraps
  to 3-4 lines and every card in that grid row grows with it. In a `grid` this desynchronises
  the price baseline across the row. Needs `line-clamp-2`.
- **`components/app/bookings/BookingsTabs.tsx:51-53`** — booking title `truncate`d to one
  line. A booking card is 5.75rem tall with room for two; one-line truncation throws away
  information for no reason.
- **`app/agent/dashboard/page.tsx:246`** — `<td className="py-2.5 font-medium">{l.title}</td>`
  in a `min-w-[34rem]` table with no width constraint and no truncation. A long title blows
  the column and forces horizontal scroll on desktop.
- **`app/agent/earnings/EarningsWorkspace.tsx:42`** — money truncation (see §2.8.6).
- **`components/app/wallet/TransactionsSection.tsx:178-180`** —
  `{KIND_LABEL[kind]} · {entry.reference}` single-line truncated. The payment reference is
  the one string a user needs to copy into a support ticket, and it is the part that gets cut.
- **No `overflow-wrap: anywhere` / `hyphens` anywhere in `globals.css`.** A long unbroken
  token (a reference, a URL in a message, an email address in `DetailRow`) will overflow.
  `admin/_components/ui.tsx:184` uses `break-words`, which is the only defence and only there.
- **No `text-wrap: balance`** on any headline, and **no `text-wrap: pretty`** on any body
  copy. Every `.nf-display` / `.nf-h1` will produce orphans.

### 2.11 i18n — the type system is not stress-tested · **P1**

Measured over all 898 leaf strings in `packages/i18n/src/locales/*`. Worst inflation on
short strings (the ones that sit in fixed-ish chrome):

| en | worst locale | ratio | key | where it renders |
|---|---|---|---|---|
| `"vs last month"` (13) | `ha` `"idan aka kwatanta da watan da ya gabata"` (39) | **3.00×** | `agent.dashboard.lastMonth` | `StatCard.tsx:70`, in a 2-col phone grid |
| `"Rent"` (4) | `ig` `"Mgbazinye ụlọ"` (13) | 3.25× | `nav.rent` | `ListingCard.tsx:221` badge; desktop rail |
| `"Gym"` (3) | `ha` `"Wurin motsa jiki"` (16) | 5.33× | amenity chip | filter chips |
| `"On"` / `"Off"` | `ig` `"Ọ gbanyere"` / `"Ọ gbanyụrụ"` | 5.0× / 3.33× | `admin.switches.*` | toggle labels |
| `"Saved"` (5) | `yo` `"Tí a fipamọ́"` (12) | 2.40× | `nav.saved` | rail |
| `"Profile"` (7) | `ha` `"Bayanan martaba"` (15) | 2.14× | `nav.profile` | rail |
| `"Live"` (4) | `ig` `"Na-arụ ọrụ"` (10) | 2.50× | status chip | `nf-badge` |
| `"Draft"` (5) | `ig` `"Akwụkwọ mbụ"` (11) | 2.20× | status chip | `nf-badge` |
| `"Open reports"` (12) | `yo` `"Ìròyìn ẹ̀sùn tí ó ṣí sílẹ̀"` (26) | 2.17× | `admin.overview.tiles.reports.label` | `admin/page.tsx:76` |

Concrete overflow risks:

1. **`components/agent/StatCard.tsx:53-71`.** The component's own doc comment
   (`StatCard.tsx:11-18`) documents that the English delta already wrapped and collided.
   The Hausa string is **3× longer**. In a `grid-cols-2` phone layout beside a 44px icon,
   `+12% idan aka kwatanta da watan da ya gabata` at 12px will wrap to three lines and
   unbalance every tile in the row. The `flex-wrap` at `:53` prevents overlap but not the
   ragged height.
2. **`app/admin/page.tsx:76-78`** — `text-[0.75rem] font-semibold uppercase tracking-wide`
   with no wrap control, sharing a flex row with a `nf-tag-pill`. Yoruba `"Ìròyìn ẹ̀sùn tí
   ó ṣí sílẹ̀"` uppercased at +tracking in a `grid-cols-2` tile will push the pill off.
   Uppercase + `tracking-wide` is the worst possible treatment for a 2.2× string.
3. **`.nf-overline`** (`globals.css:1298-1304`) forces `uppercase` + `letter-spacing:0.14em`
   on 11px text, used 50 times. Yoruba tone marks (`ọ̀`, `ẹ̀`, `ṣ`) render poorly uppercased
   and the +0.14em compounds the length. `text-transform:uppercase` on Yoruba is
   typographically wrong regardless of width.
4. **`components/app/ListingCard.tsx:220-223`** — four `nf-badge` pills
   (Verified / Partner / Rent / Instant) in a single non-wrapping `flex gap-1.5` absolutely
   positioned at `left-3 top-3`. With Igbo `"Mgbazinye ụlọ"` + Igbo `"Tí fọwọ́sí"`-class
   strings, this row exceeds the card width and clips.
5. **Fixed-width numeric boxes**: `components/app/filters/FilterDrawer.tsx:140`
   (`w-14`), `(app)/listing/[id]/ReservePanel.tsx:68` (`w-5`),
   `components/agent/ApplyWizard.tsx:210` (`h-8 w-8`). These hold digits only, so they are
   safe — but `w-5` breaks at guest count ≥ 10.
6. **Mitigating**: the mobile tab bar is icon-only (`MobileTabBar.tsx:44-56`, labels via
   `aria-label`), so the single worst i18n surface in most apps is immune here.

### 2.12 Muted text fails WCAG AA in the light theme · **P0 (App Store)**

`tokens.css:304` sets `--nf-content-muted: #7A8189` for `[data-theme="light"]`.

```
#7A8189 on #FFFFFF (surface-primary) → 3.94 : 1
#7A8189 on #F4F5F7 (surface-canvas)  → 3.61 : 1
```

WCAG AA for normal text is **4.5:1**. `--nf-content-muted` is used **290 times** in
`.tsx`, and **30 of those** pair it with `text-[0.6…rem]` (10-11px). Every metric label,
every unit, every caption, every table header and the entire `.nf-overline` role
(`globals.css:1303`) fails AA on paper. The brief's §8 requires "Contrast passes WCAG AA in
both themes."

Dark theme is fine: `#8E9CC4` on `#000020` = 7.55:1; `--nf-content-secondary` `#D5DEFF` =
15.40:1; `--nf-electric-300` `#5C7CFF` = 5.66:1.

Recommended: `--nf-content-muted` light → `#5F666E` (≈6.0:1 on white, ≈5.5:1 on canvas).

---

## 3. SEVERITY SUMMARY

| # | Finding | Severity |
|---|---|---|
| 1 | Two-tone numerals exist once (wallet); the primitive is used once (checkout) | P0 |
| 2 | Wallet ledger amount column is not tabular | P0 |
| 3 | `.nf-numeric` unlayered → 14 dead `tracking-*` utilities, 1 inverted | P0 |
| 4 | 768 arbitrary text sizes / 35 values vs an 11-token scale used 6 times | P0 |
| 5 | One `line-clamp` in the app; `ListingCard` title unclamped | P0 |
| 6 | Light-theme `--nf-content-muted` = 3.94:1, fails AA, 290 usages | P0 |
| 7 | Metric label→value ratio 1.5-1.9× vs reference 4-5× | P1 |
| 8 | Zero mixed-emphasis paragraphs in product copy | P1 |
| 9 | Charts have no grid, axes, hover or tooltip; no progress/gauge exists | P1 |
| 10 | Real agents see zero charts (charts are on the demo branch only) | P1 |
| 11 | `Odometer` uses `toLocaleString()` with no locale — hydration + grouping | P1 |
| 12 | `₦` hard-coded in 5 places; `ha-NG` spacing disagrees with the ledger | P1 |
| 13 | Compact `₦9M` and standard `₦9,000,000` for the same value on one screen | P1 |
| 14 | Money value set to `truncate` in `EarningsWorkspace` Tile | P1 |
| 15 | Hausa `"vs last month"` is 3× English, in a tile that already collided | P1 |
| 16 | `.nf-overline` uppercases Yoruba/Igbo with +0.14em, 50 sites | P1 |
| 17 | Poppins loads unused weights 500 and 800 (4 extra preloaded files) | P1 |
| 18 | No display face for numerals; `--nf-font-numeric` unused | P1 |
| 19 | `AreaSparkline` hard-codes gradient id `nf-spark-fill` (collision) | P1 |
| 20 | Wallet sparkline hard-codes `rgb(56 189 248)` (token violation) | P1 |
| 21 | `nairaExact` triplicated + a fourth variant | P2 |
| 22 | `t.common.seeAll` defined in 4 locales, referenced 0 times | P2 |
| 23 | Dead tokens: `--nf-text-hero`, `-h4`, `-body-sm`, `--nf-tracking-normal` | P2 |
| 24 | `.nf-numeric` forces −0.02em onto 10px timestamps and badges | P2 |
| 25 | Raw counts bypass `formatNumber` in ≥6 places | P2 |
| 26 | `rating.toFixed(1)` un-localised in 3 places | P2 |
| 27 | Wallet quick-amount chips are hard-coded `"5,000"` strings | P2 |
| 28 | No `text-wrap: balance/pretty`, no `overflow-wrap` fallback | P2 |
| 29 | `preserveAspectRatio="none"` distorts both line charts | P2 |
| 30 | Two tables' `<th>` lack tabular; wallet amount input lacks `nf-numeric` | P2 |
| 31 | Section-header trailing action used 5×; ~10 sections that want one lack it | P2 |
| 32 | "View all" link is brand-blue, reference uses muted grey | P2 |

**Total: 32 findings — 6 P0, 14 P1, 12 P2.**

---

## 4. CONCRETE UPGRADE RECOMMENDATIONS

### 4.1 Move `.nf-numeric` into `@layer components` and split the tracking

`globals.css` — relocate lines 107-112 inside the `@layer components` block and drop the
blanket letter-spacing:

```css
@layer components {
  .nf-numeric {
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: "tnum" 1, "lnum" 1, "ss01" 1; /* ss01: Inter's disambiguated 1/l */
  }
  /* Tracking becomes a size-aware modifier, not a side effect. */
  .nf-numeric--display { letter-spacing: -0.035em; }
  .nf-numeric--tight   { letter-spacing: -0.02em; }
  .nf-numeric--id      { letter-spacing: 0.06em; }   /* reference codes, OTPs */
}
```
Then `app/agents/status/page.tsx:99` becomes `nf-numeric nf-numeric--id` and actually
renders the tracking it asks for.

### 4.2 Complete the type scale as *roles with recipes*

Add to `tokens.css` (replacing the size-only tokens):

```css
:root {
  --nf-type-display:  700 clamp(1.95rem,1.1rem + 4vw,4.6rem)/0.98  var(--nf-font-display);
  --nf-type-title:    700 clamp(1.45rem,1.1rem + 1.7vw,2.5rem)/1.14 var(--nf-font-display);
  --nf-type-headline: 600 1.125rem/1.3   var(--nf-font-sans);
  --nf-type-body:     400 0.9375rem/1.55 var(--nf-font-sans);
  --nf-type-callout:  400 0.875rem/1.5   var(--nf-font-sans);
  --nf-type-caption:  400 0.8125rem/1.45 var(--nf-font-sans);
  --nf-type-footnote: 500 0.75rem/1.4    var(--nf-font-sans);
  --nf-type-overline: 650 0.6875rem/1.2  var(--nf-font-sans);
}
```
Then delete `--nf-text-hero`, `--nf-text-h4`, `--nf-text-body-sm`, `--nf-tracking-normal`,
and codemod the 357 occurrences of `text-[0.8125rem]` / `text-[0.875rem]` to
`.nf-caption` / `.nf-callout`. Add an ESLint rule banning `text-[` with a rem literal in
`.tsx` so the scale stays a constraint.

### 4.3 The `<Amount>` primitive — ship this

New file `apps/web/src/design-system/type/Amount.tsx`. This is the component the reference
is asking for: it takes **integer kobo**, never a string, splits the whole from the
fraction, and renders the fraction (and any suffix) muted, smaller and baseline-aligned.

```tsx
import { formatMoney, type Locale } from "@naijafinds/i18n";

type AmountSize = "display" | "hero" | "title" | "body" | "caption";

/**
 * Two-tone money.
 *
 * Integer minor units in, never a pre-formatted string, so the split between the
 * primary figure and the secondary fraction is done once here rather than at
 * fourteen call sites. The primary figure carries the weight; the kobo, the
 * currency symbol's optical size and any trailing unit are muted and smaller,
 * which is the single strongest premium tell in the reference set.
 *
 * `kobo="auto"` shows the fraction only when it is non-zero, so ₦25,000 stays
 * clean on a listing card while ₦258,450.75 stays exact in the wallet.
 */
const SIZES: Record<AmountSize, { primary: string; secondary: string; track: string }> = {
  display: { primary: "clamp(2.75rem,11vw,4.25rem)", secondary: "0.34em", track: "-0.035em" },
  hero:    { primary: "clamp(2rem,7vw,2.75rem)",     secondary: "0.38em", track: "-0.03em"  },
  title:   { primary: "1.5rem",                      secondary: "0.44em", track: "-0.02em"  },
  body:    { primary: "1.0625rem",                   secondary: "0.72em", track: "-0.01em"  },
  caption: { primary: "0.875rem",                    secondary: "0.85em", track: "0"        },
};

export function Amount({
  minor,
  locale,
  currency = "NGN",
  size = "title",
  kobo = "auto",
  unit,
  sign,
  tone = "primary",
  className,
}: {
  minor: number;
  locale: Locale;
  currency?: string;
  size?: AmountSize;
  /** "auto" hides .00, "always" pins two digits, "never" drops the fraction. */
  kobo?: "auto" | "always" | "never";
  /** Trailing muted unit: "/ night", "total", "per year". */
  unit?: string;
  /** Renders a leading + / − for ledger rows. */
  sign?: "auto" | "none";
  tone?: "primary" | "success" | "danger";
  className?: string;
}) {
  const s = SIZES[size];
  const negative = minor < 0;
  const abs = Math.abs(Math.trunc(minor));
  const fraction = abs % 100;
  const whole = formatMoney(abs - fraction, locale, currency);
  const showFraction = kobo === "always" || (kobo === "auto" && fraction !== 0);
  const colour =
    tone === "success" ? "var(--nf-state-success)"
    : tone === "danger" ? "var(--nf-state-error)"
    : "var(--nf-content-primary)";

  return (
    <span
      className={`nf-numeric inline-flex items-baseline ${className ?? ""}`}
      style={{ fontSize: s.primary, letterSpacing: s.track, lineHeight: 1, color: colour }}
    >
      {/* One accessible reading of the whole figure; the visual parts are hidden. */}
      <span className="sr-only">
        {negative ? "minus " : ""}{whole}{showFraction ? `.${String(fraction).padStart(2, "0")}` : ""}
        {unit ? ` ${unit}` : ""}
      </span>

      <span aria-hidden="true" className="inline-flex items-baseline">
        {sign !== "none" && negative && <span style={{ fontWeight: 700 }}>−</span>}
        {sign === "auto" && !negative && <span style={{ fontWeight: 700 }}>+</span>}
        <span style={{ fontWeight: 700 }}>{whole}</span>
        {showFraction && (
          <span
            style={{
              fontSize: s.secondary,
              fontWeight: 600,
              color: "var(--nf-content-muted)",
              marginLeft: "0.04em",
            }}
          >
            .{String(fraction).padStart(2, "0")}
          </span>
        )}
        {unit && (
          <span
            style={{
              fontSize: s.secondary,
              fontWeight: 500,
              color: "var(--nf-content-muted)",
              marginLeft: "0.28em",
            }}
          >
            {unit}
          </span>
        )}
      </span>
    </span>
  );
}
```

Call sites this immediately replaces:
`ListingCard.tsx:271-281`, `(app)/listing/[id]/page.tsx:326-332` and `:439-448`,
`ReservePanel.tsx:192-196`, `RentalPanel.tsx:37-42`, `ListingStickyBar.tsx:70-81`,
`BookingsTabs.tsx:82-87`, `MyBookings.tsx:99`, `FeaturedCarousel.tsx:103-107`,
`MapDock.tsx:195-199`, `TransactionsSection.tsx:182-189` (with `sign="auto"`,
`tone={credit?"success":"primary"}`, `kobo="always"`), `BalanceCard.tsx:154-171`
(`size="display"`, `kobo="always"`), `WalletDeck.tsx:480-496`,
`EarningsWorkspace.tsx:93-96,111,138-141`, `checkout/[bookingId]/page.tsx:178-181`.

### 4.4 The `<Metric>` primitive — label → value → unit

New file `apps/web/src/design-system/type/Metric.tsx`. Enforces the reference's
small-grey-label → huge-value → small-grey-unit shape and, critically, accepts the value
**pre-split** so a `%`, an `of 300` or a `/8hrs` can never be welded into the value string
the way `StatCard`'s `value: string` forces today.

```tsx
import type { ReactNode } from "react";

const SCALE = {
  sm: { label: "0.6875rem", value: "1.375rem", unit: "0.75rem" },
  md: { label: "0.75rem",   value: "2rem",     unit: "0.875rem" },
  lg: { label: "0.75rem",   value: "3rem",     unit: "1rem" },
  xl: { label: "0.8125rem", value: "clamp(2.75rem,11vw,4.25rem)", unit: "1.125rem" },
} as const;

/**
 * A metric is three things, never one.
 *
 * The label says what is being counted, the value is the only thing at display
 * size, and the unit is a muted rider on the value's baseline. Splitting the
 * unit out of the value is the whole point: "85%" as one string can never be
 * two-toned, and "85" + "%" always can.
 */
export function Metric({
  label,
  value,
  unit,
  delta,
  size = "md",
  align = "start",
  icon,
}: {
  label: string;
  /** The figure alone. No units, no percent sign, no "of 300". */
  value: ReactNode;
  /** The muted rider: "%", "/ night", "of 300", "hrs". */
  unit?: string;
  delta?: { pct: number; label: string };
  size?: keyof typeof SCALE;
  align?: "start" | "center" | "end";
  icon?: ReactNode;
}) {
  const s = SCALE[size];
  const up = (delta?.pct ?? 0) >= 0;
  return (
    <div className={`flex min-w-0 flex-col ${align === "center" ? "items-center text-center" : align === "end" ? "items-end text-right" : "items-start"}`}>
      <span className="flex items-center gap-1.5">
        {icon}
        <span
          className="font-medium leading-snug text-[var(--nf-content-muted)]"
          style={{ fontSize: s.label }}
        >
          {label}
        </span>
      </span>

      <span className="nf-numeric mt-1 inline-flex items-baseline gap-[0.14em]">
        <span
          className="font-bold text-[var(--nf-content-primary)]"
          style={{ fontSize: s.value, lineHeight: 1, letterSpacing: "-0.03em" }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="font-semibold text-[var(--nf-content-muted)]"
            style={{ fontSize: s.unit, lineHeight: 1 }}
          >
            {unit}
          </span>
        )}
      </span>

      {delta && (
        /* The delta wraps to its own line by design: "vs last month" is 39
           characters in Hausa and will not share a row on a 390px phone. */
        <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[0.75rem] leading-snug">
          <span
            className="nf-numeric font-semibold"
            style={{ color: up ? "var(--nf-state-success)" : "var(--nf-state-error)" }}
          >
            {up ? "+" : ""}{delta.pct}%
          </span>
          <span className="text-[var(--nf-content-muted)]">{delta.label}</span>
        </span>
      )}
    </div>
  );
}
```

`StatCard.tsx` then becomes a card wrapper around `<Metric>`, and
`agent/dashboard/page.tsx:105-119` passes `value={d.occupancyPct} unit="%"` instead of
`` value={`${d.occupancyPct}%`} ``.

Apply `<Metric size="lg">` to `admin/page.tsx:73-94`, `<Metric size="xl">` to the wallet
hero, `<Metric size="sm">` to `ProfileIdentityCard.tsx:187-193` and `DonutChart` legend.

### 4.5 Fix the `Odometer` contract

`components/site/Odometer.tsx`:
- take a `locale: Locale` prop and use `formatNumber(value, locale)` instead of
  `toLocaleString()` at `:32` — kills the hydration mismatch and aligns grouping with
  `formatMoney`;
- give the suffix a class hook so `"/7"` and `"+"` can be muted:
  `{suffix && <span className="nf-odometer__suffix">{suffix}</span>}` with
  `.nf-odometer__suffix { font-size: 0.44em; font-weight: 600; color: var(--nf-content-muted); }`.

That alone converts `NumbersBand.tsx` (`24/7`, `17+`) and `PlatformConsole.tsx`
(`36 + FCT`, `24/7`, `17+`) to the reference's two-tone treatment.

### 4.6 Charts

- Extract a shared `<Chart>` shell that owns: a `useId()`-derived gradient id (fixes
  `AreaSparkline.tsx:49`), dotted horizontal grid lines at 0/50/100% via
  `stroke-dasharray="2 4"` on `--nf-border-subtle`, min/max/last value labels on the y-axis
  and first/last labels on the x-axis, and a `preserveAspectRatio="xMidYMid meet"` default.
- Add a hover layer: an invisible `<rect>` per data column, a vertical rule + focus dot on
  `pointerenter`, and a small glass tooltip. Keyboard: `role="img"` today is fine, but the
  hover layer should be an `<ol>` of visually-hidden `<li>` values for screen readers.
- Replace the wallet's bespoke polyline (`BalanceCard.tsx:195-213`) with `<StatChart>` so
  there is one sparkline recipe, and delete the hard-coded `rgb(56 189 248)`.
- Build the two primitives the reference has and this app lacks: `<MeterBar>` (labelled
  mini progress bar, semantic colour, percentage riding on the fill) and `<ArcGauge>`
  (multi-arc radial). Use `<MeterBar>` for occupancy/response rate — those are currently
  bare percentages that would read far better as bars.
- Wire `AreaSparkline` and `DonutChart` into `RealDashboard.tsx` so a real agent sees
  charts, or build `/agent/analytics` for real. Right now the polished charts exist only on
  the seeded demo path.

### 4.7 Truncation policy

Add to `globals.css` and apply by role:

```css
@layer components {
  .nf-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
  .nf-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .nf-clamp-3 { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  /* Long unbroken tokens (references, URLs, emails) never overflow their box. */
  .nf-wrap-anywhere { overflow-wrap:anywhere; }
}
h1, h2, .nf-display, .nf-h1, .nf-h2 { text-wrap: balance; }
p, .nf-body { text-wrap: pretty; }
```

Then: `ListingCard.tsx:234` → `nf-clamp-2`; `BookingsTabs.tsx:51` → `nf-clamp-2`;
`TransactionsSection.tsx:178` → `nf-wrap-anywhere` (never truncate a payment reference);
`EarningsWorkspace.tsx:42` → drop `truncate`, allow the tile to grow;
`agent/dashboard/page.tsx:246` → `max-w-[16rem] nf-clamp-1`.

**Rule to adopt: money and reference codes are never truncated. Titles are clamped, not
truncated.**

### 4.8 Currency and font hygiene

- Delete the hard-coded `₦` at `BalanceCard.tsx:157,163`, `WalletDeck.tsx:470,492`,
  `WalletActions.tsx:267`; route everything through `<Amount>` / `formatMoney`.
- Collapse the four `nairaExact`/`formatKoboExact` implementations into one exported from
  `packages/i18n` — it is the same integer split in all four.
- Pick one notation per screen: `agent/dashboard/page.tsx:87` and `:130` must not disagree.
  Suggest compact only in dense table cells and never in a hero.
- `layout.tsx:30` → `weight: ["600","700"]`. Removes 4 preloaded woff2 files.
- Set `--nf-font-numeric` to a real numeric-optimised stack and apply it in `.nf-numeric`,
  or delete the token. Right now it is a promise the code never keeps.
- `tokens.css:304` → `--nf-content-muted: #5F666E` for the light theme (6.0:1 on white).
- Add `t.common.seeAll` to the ~10 section headers listed in §2.9, rendered in
  `--nf-content-muted`, not brand blue.
