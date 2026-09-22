# The Vallo admin console: the operations handbook

This is the document a new operations person reads on their first day and can
then run the platform from. Every desk is here: what it shows, where each number
comes from, what each action does, who may take it, what it changes, and what the
desk cannot do. The last part records the options that were considered and
rejected, with the reasons.

Owned by Session B (`docs/SESSION_B_SCOPE.md`). The queries and actions behind
the desks live in `apps/web/src/lib/admin/**`, which the other session owns;
where a desk needs something that layer does not return yet, the gap is named
here and raised as a request in the scope file.

## 1. Before you start

**Who can enter.** Anyone whose account holds the `admin` or `super_admin`
role in `public.user_roles`. The check is `requireAdmin()` in
`lib/admin/guard.ts`, called once in `app/admin/layout.tsx` before a single
figure is read. Signed out, you are asked to sign in; signed in without the
role, you see "This area is for the Vallo operations team" and nothing else.
No console page renders its data for anyone else, and every read on the
overview, operations and analytics desks runs through your own session, so
the database's row level security (the `*_select_admin` and `*_admin_all`
policies) decides what you may read, not the page. Roles are granted by a
super admin; the console has no screen for granting them.

**Where you land.** Entering the console always opens the Overview at
`/admin`. Nothing redirects you to a desk first: the side drawer's Console row
links `/admin`, and no page, layout or proxy rule under the console sends you
anywhere else.

**How to read a panel.** Every panel is one of four things, and it always says
which:

| What you see | What it means |
|---|---|
| Figures, a chart or rows | Read from the database just now. Every number came back from a query; none is typed into the page. |
| A quiet panel with a title such as "No money has moved yet in this range" | The read worked and there is genuinely nothing to count. On 22 September that is the normal state: no real listing is live, no booking has been made, no money has been collected. |
| "Not recorded" (on a figure) or "Not wired yet" (on a panel) | The platform does not record this yet. The panel names the request in `docs/SESSION_B_SCOPE.md` that would start recording it. It is not a fault of the platform or of your data. |
| "Unavailable" or "This did not load" | A read failed. Nothing has changed; the page re-reads every minute, or reload. If it persists, check Operations for a failed job or a locked-out scheduler. |

**The console never draws a number the database did not return.** A change
("+12%") is drawn only when both periods were counted from real rows. From a
previous period of zero it is drawn as a count ("+3"), never as an invented
percentage. A chart with nothing behind it says so in words and draws no line.

**Examples are never supply.** The 64 example listings that show the product
before real owners arrive (`listings.is_demo = true`) are counted on the
Examples desk and nowhere on the Overview or Analytics.

**The status words and colours**, used on every desk:

| Word | Colour | Means |
|---|---|---|
| Healthy, Resolved, Passed, Success | emerald | good, or done |
| Pending, Medium, No run yet, Under review | cyan | in flight, needs a look |
| Info, Attention, System, Admin | blue | information |
| High, Failed, Overdue, Rejected | rose | wrong, act now |

Every badge carries its word as well as its colour, so nothing depends on
telling two colours apart.

**Time.** Every date and every "per day" is Lagos time (UTC+1, no daylight
saving). "12m ago" is measured from when the page was read.

## 2. The shell

**The rail** (left, desktop). The Vallo mark, then twelve rows in the order
the renders draw them: Overview, Listings, Supply, Verification, Money,
Escrow, Bookings, Moderation, Support, Operations, Analytics, and Settings at
the foot above your name and role ("Platform Operator", or "Platform Owner"
for a super admin). The open row is the lit blue one. A cyan number on a row
is work waiting there right now (listings to review, applications, held
posts plus flags plus reports, open tickets, open alerts), read by
`getQueueCounts()` on every page load.

**Desks inside a row.** The console has more desks than twelve. Each lives
under the row it belongs to and is listed beneath that row while you are in
it: Overview holds the Unified queue; Supply holds Applications, Businesses
and Stops; Money holds Payments and Fees; Moderation holds Message flags,
Reports, Around and Standing; Operations holds Alerts and the Audit log;
Settings holds Switches, Reference data and Examples. Every one of them is
also in **All desks** at the foot of the rail, so no desk is ever more than
one click away.

**The bar** (top). The search field: type and press Enter to search the desk
you are on (its own `?q=`); on a page with no search of its own (Overview,
Operations, Analytics, Settings) it searches the Unified queue. Command-K or
Control-K jumps to it. Then the Lagos date and time, the bell (your own
notifications; a rose dot means unread), and you.

**Keeping current.** Overview, Operations and Analytics re-read themselves
every minute while the tab is visible, and at once when you come back to the
tab, without losing your place. Every decision taken on a desk refreshes the
pages it affects.

**Narrow screens.** Below 1024px the rail folds into a drawer behind the menu
button at the top left (a cyan dot on it means work is waiting). The drawer
closes when you choose a destination, on Escape, or on a tap outside it.
Panels stack one per row; tables scroll sideways inside their panel rather
than the page.

## 3. Overview

Drawn from the render `5EAA44CB`. Reads: `lib/admin/reads/overview.ts`
(`getConsolePulse`, `getCollectedSeries`, `getSupplyByType`,
`getNewListingsByRole`), `lib/admin/reads/operations.ts` (`getJobHealth`),
and the existing `getQueueCounts` and `getRiskAlerts`.

**The pulse strip.**

| Figure | Where it comes from | The change |
|---|---|---|
| Listings live | exact count of `listings` with `status = 'PUBLISHED'` and `is_demo = false` | against the same count of listings that were already live seven days ago (`published_at` on or before then) |
| Sign-ups today | `profiles.created_at` on today's Lagos date | against yesterday |
| Naira transacted today | money collected today (see below) | against yesterday |
| Jobs healthy | the share of the seven Vercel Cron jobs whose last run was on time and did not fail (Operations has the table) | none; a job count has no history |

