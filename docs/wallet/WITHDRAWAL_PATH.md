# The withdrawal path

One page for the question "somebody's money left their wallet, what happens
next". It exists because the answer is spread over three doors, one webhook,
one sweeper, one database function, one trigger and one email, and the last
person to need it read four files and still got the prefix rule wrong.

Everything below was read out of the code on 2026-09-23, or observed on the
live database, and the lines marked **UNPROVEN** are the ones nobody has
watched happen. Those are the interesting ones.

---

## 1. `rm-wd-` is a contract, not a naming style

A withdrawal is one row in `public.wallet_entries`:

| column      | value                                            |
| ----------- | ------------------------------------------------ |
| `kind`      | `withdrawal`                                     |
| `status`    | `PENDING`, then `COMPLETED` / `FAILED` / `REVERSED` |
| `reference` | `rm-wd-<uuid>`, unique across the whole table    |

Both halves of that are load-bearing, and they are load-bearing in DIFFERENT
places, which is the part that is easy to get wrong:

- **The webhook gates on the PREFIX.** `app/api/paystack/webhook/route.ts`
  refuses to settle a `transfer.*` event whose reference does not start with
  `rm-wd-` (`reference_not_ours`, HTTP 200). A door that invented its own
  prefix would write a debit that no webhook can ever settle.
- **The sweeper gates on the KIND.** `sweepStaleWithdrawalHolds` selects
  `kind = 'withdrawal' AND status = 'PENDING'` and never looks at the prefix
  at all.
- **`settleWithdrawal` gates on BOTH**, plus `status = 'PENDING'`: one UPDATE,
  `reference = ? AND kind = 'withdrawal' AND status = 'PENDING'`
  (`lib/wallet/ledger.ts`).

So a row needs the right prefix AND the right kind to be settleable, and it is
`settleWithdrawal`'s three-way condition that is the real rule. A row with one
and not the other goes stuck in a way nothing shouts about: the webhook returns
200 either way.

Observed on the live database: 1 withdrawal row, 0 pending holds, 0 rows with a
withdrawal kind and a wrong prefix, 0 rows with an `rm-wd-` reference and a
different kind. `wallet_entries_reference_key` is a real unique index.

**This is why a bank send is an `rm-wd-` row.** Sending money to a third party's
account and withdrawing to your own are the same Paystack transfer and must
settle through the same webhook branch. A separate prefix would have been
tidier to read and unsettleable in production. The words the PERSON sees fork;
the ledger does not (see section 6).

---

## 2. The three doors

All three live in `apps/web/src/lib/wallet/actions.ts`. All three mint
`rm-wd-<uuid>`, post a PENDING debit hold through
`public.hold_wallet_withdrawal`, and then hand the same reference to Paystack
via `createTransferRecipient` + `initiateTransfer`. Nothing else in the
codebase calls `initiateTransfer`.

| door | reached from | idempotency scope | metadata it adds |
| --- | --- | --- | --- |
| `withdraw` (typed-in) | the withdraw sheet | `wallet.withdraw` | `note`, `bank_code`, `bank_name`, `account_last4`, `account_name` |
| `withdrawToSavedAccount` | dispatched from `withdraw` when the form carries `bankAccountId` | `wallet.withdraw` (the dispatch is INSIDE the wrapper) | the above plus `bank_account_id` |
| `transferToBank` | **REMOVED 23 September.** The send desk's bank mode is gone, code and all, on the founder's direction: moving a member's money to a third party's account is a licensed activity this company is not licensed for. Nothing writes `destination: "third_party"` any more, and the withdrawal email no longer has a branch for it. | | |

`destination: "third_party"` used to be written by exactly one door and read in
exactly one place (`gatherFacts` in `lib/notify/outbox.ts`). With the door gone
nothing writes it, so `gatherFacts` no longer reads it either: every row is the
withdraw door and the words are the same for everybody. The live table was read
before that branch was cut, and both existing `wallet_entries` rows carry a
null destination, so no historical row is mis-described.

**THE LICENSING QUESTION IS ANSWERED AND THE ANSWER IS NO.** It was an open
question with the door shut behind `BANK_SEND_OPEN = false`. On 23 September
the founder settled it: the company is not applying for the licence, whose
share capital requirement is N500,000,000. So the code is removed rather than
flagged off, because a flag is a switch somebody can turn back on.

**Two doors survive and neither is a third party payment.** `transferToUser`
moves money between two Vallo wallets and no bank is involved. `withdraw` pays
a person their own money. Note, and it is in `docs/ONE_PERSON_MANY_ACCOUNTS.md`
as well: nothing currently proves the bank account a person withdraws to is
theirs, so "their own money" is an assumption about the destination rather than
a checked fact.

### Two taps move the money once

The reference is minted per CALL, so a second submit is a second reference the
database has never seen and cannot refuse. The ledger's unique index is no help
here: that is the whole point of this paragraph.

All three doors therefore run inside `withIdempotency`
(`lib/security/idempotency.ts`), under the scopes in the table above, keyed on
an `idempotencyKey` the form mints per submit. `shouldRecord: (r) => r.ok`
keeps a refusal retryable: somebody who mistyped a digit must be able to fix
it at once rather than be handed the same refusal for the whole TTL.

Two things this guard is NOT:

- It is not a second ledger. It **fails open** when it cannot reach its store,
  by design, so it removes the common double submit and nothing more. The
  unique `reference` and `hold_wallet_withdrawal`'s row lock are the real
  guarantees.
- It is not automatic. **A form with no key runs unguarded.** The withdraw
  sheet does not mint one yet (`docs/archive/BUILD_07_LEDGER.md` section 49), which is
  why `WalletDeck`'s twenty-five second clock says *"Do not send this again"*
  and offers the history instead of a retry button. The panel can have its
  retry button the day it carries a key.

