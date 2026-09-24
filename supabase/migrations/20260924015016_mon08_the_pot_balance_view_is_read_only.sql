-- MON-08 follow-up: public.wallet_pot_balances is for reading. The default
-- privileges for new relations gave authenticated INSERT, UPDATE and DELETE on
-- it (the view is simple enough to be auto-updatable, so a write would have
-- reached wallet_pots under its own RLS); only SELECT is meant.
revoke insert, update, delete, truncate, references, trigger on public.wallet_pot_balances from authenticated, service_role;
