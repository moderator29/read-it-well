# What sends, what refuses, and what is not proved

Every email this platform can compose, what makes it leave, what stops it
leaving twice, whether a `/settings` switch can silence it, and its state
today. Written 23 September by the junction worker, off the source and off the
live catalogue rather than off anybody's report.

---

## Read this first

**NOTHING LEAVES THE BUILDING UNTIL `RESEND_API_KEY` IS SET ON THE
DEPLOYMENT.** Not one of the thirty eight messages below has ever been
delivered to anybody. `isEmailConfigured()` is false without that key: the drain claims
no rows at all and reports `email.outbox.unconfigured` at CRITICAL every
fifteen minutes, and every direct send site goes through `bestEffortEmail`,
which does nothing. The queue fills correctly and loses nothing meanwhile.

**AND NO SEND HAS EVER BEEN PROVED ON THE WIRE FROM THIS BOX.** The egress
proxy here refuses `api.resend.com:443` by organisation policy
(`connect_rejected`) and there is no Resend key on this deployment. The
furthest any automated check in this repository goes is `globalThis.fetch`:
`lib/notify/outbox-delivery.test.ts` replaces the socket and nothing else, and
asserts on the HTTP request that WOULD have gone out, for every template the
outbox can send. That is a proof about the message, not about delivery. **The
first real delivery will happen the first time somebody sets the key, and it
will be unproved until a person reads the email that arrives.**

**Three states are used below and they mean exactly this.**

- **SENDS** once the key is set: there is a live path from an event to the
  wire, and it has been walked in a test rather than read.
- **REFUSED**: deliberately not wired, with the reason. A refusal is held in
  place by `lib/email/reachability.test.ts`, which fails if somebody wires it.
- **UNPROVEN**: something outside this repository has to be true and is not, or
  is not checkable from here. What is missing is named.

---

## The count

| | |
|---|---|
| Message builders in `lib/email/` and `lib/account-deletion/` | 38 |
| Reachable from a live event | 35 |
| REFUSED, with a written reason | 3 |
| Built and unreachable with no decision recorded | **0** |

Twenty seven return `EmailMessage`, eight return `EscrowEmail`, one returns
`PaymentInstrumentEmail` and two return `DeletionEmail`. The count is named by
type because the first version of the sweep below matched `EmailMessage` alone
and was therefore blind to the eight escrow builders, a third of the
catalogue, while passing. It now asserts that every exported function in those
five files returns one of the four types or the single `string` helper, so a
builder introduced with a fifth type fails rather than hides.

Held at zero by `apps/web/src/lib/email/reachability.test.ts`, which walks
every non-test module outside the email layer, keeps only those that can
actually send (`sendMessage`, `sendEmail`, `announce`, or the outbox registry),
and asserts the set of unreachable builders is EXACTLY the set with a written
refusal. Both directions fail, so a builder that loses its last caller goes
red and so does a refusal somebody quietly wires.

---

## 1. The outbox: a database trigger writes the row, the drain sends it

Fifteen templates. A trigger writes into `public.email_outbox` in the SAME
TRANSACTION as the state change, so the email cannot exist without the event
and cannot survive the event rolling back. `/api/cron/email-outbox` claims,
resolves the address, builds the message and settles by id, four times an hour.

The dedupe key is UNIQUE and the enqueue is `on conflict do nothing`, so every
key below is a once-ever guarantee rather than a hope.

