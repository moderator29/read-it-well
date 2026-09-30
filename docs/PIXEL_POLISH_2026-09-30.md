# Pixel polish, 30 September 2026

This pass was measured, not eyeballed. A crawler in the scratchpad
(`scratchpad/pixel/crawl.mjs`) loads each main screen at 360, 390, 430, 820,
1180 and 1440, in light and dark. On every visible element it reads the
computed styles:

- type size and weight pairs, and text under 12px;
- the tracking on caps labels;
- line length in characters for reading paragraphs;
- headings that wrap without balance;
- figures that are not tabular;
- padding off the 4px grid;
- text within 12px of the screen edge;
- radii per element type;
- 1px border colours per theme;
- the distinct box shadows;
- image aspect ratio, fit and focal point;
- nested bordered cards;
- horizontal scroll;
- the gap between the last content and the dock at the end of a scrolled page;
- cumulative layout shift, from a `layout-shift` observer installed before the first paint.

It also saves a full-page screenshot. The routes:

- **Public:** `/`, `/about`, `/help`.
- **Member:** `/home`, `/search`, `/stays`, a listing, a stay, `/saved`, `/bookings`, `/messages`, `/notifications`, `/profile`, `/settings`, `/price`.
- **Workspaces:** `/host`, `/host/bookings`, `/agent/dashboard`, `/agent/listings`, `/agent/earnings`.
- **Admin, through its previews:** `/preview/f5/admin-overview`, `/preview/f5/admin-queue`, `/preview/f5/agent-dashboard`, `/preview/p3/host-reservations`.

The screenshots are in `scratchpad/pixel/before/`, `mid/` and `after/`. They are named `<route>__v<width>__<theme>.png`. The JSON reports sit beside them. `scratchpad/pixel/shot.mjs` takes single viewport or element shots, and `summarize.mjs` groups a report by finding.

## Findings

