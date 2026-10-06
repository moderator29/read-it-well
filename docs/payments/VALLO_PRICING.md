# Vallo pricing: what Vallo charges, what the provider charges, and who pays

**Founder decisions, 6 October 2026.** Every rate here is **policy data in
`money_policy`, in basis points or kobo, never a constant in code.** Changing a
price is a row, not a deploy.

---

## 1. The decisions

| | |
|---|---|
| **Vallo commission** | **0.5%** (`commission_bps = 50`) on every transaction, both rails |
| **Vallo Guarantee** | **Retired. `guarantee_bps = 0`.** Machinery kept, rate zero |
| **VAT** | **Not charged. `vat_bps = 0`, `vat_registered = false`** |
| **Referral reward** | **70 naira** per qualified referral |
| **Referral cap** | **1,500 qualified referrals per member per month** |
| **Withdrawal minimum** | **1,000 naira** |

### Why the Guarantee went

Escrow already protects the renter: the money is held until conditions are met.
Charging 1 to 2 percent more for the same promise, out of the lister's share, on
top of Payluk's 2 percent, meant **4 percent on a platform with no listers to
lose**. It also had the shape of insurance, which this repository already refuses
elsewhere as NAICOM-regulated, and nobody had decided what happens to money nobody
claims.

**The machinery stays built**: `guarantee_reserve_entries`, the claims flow, the
admin desk, `escalate_caution_to_guarantee`. At zero basis points no contribution
is taken. If the direct rail later shows real fraud, it is one row to switch on,
for that rail only.

**Two consequences that are work, not footnotes.** Every Guarantee sentence comes
out of `lib/money/copy.ts`, the Terms, the help centre and the emails, and the
renter-facing trust story is replaced with what is actually true: **your payment
is held until you confirm**. And `PAYSTACK_GUARANTEE_SUBACCOUNT` may stop being a
blocker entirely, since there is no reserve leg to route. **Session 2 verifies
that rather than assuming it**, because the split currently refuses a charge whose
reserve leg is missing.

### Why no VAT

Nigeria's VAT registration threshold is **25 million naira of turnover**, and
turnover means Vallo's own revenue, which is the 0.5 percent, **not the value of
the transactions it facilitates**. At 0.5 percent that is roughly 5 billion naira
of volume before the question arises. **Charging VAT while unregistered is an
offence**, so the rate is zero and the flag is false.

When it is switched on: VAT applies to **Vallo's fee only, never to the rent**,
it is borne by whoever pays the fee, and it is recorded as **its own ledger line**
because it is remitted to FIRS and was never Vallo's money.

---

## 2. What each rail costs, and who pays

**Escrow rail** (rent, shortlet, apartments, land, sale):

