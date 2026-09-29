# Retired probes

These probes tested the custody system (wallets, wallet pots, the wallet
ledger, escrow, escrow payouts and rulings, withdrawal holds) that Vallo
retired on 25 September 2026 when it stopped holding customer money (Track A,
`docs/MONEY_ARCHITECTURE.md`). Every object they reach for has been dropped,
so they can no longer run, and they must never be made to pass by restoring
what they test.

They were moved here on 29 September 2026, the first time the database probes
ran after CI had started no job since 23 September. The runner reads only
`supabase/tests/probes/`; nothing here runs.

What replaces them is `probes/track-a-custody-retired.sql`, which fails if any
custody table or function comes back, if the event trigger that refuses them is
removed or disabled, or if a custody switch can be turned on.

| Probe | What it held |
| --- | --- |
| esc-01 | a ruling on a never-funded escrow credits nothing |
| esc-05 | escrow payouts stop for a suspended payee and when switched off |
| esc-07-08 | escrow rulings by super admins; who may write the held_payments switch |
| esc-11 | an escrow payout moment is the end of a Lagos day |
| mon-02 | age-only withdrawal hold releasers are unreachable |
| mon-07 | wallet spendable is computed in one place |
| mon-08 | a pot's balance is the ledger's |
| mon-10 | wallet_entries is append-only |
| mon-p2-01 | escrow commission is fixed at funding |
