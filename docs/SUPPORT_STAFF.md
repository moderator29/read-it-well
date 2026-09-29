# Support staff

How Vallo's support team works in the console: how to add a person, what they
can and cannot see, how the promise to members is measured, and what is still
waiting on a database change. Written 29 September 2026.

## In one paragraph

A support agent is a staff member who holds the `support` scope and nothing
else. They land on the Support desk (`/admin/support`), where every member
question and complaint sits in a queue ordered by how late it is. They take a
ticket, answer it (starting from a saved reply if one fits), set its status,
leave internal notes for colleagues, and hand anything about money, safety or
identity to the desk that decides it. Every one of those steps is checked on
the server and written to the audit log with their name.

## Adding a support person

1. Sign in as the founder's super admin and open Settings > Staff
   (`/admin/staff`).
2. In **Support team**, type the email on their Vallo account and press
   **Add to support**.
   - Somebody with no staff access becomes a **Support Agent**: the support
     scope and nothing else (least privilege).
   - Somebody who already has access keeps what they have and gains support;
     their position is kept.
3. They are told by email and in the app. Their desk stays locked until they
   read and acknowledge the staff handbook, and every sign-in must prove their
   security key before the console opens.

To take somebody off support, press **Take off support** on their row and give
a reason. If support was all they had, their access ends and they read the
reason; their claims are released at once. If they hold other desks, only
support is removed (every other desk and their position are kept; a Support
Agent position is cleared), the reason is kept in the audit log
(`staff.support_removed`), and they are told in the app "Support is no
longer one of your desks" with what they keep. With
`20260929204542_taking_someone_off_support_says_so.sql` applied this is one
database step that also releases the tickets they held. Until then the app
uses the grant function, which also sends its "You have Vallo staff access"
notice and email; the app follows it with the plain notice above.

The Support team panel also shows who else answers members through their role
(admins and the super admin), each person's actions on the desk in the last 30
days, when they were last active, and whether they still need to acknowledge
the handbook. The full grant form further down the page still works for any
other combination of desks.

## What a support agent can see

- Every support ticket: the reference, the topic the member chose, what they
  wrote, the name and email they gave on the ticket, the record they linked it
  to (a booking, agreement, listing, payment or inspection, by its label), and
  the whole thread.
- Who on the team holds each ticket and who wrote each reply.
- A member summary cut to what helps answer the ticket: first name, when they
  joined, whether they list property and whether that is verified, their
  published badge, how many bookings and agreements they have (counts only),
  and their last five tickets.
- Internal notes on the member that are open to all staff or restricted to
  support. Notes restricted to another desk (compliance, for one) never show.
- The ticket's own audit trail: every take, hand-back, reply, status change,
  escalation and return, with who and when.

## What a support agent cannot see or do

- Any other desk: Money, Payments, Compliance, Verification, Listings,
  Moderation, Agreements, Operations. Each asks the database for its own scope
  and refuses them; the restricted console does not even link there.
- Identity or business documents, addresses and exact locations, tax (TIN)
  and company (CAC) numbers, phone numbers, bank or card details, amounts of
  money, suspicious-activity cases, and anybody's private columns. The
  support reads name none of these (a test fails if one is added), and the
  member summary function returns a fixed list of fields.
- A member's file (`/admin/people/<id>`): admins only.
- Deciding anything about money, safety or identity. They hand it over.
- Hand anything to compliance. A support agent who suspects a compliance
  matter escalates to safety; the safety lead decides whether compliance hears
  of it, so nothing a support agent writes can tip a person off.

## The promise and the clock

/standards publishes the promise, and the desk shows the same numbers:

| Ticket | Promise |
|---|---|
| Topic "Someone asked me to pay outside Vallo" | 4 hours |
| Escalated to the money or safety desk (while it is there) | 4 hours |
| Verification | 3 days |
| Everything else | 1 day |