| Template key | Builder | What writes the row | Dedupe key | `/settings` mute | State |
|---|---|---|---|---|---|
| `account.welcome` | `welcome` | `users_enqueue_welcome_email_on_insert` and `..._on_confirm` on `auth.users`, plus `welcomeOnce` through `public.email_outbox_enqueue_welcome` | `account:welcome:<user id>` | none | **SENDS** |
| `escrow.INITIATED` | `heldPaymentProposed` | `escrows_enqueue_emails`, one row per party | `escrow:<escrow id>:INITIATED:<party id>` | none | **SENDS** |
| `escrow.HELD` | `heldPaymentSetAside` | same trigger | `escrow:<escrow id>:HELD:<party id>` | none | **SENDS** |
| `escrow.RELEASE_REQUESTED` | `heldPaymentPayoutAsked` | same trigger | `escrow:<escrow id>:RELEASE_REQUESTED:<party id>` | none | **SENDS** |
| `escrow.RELEASED` | `heldPaymentPaidOut` | same trigger | `escrow:<escrow id>:RELEASED:<party id>` | none | **SENDS** |
| `escrow.REFUNDED` | `heldPaymentReturned` | same trigger | `escrow:<escrow id>:REFUNDED:<party id>` | none | **SENDS** |
| `escrow.DISPUTED` | `heldPaymentDisputed` | same trigger | `escrow:<escrow id>:DISPUTED:<party id>` | none | **SENDS** |
| `escrow.RESOLVED` | `heldPaymentRuling` | same trigger | `escrow:<escrow id>:RESOLVED:<party id>` | none | **SENDS** |
| `escrow.CANCELLED` | `heldPaymentWithdrawn` | same trigger | `escrow:<escrow id>:CANCELLED:<party id>` | none | **SENDS** |
| `security.password_changed` | `passwordChanged` | `users_enqueue_password_changed_email`, `after update of encrypted_password on auth.users` | `security:password_changed:<user id>:<statement clock>` | none | **SENDS** |
| `security.new_device_sign_in` | `newDeviceSignIn` | `sessions_enqueue_new_device_email`, `after insert on auth.sessions` | `security:new_device:<user id>:<16 char agent digest>` | none | **SENDS** |
| `wallet.withdrawal_outcome` | `withdrawalOutcome` | `wallet_entries_enqueue_withdrawal_email`, `after update of status on public.wallet_entries` | `withdrawal:<entry id>:<paid\|failed\|reversed>` | none | **SENDS**, and see finding 1 |
| `inspection.scheduled` | `inspectionScheduled` | `inspection_requests_enqueue_email`, one row per party | `inspection:<request id>:CONFIRMED:<party id>` | none | **SENDS** |
| `verification.rung_passed` | `verificationRungPassed` | `agent_verification_checks_enqueue_email` | `verification:<agent id>:<rung>` | none | **SENDS** |
| `listing.new_enquiry` | `newEnquiry` | `messages_enqueue_new_enquiry_email`, first message in a conversation only | `enquiry:<conversation id>` | **Messages** | **SENDS** |

**Why almost nothing here answers to a switch, and that is the decision rather
than an omission.** `/settings` offers four switches: Bookings, Messages,
Wallet and Marketing. A security notice, a receipt for money that moved and the
state of an agreement somebody is a party to are none of those four, and
honouring a mute for them would silence a message the product has promised to
send. `listing.new_enquiry` is the exception because an enquiry IS a message
and the Messages card says in as many words that turning it off stops message
email.

`account.welcome` deliberately answers to nothing: it is the one message that
explains what the account somebody just opened actually is, and it carries the
link to those switches. Muting it behind a switch the reader has not been shown
yet would be silencing the letter that tells them the switches exist.

---

## 2. The direct senders: a server action, a webhook or a route sends it there and then

Twenty builders, for an event TypeScript can already see.
`paymentInstrumentChanged` covers six different events on its own, so twenty
five events in all. Fifteen in section 1 plus twenty here is the thirty five
reachable builders in the count above. Every one of
them is inside `bestEffortEmail` and cannot fail the action it follows.

**None of these has a dedupe key**, because none of them has a queue. What
stops a second copy is named per row, and where nothing does, the row says so.

| Builder | What sends it | What stops a second copy | `/settings` mute | State |
|---|---|---|---|---|
| `verificationCode` | `POST /api/auth/email-hook`, Supabase's Send Email Hook | GoTrue's own throttle; the route also bounds the signed timestamp to 5 minutes | none | **LIVE, proven 23 September**, see below |
| `walletFunded` | Paystack `charge.success` webhook, and the verify-on-redirect path | Gated on `posted === "posted"`; `recordFunding` is idempotent on the `rm-fund` reference, so whichever runs second credits nothing and emails nothing | Wallet | **SENDS** |
| `withdrawalFailed` | Paystack `transfer.failed`/`reversed` webhook, and two catch paths in `lib/wallet/actions.ts` | `settleWithdrawal` only moves a PENDING row, so a replayed delivery is silent | Wallet | **SENDS**, and see finding 1 |
| `listingApproved` | admin listing decision `publish`, through `announce` | nothing: a reviewer who clicks twice emails twice | none | **SENDS** |
| `listingPassedReview` | admin listing decision `approve` | nothing | none | **SENDS** |
| `listingRejected` | admin listing decision `reject` | nothing | none | **SENDS** |
| `listingChangesRequested` | admin listing decision `request_changes` | nothing | none | **SENDS** |
| `agentApplicationApproved` | admin registration decision `approve` | nothing | none | **SENDS** |
| `agentApplicationRejected` | admin registration decision `reject` | nothing | none | **SENDS** |
| `agentApplicationNeedsMore` | admin registration decision `request_changes` | nothing | none | **SENDS** |
| `bookingRequested` | `createBooking`, to the guest | the booking's own database constraint: no booking, no email | Bookings | **SENDS** |
| `bookingRequestedHost` | `createBooking`, to the host | same | Bookings | **SENDS** |
| `bookingConfirmed` | `announceConfirmedStay`, to the payer | the confirmation transition | Bookings | **SENDS** |
| `stayArrivalDetails` | `announceConfirmedStay`, to the arriving guest | same | **deliberately none** | **SENDS** |
| `bookingCancelled` | `cancelBooking` | the cancellation transition | Bookings | **SENDS** |
| `bookingRefunded` | admin refund | the refund transition | Bookings | **SENDS** |
| `supportTicketFiled` | `fileSupportTicket` | the ticket row; a duplicate reference is refused on `23505` | none | **SENDS** |
| `paymentInstrumentChanged` | `lib/payments/notices.ts` through `announce`, from six events: a card saved, made default or removed, and a bank account added, made default or removed | the instrument row itself | none | **SENDS** |
| `deletionStarted` | `lib/account-deletion/actions.ts` | the deletion request row | none | **SENDS** |
| `deletionCompleted` | `lib/account-deletion/service.ts` | the purge itself, which happens once | none | **SENDS** |

