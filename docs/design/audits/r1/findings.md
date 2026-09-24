# R1 VISUAL AUDIT — 19 September 2026

> The screenshots this file cites under `docs/design/proofs/` were removed from the tree; they are in git history at `77cf90ad`.

_Transcribed by the lead. R1 could not write files, so this is its report verbatim from the line below._
---

**Section 0 in one line:** no em dashes, British spelling, kobo bigint money through `formatMoney`, no platform fees, `ActionResult` and `resolveSession()`, `BrandIcon` and `UiIcon` only with tiers never mixed, 390 dark first then wide then light, dark default with a designed paper twin, one blue family with emerald/rose/cyan and never a warm hue, no raw colours or spacing and no disabled lint rules, motion is physics with reduced-motion completeness, escrow promised nowhere, the verified badge only ever means a checked human and partner stock is labelled, none of the banned words and colour never the only signal, the brand is Vallo and VALLO SPACES LTD is legal only, no dark patterns, no personal data in logs or reports, secrets in the environment, never claim done unless it is true and report what was not done, the ONE LAW decides done, and the standard is "would a funded design team have shipped this and would someone screenshot it".

---

## 0. How to read the evidence, and three caveats that are load bearing

**Shots are of two vintages.** Files under `scripts/.shots/` dated 16:03 to 16:05 are mine. Files under `docs/design/proofs/**` are the building agents' own, dated 18 Sept 22:20 to 19 Sept 14:57. Where a proof is stale against the current tree I say so and I do **not** report the stale state as a finding. The clearest case, and it matters: every f2 landing proof on disk still shows a four-segment **Buy / Rent / Stay / Invest** pill. The current source has three (`SearchPill.tsx`, `ORDER = ["buy","rent","stay"]`) and my 16:03 shot of `/` confirms three segments and an overline reading PROPERTY / STAYS / RESTAURANTS / MANAGE. **The content truth sweep landed. The proofs on disk had not caught up.** Likewise `docs/design/proofs/lead/*` are from 18 Sept 22:20, which is before the whole token change, so I re-shot the drawer and did not report the dock or the flip from those files without saying so.

**The harness paints no `backdrop-filter`** (F6 fault 1, `docs/design/proofs/f6/INDEX.md`). Frosted surfaces read flatter in every screenshot on this machine than in a browser. This does **not** soften the container findings below: those are `background-color`, `border-color` and `box-shadow`, which the harness renders faithfully, and the biggest one is confirmed straight from the token source rather than from a picture.

**What I could not finish.** The box sat at load average 84 to 179 on four cores for most of this audit; one route took 1,125 s to compile and two shot batches died at `page.goto`. I could not re-shoot the **light** twins of settings, profile, admin queue and stays after the 14:27 token change, nor the dock and the flip. Those are marked **RE-VERIFY** and I have said what they rest on instead.

---

## 1. VERDICT PER SURFACE

| Surface | Governing image | Shot | % | One line |
| --- | --- | --- | --- | --- |
| Home, 390 | `founder/GOVERNING-home-markets-target.png` | `scripts/.shots/preview-f1-home-dark.png` | **86** | The closest surface in the product: the 3x3 market grid, the lit location well, the brand-filled search submit and the invest band all land, and the icon plates here are genuinely lit navy. Loses points for the missing EXPLORE MARKETS title block, a bank glyph on Villas and a crane on Offices, and copy over the villa in the invest band. |
| Sign-in, dark | `55A56F21` | `docs/design/proofs/f1/sign-in-390-dark.png` | **88** | Reads as the render. |
| Assistant | `BF49B814` | `docs/design/proofs/f1/assistant-390-dark.png` | **78** | Anatomy is right; a starter chip is cut mid-word, the two-up card rail escapes both gutters, one figure prints without its naira mark. |
| Landing desktop hero | `GOVERNING-landing-desktop-hero.png` | `docs/design/proofs/f2/landing-desktop-hero.png` | **78** | Composition lands. The lede runs onto the lit skyline, the secondary and city chips are unlit, the nav has no active mark, the stat objects read as blobs at 34px. |
| Profile | `50E032EA` | `scripts/.shots/preview-f4-profile-dark.png` | **76** | Right parts, wrong packing: the identity block stacks full width where the render nests it beside the avatar, so a row falls off the screen. Verified is a shield where the render draws a tick. |
| Booking thread | `GOVERNING-chat-booking-card.png` | `scripts/.shots/preview-f5-thread-booking-card-dark.png` | **76** | The card is very close. No call control, no sender/time line above the bubble, the check-in times dropped, the three-up date grid wraps, Contact host is a grey plate beside a lit primary. |
| Feed | `GOVERNING-feed-plus-bloom.png` | `scripts/.shots/preview-f4-feed-dark.png` | **74** | Header, stories, toggle and post anatomy land. The FAB is opaque paint over live body copy where the render's is glass, and the rhythm fits 1.5 posts where the render fits 3. |
| Wallet | `6AF37222` | `scripts/.shots/preview-e-wallet-dark.png` | **74** | Balance card and object are right. Three of four balance actions are near-black beside one lit Send; every quick-action title wraps to two lines where the render holds one. |
| Landing desktop fullpage | `GOVERNING-landing-desktop-fullpage.png` + `founder/landing-fullpage-target.png` | `docs/design/proofs/f2/landing-desktop-fullpage.png` | **72** | Section order and treatment follow the target. Sticky nav lands on the hero overline, category labels sit on bright photography, the four step icons are flat black orbs, 150 to 250px dead bands separate every section. |
| Search results | `founder/GOVERNING-search-filters-target.png` | `scripts/.shots/preview-f3-search-dark.png` | **72** | Two-up grid, verified corner, for-rent tag and sort control land. The chip row is clipped, the money notation disagrees inside one row, the sticky search band is a black slab on a lit page. |
| Side drawer | `BCD39CA8` | `scripts/.shots/preview-lead-drawer-dark.png` | **72** | Right rows, right tier, right omissions by ruling, and the panel now carries a lit right edge. Rows are ~55 per cent taller than the render, so the flip coin, the theme row and the foot are below the fold and nothing on screen is lit. |
| Landing, 390 | derived from the two landing images | `scripts/.shots/root-dark.png` | **70** | Content truth has landed. The overline now wraps and orphans a slash, the lede is five lines over the photograph, the Search button stacks its arrow above its word, the feature orbs are still flat black circles. |
| Filters sheet | `founder/GOVERNING-search-filters-target.png` + `3EB3E2A9` | `docs/design/proofs/f3/filters-390-dark.png` | **70** | Group order, slider and Apply (n) are right. Eleven of fourteen chips are grey-hairlined boxes, Reset is a grey plate, Shortlet is missing from Market, the Buy/Rent glyphs are swapped against every other surface. |
| Settings | `7F96BE6C` | `scripts/.shots/preview-f4-settings-dark.png` | **70** | The render draws six stroked glyphs in six lit plates; we draw three stroked glyphs and three 3D glass objects in six near-black plates, and Add is grey where the render fills it with brand. Rows are 29 per cent taller. |
| Admin queue, phone | `278CC66A` | `docs/design/proofs/f5/admin-queue-390-dark.png` | **68** | Status palette and row anatomy are right. The console badge says 41 above a tab that says All (42), and the status chip row is cut mid-word. |
| Stay detail | `BB0C2C85` | `docs/design/proofs/f3/stay-detail-390-dark.png` | **68** | The render fits the whole stay including the pickers and Book This Stay in one screen; we reach About. The spec strip wraps its middle cell, the amenity rail is cut at the viewport. |
| Listing detail | `9E8B56ED` | `scripts/.shots/preview-f3-listing-dark.png` | **66** | The money now agrees with itself, which is real progress. The pinned bar paints over the amenity rail and the section tabs, the Breakdown control floats on a lavender plate that exists nowhere else, two chrome bars stack before the photo. |
| Move-in ledger | `9F384CFE` | `docs/design/proofs/f3/move-in-390-dark.png` | **74** | Honest breakdown, one money notation throughout, agency fee named as the agent's. The listing title wraps to four lines because the For-rent tag takes the right column, and the header sub-line wraps to three. |
| Inspections | `F6A8A482` | `docs/design/proofs/f5/inspections-390-dark.png` | **64** | The eight-item checklist is honestly resolved to a four-rung ladder and recorded in `ladder.ts`, which is right under rule 19 and leaves a real 10.2 gap. The three-up strip wraps, the status is stated twice, the progress track is raw grey. |
| Stays home | `FD3DFE84` | `scripts/.shots/preview-f3-stays-dark.png` | **64** | The render's five-up compact rail is a 3x3 grid of big tiles with a hole in it, so Featured Stays falls off the fold and the render's two complete cards become one photograph. The active tile is drawn larger than its siblings and the row's edges do not line up. |
| Rental thread | `founder/GOVERNING-thread-rental-enquiry.jpg` | `scripts/.shots/preview-f5-thread-rental-dark.png` | **62** | His own reference makes the LISTING the header subject with its photo and a Verified chip, and draws both sides' bubbles as lit blue glass. We head the thread with the person on a monogram, draw no call control though the data is there, and leave the incoming bubble near-black. |
| Flip, mid-turn | `GOVERNING-flip-mid-turn.png` | `docs/design/proofs/lead/flip-mid-turn-390-dark.png` (**18 Sept 22:22, RE-VERIFY**) | **60** | The render's whole idea is that the page you are leaving stays visible around the turning pane. That proof blacks the screen out, so the trick reads as a page transition rather than a coin turning in your hand. |
| Dock | feed/booking/profile renders | `docs/design/proofs/lead/dock-390-dark.png` is **18 Sept 22:20**, pre-token-change | **not ruled** | I refuse to score it on a stale file and could not re-shoot. Needs one shot. |