The clock runs from the member's **oldest unanswered message**: the ticket
itself, or the first message they sent after our last reply. When we wrote
last, no clock runs and the ticket reads "We answered last". Chips are in whole
hours: blue with time to spare, cyan in the last quarter of the window or the
last hour, red with "Late by Nh" once missed. Late tickets are drawn with a red
edge and sorted first, latest first; then the soonest due; then tickets waiting
on the member (quietest first); then done.

## The lanes

| Lane | Means |
|---|---|
| New | Nobody on the team has written yet |
| Waiting on us | The member wrote after our last reply |
| Waiting on member | We wrote last (the member sees "Waiting on you") |
| Escalated | With the money, safety or verification desk |
| Mine | Open tickets you hold |
| Done | Resolved or closed |

## Working a ticket

- **Take it** (or press `c`) before you work it. A claim lapses after thirty
  minutes untouched. Replying takes an unheld ticket for you, and the database
  refuses a reply on a ticket somebody else holds.
- **Reply.** Saved replies fill the box; read and adjust before sending.
  `Ctrl` or `Cmd` with `Enter` sends. **Send and resolve** answers and resolves
  in one step. A first reply on an Open ticket moves it to In progress. The
  reply lands on the member's thread (`/support/messages/<id>`) and they are
  told in the app. A ticket filed without an account cannot be told in the
  app; its reply waits at the link the filing email carried.
- **Status.** Closing always needs a note saying what was done.
- **Hand to another desk** (or press `e`): choose Money, Safety or
  Verification and say why. The holders of that desk are told in the app with
  a link to this one ticket, which they can read, note on and hand back with
  what they found. They do not see the member's other tickets, or the reason
  on a hand-off to a desk they do not hold. Support keeps talking to the member meanwhile ("Handed to
  another team" is the saved reply for that).
- **Internal notes** are for colleagues and never reach the member.

Keys: `j` / `k` next and previous ticket, `n` next ticket nobody holds, `c`
take, `r` reply, `m` saved replies, `e` hand to another desk, `?` the list,
`Esc` close. Keys never fire while you are typing.

## Security, in short

- Every support action and read starts with `requireAdmin("support")` on the
  server: a live support grant, the current handbook acknowledged, and this
  session's security key proved. Without the key the console shows only the
  key screen.
- Escalating, handing back, notes and the member summary run as database
  functions on the agent's own session, which check the scope and the key
  proof again (`private.staff_can`) and write their own audit rows.
- A signed-in account that is not staff gets the site's ordinary 404 at any
  console address.
- Tests: `lib/admin/support-scope-isolation.test.ts` (support is refused by
  KYC, fee, STR and money-export actions; moderators, members, signed-out
  visitors and unproved sessions are refused every support action and read;
  the reads name no private column), `app/admin/layout-door.dom.test.tsx`
  (404 for non-staff), `support-workspace.test.ts` (lanes, promise, clock,
  order, keys) and `support-macros.test.ts` (saved replies keep the voice and
  never ask for a password, code or card number).

## Database changes (applied 29 September 2026)

`supabase/migrations/20260929204530_support_desk_escalations_and_member_context.sql`
adds the escalation table and its three functions, and the member summary
function. It changes no existing table or policy. It is applied. Before it
was, the desk degraded gracefully: "Hand to another desk" pointed at an
internal note, and the member panel showed only what the ticket carries.

`supabase/migrations/20260929204542_taking_someone_off_support_says_so.sql`
adds `admin_remove_support` (super admin only): take somebody off support in
one step, with a plain notice. It changes no table, policy or existing
function. It is applied.

Nothing else waits on them: queue, lanes, clock, claims, replies, saved replies,
status, notes, audit trail, keys and the Support team panel all work on the
database as it is.

The reply **email** to a member is the `support.replied` template, enqueued by
`private.enqueue_support_reply_email` in the separate pending file
`supabase/migrations/pending/email_lifecycle_triggers.sql`. Until that is
applied, members are told of a reply in the app only.
