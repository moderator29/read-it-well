-- Founder directive 25 September 2026: Vallo never holds customer money.
-- Until the wallet and escrow machinery is removed, both switches are off so
-- no path can take a customer's money into a Vallo-controlled balance.
update public.feature_flags set enabled = false where key in ('wallet', 'held_payments_payouts');