**Surfaces with no reference image — do they read as the same product?**

| Surface | Same product? | Why |
| --- | --- | --- |
| Notifications | Yes | Glass rows on a glyph rail, unread by tint and dot, mark-all in the head. |
| Post thread | Mostly | Feed register carried through. The Reply button is unlit, the textarea shows a native resize grabber, and the compose FAB sits on the "3 REPLIES" heading though an inline composer is 200px above. |
| Checkout | Mostly | Right card anatomy and an honest total. The pinned bar frosts grey-lavender rather than blue and the payment options start under it. |
| Crypto | Not assessed | Proofs are 13:50, before the 14:27 token change; could not re-shoot. |
| Inbox | **No** | The one list in the product with no container, no divider and no lit control; the active segment is invisible; the proof shipped with the Next dev-tools badge reading "2 Issues". |
| Trips | **No** | Bare rows on a spine with **black** dots on navy, Cancel as unstyled grey text, a date broken across two lines, a "Past trips / 1" stub above 600px of empty navy. |
| Agent dashboard | **No** | Opens with four stat tiles above its own title, and the loudest control on the screen is the EN language picker as a brand-filled pill. |

---

## 2. GAP FINDINGS, ranked

### A1. The listing page's pinned bar paints over the amenity rail and the section tabs
- **EVIDENCE:** `scripts/.shots/preview-f3-listing-dark.png` beside `docs/design/references/9E8B56ED-FD28-4C33-BB7A-DF19B642A680.png`; already filed as `docs/design/proofs/f6/f6-15-listing-stickybar-over-chips-light.png` at 14:52 and still present at 16:03.
- **SEVERITY: critical.** Three named fault classes at once: text over text, a chip row clipped at 390, a control under a sticky bar. "Backup power" is half-painted; "Overview / Amenities / Location / Reviews" bleeds out from under the bar.
- **FIX:** the scroller must reserve the bar. In `app/css/catalogue.css` give the listing scroll container `padding-block-end: calc(var(--nf-pinned-bar-h) + var(--nf-space-lg) + env(safe-area-inset-bottom))`, publishing `--nf-pinned-bar-h` from the bar the way `--nf-tabbar-clearance` already works for the dock. Add `scroll-margin-block-end` of the same value to the tab targets. The amenity rail additionally needs `scroll-padding-inline: var(--nf-shell-gutter)` and a right-edge mask so a cut chip reads as "more this way".
- **EFFORT:** half a day.

### A2. The filter chip row and the admin status chip row are cut at 390 with no affordance
- **EVIDENCE:** `scripts/.shots/preview-f3-search-dark.png` and `docs/design/proofs/f3/search-390-light.png` (the Price chip cut in both themes) beside `founder/GOVERNING-search-filters-target.png`, where four chips fit; `docs/design/proofs/f5/admin-queue-390-dark.png` ("Approved" cut to "Ap").
- **SEVERITY: critical.** His target fits four chips because its labels are one word; ours reads "Any market", spending 150px to say no filter is set.
- **FIX:** rename the resting labels to the noun only, as the target does: "Market", "Beds", "Price", plus the target's fourth chip "More (n)". Label at `--nf-text-caption`, chip `max-inline-size: 9.5rem` with `text-overflow: ellipsis`, and a 24px trailing `mask-image` fade on the rail. Same treatment on the admin status rail in `app/css/admin.css`.
- **EFFORT:** hours.

### A3. Two notations for the same kind of figure inside one card grid
- **EVIDENCE:** `scripts/.shots/preview-f3-search-dark.png` row one: "₦950,000/year" beside "₦1.2m/year"; row two "₦185m" beside "₦350m". Confirmed in light in `docs/design/proofs/f3/search-390-light.png`.
- **SEVERITY: critical**, by his own fault class. The compact branch turns on at a million, so a two-up grid straddling the threshold prints two grammars for one sentence.
- **FIX:** the notation is a property of the GRID, not the number. In the listing card model (`components/app/listing`, `lib/site/listing-card.ts`) decide once per result set: if any price in the set is at or above the threshold, compact them all, otherwise compact none. Pass it down as a prop. Do not change `formatMoney`; add a `compact` argument the caller sets for the set. The move-in bar already proves the principle (₦14.7m now agrees with ₦14,700,000).
- **EFFORT:** half a day plus a test that a mixed set never prints both forms.

### A4. The assistant clips a starter chip mid-word and lets the result rail escape both gutters
- **EVIDENCE:** `docs/design/proofs/f1/assistant-390-dark.png` beside `BF49B814`; previously `docs/design/proofs/f6/f6-07-assistant-starter-clipped-light.png`. Also on this screen: the assistant says "under 2,000,000 a year" with no naira mark, 80px above cards reading "₦1,650,000 per year".
- **SEVERITY: critical** (word broken mid-word, row clipped, a money figure outside `formatMoney`, which is rule 2).
- **FIX:** (a) the starter rail takes A2's mask and `scroll-padding-inline`, each chip `max-inline-size: 15rem` with two-line clamping instead of a cut. (b) The two-up result rail sits inside the shell gutter and bleeds by exactly `--nf-shell-gutter` with a matching `scroll-padding-inline` — the pattern `FeedPreview` already documents for the story rail. (c) Every money figure in an assistant reply goes through `formatMoney` before it reaches the wire; grep the answer builder for bare `toLocaleString`.
- **EFFORT:** half a day.

### A5. The resting container is still near-black with a white hairline everywhere the founder's ruling did not reach — THE BIGGEST SINGLE FINDING
- **EVIDENCE, from the source:** `app/css/glass.css:1120` — `.nf-icon-tile { border: 1px solid var(--nf-glass-border); background: var(--nf-glass-fill); box-shadow: var(--nf-elev-1-rim), var(--nf-elev-1) }`, with `packages/design-tokens/src/tokens.css:1031` `--nf-glass-border: rgb(255 255 255 / 0.11)`, `:955` `--nf-glass-fill: rgb(255 255 255 / 0.075)`, `:1221` `--nf-elev-1-rim: inset 0 1px 0 rgb(255 255 255 / 0.12)`. **Not one brand value.** `.nf-icon-tile` is the plate behind every glass object in every list row, which is the plate he photographed.
- **EVIDENCE, on screen:** eleven of fourteen chips and Reset (`docs/design/proofs/f3/filters-390-dark.png`); "Contact host" (`scripts/.shots/preview-f5-thread-booking-card-dark.png`); "Mark as inspected" (`preview-f5-thread-rental-dark.png`); "Explore Stays" and the Abuja/Lekki/Ikeja chips (`scripts/.shots/root-dark.png`); "Add" and six row plates (`preview-f4-settings-dark.png`); "Mark all read (3)" beside a lit search button (`docs/design/proofs/f5/inbox-390-dark.png`); three of four balance actions (`preview-e-wallet-dark.png`); every "View" and kebab (`docs/design/proofs/f5/admin-queue-390-dark.png`); the Reply button (`docs/design/proofs/f4/post-thread-390-dark.png`).
- **SEVERITY: high**, and it is the single biggest reason the product still does not read as its renders. In every governing image a resting chip, tile, plate and secondary carries a blue outline with light on it. Ours carries a grey hairline, so a screen with one lit primary and eleven grey boxes reads as a prototype with one finished control.
- **FIX, three edits in order:**
  1. `glass.css:1120` — swap `--nf-glass-border` for `--nf-brand-edge`, `--nf-glass-fill` for `--nf-brand-tint-1`, and `var(--nf-elev-1-rim), var(--nf-elev-1)` for `var(--nf-glow-edge)`. This one rule reaches every icon plate on profile, settings, bookings, rent, move-in and the rows.
  2. In `controls.css` and `chips.css`, any rule setting `border-color: var(--nf-glass-border)` **on a control** becomes `--nf-brand-edge` plus `box-shadow: var(--nf-glow-edge)`. Audit by `grep -rn "nf-glass-border" apps/web/src/app` and classify each hit as a divider (keep) or a control edge (change).
  3. `landing.css` — the hero's ghost CTA and the city chips are landing-local classes the same sweep missed. Same substitution.
  Then add a rule to `scripts/check-css-tokens.mjs`: `--nf-glass-border` may not be the `border-color` of anything that is also a control, so this cannot regress.
