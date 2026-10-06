# ADR 0003: Two rails, and escrow held by a provider, never by Vallo

**Status:** proposed, 6 October 2026, by Session 2. Needs the founder's acceptance, and
the escrow rail stays off until Nigerian counsel's written opinion is in hand.
**Supersedes, once accepted:** ADR 0002 in part. Its central rule stands unchanged:
**Vallo never holds customer money.** What changes is that a regulated provider may hold
it, on one of two rails.

## Decision

Every payment opens on one of two rails, chosen by data, never by code
(`public.payment_rail_policy`, migration `20261006030027`):

| Rail | Carries | Who holds the money | What protects the payer |
|---|---|---|---|
| **Direct** (Paystack) | Hotel rooms, restaurant reservations, a registered business's apartment | Nobody. Split at the moment of charge, three legs, exactly as under ADR 0002 | The Vallo Guarantee, as today |
| **Escrow** (Payluk) | Rent, shortlets, homes, villas, land, shops, offices, an individual's apartment, and every sale (milestone escrow) | **Payluk**, in its own regulated capacity, until release | The hold itself: release needs the tenant or guest to confirm arrival or move-in |

The rule underneath is the accountability of the counterparty: an individual lister
gets escrow, a registered business gets direct settlement. If the router cannot
resolve a rail, **no payment opens**.

Guarantee: **one protection per rail** (architecture 3A.4, option 1). The escrow rail
contributes nothing to the reserve, because nothing has been handed over.

## Why

ADR 0002 removed custody because Vallo holding money between two parties is regulated
and outside the objects clause. That reason is unchanged, and this ADR does not give
Vallo custody. The founder ruled on 5 October 2026 that Payluk, which states it holds
the necessary licences, may hold users' money, and instructed that the escrow rail be
built. The shortlet market's characteristic fraud (pay, arrive, nothing there) is
exactly the risk a hold removes and a reserve only compensates.

## What must be true before the escrow rail is switched on

1. **Counsel's written opinion** that Vallo may orchestrate provider-held funds without
   its own authorisation, and that the objects clause covers it. Payluk's licence
   authorises Payluk, not Vallo.
2. **A decision on cancellations.** Payluk has no refund outside a dispute (Session 2,
   question 3; `docs/payments/PAYLUK_LIVE_DOCS_FINDINGS.md`). Either escrow is funded
   only after a booking's free-cancellation window closes, or every routine
   cancellation becomes a dispute Vallo opens and resolves, and the guest loses
   Payluk's fee unless Vallo makes them whole. Recommended: fund after the window.
3. **Per-rail money copy** in `lib/money/copy.ts`, approved by the founder and counsel.
   On the escrow rail it names Payluk as the holder. Nothing may say or imply that
   Vallo is a bank, an escrow institution or CBN-licensed.
4. The escrow flag (`payments_payluk_on`), off by default and failing closed, switched
   on by the founder and nobody else.

## Consequences

- `transactions.rail` records the rail at open and never changes.
- Disputes on the escrow rail are ruled by Vallo (Payluk does not arbitrate), with
  two-person rulings. Only one super admin exists today, so those rulings fail closed
  until a second person is appointed.
- Nothing about the direct rail changes.