| | |
|---|---|
| Payluk | **2% of the escrow amount** (2.5% for escrows created in Payluk's own app) |
| Vallo | 0.5% |
| **Total** | **2.5%** |

Payluk's `whoPays` field takes `buyer`, `seller` or `both`. **The founder has not
yet chosen.** Until he does, the rail cannot open, because the field is required
at escrow creation.

**Direct rail** (hotels, restaurants): Paystack's own fee, which **caps at 2,000
naira**, plus Vallo's 0.5 percent. The cap means the direct rail gets
proportionally cheaper as amounts rise, while the escrow rail does not cap at all.
**On a large transaction the escrow rail is substantially more expensive**, and
that difference will steer listers toward the rail with no protection unless the
pricing or the default routing accounts for it.

---

## 3. Withdrawal fees

**The founder's tiers, as given:**

| Amount withdrawn | Vallo fee |
|---|---|
| Under 100,000 | 50 |
| 200,000 to 500,000 | 200 |
| 500,000 to 2,000,000 | 300 |
| 2,000,000 and above | 2,500 |

**Three things need deciding before this ships.**

**1. There is a gap: 100,000 to 200,000 is not covered.** A member withdrawing
150,000 naira falls between two rules. **Session 1's call, overridable: the 200
naira band starts at 100,000**, so the table is continuous. A pricing table with a
hole in it is a support ticket and a refund.

**2. The 2,000,000 boundary is a cliff that teaches people to game it.** At
1,999,999 the fee is 300; at 2,000,001 it is 2,500, **more than eight times
higher**. Anyone withdrawing 2.5 million will send two withdrawals of 1.25 million
and pay 600 instead of 2,500. **Session 1's call: the top band is a percentage
with a cap rather than a flat jump**, so there is no boundary worth gaming.

**3. The fee is not a transfer fee, and Nigerians know what a transfer costs.**
The CBN's electronic transfer guide caps NIP fees at **50 naira** above 50,000
naira, and Paystack's own transfer pricing is 10, 25 and 50 naira by band. **A
member's own bank moves 2 million naira for 50 naira.** A 2,500 naira Vallo fee on
the same money is fifty times that, and on a platform whose promise is "without
the runaround" it will be read as extractive and screenshotted.

**The under-100,000 band at 50 naira is exactly right** and matches what the market
expects. The high bands are the ones to reconsider, and they are also the ones that
**will almost never fire at launch**: referral payouts run from 1,000 to 105,000
naira, so every withdrawal in the first months sits in the 50 naira band.

### The operational constraint that governs all of it

**Payluk does not publish its withdrawal fee and it is not fixed.** Its own
documentation: *"Payluk sets the `fee` on the returned intent; you do not send it.
The customer is debited `amount + fee` ... The fee depends on the amount and on
which provider Payluk currently settles payouts through, and it may include VAT.
It is fixed on the intent when the intent is created."*

So: **create the intent, read back the provider fee, add Vallo's band, and show
the member one total before they confirm.** Never compute a withdrawal cost from a
hardcoded table, and never quote a figure before the intent exists. Reconcile
against the fee read back, not against an assumption.

**Show the member the breakdown**, because a single unexplained deduction is how
trust is lost:

```
Amount            1,000,000
Processing fee          300
You'll receive      999,700
```

---

## 4. Referral economics, and the exposure the founder should see

**70 naira per qualified referral. 1,500 qualified referrals per member per
month.**

That is **105,000 naira per member per month** at the ceiling. Ten accounts
farming it successfully is **1,050,000 naira a month**.

**So the monthly cap is not the fraud control.** At 1,500 it is high enough that
qualification is the only thing standing between Vallo and a fraud bill.
Three things follow, and Session 1 recommends all three:

1. **Qualification must be expensive to fake**: phone verified **and** a real
   action by the referred person, not a signup. A SIM card costs less than 70
   naira of effort; a completed search journey with a saved space, a booking, or a
   published and approved listing does not.
2. **A platform-wide monthly budget cap**, enforced server-side, separate from the
   per-member cap. Referral spend is otherwise unbounded, and a single viral
   moment becomes a liability Vallo cannot fund.
3. **1,500 referrals a month is 50 a day.** That is not a member, it is a
   professional. Consider whether reaching that volume should move somebody into a
   reviewed ambassador tier rather than continuing to accrue automatically.

**The rewards balance is a debt, not custody.** It is Vallo owing a member money,
which is a different legal object from Vallo holding a member's money, and that is
why it is called a **Rewards Balance** and never a wallet. It accrues as a
liability from the moment a referral qualifies, it never expires, and the
threshold is stated before anybody starts earning.

---

## 5. The three pots, which must never mix

| Pot | Whose money | Where |
|---|---|---|
| **Customer funds** | The member's | At the licensed provider, in their account there |
| **Vallo revenue** | Vallo's | Commission, withdrawal fees, promotion |
| **Marketing float** | Vallo's | Funds referral payouts through Paystack transfers |

Separated **in the schema**, not merely in a report. Payluk cannot do a three-way
split, so on the escrow rail Vallo's commission is a separate recorded movement,
which makes this a ledger requirement rather than bookkeeping taste.
