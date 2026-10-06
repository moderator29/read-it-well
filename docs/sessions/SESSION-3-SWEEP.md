# Session 3: the route sweep, point by point

Generated from each agent's record of the 24-point checklist (north star section 12),
run per route in Chromium at 390, 768 and 1440, night and paper, on the route's real page
component with the fixture named in its row. **P** pass, **X** failed and fixed in this
sweep, **F** failed and still open, **·** does not apply. The denominator is 213 real routes
(every `page.tsx` under `apps/web/src/app`, excluding `(dev)` and `api`).

**Routes audited: 213 of the 213** measured at the start of the sweep, plus 4 routes added since (`/join/[code]/start`, `/s/[token]/status`, `/settings/accessibility`, `/settings/region`): 217 records in all.

| Family | Audited |
|---|---|
|  | 1 |
| about | 1 |
| admin | 38 |
| agent | 24 |
| agreements | 2 |
| areas | 1 |
| around | 5 |
| assistant | 1 |
| auth | 1 |
| bookings | 3 |
| cancellations | 1 |
| careers | 1 |
| check | 1 |
| checkout | 2 |
| contact | 1 |
| delete-account | 1 |
| disclaimer | 1 |
| docs | 2 |
| email | 1 |
| eula | 1 |
| first-run | 1 |
| for-agents | 1 |
| for-hosts | 1 |
| for-landlords | 1 |
| forgot-password | 2 |
| guides | 2 |
| help | 1 |
| home | 1 |
| host | 17 |
| inspections | 1 |
| join | 2 |
| landlord | 1 |
| legal | 3 |
| listing | 2 |
| messages | 4 |
| move-in-cost | 1 |
| notifications | 2 |
| offline | 1 |
| pay | 1 |
| payments | 1 |
| post | 1 |
| price | 2 |
| privacy | 1 |
| profile | 7 |
| r | 2 |
| record | 1 |
| rent | 4 |
| reset-password | 1 |
| restaurant | 1 |
| restaurants | 1 |
| s | 2 |
| safe | 1 |
| safety | 1 |
| saved | 2 |
| search | 1 |
| settings | 25 |
| sign-in | 4 |
| sign-up | 4 |
| standards | 1 |
| stay | 1 |
| stays | 2 |
| stories | 2 |
| styleguide | 1 |
| support | 4 |
| tenancy | 2 |
| terms | 1 |
| u | 5 |
| verification | 1 |
| welcome | 1 |

