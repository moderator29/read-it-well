-- DB-05 STEP 2 of 2. Apply only after the release in which addBankAccount
-- and addPayoutAccount insert through the service role is deployed (step 1
-- must be live). A member's or agent's own client then files no bank or
-- payout account at all: the bank's name, the time it answered and any
-- processor recipient come only from the server, after it has asked the bank.
--
-- After applying: move tests/pending/db-05-step2.sql into tests/probes/ and
-- run it, and in tests/probes/db-06.sql change the allowlist to
-- ('bank_accounts', 'u') and ('payout_accounts', 'du').

revoke insert on public.bank_accounts from authenticated;
revoke insert on public.payout_accounts from authenticated;
