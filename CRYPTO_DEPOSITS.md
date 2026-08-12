# Crypto top-ups

RentMe accepts crypto through **Yellow Card**, a licensed pan-African on-ramp
that settles to naira. Nothing in this repository holds a private key, watches a
chain, or decides an exchange rate.

**Nothing about this feature appears in the app until the three environment
variables below are set.** That is enforced in code, not by convention: the
wallet asks `isYellowCardConfigured()` on the server before it draws the
control, and it defaults to false.

---

## 1. Why a provider and not a wallet address

Showing a USDT address and watching the chain would make RentMe three things it
must not be:

- **A custodian.** A private key we hold is somebody else's money we hold, with
  no bank behind it, no insurance and no recovery. One leaked key is every
  deposit ever made.
- **An exchange.** The wallet is denominated in kobo. Crediting naira from a
  USDT deposit means somebody decided a rate, and if that somebody is us we
  carry the price movement between the deposit landing and the naira being
  spent.
- **A chain operator.** Confirmations, reorgs, wrong-network sends, memo-less
  exchange withdrawals. Each is a way to lose somebody's money quietly, which
  is a failure this platform has already had once.

With Yellow Card the person pays in crypto, we are credited in naira, and the
rate, the custody and the compliance are theirs. It is the same relationship we
already have with Paystack for cards.

---

## 2. Getting an account

This is a **business account application**, not a signup form. Budget days, not
minutes.

1. Go to **https://yellowcard.io** and open **Business** / **Yellow Card for
   Business**. Apply for a merchant account for RentMe.
2. They will ask for company documents. This is the same wall you have already
   hit with Paystack Transfers, so expect: **CAC certificate**, directors' IDs,
   proof of address, and a description of what the money is for. Say plainly
   that it is customer wallet top-ups on a property marketplace.
3. Ask their team specifically for **Payments API access** (sometimes called
   Collections). A plain business account that only uses their app will not give
   you API credentials.
4. Once approved you get, from their dashboard:
   - an **API key**
   - an **API secret**
   - a **sandbox base URL** and a **production base URL**
5. Set your **webhook URL** in their dashboard to:

   ```
   https://ninjafinds.vercel.app/api/yellowcard/webhook
   ```

**Answering your question directly: yes, it is via API.** It is a server-to-
server HTTPS API with HMAC-signed requests and signed webhooks, exactly like
Paystack. There is no widget to paste in and no wallet address to publish.

---

## 3. Setting it up on Vercel

Add three variables to the `read-it-well-web` project, for Production:

| Variable | Value |
| --- | --- |
| `YELLOWCARD_API_KEY` | the key from their dashboard |
| `YELLOWCARD_API_SECRET` | the secret from their dashboard |
| `YELLOWCARD_API_BASE` | their sandbox URL first, production once tested |

Redeploy. The **Top up with crypto** button appears on the wallet by itself.

Remove any one of the three and the button disappears again. There is no
half-configured state that renders a control which then fails at the network.

**Test in sandbox first.** Set `YELLOWCARD_API_BASE` to their sandbox host, make
one small top-up, and confirm the money reaches your wallet and a receipt exists
at `/wallet/transactions`. Only then switch the base to production.

---

## 4. What to check on the day the keys arrive

Everything structural is ours and is exercised by the same code paths the card
path already uses: the reference scheme, the idempotency, the webhook signature
check, the ledger credit, the configured gate. All of it is covered by tests.

**Two functions in `apps/web/src/lib/payments/yellowcard.ts` are written from
Yellow Card's published API and have never been run against a live merchant
account, because this platform does not have one yet:**

- `createCollection` — the request path, the field names (`sequenceId`,
  `customerEmail`, `callbackUrl`) and the response key holding the payment URL.
- `parseWebhook` — the field names on the webhook body and the exact status
  strings.

They are small, they are at the bottom of the file, and no provider field name
appears anywhere else in the codebase. If their docs differ, those two functions
are the whole of the change.

The signing scheme in `request()` and the webhook signature header name are in
the same category — confirm both against their integration guide.

---

## 5. How the money actually moves

```
Wallet → "Top up with crypto" → amount in NAIRA
    → startCryptoDeposit()            reference: rm-yc-<uuid>
    → audit row written FIRST         wallet.funding.started
    → Yellow Card hosted page         they quote the crypto, they take it
    → webhook POST                    /api/yellowcard/webhook
    → signature verified
    → status must be "completed"      pending and failed credit nothing
    → recordFunding()                 idempotent on rm-yc-<uuid>
    → balance moves, receipt exists
```

Three deliberate properties:

- **The amount is naira the whole way.** No part of this codebase knows a coin,
  a network or a rate.
- **The audit row is written before the payment page opens**, unconditionally.
  A payment that never gets credited still has a record on our side saying it
  was started. The absence of that line is what made a real lost deposit
  invisible for seventeen hours.
- **The webhook answers 500, not 200, when it cannot record a credit.** To a
  processor 200 means "never send this again". An unwritten credit must stay in
  their retry queue.

---

## 6. Fees, and being straight with people

Yellow Card takes a spread and/or a fee on the conversion. **Check what yours is
before launching this** and, if it is material, say so on the top-up sheet. The
sheet currently tells the person that the naira figure they type is what reaches
their wallet — that must stay true. If Yellow Card deducts their fee from the
settled amount rather than charging it on top, the copy in `CryptoForm` has to
change to match, because a wallet crediting less than the stated figure is the
platform lying about money.