**The four cards.** Live listings (as above), New supply this week (listings
submitted for review in the last seven days, examples excluded, against the
seven before), Naira transacted (money collected in the last seven days,
against the seven before), Open reviews (listings submitted, under review or
approved and not yet live, from `getQueueCounts`; no change is drawn because
an open count has no history). Each sparkline is the last fourteen Lagos days
of the same figure. Each card opens its desk.

**"Naira transacted" means money collected**, counted once on its way in:
successful charges (`transactions.status = 'SUCCESSFUL'`) plus completed
wallet top-ups (`wallet_entries.kind = 'deposit'`, `status = 'COMPLETED'`).
Money moving inside the platform (a wallet paying an escrow, a release, a
transfer between people) is not counted again.

**Naira transacted over time.** The same money, per day (Last 30 days), per
week (Last 90 days) or per month (Last 12 months), chosen with the select at
the top right (it is in the address, `?range=`, so a view can be shared).
Hover or focus the chart and use the arrow keys for each bucket's amount and
number of payments.

**Supply by type.** Live listings, examples excluded, in six kinds that do not
overlap: Land, Hotels, Shortlets and Restaurants by property type, then every
other listing as Buy when it is for sale and Rent otherwise. Each is an exact
count; the bar is its share of the largest.

**New listings per month.** Listings created in each of the last twelve
months, examples excluded, split by who listed them: Owner, Agent or Firm, from
the door the lister came through (`agent_applications.supply_role`), or for
older listers from the agent record (`business` is a firm). The three are one
blue at three strengths with the third hatched, and hovering a month names
each.

**Recent alerts.** The five newest rows in `risk_alerts`, open or resolved.
The badge says Resolved (emerald) once somebody has cleared it, otherwise
High, Medium or Info. View all opens the Alerts desk, where alerts are
resolved.