**`stayArrivalDetails` is not muted and that is on purpose.** The Bookings
switch says "do not email me about bookings". It is the payer's own preference
and it is not consent given on behalf of a third party. The arriving guest's
address was typed in by the payer precisely so we would use it, and silencing
it leaves somebody standing at a gate at eleven at night with no entry code.

**`supportTicketFiled` is the one email whose address comes from a form.**
Every other send in the estate resolves the address through
`lib/email/recipients.ts` with the service role, which is junction promise 4. A
support ticket can be filed signed out, so there is no session to resolve, and
the address on the form is the only one there is. It is rate limited before it
is sent, which is what keeps it from being a relay.

### `verificationCode` is LIVE and proven

**Corrected 23 September 2026.** This section used to say the route was not
the live path. The Send Email Hook was switched on on 22 September, and
`auth_logs` on 23 September show a successful `run_hook` against
`/api/auth/email-hook` on every sign-up that day, no GoTrue `mail_from` at all,
and each account then verified. See [`AUTH_EMAILS.md`](AUTH_EMAILS.md)
section 1. `SUPABASE_AUTH_HOOK_SECRET` is set; without it the route refuses
every request with 401 by design, because an endpoint whose protection is
optional ships unprotected the first time a variable is forgotten.

The transactional outbox is proven the same way. Measured at 23:47 UTC on 23
September, `public.email_outbox` holds 5 rows, all SENT (15:57 to 20:39 UTC),
the first after a real sign-up, and none PENDING. `/api/cron/email-outbox`
drains it every fifteen minutes.

**What is still missing is the reply path, not the send path.**
`EMAIL_REPLY_TO` is not set and `vallospaces.com` has no MX, so a reply to any
of these messages reaches no one (THE_AUDIT OPS-06).

---

## 3. REFUSED: built, complete, and deliberately not wired

Three. Each one is held unwired by `lib/email/reachability.test.ts`, which goes
red if somebody wires it, and each carries the same reason in a comment beside
the builder itself.

### `passwordReset`: GoTrue owns it

`lib/auth/actions.ts` asks for a reset with
`supabase.auth.resetPasswordForEmail`, and GoTrue composes and sends the
recovery mail itself, carrying the only link that works. **The recovery token
is minted inside GoTrue and never reaches this process, so there is no
`resetUrl` for a caller here to pass.** Anything we sent would be a SECOND
email arriving beside the real one, with either no link or a link that signs
nobody in, on the one screen where a person is already locked out and
frightened. Two reset emails is how somebody presses the wrong one and
concludes they have been phished.

It is kept rather than deleted because the fixtures render it and
`shell.test.ts` holds it to the catalogue's structure. The day the Send Email
Hook is enabled, the `recovery` payload arrives at
`/api/auth/email-hook` and this becomes the message for it.

### `escrowFunded`: it prints the one claim about custody nobody may make

Its subject is `... is held in escrow for ...`. **Rule 11: escrow is promised
nowhere until it operates**, and the structure question is with the solicitor.
The whole escrow copy layer in `lib/escrow/copy.ts` exists to keep that word
off a reader's screen, and this file sits outside that enforcement. Superseded
by `heldPaymentSetAside`, which the outbox sends on every HELD transition to
both parties.

Kept because the sentence craft in it is worth reading the day the structure IS
decided. Not kept because anybody should call it.

### `escrowReleased`: the same claim, in the same place

Same subject line, same rule 11. Superseded by `heldPaymentPaidOut`, which the
outbox sends on every RELEASED transition to both parties, with the settlement
lines rather than a bare amount.

