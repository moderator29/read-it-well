# Docs inventory

Written 13 October 2026 on `track/docs` (base `claude/rentme-v2-platform-audit-xuvg0a`, with the listing page `d17da76e` and Schedule a visit `45bf26e7` merged in). Every public docs page, help surface and guide, its state before this pass, and what was done. Claims were checked against the code on this branch and the live database `uccixoonmbhrnyczyigt` (read only).

States: **current** (true, kept with edits for style), **outdated** (said something no longer true), **retired** (described a retired thing), **missing** (an area that exists on the platform with no page).

## Public docs (`/docs`, `apps/web/src/app/(site)/docs`)

The chapters now sit in seven groups (Start here, Renting and buying, Stays and restaurants, Money, Listing and hosting, Messages and tools, Trust and privacy), shown in the sidebar and on the index. The founder's money rules are written once in `facts.ts`. `docs-links.dom.test.tsx` holds every `/docs` link in `src` to a live chapter, heading or redirect.

| Page | State before | Action |
|---|---|---|
| `/docs` (index) | outdated: twelve-chapter intro, flat list | Rewritten: grouped index, "How Vallo works" lede, Quick start and How paying works first |
| `/docs/what-vallo-is` | outdated: "pay once Vallo approves it", long essay | Rewritten: short version, the switch, the rules that apply everywhere, who it is for |
| `/docs/quick-start` | outdated: "supplier chooser", no guest or restaurant path | Rewritten: rent or buy, stay or table, owner, agent, host, restaurant, media rules |
| `/docs/getting-started` | outdated: no workspaces, no one-side rule | Rewritten as "Your account and workspaces": sign up, sign in, profile and handle, Add a workspace (one account holds one side; Terms and Privacy and pay-inside-Vallo accepted), settings |
| `/docs/getting-around` | current | Kept (labels read from the dictionary) |
| `/docs/finding-a-place` | current, missing saved searches | Rewritten as "Search, filters and the map"; saved searches with alerts added |
| `/docs/understanding-a-listing` | outdated: no move-in total, no Ownership seen, pre-upgrade page | Rewritten as "Reading a listing": the upgraded page (highlights from the lister's own facts, amenities, gallery and View all, Listed by with Landlord, Agent or Agency, the earned badge, Message, Call only inside an existing listing chat when calls are on, Schedule a visit), move-in total, marks, light, water, gate, examples |
| `/docs/viewings` | outdated: no Schedule a visit | Rewritten: Schedule a visit (in person or video, video only while calls are on; open times in Lagos time or suggest one; note; check and send), the visit page states, Add to calendar, Join video visit from 10 minutes before, reminders, change time or cancel, close, no-show, listers' viewing times |
| `/docs/agreements-and-paying` | missing | Added "From viewing to keys": view, inspection report (eight rooms, photos), agreement both confirm, pay with Escrow or card (sale escrow only), move in and the tenancy review |
| `/docs/price-check` | current | Kept |
| `/docs/booking-and-paying` | retired: mixed stays, tables and money; "Vallo approves"; one refund schedule | Removed. Redirect to `/docs/booking-a-stay` |
| `/docs/booking-a-stay` | missing | Added: hotel room paid by card at once; shortlet 48-hour hold, host accepts or Instant book; full price with every charge at the door; book for someone else; refusals; after you pay; arrival check; Plans. Old anchor ids kept |
| `/docs/restaurants` | missing (was a section of the old booking chapter, and "fee per seated guest" in hosting) | Added "Restaurants and tables": free table booking, house rules, restaurant confirms, check-in code, did-you-dine, bill paid at the restaurant (bill pay through Vallo not switched on), cancel, seated-only reviews, running a restaurant, 1,000 naira per seated table billed monthly |
| `/docs/what-vallo-costs` | outdated: no hotel commission, no restaurant fee | Rewritten: free to use and list, commission from the share, hotel commission (10 percent from one constant), restaurant fee, Pro optional, every cost shown, who holds the money |
| `/docs/money-and-the-guarantee` | retired: slug named the retired Guarantee; named Paystack and Yellow Card; "Vallo approves" | Removed. Redirect to `/docs/paying-on-vallo` |
| `/docs/your-wallet` | retired (already a redirect) | Redirect re-pointed to `/docs/paying-on-vallo` |
| `/docs/paying-on-vallo` | missing | Added "How paying works": pay inside Vallo (outside is not covered), how each deal is paid, Escrow, Pay by card, when payment opens, who holds the money, fees, refunds, getting paid, references, paying outside. One conditional line says escrow is not open yet while `PROTECTED_RAIL_LIVE` is false |
| `/docs/refunds-and-cancellations` | missing | Added: cancel before paying, which policy applies (Flexible, Moderate, Firm, Strict for businesses; the standard schedule for owner or agent stays), asking for a refund, host cancels or not as listed, escrow refunds, tables and viewings, refund missing |
| `/docs/listing-on-vallo` | outdated: "supplier", ladder duplicated | Rewritten as "Listing a property": choose a workspace, the three property doors (from `SUPPLY_DOORS`), stays doors, post a listing, photos and videos, what you will receive, review, standing, what you may charge |
| `/docs/for-owners` | missing | Added "For owners and landlords": owner workspace, ownership document and Ownership seen (with its limits), listing, viewing times, agreeing and getting paid |
| `/docs/for-agents` | outdated: hand-typed six steps, "platform share is zero", no enquiries desk | Rewritten as "For agents and firms": apply (from `SUPPLY_DOORS`), ladder, listing, viewing times and the day route, enquiry stages, quick replies, briefs, analytics, calendar, bookings, earnings |
| `/docs/hosting` | outdated: restaurant fee "per guest", no rooms, calendar, door charges or check-in | Rewritten as "Hosting a hotel or shortlet": setup, sent back, rules, rooms and the calendar with sync, charges at the door, policy, bookings (Decide by, Overview), the arrival check, getting paid with the hotel commission, reviews |
| `/docs/messages-and-notifications` | current, split over three modules | Rewritten as "Messages, calls and notifications": one chapter, Requests, calls, email switches |
| `/docs/ai-assistant` | current, missing approval rule and screen help | Rewritten as "The assistant": find, compare, explain, point to a screen; never acts without your approval; ignores instructions hidden in listings |
| `/docs/around` | current | Kept, shortened |
| `/docs/badges-and-verification` | outdated: no Ownership seen | Rewritten: ladder summary, Ownership seen and its limits, badge lists |
| `/docs/reviews` | missing | Added: who can review (stay, seated table, tenancy), writing, replying once, asking Vallo to look, reading ratings |
| `/docs/trust-and-safety` | current, long | Rewritten as "Avoiding scams and reporting" |
| `/docs/your-data-and-your-rights` | current | Rewritten as "Privacy and your data", shorter |
| `/docs/troubleshooting` | outdated: no "payment will not open" | Rewritten; payment will not open added |

## Help and guides

| Page | State before | Action |
|---|---|---|
| `/help` (`lib/support/help-articles.ts`) | outdated: "Vallo approves the booking", Guarantee answer, one refund schedule, Paystack in the payout answer (`PAYOUT_ANSWER`), crypto, "agent workspace" for hotels | Rewritten to the founder's rules; added Escrow or card, paying outside Vallo, hotel and restaurant fees, Ownership seen, Schedule a visit. The five popular questions kept |
| Support chat notes (`lib/support/faq.ts`) | outdated: listed Pidgin as a language (there is no Pidgin locale), "Vallo approves", the old switch-profile route | Those three answers fixed; the rest kept (its tests pin them) |
| `/guides/how-stays-work-on-vallo` | outdated: one refund schedule, "What stands behind" sentence | Booking, cancelling and problem sections rewritten |
| `/guides/avoiding-rental-scams` | current | "Pay inside Vallo" added to the On Vallo callout |
| `/guides/what-a-move-in-total-includes`, `/guides/renting-in-lagos`, `/guides/renting-in-abuja` | current | Reviewed, date moved to 13 October 2026 |

## Internal docs (`docs/`)

| Doc | State before | Action |
|---|---|---|
| `DECISIONS_2026-10-13.md` | outdated (D-10): `member_reminders` named as the viewing ledger; row 15 said the constraints were not widened; row 14 said the fee was not public | Fixed; rows 2, 6, 14 and 15 updated; rows 20 to 23 added for the 13 October money rules; "To document when merged" now lists PAY-01, PAY-02 and the hotel rate |
| `MONEY_ARCHITECTURE.md` | outdated (D-10): `stays_instant_pay` and `room_bookings` "off"; d68d and d77 "not yet applied"; deposits "off until" | Live status block added at the top; each line corrected |
| `SESSION-1-RESPONSE.md` | D-10 open | Marked fixed |
| `GAP_AUDIT_2026-09-30.md`, `E2E_SIGNED_IN_2026-09-29.md`, `MIGRATION_REVIEW_2026-09-30.md`, `E2E_AUDIT_2026-09-29.md`, `INTEGRATION_QA_2026-09-30.md`, `FOUNDER_REQUESTS_TRACE_2026-09-29.md` | retired: dated September status reports, superseded by the 13 October audit | Moved to `docs/archive/` with a one-line note at the top |

## Merged during this pass, and documented

- Listing page upgrade (`d17da76e`): `/docs/understanding-a-listing`.
- Schedule a visit (`45bf26e7`, visit mode `1ea3f4d6`): `/docs/viewings#two-ways` and `#status`, help "How do I book a viewing?".
- Lister visit calendar on `/agent/inspections`, and visit reminders at 19:00, 08:00 and two hours before, each naming in person or video (`1f4da15b`; the morning stage read live in `private.send_viewing_reminders`): `/docs/viewings#reminders` and `#for-listers`, `/docs/for-agents#viewing-times`, `/docs/for-owners#viewings`.
- Restaurant desk on `/host/reservations` (`21d52822`; `reservation_guest_records` and the `vallo_send_reservation_reminders` job read live): `/docs/restaurants#for-restaurants` and `#what-happens-next`.
- The staff Visits page (`/admin/bookings/visits`, read only) is staff only and is not in the public docs; see `docs/ADMIN_CONSOLE.md`.

## Could not confirm, or left for others

- The escrow or card choice screen (PAY-01) and workspace Terms acceptance (PAY-02) are not built; the docs state them as rules and claim no screen.
- The hotel commission (10 percent) is not live in the database; stated from `HOTEL_COMMISSION_PERCENT`.
- Live data: two older cancellation policies in `cancellation_policies` (no preset) still say "returned to your wallet" in their summary. A database row, not changed here (no writes).
- Code comment: `lib/reservations/seating.ts` says the fee is "per seated guest"; the founder decision and the live function are per seated table. Not changed (restaurant code is another track's).
- The docs chapter pages are not in the sitemap (`lib/listings/sitemap.ts` lists `/docs` only); adding them is a listing-code change left to its owner.
- Nothing was walked signed in or on a device.