| # | Area | Finding (measured) | Where | Status |
|---|---|---|---|---|
| T1 | Type | The section label token was 11px. On `/` alone, 20 labels were under 12px. | `--nf-text-label` → 12/16 (`tokens.css`) | Fixed |
| T2 | Type | 11px, 10px and 12.5px literals: the profile, settings group labels, the inspection sheet (21), the side nav, desk headings, the social feed, the welcome tag, auth field counters, contact form warnings, the docs overline. | Each file reads `--nf-text-overline` / `--nf-text-label` | Fixed |
| T3 | Type | The listing card's facts, place, lister, price suffix and Example mark were 11px (on `/home` and `/search`, 60+ elements per shot). | `--nf-pcard-fact` → the 12px token (`catalogue.css`) | Fixed |
| T4 | Type | Stray weights 650 (20 rules) and 800 (in-app titles). The spec allows three weights per screen. | 650 → 600 and 800 → 600 in 18 partials (story headlines on photos → 700) | Fixed (dock, buttons and thread view left to their owners, see Open) |
| T5 | Type | Caps labels tracked at 0.03, 0.04, 0.06, 0.08, 0.09, 0.1, 0.12 and 0.14em, and the overline at 0.1em / 650. | `--nf-tracking-overline` → 0.06em. The overline is 600. Hand-rolled caps labels in 9 TSX files take `.nf-section-label` | Fixed |
| T6 | Type | No global wrapping rule: headings could orphan a word and paragraphs could widow. | `pixel.css` base layer: `text-wrap: balance` on h1 to h4 and the title roles, `pretty` on p, li, dd, blockquote, figcaption | Fixed |
| T7 | Type | Reading measure: `/help` answers ran to 87ch at 820+, Price Check's intro to 110ch at 1440, and listing paragraphs to 84 to 94ch at 820. | The help answers take `max-w-measure-body`. Price Check is capped at 768px. Listing paragraphs are held at 62ch (`pixel.css` T2) | Fixed |
| T8 | Type | A middle-dot separator could start a wrapped line. | A no-break space binds the dot to the word before it (viewing rows, arrival check, tenancy, stay, room types) | Fixed |
| T9 | Type | Title-case UI labels ("Add New Listing", "Log Out", "Account Information", "Quick Actions", 41 in all). Three-dot ellipses. | `en.ts`, values only. The inbox placeholder is committed | Fixed in the tree. The `en.ts` commit waits on another engineer's hunk in the same file |
| T10 | Type | Tabular figures | The crawler found no price or amount without `tnum`. Only a year ("2020") is proportional, which is correct | Clean |
| S1 | Spacing | The page gutter was a clamp: 16.5px at 390 and 17.2px at 430, so every phone card edge sat off the pixel grid (`offGrid` on `/` and `/search`). | `--nf-pad-shell` steps 16 / 24 (40rem) / 32 (80rem) | Fixed |
| S2 | Spacing | Ordinary card padding was 24px everywhere. The spec says 16 on a phone and 20 on desktop, and the list groups and tiles already beside them used 16. | `--nf-pad-card` 16, 20 from 40rem | Fixed |
| S3 | Spacing | The listing's amenity row bled by the page gutter inside a card, running 7px past the card edge at 1440. | The lead card pads with, and bleeds by, the card token | Fixed |
| S4 | Spacing | Dock clearance | At the end of every scrolled member page, the last element clears the dock by 16px or more at every width | Clean |
| S5 | Spacing | The settings group label had a 14px line under 12px caps. | `--nf-leading-label` | Fixed |
| A1 | Alignment | Figure tiles: a two-line label pushed that tile's figure 15px below its row neighbours (agent and host "Today"). | `pixel.css` A1: the head takes the spare height, and the glyph and door align to the first line | Fixed |
| A2 | Alignment | "conditioning" overran a fixed 68px amenity tile. | The tile is at least as wide as its longest word | Fixed |
| A3 | Alignment | The help search glyph touched the placeholder, with 0px between them. | 12px of air | Fixed |
| U1 | Surfaces | Two light hairlines, 17 19 24 / 8% and 11 13 23 / 8% (44 elements on the second). | `--nf-border-subtle` and `--nf-elev-1-border` read `--nf-card-border` | Fixed |
| U2 | Surfaces | The move-in cost list was six grey wells, one per row. | One grouped list with inset hairlines (spec section 5) | Fixed |
| U3 | Surfaces | On the hero band, the figure tiles (#040A1F) sat darker than the band (#08102C) and read as holes. | The raised surface, one step up (`pixel.css` S1) | Fixed |
| U4 | Surfaces | Radii per element type | One mismatch: `.nf-m-reveal` at 18 and 28, a landing frame by design | Clean |
| U5 | Surfaces | Content heads (`/help`, `/about`) in light drew dark ink on the dusk photo from 64rem, so the title was unreadable. | The on-ink whites from 64rem in both themes (`site.css`) | Fixed |
| I1 | Images | Listing cards are 4:3 on every route, stay cards 16:10, all `object-fit: cover` on the media ground colour. | | Clean |
| I2 | Images / CLS | `/saved` shifted 0.045 (0.048 at 360) when the "kept on this phone" note arrived after load. | The line is held invisibly while the copy is written. Measured 0 after the fix | Fixed |
| I3 | CLS | `/help` measured 0.256 once, on a cold compile. | Re-measured at 0 | Not reproduced |
| D1 | Desktop | Price Check stretched its form across 1112px at 1440. | Capped at 768px, like Settings (672) and Saved (768) | Fixed |
| D2 | Tablet | At 1180 x 820 the side rail's list ran under its pinned foot and cut "Settings" in half. | The list fades over its last 24px and has 24px of foot room (`pixel.css` D1) | Fixed |
| D3 | Tablet | 1180 landscape shows the side rail on member and workspace screens. The admin and agent previews lay out 2 and 4 across. | | Clean |

## Open, with owner and reason

| Item | Owner | Why it is not done here |
|---|---|---|
| The dock's tab label is 11px (`chrome.css` `.nf-tab__label`, `shell-m.css` `.nf-dockmore__*`), and the dock label weight is 650 / 750 | M1 (dock) | The dock is M1's |
| The button label weight is 650 (`buttons.css` `.nf-btn`) | Style pass (Button) | A primitive's decision |
| The listing and stay photo header buttons and the profile's settings gear are rounded squares. Section 17 asks for 44px circles | Style pass (headers) | A header primitive |
| The passcode lock's VALLO lockup sits left of the centred column (x 512 to 672 against a 720 centre at 1440) | Onboarding and auth (`AuthCurveBlock`) | Their component |
| Two glowing primaries on the empty host home ("Start an application" and "Start") | Details / style pass | One primary per view |
| Inbox at 1180 to 1440 is one 560px column. A two-pane list and thread would use the width. The header search button duplicates the search field | Gap-closer (thread view) | A layout change in their area |
| The listing at 1440 shows the phone's bottom action bar as well as the sticky side card with the same primary | Listing owner | A behaviour change |
| `.nf-gs-tag` (welcome) tracks 0.14em. The thread view's caps label tracks 0.14em. `member-loop.css` has 650 / 750 weights | Onboarding, gap-closer, details | Those files had uncommitted work in progress |
| About 190 on-scale arbitrary sizes (`text-[0.9375rem]` and similar) still trip `nf/no-arbitrary-font-size` as warnings | Anyone touching those files | No visual change. A tree-wide codemod across files others are editing is not worth the collision risk this week |
| The crawler's Chromium cannot reach Supabase directly (a certificate authority error through the proxy), so client-side realtime is absent in its screenshots | Environment | Server-rendered content is complete. The passcode lock is cleared by re-signing in |