| Route | By | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | C6 | P | P | P | P | P | F | P | X | P | P | P | P | P | · | P | P | P | · | P | P | P | P | P | P |
| `/about` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | X | · | P | P | P | P | P | P |
| `/admin` | C1 | P | P | P | P | P | P | X | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/account-recovery` | C1 | P | · | P | P | X | X | · | · | · | P | P | P | P | · | P | P | · | X | P | P | P | P | P | P |
| `/admin/agents` | C1 | P | · | P | X | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/agreements` | C1 | P | · | P | P | P | P | P | P | P | P | P | X | P | · | X | P | · | P | P | P | P | P | P | P |
| `/admin/alerts` | C1 | X | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/analytics` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | X | X | X | P | P | P |
| `/admin/audit` | C1 | P | P | P | P | P | P | X | P | P | P | P | P | P | · | P | P | · | P | X | P | P | P | P | P |
| `/admin/bookings` | C1 | P | P | P | P | P | X | X | P | P | P | P | P | P | · | P | P | · | P | P | P | X | X | P | P |
| `/admin/bookings/[bookingId]` | C1 | P | · | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| `/admin/bookings/reservations` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/businesses` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | X | · | P | P | P | X | P | P | P |
| `/admin/compliance` | C1 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/examples` | C1 | P | P | P | P | P | P | X | P | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | X |
| `/admin/fees` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | X | P | P | P | P | P | P | P | P | P |
| `/admin/field-speed` | C1 | P | · | P | X | P | P | P | P | P | P | P | P | P | · | X | P | · | P | P | P | P | P | P | P |
| `/admin/front-door` | C1 | P | P | P | P | X | X | P | P | P | P | P | X | P | · | P | P | · | P | X | P | P | P | P | P |
| `/admin/handbook` | C1 | P | · | P | P | X | P | · | · | · | P | P | P | P | · | P | P | · | · | P | P | P | P | P | X |
| `/admin/handbook/position` | C1 | P | · | P | P | X | P | · | · | · | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/admin/kyc` | C1 | P | P | P | X | X | P | P | P | P | P | P | P | P | · | P | P | · | P | P | X | P | P | P | P |
| `/admin/listings` | C1 | P | P | P | X | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/admin/listings/[id]` | C1 | P | · | P | P | P | X | P | P | P | P | P | P | P | · | P | P | · | P | P | P | X | P | P | P |
| `/admin/lookup` | C1 | P | · | P | P | P | P | · | P | P | P | P | X | P | · | X | P | · | P | P | P | X | P | P | P |
| `/admin/money` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F | P | X | P | X | P | P | P |
| `/admin/operations` | C1 | P | P | P | X | P | P | P | P | P | P | P | P | P | · | P | P | · | P | X | X | X | P | P | P |
| `/admin/oversight` | C1 | P | P | P | P | P | X | P | P | P | P | P | X | P | · | X | P | · | P | X | P | P | P | P | P |
| `/admin/payments` | C1 | P | X | P | P | X | P | P | P | P | P | P | P | P | · | P | P | P | P | P | P | X | X | P | P |
| `/admin/people` | C1 | P | · | P | P | P | P | · | P | P | P | P | X | P | · | P | P | · | X | P | P | P | P | P | P |
| `/admin/people/[id]` | C1 | P | · | P | X | P | X | · | P | P | P | P | X | P | · | X | X | · | P | P | P | P | P | P | P |
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
| `/agreements` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | X | P | P | P | P | P | P | P | P |
| `/agreements/[id]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | X | X | P | P | P | P | X | P | P |
| `/areas/[state]/[area]` | C6 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | P | P | P | P | P | P | P | P |
| `/around` | C3 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | · | X | · | P | P | P | X | P | P | P |
| `/around/[slug]` | C3 | P | · | P | P | P | P | P | P | P | P | P | P | P | · | P | X | · | P | X | P | P | P | P | P |
| `/around/manage` | C3 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | P | · | · | · | · | · | · | · | P |
| `/around/new` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/around/settings` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | X | P | P | P |
| `/assistant` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | X | P | P | P | P |
| `/auth/callback` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/bookings` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| `/bookings/[bookingId]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | X | P | P | P | P | X | P | P | P |
| `/bookings/[bookingId]/review` | C3 | P | · | P | P | P | P | · | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/cancellations` | C6 | P | · | P | P | P | P | P | P | P | P | P | P | P | P | P | P | X | · | P | P | P | P | P | P |
| `/careers` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | P | P | P |
| `/check` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/checkout` | C1 | P | P | P | P | P | X | P | P | P | P | P | P | P | P | P | P | P | P | P | P | X | P | P | P |
| `/checkout/[bookingId]` | C1 | X | P | P | P | P | P | P | P | P | P | P | P | P | P | P | X | P | P | P | X | P | P | P | P |
| `/contact` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/delete-account` | C6 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | P | X | · | · | P | P | P | P | P | P |
| `/disclaimer` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/docs` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/docs/[slug]` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | P | · | P | P | P | P | P | P |
| `/email/preferences` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | X | P | P |
| `/eula` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/first-run/[feature]` | C7 | P | · | P | P | P | P | · | · | P | P | P | · | P | · | · | P | · | · | P | P | P | X | P | X |
| `/for-agents` | C6 | P | · | P | P | P | P | P | P | P | P | P | P | P | · | P | P | X | P | P | P | P | P | P | P |
| `/for-hosts` | C6 | P | · | P | P | P | P | P | P | P | P | P | P | P | · | P | P | X | P | P | P | P | P | P | P |
| `/for-landlords` | C6 | P | · | P | P | P | P | P | P | P | P | P | P | P | · | P | P | X | P | P | P | P | P | P | P |
| `/forgot-password` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/forgot-password/code` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/guides` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/guides/[slug]` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/help` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | P | X | X | P | P | P | P | P | P | P |
| `/home` | C3 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | · | X | · | P | X | P | X | X | P | P |
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
| `/join/[code]` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | P | P | P |
| `/join/[code]/start` | C7 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | P | · | · | · | · | · | · | · | P |
| `/landlord/[token]` | C6 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/legal/disclaimer` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/legal/privacy` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/legal/terms` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/listing/[id]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | F | F | P | P | X | P | P | P | P |
| `/listing/[id]/trust` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | X | P | P | P |
| `/messages` | C3 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | P | X | · | P | P | P | X | P | P | P |
| `/messages/[id]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | X | · | P | P | P | X | P | P | P |
| `/messages/new` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | · | P | · | P | P | P | P | X | P | P |
| `/messages/share/[kind]/[id]` | C3 | P | · | P | P | P | P | · | P | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/move-in-cost` | C6 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | P | P | P | P | P |
| `/notifications` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | X | · | P | P | P | X | P | P | P |
| `/notifications/[id]` | C3 | P | · | P | P | P | P | · | P | P | P | P | P | P | · | P | X | · | P | P | P | X | P | P | P |
| `/offline` | C7 | P | · | P | P | P | P | · | · | P | P | P | · | P | · | · | P | · | P | P | P | P | P | P | P |
| `/pay/crypto/[reference]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | X | P | P | P | P | P | P |
| `/payments` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | P | P | P | P | X | P | P | P |
| `/post/[id]` | C3 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | · | X | · | · | P | P | P | P | P | P |
| `/price` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | X | P | P | P |
| `/price/area/[id]` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/privacy` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/profile` | C3 | P | · | P | P | P | P | P | P | P | P | P | P | P | · | P | X | · | P | P | P | P | X | P | P |
| `/profile/application` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/profile/setup` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/profile/setup/[role]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/profile/setup/agent` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/profile/setup/firm` | C3 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | P | · | · | · | · | · | · | · | P |
| `/profile/setup/owner` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/r` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/r/[code]` | C6 | X | P | P | P | P | P | P | P | P | P | P | X | P | · | P | P | · | P | P | P | P | P | P | P |
| `/record/[code]` | C3 | P | · | P | P | P | P | · | · | X | P | P | P | P | · | X | P | · | P | P | P | P | P | P | P |
| `/rent/move-in/[listingId]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | P | P | X | P | P | P |
| `/rent/pay/[inspectionId]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | X | · | P | P | P | P | P | P |
| `/rent/review/[paymentId]` | C3 | P | · | P | P | P | P | · | · | · | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/rent/share/[id]` | C1 | P | P | P | P | P | X | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| `/reset-password` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | P | P | P | P | P | P | P |
| `/restaurant/[id]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | P | P | X | P | P | P | P | X | P | P | P |
| `/restaurants` | C1 | P | · | P | P | P | P | · | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/s/[token]` | C7 | P | P | P | P | P | P | P | P | P | P | P | X | P | · | P | P | · | P | P | P | P | P | P | P |
| `/s/[token]/status` | C7 | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | P | · | · | · | · | · | · | · | P |
| `/safe/[token]` | C6 | P | · | P | P | P | P | · | · | P | P | P | X | P | · | P | P | · | P | P | P | P | P | P | P |
| `/safety` | C6 | P | · | P | P | X | P | · | · | P | P | P | P | P | P | P | P | X | · | P | P | P | P | P | P |
| `/saved` | C3 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | · | X | · | P | P | P | P | P | P | P |
| `/saved/searches` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | X | · | P | X | P | X | P | P | P |
| `/search` | C3 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | · | X | · | P | P | P | X | X | P | P |
| `/settings` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | X |
| `/settings/accessibility` | C3 | P | · | P | P | P | X | · | · | P | P | P | X | P | · | · | P | · | · | P | X | P | P | P | P |
| `/settings/account` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | P | P | X |
| `/settings/appearance` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/settings/devices` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | X |
| `/settings/devices/alert` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | P | P | X |
| `/settings/help` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | P | P | P |
| `/settings/interests` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | X | P | X |
| `/settings/invite` | C7 | P | P | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | P | P | P | P | P | P |
| `/settings/invite/how-it-works` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/settings/invite/referrals` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | P | P | P |
| `/settings/invite/referrals/[id]` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | P | P | P |
| `/settings/notifications` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/settings/passcode` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | P | · | P | P | P | P | P | P |
| `/settings/passport` | C7 | F | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/settings/passport/[fact]` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/settings/payments` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | P | · | P | P | P | X | P | X |
| `/settings/phone` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | P | P | P |
| `/settings/place` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | X |
| `/settings/privacy` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | F | F | · | P | P | P | P | P | X |
| `/settings/privacy/ai` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/settings/privacy/blocked` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | X |
| `/settings/privacy/data` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | P | P | P | P | X |
| `/settings/privacy/money-lock` | C7 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | F | F | · | P | P | P | P | P | P |
| `/settings/region` | C3 | P | · | P | P | P | P | · | · | P | P | P | X | P | · | · | P | · | · | P | P | P | P | P | P |
| `/sign-in` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | P | P | P | P | P | P | P |
| `/sign-in/code` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/sign-in/email` | C6 | P | · | P | P | · | P | · | · | · | · | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/sign-in/phone` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | · | P | P | P | P | P | P |
| `/sign-up` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | · | P | X | P | P | P | P |
| `/sign-up/email` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | · | P | X | P | P | P | P |
| `/sign-up/finish` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | · | P | X | P | P | P | P |
| `/sign-up/verify` | C6 | P | · | P | P | P | P | · | · | P | X | P | P | P | · | · | P | · | P | P | X | P | P | P | P |
| `/standards` | C6 | P | · | P | P | P | P | P | · | P | P | P | P | P | · | P | P | P | · | P | P | P | P | P | P |
| `/stay/[id]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | X | P | · | P | P | P | P | P | P |
| `/stays` | C1 | P | · | P | P | P | P | P | P | P | P | P | P | P | · | P | P | · | P | P | P | P | P | P | P |
| `/stays/search` | C1 | P | P | P | P | P | P | P | P | P | P | P | P | P | · | P | X | · | P | P | P | P | P | P | P |
| `/stories/[id]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | · | X | X | X | P | P | P |
| `/stories/new` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | P | P | P | P | X | P | P |
| `/styleguide` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | · | · | P | X | P | P | P | P |
| `/support` | C3 | P | · | P | P | P | P | · | · | P | P | P | X | P | · | P | X | · | X | P | P | X | P | P | P |
| `/support/messages` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/support/messages/[id]` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | X | P | X | P | P |
| `/support/new` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | · | P | P | P | P | X | P | P |
| `/tenancy/[id]` | C3 | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P | P |
| `/tenancy/[id]/complaint` | C3 | P | P | P | P | P | P | P | · | P | P | P | P | P | · | X | P | · | P | P | P | P | P | P | P |
| `/terms` | C6 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | F | · | P | P | P | P | P | P |
| `/u` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | X | P | · | P | P | P | P | X | P | P |
| `/u/[handle]` | C3 | P | · | P | P | P | P | P | P | P | P | X | P | P | · | P | X | · | P | X | P | X | P | X | P |
| `/u/[handle]/edit` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | P | P | P | P | P | X | P | P |
| `/u/[handle]/followers` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | P | P | P | P | P | X | X | P | P |
| `/u/[handle]/following` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | · | P | P | P | P | P | P | X | P | P |
| `/verification` | C3 | P | · | P | P | P | P | · | · | P | P | P | P | P | · | P | X | · | · | P | P | P | P | P | P |
| `/welcome` | C7 | P | · | P | P | P | P | · | · | P | P | P | · | P | · | · | P | · | · | P | P | P | X | P | P |

