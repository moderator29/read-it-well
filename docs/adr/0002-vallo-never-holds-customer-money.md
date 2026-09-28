# ADR 0002: Vallo never holds customer money

**Status:** accepted, 25 September 2026. **Supersedes:** ADR 0001 (held payments, custody purpose and the float).

## Decision

No custody. There is no wallet, no balance, no escrow and no held payment, and no flag that could turn any of them back on. Every charge is split by Paystack in the same transaction: the lister's share to their own subaccount, 1 to 2 percent to a separate Vallo Guarantee reserve, and Vallo's commission (zero today) to Vallo. Crypto is naira-only through Yellow Card, settling straight to the same legs. Payment opens only after both parties confirm an agreement and an admin approves it; a rental's agreement is drawn from a submitted, photographed inspection report.

## Why

Holding client funds between two parties is regulated by the Central Bank of Nigeria and the company's objects clause does not cover it. The escrow machinery was well built and unreachable, and every sentence about it was a promise the company could not lawfully keep. Splitting at the moment of payment removes the regulated activity entirely and gives both sides a record, and the Guarantee gives renters and guests a capped, reviewed remedy without Vallo holding anybody's money.

## Consequences

See `docs/MONEY_ARCHITECTURE.md` for the mechanism and `docs/archive/TRACKS_25_SEPTEMBER_LEDGER.md` (Track A) for what was applied live and what is pending.