- **EFFORT:** a day, mostly the grep and the regression shots.

### A6. The landing lede is five lines painted straight over the villa at 390
- **EVIDENCE:** `scripts/.shots/root-dark.png` — "hotel, a shortlet or a table on Vallo Stays," and "and pay for all of it from one naira wallet." both sit on lit glazing and pool. The content truth sweep replaced a two-line lede with a five-line one and the scrim was not re-cut. Same fault on desktop (`landing-desktop-hero.png`) and in the invest band (`preview-f1-home-dark.png`, and `f6-06-invest-copy-over-photo-light.png` at 14:52, still open).
- **SEVERITY: high.**
- **FIX:** one shared utility, not four local gradients. Add `.nf-photo-scrim` to `utilities.css`: `linear-gradient(90deg, color-mix(in oklab, var(--nf-ink-950) 82%, transparent) 0%, color-mix(in oklab, var(--nf-ink-950) 55%, transparent) 42%, transparent 70%)` plus a bottom `linear-gradient(0deg, color-mix(in oklab, var(--nf-ink-950) 70%, transparent) 0%, transparent 45%)`. Apply it in `MediaFrame` whenever the frame carries text, and on the landing hero, the invest band and the desktop category tiles. Then cap the 390 lede at three lines with a shorter `landing.hero.subtitle` in `packages/i18n/src/locales/en.ts` and its three siblings.
- **EFFORT:** half a day including the four locales.

### A7. The hero overline wraps at 390 and orphans a leading slash
- **EVIDENCE:** `scripts/.shots/root-dark.png`: "PROPERTY / STAYS / RESTAURANTS" then a second line beginning "/ MANAGE".
- **SEVERITY: high.** A separator at the head of a line is a typesetting error and it is the first text on the product's first screen. It is a new fault introduced by the (correct) copy change.
- **FIX:** in `components/site/landing/Hero.tsx` render the crumbs as a flex row of `<span>` with the slashes as `::after` on all but the last, each crumb `white-space: nowrap`; at `@media (max-width: 26.75rem)` show the first three crumbs only and cut `letter-spacing` to `0.14em`. Do not shorten the words; the crumbs are content truth.
- **EFFORT:** hours.

### A8. The landing Search button stacks its arrow above its word
- **EVIDENCE:** `scripts/.shots/root-dark.png`, and his own photograph `founder/landing-feature-orbs-as-shipped.jpg` shows the same thing, so it has survived his complaint.
- **SEVERITY: high.** It reads as a broken control on the product's primary CTA.
- **FIX:** `landing.css`, `.nf-landing-pill` submit — the button is a grid child whose column is narrower than `label + gap + icon`, so its inline flex wraps. Set `display: inline-flex; align-items: center; gap: var(--nf-gap-inline-tight); white-space: nowrap; min-inline-size: max-content` and make the grid column `minmax(max-content, 1fr)`. Arrow after the word, as "Explore Properties" already does.
- **EFFORT:** hours.

### A9. The landing feature orbs are still flat near-black circles behind glass objects
- **EVIDENCE:** `scripts/.shots/root-dark.png` (the six-tile band below the pill) and the desktop fullpage's six-across strip and four How-Vallo-Works steps, beside `founder/landing-feature-orbs-as-shipped.jpg` (his complaint) and `founder/landing-fullpage-target.png`, where the same objects sit with **no dark disc at all**.
- **SEVERITY: high.** One of his five complaints of 19 September, unresolved on the landing in both viewports. The fix reached `--nf-icon-ground` and the in-app tiles; the landing's circles are a separate class.
- **FIX:** in `landing.css` the feature and step icon wrappers carry no plate at all, exactly as his target draws them: delete the `background` and `border` and add `filter: drop-shadow(0 0 18px var(--nf-glow-2))` so the object throws its own light. If a plate is wanted it must be `--nf-brand-tint-1` with `--nf-glow-edge`, never `--nf-surface`.
- **EFFORT:** hours.

### A10. On desktop the sticky site header lands on the hero overline
- **EVIDENCE:** `docs/design/proofs/f2/landing-desktop-fullpage.png` top band, where the overline is visible as grey text bleeding out from under the nav plate. The unscrolled `landing-desktop-hero.png` does not show it, so the collision belongs to the header's scrolled state.
- **SEVERITY: high** (text over text), with one confirming scroll test still owed; I could not run it at load 150.
- **FIX:** publish the header height as `--nf-site-header-h` and give the hero `padding-block-start: calc(var(--nf-site-header-h) + var(--nf-space-xl))`. If the scrolled header grows, publish the larger value and animate the hero padding with it, or hold the header at one height and change only its fill.
- **EFFORT:** hours.

### A11. Desktop category tiles set their labels on bright photography with no scrim
- **EVIDENCE:** the desktop fullpage's Explore-by-category grid: "Commercial 3 listed" on a lit skyline, "Land 3 listed" on an orange sunset, "Guest Houses" wrapping into its icon chip. `founder/landing-fullpage-target.png` gives every tile a dark foot.
- **SEVERITY: high.**
- **FIX:** apply A6's `.nf-photo-scrim`, put the label block in a `padding: var(--nf-space-sm)` foot with `text-wrap: balance` and a fixed two-line reserve so a two-word category never moves the count. Separately, eight tiles share four near-identical glass building objects: give Resorts the palm, Land the map pin, Shortlets the calendar, Commercial the tower.
- **EFFORT:** half a day.

