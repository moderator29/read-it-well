-- DB-05 STEP 1 of 2 (safe with the deployed code). A member's client could
-- insert a bank account carrying any resolved_account_name and a
-- recipient_code of its choosing, and the withdrawal path pays a cached
-- recipient_code as it stands. An agent's client could rewrite a payout
-- account's number under the name the bank gave for another.
--
-- The client grants now name only what the deployed add paths write:
--   bank_accounts INSERT: user_id, bank_code, bank_name, account_number,
--     resolved_account_name, resolved_at (never recipient_code, is_default,
--     deleted_at or timestamps); UPDATE stays is_default, deleted_at,
--     updated_at.
--   payout_accounts INSERT: agent_id, bank_name, bank_code, account_number,
--     account_name; UPDATE: is_default only. Removing an account (DELETE) is
--     unchanged.
-- recipient_code, resolved_account_name and resolved_at on payout_accounts
-- are the service role's alone. Step 2 (after the release that inserts both
-- through the service role) withdraws INSERT from authenticated entirely.

revoke insert, update, delete on public.bank_accounts, public.payout_accounts from anon;

revoke insert on public.bank_accounts from authenticated;
grant insert (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
  on public.bank_accounts to authenticated;

revoke insert, update on public.payout_accounts from authenticated;
grant insert (agent_id, bank_name, bank_code, account_number, account_name)
  on public.payout_accounts to authenticated;
grant update (is_default) on public.payout_accounts to authenticated;

-- A row filed before these grants narrowed may carry a recipient_code its
-- owner chose. Clearing it sends that account back through the bank before
-- its first payout, which mints a recipient the server can vouch for.
update public.bank_accounts set recipient_code = null where recipient_code is not null;
update public.payout_accounts set recipient_code = null where recipient_code is not null;
