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

(admin-shell: who can enter the console, how access is checked, roles, what an
operator sees on entry, how to read a panel, the status colours and words, what
"no data yet" means on a chart and why the console never draws a number the
database did not return)

## 2. The shell

(admin-shell: navigation, the platform pulse strip, search, notifications bell,
identity block, keyboard use, narrow screens)

## 3. Overview

(admin-shell)

## 4. Listings: the review queue and the single listing under review

(admin-review)

## 5. Moderation

(admin-review)

## 6. Verification

(admin-review: every verification rung)

## 7. Support

(admin-review)

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

(admin-shell: every scheduled job, every alert, every notification the platform sends)

## 14. Analytics

(admin-shell)

## 15. The other desks

(admin-shell: agents, businesses, examples, fees, flags, reference, reports,
social, standing, stops, switches, and anything else under `app/admin`)

## 16. Everyday procedures

(each worker adds the step by step runbooks for its desks: approving a listing,
asking for more, rejecting, deciding a report, passing or failing a
verification, releasing or refunding an escrow, investigating a failed charge,
reading a reconciliation failure)

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

## 17. What the console cannot do, and the open requests

(each worker: honest limits, and the scope-file request numbers for data the
console needs and does not have yet)

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

## 18. Options considered and rejected

(each worker: the alternatives weighed for its desks and why they lost; charting
approach and palette decisions from `docs/research/UI_UNIQUENESS_AND_ADMIN_RESEARCH.md`
part four belong here)

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