## What failed, and what was done

**`/`** (the REAL (landing) page; landingData answers the f2 preview's PREVIEW_STATS and PREVIEW_COUNTS (the fixtures that preview proves the same tree on), social on, a web surface)

- 6 (open): The map's city names were drawn in the map's own units and measured 7.2px at 768 and 10.2px at 1440; they are 16 units now (12.5px at the 24rem drawing) and drawn only from 64rem, where the drawing is that size; under it the city chips carry the names (fixed). Still failing: the drawn App Store and Google Play badges letter 'Download on the' and 'GET IT ON' at 7.2 to 7.6 units (7.9 to 8.4px) in weight 500, the fourth weight on the page. They copy the stores' own badge lettering; the fix is the stores' badge files as images, an asset decision (remaining).
- 8 (fixed): The community band printed each count over its label (64 / Listings), the one place on the landing that did; the move-in band and every figure tile on the public site put the label above. The label is above its count now (CommunityBand.tsx). The move-in band's label was already above.

**`/about`** (the REAL page in the REAL (site) layout; no read (the words are the page's own, lib/trust and lib/legal))

- 17 (fixed): The 'Fair to both sides' card still described the Guarantee D51 retired ('the Vallo Guarantee contribution of 1 to 2 percent, which goes to a separate reserve') and said a payment reaches the lister 'less the payment processor's own charge', not naming the platform fee. It reads NO_RENTER_FEES_LINE from lib/money/copy.ts now, and its picture is keys handed over, not a wallet.

**`/admin`** (the repository's own preview of the overview (session-b/admin/overview), the real OverviewView in the real AdminFrame from its fixtures)

- 7 (fixed): At 1440 the naira KPI ("N18,450,000" at the viewport size) ran past its quarter-width tile (auditFit: label spills out of its control). The figure is capped by its own tile now (container query, 9.5cqi), so it fits at every width. Figures tabular through formatMoney.

**`/admin/account-recovery`** (the real page inside the real AdminFrame; requireAdmin mocked to a super admin whose client is lib/testing/fake-supabase answering no request (no fixture of a recovery request exists))

- 5 (fixed): The header's sub-line carried the whole eleven-sentence procedure, a wall of text above the form at 390. The sub-line now says what the desk is for, and the procedure, same words, is a numbered list in a "How a recovery runs" Card above the form.
- 6 (fixed): Each request's status opened its line as the raw lower-case column value; sentence case now.
- 18 (fixed): The empty list said "No requests." and nothing else; it is the console's empty state now, saying who opens a request and with what.

**`/admin/agents`** (the real page inside the real AdminFrame. No fixture of an agent application exists in the repository, so the desk is measured in its honest empty state (getAgentApplications mocked to no rows); the application card and ladder were read in code)

- 4 (fixed): Each verification rung was a hand-drawn rounded-md box with the subtle border, a radius and ink no tier has; it is the Plate tier now (new .nf-admin-plate: radius 14, the plate wash and hairline, one edge).

**`/admin/agreements`** (the real page in the real AdminFrame; a signed-in admin whose deal_agreements read answers no rows (the repository holds no agreement fixture, so the waiting and decided lists are measured empty))

- 12 (fixed): No loading file: it fell back to the overview's strip and KPI cards. agreements/loading.tsx draws the console's QueueSkeleton (4 rows).
- 15 (fixed): The decided list printed the database's status at the operator ("approved", "paid", "sent back: ..." in lower case). It reads Approved, Paid and "Sent back: <reason>" now.

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

**`/admin/fees`** (the real page in the real AdminFrame; getFeeConsole answers the two rows the fee_rates seed migration inserts (0 and 0 from the epoch, with their notes), and admin_revenue_summary answers the empty ledger exactly as the RPC builds it (every source present at zero))

- 15 (fixed): "Every rate is zero today" was printed whenever the window's total was zero, so a live rate above zero with no sale yet would have been called zero. It is said only when every rate in force is zero; otherwise the per-source rows already say "Nothing booked in this window". A missing rate says "No rate on record", never zero.

**`/admin/field-speed`** (the real page in the real AdminFrame; a signed-in session whose admin_field_speed answers [] (nothing measured in seven days); the repository has no field speed rows)

- 4 (fixed): The empty note sat in a flush panel (no inner padding, meant for the table), so the note's own edge ran into the card's. The panel is flush only when it holds the table.
- 15 (fixed): A metric a phone did not report printed an empty cell; it says "Not reported" (the dictionary's own fieldSpeed.unknown) now.

**`/admin/front-door`** (the real page in the real AdminFrame; admin_funnel_summary answers the three rows of lib/funnel/summary.test.ts for both windows (every visit inside the week), admin_referral_counts answers [])

- 5 (fixed): The page returned its panels with no wrapper, so the read-only note and the three panels sat edge to edge with no air between them. It draws in the console's stack now (field speed's own wrapper).
- 6 (fixed): Language codes printed in capitals ("EN", "HA"); the panel names the language (English, Hausa) from localeMeta.
- 12 (fixed): No loading file: it fell back to the overview's strip and KPI cards. front-door/loading.tsx draws a heading, the seven steps and the two lists.
- 19 (fixed): At 390 the five-column funnel scrolled sideways inside its panel with each step broken a word a line. Below 768 it uses the console's self-naming rows (nf-admin-dt--stack, as the operations jobs table does): each step, then each figure with its label; a cell with nothing in it takes no row. The 5 "clipped" findings at 390 are that stacked table's visually hidden head, by design.

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

**`/admin/lookup`** (the real page in the real AdminFrame, q=VL-7K4MQP; the listings read answers f5/ops-fixtures AGENT_LISTINGS[0] (its code, id, title and status) for that code, every other read empty)

- 12 (fixed): No loading file: it fell back to the overview's strip and KPI cards. lookup/loading.tsx draws the heading, the box and the results panel.
- 15 (fixed): The box told an operator that a real listing code was "a word, not a reference": the database mints listing codes as VL- and six characters (20260922110000), and the classifier only knew LST, VAL, STY and RST. VL- codes classify as listing codes now (lookup-classify.test.ts holds it), so VL-7K4MQP finds its listing.
- 21 (fixed): Labels present (the box has one). A hit's link was 24.8px tall at 768 and 1440 (auditFit targets); it is a 44px target now.

**`/admin/money`** (the real page in the real AdminFrame; getRefundConsole answers bd/fixtures REFUNDS (as the bd/refunds preview draws it), admin_guarantee_reserve the empty reserve exactly as the RPC builds it with money_policy's defaults; cautions, the refund clock and the payment history read through an empty client and draw their unavailable states)

- 17 (open): The desk still states the retired Guarantee ("1.5% of each settled charge. Claims are raised within 72 hours"; D51 retired it, copy.ts keeps only LEGACY_GUARANTEE_CLAIM) and its lede restates no-custody in its own words; held by the lead's Guarantee ruling, not changed.
- 19 (fixed): At 390 each refund's state ("Not yet sent to the processor") sat in the amount's column and set that column to its own width, so the title beside it broke a word a line and the reference wrapped every few characters. Below 768 the state takes its own line under the date. 0 overflow, 0 clipped at 390, 768 and 1440.
- 21 (fixed): The history's Download CSV link was 21.7px tall at every width (auditFit targets); it is a 44px target now.

**`/admin/operations`** (the repository's own preview of the desk (session-b/admin/operations), the real OperationsView from its fixtures)

- 4 (fixed): Every status badge drew a ring and a 6px glow (two edges); the ring alone now (console-wide).
- 19 (fixed): The jobs table was the desktop table squeezed into 358px: every cell broken a word a line and the status column past the panel's edge (1 clipped finding at 390). Below 768 it is self-naming rows now (name, then schedule, last run, duration, status, each with its label); the 5 remaining "clipped" findings are the visually hidden head, by design.
- 20 (fixed): On paper the solid Failed badge measured 2.67 to 1 (white on a pale rose); it fills with paper's deep error ink now. 0 axe violations in both themes.
- 21 (fixed): The sideways-scrolling table regions could not be reached by keyboard (axe scrollable-region-focusable); each is a labelled, focusable region with the console's ring now (jobs, notifications, and the front door funnel).

**`/admin/oversight`** (the real page in the real AdminFrame; the fixture admin (PERSON) is the one staff role, audit_log answers that admin's bc/fixtures AUDIT_ROWS as actor, action and time, profiles their name; backlog counts answer 0)

- 6 (fixed): "nothing waiting" and "none" began a value in lower case; they read "Nothing waiting" and "None".
- 12 (fixed): No loading file: it fell back to the overview's strip and KPI cards. oversight/loading.tsx draws the heading, the seven queues and the staff table.
- 15 (fixed): "Most often" printed raw audit keys ("business.verification_check (2)"); it reads the audit desk's own words (actionLabel: "Business verification check (1)").
- 19 (fixed): At 390 both tables ran to 416px in a 390px window (7 auditFit overflow findings: the raw keys would not wrap). They are the console's table now, with self-naming rows below 768. 0 overflow at every width; the 8 clipped at 390 are the stacked tables' hidden heads, by design.

**`/admin/payments`** (the real page inside the real AdminFrame; the attempts from lib/admin/reads/payments.test.ts through the real buildPayments; bd/fixtures LOOKUP and SAVED_METHODS for the lookup; a health read with nothing unsettled (no fixture of an unsettled payment exists))

- 2 (fixed): The health figure (waiting on the provider) sat under the whole payments table; it opens the page now, with the unsettled detail beside it.
- 5 (fixed): Health, then the week's figures, the charts, every payment, the lookup.
- 21 (fixed): The outcome filters are links carrying aria-pressed, which axe refuses on a link (aria-allowed-attr, 3 nodes at 390); they say aria-current now, styled the same (the supply desk's examples toggle too).
- 22 (fixed): Saved card, account and terms rows held the words and the remove action on one line and squeezed the words to one a line at 390; the words keep 12rem and the action wraps.

**`/admin/people`** (the real page in the real AdminFrame, no query; profiles answer no rows (the repository has no profile rows with a join date, so hits are not drawn rather than given a made-up date))

- 12 (fixed): No loading file: it fell back to the overview's strip and KPI cards. people/loading.tsx draws the heading, the search card and the list.
- 18 (fixed): With nothing typed and nobody in the database the results card said "Newest members" over nothing. It says "Nobody has signed up yet. Each new member appears here, newest first, the moment their account exists."

**`/admin/people/[id]`** (the real page in the real AdminFrame; admin_person_file answers the payload of lib/admin/person-file.test.ts verbatim except its user_id "u" is the route's id (the member extras read refuses a non-uuid); every other read empty)

- 4 (fixed): The Consider an STR button sat directly on the Who card with no air between them; the card takes the file's section gap like every card under it.
- 6 (fixed): Workspaces printed the role column ("user") and an empty one as "member"; they read Member, Lister, Admin, Super admin.
- 12 (fixed): No loading file: it fell back to the overview's strip and KPI cards. people/[id]/loading.tsx draws the name, the Who card and the sections.
- 15 (fixed): Three nulls looked like defects: Joined printed nothing, a stop with no date read "Stopped since" and stopped, and a lister with no status read "Agent · · verification tier 1". They read "Not recorded", "Stopped" and "Agent · verification tier 1".
- 16 (fixed): 0 banned phrases. The reports line ran two sentences together ("They filed 0 reports.None about them"); a space now.

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

**`/agreements`** (no agreement fixture exists anywhere in the repository, so the two honest answers the read gives: none yet, and unreadable)

- 16 (fixed): The title, the section label and the empty state were English literals; they come from nav.agreements and experienceMoney.agreements (listTitle, emptyTitle, emptyBody).

**`/agreements/[id]`** (the real page with readAgreement answering f3/agreement AGREEMENT, derived only from committed fixtures (f3 TENANCIES[0] is payable, so approved and both confirmed by the payment gate; RENTAL's fee fields as the terms and its move-in total as the amount; PERSON as the renter; the read's own fallback for the unnamed lister; no events, one version), viewed by its renter, no kept versions)

- 16 (fixed): About forty English literals came from the page; they come from experienceMoney.agreements.page and t.moveIn (committed in the earlier unit). Measured here: the page draws them. And Between read "Seyi Omojuni (renter) and The owner or agent (owner or agent)" when the lister's profile has no name (the read's fallback printed with the role again); the read exports UNNAMED_RENTER and UNNAMED_OWNER and the page names an unnamed party by role alone ("and the owner or agent").
- 17 (fixed): Four money lines move to lib/money/copy.ts (the lead's patch, committed).
- 22 (fixed): Dates through the reader's locale (earlier unit). Measured: 0 overflow, 0 clipped in four locales.

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

**`/bookings/[bookingId]`** (the real page with getMyBookings answering the f3 bookings and tenancies, f3 BOOKINGS[0] (Grand Vista, confirmed) opened, f3 CHECKOUT as its checkout view (the same booking), no state events and no money record rows (none is fixtured); and an id that matches none)

- 16 (fixed): The tab title was English; it reads the dictionary's stay word, as the header does.
- 21 (fixed): View details and Your review drew 20.1px tall; both take nf-tap, 0 under 44. Signed out, Sign in went to a bare /sign-in; it carries this booking through withNext.

**`/cancellations`** (the REAL page in the REAL (site) layout; no read (the words are the page's own, lib/trust and lib/legal))

- 17 (fixed): Every money sentence the page wrote for itself (the lede, before and after paying, the three 'not your doing' cases, the table, and 'There is no Vallo balance for a refund to sit in') is in lib/money/copy.ts now (CANCEL_*, REFUND_NO_BALANCE), word for word, and the page reads them. The tier sentences were already dictionary words (CancellationTimeline).

**`/checkout`** (the real page; getStayDetail answers f3 STAY turned back into its rows (C3's mapping); the visitor picks STAY's Garden suite, Room only, three nights a month out, two guests. Two states: rooms switched on and signed out; rooms switched off. The signed-in request form is not drawn: it needs the room's units_total, which no fixture of this stay carries)

- 6 (fixed): The nightly row's label read "a night" (stayDetail.perNight is the suffix written after a price); it reads the catalogue's own row label, "Per night".
- 21 (fixed): Labels present. The sign-in link was built with authHref, which does not run the destination through safeReturnPath; it goes through withNext now, as the brief requires.

**`/checkout/[bookingId]`** (the real page; getCheckoutView answers f3 CHECKOUT (a PENDING hold), saved cards f3 SAVED_CARDS, no crypto offer, a stay charge; and the signed-out answer)

- 1 (fixed): Subject: paying for this stay. With a saved card offered the screen lit three primaries: Pay with this card, Pay by card, and a pinned Pay by card, although the pinned bar's own note says it pins only the chosen way. The card page is now the secondary alternative while a saved card is offered, and the bar pins the chosen way (the saved card when offered, else the card page): one lit primary in the body, the same action pinned.
- 16 (fixed): 0 banned phrases. The 50-word rail sentence ("What stands behind this payment: ...") was printed twice on one screen: in TransactionCheckout's row and again under the pay options. The pay panel now says only where the money goes (NO_CUSTODY_SENTENCE); the standing sentence stays once, in its labelled row.
- 20 (fixed): Both themes. On paper the receipt lines' kobo (".00") measured 2.97:1 (axe color-contrast, 2 nodes): Amount's default 60% fade on the line's secondary ink. The lines keep their own ink now; 0 axe violations.

**`/delete-account`** (the REAL page in the REAL (site) layout; no read (the words are the page's own, lib/trust and lib/legal))

- 16 (fixed): The 'what is kept' sentence listed 'wallet entries' among the records kept: Vallo keeps no wallet for anybody. The sentence no longer names it; the table list under it still names every retained table exactly.

**`/disclaimer`** (the REAL page in the REAL (site) layout; no read (the words are the page's own, lib/trust and lib/legal))

- 17 (open): Five Guarantee mentions inside the legal text: needs counsel (known; not changed). The custody line itself reads NO_CUSTODY_SENTENCE.

**`/docs/[slug]`** (the REAL page in the REAL (site) layout inside the REAL docs layout; chapters what-vallo-is (the longest title) and understanding-a-listing)

- 10 (fixed): The title and every section heading arrive word by word on the shared .nf-depth-word (560ms a word, 70ms apart): an eight-word title measured 1,170ms first word to last. In the docs a heading now takes the landing headline's timing (nf-hero-word, 420ms, 35ms apart, held after the fifth word): 620ms at most, measured. The gate still holds a section's words until it is on screen; reduced motion and Calm unchanged (0 long animations).

**`/email/preferences`** (a link without a valid token: no signing key and no preferences fixture exist, so only the honest invalid-link state is measured; and its loading.tsx)

- 22 (fixed): The tab title was an English literal; it reads publicDoors.prefs.metaTitle (written for it and never read).

**`/first-run/[feature]`** (the real page for invite and passport (it reads no session))

- 22 (fixed): The tab title was the English literal "Getting started"; it is experienceFeatures.firstRun.region with the feature's name now.
- 24 (fixed): tenancy and portfolio (R3-12) are mounted first runs with no declared parent and no LITERAL_EXPANSIONS entry; declared now (/bookings and /agent/dashboard). The other seven were declared.

**`/for-agents`** (the REAL page in the REAL (site) layout; readListerFees answers null as it does with no service key (no fee tiles: the honest who-pays sentence))

- 17 (fixed): The payout card printed PAYOUT_ANSWER and then NO_CUSTODY_SENTENCE (the payer's sentence, to the person being paid), and 'what Vallo does not do' said it a third time in a sentence written in supply-doors.ts, naming a wallet. The card prints PAYOUT_ANSWER alone and the third sentence is gone; 'Does Vallo hold the money?' still answers with NO_CUSTODY_SENTENCE.

**`/for-hosts`** (the REAL page in the REAL (site) layout; readListerFees answers null as it does with no service key (no fee tiles: the honest who-pays sentence))

- 17 (fixed): The payout card printed PAYOUT_ANSWER and then NO_CUSTODY_SENTENCE (the payer's sentence, to the person being paid), and 'what Vallo does not do' said it a third time in a sentence written in supply-doors.ts, naming a wallet. The card prints PAYOUT_ANSWER alone and the third sentence is gone; 'Does Vallo hold the money?' still answers with NO_CUSTODY_SENTENCE. The host door's cancellation sentence (lines in notDone and the FAQ) is still written in supply-doors.ts; see remaining.

**`/for-landlords`** (the REAL page in the REAL (site) layout; readListerFees answers null as it does with no service key (no fee tiles: the honest who-pays sentence))

- 17 (fixed): The payout card printed PAYOUT_ANSWER and then NO_CUSTODY_SENTENCE (the payer's sentence, to the person being paid), and 'what Vallo does not do' said it a third time in a sentence written in supply-doors.ts, naming a wallet. The card prints PAYOUT_ANSWER alone and the third sentence is gone; 'Does Vallo hold the money?' still answers with NO_CUSTODY_SENTENCE.

**`/forgot-password`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment)

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.

**`/forgot-password/code`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment)

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.

**`/help`** (the REAL page in the REAL (site) layout; the viewer signed out (resolveSession answers signed-out), so SupportChat draws its signed-out state; FAQs from lib/support/help-articles.ts)

- 10 (fixed): The assistant block rose at 160ms for 520ms, ending at 680ms; it rises with the list above it at 100ms now (620ms, measured).
- 16 (fixed): 'Does Vallo hold my money?' answered NO_CUSTODY_SENTENCE and then said it again in a sentence written in help-articles.ts, naming a wallet. It reads NO_CUSTODY_SENTENCE and PAYMENT_GATE_SENTENCE only; 0 banned words measured.
- 17 (fixed): See point 16: the answer's extra custody sentence is gone; its money sentences are copy.ts's.

**`/home`** (the real page signed in as _fixtures/people PERSON (first name, avatar), the unread count the f4 notifications carry, no place said (the read's own empty place), no areas or trending, f1 LISTINGS as the recommended rows, no stated interests, nothing saved)

- 16 (fixed): Welcome to Vallo, the signed-out sign-in line, and the city row's words and labels were English literals in HomeScreen and CityRow; they come from experienceDiscover.home. CityRow reads them itself (an async server component), so its four callers pass nothing new.
- 19 (fixed): The city row's invitation ("Set yours to see what is happening around you") was cut by the row's one-line ellipsis at 390; it wraps now (home.css).
- 21 (fixed): Both sign-in links (the greeting's and the city row's, signed out) were bare; they carry their way back through withNext.
- 22 (fixed): In Igbo a door's label ("Depụta ụlọ") was cut to an ellipsis at 390; door labels wrap now (home.css). 0 clipped in four locales.

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

**`/listing/[id]`** (the real page with listingById answering f3 RENTAL (the Lekki duplex); its credentials, record, door, reviews and viewing reads are the empty answers (none is fixtured))

- 16 (open): About thirty English literals remain in the page (the market badges, the assembled about paragraphs, the facts' labels, Message agent, the section titles) and in ListingUtilities (Light, Water, The gate and their answers); a follow-up unit takes them.
- 17 (open): The about paragraphs say money sentences written in the page (pay only after you have inspected, the rent is agreed directly with the agent); a follow-up unit moves them to lib/money/copy.ts by patch.
- 20 (fixed): axe: definition-list and dlitem. The gate row in ListingUtilities put the object and a wrapper between <dl>'s <div> and its <dt>/<dd>; it uses the Row anatomy now (the object floats in the term). 0 violations.

**`/listing/[id]/trust`** (the real page with listingById answering f3 RENTAL; credentials, record and door reads empty (none is fixtured))

- 21 (fixed): The header's subtitle link (the listing's title) drew 20px tall; PageHeader's three subtitle links take nf-tap, 0 under 44.

**`/messages`** (the real page signed in with f5 INBOX as the conversation summaries (no archive, no report: the views read mocked to its empty answer), and signed out)

- 16 (fixed): The page (title, the paused sentence, the signed-out screen) and the Inbox component (the header's count, mark all read, compose, the search field, the sides, typing, archive and its note, and all seven empty states) were English literals. All come from experienceInbox.inbox now.
- 21 (fixed): The signed-out Sign in went to a bare /sign-in and lost the way back; it carries next through withNext.

**`/messages/[id]`** (the real page with loadThread answering f5 RENTAL_THREAD's bubbles and f5 RENTAL_CONTEXT's listing (title, area, city, id), _fixtures/people COUNTERPART as the other party (no phone, no tier; the listing not marked verified, since the context does not say), the reader as guest, and none of the inspection, availability, record, passport, account moment or show-me reads fixtured for this thread; and signed out)

- 16 (fixed): The paused screen, the signed-out screen and the tab title were English literals; they come from experienceInbox.threadPage and the inbox's words.
- 21 (fixed): The signed-out screen promises "it opens where you left it" and its Sign in went to a bare /sign-in; it carries this conversation through withNext.

**`/messages/new`** (the real page signed in with findConversationForListing answering no thread yet, the listing repository returning f3 RENTAL, no viewing slots; and the signed-out bridge)

- 22 (fixed): Overflow 0 in all four, but every page and form string was an English literal in ha, ig and yo. They are in experienceInbox.newMessage now.

**`/messages/share/[kind]/[id]`** (the real page signed in, loadConversationSummaries mocked to the three threads the f5 share-picker deck draws, resolveCard to f5 LISTING_CARD; and the signed-out door)

- 22 (fixed): Overflow was 0 in all four, but the page's eight strings were English literals in ha, ig and yo. They are in experienceInbox.share now.

**`/notifications`** (the real page with f4 NOTIFICATIONS turned back into the rows the read returns (read_at stands at created_at for a read row, only its presence is drawn), no unread threads; and signed out)

- 16 (fixed): The tab title was English; generateMetadata reads experienceInbox.notifications.title.
- 21 (fixed): Signed out, Sign in went to a bare /sign-in; it carries /notifications through withNext.

**`/notifications/[id]`** (the real page with f4 NOTIFICATIONS[1] (the reply on Around) as the row, no other notification naming the same post; and signed out)

- 16 (fixed): The tab title was English; generateMetadata reads notificationView.pageTitle.
- 21 (fixed): Signed out, Sign in went to a bare /sign-in; it carries this notification through withNext.

**`/pay/crypto/[reference]`** (no fixture of a crypto payment exists, so the honest not-found and signed-out states)

- 18 (fixed): Signed out showed the not-found sentence ("Open the charge from your bookings and start again") under Sign in, and Sign in went to a bare /sign-in, so the payer never came back to the payment. It now says why to sign in (cryptoPay.signedOutBody) and carries next=/pay/crypto/<reference>.

**`/payments`** (the real page; my_payments_history answers the two rows of lib/money/history-model.test.ts (a payment and its refund, given its own id), my_payments_summary those rows added up; and signed out)

- 21 (fixed): Labels present. The signed-out Sign in went through authHref; it goes through withNext now, as the brief requires.

**`/post/[id]`** (the real page signed in with getThread answering f4 THREAD (the first feed post with its three answers))

- 16 (fixed): The page's title, subtitle and metadata, and the report sheet's title and subject line (shared with the feed), were English literals. The page reads experienceSocial.post; the report words and the menu's "this person" travel in SheetWords (sheetWordsOf) to ThreadView and Feed.

**`/price`** (the real page before an address is chosen, its one read (listStates) mocked to session-b/sweep-orphans STATES)

- 21 (fixed): The map's credit links (OpenStreetMap, CARTO) drew 20px tall: 2 targets under 44 at every width and locale. They take nf-tap now (target grows, the credit line keeps its size): 0 under 44.

**`/privacy`** (the REAL page in the REAL (site) layout; no read (the words are the page's own, lib/trust and lib/legal))

- 17 (open): Six Guarantee mentions inside the legal text: needs counsel (known; not changed).

**`/profile`** (the real page signed in as _fixtures/people PERSON with f4 EDITOR_PROFILE as the claimed handle (its counts, bio and claimedAt as member since), the account counts at zero (no fixture holds them), no posts (none of the f4 posts is PERSON's); and signed out)

- 16 (fixed): Signed out (What is here, Find a place, More, Help), the profile-row-missing sentence and the tab title were English literals; they come from experienceSocial.account.
- 22 (fixed): Member since was formatted "en-NG" for every reader and said "today" in English for an unreadable date; it uses the reader's locale (intlTag) and draws nothing when the date is unreadable.

**`/r/[code]`** (the REAL page in the REAL (site) layout; verify_receipt's answer is lib/receipts/code.test.ts's own `ok` row read through readVerifyAnswer (genuine), and its not_found answer)

- 1 (fixed): One verdict, one way on. The way on read 'Check', the lookup form's submit, on a page with no field: a button promising an action it does not do. It reads 'Check another receipt' now (experienceSite.receipt.checkAnother).
- 12 (fixed): The page waits on verify_receipt and showed the group's article skeleton (a wide title and prose) for a narrow answer and a receipt. r/[code]/loading.tsx draws the answer's own shape: label, code, the verdict card, the receipt sheet with figure, tear and rows, the way back.

**`/record/[code]`** (no fixture of a Record exists anywhere in the repository, so the three honest answers the read gives: missing, rate limited, failed)

- 9 (fixed): Every answer drew the clay shield with a tick, the verified mark, over "No Record has that code" and over a failed read (UI-15: a not-found never wears a success mark). Missing is the empty kit's search glyph now, a failed read the error kit, too many lookups the neutral pause.
- 15 (fixed): As 9: the verified shield said the opposite of the sentence under it.

**`/rent/move-in/[listingId]`** (the real page with the listing repository returning f3 RENTAL and its peers the f3 SHELF, no open inspection)

- 21 (fixed): The Back link drew 19.5px tall in every locale: it takes nf-tap now, 0 under 44.

**`/rent/pay/[inspectionId]`** (the real page with getRentPayView mocked to session-b/sweep-orphans RENT_VIEW, no saved card, crypto off)

- 17 (fixed): checkout.onPlatformRent said Money moves inside Vallo directly under NO_CUSTODY_SENTENCE (D48, D50). It is C2's copy, so it went as patch checkout-no-custody-onplatform.patch; the lead applied it.

**`/rent/share/[id]`** (the real page; my_rent_share answers a contributor's 140,000,000 of 420,000,000, the figures of lib/tenancy/shares.test.ts, nothing else known (no area, no lead, no move-in), not yet answered; and the missing share)

- 6 (fixed): With no place on the row the sheet printed "Your share of a move-in" as its overline and again as its title, under a page header saying the same. The overline is drawn only when the title is a place.

**`/reset-password`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment; no session (the expired screen, the honest default) and a recovery session ('link-only' proof) so the form is drawn; the session prints nothing)

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.

**`/restaurant/[id]`** (the real page with listingById answering f3 RESTAURANTS[0] (The Lagoon Kitchen) as a catalogue listing built only from that card's own fields (title, area and city from its where, kind, amenities, hue); no stated price, no reviews, no photographs; getRestaurantDetail null (no business-grade fixture exists), so the hours card says there are none)

- 16 (fixed): The about sentence was assembled from English fragments ("is in", "and serves") and the share card's line was English; both come from experienceDetail.restaurant now, one whole sentence per case.
- 21 (fixed): The Restaurants link in Getting there drew 21.7px tall; it takes nf-tap now, 0 under 44.

**`/s/[token]`** (a signed-out visitor, no cookies; readDoor answers the door preview's FIXTURE row (verbatim) as a listing and as an example (is_demo), and the missing door)

- 12 (fixed): Its loading.tsx drew its own aria-busy box with the words visible and was not announced through the State kit (voice rule, the lead's note). It is a State kind=loading now, the visible eyebrow aria-hidden so it is spoken once.

**`/safe/[token]`** (the REAL page in the REAL (site) layout; readSafetyShareByToken answers the landlord preview's live, overdue view verbatim (Ada, Ikoyi), and unknown)

- 12 (fixed): The page reads the share by token and waited in the group's prose skeleton; safe/[token]/loading.tsx draws the status's own shape now (title, times, the state card with its action, the footnote).

**`/safety`** (the REAL page in the REAL (site) layout; no read (the words are the page's own, lib/trust and lib/legal))

- 5 (fixed): The rule that matters most prints NO_FEES_LINE, and step 2 of 'How paying on Vallo works' opened with the same sentence word for word a screen later. The step now starts at its own sentence.
- 17 (fixed): The paying steps, the one rule's paragraph and the 'already paid outside' line are in lib/money/copy.ts now (SAFETY_*, REFUND_NO_BALANCE). Two corrections, both for truth: 'Vallo keeps no balance for you, so there is nothing to withdraw' is untrue beside the Rewards Balance (D51), so the refund step reads REFUND_NO_BALANCE; and the payment reference opens from Plans, the name the app gives what the sentence called Bookings. The inspection steps keep their own words: they are inspection advice that mentions paying, not a statement of how money moves.

**`/saved`** (the real page with f3 SHELF's first two listings saved on the account at the f3 saved deck's own savedAt values; no saved places (their rows are raw catalogue rows no fixture holds); no changes since saving)

- 16 (fixed): The header link "Saved searches" and the tab title were English; they come from experienceDiscover.saved.searchesLink and nav.saved.

**`/saved/searches`** (the real page with session-b/sweep-orphans SAVED_SEARCHES and no briefs; and signed out)

- 16 (fixed): The page title, retry, and the whole board (saved on, named from its filters, the alert notes, rename, the switch label, remove and keep) were English literals; they come from experienceDiscover.saved (searchesLink, searchesRetry, board). SavedSearchBoard takes a copy prop; sweep-orphans passes it.
- 19 (fixed): A search's name was cut with an ellipsis at 390 ("Two bedrooms in Yaba under 2m a..."): the words that tell two searches apart. It wraps now; 0 clipped.
- 21 (fixed): Each search's name link drew 25.6px tall; it takes nf-tap, 0 under 44. The signed-out Sign in was hand-encoded; it uses withNext.

**`/search`** (the real page on the unfiltered shelf, f3 SHELF, nothing saved, no anchors; and the map view of the same (the map itself is client-only and does not prerender, so its tiles and credits are not in the measurement))

- 16 (fixed): The page's heading (results for, explore a kind, explore properties) and the map's line (imagery offline, the credits' joiner, approximate pins) were English; they come from experienceDiscover.search and .map.
- 21 (fixed): The map's credit links were overline-sized text with no target; they take nf-tap, as PinMap's do (code; the map does not prerender here).
- 22 (fixed): In Igbo and Yoruba the card's Message the agent spilled out of its full-width button (193px of words in 155px); card buttons wrap now (catalogue.css). 0 clipped in four locales.

**`/settings`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); device count unreadable (null), so the row asks rather than shows 0)

- 24 (fixed): Back to /home (declared). A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now. (the Devices, Place and Interests rows, signed out)

**`/settings/accessibility`** (the real page and its new loading.tsx inside the real settings layout (SettingsAreaNav); it reads only the dictionary and the device's settings store)

- 6 (fixed): Weights were 400/600/650: the motion level names set 650, outside the system's 400, 600 and 700. They are 600 now (motion-pref.css).
- 12 (fixed): No loading.tsx: the route fell back to the generic (app) skeleton. It has its own now: header with line, lede, Seeing (three rows), Motion (three rows and its note), under the settings nav the layout keeps drawn.
- 20 (fixed): axe nested-interactive (1 at dark.390 and light.390): the replay button sat inside the preview's role=img. The image role is on the picture alone now, the button beside it: axe 0.

**`/settings/account`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty))

- 24 (fixed): Back to /settings. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now. (AccountSection's Sign in row, Place and Interests rows)

**`/settings/devices`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); my_sessions empty (no other device); also DeviceList on the sweep-settings harness's fixture rows (the only device rows in the repository))

- 24 (fixed): Back to /settings. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now.

**`/settings/devices/alert`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); a digest my_new_device does not answer (the missing state))

- 24 (fixed): Back to /settings/devices. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now. (keeps ?d=)

**`/settings/interests`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); interests not yet asked)

- 22 (fixed): The tab title was an English literal ("What you are here for"); it reads interests.screenTitle in the reader's language now.
- 24 (fixed): Back to /settings. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now.

**`/settings/passport`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); my_renter_passport's zero row (nothing recorded, off), after the first run (?shown))

- 1 (open): Naming: the area nav calls this destination "Space Passport" (experienceSettings.area, the north star's name) while the h1, the hub row and the credential say "Renter passport" (trustVisible.passport.title, experienceAccount.passport.credentialLabel). One name for one thing is a decision for the lead: rename all three (trustVisible is a machine-draft namespace) or the nav label.

**`/settings/payments`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); the card and bank rows are the f4 preview fixtures PAYMENT_CARDS and BANK_ACCOUNTS through the block's two reads)

- 22 (fixed): The signed-out action read the English literal "Sign in"; it is t.common.signIn now.
- 24 (fixed): Back to /settings. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now.

**`/settings/place`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); listStates answers the sweep-orphans STATES fixture)

- 24 (fixed): Back to /settings. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now.

**`/settings/privacy`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); nobody blocked, no address move, no money hold)

- 16 (open): The money-lock door's line "Face or fingerprint before money moves" overstates what it guards (only the accounts money is paid into). Fixed in c7/money-lock-copy.patch (MONEY_LOCK_ROW in lib/money/copy.ts), pending the lead.
- 17 (open): Same line: a money sentence outside lib/money/copy.ts. In the patch.
- 24 (fixed): Back to /settings. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now. (the Blocked row, signed out)

**`/settings/privacy/blocked`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); the db2/blocked preview's three fixture rows (names and dates as ISO days) through loadMyBlocks)

- 22 (fixed): The blocked-on date was formatted en-GB for every reader; it uses formatDate in the reader's locale now.
- 24 (fixed): Back to /settings/privacy. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now.

**`/settings/privacy/data`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty))

- 24 (fixed): Back to /settings/privacy. A signed-out sign-in link lost where the person was going (bare /sign-in); it carries next through withNext now. (the export row, signed out)

**`/settings/privacy/money-lock`** (the real page in the real settings layout (SettingsAreaNav), signed in as the preview fixture PERSON (_fixtures/people) through lib/testing/fake-supabase; every other read answers as a new member's account does (empty); no phone added yet (empty money_credentials))

- 16 (open): "Sending and withdrawing will ask for this phone's lock" and the lede "so a stolen unlocked phone cannot send it" say Vallo holds money to send or withdraw; it holds none (money-intent.ts: the lock guards adding, defaulting and removing bank and payout accounts). Fixed in c7/money-lock-copy.patch, pending the lead.
- 17 (open): Those are money sentences from the dictionary (platform.moneyLock, experienceAccount lede), not lib/money/copy.ts. The patch adds MONEY_LOCK_WHAT/BODY/DONE/REMOVED there and wires the group and the page to them.

**`/settings/region`** (the real page and its new loading.tsx inside the real settings layout)

- 12 (fixed): No loading.tsx; it has its own now: header with line, Language (one row), Money display (three rows), under the settings nav.

**`/sign-in`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment; and the session-b sign-in preview's own refusals (refused, fields, deactivated) through EmailAuthForm's initialState, in the same layout)

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.

**`/sign-in/code`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment)

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.

**`/sign-in/phone`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment; phoneSignInEnabled on (off, the route is a 404))

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.

**`/sign-up`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment)

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.
- 20 (fixed): In Light, the sign-up screens (a night door, data-theme=dark on the screen) still took the paper slate inks from ':root[data-theme=light] .nf-slate': the 'Sign in' swap link measured 1.73 to 1 on the navy island (axe), the focus ink was navy on navy and the pinned pill's bar a pale band. The rule now skips a screen that carries data-theme=dark, so the island alone keeps the door dark (night-door.ts layer 1). axe 0 in both themes.

**`/sign-up/email`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment)

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.
- 20 (fixed): In Light, the sign-up screens (a night door, data-theme=dark on the screen) still took the paper slate inks from ':root[data-theme=light] .nf-slate': the 'Sign in' swap link measured 1.73 to 1 on the navy island (axe), the focus ink was navy on navy and the pinned pill's bar a pale band. The rule now skips a screen that carries data-theme=dark, so the island alone keeps the door dark (night-door.ts layer 1). axe 0 in both themes.

**`/sign-up/finish`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment; finishSetupView answers 'owed' with the session-b preview's own names (Ada Obi); signed out the page only redirects)

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.
- 20 (fixed): In Light, the sign-up screens (a night door, data-theme=dark on the screen) still took the paper slate inks from ':root[data-theme=light] .nf-slate': the 'Sign in' swap link measured 1.73 to 1 on the navy island (axe), the focus ink was navy on navy and the pinned pill's bar a pale band. The rule now skips a screen that carries data-theme=dark, so the island alone keeps the door dark (night-door.ts layer 1). axe 0 in both themes.

**`/sign-up/verify`** (the REAL page inside the REAL (auth) layout, signed out, no cookie, a web surface; with no auth provider configured in this environment; no pending address cookie (the field asks for it))

- 10 (fixed): Before: the bowl's picture settled over 900ms (cinematic) and the island's last piece started at up to 425ms for 520ms, so a screen was still arriving at 945ms. auth.css now settles the picture over the deliberate rung (620ms), rises every piece, the cap line, the object and the island over the slow rung (380ms), and starts the stagger at 60ms (120ms nested) stepping 30ms, held after the fifth piece: measured 620ms at most on every auth screen. Order and travel unchanged; reduced motion unchanged (0 animations); Calm unchanged.
- 20 (fixed): In Light, the sign-up screens (a night door, data-theme=dark on the screen) still took the paper slate inks from ':root[data-theme=light] .nf-slate': the 'Sign in' swap link measured 1.73 to 1 on the navy island (axe), the focus ink was navy on navy and the pinned pill's bar a pale band. The rule now skips a screen that carries data-theme=dark, so the island alone keeps the door dark (night-door.ts layer 1). axe 0 in both themes.

**`/stay/[id]`** (the real page with getStayDetail answering f3 STAY turned back into the rows the read returns (every value read from STAY; the photo path is the fixture's url and the url builder is mocked to hand it back unchanged))

- 16 (fixed): The star class ("5 star"), the property kind (Hotel, Resort...), the host fallback and the share card's line were English literals; they come from experienceDetail.stay now.

**`/stays/search`** (the real page; searchStays answers the same two f3 STAYS rows (total 2); and no results for q=Lekki with no dates)

- 16 (fixed): 0 banned phrases. A search with no dates that found nothing said "Nothing here for those dates yet" and to "widen the dates" when no dates were asked for. With no dates it says "No stays match yet" and why a shelf fills; the dated copy is kept for a dated search, whose action clears the dates.

**`/stories/[id]`** (the real page with f4 STORY, STORY_FACES and STORY_COMMENTS (the f4 story deck), measured inside the shell it is drawn in)

- 19 (fixed): The story cancelled the shell gutter with -1.25rem then -2rem, but the gutter token is 16, 24 and 32: a phone scrolled sideways by 4px and 768 to 1279 by 8px (the stage measured -4 to 394 at 390). It now cancels exactly var(--nf-pad-shell): 0 overflow at every width.
- 20 (fixed): Light: axe colour-contrast x7 at 1.08:1. The stage had no ground of its own, so until the photograph arrives (or if it never does on a slow network) the white words sat on paper. It takes --nf-overlay-media-deep, ink in both themes like the wash: axe 0.
- 21 (fixed): The author link measured 41.8px tall and the three liker faces 28px: they take nf-tap now, 0 under 44.

**`/stories/new`** (the real page with social on and listMyAreas mocked to session-b/sweep-orphans AREAS)

- 22 (fixed): Overflow 0 in all four, but the page's strings were English literals. They are in experienceSocial.newStory now.

**`/styleguide`** (the REAL page in the REAL (site) layout)

- 20 (fixed): On paper the --nf-content-on-brand specimen drew white 'Aa' on the light panel, 1.04 to 1 (axe colour-contrast). A text token may name its own ground now, and on-brand is painted on the brand fill; axe 0 in both themes.

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

**`/terms`** (the REAL page in the REAL (site) layout; no read (the words are the page's own, lib/trust and lib/legal))

- 17 (open): Section 14 'The Vallo Guarantee' and the Guarantee sentences in sections 4 and 9: legal text, needs counsel (known; not changed).

**`/u`** (the real page with findPeople's own ready answer: no query and nobody, and a query naming _fixtures/people PERSON and COUNTERPART (no badge, no occupation, no place, so nothing is claimed beyond the fixture))

- 15 (fixed): Every agent row drew a Verified agent tick from isAgent, which is a role (an approved agent at tier 0 has had no check). The type's own comment forbids it. The mark now comes from the published badgeTier through TierBadge, as on the profile; with no badge, nothing is drawn.
- 22 (fixed): Overflow 0 in all four, but 15 strings were English literals. They are in experienceSocial.people now.

**`/u/[handle]`** (the real page with loadPublicProfile answering f4 EDITOR_PROFILE as somebody else's member page, signed in, with none of the bands no fixture carries (no home area slug, occupation, standing, trust, badges or record); its posts are the f4 posts this person wrote, which is none; and the claimable (signed out) and malformed answers)

- 11 (fixed): The more button beside Follow drew a sharp-cornered square: the glass door gives material, not shape. It takes the control radius (social-feed.css .nf-social-more).
- 16 (fixed): Every no-page screen (unreachable, not a handle, a Vallo name, nothing at this handle) and the share line were English literals; they come from experienceSocial.profilePage (and people's words for unreachable).
- 19 (fixed): The cover bled 20px into a 16px gutter (-4 to 394 at 390), and in daylight so did the night island around it. Both bleed by the shell's gutter token now (social.css), which also ends the 8px a 640 to 767px tablet ran past its edges.
- 21 (fixed): Sign in to claim it went to a bare /sign-in; it carries next through withNext.
- 23 (fixed): The empty Posts tab sat under the compose button with no room to scroll it clear; the page keeps pb-4xl as the other Around pages do.

**`/u/[handle]/edit`** (the real page with loadProfileEditor mocked to the editing state with f4 EDITOR_PROFILE and AREA_OPTIONS (what the f4 edit-profile deck draws))

- 22 (fixed): Overflow 0 in all four, but the page's 17 strings were English literals. They are in experienceSocial.editProfile now.

**`/u/[handle]/followers`** (the real page with getFollowList's own found answer naming _fixtures/people COUNTERPART and HOTEL's name as followers of PERSON, no badge and no bio)

- 21 (fixed): Each name link was 21.7px tall (2 targets under 44 at every width and locale). It takes nf-tap now, which grows the target with a centred transparent pseudo-element and keeps the drawing: 0 under 44.
- 22 (fixed): The metadata title was an English literal; experienceSocial.follows now.

**`/u/[handle]/following`** (the real page with getFollowList's own found answer and no one in it)

- 22 (fixed): The metadata title was an English literal; experienceSocial.follows now.

**`/verification`** (the real page for a member with no agents row (no ladder) and no documents, the path's first state; nothing else is fixtured)

- 16 (fixed): The fallback sentences for a suspension, a refusal and a request with no recorded note, their fixes, and the heading over the reviewer's words were English literals in the page; they come from experienceAccount.verification now.

**`/welcome`** (a signed-out visitor, no cookies: the stranger's intro, and the tour (?tour=1))

- 22 (fixed): The tab title was the English literal "Two worlds. One platform."; it reads welcomeCards.twoWorlds in the reader's language now.