Proven by mutation: with the guarded result discarded and `withdrawWork` called
again instead, four of the five tests in
`lib/wallet/withdraw-door.test.ts` → *"two taps on a withdrawal move the money
once"* go red, including the two that count holds.

---

## 3. What settles a hold

`POST /api/paystack/webhook`, on `transfer.success`, `transfer.failed` and
`transfer.reversed`. It checks the signature, checks the prefix, and calls
`settleWithdrawal` with `COMPLETED`, `FAILED` or `REVERSED`.

`FAILED` and `REVERSED` are not synonyms and the code keeps them apart on
purpose. Failed means the bank refused it and the money never left. Reversed
means it left, came back, and the person will see a debit and then a credit on
their bank statement. Telling somebody "it failed" when their statement says
otherwise is how a support ticket starts.

`settleWithdrawal` is one statement, so a webhook arriving mid-sweep and the
sweeper cannot both settle the same hold. Whichever loses updates zero rows and
gets `null` back.

---

## 4. What releases a hold nobody settled

`availableBalanceMinor` subtracts every pending debit, so a hold whose webhook
never arrives holds that money out of somebody's spendable balance forever.
`sweepStaleWithdrawalHolds` in `lib/wallet/reconciliation.ts` is the answer:

- picks up holds older than `WITHDRAWAL_HOLD_TIMEOUT_MINUTES` (30), oldest
  first, at most 200 a run;
- **asks Paystack** `verifyTransfer(reference)` rather than expiring on age,
  because a hold whose transfer really did pay out must never be handed back;
- treats a Paystack 404 as `transfer_never_started` and fails the hold, which
  is the exact case of a door that posted the hold and then could not reach the
  processor;
- leaves anything still in flight alone and says so in the log.

It is reached by `runMoneyReconciliation`, reached by
`GET|POST /api/paystack/reconcile`, guarded by `RECONCILE_CRON_SECRET`.

### The part to look at

**`apply` defaults to false, and the scheduled run does not pass it.**
`vercel.json` has `{ "path": "/api/paystack/reconcile", "schedule": "10 * * * *" }`
with no `?apply=1`. So the hourly run reads, reports and alerts, and RELEASES
NOTHING. A stranded hold is currently visible and not self-healing; freeing it
takes a deliberate call with `apply=1`, or the admin console's
`runReconciliationNow`.

That is deliberate, because the first runs against a live database should only
ever report, but it is a dry run that has been dry for a while, and the person whose
money is held cannot tell the difference between "swept" and "reported".
**UNPROVEN:** whether anyone has read a dry report and flipped it. There are 0
pending holds on the live database today, so nothing is stuck right now.

---

## 5. Rate limits on the path

From `lib/security/money-limits.ts`, per person:

| action | bucket | limit |
| --- | --- | --- |
| `withdraw`, shared by ALL THREE doors | `money_withdraw` | 5 per hour |
| `resolveBankAccount`, `lookupAccountName` | `money_bank_resolve` | 20 per 10 min |
| `addBankAccount` | `money_bank_add` | 5 per hour |

The resolve limits are tight because each call is billed at Paystack, and loose
enough that somebody fixing a typo is never stopped.

---

## 6. What the person is told

**On screen**, while it is going: nothing for a fast answer, then at ~10s *"This
is taking longer than usual. Nothing has left your wallet yet, and nothing has
been sent twice. Stay here."*, then at 25s a pending panel, *"We have not heard
back. Do not send this again. If the withdrawal started it is at the top of your
history as pending, and if it did not, your balance is untouched."*, with a
link to the history and no retry button (`components/app/wallet/MoneyWait.tsx`).
The transfer wording is the same shape with the right noun.

**By email**, once the status changes. Observed on the live database:

```
CREATE TRIGGER wallet_entries_enqueue_withdrawal_email
  AFTER UPDATE OF status ON public.wallet_entries
  FOR EACH ROW EXECUTE FUNCTION private.enqueue_withdrawal_outcome_email()
```

It gates on `kind = 'withdrawal'` and on the status actually leaving `PENDING`,
maps `COMPLETED|FAILED|REVERSED` to `paid|failed|reversed`, and enqueues
`wallet.withdrawal_outcome` keyed `withdrawal:<entry id>:<outcome>` so a
repeated update cannot send twice. `/api/cron/email-outbox` drains it every 15
minutes.

The one template forks on `destination`: a bank send is called a **transfer**
and a withdrawal is called a **withdrawal**, in the subject and throughout, and
the word "withdrawal" appears nowhere in the bank-send version. Neither version
prints the account holder's name; a bank name and four digits are what a
receipt needs. Proven end to end, from the row the trigger writes to the bytes
on the wire, in `lib/notify/outbox-delivery.test.ts`.

**Nothing is sent while the hold is merely PENDING**, because nothing has
changed status. A person whose transfer is stuck gets the 25-second panel and
then silence until the sweeper or the webhook moves the row.

---

## 7. The three ways this path can still go quiet

1. **A stranded hold on a dry schedule** (section 4). Reported hourly, released
   never, until somebody passes `apply=1`.
2. **A row with the right prefix and the wrong kind, or the reverse**
   (section 1). Both webhook branches answer HTTP 200 and the row sits.
   Nothing alerts on it; the query in section 1 is how you would find it.
3. **A door added later that mints its own reference shape.** The webhook would
   ignore it silently. If you are adding a fourth door, it mints `rm-wd-` and
   posts through `hold_wallet_withdrawal`, or it is not a withdrawal.
