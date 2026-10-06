# Session 3: the route sweep, point by point

Generated from each agent's record of the 24-point checklist (north star section 12),
run per route in Chromium at 390, 768 and 1440, night and paper, on the route's real page
component with the fixture named in its row. **P** pass, **X** failed and fixed in this
sweep, **F** failed and still open, **·** does not apply. The denominator is 213 real routes
(every `page.tsx` under `apps/web/src/app`, excluding `(dev)` and `api`).

**Routes audited: 14 of 213.**

| Family | Audited |
|---|---|
| admin | 11 |
| assistant | 1 |
| inspections | 1 |
| messages | 1 |

| Route | By | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/admin/agents` | C1 | P | · | P | X | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/alerts` | C1 | X | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/bookings` | C1 | P | P | P | P | P | X | X | P | P | P | P | P | P | · | P | P | · | P | P | P | X | X | P | P |
| `/admin/bookings/reservations` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/examples` | C1 | P | P | P | P | P | P | X | P | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | X |
| `/admin/handbook` | C1 | P | · | P | P | X | P | · | · | · | P | P | P | P | · | P | P | · | · | P | P | P | P | P | X |
| `/admin/handbook/position` | C1 | P | · | P | P | X | P | · | · | · | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/admin/settings` | C1 | P | · | P | P | P | P | · | · | X | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/admin/staff` | C1 | P | · | P | X | X | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | X | X | P | X |
| `/admin/standing` | C1 | P | · | P | X | X | P | · | · | P | P | P | P | P | · | P | P | · | X | P | P | P | P | P | P |
| `/admin/switches` | C1 | P | · | P | P | P | X | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | X |
| `/assistant` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | X | P | P | P | P |
| `/inspections/gate/[id]` | C3 | P | · | P | P | P | P | · | P | · | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/messages/share/[kind]/[id]` | C3 | P | · | P | P | P | P | · | P | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |

## What failed, and what was done

**`/admin/agents`** (the real page inside the real AdminFrame. No fixture of an agent application exists in the repository, so the desk is measured in its honest empty state (getAgentApplications mocked to no rows); the application card and ladder were read in code)

- 4 (fixed): Each verification rung was a hand-drawn rounded-md box with the subtle border, a radius and ink no tier has; it is the Plate tier now (new .nf-admin-plate: radius 14, the plate wash and hairline, one edge).

**`/admin/alerts`** (the real page component inside the real AdminFrame, getRiskAlerts and getInventoryDriftAlerts mocked to bd/fixtures RISK_ALERTS and DRIFT_ALERTS)

- 1 (fixed): Every card's Mark resolved was a lit primary: 4 glows on one phone screen at 390. The opener is secondary now; the commit inside the sheet stays the primary.

**`/admin/bookings`** (the real page inside the real AdminFrame; getBookingsDesk mocked to the real buildBookings over the six rows lib/admin/reads/bookings.test.ts builds its desk from; the waiting count from bd/fixtures RESERVATION_REQUESTS)

- 6 (fixed): The per-day chart drew its axis words as SVG text in a 720-wide drawing, so at 390 every axis figure rendered at about 5px (seen on the screenshot; the size metric now multiplies SVG text by its drawing scale). The axis words are HTML at 12px now, placed by the same fractions, with every other x label stepping aside on a narrow card. Shared by the payments and supply desks' charts.
- 7 (fixed): The chart's y axis printed Math.round of quarter gridlines ("1" beside the 1.25 line, "3" beside 2.5): it now labels only whole counts. Figures tabular; money through formatMoney.
- 21 (fixed): Each stay's link was a 20px tall line (6 targets under 44 in every run); it is a 44px row now, at least 44 wide.
- 22 (fixed): The status bar wrote each state's word inside its segment and 3 of 3 were clipped at 390 and at 1440 in every locale; it now prints the count (the key under the bar names each state).

**`/admin/examples`** (the real page component inside the real AdminFrame, getExamplesConsole mocked to f5/ops-fixtures ADMIN_EXAMPLES with totals derived from those rows)

- 7 (fixed): Whole counts did not count up; ui.Stat now counts a whole-number value up (CountUp, eager), money and dates stay as given. Amounts through formatMoney, tabular.
- 22 (fixed): In Igbo the amount was pushed out of a 390px window (2 overflow findings: the row held a chip, the words, a second chip and the amount on one line). The row now wraps with the words kept at 12rem and the amount at the end of the second line.
- 24 (fixed): Went back to /admin past Settings; now /admin/settings.

**`/admin/handbook`** (the real page inside the real AdminFrame; requireConsole mocked to the support-staff preview's STAFF access (a support agent who has acknowledged); the handbook text is the real STAFF_HANDBOOK)

- 5 (fixed): Seven panels sat edge to edge; the console-wide stacked-panel gap now separates them.
- 24 (fixed): Went back to /admin past Settings; now /admin/settings (batch 1).

**`/admin/handbook/position`** (as /admin/handbook; the real JOB_DESCRIPTIONS)

- 5 (fixed): Panels edge to edge; the console-wide gap now separates them.

**`/admin/settings`** (the real page component inside the real AdminFrame (it reads nothing))

- 9 (fixed): Beside a two-line lede the trailing chevron was squeezed to a sliver (visible on 3 of 6 rows at 390); it is shrink-0 now. Icons are line glyphs in an IconPlate.

**`/admin/staff`** (the real page inside the real AdminFrame; readStaffDesk mocked to ok with no rows (no fixture of a staff row exists), key roster empty, internal-accounts table not installed)

- 4 (fixed): Support team rows were hand-drawn rounded-md boxes; now the Plate tier (.nf-admin-plate).
- 5 (fixed): Six panels sat edge to edge with no air (screenshot at 390 and 1440); the page is the console's stack now, and a console-wide rule gives stacked panels the same gap on every page that stacks them.
- 21 (fixed): The nine access-area checkboxes were hand-built labels the height of their text (20px targets); they are the shared Checkbox now, whose label is the 44px row (measured: 9 of 9 rows 44px). auditFit still names the 20px native box, which sits inside its 44px label.
- 22 (fixed): Put somebody on support: field and button shared one line at 390 and the field showed "The email on th"; the field keeps 16rem and the button wraps under it.
- 24 (fixed): Went back to /admin past Settings; now /admin/settings (batch 1, route-parents).

**`/admin/standing`** (the real page component inside the real AdminFrame, getStandingDesk mocked to f5/ops-fixtures ADMIN_GRANTS and ADMIN_BADGES)

- 4 (fixed): A form refusal was drawn in a one-off bordered, filled box (a fifth container); now the error-ink sentence every console form uses.
- 5 (fixed): The record's search sat above the grant form it does not narrow; now it sits under the record heading with the capped-search note beside it.
- 18 (fixed): With no grant on record the page drew only the empty state, and the grant form lives in the desk, so the first badge could never be granted from the desk whose empty copy says to grant it here. The form now always draws; the empty state is the record's and points at the form above.

**`/admin/switches`** (the real page component inside the real AdminFrame (AdminPreviewFrame), getFeatureFlags mocked to f5/ops-fixtures ADMIN_SWITCHES)

- 6 (fixed): A flag key the dictionary has not met was drawn raw and lower case ("social"); now sentence-cased from the key. Console-wide fourth weight (500) removed in the same batch.
- 24 (fixed): Went back to /admin past Settings, the door it is filed under in nav.ts ADMIN_SETTINGS; now /admin/settings (route-parents).

**`/assistant`** (the real page with readAssistantViewer mocked to _fixtures/people PERSON's initial and aiConsentForViewer both true and false; no thread (threads live on the device, so a first visit is empty))

- 20 (fixed): axe aria-prohibited-attr on arrival (1 at dark.390 and light.390): the thread was a div carrying aria-label with no role. It is a named region now.

**`/messages/share/[kind]/[id]`** (the real page signed in, loadConversationSummaries mocked to the three threads the f5 share-picker deck draws, resolveCard to f5 LISTING_CARD; and the signed-out door)

- 22 (fixed): Overflow was 0 in all four, but the page's eight strings were English literals in ha, ig and yo. They are in experienceInbox.share now.

