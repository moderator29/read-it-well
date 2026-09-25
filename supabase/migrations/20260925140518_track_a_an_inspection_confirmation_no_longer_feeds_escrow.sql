-- Track A: no escrow. An inspection confirmation used to confirm the payer's
-- side of a held payment; nothing is held now. Disabled, not dropped, like the
-- rent-to-wallet trigger; the pending A.1 migration retires the function.
alter table public.inspection_confirmations disable trigger inspection_confirmations_feed_escrow;
