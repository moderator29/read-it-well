# The Vallo admin console: the operations handbook

This is the document a new operations person reads on their first day and can
then run the platform from. Every desk is here: what it shows, where each number
comes from, what each action does, who may take it, what it changes, and what the
desk cannot do. The last part records the options that were considered and
rejected, with the reasons.

Owned by Session B (`docs/archive/SESSION_B_SCOPE.md`). The queries and actions behind
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
`/admin`, including when you arrive by address. The first time in a browser
session that you open any desk address (typed, bookmarked, sent to you, or
returned to after signing in with `?next=/admin/money`), the console sends
you to the Overview first, and the Overview's first line is "You were
heading to Money" with a Continue link straight to that desk. After that,
for the rest of the browser session, desk addresses open directly. The
session is remembered in a cookie that holds your user id and ends when the
browser closes; signing in as someone else starts a new session. This lives
in `app/admin/_components/EntryGate.tsx` and `entry.ts`, and only a console
address is ever offered back.

It works with JavaScript off. The "Opening the overview first." link a desk
shows while it hands you to the Overview goes through
`/admin/enter?next=<where>` (`app/admin/enter/route.ts`). That address checks
you are an admin, sets the same session cookie on the server (path `/admin`,
SameSite Lax, no expiry) and sends you on with a 303, always to the
Overview: bare, or carrying the desk you asked for. It never sends you
straight to a desk, so even a typed or bookmarked `/admin/enter` link
cannot skip the Overview; anything that is not a console desk, including
another site, lands on the bare Overview. Someone who is not an admin gets
no cookie and is sent to `/admin`, which says why. The Overview's Continue
is then a plain link to the desk, because the cookie is already set.

**The back arrow.** The top bar opens with the platform's back arrow. It
goes up the console's declared hierarchy (`lib/nav/route-parents.ts`), not
back through your browser history: from any desk to the Overview, from a
record (a listing under review, a booking) to its desk, and from the
Overview to Home.

**How to read a panel.** Every panel is one of four things, and it always says
which:

| What you see | What it means |
|---|---|
| Figures, a chart or rows | Read from the database just now. Every number came back from a query; none is typed into the page. |
| A quiet panel with a title such as "No money has moved yet in this range" | The read worked and there is genuinely nothing to count. On 22 September that is the normal state: no real listing is live, no booking has been made, no money has been collected. |
| "Not recorded" (on a figure) or "Not wired yet" (on a panel) | The platform does not record this yet. The panel names the request in `docs/archive/SESSION_B_SCOPE.md` that would start recording it. It is not a fault of the platform or of your data. |
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
is work waiting on that one desk right now, read by `getQueueCounts()` on
every page load: listings waiting on a review decision (Listings, the same
figure as the overview's Open reviews), held posts, stories, comments and bios
(Moderation), open or pending tickets (Support), open alerts (Operations and
Alerts), and under their parents applications waiting (Applications),
flagged messages (Message flags) and open reports (Reports). Hover a number,
or listen to it, and it says what it counts. Rows without a queue carry none.

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
| Jobs healthy | the share of the Vercel Cron jobs (every one in `VERCEL_JOBS`) whose last run was on time and did not fail (Operations has the table) | none; a job count has no history |

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

### Mandates

Under the queue, the **Mandates** panel: what an agent or a firm holds instead
of ownership (`listing_mandates`), the owner's written instruction with the
owner's name and a number to ring. One status bar gives exact counts by
decision (Waiting, Approved, Rejected); the table lists every waiting mandate
(oldest first) and the twenty latest decisions: the listing, the kind
(letting, sale, management, and whether exclusive where the lister said), the
principal, the date signed and the status. Open a row for the principal's
number (the call to it is the check; the document is a photograph), whether a
document is on file and when the mandate expires, and for a refused one the
reason. Read by `getMandateQueue` (`lib/admin/reads/listings.ts`) under
`listing_mandates_staff_all`.

**It cannot decide a mandate yet.** Nothing in Session A's `lib/admin` approves
or refuses one; scope request AR-12 asks for `reviewListingMandate`. Until it
lands, ring the principal and record the outcome with the engineering team.
A listing whose mandate was refused cannot be published (Track G migration 6).

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
`escrows_select_admin`, `transactions_admin_select`,
`rent_payments_admin_select`, `bookings_admin_all` and
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
| Tenancy charges | Every move-in charge (`rent_payments`: what a tenant pays to take the keys after the lister accepted an inspection), by where it stands, on one status bar with a word and a count per state: Awaiting payment (its booking is PENDING and nothing has settled), Paid (a SUCCESSFUL transaction settled against its booking), Cancelled or did not move in (the booking was cancelled, including by the 48 hour sweep of unpaid holds, or marked no-show), Needs a look (a confirmed or completed booking with no settled payment, or a charge whose booking was not found: never guessed at). Then what is paid and what is awaited in naira, and the six newest charges: opened, listing and tenant, the carrying booking id, move-in day and period, the frozen total, the state. Whole-platform: the filter below never narrows it. With no charge it keeps its bar, key and table head and says what fills it, what creates a charge, and links to bookings | `getRentCharges()` in `lib/admin/reads/money.ts`: every `rent_payments` row against an exact count, every carrying booking's status and every SUCCESSFUL transaction on those bookings; titles and names only for the rows printed |
| Filter | One search box (a person's name, a wallet id or an entry reference) and a Lagos date range. It narrows the ledger, the wallets and the refunds together. It never changes the four cards, the chart or the summary, which always answer for the whole platform | `QueueFilters`, URL parameters `q`, `from`, `to` |
| Ledger | Every wallet entry, newest first: date, description (the entry's note, or its kind, and the owner), the reference in full, Credit or Debit, amount, and the platform float straight after that entry. Unsettled entries carry a status badge and leave the balance unchanged. Numbered pages of 10 (`?page=`) | `getMoneyDesk()` |
| Wallets | Newest forty wallets with settled and held figures, narrowed by the filter | `getMoneyConsole()` |
| Refunds | Every refund decided on the console and where its money is now | `getRefundConsole()` (Session A) |
| Disputed holds waiting on a ruling | Disputed escrows, with everything each side has filed shown above the ruling control (see Escrow, "Evidence filed") | `getEscrowConsole({ status: "DISPUTED" })` (Session A); evidence `getDisputeEvidence()` in `lib/admin/reads/escrow.ts` |

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
charges, no tenancy charges (`rent_payments` held 0 rows on 23 September),
reconciliation clean on every recorded run. The desk draws exactly
that: a float of ₦1,000, zeros elsewhere, no trend line (one month of money
is not a trend), and a two row ledger.

## 9. Escrow

**Route:** `/admin/escrow`. **Who:** `admin` or `super_admin`, as above.

**What it is for.** Seeing every naira the platform is holding between two
people, and ruling on the ones where somebody objected.

| Panel | What it shows | Source |
|---|---|---|
| The pipeline | Six tiles: Funded, Held, Release requested, Released, Refunded, Disputed, each with the count of escrows in that state across the platform. Each tile is a link that narrows the table to that state; pressing the lit one clears it. Disputed turns rose when it is not zero | `getEscrowDesk()` in `lib/admin/reads/escrow.ts`, every `escrows` row |
| Filter | Search by property title, a status chip for every escrow state (all nine in the live schema, including Cancelled), a Lagos date range | `QueueFilters`, URL `q`, `status`, `from`, `to` |
| Waiting on a ruling | Every dispute on the platform, never paged, oldest first: both people, the property, both confirmations (and whether the payer's came from an inspection), the objection in the objector's words, the platform share, and the ruling control | `getEscrowDesk().disputes` |
| Evidence filed (on each ruling) | Everything either side has filed on that dispute, oldest first, above the ruling so nobody rules without reading it: which side filed it (Payer or Payee, and the name; "Neither party" if someone else did), what it is (one of the thirteen closed facts in words, with its date or amount, or a file with its name, caption, type and size), when it was filed, and for a file an "Open file" link: a ten-minute signed link into the private `escrow-evidence` bucket that opens in the browser's own viewer (the console has no document viewer to reuse). A file that could not be signed says so. A failed read says "The evidence could not be read", never "nothing filed". With nothing filed it says so and that each side files from their own held payment page. Also drawn on the Money desk's disputed holds | `getDisputeEvidence()` in `lib/admin/reads/escrow.ts`: `escrow_evidence` under `escrow_evidence_select_admin`, the escrow's payer and payee, names from `profiles`, links signed under `escrow_evidence_objects_admin_read` |
| Live escrows | Every escrow not yet settled (or, with a state chosen, every escrow in that state): short id (the first eight characters of its id, full id on hover), property, amount, payer to payee, purpose, whole days since it was held, and the time left until it releases on its own, in the render's "4d 12h" form (it reads "due" once the moment has passed; the sweeper releases on its own schedule). Settled rows show their state instead of a countdown. Numbered pages of 10 | `getEscrowDesk().table` |
| Float total | HELD plus RELEASE_REQUESTED plus DISPUTED money, and how many escrows are still running | `getEscrowDesk()` |
| Reconciliation check | The same reconciliation read as the money desk, as a check plate and a badge | `getReconciliationHealth()` |
| Float, booked daily | The escrow float as the daily job books it (`escrow_float_snapshots`, one row a day) beside the float the ledger books, as two lines, with a hover readout of both, the difference and the escrow count. Under it the invariant the table records: the difference between the two, where zero is Balanced (emerald) and anything else Does not balance (rose), the latest day's figures, how many days balanced and the last day that did not. With one day there is no line and the panel says so; the verdict is still printed | `getEscrowFloatHistory()` in `lib/admin/reads/escrow.ts`, every snapshot against an exact count, under `escrow_float_snapshots_select_admin` |
| Escrow by purpose | Every escrow split by purpose: rent deposit, first rent, purchase deposit, purchase balance and agency fee (`agency_fee`, in the live schema since 23 September and not yet in the generated types; the desk counts it and any purpose added later rather than failing), on the blue ramp, largest first, with share and count beside every slice | `getEscrowDesk().pipeline.byPurpose` |
| Recent activity | The newest six transitions across all escrows, from the seven timestamp columns (funded, held, release requested, released, refunded, disputed, ruled on) plus opened | `getEscrowDesk().pipeline.recent` |

**The action.** The ruling, exactly as described under Money: Session A's
`resolveEscrow`, unchanged.

**What this desk cannot do.** Release or refund an escrow that is not
disputed (the database refuses it; the parties or the auto release sweeper
move those), change an amount, or open an escrow. It cannot add, edit or
remove evidence either: `escrow_evidence` is append only by trigger, and only
the parties file.

**Today's reality.** `escrows` holds no rows. Every tile reads 0, the table
says the platform is not holding anybody's money, the donut and the activity
list say nothing has happened yet. `escrow_evidence` holds no rows.
`escrow_float_snapshots` holds one: 23 September, a float of ₦0 against a
ledger float of ₦0, Balanced; the float panel says one day is booked and
draws no line.

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
| Firm rosters | Who works at which firm (`firm_members`): exact counts of memberships Pending, Active and Revoked on one status bar with words, then each firm's roster under its name (firms with someone pending first): agent, Principal or Staff, the state, and the day admitted, or the day revoked with the revocation note. Members of example firms are left out unless examples are asked for, and the count left out is printed. With no member it keeps its bar and table head and says how a member is admitted | `getFirmRosters()` in `lib/admin/reads/supply.ts`, under `firm_members_staff_all` (select only), firm names from `businesses`, agent names from `agents` |

**Actions.** None. The desk reads; approving supply is on the Agent
applications and Businesses desks. Admitting or revoking a firm member is
`private.admit_firm_member` and `private.revoke_firm_member`, each of which
writes an audit row; no console control calls them yet.

**Today's reality.** With examples left out, every figure is zero: there is
no real supply yet, and the desk says so on every panel. `firm_members` holds
no rows, so the rosters panel reads 0 pending, 0 active, 0 revoked.

## 11. Bookings

**Route:** `/admin/bookings` (the stays desk), `/admin/bookings/[bookingId]`
(one stay) and `/admin/bookings/reservations` (restaurant tables). **Who:**
`admin` or `super_admin`; every read repeats `requireAdmin()` and goes
through the admin's RLS client (`bookings_admin_all`, `listings_admin_all`,
`transactions_admin_select`, `booking_refunds_select_admin`,
`profiles_select_admin`).

| Panel | What it shows | Source |
|---|---|---|
| Requested | Stays in PENDING: asked for, not yet answered by the host. The card is a link that narrows the table to them | `getBookingsDesk()` in `lib/admin/reads/bookings.ts`, every `bookings` row |
| Confirmed | Stays in CONFIRMED | same |
| In stay now | CONFIRMED stays where today (Lagos) is on or after check-in and before check-out | same |
| Cancelled | Stays in CANCELLED, whoever cancelled | same |
| Refunded | Stays with a refund of more than nothing recorded in `booking_refunds` | same |
| Stays booked per day | Stays created each Lagos day for thirty days. Drawn only once two days have bookings; before that the frame stays and a calm note says what will fill it | same |
| By status | One bar on the status four: Requested (cyan), Confirmed (blue), Completed (emerald), Cancelled or no-show (rose), each with its word and count | same |
| Filter | Search a listing title, a guest's name or a booking id; a chip per booking status; a Lagos date range on when the stay was booked | `QueueFilters`, URL `q`, `status`, `from`, `to` |
| Stays | Every stay, newest first: the listing and where it is, the guest, the dates and nights, the status and any refund, what has been paid (successful `transactions`), and the total. Numbered pages of 12. Each title opens the stay | `getBookingsDesk()` |
| Restaurant tables | The link to the reservations queue with how many are waiting on the restaurant | `getReservationWaitingCount()` (Session A) |

**The one write, on a stay's own page.** Cancel and refund: the operator
chooses only the reason; the amount comes from the published cancellation
schedule (`previewCancellation`), and `cancelBookingAsAdmin` calls
`refund_and_cancel_booking`, which cancels, writes the refund to the guest's
wallet and records a `booking_refunds` row that the money desk's Refunds
panel then tracks. Reservations are accepted or declined with
`decideReservationAsAdmin`, which notifies the guest. All three are Session
A's, unchanged.

**Who may do what.** Reading the desk needs `admin` or `super_admin`
(`requireAdmin()` in the layout and again inside `getBookingsDesk`; the
tables publish their rows to those two roles by policy). Cancelling a stay
needs the same role; `cancelBookingAsAdmin` repeats the check at its own
door and the database function repeats it again. Nobody can change a price,
a date or a guest from the console.

**What it cannot do.** It cannot move a stay's dates, change what a guest
paid, pay a host, or refund outside the published schedule. "Checked in" is
not recorded by the product, so "In stay now" is worked out from the dates of
a confirmed stay, not from anybody arriving. Reservations have their own
queue and are not counted in these cards.

**Today's reality.** No stay and no reservation has ever been made; every
card reads 0 and every panel says what will fill it.

## 12. Payments

**Route:** `/admin/payments`. **Who:** `admin` or `super_admin`.

**Two kinds of payment attempt:** a booking checkout (one `transactions`
row) and a wallet top-up (a `wallet_entries` row of kind `deposit`, whose
`metadata.channel` records the Paystack channel). **Five outcomes, from each
row's own status:** Succeeded (SUCCESSFUL or COMPLETED), Failed (FAILED or
REVERSED), Refunded (REFUNDED), Started (PENDING and less than 24 hours old)
and Abandoned (PENDING and older: the person began and did not finish; the
reconcile job settles any that did).

| Panel | What it shows | Source |
|---|---|---|
| Started, Succeeded, Failed, Abandoned | Attempts begun in the last 7 days by outcome, against the 7 days before (a change is drawn only when the earlier week had some) | `getPaymentsDesk()` in `lib/admin/reads/payments.ts`, every attempt |
| Money in per day | The value of attempts that succeeded, per Lagos day, thirty days. Drawn only once two days have some | same |
| By channel | Attempts in thirty days by channel (card, bank, USSD and so on; "unrecorded" where the row does not say), and the value that came in on each | same |
| Where payments ended | One bar on the status four with a word on every segment wide enough and a key naming all five with their counts | same |
| Every payment | Every attempt, newest first: when it started, the provider reference in full, the kind (a checkout links to its stay), the channel, the outcome and the amount. Narrow by outcome and by kind; numbered pages of 12 | same |
| Health | Ledger shortfall, money frozen by stuck holds and money waiting on the provider; the overdrawn wallets, the stuck withdrawal holds with the release control, and payments the provider has not settled | `getPaymentHealth()` (Session A), calling `public.admin_payment_health` |
| Look up a person | Saved cards and bank accounts (masked) and their terms standing, with removal | `findAdminSubject`, `getSavedMethods`, `getTermsStanding` (Session A) |

**Actions, all Session A's, unchanged.** Release stuck holds
(`expireStaleWithdrawalHolds`, calling `admin_expire_stale_withdrawal_holds`)
returns withdrawal holds older than the window to spendable balance. Removing
a saved method (`removePaymentMethodAsAdmin`, `removeBankAccountAsAdmin`)
notifies its owner.

**Who may do what.** Reading needs `admin` or `super_admin`; the payment
reads, the health RPC (`admin_payment_health`, security definer, repeats the
role check) and both actions check the role themselves. No one can create,
retry or refund a payment from this desk.

**What it cannot do.** It cannot re-ask the provider (that is the reconcile
job's decision, hourly), cannot see a checkout's channel (only top-ups record
one), and cannot see the provider's own abandoned status: "Abandoned" here is
a PENDING attempt older than 24 hours, which the handbook states rather than
the screen implying Paystack said so.

**Today's reality.** One top-up has ever succeeded (₦1,000 by bank, 9
August); no booking checkout has been attempted; nothing is stuck.

## 13. Operations: scheduled jobs, alerts, audit log, notifications

Drawn from the render `01F7DFC7`, panel two. `/admin/operations`, with four
tabs in the address (`?tab=alerts`, `?tab=audit`, `?tab=notifications`).
Reads: `lib/admin/reads/operations.ts` (`getJobHealth`, `getRunDays`,
`getAlertTrend`) and the existing `getRiskAlerts`, `getAuditLog` and
`getAuditActivity`. Nothing on this desk changes anything; it reads.

**Jobs healthy.** How many of the Vercel Cron jobs (all of `VERCEL_JOBS`) are on schedule and
did not fail on their last run, with the share in words and a line of the
scheduled runs that did not fail per day for fourteen days.

**Active alerts.** Open rows in `risk_alerts`, against how many were open a
week ago (an alert was open then if it had been raised by then and was not yet
resolved; both are exact counts from the alerts' own dates). Fewer is good, so
a fall is emerald. The line is alerts raised per day.

**Every scheduled job.** The platform has two schedulers.

| Job | Scheduler | When (Lagos) | Allowed silence | What it does |
|---|---|---|---|---|
| canary | Vercel Cron `*/5 * * * *` | every 5 min | 1 h | reads the published catalogue as the public role against the service role's count, and pages a person when it is refused, short or empty (`lib/ops/catalogue-canary.ts`) |
| email-outbox | Vercel Cron `*/15 * * * *` | every 15 min | 2 h | sends the queued emails in `email_outbox` |
| hold-sweep | Vercel Cron `5 * * * *` | hourly at :05 | 3 h | releases wallet holds past their window |
| paystack-reconcile | Vercel Cron `10 * * * *` | hourly at :10 | 3 h | matches Paystack charges to the ledger |
| pg-cron-watch | Vercel Cron `20 * * * *` | hourly at :20 | 3 h | watches the database's own jobs and raises failures |
| complete-stays | Vercel Cron `30 2 * * *` | daily 03:30 | 26 h | completes stays whose check-out has passed |
| inventory-drift | Vercel Cron `45 2 * * *` | daily 03:45 | 26 h | checks room inventory against bookings |
| account-purge | Vercel Cron `15 3 * * *` | daily 04:15 | 26 h | honours account deletions after thirty days |
| saved-search-alerts | Vercel Cron `40 7 * * *` | daily 08:40 | 26 h | tells people about new matches for saved searches |
| vallo_push_drain | pg_cron `*/5 * * * *` | every 5 min | | asks the app to drain the push queue (`private.request_push_drain`) |
| vallo_release_stale_holds | pg_cron `*/15 * * * *` | every 15 min | | database side of the hold release |
| vallo_purge_rate_limits | pg_cron `30 * * * *` | hourly at :30 | | clears old rate limit rows |
| vallo_escrow_sweep_timeouts | pg_cron `17 * * * *` | hourly at :17 | | escrow timeouts |
| vallo_escrow_invariants | pg_cron `23 * * * *` | hourly at :23 | | asserts the escrow float identity (`private.escrow_invariants_check`), six minutes after the sweeper |
| vallo_escrow_age_watch | pg_cron `41 * * * *` | hourly at :41 | | alerts on disputes older than 48 hours and 7 days, and cancels escrows never funded within 14 days (`private.escrow_age_watch`) |
| vallo_reconcile_payments | pg_cron `47 * * * *` | hourly at :47 | | database side of reconciliation |
| vallo_purge_idempotency | pg_cron `10 2 * * *` | daily 03:10 | | clears old idempotency records |
| vallo-nightly-badges | pg_cron `20 2 * * *` | daily 03:20 | | awards earned badges |
| vallo_purge_email_outbox | pg_cron `25 2 * * *` | daily 03:25 | | forgets emails the outbox has already delivered |
| vallo_escrow_book_the_float | pg_cron `5 3 * * *` | daily 04:05 | | books the day's escrow float snapshot as a liability (`private.escrow_float_snapshot_take`) |
| vallo_sweep_price_check_events | pg_cron `40 3 * * *` | daily 04:40 | | deletes price check events older than 24 months (the retention schedule, run) |
| vallo_announce_completed_stays | pg_cron `20 5 * * *` | daily 06:20 | | announces completed stays |
| vallo_sweep_price_check_watches | pg_cron `50 5 * * *` | daily 06:50 | | re-runs the price check gate at each pending watch and tells the watcher once when it opens |
| vallo-daily-note | pg_cron `0 6 * * *` | daily 07:00 | | the daily note |

9 Vercel Cron jobs and 15 pg_cron jobs in all. The numbers are derived,
not remembered: the Vercel list is `VERCEL_JOBS` in
`lib/admin/reads/jobs.ts`, held equal to `vercel.json` by a test, and the
database list is `PG_CRON_JOBS` in the same file, held equal by
`lib/admin/reads/jobs.test.ts` to every `cron.schedule` the migrations leave
in place. The same test holds this table and the sentence above to both
lists, so a new job fails `npm test` (and CI) until it is written down here.

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

**Notifications tab.** Push first, from `push_queue` and `push_deliveries`
(both readable by an admin, `getPushActivity`): the push queue now, by state
(Waiting, Held for quiet hours, Sending, Retrying, Out of attempts, Done);
how pushes settled in the last seven days (Delivered, Push off, No device,
Expired, Summarised, Gave up); device attempts in the last seven days (Sent,
No reply yet, Failed, Device gone) with the newest attempts; and the newest
failures with the provider's status and error. No token or device reference
is shown. Beside them, two panels that cannot be read yet and say so: in-app
notifications by kind (booking, message, wallet, listing, agent, support,
system, social; the table's only read policy is the recipient's own, Request
A6) and the email outbox (row security on, no admin policy, Request A14).

**In flight tab.** Inspections, read by state (Requested, New time
proposed, Confirmed, Completed, Declined, Withdrawn: six exact counts from
`inspection_requests` under the admin read policy, `getInspectionActivity`)
with the eight newest requests. Beside them, panels for account deletions
(Request A12), business transfers (A13), the database's jobs one by one (A5)
and the money reconciliation watch (admin-money's request 10), each saying
what it needs because no admin can read those rows yet.

**Recent alerts and Audit log** sit beneath every tab: the four newest alerts
and the five newest audit entries.

## 14. Analytics

Drawn from the render `01F7DFC7`, panel three. `/admin/analytics?range=30d`
(or `90d`, `12m`). Reads: `lib/admin/reads/analytics.ts`
(`getBookingOutcomes`, `getSupplySeries`, `getThinAreas`,
`getPriceCheckDemand`).

**Demand is price checks.** `price_check_events` is the platform's first
demand log: one row per stage of one price check (`submit`, then `outcome`
`answered` or `refused` with a `refusal_code`), located by state, local
government and a five character geohash, never an address. Admins read it
under `price_check_events_admin_read`; rows older than 24 months are swept
daily (`vallo_sweep_price_check_events`). The render's own measure, searches
of the listings, is still not recorded (A7, partly withdrawn), so the page
names its figures as price checks and does not call them searches.

| Panel | Source | State today |
|---|---|---|
| Price checks | `price_check_events` rows at stage `submit` in the range, against the same length of time before it (exact count), with a spark per bucket | real |
| Listing views | nothing records a listing view | Not recorded, Request A8 |
| Successful bookings | exact count of `bookings` confirmed or completed, created in the range, against the same length of time before it | real; zero on 22 September |
| Checks answered | outcomes `answered` over checks submitted in the range | real; a dash while nothing was checked |
| Demand vs supply | price checks submitted per bucket beside listings created per bucket (examples excluded) | real, both series |
| Top areas by price checks | submitted checks grouped by local government (`lga_code`, named from `local_governments`), top five | real |
| Areas with fewest listings | live listings grouped by area and city, fewest first, examples excluded | real; empty while no real listing is live |
| Price checks vs answered | checks submitted and checks answered per bucket | real |
| Top common refusals | the platform's refusals of a price check by `refusal_code`, in words | real; a person's decline of an inspection or reservation still carries no reason (A11) |

Every row of the range is read whole (the pager refuses rather than returns a
prefix past 50,000 rows), so no total is capped.

The render also draws an "All areas" filter; it is not built, because the
figures that vary by area already list their areas.

## 15. The other desks

These desks keep their own behaviour and were brought into the console's
register (panel material, page head, status badges, calm empty states)
without changing what they do. Each is reached from its parent row or from
All desks.

**Who may act, on every desk below.** Any account holding `admin` or
`super_admin` in `user_roles`. Every action first calls `requireAdmin()`
(`lib/admin/guard.ts`) and refuses anyone else with "This area is for the
Vallo operations team"; no action on these desks is reserved to
`super_admin`. Where an action goes through a database function, the function
repeats the role check itself. Every action writes one `audit_log` row with
your user id (`lib/admin/audit.ts: writeAudit`), which the Audit log desk
shows. Every list pages forty rows at a time and says when there are more;
no desk offers bulk actions or export.

### 15.1 Unified queue (Overview > Unified queue, `/admin/queue`)

- **Shows** every item waiting on a person across five queues in one table:
  listings to review, agent applications, open reports, open message flags,
  open support tickets, with tabs per kind, search and dates.
- **Sources** the same reads as each desk (`getListingSubmissions`,
  `getAgentApplications`, `getReports`, `getMessageFlags`,
  `getSupportTickets` in `lib/admin/queries.ts`).
- **Actions** none of its own: View opens the item on its desk.
- **Effects** none: the queue reads and routes; every change happens, and is
  audited, on the desk that owns the item.
- **Limits** each tab is the first page of that desk's queue, newest first.
- **Rejected** acting from the table: every decision needs the desk's
  context (evidence, history), so the queue only routes.

### 15.2 Applications (Supply > Applications, `/admin/agents`)

- **Shows** people who asked to list as an owner, agent or firm
  (`agent_applications`), waiting and decided, with each applicant's
  verification ladder (`agent_verification_checks`, via
  `getVerificationLadders`).
- **Actions** Approve, Ask for changes, Reject (`reviewAgentApplication`);
  record a verification rung as passed or failed (`recordVerificationCheck`).
- **Effects** approve: the application goes to `APPROVED`, an `agents` row is
  created or updated with the lister's role and `APPROVED`, the `agent` role is
  granted in `user_roles`, and the applicant is notified. Ask for changes and
  reject move the status and notify with your note. A rung writes
  `agent_verification_checks` and notifies. Audit: `agent_application.review`,
  `agent.verification_check`.
- **Limits** an application already decided cannot be decided again; the role
  grant uses the service role because `user_roles` is super-admin-only under
  RLS, and only after the admin check has passed.
- **Rejected** approving without the ladder visible: the rungs sit beside the
  decision so an approval is never blind.

### 15.3 Businesses (Supply > Businesses, `/admin/businesses`)

- **Shows** hotels, restaurants and other businesses (`businesses`) with
  their documents (`business_documents`), their verification ladder
  (`business_verification_checks`: identity, registration, payout, on site)
  and their properties, filterable by status.
- **Actions** Approve, Ask for more, Reject (`approveBusiness`,
  `requestMoreInfo`, `rejectBusiness`); record each rung
  (`recordIdentityCheck`, `recordRegistrationCheck`, `recordPayoutCheck`,
  `recordOnSiteCheck`); put an accommodation or restaurant live
  (`publishAccommodation`, `publishRestaurant`).
- **Effects** status changes on `businesses` with a notification to the
  owner; rungs write `business_verification_checks`; publishing writes the
  catalogue rows guests search. Audit: `business.review`,
  `business.verification_check`, `accommodation.publish`, `business.publish`.
- **Limits** a business cannot go live past a blocker listed in
  `GO_LIVE_BLOCKERS` (`lib/admin/business-ladder.ts`); the TIN, website,
  hygiene and licence attestations are never rungs.
- **Rejected** one "verified" switch: the four rungs are recorded separately
  so a tier is earned, not granted.

### 15.4 Stops (Supply > Stops, `/admin/stops`)

- **Shows** listers who are stopped from trading and their history
  (`agent_suspensions`, via `getStopsDesk`), filterable.
- **Actions** Stop a lister (`stopAgentTrading`, with a reason) and lift a
  stop (`liftAgentStop`).
- **Effects** the database function `suspend_agent` records the stop and
  takes the lister's listings out of search; lifting reinstates
  (`reinstate_agent`). Audit: `agent.suspend`, `agent.suspension.lift`.
- **Limits** a reason is required; the functions run with the service role
  because their grant is narrow, and only after the admin check.
- **Rejected** deleting a lister: a stop is reversible and keeps the record.

### 15.5 Payments (Money > Payments, `/admin/payments`)

Owned by admin-money; handbook section 12.

### 15.6 Fees (Money > Fees, `/admin/fees`)

- **Shows** the fee rates in force and their history (`fee_rates`, via
  `getFeeConsole`) and revenue by source over 90 days
  (`admin_revenue_summary` via `getRevenueSummary`).
- **Actions** set a new rate (`setFeeRate`, through `set_fee_rate`).
- **Effects** a new `fee_rates` row takes effect for new charges; charges
  already made keep the rate they were made at. Audit written by the action.
- **Limits** Vallo charges no platform fee on rent; a rate here must name
  what it applies to (rule 15).
- **Rejected** editing a rate in place: a new row keeps the history true.

### 15.7 Message flags (Moderation > Message flags, `/admin/flags`)

- **Shows** messages the safety scan flagged (`message_flags`), with the
  surrounding thread lines and each party's role, filterable by status.
- **Actions** Clear or Escalate (`reviewMessageFlag`).
- **Effects** the flag goes to `reviewed` with your id; Escalate also raises
  an open `risk_alerts` row. Audit: `message_flag.review`.
- **Limits** a reviewed flag cannot be reviewed again; the desk shows the
  lines around the flag, not the whole conversation.
- **Rejected** deleting the message: evidence is kept; the scan's decision
  is reviewed, not erased.

### 15.8 Reports (Moderation > Reports, `/admin/reports`)

- **Shows** reports people filed (`reports`), with category, target and the
  response clock (`REPORT_RESPONSE_HOURS`, overdue count via
  `countOverdueReports`).
- **Actions** Reviewing, Resolved, Dismissed (`resolveReport`).
- **Effects** the report's status moves and the reporter is told. Audit:
  `report.review`.
- **Limits** a resolved or dismissed report is final on this desk.
- **Rejected** acting on the target from here: the report is decided here and
  the target is acted on at its own desk.

### 15.9 Around (Moderation > Around, `/admin/social`)

- **Shows** proposed areas (`areas` with `PROPOSED`) and area moderator
  applications (`area_moderator_applications` `PENDING`), via
  `getSocialQueue`.
- **Actions** decide an area (`decideArea`), decide a moderator application
  (`decideModeratorApplication`), pause or resume an area (`setAreaPaused`).
- **Effects** the area opens or is refused, the moderator is appointed or
  refused, a paused area stops taking posts; each is audited.
- **Limits** only a `PROPOSED` area can be decided.
- **Rejected** gating these actions behind the `social` switch: the likeliest
  reason Around is switched off is that something needs moderating, so the
  console keeps its hands on it while members' own actions are refused
  (`lib/social/admin-actions.ts`). Also rejected: letting any member-facing
  screen make a place public or a member a moderator; the `areas` and
  `area_members` insert policies pin new rows to `PROPOSED` and `MEMBER`.

### 15.10 Standing (Moderation > Standing, `/admin/standing`)

- **Shows** badges granted by hand and their history (`user_badges`, via
  `getStandingDesk`).
- **Actions** Grant a badge to a handle with a reason
  (`grantStandingBadge`), revoke it (`revokeStandingBadge`).
- **Effects** a `user_badges` row is written or marked revoked with your id.
  Audit: `badge.grant`, `badge.revoke`.
- **Limits** only badges the platform allows to be granted by hand; earned
  badges are awarded by the nightly badges job.
- **Rejected** hard deletes: a revoked badge keeps its record.

### 15.11 Alerts (Operations > Alerts, `/admin/alerts`)

- **Shows** every risk alert (`risk_alerts`, via `getRiskAlerts`) by status
  and severity, and inventory drift alerts (`getInventoryDriftAlerts`).
- **Actions** Resolve (`resolveRiskAlert`).
- **Effects** the alert goes to `resolved` with your id and the time; the
  rail and Operations counts fall. Audit: `risk_alert.resolve`.
- **Limits** resolving does not fix the cause; a job that keeps failing
  raises a new alert on its next run.
- **Rejected** deleting alerts: history is kept (267 resolved rows on 22
  September).

### 15.12 Audit log (Operations > Audit log, `/admin/audit`)

- **Shows** every recorded decision and scheduled run (`audit_log`, via
  `getAuditLog`), searchable by id or words, filterable by kind and date,
  with actions per day and by kind (`getAuditActivity`, up to 5,000 rows
  and it says so when it hits that).
- **Actions** none; the log is read only, and identity documents and
  credentials in a row's detail are withheld (`safeAuditMetadata`).
- **Effects** none: reading the log writes nothing, not even a view record.
- **Limits** forty entries a page (`QUEUE_PAGE_SIZE`), newest first; the
  search matches an exact id or words in the action and the target id, not
  the detail bag; the charts on Operations > Audit log read at most 5,000
  rows and say so when they reach it; a row shows only what its writer kept,
  nothing is joined in from the target.
- **Rejected** editing or deleting entries: a log that can be changed is not
  a log.

### 15.13 Switches (Settings > Switches, `/admin/switches`)

- **Shows** each surface that can be turned off in an incident
  (`feature_flags`, via `getFeatureFlags`) and whether it is on.
- **Actions** Switch off and Switch on (`toggleFeatureFlag`), with a
  confirmation sheet that says who loses what.
- **Effects** `feature_flags.enabled` changes; every page picks it up within
  about thirty seconds. Audit: `feature_flag.enable`, `feature_flag.disable`.
- **Limits** nothing already saved is deleted by a switch.
- **Rejected** a bare toggle: turning a surface off opens a confirmation
  first.

### 15.14 Reference data (Settings > Reference data, `/admin/reference`)

- **Shows** the occupations and local governments every profile picks from
  (`listOccupationsForAdmin`, `listLocalGovernmentsForAdmin`), searchable.
- **Actions** add or edit an occupation (`saveOccupation`) or a local
  government (`saveLocalGovernment`).
- **Effects** the `occupations` or `local_governments` row is inserted or
  updated; profiles choose from it at once. Audit:
  `reference.occupation.create` or `.update`, and the same for local
  governments.
- **Limits** no delete: a value in use on profiles is renamed, not removed.
- **Rejected** a Delete button: both tables are referenced by `profiles`
  with `on delete set null`, so a delete would quietly empty the answer of
  every person who had chosen the value, with no way to tell who
  (`lib/admin/reference-actions.ts`).

### 15.15 Examples (Settings > Examples, `/admin/examples`)

- **Shows** the example listings that show the product before real supply
  arrives (`listings.is_demo`), live and retired, with each one's retirement
  date and an overdue count (`getExamplesConsole`).
- **Actions** retire examples (`retireExampleListings`, through
  `admin_retire_demo_listings`).
- **Effects** retired examples leave search; the retirement is audited.
- **Limits** examples are never counted as supply on the overview or
  analytics.
- **Rejected** mixing examples into supply figures: a seeded market is a
  false window.

### 15.16 What no desk shows yet

Inspections are on Operations > In flight, push notifications on Operations >
Notifications, price checks on Analytics. Account deletions (A12), business
transfers (A13), the database's jobs one by one with their runs (A5) and the
money reconciliation watch (admin-money's request 10) each have a panel on
In flight that says what it needs; in-app notification volumes (A6) and the
email outbox (A14) have theirs on Notifications. Held events and the safety
scan's blocked terms are admin-review's (section 5). Mandates
(`listing_mandates`), firm members (`firm_members`), escrow evidence
(`escrow_evidence`) and the daily float snapshots (`escrow_float_snapshots`)
are shown on the desks that own them (sections 5 to 12).

**The badge (B-BADGE).** Wherever the console draws a person's name (the
operator in the rail and bar, the people named in audit and alert rows, and
any desk that passes a tier), it keeps one slot, `PersonTier`, fed from
`public.person_badge` (gold for a checked supplier, platinum for platform
staff) by `getPersonTiers`. Session A owns the badge's artwork and component;
until that lands the slot draws nothing, so no badge appears anywhere in
the console yet.

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

**Reading an empty panel.** On money, escrow, supply, bookings and payments an
empty panel keeps its frame (axes, legend, table head) and shows a calm note:
the first line says what fills the panel, the second what creates that data,
and the link goes to the desk where that happens. A red note means the read
did not answer, not that there is nothing; reload.

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
- Open requests: AR-10 (deciding a held event), AR-11 (reading the blocked
  terms list), AR-12 (deciding a listing mandate). AR-1 to AR-9 were withdrawn
  when Session B wrote the reads itself (`lib/admin/reads/listings.ts`,
  `moderation.ts`, `verification.ts`).

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
  Session A's mutation, and on bookings and payments Session A's cancel,
  reservation decision, hold release and saved method removal.
- **Bookings has no "checked in".** The schema has no such status; the card
  is "In stay now", from a confirmed stay's dates.
- **Payments cannot name a checkout's channel.** `transactions` does not
  carry one; the desk says "unrecorded" rather than guessing card.
- **The generated database types lag the live schema** (`CANCELLED`,
  `agency_fee`). The desks count unknown values instead of failing; the types
  are Session A's to regenerate.

### Overview and analytics limits (admin-shell)

- "Live a week ago" counts the listings live now that were already live then.
  A listing withdrawn during the week is not in it, because nothing records
  when a listing stops being live.
- Searches of the listings and listing views are not recorded (Requests A7,
  A8), so the render's Total searches, Conversion rate and Searches vs results
  are drawn as price checks (the one demand log there is) and listing views
  say "Not recorded". A person's decline of an inspection or reservation
  carries no reason (A11), so common refusals are the platform's price check
  refusals only.
- The database's own scheduled jobs (`PG_CRON_JOBS`) are summarised, not listed
  (Request A5).
- In-app notification volumes (Request A6) and the email outbox (Request
  A14) cannot be read by an admin; push can, and is shown.
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
- **A "Checked in" card on bookings.** Rejected: nothing records an arrival,
  so a count of check-ins would be a guess. "In stay now" is what the data
  supports.
- **Treating every PENDING payment as in progress.** Rejected: a checkout a
  person walked away from three days ago is not in progress. Split at 24
  hours into Started and Abandoned, with the rule written down.
- **One status palette slot per payment outcome.** Five outcomes, four status
  colours: Abandoned and Failed share rose and are told apart by their words
  on the bar and in the key.
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
