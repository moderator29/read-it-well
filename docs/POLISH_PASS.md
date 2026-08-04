# The small-item pass

Written 2026-08-04 by the lead, on the owner's instruction, replacing the
remaining 28 items of `docs/agent1-selection.md`.

The first 22 shipped items were features: reviews, payouts, capacity, utilities,
the admin console, booking for somebody else. The 28 still ranked were the same
shape, and the owner has called it. **From here the work is small upgrades, not
heavy features.**

Every item below is drawn from the real pool: the numbered items in
`docs/recommendations-inbox.md`, cited as `#N`, and `RECOMMENDATIONS.md` as
`R-NN`. Nothing here is invented. The three at the end marked FOUND are defects
this team turned up while building, which belong in a small-item pass by size
even though nobody put them in the pool.

## The rule

**Nothing here adds a table. Nothing here adds a screen.** If an item seems to
need a migration, it is in the wrong list: say so and move on.

Verification does not relax, it changes shape. A small item is proven when the
change is real on the surface, it holds in BOTH themes, it holds at 390px and at
desktop, and a spec or a screenshot stands behind it. "It looks better" is not a
verification. For a structural change with no visible surface (focus traps,
`inputmode`, accessible names) the spec IS the proof.

**Batch by tier.** These are five-minute changes with ten-minute verifications;
one commit each would waste the day.

---

## Tier 1: money and dates read wrong

The most valuable small items on the platform, because every one of them is
about somebody deciding whether they can afford something.

| # | Item | Source |
|---|---|---|
| S1 | **Total price first**, nightly plus cleaning plus service, with a per-night toggle | #21 |
| S2 | **The price breakdown stays expandable at every step** of the booking wizard, not only the first | #37 |
| S3 | **Service charge and caution deposit as separate labelled figures**, never folded into one number | #232 |
| S4 | **Compact naira for glanceable UI** (`₦1.2m`) with exact kobo in every breakdown, all through `formatMoney` | #53 |
| S5 | **Localised number and currency formatting** per the four locale files already shipped | #235 |
| S6 | **Prefill search with smart default dates**, the upcoming weekend | #29 |
| S7 | **Cancellation policy as a visual timeline**, full refund until X, half until Y | #66 |

## Tier 2: not losing somebody's place

Every one of these is a person doing work the product then throws away.

| # | Item | Source |
|---|---|---|
| S8 | **Preserve full search state on back navigation** | #27 |
| S9 | **Keep search scroll position** when returning from a listing | #214 |
| S10 | **Persist the last chosen view**, list or map, per person | #155 |
| S11 | **Sync map viewport to the URL** (lat, lng, zoom), so a map link is shareable | #153 |
| S12 | **Recent-searches chips** under the search bar | #160 |
| S13 | **A recently-viewed rail** on home and search | #23 |
| S14 | **Undo window instead of a confirm dialog** on unsave and draft delete | #26 |

## Tier 3: states and messages

| # | Item | Source |
|---|---|---|
| S15 | **Every error message is what happened plus what to do next**, in plain language. A sweep, not one screen | #40 |
| S16 | **Every empty state offers a next action**: broaden filters, show nearby areas, create an alert | #35 |
| S17 | **Skeleton screens shaped like the real cards**, using the stride ring, not spinners | #41, #205 |
| S18 | **Status colour semantics locked into layer-2 tokens**: pending, approved, rejected, verified | #50 |

## Tier 4: the phone in somebody's hand

| # | Item | Source |
|---|---|---|
| S19 | **Sticky mobile booking bar** on listing detail: price, dates, action | #42 |
| S20 | **`+234` phone input mask** with carrier-aware validation | #33 |
| S21 | **The tab bar auto-hides on scroll down** and returns on scroll up | #212 |
| S22 | **Long-press quick actions on listing cards**: save, share, hide | #218 |
| S23 | **Haptic feedback** on save, book and send, where the device supports it | #213 |
| S24 | **Pull-to-refresh** on home, search and messages in the installed app | #211 |
| S25 | **A data-saver toggle** that disables the ambient canvas, grain and any autoplay | #20 |
| S26 | **`save-data` and connection-aware media**: smaller images and no Ken Burns on a slow link | #246 |

## Tier 5: search and map, small levers

| # | Item | Source |
|---|---|---|
| S27 | **A "search this area" chip** when somebody pans the live map | #154 |
| S28 | **A locate-me control** that centres on the person, with permission | #163 |
| S29 | **A listing preview card docked at the map's foot** when a pin is tapped | #164 |
| S30 | **Map and list hover synchronised**: a card highlight lights its pin and back | #36 |
| S31 | **Verified listings rank above unverified** at equal relevance | #158 |
| S32 | **Power and water filters in discovery.** The columns and their partial indexes exist; without the filter the data is a label, not a lever | ranked B-new-1 |

## Tier 6: reach

| # | Item | Source |
|---|---|---|
| S33 | **A visible focus ring**, in the stride treatment, on every interactive element | #146 |
| S34 | **An accessible name on every icon-only control** and 3D tile | #147 |
| S35 | **`aria-live` for form errors, result counts and booking status changes** | #149 |
| S36 | **Contrast audit of gradient text over glass**, both themes, against WCAG AA | #148 |
| S37 | **Alt text required on listing photos**, with inline guidance at upload | #150 |
| S38 | **Skip-to-map, and keyboard map controls**: arrow pan, plus and minus zoom | #247 |
| S39 | **Announce map pin counts and the selected city** via `aria-live` | #248 |

## Tier 7: weight and speed

| # | Item | Source |
|---|---|---|
| S40 | **Prefetch listing detail on card press-down** | #141 |
| S41 | **Self-host and preload the exact Inter subsets in use** | #145 |
| S42 | **Verify Leaflet is lazy** and no eager chunk survives the dynamic import | #245 |
| S43 | **Split `globals.css` into layered partials**: ambient, glass, buttons, motion, light | #226 |

## Tier 8: small delight, last

Only after everything above. Delight on top of a product that loses your search
position is an insult.

| # | Item | Source |
|---|---|---|
| S44 | **Odometer-roll digits** on the numbers band | #204 |
| S45 | **A `/styleguide` route** documenting tokens, glass, motion and the icon rules | #210 |
| S46 | **"You viewed this 3 days ago"** markers on cards | #219 |

## FOUND: not in the pool, but small and wrong

| # | Item | Why |
|---|---|---|
| F1 | **44px minimum on every interactive target, swept.** `PageHeader` was 36px and is fixed; nothing has checked the rest | A target under 44px misses on a phone |
| F2 | **Every overlay closes on Escape, traps focus, and locks body scroll** | An overlay you cannot escape by keyboard is a trap, and a page scrolling behind a sheet is the most common mobile bug there is |
| F3 | **Truncation sweep.** `grep` every `truncate` and `text-ellipsis` and justify each one out loud | Owner rule: never truncate a sentence. A handle in a tight row is fine; "Places on R..." is not |
| F4 | **Aspect-ratio boxes on every image** | Without one, every image load shifts the layout under somebody's thumb |

---

## Deliberately NOT in this pass

Heavy, and still ranked where they were in `agent1-selection.md`: seasons (#5),
diaspora currency (#6), WhatsApp share cards (#8, #31, #244), SMS fallback (#9),
escrow (#55), split pay (#89), blurhash and the image pipeline (#105, #138),
PostGIS (#104), corporate accounts (#96), the assistant's tool actions (#167).

Also not here: anything needing a migration, and anything needing a new route
except S45, which is documentation of what already exists.
