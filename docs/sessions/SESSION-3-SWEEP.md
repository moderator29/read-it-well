# Session 3: the route sweep, point by point

Generated from each agent's record of the 24-point checklist (north star section 12),
run per route in Chromium at 390, 768 and 1440, night and paper, on the route's real page
component with the fixture named in its row. **P** pass, **X** failed and fixed in this
sweep, **F** failed and still open, **·** does not apply. The denominator is 213 real routes
(every `page.tsx` under `apps/web/src/app`, excluding `(dev)` and `api`).

**Routes audited: 108 of 213.**

| Family | Audited |
|---|---|
| admin | 28 |
| agent | 24 |
| around | 5 |
| assistant | 1 |
| bookings | 2 |
| host | 17 |
| inspections | 1 |
| legal | 3 |
| messages | 2 |
| pay | 1 |
| price | 1 |
| profile | 6 |
| rent | 3 |
| restaurant | 1 |
| settings | 2 |
| stories | 2 |
| support | 4 |
| tenancy | 1 |
| u | 4 |

| Route | By | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/admin` | C1 | P | P | P | P | P | P | X | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/account-recovery` | C1 | P | · | P | P | X | X | · | · | · | P | P | P | P | · | P | P | · | X | P | P | P | P | P | P |
| `/admin/agents` | C1 | P | · | P | X | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/alerts` | C1 | X | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/analytics` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | X | X | X | P | P | P |
| `/admin/audit` | C1 | P | P | P | P | P | P | X | P | P | P | P | P | P | · | P | P | · | P | X | P | P | P | P | P |
| `/admin/bookings` | C1 | P | P | P | P | P | X | X | P | P | P | P | P | P | · | P | P | · | P | P | P | X | X | P | P |
| `/admin/bookings/reservations` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/businesses` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | X | · | P | P | P | X | P | P | P |
| `/admin/compliance` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/examples` | C1 | P | P | P | P | P | P | X | P | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | X |
| `/admin/handbook` | C1 | P | · | P | P | X | P | · | · | · | P | P | P | P | · | P | P | · | · | P | P | P | P | P | X |
| `/admin/handbook/position` | C1 | P | · | P | P | X | P | · | · | · | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/admin/kyc` | C1 | P | P | P | X | X | P | P | P | P | P | P | P | P | · | P | P | · | P | P | X | P | P | P | P |
| `/admin/listings` | C1 | P | P | P | X | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/listings/[id]` | C1 | P | · | P | P | P | X | P | P | P | P | P | P | P | · | P | P | · | P | P | P | X | P | P | P |
| `/admin/operations` | C1 | P | P | P | X | P | P | P | P | P | P | P | P | P | · | P | P | · | P | X | X | X | P | P | P |
| `/admin/payments` | C1 | P | X | P | P | X | P | P | P | P | P | P | P | P | · | P | P | P | P | P | P | X | X | P | P |
| `/admin/queue` | C1 | P | P | P | P | P | P | P | P | P | P | P | X | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/reference` | C1 | P | · | P | X | P | P | P | · | · | P | P | P | P | · | · | P | · | P | P | P | P | P | P | X |
| `/admin/settings` | C1 | P | · | P | P | P | P | · | · | X | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/admin/social` | C1 | P | · | P | X | X | X | P | · | · | P | P | P | P | · | X | P | · | P | P | P | X | P | P | P |
| `/admin/staff` | C1 | P | · | P | X | X | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | X | X | P | X |
| `/admin/standing` | C1 | P | · | P | X | X | P | · | · | P | P | P | P | P | · | P | P | · | X | P | P | P | P | P | P |
| `/admin/stops` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/supply` | C1 | P | P | P | P | P | X | X | P | P | P | P | P | P | · | X | P | · | P | P | P | P | P | P | P |
| `/admin/support` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | X | P | P | P | P | P |
| `/admin/switches` | C1 | P | · | P | P | P | X | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | X |
| `/agent/analytics` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | X | P | P | P | P | P |
| `/agent/analytics/[metric]` | C1 | P | P | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/analytics/listings/[listingId]` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/assistant` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/bookings` | C1 | P | P | P | P | P | P | P | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/dashboard` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/earnings` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F | P | P | P | P | P | P | P |
| `/agent/firm` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/inspections` | C1 | X | · | P | P | P | X | · | · | P | P | P | P | P | · | P | P | P | P | P | P | X | P | P | P |
| `/agent/list` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | X | P | P | P |
| `/agent/listings` | C1 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/agent/listings/[listingId]/arrival` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/listings/[listingId]/board` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | X | P | P | P |
| `/agent/listings/[listingId]/calendar` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | X | P | P | P |
| `/agent/listings/[listingId]/health` | C1 | P | P | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/agent/listings/[listingId]/mandate` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/listings/[listingId]/status` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | X | P | P | P |
| `/agent/messages` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/messages/[id]` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/agent/notifications` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/portfolio` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/reviews` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/settings` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/agent/verification` | C1 | P | P | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/around` | C3 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | · | X | · | P | P | P | X | P | P | P |
| `/around/[slug]` | C3 | P | · | P | P | P | P | P | P | P | P | P | P | P | · | P | X | · | P | X | P | P | P | P | P |
| `/around/manage` | C3 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | P | · | · | · | · | · | · | · | P |
| `/around/new` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/around/settings` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | X | P | P | P |
| `/assistant` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | X | P | P | P | P |
| `/bookings` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| `/bookings/[bookingId]/review` | C3 | P | · | P | P | P | P | · | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/host` | C5 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | X | X | P | P |
| `/host/apply` | C5 | P | · | P | P | X | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | X | P | P |
| `/host/arrival` | C5 | P | · | P | X | P | P | P | P | · | P | P | P | P | P | P | P | · | P | P | P | P | X | P | P |
| `/host/assistant` | C5 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | X | P | P |
| `/host/bookings` | C5 | P | · | P | P | X | P | P | · | P | P | P | P | P | P | P | P | X | P | P | P | P | X | P | P |
| `/host/calendar` | C5 | P | · | P | P | P | P | P | · | P | P | P | P | P | P | P | P | · | P | P | P | P | X | P | P |
| `/host/decide` | C5 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | X | P | P |
| `/host/earnings` | C5 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | X | P | P | P | P | X | P | P |
| `/host/earnings/statement` | C5 | P | P | P | X | P | P | P | P | P | P | P | X | P | P | P | X | X | P | X | X | P | X | P | P |
| `/host/notifications` | C5 | P | P | P | P | P | P | P | · | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/host/photos` | C5 | P | P | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | X | P | P |
| `/host/reservations` | C5 | P | P | P | P | P | P | P | · | P | P | P | P | P | P | P | P | · | P | P | P | P | X | P | P |
| `/host/reviews` | C5 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/host/rooms` | C5 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/host/settings` | C5 | P | · | P | P | P | P | · | · | P | P | P | X | P | · | P | P | · | P | P | P | P | X | P | P |
| `/host/start` | C5 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | P | · | · | · | · | · | · | · | P |
| `/host/transfer` | C5 | P | P | P | P | P | P | · | · | P | P | P | P | P | · | X | P | · | P | P | P | P | X | P | P |
| `/inspections/gate/[id]` | C3 | P | · | P | P | P | P | · | P | · | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/legal/disclaimer` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/legal/privacy` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/legal/terms` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/messages/new` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | · | P | · | P | P | P | P | X | P | P |
| `/messages/share/[kind]/[id]` | C3 | P | · | P | P | P | P | · | P | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/pay/crypto/[reference]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | X | P | P | P | P | P | P |
| `/price` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | X | P | P | P |
| `/profile/application` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/profile/setup` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/profile/setup/[role]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/profile/setup/agent` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/profile/setup/firm` | C3 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | P | · | · | · | · | · | · | · | P |
| `/profile/setup/owner` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/rent/move-in/[listingId]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | P | X | P | P | P |
| `/rent/pay/[inspectionId]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | X | · | P | P | P | P | P | P |
| `/rent/review/[paymentId]` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/restaurant/[id]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | P | P | X | P | P | P | P | X | P | P | P |
| `/settings/accessibility` | C3 | P | · | P | P | P | X | · | · | P | P | P | X | P | · | · | P | · | · | P | X | P | P | P | P |
| `/settings/region` | C3 | P | · | P | P | P | P | · | · | P | P | P | X | P | · | · | P | · | · | P | P | P | P | P | P |
| `/stories/[id]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | X | X | X | P | P | P |
| `/stories/new` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | X | P | P |
| `/support` | C3 | P | · | P | P | P | P | · | · | P | P | P | X | P | · | P | X | · | X | P | P | X | P | P | P |
| `/support/messages` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/support/messages/[id]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | X | P | X | P | P |
| `/support/new` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/tenancy/[id]/complaint` | C3 | P | P | P | P | P | P | P | · | P | P | P | P | P | · | X | P | · | P | P | P | P | P | P | P |
| `/u` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | X | P | · | P | P | P | P | X | P | P |
| `/u/[handle]/edit` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | P | P | P | P | P | X | P | P |
| `/u/[handle]/followers` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | P | P | P | P | X | X | P | P |
| `/u/[handle]/following` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | P | P | P | P | P | X | P | P |

## What failed, and what was done

**`/admin`** (the repository's own preview of the overview (session-b/admin/overview), the real OverviewView in the real AdminFrame from its fixtures)

- 7 (fixed): At 1440 the naira KPI ("N18,450,000" at the viewport size) ran past its quarter-width tile (auditFit: label spills out of its control). The figure is capped by its own tile now (container query, 9.5cqi), so it fits at every width. Figures tabular through formatMoney.

**`/admin/account-recovery`** (the real page inside the real AdminFrame; requireAdmin mocked to a super admin whose client is lib/testing/fake-supabase answering no request (no fixture of a recovery request exists))

- 5 (fixed): The header's sub-line carried the whole eleven-sentence procedure, a wall of text above the form at 390. The sub-line now says what the desk is for, and the procedure, same words, is a numbered list in a "How a recovery runs" Card above the form.
- 6 (fixed): Each request's status opened its line as the raw lower-case column value; sentence case now.
- 18 (fixed): The empty list said "No requests." and nothing else; it is the console's empty state now, saying who opens a request and with what.

**`/admin/agents`** (the real page inside the real AdminFrame. No fixture of an agent application exists in the repository, so the desk is measured in its honest empty state (getAgentApplications mocked to no rows); the application card and ladder were read in code)

- 4 (fixed): Each verification rung was a hand-drawn rounded-md box with the subtle border, a radius and ink no tier has; it is the Plate tier now (new .nf-admin-plate: radius 14, the plate wash and hairline, one edge).

**`/admin/alerts`** (the real page component inside the real AdminFrame, getRiskAlerts and getInventoryDriftAlerts mocked to bd/fixtures RISK_ALERTS and DRIFT_ALERTS)

- 1 (fixed): Every card's Mark resolved was a lit primary: 4 glows on one phone screen at 390. The opener is secondary now; the commit inside the sheet stays the primary.

**`/admin/analytics`** (the real page in the real AdminFrame; the four analytics reads answer the session-b/admin/analytics preview's own props (read off that page's element); send-back reasons and internal ids read through their unconfigured paths)

- 19 (fixed): At 390 the refusals table set its reasons one word a line with the share pressed against the meter ("Comparables / too / old 8%"), and the thin-areas city sat against the bar. A long name now wraps on its own width with its state, city or share under it. 0 overflow, 0 clipped at 390, 768 and 1440.
- 20 (fixed): Both themes, 0 axe violations. The bar charts drew all four tick steps whatever the data, so a peak of 107 sat under a 200 line with the top half of the plot empty; niceTicks stops at the first tick that covers the peak (0, 50, 100, 150).
- 21 (fixed): The Count, Checks and Listings column heads sat over the meter's end instead of over the numbers: the visually hidden Share head was taken out of the grid, so the next head moved one column left. The Share head keeps its cell and hides only its words.

**`/admin/audit`** (the real page in the real AdminFrame; getAuditLog mocked to bc/fixtures AUDIT_ROWS (10 rows, one full page) and getAuditActivity counted from the same 10 rows over the reader's 30-day window)

- 7 (fixed): The day chart printed its ISO keys ("2026-09-18") on the axis, the peak and the tooltip: no other date on the console looks like that, and at 390 the axis label broke at its hyphen ("2026-09-" over "18"). TimeSeries now writes a Lagos day through formatDate in the reader's locale ("18 Sept"), each label kept whole. Counts are integers.
- 19 (fixed): At 390 the newest day's tooltip ("10 · 18 Sept") ran from 308 to 395px in a 390px window (auditFit overflow). A tip in the outer quarter of the plot now opens inwards from its column's edge: 0 overflow at 390, 768 and 1440. The 2 to 3 "cut by nf-panel" findings per run are the closed rows' JSON bodies (a closed <details> keeps its hidden layout): with every row opened (OPEN=1) the same runs measure 0 clipped.

**`/admin/bookings`** (the real page inside the real AdminFrame; getBookingsDesk mocked to the real buildBookings over the six rows lib/admin/reads/bookings.test.ts builds its desk from; the waiting count from bd/fixtures RESERVATION_REQUESTS)

- 6 (fixed): The per-day chart drew its axis words as SVG text in a 720-wide drawing, so at 390 every axis figure rendered at about 5px (seen on the screenshot; the size metric now multiplies SVG text by its drawing scale). The axis words are HTML at 12px now, placed by the same fractions, with every other x label stepping aside on a narrow card. Shared by the payments and supply desks' charts.
- 7 (fixed): The chart's y axis printed Math.round of quarter gridlines ("1" beside the 1.25 line, "3" beside 2.5): it now labels only whole counts. Figures tabular; money through formatMoney.
- 21 (fixed): Each stay's link was a 20px tall line (6 targets under 44 in every run); it is a 44px row now, at least 44 wide.
- 22 (fixed): The status bar wrote each state's word inside its segment and 3 of 3 were clipped at 390 and at 1440 in every locale; it now prints the count (the key under the bar names each state).

**`/admin/businesses`** (the real page in the real AdminFrame; getBusinessQueue mocked to p3/fixtures P3_BUSINESS (SUBMITTED) and P3_BUSINESS_APPROVED, waitingCount 1 (the SUBMITTED row))

- 16 (fixed): 0 banned phrases. Three rung details spoke database ("because the column refuses a zero", "The table trigger accepts this venue's spine", "fact strip renders empty") and the ladder note said "a restaurant on this spine"; now plain operator words with the same meaning.
- 21 (fixed): Labels present (each note has a label); the rung note's placeholder ran to a third line in a two-row field at 390 ("fail registration" cut at the field's bottom) and the decision note's to a fourth. The rung note has 3 rows and the decision note 4; both read whole at 390.

**`/admin/examples`** (the real page component inside the real AdminFrame, getExamplesConsole mocked to f5/ops-fixtures ADMIN_EXAMPLES with totals derived from those rows)

- 7 (fixed): Whole counts did not count up; ui.Stat now counts a whole-number value up (CountUp, eager), money and dates stay as given. Amounts through formatMoney, tabular.
- 22 (fixed): In Igbo the amount was pushed out of a 390px window (2 overflow findings: the row held a chip, the words, a second chip and the amount on one line). The row now wraps with the words kept at 12rem and the amount at the end of the second line.
- 24 (fixed): Went back to /admin past Settings; now /admin/settings.

**`/admin/handbook`** (the real page inside the real AdminFrame; requireConsole mocked to the support-staff preview's STAFF access (a support agent who has acknowledged); the handbook text is the real STAFF_HANDBOOK)

- 5 (fixed): Seven panels sat edge to edge; the console-wide stacked-panel gap now separates them.
- 24 (fixed): Went back to /admin past Settings; now /admin/settings (batch 1).

**`/admin/handbook/position`** (as /admin/handbook; the real JOB_DESCRIPTIONS)

- 5 (fixed): Panels edge to edge; the console-wide gap now separates them.

**`/admin/kyc`** (the repository's own preview of this desk (session-b/admin-review/[desk] with desk=kyc, its fixture rows and summary), which renders the real VerificationDesk in the real AdminFrame; the page's own filters and subject cards were read in code)

- 4 (fixed): Each review badge drew a ring and a glow (two edges); the ring alone now.
- 5 (fixed): The four figure tiles stacked one per row at 390, a whole screen before the first queue row; 2x2 on a phone and four across from 768.
- 20 (fixed): In light every review badge measured 1.04 to 1.05 to 1 (axe colour-contrast, 16 badges at 390): its ink mixed toward the on-brand white, which is white on paper too. It mixes toward the theme's primary text now: 0 violations in both themes.

**`/admin/listings`** (the repository's own preview of the desk (session-b/admin-review/[desk] with desk=listings), the real ListingsQueue and MandatesPanel in the real AdminFrame)

- 4 (fixed): Review badges drew a ring and a glow (fixed with /admin/kyc, review.css).

**`/admin/listings/[id]`** (the repository's own preview of the review page (session-b/admin-review/[desk] with desk=review), the real ListingReview and ReviewActionBar)

- 6 (fixed): The map's attribution drew at 10px (a raw size in review.css); it is the 12px overline token now.
- 21 (fixed): The photo strip scrolls sideways on a phone and could not be reached by keyboard (axe scrollable-region-focusable); it is focusable with the console's ring now. The walkthrough video's focus sits in its native controls, which draw their own ring; the walk reads the host and reports no ring, recorded rather than hidden.

**`/admin/operations`** (the repository's own preview of the desk (session-b/admin/operations), the real OperationsView from its fixtures)

- 4 (fixed): Every status badge drew a ring and a 6px glow (two edges); the ring alone now (console-wide).
- 19 (fixed): The jobs table was the desktop table squeezed into 358px: every cell broken a word a line and the status column past the panel's edge (1 clipped finding at 390). Below 768 it is self-naming rows now (name, then schedule, last run, duration, status, each with its label); the 5 remaining "clipped" findings are the visually hidden head, by design.
- 20 (fixed): On paper the solid Failed badge measured 2.67 to 1 (white on a pale rose); it fills with paper's deep error ink now. 0 axe violations in both themes.
- 21 (fixed): The sideways-scrolling table regions could not be reached by keyboard (axe scrollable-region-focusable); each is a labelled, focusable region with the console's ring now (jobs, notifications, and the front door funnel).

**`/admin/payments`** (the real page inside the real AdminFrame; the attempts from lib/admin/reads/payments.test.ts through the real buildPayments; bd/fixtures LOOKUP and SAVED_METHODS for the lookup; a health read with nothing unsettled (no fixture of an unsettled payment exists))

- 2 (fixed): The health figure (waiting on the provider) sat under the whole payments table; it opens the page now, with the unsettled detail beside it.
- 5 (fixed): Health, then the week's figures, the charts, every payment, the lookup.
- 21 (fixed): The outcome filters are links carrying aria-pressed, which axe refuses on a link (aria-allowed-attr, 3 nodes at 390); they say aria-current now, styled the same (the supply desk's examples toggle too).
- 22 (fixed): Saved card, account and terms rows held the words and the remove action on one line and squeezed the words to one a line at 390; the words keep 12rem and the action wraps.

**`/admin/queue`** (the repository's f5/admin-queue preview: the real QueueTable, QueueTabs and QueueFilters on ADMIN_ROWS inside AdminPreviewFrame (the real page reads eleven sources through requireConsole))

- 12 (fixed): The queue had no loading file and fell back to the overview's strip and KPI cards, a different shape from the table it becomes. queue/loading.tsx draws the console's QueueSkeleton (8 rows).

**`/admin/reference`** (the real page inside the real AdminFrame; the reference reads mocked to f5/ops-fixtures ADMIN_OCCUPATIONS, ADMIN_LOCAL_GOVERNMENTS, ADMIN_STATES)

- 4 (fixed): Every list row was a full glass Card (a stack of panels for a list); rows are the Plate tier now (.nf-admin-plate). The hand-drawn count boxes are the console's badge.
- 24 (fixed): Went back to /admin past Settings; now /admin/settings (batch 1, route-parents).

**`/admin/settings`** (the real page component inside the real AdminFrame (it reads nothing))

- 9 (fixed): Beside a two-line lede the trailing chevron was squeezed to a sliver (visible on 3 of 6 rows at 390); it is shrink-0 now. Icons are line glyphs in an IconPlate.

**`/admin/social`** (the real page inside the real AdminFrame; getSocialQueue mocked to nothing waiting (no fixture of a proposed place or a moderator application exists); the row markup was read in code)

- 4 (fixed): Three hand-drawn bordered count boxes and a hand-drawn uppercase Paused box; now the console badge and the shared StatusChip.
- 5 (fixed): This desk wrote its own header at h4 in a bare column, so it sat at a different width and two type tiers below every other desk; it is on the console frame now (nf-console, QueueHeader with the waiting count).
- 6 (fixed): The Paused label was uppercase by class; the StatusChip draws it in sentence case.
- 15 (fixed): "Nobody is watching this place" was in --nf-state-warning, the pending cyan, which says "on its way"; it is the error ink now.
- 21 (fixed): Each open place's name link was a 20px line; it is a 44px row with the name truncating inside it.

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

**`/admin/supply`** (the real page in the real AdminFrame; getSupplyDesk through the real buildSupply over lib/admin/reads/supply.test.ts's inputs; getFirmRosters through the real rostersFromRows over supply-firms.test.ts's rows; the demand board empty (no fixture))

- 6 (fixed): The growth chart's series names were SVG text in a 380-wide drawing, drawn at 9.9 to 10.2px (5 elements under 12px at 390 and 1440, measured with the drawing's scale), and the donut's Total caption at 11.9px. The series names are HTML at 12px beside the legend from 30rem up; the donut caption is drawn at 13px.
- 7 (fixed): The growth chart labelled quarter gridlines with rounded counts; whole counts only now. Money through formatMoney.
- 15 (fixed): An unverified account was drawn with a red cross and "No", as if a check had failed; it reads quietly now with no glyph (a null never looks negative).

**`/admin/support`** (the real page inside the real AdminFrame; getSupportQueue and getSupportTicketDetail mocked to support-staff/fixtures ROWS and detailFor (the refund ticket open, escalations installed))

- 19 (fixed): At 1440 the internal-note form ran 8px past its card in the narrow side column (4 overflow findings, the scope select's longest option set the grid's width); the form's column shrinks now (shared NoteForm, used on every desk with notes).

**`/admin/switches`** (the real page component inside the real AdminFrame (AdminPreviewFrame), getFeatureFlags mocked to f5/ops-fixtures ADMIN_SWITCHES)

- 6 (fixed): A flag key the dictionary has not met was drawn raw and lower case ("social"); now sentence-cased from the key. Console-wide fourth weight (500) removed in the same batch.
- 24 (fixed): Went back to /admin past Settings, the door it is filed under in nav.ts ADMIN_SETTINGS; now /admin/settings (route-parents).

**`/agent/analytics`** (The real page inside the real AgentShell (now with AgentInnerNav), a signed-in approved agent from f5/ops-fixtures AGENT_PROFILE, every read without a fixture answered empty by lib/testing/fake-supabase; readAgentAnalytics mocked to AGENT_ANALYTICS; funnels, requests, demand and stages answered empty)

- 19 (fixed): In Hausa the money-per-month chart's screen-reader table ran 76px past a 390px window (10 overflow findings): a table sizes to its content whatever width sr-only gives it. The shared ChartTable now sits inside a 1px sr-only box when hidden, as the admin charts' tables do.

**`/agent/earnings`** (The real page inside the real AgentShell (now with AgentInnerNav), a signed-in approved agent from f5/ops-fixtures AGENT_PROFILE, every read without a fixture answered empty by lib/testing/fake-supabase; readAgentEarnings mocked to AGENT_EARNINGS (audit only: C2's surface))

- 17 (open): The empty state (agentEarnings.emptyTitle, emptyBody) and the how-it-works note (howBody) are money sentences in the dictionary, not lib/money/copy.ts, and howBody contradicts the file's docstring. Handed to the lead as c1/agent-earnings-money-copy.patch (EARNINGS_EMPTY_TITLE, EARNINGS_EMPTY_BODY, EARNINGS_SETTLEMENT); not applied, C2's file.

**`/agent/inspections`** (The real page inside the real AgentShell (now with AgentInnerNav), a signed-in approved agent from f5/ops-fixtures AGENT_PROFILE, every read without a fixture answered empty by lib/testing/fake-supabase; readInspectionsForLister mocked to AGENT_INSPECTIONS)

- 1 (fixed): Before a time was agreed the sheet drew two lit primaries (Confirm and Add photos, two glows at 390). Add photos is secondary until the report opens; Confirm is the one primary.
- 6 (fixed): Title case in the shared inspection sheet: Inspection Date, Inspection Checklist, Overall Condition, Add Photos, Submit Inspection Report, "0 / 8 Completed" and the hero's "Property Inspection"; all sentence case now (and "0 of 8 done").
- 21 (fixed): The facts block was a dl whose groups held a glyph and a nested div (axe definition-list and dlitem, 9 findings at 390); it is label and value cells now. The hidden photo input had no name (axe label); it is named.

**`/agent/list`** (The real page inside the real AgentShell (now with AgentInnerNav), a signed-in approved agent from f5/ops-fixtures AGENT_PROFILE, every read without a fixture answered empty by lib/testing/fake-supabase; a new listing (no draft))

- 21 (fixed): The unit-shape tiles ("Flat") measured 33.1px wide in every run (40.6 in Hausa), under the 44px target; the agent wizard's question tiles keep 44px now (UnitQuestions and ServiceQuestions).

**`/agent/listings`** (The real page inside the real AgentShell (now with AgentInnerNav), a signed-in approved agent from f5/ops-fixtures AGENT_PROFILE, every read without a fixture answered empty by lib/testing/fake-supabase; readMyListings mocked to AGENT_LISTINGS)

- 22 (fixed): In Yoruba the row's close action reads "Tì" and measured a 38.8px target at 390; the button keeps 44px whatever its label.

**`/agent/listings/[listingId]/board`** (The real page inside the real AgentShell (now with AgentInnerNav), a signed-in approved agent from f5/ops-fixtures AGENT_PROFILE, every read without a fixture answered empty by lib/testing/fake-supabase; the board switch mocked on; no board fixture exists, so the owned-subject read answers empty)

- 21 (fixed): The rail's apply link (as on status), 1 finding at 1440, fixed in AgentNav.

**`/agent/listings/[listingId]/calendar`** (The real page inside the real AgentShell (now with AgentInnerNav), a signed-in approved agent from f5/ops-fixtures AGENT_PROFILE, every read without a fixture answered empty by lib/testing/fake-supabase; getListingCalendar mocked to o3/agent-calendar's SUBJECT with no nights (a new nightly listing))

- 21 (fixed): Each month was role=grid with no rows or gridcells (axe aria-required-children, 4 findings at 390); it is a group named by its month now, each night button naming its own date and state, the weekday heads hidden from the reader.

**`/agent/listings/[listingId]/status`** (The real page inside the real AgentShell (now with AgentInnerNav), a signed-in approved agent from f5/ops-fixtures AGENT_PROFILE, every read without a fixture answered empty by lib/testing/fake-supabase; no status-kit fixture exists, so the read answers empty)

- 21 (fixed): The rail's "Apply to list" link (drawn when no agent profile reads) measured a 32px box with the words broken over two lines at 1440; it is a block as wide as its words now (components/agent/AgentNav.tsx, every agent page).

**`/around`** (the real page signed in with no place joined, so the everywhere feed: f4 FEED_POSTS (placed nowhere) and f4 FEED_STORIES; author tiers left as the fixture has them)

- 16 (fixed): The empty state's title and action were English literals in the page; they come from experienceSocial.around now.
- 21 (fixed): The location bar's tap target came to 42px: its ::after assumed the 33.4px border box but measures from the padding box inside the 1px edge. It is a centred 44 now (social-feed.css).

**`/around/[slug]`** (the real page with getArea answering sweep-orphans AREAS[1] (Surulere: just opened, one member, no posts, no blurb, no moderators), the state the page is designed around, once as a member and once signed out, with the empty feed, stories and reviews the reads return for a place with no posts (no fixture holds posts placed in Surulere, so none were borrowed); and the unconfigured answer)

- 16 (fixed): Four English literals in the page (the title, the unreachable sentence, "Part of {name}" and the metadata) now come from experienceSocial.place.
- 19 (fixed): The district chip row bled 20px into a 16px gutter: at 390 it ran from -4 to 394, past both screen edges. It bleeds by the shell's gutter token now (social-feed.css), so 0 at 390.

**`/around/settings`** (the real page with session-b/sweep-orphans AREAS (open and mine), PROPOSALS, PICKER_TREE and PICKER_OPEN)

- 21 (fixed): Find people drew 21.7px tall: it takes nf-tap now, 0 under 44.

**`/assistant`** (the real page with readAssistantViewer mocked to _fixtures/people PERSON's initial and aiConsentForViewer both true and false; no thread (threads live on the device, so a first visit is empty))

- 20 (fixed): axe aria-prohibited-attr on arrival (1 at dark.390 and light.390): the thread was a div carrying aria-label with no role. It is a named region now.

**`/host`** (the real page in the real HostShell; the f5 host-landing deck verbatim (Grand Vista Hotel live, The Harbour Kitchen needing more with its reviewer's note, Ikoyi Guest House in progress, its room rows built relative to now by the deck's own row(), table board unread, three unread messages); the f5 host-empty state (no business); signed out (json host-f5-* and host-signed-out))

- 21 (fixed): 'Contact us' under a stopped business measured 32px wide for 82px of words (auditFit: label spills out of its control). Root cause, found with a style probe: the theme's `--spacing-block` makes Tailwind's `inline-block` ALSO emit `inline-size: var(--nf-gap-block)`, so every inline-block element is 32px wide. The link is `block w-fit` now. The collision is repo wide (17 files; AccessScreen.tsx records the same thing) and is reported to the lead.
- 22 (fixed): Overflow 0 in all four. The page wrote about 25 strings in English (metadata, Sign in, the draft's group and lines, 'Your businesses', the tier line, the three stopped-business explanations, the reviewer line, Contact us, the four doors); the status words were an English table in today.ts shared with HostTodayView. All in experienceHost now (businessStatus, businessDoors, home); the today.ts table is gone.

**`/host/apply`** (the real page inside its real RouteCopy layout and HostShell; readMyHostDraft mocked to the f5 host-wizard deck's draft (emptyHostDraft as a hotel) and the cancellation_policies read to its one Flexible policy; and signed out)

- 5 (fixed): The step summary read 'Step 1 of 11 Saved on this device as you type.': two sentences joined by a bare space. Joined with a middle dot now.
- 22 (fixed): Overflow 0 in all four. Metadata, 'Sign in' and 'Try again' were English; dictionary now.

**`/host/arrival`** (the real page in the real HostShell; getMyBusinesses and getPrimaryAccommodation mocked to (dev)/preview/c2 C2_HOTEL and C2_HOTEL_PROPERTY; readDeclaration to lib/stays/arrival-charges.test.ts `full` verbatim, and to none on record; no stays business; signed out)

- 4 (fixed): Each charge is a fieldset drawn as a card, and its legend was a RENDERED legend, which a browser paints on the fieldset's border: the card's edge ran straight through 'Caution deposit' and every other heading (screenshots before). The legend is floated, so it is an ordinary first row inside the card.
- 22 (fixed): Overflow 0 in all four. Metadata and Sign in were English; the dictionary's (afterTheGate.arrival.title, common.signIn) now.

**`/host/assistant`** (the real page in the real HostShell (immersive); no thread (threads live on the device), viewer initials from (dev)/preview/_fixtures/people PERSON, consent given, as C3 measured /assistant)

- 22 (fixed): Overflow 0 in all four. The metadata title was English; hostNav.assistant now.

**`/host/bookings`** (the real page in the real HostShell; readHostRoomBookings mocked to the (dev)/preview/host-c decide deck's three room requests verbatim as the waiting list (no fixture of an accepted or past room booking exists, so those sections are not drawn); no requests; signed out)

- 5 (fixed): Every card under 'Waiting for you' repeated 'Waiting for you' as its status line. The line is drawn only once something has moved (an agreement, a payment), so the heading says it once.
- 17 (fixed): Three money sentences were written in the route (the lede's payment sentence, 'Total the guest pays', 'The guest pays by card once it is approved.'). They are HOST_ROOM_BOOKING_PAYMENT, HOST_ROOM_TOTAL_LABEL and HOST_ROOM_GUEST_PAYS_NEXT in lib/money/copy.ts.
- 22 (fixed): Overflow 0 in all four. The page and RoomRequestAnswer were English throughout (about 40 strings: heading, lede, sections, status and agreement words, the accept and decline sheets, metadata). experienceHost.bookings now, threaded to the sheet as `words`; host-copy.test.ts's bookings ceiling (7) went to zero and the row was deleted.

**`/host/calendar`** (the real page in the real HostShell; readRateCalendar mocked to the host-c calendar deck (ROOMS, calendarRows(today), SYNC_READY) on c2 C2_HOTEL / C2_HOTEL_PROPERTY, because the host-c deck names no business record; signed out)

- 22 (fixed): Overflow 0 in all four. Metadata, the signed-out door, the title, the picker's label, the unreadable line and the no-room-types state were English; experienceHost.calendar now. host-copy.test.ts's ceiling (6) went to zero and the row was deleted.

**`/host/decide`** (the real page in the real HostShell; room requests from the host-c decide deck verbatim and its table request (tableRequest t1); and nothing waiting)

- 22 (fixed): Overflow 0 in all four. Metadata and the signed-out door were English; experienceHost.decide now. Ceiling (2) to zero, row deleted.

**`/host/earnings`** (the real page in the real HostShell; readMyEarnings answered with nothing paid (a zero summary and no rows), because no fixture of a host's earnings summary (my_earnings_summary) exists; and signed out. The populated rows are measured on /host/earnings/statement from host-c EARNINGS)

- 17 (fixed): 'No guest has paid yet' and the statement row's 'Every payment, line by line, with a CSV' were money sentences in the page; HOST_EARNINGS_EMPTY_TITLE and HOST_STATEMENT_ROW_SUB in lib/money/copy.ts now.
- 22 (fixed): Overflow 0 in all four. Metadata, the title, the signed-out title, Sign in, the next door and the statements label were English; experienceHost.earnings now. Ceiling (3) to zero, row deleted.

**`/host/earnings/statement`** (the real page in the real HostShell; readMonthEarnings mocked to host-c EARNINGS for September 2026 (the host-c statement deck) and to a month with none)

- 4 (fixed): The line cards (and the wide table's box) inside the paper sheet were painted with the theme's surface and edge: at night a navy card under the sheet's paper ink. They take the sheet's paper and its hairline now.
- 12 (fixed): No loading.tsx: it borrowed earnings' list-shaped wait. statement/loading.tsx now draws the month bar, the sheet and the actions.
- 16 (fixed): The signed-out door and the empty month said 'what Vallo kept', which reads as Vallo keeping money; they name the platform fee now (HOST_STATEMENT_SIGNED_OUT_BODY, HOST_STATEMENT_EMPTY_BODY).
- 17 (fixed): Those two sentences and the empty title were written in the route; lib/money/copy.ts now.
- 19 (fixed): At 768 the wide table lent its width to the sheet, so the sheet, the month bar and the actions ran 21px past the window (5 findings). The table box is `width: 0; min-width: 100%` and scrolls inside itself.
- 20 (fixed): axe at night: 52 colour-contrast failures, every line card's words at 1.04:1 (dark ink on the navy card). 0 now in both themes.
- 22 (fixed): Overflow 0 in all four. Metadata, the signed-out title and Sign in were English; experienceHost.statement. Ceiling (2) to zero, row deleted; StatementView's ceiling fell 6 to 3.

**`/host/notifications`** (the real page (HostShell around the (app) notifications page); loadNotificationPage mocked to (dev)/preview/f4 NOTIFICATIONS, which are already in the client's item shape, so toNotificationItem passes them through; unread counts none)

- 22 (fixed): Overflow 0 in all four. The route's only own string, the metadata title, was English; nav.notifications now.

**`/host/photos`** (the real page in the real HostShell; getMyBusinesses mocked to the p3 host-photos deck's venue (copied verbatim, it is declared inline there) and listBusinessPhotos to p3 P3_PHOTOS; and to no business at all)

- 22 (fixed): Overflow 0 in all four. The heading, the no-photographs sentence, metadata and Sign in were English literals, and the count was always English (countOf without a locale). All from the dictionary now, the count in the reader's locale.

**`/host/reservations`** (the real page in the real HostShell; readHostTableBoard mocked to p3 P3_TABLE_BOARD (two waiting, one coming up, one called off) and P3_EMPTY_BOARD)

- 22 (fixed): Overflow 0 in all four. 'Tables', 'Nothing is waiting on you.', 'Your venue', 'Try again', 'Sign in' and the metadata were English; the waiting count was always English. Dictionary now, count in the reader's locale.

**`/host/reviews`** (the real page in the real HostShell; readHostReviews mocked to (dev)/preview/host-c REVIEWS (four reviews: a replied one, an asked-Vallo one, a hidden one, a wordless one), to not-ready, and signed out)

- 22 (fixed): Overflow 0 in all four. The page and HostReviewsView wrote 16 strings in English (metadata, the signed-out door, the header, the empty and not-ready states, the rating card). They are in experienceHost now; host-copy.test.ts's ceilings for both files went to zero and the rows were deleted.

**`/host/rooms`** (the real page inside its RouteCopy layout and HostShell; getMyRoomTypes mocked to c2 C2_ROOM_TYPES and C2_ROOM_TYPES_NO_NIGHTS (the two c2 decks) on C2_HOTEL / C2_HOTEL_PROPERTY)

- 22 (fixed): Overflow 0 in all four. Metadata, Sign in, the title, the three count sentences and 'Add a room type' were English; experienceHost.rooms now, the counted phrase still through countOf in the reader's locale.

**`/host/settings`** (the real page in the real HostShell; the f5 host-settings deck's two businesses and notification answers; no ladder (no fixture of a business ladder exists, so the tier fan is not drawn))

- 12 (fixed): No loading.tsx; settings/loading.tsx now draws the head, the businesses card, the notifications card and the two doors.
- 22 (fixed): Overflow 0 in all four. Two English tables (kind and status words), the head, the doors, the unreachable line, the assistant door, the everything-else card and the metadata; experienceHost now (businessKind, businessStatus, businessDoors, settingsPage).

**`/host/transfer`** (the real page inside its real RouteCopy layout and HostShell; readTransferScreen mocked to f5 new-surfaces-fixtures (one business trading, one quiet with an offer out, one offer in))

- 15 (fixed): The deck's offers said status OFFERED, which business_transfers does not allow (PENDING, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED); the screen filters on PENDING, so the quiet business showed 'Hand it over' as if no offer were out. The fixture says PENDING now and the offer, its clock and Take it back draw.
- 22 (fixed): Overflow 0 in all four. Metadata and Sign in on the page were English; dictionary now.

**`/legal/disclaimer`** (none needed; the page reads lib/legal content only)

- 17 (open): Five Guarantee mentions remain though D51 retired it.

**`/legal/privacy`** (none needed; the page reads lib/legal content only)

- 17 (open): Six Guarantee mentions remain (the contribution in the payment split, Guarantee claims) though D51 retired it.

**`/legal/terms`** (none needed; the page reads lib/legal content only)

- 17 (open): Section 14 "The Vallo Guarantee" and the Guarantee contribution sentences in sections 4 and 9 still describe a retired product (D51: guarantee_bps = 0). 13 Guarantee mentions.

**`/messages/new`** (the real page signed in with findConversationForListing answering no thread yet, the listing repository returning f3 RENTAL, no viewing slots; and the signed-out bridge)

- 22 (fixed): Overflow 0 in all four, but every page and form string was an English literal in ha, ig and yo. They are in experienceInbox.newMessage now.

**`/messages/share/[kind]/[id]`** (the real page signed in, loadConversationSummaries mocked to the three threads the f5 share-picker deck draws, resolveCard to f5 LISTING_CARD; and the signed-out door)

- 22 (fixed): Overflow was 0 in all four, but the page's eight strings were English literals in ha, ig and yo. They are in experienceInbox.share now.

**`/pay/crypto/[reference]`** (no fixture of a crypto payment exists, so the honest not-found and signed-out states)

- 18 (fixed): Signed out showed the not-found sentence ("Open the charge from your bookings and start again") under Sign in, and Sign in went to a bare /sign-in, so the payer never came back to the payment. It now says why to sign in (cryptoPay.signedOutBody) and carries next=/pay/crypto/<reference>.

**`/price`** (the real page before an address is chosen, its one read (listStates) mocked to session-b/sweep-orphans STATES)

- 21 (fixed): The map's credit links (OpenStreetMap, CARTO) drew 20px tall: 2 targets under 44 at every width and locale. They take nf-tap now (target grows, the credit line keeps its size): 0 under 44.

**`/rent/move-in/[listingId]`** (the real page with the listing repository returning f3 RENTAL and its peers the f3 SHELF, no open inspection)

- 21 (fixed): The Back link drew 19.5px tall in every locale: it takes nf-tap now, 0 under 44.

**`/rent/pay/[inspectionId]`** (the real page with getRentPayView mocked to session-b/sweep-orphans RENT_VIEW, no saved card, crypto off)

- 17 (fixed): checkout.onPlatformRent said Money moves inside Vallo directly under NO_CUSTODY_SENTENCE (D48, D50). It is C2's copy, so it went as patch checkout-no-custody-onplatform.patch; the lead applied it.

**`/restaurant/[id]`** (the real page with listingById answering f3 RESTAURANTS[0] (The Lagoon Kitchen) as a catalogue listing built only from that card's own fields (title, area and city from its where, kind, amenities, hue); no stated price, no reviews, no photographs; getRestaurantDetail null (no business-grade fixture exists), so the hours card says there are none)

- 16 (fixed): The about sentence was assembled from English fragments ("is in", "and serves") and the share card's line was English; both come from experienceDetail.restaurant now, one whole sentence per case.
- 21 (fixed): The Restaurants link in Getting there drew 21.7px tall; it takes nf-tap now, 0 under 44.

**`/settings/accessibility`** (the real page and its new loading.tsx inside the real settings layout (SettingsAreaNav); it reads only the dictionary and the device's settings store)

- 6 (fixed): Weights were 400/600/650: the motion level names set 650, outside the system's 400, 600 and 700. They are 600 now (motion-pref.css).
- 12 (fixed): No loading.tsx: the route fell back to the generic (app) skeleton. It has its own now: header with line, lede, Seeing (three rows), Motion (three rows and its note), under the settings nav the layout keeps drawn.
- 20 (fixed): axe nested-interactive (1 at dark.390 and light.390): the replay button sat inside the preview's role=img. The image role is on the picture alone now, the button beside it: axe 0.

**`/settings/region`** (the real page and its new loading.tsx inside the real settings layout)

- 12 (fixed): No loading.tsx; it has its own now: header with line, Language (one row), Money display (three rows), under the settings nav.

**`/stories/[id]`** (the real page with f4 STORY, STORY_FACES and STORY_COMMENTS (the f4 story deck), measured inside the shell it is drawn in)

- 19 (fixed): The story cancelled the shell gutter with -1.25rem then -2rem, but the gutter token is 16, 24 and 32: a phone scrolled sideways by 4px and 768 to 1279 by 8px (the stage measured -4 to 394 at 390). It now cancels exactly var(--nf-pad-shell): 0 overflow at every width.
- 20 (fixed): Light: axe colour-contrast x7 at 1.08:1. The stage had no ground of its own, so until the photograph arrives (or if it never does on a slow network) the white words sat on paper. It takes --nf-overlay-media-deep, ink in both themes like the wash: axe 0.
- 21 (fixed): The author link measured 41.8px tall and the three liker faces 28px: they take nf-tap now, 0 under 44.

**`/stories/new`** (the real page with social on and listMyAreas mocked to session-b/sweep-orphans AREAS)

- 22 (fixed): Overflow 0 in all four, but the page's strings were English literals. They are in experienceSocial.newStory now.

**`/support`** (the real page and its new loading.tsx inside the support layout, signed in: support fixtures MY_TICKETS, the shell identity named from _fixtures/people PERSON's first name, no reports filed, no AI consent)

- 12 (fixed): No loading.tsx: it fell back to the (app) skeleton (a header over three cards). support/loading.tsx now draws the round back, the hero card with its action and three doors, the Messages group, the search panel and the rows.
- 16 (fixed): The greeting, the reply promise, the group labels, the legal rows, the hero's action and doors and the Messages row's words were English literals; all come from experienceInbox.support.home now (the hero and the row take a copy prop).
- 18 (fixed): Your reports with none filed drew an empty lit card, a 4px sliver, above its sentence. SettingsGroup draws no card when it has no rows (components/app/account/rows.tsx).
- 21 (fixed): Two sign-in links were hand-encoded; they use withNext (lib/auth/next-link) now. Measured targets were already 44.

**`/support/messages`** (the real page inside its real layout, loadMyTickets mocked to preview/support MY_TICKETS)

- 22 (fixed): Overflow 0 in all four, but the page's 11 strings were English literals. They are in experienceInbox.support.pages now.

**`/support/messages/[id]`** (the real page inside its real layout, loadMyTicket mocked to preview/support WAITING_TICKET with its messages and attachments, and RESOLVED_TICKET with its messages)

- 20 (fixed): axe list on arrival (1 at dark.390 and light.390): the day divider sat in <li role="none">, so the <ol> had a child that is not a list item. It is a plain <li> now; axe 0.
- 22 (fixed): Overflow 0 in all four, but the page's 9 strings were English literals. They are in experienceInbox.support.pages now.

**`/support/new`** (the real page inside its real layout as Report a problem, loadMyRelatedRecords mocked to preview/support RECORDS)

- 22 (fixed): The page's 7 strings were English literals; they are in experienceInbox.support.pages now.

**`/tenancy/[id]/complaint`** (the real page three ways: the pack for f3 TENANCIES[0] as preview/f3/tenancy-file.ts derives it (every value read from a committed fixture or computed by product code: ledgerFromListing on its own listing RENTAL, tenancyEnd, keptUntil, firstNameAndInitial; listStates mocked to sweep-orphans STATES so the real publicPlace runs), and the two honest states the read returns (not the tenant's file, read failed))

- 15 (fixed): Three untrue lines for an unpaid tenancy: the total was labelled Paid in total; Payments offered a receipt code to check a payment that does not exist; an unnamed lister read "the lister, lister." The label now follows file.paid (Move-in total, not paid in full), no receipts says No payment has settled against this tenancy yet with the code hint only once a payment exists, and an unnamed lister has its own sentence.

**`/u`** (the real page with findPeople's own ready answer: no query and nobody, and a query naming _fixtures/people PERSON and COUNTERPART (no badge, no occupation, no place, so nothing is claimed beyond the fixture))

- 15 (fixed): Every agent row drew a Verified agent tick from isAgent, which is a role (an approved agent at tier 0 has had no check). The type's own comment forbids it. The mark now comes from the published badgeTier through TierBadge, as on the profile; with no badge, nothing is drawn.
- 22 (fixed): Overflow 0 in all four, but 15 strings were English literals. They are in experienceSocial.people now.

**`/u/[handle]/edit`** (the real page with loadProfileEditor mocked to the editing state with f4 EDITOR_PROFILE and AREA_OPTIONS (what the f4 edit-profile deck draws))

- 22 (fixed): Overflow 0 in all four, but the page's 17 strings were English literals. They are in experienceSocial.editProfile now.

**`/u/[handle]/followers`** (the real page with getFollowList's own found answer naming _fixtures/people COUNTERPART and HOTEL's name as followers of PERSON, no badge and no bio)

- 21 (fixed): Each name link was 21.7px tall (2 targets under 44 at every width and locale). It takes nf-tap now, which grows the target with a centred transparent pseudo-element and keeps the drawing: 0 under 44.
- 22 (fixed): The metadata title was an English literal; experienceSocial.follows now.

**`/u/[handle]/following`** (the real page with getFollowList's own found answer and no one in it)

- 22 (fixed): The metadata title was an English literal; experienceSocial.follows now.