### A12. The verified mark is a shield everywhere; every governing render draws a circular tick beside a name
- **EVIDENCE:** `apps/web/src/design-system/icons/UiIcon.tsx:279` — `verified` is a shield outline with a tick inside. On screen: `preview-f4-profile-dark.png` (beside the name and on the avatar), `preview-f4-feed-dark.png` (every post author), `preview-f5-thread-booking-card-dark.png` (thread header), `preview-f4-settings-dark.png` (an emerald shield for "Verified"). Against `50E032EA`, `7F96BE6C`, `GOVERNING-feed-plus-bloom.png` and `GOVERNING-chat-booking-card.png`, all of which draw a **filled circular badge with a white tick** beside a name. The shield is correct inside a **chip** (`FD3DFE84` and `3EB3E2A9` both show a shield in the Verified pill) and that is where we should keep it.
- **SEVERITY: high.** It is the most repeated mark in the product, it is the wrong shape against four governing images, and it collides with the Inspections row, which uses a shield-check for a different idea.
- **FIX:** add `verified-badge` to `UiIcon.tsx` as a filled circle (or the feed render's twelve-point rosette) with a white tick, `--nf-brand-primary` for identity and `--nf-success` for a status word. Swap every **identity** use (`VerifiedAvatar`, the thread title tick, the feed author tick, the settings Verified/Secure marks) to it. Leave `verified` as the shield and use it only inside `.nf-badge` on a listing card.
- **EFFORT:** half a day.

### A13. Settings mixes icon tiers inside one column
- **EVIDENCE:** `scripts/.shots/preview-f4-settings-dark.png` — Account Information, Language and Help & Support are thin stroked `UiIcon` glyphs; Notifications, Privacy & Security and Appearance are 3D glass `BrandIcon` objects. Same column, six rows. `7F96BE6C` draws all six as stroked glyphs in lit plates.
- **SEVERITY: high.** Rule 5 says tiers never mix in a row, and this is a column of six.
- **FIX:** the render decides it: all six become `UiIcon` at `ICON.inline` in an `.nf-icon-tile` fixed at 2.5rem with A5's lit composition. Keep glass objects for section heads (Payment Methods keeps its wallet), which is the rule `BrandIcon.tsx` already states in its own header comment.
- **EFFORT:** hours.

### A14. Buy and Rent carry swapped glyphs on two surfaces
- **EVIDENCE:** `apps/web/src/components/app/filters/FilterDrawer.tsx:337-338` — `{ value: "sale", label: "Buy", icon: "key" }`, `{ value: "rent", label: "Rent", icon: "home" }`. `components/site/landing/SearchPill.tsx` — `buy: { icon: "home" }`, `rent: { icon: "key" }`. Visible in `docs/design/proofs/f3/filters-390-dark.png` beside `scripts/.shots/root-dark.png`.
- **SEVERITY: high.** Two surfaces two taps apart teach the user opposite things.
- **FIX:** the governing hero settles it: Buy is the house, Rent is the key, Stay is the bed. Swap the two icons at `FilterDrawer.tsx:337-338`. While there: the Market group offers only `sale` and `rent`, while his target and the home grid both sell Shortlets, so add the `shortlet` option with the calendar glyph.
- **EFFORT:** hours.

### A15. Three-column spec strips wrap at 390 on four surfaces
- **EVIDENCE:** `preview-f5-thread-booking-card-dark.png` ("22 Jun / 2026" broken across lines, and the render's 2:00 PM / 12:00 PM times dropped entirely to make room); `docs/design/proofs/f5/inspections-390-dark.png` ("Showing you round" over two lines and "Tunde / Adebayo" over two more, so the middle column is four lines beside a two-line neighbour); `docs/design/proofs/f3/stay-detail-390-dark.png` ("2 room / types"); `f6-14-stay-spec-strip-wrap-light.png` at 14:57, still open.
- **SEVERITY: high**, and repeated, which makes it a pattern fault rather than four bugs. The renders fit three columns because their labels are one or two short words at caption size.
- **FIX:** build one `SpecStrip` primitive and use it in all four places: label at `--nf-text-overline` in `--nf-content-muted`, value at `--nf-text-caption` bold, `white-space: nowrap` on the value with `font-variant-numeric: tabular-nums`, and a container query dropping three columns to two-plus-one below `22rem`. Then fix the labels: "Showing you round" becomes "Agent"; the booking card's dates become "22 Jun 2026" on one line with the time beneath, as the render draws them.
- **EFFORT:** a day.

### A16. The thread's incoming bubble is near-black where his own reference draws both sides as lit blue glass
- **EVIDENCE:** `scripts/.shots/preview-f5-thread-rental-dark.png` beside `founder/GOVERNING-thread-rental-enquiry.jpg`. In his reference the counterpart's bubble is a deep translucent blue with a lit rim and a tail, and the agent's is a brighter blue with a lit rim and a tail. Ours: incoming is `--nf-surface` with a hairline, outgoing is flat saturated paint, neither has a tail.
- **SEVERITY: high.** Messaging is one of the five governing surfaces and it is the one that looks least like Vallo.
- **FIX:** in `threads.css`, incoming `background: var(--nf-brand-tint-1)` with `box-shadow: var(--nf-glow-edge)`; outgoing `background: var(--nf-gradient-cta)` with `--nf-glow-edge-strong`. Add the tail as a `::after` 6px triangle on the outer bottom corner, `border-radius: 2px`, inheriting the fill. Put the role tag on `--nf-brand-tint-2` with `--nf-brand-edge` rather than the grey hairline.
- **EFFORT:** half a day.

### A17. The thread header names the person where his reference names the listing, and the call control does not draw
- **EVIDENCE:** the header crop of `scripts/.shots/preview-f5-thread-rental-dark.png`: back, an "M" monogram, "Michael T.", "Rental enquiry", the place, and one kebab. The fixture passes `counterpartPhone="+2348010000000"` and `context={{ kind: "listing", listing }}` (`app/(dev)/preview/f5/fixtures.ts:154`); `ThreadView.tsx:536` computes `propertyFace` from exactly that and `:615` draws the call anchor from exactly that, yet **neither the property face nor the call button appears**. `founder/GOVERNING-thread-rental-enquiry.jpg` puts the listing photo, "Luxury 2 Bedroom Apartment", the place and an emerald Verified chip in the header, with a call button left of the kebab.
- **SEVERITY: high.** Two components the governing image shows do not reach the screen (a 10.2 failure) and the second is a live control that silently does not render.
- **FIX:** this needs a debugger, not a stylesheet. Trace `context` from `preview/f5/thread-rental/page.tsx` into `ThreadView` and assert `propertyFace === true` in a unit test with exactly that fixture; then confirm the call anchor and the Verified chip draw. Hand to F5 with R2's control walk.
- **EFFORT:** hours to find, hours to fix, plus the test.

### A18. The drawer's rows are ~55 per cent taller than the render, so its star is below the fold
- **EVIDENCE:** `scripts/.shots/preview-lead-drawer-dark.png` (fresh, 16:04) beside `BCD39CA8`. Normalised to 390x844: the render draws nine rows in ~371 CSS px, about 41px each; ours draws nine in ~579 CSS px, about 64px each. The render shows the user block, nine rows, WORKSPACE, Agent Mode, the FLIP COIN card and the theme toggle in one screen; ours reaches Settings with the coin still below.
- **SEVERITY: high.** Section 6 calls the flip coin "the star" and nobody sees it without scrolling. (To be fair: the panel's lit right edge **is** now there in the fresh shot; the 18 Sept proof on disk does not have it. Do not read that proof.)
- **FIX:** in `side-nav.css` set the drawer row to `min-block-size: 2.75rem` (the 44px tap target, no more), `padding-block: var(--nf-space-2xs)`, gap `var(--nf-space-3xs)`, glyph 20px, label `--nf-text-body-sm`. That recovers roughly 200 CSS px, which is the coin plus the theme row. Also give the row matching the current route the render's brand-filled pill, so something on the screen is lit.
- **EFFORT:** half a day.

### A19. The drawer's scrim is opaque black where the render dims a living page
- **EVIDENCE:** `scripts/.shots/preview-lead-drawer-dark.png` (the right 12 per cent is pure black) beside `BCD39CA8`, where the results page behind is dimmed but fully visible with its own glow, which is what sells the drawer as a pane sliding over the app.
- **SEVERITY: high** for the "alive" standard.
- **FIX:** `overlays.css` — scrim becomes `background: color-mix(in oklab, var(--nf-ink-950) 58%, transparent)` with `backdrop-filter: blur(10px) saturate(1.1)`, and the page beneath keeps rendering rather than being replaced. `@supports not (backdrop-filter: blur(1px))` falls back to 78 per cent.
- **EFFORT:** hours.

### A20. Stays home replaces the render's five-up rail with a 3x3 grid that has a hole in it, and its active tile breaks the row
- **EVIDENCE:** `scripts/.shots/preview-f3-stays-dark.png` beside `FD3DFE84`. The render packs five compact tiles into ~110 CSS px of height and gets two complete Featured Stays cards on screen; ours spends ~260 CSS px on two rows of big tiles with an empty third cell and gets one photograph. A crop of the tile row shows the Hotels tile drawn taller than Apartments and Resorts, so the row's top and bottom edges do not line up; previously `f6-08-stays-selected-tile-light.png`.
- **SEVERITY: high.**
- **FIX:** rebuild `StayCategoryTiles` as the render's rail: a horizontally scrolling flex row, each tile 4.25rem wide with the object above a single-line caption, no arrow, bleeding by the shell gutter so the fifth is half-cut as an overflow cue. Express the active tile with `background: var(--nf-gradient-cta)` and `--nf-glow-edge-strong` **only**, never with size; if a scale is wanted use `transform: scale(1.02)` on a fixed-height grid cell so the box model does not move. Separately: the Hotels glass object has **five stars baked into its artwork**, which says every hotel is five-star; use the plain bed or building object.
- **EFFORT:** half a day.

### A21. The flip blacks out the page it is leaving
- **EVIDENCE:** `docs/design/proofs/lead/flip-mid-turn-390-dark.png` (**18 Sept 22:22 — RE-VERIFY**) beside `GOVERNING-flip-mid-turn.png`. In the render the search bar, the market chips, two listing cards and Popular Cities are visible either side of the turning pane; in that proof everything outside the pane is black, the cover's two-line sub-line is legibly sheared at mid-turn, and the dock's "Search / Feed / More" labels are muddied by the pane's translucency.
- **SEVERITY: high.** This is a governing image and the thing it governs is the moment he calls the product's signature.
- **FIX:** in `side-flip.css` / `components/app/flip`, do not unmount or cover the outgoing surface. Keep it rendered under the pane at `filter: brightness(0.45) saturate(0.8)` with **no** blur (the render keeps it crisp) and give the pane `transform-style: preserve-3d` with its own `backface-visibility`, so it is genuinely a card turning above live content. Two more things the render asks for: add a second inset rim at `--nf-rim-lit-ink` inside `--nf-glow-edge-strong` so the leading edge has a white-hot core; and fade the cover's text to 0 above about 25 degrees of rotation, letting the mark carry the turn alone, which is what the render draws.
- **EFFORT:** a day. **Re-shoot first.**

### A22. LIGHT: the sign-in lockup stays dark on paper and the language control is white on white
- **EVIDENCE:** `docs/design/proofs/f1/sign-in-390-light.png` (08:19 — **RE-VERIFY**) beside `55A56F21`. On paper the app icon is a near-black glass tile and the wordmark is the chrome-blue 3D artwork, both pasted on a pale grey page; the aurora plate the direction assigns to auth is absent in light; the EN control is a white pill with a grey hairline on a near-white page; the podium ellipse is a stray grey outline.
- **SEVERITY: high.** Rule 7: light is a designed twin, not a derivation, and this is the first screen a new account sees.
- **FIX:** ship a light twin of the lockup (wordmark in `--nf-brand-primary` on transparent; app tile as `--nf-brand-tint-1` with a `--nf-brand-edge` ring and the mark in brand); keep the aurora plate in light at reduced opacity over the paper ground rather than removing it; give the EN control `--nf-brand-tint-1` with `--nf-brand-edge`; delete the podium ellipse in light, because it is a dark-theme reflection and paper has no reflection.
- **EFFORT:** half a day.

### A23. LIGHT: one screen carries two different icon-plate treatments
- **EVIDENCE:** `scripts/.shots/preview-f4-settings-light.png` (13:49 — **RE-VERIFY**, it predates the 14:27 token change): six row plates as dark chips punched into a white card, and the Payment Methods plate on the **same** screen as a pale lavender chip with a blue line glyph.
- **HONEST ON HIS COMPLAINT:** he asked for the near-black square to become deep navy and **it did**. `packages/design-tokens/src/tokens.css:2805` now reads `--nf-icon-ground: color-mix(in oklab, var(--nf-brand-primary) 62%, var(--nf-ink-950))` with light `--nf-brand-primary: #0C2FE8` and `--nf-ink-950: #010118`, which is deep navy, not near-black, and the comment above it quotes his word and explains the reversal. The letter of his fix landed.
- **SEVERITY: high**, and I report it as "changed as asked, still not right", not as "ignored": on paper a dark chip still reads as a hole punched in a white card, and it now disagrees with its own neighbour.
- **FIX:** on paper the object should not need a dark ground at all. Where a light twin exists in the glass pack, use it and give the plate `--nf-brand-tint-1` with a `--nf-brand-edge` ring, which is what Payment Methods already does and what reads correctly. Where no twin exists, keep `--nf-icon-ground` but drop it to about 24 per cent brand over `--nf-paper-100` so it reads as a tinted chip rather than a hole, and add the light `--nf-glow-edge` so it is lit rather than punched. One treatment per theme, enforced by making `.nf-icon-tile` the only place either is set.
- **EFFORT:** half a day plus a pass over the 80 untwinned objects.

### A24. LIGHT: the selected admin status chip is white ink on a white plate
- **EVIDENCE:** `docs/design/proofs/f6/f6-01-admin-all-chip-white-on-white.png` at 14:52, measured by F6 at 1.21:1. Could not re-shoot — **RE-VERIFY**. My dark shot `docs/design/proofs/f5/admin-queue-390-dark.png` shows the same chip as a brand-filled **square** among **capsules**, so it has a second problem in both themes.
- **SEVERITY: high** if still open (an unreadable control), plus rule 13's "colour is never the only signal".
- **FIX:** the selected status chip takes `background: var(--nf-gradient-cta)` and `color: var(--nf-content-on-brand)` in **both** themes, never a theme-derived surface, and takes `--nf-radius-pill` like its siblings. Add a contrast assertion to `check-css-tokens.mjs` for any pairing of `--nf-content-on-brand` with a background that is not a brand fill.
- **EFFORT:** hours.

### A25. The feed's plus is opaque paint over live body copy, and the bloom has no scrim and no fan
- **EVIDENCE:** `scripts/.shots/preview-f4-feed-dark.png` and `preview-f4-feed-bloom-dark.png` beside `GOVERNING-feed-plus-bloom.png`. The render's FAB is a translucent glass circle with a lit rim, so the post scrolls visibly behind it; ours is a solid saturated disc hiding "Victoria Island? Looking for something sho[rt]-term". Open, the render fans three lozenges on a curve, each rotated to the tangent; ours stacks three level lozenges that paint over "56" and "4h ago", with no dim behind them.
- **SEVERITY: high.** His words on this render were "make it exactly how it is, when clicked it should be exactly like that".
- **FIX:** `social-feed.css`. The FAB becomes `background: var(--nf-glass-fill)` over a `--nf-brand-tint-2` wash with `--nf-glow-edge-strong` and a top-left inner specular; the plus takes `--nf-content-on-brand`. On open add a scrim behind the bloom (`--nf-ink-950` at 46 per cent, 6px backdrop blur) and rotate the lozenges to their tangents: -18, -11, -5 degrees, springs staggered 45ms, the plus rotating 45 degrees into a close. All behind `prefers-reduced-motion`, which cross-fades the three in place.
- **EFFORT:** a day.

### A26. The composer's send control is a dark square with a diagonal arrow on every thread and the assistant
- **EVIDENCE:** `preview-f5-thread-booking-card-dark.png`, `preview-f5-thread-rental-dark.png`, `docs/design/proofs/f1/assistant-390-dark.png`, `docs/design/proofs/f4/post-thread-390-dark.png`. `GOVERNING-chat-booking-card.png` and `founder/GOVERNING-thread-rental-enquiry.jpg` both draw a brand-filled rounded square with a white paper plane, and a paperclip attach, not a picture glyph.
- **SEVERITY: high.** Send is the only primary on the screen and it is currently the quietest control on it.
- **FIX:** `threads.css` — send takes `--nf-gradient-cta`, `--nf-glow-edge-strong` and `--nf-content-on-brand`, disabled at 45 per cent with the fill retained. Swap the glyph to `send` (paper plane) and attach to `attach` (paperclip); add both to `UiIcon.tsx` if absent.
- **EFFORT:** hours.

### A27. Checkout's payment options begin under the pinned bar, and every frosted bar tints grey
- **EVIDENCE:** `docs/design/proofs/f6/f6-00-checkout-bar-blur-dark.png` — "How would you like to pay?" is the last thing above the bar and the options are behind it. The bar, the listing page's "Breakdown" control and the stay page's "Message" control all frost to the same washed grey-lavender, which is a neutral surface behind a blur rather than a brand one. The checkout progress bar's third segment is also a raw neutral grey on navy.
- **SEVERITY: high** (A1's fault class, second instance) plus medium for the tint.
- **FIX:** apply A1's `--nf-pinned-bar-h` reservation to the checkout scroller. For the tint: any surface with `backdrop-filter` sits over `--nf-brand-tint-1`, not over a white alpha, so the frost picks up the brand. `grep -rn "backdrop-filter" apps/web/src/app` and give each hit a brand-tinted fill and `--nf-glow-edge`. The progress track becomes `--nf-brand-tint-1`.
- **EFFORT:** half a day.

### A28. The inbox and trips do not read as the same product
- **EVIDENCE:** `docs/design/proofs/f5/inbox-390-dark.png` — four thread rows with no container, no divider and no lit control; the "All" segment is a near-black plate on a near-black track and is effectively invisible; "Mark all read (3)" is a grey capsule beside a lit search button; a preview truncates "…available u…" inside a word; and the proof shipped with the Next dev-tools badge reading "2 Issues". `docs/design/proofs/f3/trips-390-dark.png` — bare rows on a spine with **black** dots on navy, "Cancel" rendered as unstyled grey text, "Fri 2 Oct to Mon 5 / Oct" broken by the price column, and a "Past trips / 1" stub above 600px of empty navy; previously `f6-12-trips-cancel-and-date-wrap-light.png` at 14:56, still open.
- **SEVERITY: high.** 10.5 requires every surface without an image to read as the same product, and these two read as a different one.
- **FIX:** both lists adopt `.nf-glass--card` rows with `--nf-glow-edge` and the product's row anatomy (plate, title, meta, trailing state, chevron) at `--nf-space-2xs` gaps. Trips' spine dots become `--nf-brand-primary` with a `--nf-glow-2` halo. "Cancel" becomes a glass secondary with the brand ring, never body text, in the row's trailing slot. Give the date its own row above the price. Replace "Past trips / 1" with a real row: object, "Past trips", "1 stay", chevron. Truncate previews on a word boundary. Fix the inbox's two dev issues first (see A40).
- **EFFORT:** a day for the two surfaces.

### A29. The agent dashboard buries its own title and lets the language picker out-shout everything
- **EVIDENCE:** `docs/design/proofs/f5/agent-dashboard-390-dark.png`. The page opens with a 2x2 metric grid; "Agent Dashboard" and the greeting appear ~620px down. The EN control in the header is a brand-filled pill with a bloom, brighter than "Add New Listing". He sent the landing back on 19 September for exactly this ("the theme and language controls must not out-shout the nav"). The stat captions wrap to two lines, dropping the four numbers onto three different baselines. "View all" is unstyled grey text.
- **SEVERITY: high.**
- **FIX:** move the title block above the tiles, as every other surface does. The EN control becomes the quiet glass square F1 already built for sign-in (`--nf-brand-tint-1`, `--nf-brand-edge`, no bloom); make that the one language control in the tree and delete the local variants. Stat captions `white-space: nowrap` at `--nf-text-overline`, "Earned this month" shortened to "Earned, month". "View all" becomes a text button with the brand ink and a chevron.
- **EFFORT:** half a day.

### A30. Profile stacks the identity block full width where the render nests it
- **EVIDENCE:** `scripts/.shots/preview-f4-profile-dark.png` beside `50E032EA`. The render keeps name, handle, bio and counts in one column beside the avatar and gets five rows plus the dock on screen; ours drops bio, counts and a link row to full width beneath the avatar, spends about 135 CSS px doing it, and gets three and a half rows. Our counts print "12,400" where the render prints "12.4K".
- **SEVERITY: medium.**
- **FIX:** `social.css` — the identity block becomes `display: grid; grid-template-columns: auto minmax(0,1fr); column-gap: var(--nf-space-sm)` with the avatar spanning both rows and bio and counts inside the right column, as the render draws it. Compact the follower count with the same one-fraction-digit rule the money ruling settled. The "Edit profile" and "Your public page" links are not in the render; make them one glass secondary "Edit profile" in the identity block's trailing slot.
- **EFFORT:** half a day.

### A31. Row density runs 25 to 35 per cent looser than the renders
- **EVIDENCE:** measured on normalised images. Settings rows: render 283 CSS px for six, ours 365. Drawer rows: 41 vs 64. Stay detail: the render fits the pickers, a five-up amenity grid, About and Book This Stay above the fold; ours reaches About. Feed: the render fits three posts, ours one and a half. Move-in: ~70 CSS px per breakdown row.
- **SEVERITY: medium**, but it is the quiet reason several surfaces score in the sixties while having every part the render has.
- **FIX:** this is one scale decision, not forty local edits. Compare the type ramp and the space scale against the renders at 390 and consider one step down on `--nf-text-body`, `--nf-text-body-sm` and the row-level space tokens, then re-shoot the six densest surfaces. Do it as one deliberate change with the six side-by-sides attached, never piecemeal.
- **EFFORT:** a day plus the re-shoot.

### A32. Five stays categories share one glass object
- **EVIDENCE:** the desktop fullpage's Stays band: Hotels, Apartments, Resorts, Guest Houses and Serviced Apartments all read as the same blue glass block at 22px; only Restaurants differs. Same on the home grid, where Villas takes a classical-columns glyph that reads as a bank and Offices takes a construction crane (`scripts/.shots/preview-f1-home-dark.png`).
- **SEVERITY: medium.**
- **FIX:** one object per idea: Hotels the bed, Apartments the tower, Resorts the palm, Guest Houses the house, Serviced Apartments the building-with-key, Restaurants the cloche, Villas the villa, Offices the office block, Land the map pin. At 22px an object must be silhouette-distinct; test the set as a row at 22px before shipping it.
- **EFFORT:** hours.

### A33. The same destination carries two names and two glyphs
- **EVIDENCE:** `scripts/.shots/preview-lead-drawer-dark.png` calls it "Vallo AI" with a sparkle; `docs/design/proofs/f1/assistant-390-dark.png` titles the page "AI Assistant"; `BCD39CA8` says "AI Assistant". The drawer gives Inspections an **eye**; `preview-f4-profile-dark.png` gives Inspections a glass **shield-check**; the drawer gives Crypto a **lightning bolt** for a price board. Three unread signals exist in three shapes and two colours (a cyan dot on the dock's Profile, a cyan dot on the header bell, a blue filled "5" pill in the drawer).
- **SEVERITY: medium.**
- **FIX:** one name and one glyph per destination, declared in `nav-model` and read everywhere: "AI Assistant" with the sparkle, "Inspections" with the shield-check, "Crypto" with the chart or coin glyph and never the bolt. One unread treatment: the cyan dot for a boolean, the brand pill for a count, never both for the same thing. Add a test asserting the drawer, the dock, the profile rows and the page title all read the same label for a route key.
- **EFFORT:** hours.

### A34. Money decimals render as a dim grey run dropped below the baseline
- **EVIDENCE:** `scripts/.shots/preview-e-wallet-dark.png` ("₦245,680.00" with a small grey ".00" sitting low) and `f6-00-checkout-bar-blur-dark.png` ("₦360,000.00 in full", where ".00" and "in full" run together and read as ".00in full"). `6AF37222` sets the fraction in the same white on the cap line.
- **SEVERITY: medium.** It reads as a rendering fault on the two screens where the number matters most.
- **FIX:** one `<Money>` primitive: naira mark at 0.82em with -0.02em tracking, integer at full weight and colour, fraction at 0.55em with `vertical-align` set so it sits on the cap line, same colour at 70 per cent opacity, `font-variant-numeric: tabular-nums` throughout; "in full" gets its own element with a real gap.
- **EFFORT:** half a day.

### A35. The inspection checklist is honestly resolved and still a 10.2 gap
- **EVIDENCE:** `docs/design/proofs/f5/inspections-390-dark.png` shows a four-rung ladder where `F6A8A482` shows an eight-item checklist plus Notes, Add Photos and Submit Inspection Report. `components/app/inspections/ladder.ts` records the reasoning: there is no checklist model, so eight tick boxes would be a picture of a feature under rule 19.
- **SEVERITY: medium.** The resolution is correct and recorded, which 10.2 explicitly allows; the gap is that his image still shows something we lack.
- **FIX:** build the seam the file already names: `inspection_checks` (inspection_id, item, passed, note, photo path) with a write action, then ship the render's eight rows against real state, with the ladder staying as the lifecycle spine above it. A B-worker migration plus an F5 surface.
- **EFFORT:** days.

### A36. The landing dropped Invest for truth while the home sells "investment opportunities"
- **EVIDENCE:** `scripts/.shots/root-dark.png` (three segments, RESTAURANTS in the overline) against `scripts/.shots/preview-f1-home-dark.png` ("INVEST IN TOMORROW / Discover premium investment opportunities. / Explore Investments"). The i18n comment at `packages/i18n/src/locales/en.ts:390` says "Invest is gone because Vallo sells no investment product"; the comment at `:1448` says the invest band "is the for-sale market, named honestly".
- **SEVERITY: medium**, and it belongs to R3's beat as much as mine, but it is visible on screen so I report it.
- **FIX:** one ruling applied to both. Either the for-sale market may be called an investment (then restore the landing's fourth segment) or it may not (then the home band becomes "BUY / Property for sale on Vallo / Explore properties for sale"). **His own home target uses the investment wording, so this needs his word, not a worker's.** Add to section 9.
- **EFFORT:** hours once ruled.

### A37. The console badge disagrees with the tab beneath it
- **EVIDENCE:** `docs/design/proofs/f5/admin-queue-390-dark.png`: the header badge reads 41, the tab beneath reads "All (42)". F6 fault 11 at 14:52, still open at that proof's vintage.
- **SEVERITY: medium**, high in trust terms on an operations surface, and it is his named fault class verbatim.
- **FIX:** one read, one number. Badge and tab must derive from the same query result in the same request; if the badge is cached or read separately, delete the second read and pass the first down.
- **EFFORT:** hours.

### A38. The in-app header is a flat black band with a hard bottom edge
- **EVIDENCE:** `preview-f3-stays-dark.png`, `preview-f3-search-dark.png`, `preview-f3-listing-dark.png`, `preview-e-wallet-dark.png`. Every governing render floats the header on the page with no bar at all (`FD3DFE84`, `6AF37222`, `50E032EA`, `7F96BE6C`). On the listing page it also stacks above the photo's own back button, so two chrome bars eat 128 device px before any content.
- **SEVERITY: medium.**
- **FIX:** `chrome.css` — the header is transparent at scroll 0 and frosts to `--nf-brand-tint-1` with `--nf-glow-edge` once the page moves, which is what the renders imply and what A27 calls for. On a detail page with its own in-photo back control, collapse the app header to a transparent overlay and keep one back control.
- **EFFORT:** half a day.

### A39. Smaller gaps, one line each
- **Sign-in:** "Terms" and "Privacy Policy" are not links (`sign-in-390-light.png`). **Medium.** Make them links. Hours.
- **Stay detail:** the sparkle glyph carries both "5 star" and "Air conditioning" on one screen. **Medium.** Give air conditioning the snowflake the render uses. Hours.
- **Inspections:** "Scheduled" is stated twice on one screen and the progress track is raw grey on navy. **Medium.** State it once, on the card; track to `--nf-brand-tint-1`. Hours.
- **Settings:** "Verified" is emerald here and a blue shield 200px above on the name row. **Medium.** A12 settles the shape; keep emerald for status and brand for identity, as `7F96BE6C` does. Folded into A12.
- **Thread:** every outgoing bubble repeats a generic person avatar with "Agent" beneath, where his reference marks it once with the Vallo "V" coin. **Medium.** Draw the mark on the first bubble of a run only. Hours.
- **Post thread:** the reply textarea shows a native resize grabber, and the compose FAB sits on the "3 REPLIES" heading though an inline composer is 200px above. **Medium.** `resize: none` with auto-grow; hide the bloom FAB where an inline composer exists. Hours.
- **No-photo placeholder:** a grey moon and a grey fence on a grey-lavender plate in both themes, and in light it collides with the "For sale" pill (`f6-03-listingcard-pill-collision.png`). **Medium.** See E17; and stack the two pills instead of overlapping them. Half a day.
- **Move-in:** the listing title wraps to four lines because the For-rent tag takes the right column, and the header sub-line wraps to three in a 270px gap. **Medium.** Put the tag above the title; give the header its own full-width row. Hours.
- **Notifications/bell:** the bell glass object in settings has a "3" badge baked into its artwork. **Medium.** An icon may not carry a count; use the object without the badge and draw the count in the product. Hours.
- **Feed:** story labels truncate ("LagosRe…", "Property…") where the render fits full names. **Low.** Drop the label to `--nf-text-overline` and allow nine characters. Hours.
- **Search card:** the spec row ends in a bare "+1" with no meaning. **Low.** Print the third spec (sqm) or drop the counter. Hours.
- **Assistant:** the thread top-aligns, leaving ~500 device px of empty navy above the composer; "Thinking…" reads as an empty avatar. **Low.** Bottom-align the scroller; give the pill a three-dot pulse. Hours.
- **Landing:** "Join VALLO Today" and "Join VALLO" are two CTAs on one page. **Low.** One label. Hours.
- **Booking card:** the "3 nights" chip is a flat navy fill where the render outlines it. **Low.** Add `--nf-brand-edge`. Hours.
- **Filters:** "₦350,000,000+" and "No upper limit" say the same thing twice. **Low.** Keep one. Hours.
- **Wallet:** "Send" in the balance row and "Send Money" in quick actions are the same destination named twice, 300px apart. **Low.** The render has the same duplication; a funded team would resolve it. Hours.
- **Drawer:** the heading reads "WORKSPACES" where the render reads "WORKSPACE". **Low.** Hours.

### A40. Every route logs a hydration mismatch on the three before-paint scripts
- **EVIDENCE:** my own dev log. React diff: `+ nonce="uXXrYBsBh6ml6NvIOdFKXw=="` against `- nonce=""` on three `<script dangerouslySetInnerHTML>` elements in `<body>`. Source: `apps/web/src/app/layout.tsx:263, 283, 304` render `<script nonce={nonce}>`; `suppressHydrationWarning` is on `<html>` at `:229`, which does not reach descendants. This is what the "2 Issues" badge in `docs/design/proofs/f5/inbox-390-dark.png` is showing, and it will be on every page.
- **SEVERITY: medium**, high as noise: it hides real hydration bugs behind a permanent false positive, and it appears in a shipped proof.
- **FIX:** add `suppressHydrationWarning` to each of the three `<script>` elements at `layout.tsx:263, 283, 304`. React deliberately does not serialise `nonce` to the client, so the two trees can never agree and this is the sanctioned suppression. Hand to whoever owns `layout.tsx`.
- **EFFORT:** hours. Also in the same log: `/brand/vallo-mark.png` warns that width or height was modified without the other (add `style={{ width: "auto" }}`), and `/brand/photos/resort-pool-deck.jpg` is the LCP and wants `loading="eager"` plus `priority`. Both touch the third edition's image stop-list rule.

---

## 3. ELEGANCE RECOMMENDATIONS, ranked

All inside the token laws: one blue family, named curves, reduced-motion completeness, one ambient animation per viewport, no raw colours.

**E1. Let the lit edge travel round the object.** The token layer already holds `--nf-edge-stride-base/-lit/-peak` and its own comment says why: real glass runs quiet, catches hard for a short run, then goes quiet. Nothing consumes them as a gradient today, so every ring is even. Give `.nf-glass--card` a `::before` ring painted `conic-gradient(from var(--nf-edge-angle), base, lit 12%, peak 18%, lit 24%, base 40%, base 100%)`, `--nf-edge-angle` seeded per card so no two catches land in the same place. **The single cheapest change that will make a grid of eight cards look photographed rather than drawn.** Half a day.

**E2. Declare the light source once.** Put `--nf-light-x: 30%` and `--nf-light-y: -10%` on `:root` and have every `--nf-glow-edge` consumer offset its bloom from them. Today each shadow is centred on its own box, which is why a screenful of lit cards still reads flat: there is no sun. Half a day.

**E3. Give every control a press with physics.** `:active` sinks 1px, drops 2px of bloom and adds 4 per cent fill over 90ms on `--nf-ease-out`, then springs back over 220ms on `--nf-ease-spring`. Reduced motion keeps the fill and drops the travel. One rule in `controls.css` reaches every button, chip and row, and it is the difference between a page and a thing you are touching. Hours.

**E4. Light the surfaces up as you scroll to them.** On entering the viewport a card runs its ring from `--nf-edge-stride-base` to `--nf-edge-stride-peak` and back over 700ms, staggered 40ms down the column. The screen lights as you arrive instead of arriving pre-lit. Put it in the `Reveal` the landing already uses and the in-app lists get it free. Reduced motion renders the final state. Half a day.

**E5. Make verification land rather than sit.** `glass.css` already promises this in a comment ("a shield that pulses once when verification lands") and nothing fires it. When a Verified mark first enters a viewport, pulse the ring once, scale 1 → 1.04 → 1 over 420ms on `--nf-ease-spring`, and draw the tick in with a 180ms `stroke-dashoffset`. Once per viewport, never a loop. Trust is the product's whole promise and it currently arrives silently. Half a day.

**E6. Fan the bloom on a tangent and dim the world behind it.** Covered as a gap in A25 because the render demands it; the elegance is the detail — 45ms stagger, each lozenge on its tangent, the plus turning 45 degrees into a close, and a 6px backdrop blur behind so the three read as glass over a page that is still scrolling. Done properly this is the screenshot people send.

**E7. Give the dock's travelling pill a wake.** When the active slot moves, trail a 120ms fading copy of the pill's bloom behind it. One pseudo-element, `--nf-ease-out`. It is the one gesture everybody performs many times a day and it should feel expensive. Hours.

**E8. Count the stats up.** On the landing stats band, count 0 → n over 900ms on `--nf-ease-out` with `font-variant-numeric: tabular-nums` so the row never reflows. The numbers are real and read live, which is the band's whole claim, and watching them arrive is what makes somebody believe it. Reduced motion prints the final value. Hours.

**E9. One money primitive, one money voice.** A34 fixes a defect; the elegance is that the same primitive carries A3's compact decision, tabular numerals everywhere, and a 220ms cross-fade when a figure changes (a filter count, a move-in total, a wallet balance after a transfer). Money that animates when it changes and never when it does not is the most reassuring detail a payments product can have. Hours on top of A34.

**E10. Make the flip coin tease before it turns.** On hover, or on a 12px drag, rotate the drawer coin 18 degrees on Y with a specular sweep and reveal a sliver of the other face; on press, a 540-degree spin that lands on the destination mark and hands straight to the flip. The ledger calls it the star of the drawer and it is static, unlit and below the fold. A18 gets it on screen; this makes it worth getting there. Half a day.

**E11. Light the row you came from.** The drawer row matching the current route takes the brand-filled pill the render gives "Home". One line of state, and the drawer stops being a flat list and starts telling you where you are. Hours.

**E12. One scrim utility, applied by the frame.** A6 needs it; the elegance is making it impossible to forget. Put `.nf-photo-scrim` inside `MediaFrame` and have the frame apply it whenever it is given children, so no future surface has to remember and no future worker ships text on a sunset.

**E13. Let photographs arrive.** `next/image` with `placeholder="blur"` and a blurDataURL generated from each plate's dominant blue, plus a 320ms 1.02 → 1 scale settle. The photography is this product's best asset and it currently pops in. Reduced motion skips the scale, keeps the fade. Half a day including the hashes.

**E14. Give every empty state a next move.** Today an empty list is a sentence on navy. One `EmptyPanel` shape: the glass object, one line of what will appear here, and one lit control that creates the first one. Saved with nothing saved offers Explore; Trips with no trips offers Stays; Inspections with none offers Book an inspection. It is the screen a new account sees most. Half a day.

**E15. A skeleton in our own language.** Replace grey shimmer with the card's rim at `--nf-edge-stride-base` and a slow brand sweep across the fill over 1400ms. Grey shimmer is the one place this app currently looks like every other app. Half a day.

**E16. A signature on every section head.** A `::after` hairline under each section head, lit for its first 40px: `linear-gradient(90deg, var(--nf-brand-edge) 0 40px, var(--nf-border-subtle) 40px)`. Free, and it is what will make Notifications, Trips and the agent console read as the same product as the feed without redesigning any of them. Hours.

**E17. Make the placeholder ours.** Replace the grey moon and fence with the Vallo mark at 6 per cent over `--nf-brand-tint-1` and a single lit rim, with the caption in the row below rather than a pill over the plate. A placeholder is seen more often than any hero and ours looks unfinished. Hours.

**E18. Ring the bell once, and only when it means something.** `glass.css` names this too. A single 420ms swing on the bell object and a scale-in on the dot when an unread actually arrives. Once, never on a loop, which is rule 10's "nothing loops for its own sake". Hours.

**E19. Let the glass objects catch the pointer.** A 3-degree parallax tilt toward the pointer or the device tilt, damped, capped, one object per viewport, off under reduced motion. On the home grid, the stays hero object and the wallet object this is what makes them read as objects rather than pictures of objects. Half a day, and test on a mid-range Android before it ships.

**E20. Design daylight rather than deriving it.** The light theme currently loses the product's signature: the search grid's white cards carry no brand ring at all (`docs/design/proofs/f3/search-390-light.png`), and the VALLO wordmark is the dark-theme chrome artwork with a dark halo on white. Paper does not need a bloom but it does need the outline, which the light `--nf-glow-edge` already provides and which these cards are not wearing. Put every card on `.nf-glass--card` in both themes, ship a paper twin of the lockup, and give the light theme one thing dark does not have: a brand-tinted paper ground (`--nf-paper-50` mixed 3 per cent with brand, no warm tint) so the white cards sit on something rather than on nothing. Half a day.

---

## 4. HIS FIVE COMPLAINTS, CHECKED HONESTLY

| His complaint | Genuinely resolved? |
| --- | --- |
| "Our containers are dull." | **Partly.** `--nf-glow-edge` exists, is right, and reached `.nf-glass--card`, `.nf-glass--tile` and `.nf-icon-btn`. It did **not** reach `.nf-icon-tile`, the filter chips, the landing's ghost CTA and city chips, the glass secondaries or the admin row controls, all of which still carry `--nf-glass-border` at 11 per cent white. See A5, which names the file and the line. |
| "Change the bottom nav capsule to the branding colour." | **Cannot confirm.** The only dock proof on disk is 18 Sept 22:20, before the change, and I could not re-shoot. Needs one shot before anyone claims it. |
| "Retire all our buttons colours to this new one, really shiny." | **Partly.** The primary rests in its own bloom and looks right everywhere I shot it. The glass secondary is still a grey-hairlined plate on the landing hero, the filter sheet, the booking card, the stay page, the inspection card, the post thread, the inbox and the admin rows. See A5. |
| "The resting glow belongs in the inner containers of the icons." | **No, not where it matters most.** `.nf-icon-btn` has it. `.nf-icon-tile` — the plate behind every glass object in every list row, which is the plate he photographed — still has `border: 1px solid var(--nf-glass-border)` and neutral `--nf-elev-1` at `glass.css:1120`. See A5 step 1. |
| "The icon plate was a near-black square on paper." | **Changed as asked, still not right.** `--nf-icon-ground` is now 62 per cent brand mixed with `--nf-ink-950`, which is deep navy rather than near-black, and the comment above it quotes his word and explains the reversal. On paper it still reads as a dark chip punched into a white card, and it now disagrees with the lavender Payment Methods plate on the same screen. See A23, marked RE-VERIFY. |

**Unprompted, and he should know it: the content truth sweep did land.** The Invest segment is gone from the search pill, the overline names Restaurants, and the stats band carries 64 / 6 / 4 read live rather than the render's invented 10K+ and 200+. Every landing proof currently on disk still shows the old four-segment pill, so anyone reading those files will believe the opposite.

---

## 5. STILL OPEN FROM F6's AUDIT OF THE SAME DAY

Verified against my 16:03 shots: fault 2 (admin All chip, **RE-VERIFY**), fault 3 (pill collision on the no-photo card, **still open**), fault 7 (invest copy over the photo, **still open**), fault 8 (assistant starter cut mid-word, **still open**), fault 10 (trips Cancel and date wrap, **still open**), fault 11 (console badge 41 vs 42, **still open**), fault 12 (stay spec strip wrap, **still open**), fault 13 (listing pinned bar over the amenity rail, **still open**). Fault 1 (the harness paints no `backdrop-filter`) is a harness fault and it changes how every proof in this repository should be read.

---

## 6. WHAT SHOULD HAPPEN NEXT, in order

1. **A5 step 1** — one line in `glass.css:1120`. It is the highest ratio of change to effort in the whole audit and it lifts a dozen surfaces at once.
2. **A1 / A27** — the pinned-bar reservation, one token, two surfaces, two critical faults closed.
3. **A2 / A3 / A4** — the three remaining criticals, all on the catalogue and assistant paths.
4. **A12 and A14** — the identity mark and the swapped glyphs, because both are cheap and both are teaching people the wrong thing today.
5. **Re-shoot the dock, the flip, and the four light twins** before anyone marks a scope closed on them.

**Not done, stated plainly:** I could not write the findings file (harness refusal); I could not re-shoot the dock, the flip, or the light twins of settings, profile, admin queue and stays; I did not assess crypto, restaurants, saved, host wizard, receive, transactions or the remaining nine agent surfaces; and the desktop 1280 twin was not captured at all.