**What the overview cannot tell you yet.** How many listings were withdrawn
last week (nothing records when a listing stops being live, so "live a week
ago" counts today's live listings that were already live then), and anything
about searches or views (see Analytics).

## 4. Listings: the review queue and the single listing under review

**Where:** `/admin/listings` (the queue) and `/admin/listings/<id>` (one listing
under review). Rail row: Listings. Built to `C1D98B3C` panels 1 and 2, with the
flow of `docs/design/references/roles/GOVERNING-12` panels 1 and 2.

**Who can use it.** Anyone holding the `admin` or `super_admin` role. The
console layout checks the role once on the server (`requireAdmin`,
`lib/admin/guard.ts`) before any desk renders; every read below repeats the
check, and every read goes through the admin's own signed-in database client,
so row level security (`listings_admin_all` and friends) decides what comes
back. Nothing on this desk uses the service role.

### The queue

What you see, top to bottom:

- **Status tabs**: All, Waiting (`SUBMITTED`), Under review (`UNDER_REVIEW`),
  More info needed (`MORE_INFO_REQUIRED`), Approved (`APPROVED`, passed review
  and not yet live), Live (`PUBLISHED`), Rejected, Suspended. Every listing
  state has a tab; drafts do not, because a draft has not been submitted.
  Each tab's number is an exact count of listings in that status, examples
  included (`getListingStatusCounts`, `lib/admin/reads/listings.ts`, sixteen
  head-only count reads).
- **Search and dates**: the search matches the title or the city (never the
  street address); From and To narrow by the date the listing was created.
  Both live in the URL, so a narrowed queue can be shared.
- **The table**: photo, the listing code (or `LST-xxxxxx` before it is live,
  since the database issues the real code at publish), type, area and city,
  the lister with their role tag (Owner, Agent or Firm, from their
  registration), the price with its unit, how long ago it was submitted, and
  the status badge. An **Example** tag marks every example listing
  (`listings.is_demo`): examples exist to show how the product looks and are
  never real supply. Rows come from `getListingSubmissions`
  (`lib/admin/queries.ts`, Session A's), forty at a time; the pager numbers
  only pages it has evidence for (the read says whether there is another page,
  not how many).
- **Recently decided** (All tab, first page): the ten most recent decisions.
- **Queue health**: a donut over real listings only (Waiting, More info
  needed, Approved not yet live, Rejected), with the number of example
  listings left out written beneath it.
- **Average review time**: the median time from submission to decision over
  the last seven days, against the seven before, from the audit log's
  `listing.review` rows (`getListingReviewTimes`). `listings.reviewed_at` is
  overwritten by each decision, so it cannot give history; the audit log can.

The desk refreshes itself every thirty seconds while it is on screen.

### The listing under review

Open any row. You see: back to the queue (keeping your tab and search), the
code, a summary line (bedrooms, type, place, price), the photos with the
walkthrough video (plays in place; nothing is preloaded), Property details,
Power and water (the lister's own answers, worded exactly as the wizard asked
them), Amenities by name, the Location map (the listing's own pin on the
product's map tiles, with the provider's credit), Move-in costs or Purchase
costs **with every line naming who it is paid to** (landlord, agent, estate,
seller, state; Vallo takes no fee and the screen never implies it does),
Lister verification (role, verified or not, tier, which rungs passed), Reason
for review (the status in words, every admission check that fails, the last
note sent), the Description, and the full admission checklist. An example
listing says so above the photos.

Reads: the listing itself is Session A's `getListingSubmissions` view (so the
checklist and the costs are computed in one place); the pin, amenities,
availability, example flag, lister and the next listing are
`getListingReviewExtras` (Session B's).

### What the buttons do

- **Approve** calls `reviewListing(decision: "approve")`. The listing moves to
  `APPROVED`; the lister gets an in-app notification and an email ("passed
  review, we put it live next"); an audit row `listing.review` is appended
  with the before and after status and your note. It is NOT live yet.
- **Publish** (the same button once a listing is approved) calls
  `reviewListing(decision: "publish")`: `PUBLISHED`, the database issues the
  listing code, it enters public search, and the lister is told with the code.
- **Ask for more** calls `reviewListing(decision: "request_changes")`. It needs
  a reason (the field above the buttons); the lister receives it word for word
  and the listing moves to `MORE_INFO_REQUIRED`.
- **Reject** asks to be pressed twice, then calls
  `reviewListing(decision: "reject")`: `REJECTED`, the lister is told with
  your reason and can edit and resubmit.

After any decision the next listing waiting in your queue opens by itself; at
the end of the queue you return to it. A live or rejected listing shows no
buttons, only a line saying where it stands.

**What it cannot do.** It cannot suspend a live listing (that is Stops). It
cannot edit a listing. The Live, Rejected and Suspended tabs show the ten most
recent only, because Session A's read does not page its decided bucket; narrow
by title, city or date to reach older ones.

## 5. Moderation

**Where:** `/admin/moderation`. Built to `01F7DFC7` panel 1.

Two kinds of work in one table. **Reports** are what members filed about a
listing, a post, a story or a person (`reports`). **Held items** are what the
safety scan stopped before anybody saw them: posts, stories, story comments
and bios (`status = 'HELD'`).

- **Reason tabs**: All, then the eight reasons a member can choose (payment
  off the platform, scam, unsafe, not as described, unavailable, offensive,
  duplicate, other), then Held by the scan. A reason tab filters in the
  database and pages forty at a time (`getReportsByCategory`).
- **Total reports**: open plus in review, exact, with new reports this week
  against last and a fourteen-day sparkline of new reports.
- **Over 24 hours**: reports still open past the 24-hour promise the Community
  rules make, plus held items older than a day.
- **The table**: item, reporter (or "Safety scan"), reason, age, status. Work
  still waiting comes first, oldest first; closed reports after. Open a row to
  read the words, open what was reported, and decide.
- **Report breakdown**: waiting reports by reason, on the blue ramp.
- **Queue health**: open, in review, held, and the median time from filing to
  closing this week against last.

All figures: `getModerationSummary` (`lib/admin/reads/moderation.ts`), exact
counts and complete fourteen-day windows.

**Deciding a report** uses Session A's `ReportDecision` (`resolveReport`):
Start review, Resolve or Dismiss, each with a note; the report's status and
who moved it are written, and an audit row `report.review` is appended. The
reporter already heard their report arrived (trigger `notify_report`).

**Deciding a held item** uses `HoldDecision` (`decideHeldItem`): Let it
through (no reason needed) or Take it down (a reason is required, and the
author receives it word for word through the status triggers). Taking a bio
down empties it and leaves the profile.

**Cannot:** ban a member (Standing), or act on a message flag (Flags).

## 6. Verification

**Where:** `/admin/kyc`. Built to `8E9602E2` panel 2.

- **Awaiting review, Passed today, Failed today, Median decision time**:
  exact counts of documents from `agent_documents`, today being the Lagos
  calendar day; each against yesterday or a week ago
  (`getVerificationSummary`).
- **Identity verification queue**: one row per PERSON (their unit of work is
  a person, not a file): name, role (Owner, Agent or Firm, as they
  registered), tier on the four-rung ladder, rungs passed of four, latest
  upload, how many documents wait. Open a row for their ladder (including
  pending rungs an automated check raised), business details, and every
  document, opened inside Vallo in the DocumentViewer (never a raw storage
  link), with Approve or Reject on each pending one. Filter by document
  status and upload date; there is no name search because the name is not on
  the document row.
- **Verification funnel**: every document by decision, one status bar with
  the word on each part.
- **Results by rung**: identity, address, payout account, met in person, each
  counted passed, pending, failed (`agent_verification_checks`).
- **Recent verifications**: the ten latest decisions.

**Deciding** uses Session A's `DocumentDecision` (`reviewKycDocument`, then the
database function `review_kyc_document`): approving needs no reason;
rejecting needs one of at least twelve characters, which the person receives
word for word. The function writes the audit row and the notification.

**The render draws a "match score" and "provider performance" (NIMC, BVN,
Bank, Selfie). Nothing records a provider or a score**, so the desk shows rungs
passed and results per rung instead, which are real.

## 7. Support

**Where:** `/admin/support`. Tickets filed from the contact form and by the
assistant when it cannot answer. Search by reference or email, filter by
status and date, page forty at a time. Open a ticket to read who filed it and
the thread, reply (`replySupportTicket`; the database tells the person), and
change its status (`setTicketStatus`). A ticket about being asked to pay
outside Vallo carries the four-hour commitment rather than the ordinary day.
The Admin Queue (`/admin/queue`) is one table across listings, agents,
reports, tickets and flags, newest first, each row leading to the desk that
decides it; it decides nothing itself.

## 8. Money

**Route:** `/admin/money`. **Who:** anyone holding `admin` or `super_admin`
(checked by `requireAdmin()` in the layout and again inside every read and
action; RLS policies `wallets_select_admin`, `wallet_entries_select_admin`,
`escrows_select_admin`, `transactions_admin_select` and
`audit_log_admin_select` decide what the reads can see).

**What it is for.** Answering "where is this person's money" and "is the
platform's money where it should be" without asking an engineer to run SQL.

**What is on the screen, top to bottom, and where each figure comes from.**

| Panel | What it shows | Source |
|---|---|---|
| Stuck, and somebody is waiting | PENDING debits older than 30 minutes. Only drawn when there are any. | `getMoneyConsole()` in `lib/admin/money-queries.ts` (Session A) |
| Wallet float | Settled credits minus settled debits across every wallet, and the change against the float a week ago | `getMoneyDesk()` in `lib/admin/reads/money.ts`, every `wallet_entries` row |
| In escrow | Money in HELD, RELEASE_REQUESTED and DISPUTED escrows, and the change against what was held a week ago (worked out from `held_at` and the settle timestamps) | `getMoneyDesk()`, every `escrows` row |
| Settled this week | Value of COMPLETED wallet entries in the last 7 days, both directions, against the 7 days before | `getMoneyDesk()` |
| Failed charges | FAILED card charges (`transactions`) plus FAILED wallet top-ups (`wallet_entries`, kind `deposit`) in the last 7 days, with the count; a rise is drawn in rose because more failures is worse | `getMoneyDesk()` |
| Money in vs money out | Settled money into wallets against settled money out, per Lagos month, from the first month that had any money, for up to 12 months. Hover a month to read both figures. With fewer than two months there is no line, and the panel says so | `getMoneyDesk()` |
| Reconciliation health | The share of payment reconciliation runs in the last 7 days that came back clean, the last clean run, and a badge: Healthy, Needs a person, Gone quiet (no run for longer than the 3 hour allowance in `lib/cron/freshness.ts`) or No runs recorded | `getReconciliationHealth()` in `lib/admin/reads/money.ts`, `audit_log` rows with action `wallet.reconciliation.run` |
| Transaction summary | Money in, money out and the net over the last 30 days | `getMoneyDesk()` |
| Filter | One search box (a person's name, a wallet id or an entry reference) and a Lagos date range. It narrows the ledger, the wallets and the refunds together. It never changes the four cards, the chart or the summary, which always answer for the whole platform | `QueueFilters`, URL parameters `q`, `from`, `to` |
| Ledger | Every wallet entry, newest first: date, description (the entry's note, or its kind, and the owner), the reference in full, Credit or Debit, amount, and the platform float straight after that entry. Unsettled entries carry a status badge and leave the balance unchanged. Numbered pages of 10 (`?page=`) | `getMoneyDesk()` |
| Wallets | Newest forty wallets with settled and held figures, narrowed by the filter | `getMoneyConsole()` |
| Refunds | Every refund decided on the console and where its money is now | `getRefundConsole()` (Session A) |
| Disputed holds waiting on a ruling | Disputed escrows with the ruling control | `getEscrowConsole({ status: "DISPUTED" })` (Session A) |

**How the totals are kept honest.** PostgREST aggregates are not switched on
for this project, so sums are taken over rows. `readEvery` pages through each
table in chunks of 1,000 until it runs out and the count reached is checked
against an exact count. Above 50,000 rows it stops and the page prints "the
figures above are at least these amounts rather than totals". No figure on
this desk is the total of a capped list.

**The balance column is only shown unfiltered.** It is the platform float, so
a running balance over a filtered subset would be a number that means
nothing. Filtered, the column is dropped and the panel says why.

**Actions on this desk.** One, and it is Session A's: the escrow ruling
(release to the payee or refund to the payer, with a written reason of at
least 20 characters). It calls `resolveEscrow` in `lib/admin/money-actions.ts`,
which calls `public.escrow_admin_resolve`. That function repeats the admin
role check, refuses anything not DISPUTED, settles through
`private.escrow_settle`, writes the transition to `audit_log` through the
`escrows_guard_transition` trigger, and sends both people an in-app
notification (`private.notify`, kind `wallet`) carrying the ruling word for
word. Nothing else on this desk writes.

**Today's reality (22 September).** One wallet, two entries (one completed
₦1,000 top-up, one failed ₦1,000 withdrawal), no escrows, no failed card
charges, reconciliation clean on every recorded run. The desk draws exactly
that: a float of ₦1,000, zeros elsewhere, no trend line (one month of money
is not a trend), and a two row ledger.

## 9. Escrow

**Route:** `/admin/escrow`. **Who:** `admin` or `super_admin`, as above.

**What it is for.** Seeing every naira the platform is holding between two
people, and ruling on the ones where somebody objected.

| Panel | What it shows | Source |
|---|---|---|
| The pipeline | Six tiles: Funded, Held, Release requested, Released, Refunded, Disputed, each with the count of escrows in that state across the platform. Each tile is a link that narrows the table to that state; pressing the lit one clears it. Disputed turns rose when it is not zero | `getEscrowDesk()` in `lib/admin/reads/escrow.ts`, every `escrows` row |
| Filter | Search by property title, a status chip for every escrow state, a Lagos date range | `QueueFilters`, URL `q`, `status`, `from`, `to` |
| Waiting on a ruling | Every dispute on the platform, never paged, oldest first: both people, the property, both confirmations (and whether the payer's came from an inspection), the objection in the objector's words, the platform share, and the ruling control | `getEscrowDesk().disputes` |
| Live escrows | Every escrow not yet settled (or, with a state chosen, every escrow in that state): short id (the first eight characters of its id, full id on hover), property, amount, payer to payee, purpose, whole days since it was held, and the time left until it releases on its own, in the render's "4d 12h" form (it reads "due" once the moment has passed; the sweeper releases on its own schedule). Settled rows show their state instead of a countdown. Numbered pages of 10 | `getEscrowDesk().table` |
| Float total | HELD plus RELEASE_REQUESTED plus DISPUTED money, and how many escrows are still running | `getEscrowDesk()` |
| Reconciliation check | The same reconciliation read as the money desk, as a check plate and a badge | `getReconciliationHealth()` |
| Escrow by purpose | Every escrow split into rent deposit, first rent, purchase deposit and purchase balance, on the blue ramp, largest first, with share and count beside every slice | `getEscrowDesk().pipeline.byPurpose` |
| Recent activity | The newest six transitions across all escrows, from the seven timestamp columns (funded, held, release requested, released, refunded, disputed, ruled on) plus opened | `getEscrowDesk().pipeline.recent` |

**The action.** The ruling, exactly as described under Money: Session A's
`resolveEscrow`, unchanged.

**What this desk cannot do.** Release or refund an escrow that is not
disputed (the database refuses it; the parties or the auto release sweeper
move those), change an amount, or open an escrow.

**Today's reality.** `escrows` holds no rows. Every tile reads 0, the table
says the platform is not holding anybody's money, the donut and the activity
list say nothing has happened yet.

## 10. Supply

**Route:** `/admin/supply` (new). **Who:** `admin` or `super_admin`.

**What it is for.** Knowing who supplies the platform: how many owners,
agents, firms and hosts, who is verified, what each one lists and what has
been paid to them, and where the supply is.

**The four roles,** exactly as the product's workspace switch resolves them
(`lib/supply/workspaces-queries.ts`): an `agents` row is an Owner or an Agent
by its application's `supply_role`, falling back to the agent type; a
`businesses` row is a Firm when its kind is `agency` and a Host otherwise.

**Examples are not supply.** Every listing, accommodation, agent and business
on the platform on 22 September carried `is_demo`. They are left out of every
figure by default and the page says how many were left out. The "Examples
left out" control (`?examples=1`) puts them back in and the control then reads
"Including examples", so a screenshot can never pass an example off as real
supply.

| Panel | What it shows | Source |
|---|---|---|
| Owners, Agents, Firms, Hosts | Accounts in each role, and the change against the count a week ago (from join dates). Each card is a link that narrows the table to that role | `getSupplyDesk()` in `lib/admin/reads/supply.ts` |
| Supply by role | Name, role, live listings (for a host, live accommodations; for a firm, the listings of its agent account), verified (a tick and the word Yes, or a cross and No), total transacted (escrow released to the account plus confirmed and completed bookings on its live listings), and the month it joined. Newest first, numbered pages of 8 | `getSupplyDesk()` over `agents`, `agent_applications`, `businesses`, `listings`, `accommodations`, `escrows`, `bookings` |
| Supply growth by role | How many accounts in each role had joined by the end of each of the last six months. Four series on one blue ramp, told apart by dash pattern and a name at the end of each line, never by colour alone. Hover a month for all four figures | `getSupplyDesk().growth` |
| Top 5 areas by supply | Live listings plus live accommodations by area (city where no area is given), ranked | `getSupplyDesk().topAreas` |
| Supply by property type | Live listings by property type, on the blue ramp, with share and count | `getSupplyDesk().byPropertyType` |

**Actions.** None. The desk reads; approving supply is on the Agent
applications and Businesses desks.

**Today's reality.** With examples left out, every figure is zero: there is
no real supply yet, and the desk says so on every panel.

## 11. Bookings

**Route:** `/admin/bookings`, `/admin/bookings/[bookingId]` and
`/admin/bookings/reservations`. Unchanged in behaviour by this rebuild; it
wears the console register from the shell.

- **The board** (`getBookingBoard` in `lib/admin/bookings-queries.ts`, Session
  A) lists stays in three groups, live, past and cancelled, each with its
  status, what has been paid (successful `transactions` summed per booking)
  and what has been refunded.
- **A stay's page** (`getBookingDetail`) shows the guest, the listing, the
  dates, the money, and the cancel control. Cancelling as an operator calls
  `cancelBookingAsAdmin`, which previews the refund from the published
  cancellation schedule (`previewCancellation`), then calls
  `refund_and_cancel_booking`; the operator chooses only the reason, never
  the amount. The refund lands as a wallet entry that the Refunds panel on
  the money desk then tracks.
- **Reservations** (`getReservationBoard`) lists restaurant and venue
  reservations; accepting or declining calls `decideReservationAsAdmin`,
  which updates the row and notifies the guest.

**Today's reality.** Zero bookings and zero reservations have ever been made.

## 12. Payments

**Route:** `/admin/payments`. Unchanged in behaviour by this rebuild.

- **Overdrawn wallets** and **stuck withdrawal holds** come from
  `getPaymentHealth` (Session A), which calls `public.admin_payment_health`, a
  security definer function that repeats the admin role check.
- **Release stuck holds** calls `expireStaleWithdrawalHolds`
  (`admin_expire_stale_withdrawal_holds`), which releases withdrawal holds
  older than the stale window back to spendable balance.
- **Waiting on the provider** lists payments Paystack has not settled in the
  last 30 days. Re-asking the provider is the reconcile job's decision, not
  this screen's.
- **Look up a person's saved methods** shows masked card and bank details and
  lets an operator remove one (`removePaymentMethodAsAdmin`,
  `removeBankAccountAsAdmin`), which notifies the owner.

## 13. Operations: scheduled jobs, alerts, audit log, notifications

Drawn from the render `01F7DFC7`, panel two. `/admin/operations`, with four
tabs in the address (`?tab=alerts`, `?tab=audit`, `?tab=notifications`).
Reads: `lib/admin/reads/operations.ts` (`getJobHealth`, `getRunDays`,
`getAlertTrend`) and the existing `getRiskAlerts`, `getAuditLog` and
`getAuditActivity`. Nothing on this desk changes anything; it reads.

**Jobs healthy.** How many of the seven Vercel Cron jobs are on schedule and
did not fail on their last run, with the share in words and a line of the
scheduled runs that did not fail per day for fourteen days.

**Active alerts.** Open rows in `risk_alerts`, against how many were open a
week ago (an alert was open then if it had been raised by then and was not yet
resolved; both are exact counts from the alerts' own dates). Fewer is good, so
a fall is emerald. The line is alerts raised per day.

**Every scheduled job.** The platform has two schedulers.

| Job | Scheduler | When (Lagos) | Allowed silence | What it does |
|---|---|---|---|---|
| hold-sweep | Vercel Cron `5 * * * *` | hourly at :05 | 3 h | releases wallet holds past their window |
| paystack-reconcile | Vercel Cron `10 * * * *` | hourly at :10 | 3 h | matches Paystack charges to the ledger |
| pg-cron-watch | Vercel Cron `20 * * * *` | hourly at :20 | 3 h | watches the database's own jobs and raises failures |
| complete-stays | Vercel Cron `30 2 * * *` | daily 03:30 | 26 h | completes stays whose check-out has passed |
| inventory-drift | Vercel Cron `45 2 * * *` | daily 03:45 | 26 h | checks room inventory against bookings |
| account-purge | Vercel Cron `15 3 * * *` | daily 04:15 | 26 h | honours account deletions after thirty days |
| saved-search-alerts | Vercel Cron `40 7 * * *` | daily 08:40 | 26 h | tells people about new matches for saved searches |
| vallo_release_stale_holds | pg_cron `*/15 * * * *` | every 15 min | | database side of the hold release |
| vallo_purge_rate_limits | pg_cron `30 * * * *` | hourly at :30 | | clears old rate limit rows |
| vallo_escrow_sweep_timeouts | pg_cron `17 * * * *` | hourly at :17 | | escrow timeouts |
| vallo_reconcile_payments | pg_cron `47 * * * *` | hourly at :47 | | database side of reconciliation |
| vallo_purge_idempotency | pg_cron `10 2 * * *` | daily 03:10 | | clears old idempotency records |
| vallo-nightly-badges | pg_cron `20 2 * * *` | daily 03:20 | | awards earned badges |
| vallo_announce_completed_stays | pg_cron `20 5 * * *` | daily 06:20 | | announces completed stays |
| vallo-daily-note | pg_cron `0 6 * * *` | daily 07:00 | | the daily note |

The Vercel jobs' schedules come from `apps/web/vercel.json` (a test fails if
the console's copy drifts from it) and their allowances from `WATCHED_JOBS` in
`lib/cron/freshness.ts`. **Last run, duration and status** come from the
audit row every run writes (`lib/cron/report.ts`: `entity_type = 'cron_job'`,
`action = cron.<job>.<ok|attention|failed>`, `metadata.duration_ms`; the money
reconcile writes `wallet.reconciliation.run` with `metadata.outcome`, and
records no duration). The console reads the newest row per job, so "last run"
is exact however long ago it was. Status: **Healthy** (on time, last run ok),
**Attention** (on time, the run reported something to look at), **Failed**
(the last run failed, solid rose), **Overdue** (silent past its allowance),
**No run yet** (never reported).

The **database jobs** are one summary row until Request A5 lands: the newest
`pg-cron-watch` run's own counts of failures in the last day, how many of
those have since recovered, how many have not run yet and how many are
overdue.

**Alerts tab.** The forty newest alerts. Resolving one happens on the Alerts
desk (`/admin/alerts`), which records who resolved it and when.

**Audit log tab.** Entries per day for thirty days (the read counts up to
5,000 rows and says so if it hits that cap), the kinds of thing recorded,
and the latest entries. Each entry opens the Audit log desk filtered to that
record. The Audit log desk searches by id, by words in the action, by kind
and by date.

**Notifications tab.** Every notification the platform sends has one of eight
kinds: booking, message, wallet, listing, agent, support, system, social. An
admin cannot read the notifications table today (its only read policy is the
recipient's own), so this tab says "Not wired yet" and names Request A6.

**Recent alerts and Audit log** sit beneath every tab: the four newest alerts
and the five newest audit entries.

## 14. Analytics

Drawn from the render `01F7DFC7`, panel three. `/admin/analytics?range=30d`
(or `90d`, `12m`). Reads: `lib/admin/reads/analytics.ts`
(`getBookingOutcomes`, `getSupplySeries`, `getThinAreas`).

| Panel | Source | State today |
|---|---|---|
| Total searches | nothing records a search | Not recorded, Request A7 |
| Listing views | nothing records a listing view | Not recorded, Request A8 |
| Successful bookings | exact count of `bookings` confirmed or completed, created in the range, against the same length of time before it | real; zero on 22 September |
| Conversion rate | needs searches or views | Not recorded, A7 and A8 |
| Demand vs supply | supply: listings created per bucket, examples excluded; demand: not recorded | the supply line is real; searches are named as missing on the legend |
| Top areas by searches | nothing records a search | Not wired yet, A7 |
| Areas with fewest listings | live listings grouped by area and city, fewest first, examples excluded | real; empty while no real listing is live |
| Searches vs results returned | nothing records a search or its result count | Not wired yet, A7 |
| Top common refusals | declines carry free text or nothing | Not wired yet, A11 |

The render also draws an "All areas" filter; it is not built, because no
figure on the page that exists today varies by area except the thin areas
table, which already lists them.

## 15. The other desks

These desks keep their own behaviour and were brought into the console's
register (panel material, page head, status badges) without changing what
they do. Each is reached from its parent row or from All desks.

| Desk | Where | What it is for |
|---|---|---|
| Unified queue | Overview > Unified queue, `/admin/queue` | every waiting item from the listing, application, report, flag and ticket queues in one table |
| Applications | Supply > Applications, `/admin/agents` | admit or refuse people who asked to list as an agent or owner |
| Businesses | Supply > Businesses, `/admin/businesses` | hotels and restaurants, their verification ladder and going live |
| Stops | Supply > Stops, `/admin/stops` | stop and reinstate a lister's right to trade |
| Payments | Money > Payments, `/admin/payments` | overdrawn wallets, frozen withdrawals, holds to sweep |
| Fees | Money > Fees, `/admin/fees` | the fee rates in force |
| Message flags | Moderation > Message flags, `/admin/flags` | messages the safety scan flagged |
| Reports | Moderation > Reports, `/admin/reports` | reports people filed |
| Around | Moderation > Around, `/admin/social` | places waiting to open on the social side |
| Standing | Moderation > Standing, `/admin/standing` | badges granted by hand |
| Alerts | Operations > Alerts, `/admin/alerts` | resolve risk alerts |
| Audit log | Operations > Audit log, `/admin/audit` | who did what, when |
| Switches | Settings > Switches, `/admin/switches` | turn a surface off in an incident |
| Reference data | Settings > Reference data, `/admin/reference` | occupations and local governments |
| Examples | Settings > Examples, `/admin/examples` | the example listings and their retirement dates |

## 16. Everyday procedures

(each worker adds the step by step runbooks for its desks: approving a listing,
asking for more, rejecting, deciding a report, passing or failing a
verification, releasing or refunding an escrow, investigating a failed charge,
reading a reconciliation failure)

### Review desks (admin-review)

**Approving a listing.** Open `/admin/listings`, Waiting tab. Open the oldest
row you are responsible for. Read Reason for review first: every admission
check that fails is listed there. Check the photos and play the walkthrough,
read Power and water against the description, check the costs (every line says
who it is paid to; a total that is "summed from the parts" was not stated by
the lister), and check Lister verification. If it passes, press Approve (a
note is optional). The next listing opens by itself. When you are ready to put
approved listings into search, open the Approved tab, open each, and press
Publish.

**Asking for more.** Write exactly what must change in the reason field ("The
fourth photo is of a different flat; replace it"). The lister reads it word
for word. Press Ask for more. The listing moves to More info needed and comes
back to Waiting when they resubmit.

**Rejecting.** Only for a listing that cannot become acceptable by editing
(not the lister's to let, a scam, a duplicate). Write why, press Reject, press
it again to confirm. The lister is told and may still edit and resubmit.

**Deciding a report.** `/admin/moderation`. Work top down: waiting items are
oldest first. Open the row, read the reporter's words and open what was
reported. Start review if it will take time (the reporter's report now shows
as in review under your name). Resolve when you have acted (for a listing,
suspend it on Stops or send it back through the listings desk); Dismiss when
there is nothing to act on. Write a note either way; it is in the audit log.

**A held post, story, comment or bio.** Open the row, read the words and why
the scan held them. Let it through, or write the reason and Take it down: the
author reads your reason word for word.

**Passing or failing a verification.** `/admin/kyc`. Open the person's row.
Open each document in the viewer. For a proof of address, check the issue date
(a badge says when it is older than 92 days or undated). Approve, or Reject
with a reason of at least twelve characters that tells them what to upload
instead. Their ladder and tier update when the rung's documents are decided.

### Money desks (admin-money)

**Ruling on a disputed escrow.** Open `/admin/escrow` (or the money desk's
"Disputed holds" panel). Read both confirmations and the objection. Decide
release (the payee is paid) or refund (the payer is paid back). Write what you
decided and why, at least 20 characters: both people are sent it word for
word. Choose the direction; the control shows exactly what moves and to whom
before anything happens. Confirm. The escrow leaves the Disputed tile and the
transition is in the audit log.

**Investigating a failed charge.** On `/admin/money`, the Failed charges card
counts this week's failures. Search the person's name or the reference in the
filter; the ledger shows their entries with a Failed badge and the full
reference. Give that reference to Paystack support. A failed top-up moved no
money, so the balance column does not change beside it.

**Reading a reconciliation failure.** The Reconciliation health badge reads:
Healthy (the newest run was clean and the job ran inside its 3 hour
allowance), Needs a person (the newest run reported a gap, an overdrawn wallet
or a hold it could not release; open Risk alerts for the
`cron.reconcile.needs_attention` alert with the counts), Gone quiet (no run
for more than 3 hours: the scheduler or the site origin in Vault is broken;
tell an engineer, this is how the job failed silently for three weeks in
August), or No runs recorded.

**Answering "where is my money".** Search the person on `/admin/money`. Stuck
first: a PENDING debit older than 30 minutes is at the top. Then the ledger
narrowed to them, their wallet in Wallets, any refund in Refunds, and any
escrow they are party to on `/admin/escrow` (search by the property).

### Operations runbooks (admin-shell)

**A job reads Overdue or Failed.**
1. Open Operations. Note the job, its last run and its schedule.
2. Open the Alerts tab: a failed run raises a `cron.<job>.failed` alert with
   the reason; a scheduler that could not get in raises `cron.<job>.locked_out`
   with the fix in its detail.
3. Locked out: the scheduler's secret does not match. `CRON_SECRET` on the
   scheduler must equal `RECONCILE_CRON_SECRET` on the host, and the
   scheduler's variable must be named exactly `CRON_SECRET` (docs/DEPLOY.md,
   section 2). This is an engineering fix; hand it on with the alert.
4. Failed: the reason in the alert is the job's own error. Hand it on.
5. When the next run succeeds the row turns Healthy on its own within a
   minute; resolve the alert on the Alerts desk so the count comes down.

**The database jobs row reads Attention.** The watch found a failure that has
not recovered, or a job overdue. The per-job list needs Request A5; until then
the `cron.pg_cron.job_failed` alert names the job.

**A figure reads Unavailable.** A read failed. Reload once. If it persists on
every desk, the database is unreachable (check the Alerts tab and the
platform status); if only one panel, report it with the panel's name.

## 17. What the console cannot do, and the open requests

(each worker: honest limits, and the scope-file request numbers for data the
console needs and does not have yet)

### Review desks (admin-review)

- **The Live, Rejected and Suspended tabs show the ten most recent.** Session
  A's `getListingSubmissions` caps its decided bucket at ten with no offset;
  narrowing by title, city or date reaches older ones. Tab COUNTS are exact.
- **The listing under review is found by its own title and status** inside
  Session A's view, so that the checklist and the costs are computed in one
  place. A listing whose title contains a comma or brackets may not be found
  that way; the page says it could not be opened rather than guessing.
- **Verification cannot be searched by name**: the name is not on the
  document row. Status and date narrow it.
- **No provider match score exists** in the schema, so none is shown.
- **The desks decide nothing of their own.** Approve, Publish, Ask for more,
  Reject, report decisions, held-item decisions and document decisions all
  call Session A's existing actions, unchanged.
- No open requests: AR-1 to AR-9 were withdrawn when Session B wrote the reads
  itself (`lib/admin/reads/listings.ts`, `moderation.ts`, `verification.ts`).

### Money desks (admin-money)

- **The reconciliation job's last HTTP reply is not on the desks.** It lives in
  `private.reconciliation_watch`, which no admin read can reach. Scope request
  10 asks Session A for an admin-callable function; until then the panels show
  the audit history only.
- **Sums are taken over rows, not in Postgres.** PostgREST aggregates are off,
  so every total pages through the whole table (checked against an exact
  count). Above 50,000 rows a desk says its figures are floors. A database
  side aggregate would lift this; it is a migration, not requested yet
  because the platform is five orders of magnitude below it.
- **The wallets list is still the newest forty** (`getMoneyConsole`, Session
  A's). The ledger and the cards are not capped.
- **Supply cannot yet say who owns versus who agents a particular property.**
  The role is per account; `lib/supply/roles.ts` records that ownership is a
  property of a person and a property together, and that pair is not in the
  schema yet.
- **Nothing on these desks writes except the escrow ruling,** which is
  Session A's mutation.

### Overview and analytics limits (admin-shell)

- "Live a week ago" counts the listings live now that were already live then.
  A listing withdrawn during the week is not in it, because nothing records
  when a listing stops being live.
- Searches, listing views and refusal reasons are not recorded (Requests A7,
  A8, A11), so demand, conversion, top areas by searches, searches against
  results and common refusals cannot be shown.
- The database's own eight scheduled jobs are summarised, not listed
  (Request A5).
- Notification volumes cannot be read by an admin (Request A6).
- Open reviews has no week-on-week change: an open count has no history until
  something snapshots it.
- The render's "All areas" filter on Analytics is not built.

## 18. Options considered and rejected

(each worker: the alternatives weighed for its desks and why they lost; charting
approach and palette decisions from `docs/research/UI_UNIQUENESS_AND_ADMIN_RESEARCH.md`
part four belong here)

### Review desks (admin-review)

- **The render's reason tabs (Abuse, Fraud, Spam, Sexual content,
  Impersonation).** Rejected: the platform records eight other reasons
  (`reports_category_chk`), and a tab for a reason nobody can choose filters
  nothing. The tabs are the real eight.
- **Filtering reports by reason over a fetched page.** Rejected: it searches
  only what the page cap returned. The reason is narrowed in the query.
- **Counting a tab from the rows on screen.** Rejected: a count of a page is
  not a count of a queue. Every figure is a head-only exact count.
- **Folding example listings into the counts.** Rejected: on 22 September all
  64 live listings were examples and real supply was zero. Examples are
  counted apart and tagged wherever they are listed.
- **Average review time from `listings.reviewed_at`.** Rejected: each decision
  overwrites it, so it holds only the latest. The audit log's `listing.review`
  rows give every decision.
- **A confirmation sheet on every decision** (the old desk). Replaced by the
  render's inline bar; the two decisions that cannot be undone by the lister
  keep a guard (Ask for more needs a reason; Reject asks twice).
- **Drawing "match score" and "provider performance" from the render.**
  Rejected under the claims rule: nothing records them. The rung results
  are real and stand in their place.
- **A local copy of the sparkline.** Rejected once admin-shell's shared
  `Sparkline` landed; the donut stays local because the shared one is the
  agent console's booking-sources chart with a different anatomy.

### Money desks (admin-money)

- **A charting library (Recharts and friends).** Rejected for the reasons in
  research part four: every console page is a server component and a library
  chart is a client one; our theme is CSS custom properties that SVG follows
  without script; every library ships a default palette with banned hues.
  Inline SVG drawn on the server, with a small client layer that only tracks
  the pointer for the hover readout.
- **A four hue palette for four supply roles, and the render's teal, mauve and
  pink donut slices.** Rejected: research part four proved no four slot
  categorical palette passes inside the colour law. One blue ramp by
  magnitude, dash patterns and direct labels on lines, and the word, share
  and count beside every donut slice.
- **Deriving the money cards from `getMoneyConsole`.** Tried first, behind a
  gate that only used its rows when they were provably every row. It worked
  for today's data and would have gone dark at the sixtieth entry. Replaced
  by `getMoneyDesk`, which reads everything and checks the count.
- **"+100%" against an empty week.** Rejected: a change is only drawn when
  the earlier period had a real, non-zero figure. Otherwise the card says
  what the figure is and draws no arrow.
- **Counting examples as supply.** Rejected under the founder's claims
  ruling: examples are excluded by default and the page counts them
  separately.
- **A cursor pager on escrow.** The shared queue pager offers only next and
  previous because the old read had no total. The render draws numbered
  pages, and `getEscrowDesk` has an exact total, so the desk uses numbered
  pages.

### Shell, overview, operations and analytics (admin-shell)

- **A charting library** (Recharts, Nivo, Chart.js, ECharts, Tremor): rejected
  for the reasons in `docs/research/UI_UNIQUENESS_AND_ADMIN_RESEARCH.md` part
  four: each makes every chart a client component, fights the CSS custom
  property themes, ships a banned default palette and costs 90 to 200KB. The
  charts are hand drawn inline SVG in `components/agent/charts/` beside the
  two that were already there, with only the hover readout on the client.
- **Four colours for Owner, Agent and Firm**, as the render draws them:
  rejected; a four slot palette cannot pass the colour-blind checks inside the
  colour law. One blue at three strengths, the third hatched, with a legend
  and a readout naming each.
- **Counting example listings as supply**: rejected; seeded stock read as a
  market is exactly the false window the founder condemned. Examples live on
  the Examples desk.
- **"Naira transacted" as every wallet movement**: rejected; a payment from a
  wallet into escrow and its release would count the same naira three times.
  Money is counted once, on its way in.
- **Deriving job health from a page of recent audit rows**: rejected; a daily
  job falls off a forty row page of hourly runs and would read as missing. One
  read per job, newest first.
- **Drawing a flat line through an empty series**: rejected; an empty chart
  says in words that nothing has happened and what will fill it.
- **Keeping the banded nineteen-row rail**: replaced by the renders' twelve
  rows with every other desk as a child and in All desks, so the rail matches
  the images and no desk is orphaned.
- **Putting the pulse strip in the top bar**, as the overview render does:
  rejected in favour of the three-panel renders' bar (search, bell, operator)
  shared by every desk; the strip leads the overview page instead.