---

## 4. Findings nobody asked for

### Finding 1. ONE FAILED WITHDRAWAL IS TWO EMAILS. Measured, not reasoned.

`wallet_entries_enqueue_withdrawal_email` fires on `after update of status on
public.wallet_entries` and queues `wallet.withdrawal_outcome`. Both
`settleWithdrawal` (the Paystack `transfer.failed` and `transfer.reversed`
webhook) and `setEntryStatus` (the two catch paths in `lib/wallet/actions.ts`
that mark a hold FAILED) perform exactly that UPDATE. **Each of those three
call sites then ALSO sends `withdrawalFailed` directly through `sendMessage`.**

So the same person is told twice, in two different sets of words, about the
same money. `withdrawalOutcome` opens with the outcome and distinguishes
`reversed` from `failed`, which matters because reversed means the money left
and came back and the reader will see a debit and then a credit on their
statement. `withdrawalFailed` says only that it failed.

Proved against the live catalogue on 23 September by a probe that created a
wallet and a PENDING withdrawal entry, ran the same UPDATE the TypeScript runs,
and rolled everything back on a deliberate raise:

```
PROBE ALL PASS double send: status-update-queues=wallet.withdrawal_outcome.
The SAME code path also calls withdrawalFailed directly through sendMessage,
so one failed withdrawal is TWO emails.
```

**Nothing reaches anybody today because there is no key, so this is a defect to
fix BEFORE the key is set rather than after.**

**The remedy, for whoever holds wallet and the Paystack webhook.** Delete the
three direct `withdrawalFailed` sends (`app/api/paystack/webhook/route.ts`
around line 469, `lib/wallet/actions.ts` around lines 696 and 908) and let the
trigger's `wallet.withdrawal_outcome` be the only one. `withdrawalFailed` then
becomes an unwired builder and needs a written refusal beside it
("superseded by `withdrawalOutcome`, which the outbox sends on every
withdrawal outcome and which tells `reversed` apart from `failed`") and an
entry in `REFUSED` in `lib/email/reachability.test.ts`, or the suite will say
so. The junction worker did not make this change because both files belong to
the money worker's scope.

### Finding 2. The eight escrow emails print a raw uuid as their reference

`heldPaymentProposed` and its seven siblings print `data.id`, a 36 character
uuid, as the visible **Reference** row, and again in full under the button.
A person asked to quote `33333333-3333-4333-8333-333333333333` to support over
the phone will not. It is not a personal datum and it is not dangerous; it is
our plumbing on somebody's screen where a short human reference belongs, the
way `supportTicketFiled` and `withdrawalOutcome` both already have one.

`lib/notify/outbox-delivery.test.ts` forbids every other id from appearing
anywhere in any message and exempts this one explicitly, under protest, with a
note saying to delete the exemption the day escrow grows a short reference.

### Finding 3. `profiles.welcomed_at` is no longer the once-ever guarantee

It was a stamp on a table its own owner can write, which is why the old send
site also had to refuse any account confirmed more than a day ago. The
guarantee is now the UNIQUE dedupe key `account:welcome:<user id>` on
`public.email_outbox`, a table with RLS on and no policy that only the service
role reaches. The column is kept (dropping one is data-losing), is NULL on
every row, and now carries a comment saying what replaced it.

### Finding 4. Nobody who has ever signed up here has been welcomed

Measured on 23 September before any of this work: seven accounts, five with a
confirmed address, `welcomed_at` NULL on every row. **Those five are not
backfilled.** A welcome that arrives months after somebody joined is not a
welcome, it is a surprise. The triggers fire forward only.

---

## 5. What a person should do next, in order

**Updated 23 September 2026.** `RESEND_API_KEY` is set, the Send Email Hook is
on, and every row in the outbox has been sent (5 SENT, 0 PENDING at 23:47 UTC on
23 September). What remains:

1. **Check finding 1 is closed** before relying on withdrawal emails: two
   sends about the same failed withdrawal is the defect it describes.
2. **Give replies somewhere to go.** Set `EMAIL_REPLY_TO` (not set today) to a
   mailbox on a domain that receives mail, and add MX and DMARC records for
   `vallospaces.com` (THE_AUDIT OPS-06).
3. **Read the first emails that arrive in real inboxes.** The From line as an
   inbox shows it, the dark rendering in Gmail and Apple Mail and the spam
   verdict cannot be proved from a test.

The public address on every message is `hello@vallospaces.com`. The private
gmail appears on no surface and in no email, and
`lib/notify/outbox-delivery.test.ts` asserts that for every template.
