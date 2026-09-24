-- V-04, THE ACCOUNT-NUMBER MOMENT: a boolean and four digits, for the receiver.
--
-- When the lister sends a ten-digit account number into a listing thread, the
-- send action (after the insert, never blocking it) resolves the holder name
-- and compares it with the names Vallo verified for that lister. This table is
-- where the ANSWER lands, and it is built so that the answer is all that lands:
--
--   bank_code            which bank the number resolved at, or null
--   last4                the last four digits. NEVER THE NUMBER. The b4 rule
--                        (20260919101700: a flag stops keeping the account
--                        number) applies here with the same force.
--   name_matches_lister  true, false, or null when no claim is possible
--   outcome              which of the five answers, so a null is never
--                        ambiguous between "not checked" and "nobody to
--                        compare with"
--
-- THE RESOLVED NAME IS NOT A COLUMN. It is never stored, never returned and
-- never shown, because a table that held it would make Vallo a lookup service
-- for strangers' account names, which is the NDPA problem the entry names.
--
-- WHO READS IT: THE RECEIVER, AND ONLY THE RECEIVER. The select policy admits
-- a participant of the conversation who is NOT the message's sender. The
-- sender learning "that account is not yours" is information a scammer could
-- use to tune the next attempt, and the card exists for the person about to
-- pay. Staff read it through the service role like every other safety table.
--
-- WHO WRITES IT: NOBODY BUT THE SERVICE ROLE. `authenticated` holds SELECT and
-- nothing else, so a participant cannot forge a "belongs to the verified
-- lister" row. The send action writes with the admin client, after the
-- resolution, once per message (the primary key makes a second write a no-op
-- upsert).
--
-- THE NAMES IT COMPARES WITH come from `private.lister_verified_names`, a
-- security definer function granted to the service role only. It returns a
-- name only where a member of staff PASSED the rung that checked it: the legal
-- name on the application when the identity rung passed, the firm's registered
-- name when the identity rung passed on a firm, and the payout account's
-- resolved holder name when the payout rung passed. An agent nobody has
-- checked returns nothing, and the check then says nothing either way.
--
-- RATE LIMIT: `private.consume_rate_limit` (bucket `account_check`, subject
-- the conversation), called by the action before any name is read. Not in
-- this file because the function already exists.

create table if not exists public.message_account_checks (
  message_id          uuid primary key references public.messages(id) on delete cascade,
  conversation_id     uuid not null references public.conversations(id) on delete cascade,
  bank_code           text check (bank_code is null or bank_code ~ '^[0-9A-Za-z]{2,12}$'),
  last4               text check (last4 is null or last4 ~ '^[0-9]{4}$'),
  name_matches_lister boolean,
  /* Only on a no_match: whether the holder shares any name with a name on
     record (a surname, say). False means a total mismatch, the one case the
     receiver's card draws in the error colour. It is a boolean about the
     comparison and says nothing about what the resolved name was. */
  shares_a_name       boolean,
  outcome             text not null
                      check (outcome in ('match', 'no_match', 'unresolved', 'no_verified_name', 'limited')),
  checked_at          timestamptz not null default now(),
  -- The boolean and the outcome can never disagree, so no reader has to
  -- decide which one to believe.
  constraint message_account_checks_outcome_agrees check (
    (outcome = 'match' and name_matches_lister is true)
    or (outcome = 'no_match' and name_matches_lister is false)
    or (outcome not in ('match', 'no_match') and name_matches_lister is null)
  ),
  constraint message_account_checks_shares_only_on_no_match check (
    outcome = 'no_match' or shares_a_name is null
  )
);

comment on table public.message_account_checks is
  'V-04. Whether an account number the lister sent in a thread belongs to the lister Vallo verified: a boolean, a bank code and the last four digits. Never the number and never the resolved name. Readable by the receiving participant only; written by the service role only.';

create index if not exists message_account_checks_conversation_idx
  on public.message_account_checks (conversation_id);

alter table public.message_account_checks enable row level security;

revoke all on public.message_account_checks from public, anon, authenticated;
grant select on public.message_account_checks to authenticated;
grant all on public.message_account_checks to service_role;

drop policy if exists message_account_checks_receiver_reads on public.message_account_checks;
create policy message_account_checks_receiver_reads
  on public.message_account_checks for select
  to authenticated
  using (
    exists (
      select 1
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
       where m.id = message_account_checks.message_id
         and m.sender_id <> (select auth.uid())
         and (select auth.uid()) in (c.guest_id, c.agent_id)
    )
  );

/* ------------------------------------- the names a holder is compared with */

create or replace function private.lister_verified_names(p_user uuid)
returns table (kind text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'person'::text, btrim(app.full_name)
    from public.agents a
    join public.agent_applications app on app.id = a.application_id
   where a.user_id = p_user
     and app.full_name is not null and btrim(app.full_name) <> ''
     and exists (select 1 from public.agent_verification_checks v
                  where v.agent_id = a.id and v.kind = 'identity' and v.status = 'passed')
  union
  select 'business'::text, btrim(app.business_name)
    from public.agents a
    join public.agent_applications app on app.id = a.application_id
   where a.user_id = p_user
     and app.business_name is not null and btrim(app.business_name) <> ''
     and exists (select 1 from public.agent_verification_checks v
                  where v.agent_id = a.id and v.kind = 'identity' and v.status = 'passed')
  union
  select 'person'::text, btrim(p.resolved_account_name)
    from public.agents a
    join public.payout_accounts p on p.agent_id = a.id
   where a.user_id = p_user
     and p.resolved_account_name is not null and btrim(p.resolved_account_name) <> ''
     and exists (select 1 from public.agent_verification_checks v
                  where v.agent_id = a.id and v.kind = 'payout' and v.status = 'passed');
$$;

comment on function private.lister_verified_names(uuid) is
  'V-04. The names Vallo checked for a lister, each only where the rung that checked it PASSED: legal name and firm name behind the identity rung, payout holder behind the payout rung. Service role only: it returns personal data and exists for the account check, nothing else.';

revoke all on function private.lister_verified_names(uuid) from public, anon, authenticated;
grant execute on function private.lister_verified_names(uuid) to service_role;

/* The public wrapper the admin client can reach over PostgREST, which does
   not expose `private`. Same grants: service role only. */
create or replace function public.lister_verified_names(p_user uuid)
returns table (kind text, name text)
language sql
stable
security definer
set search_path = ''
as $$ select * from private.lister_verified_names(p_user); $$;

revoke all on function public.lister_verified_names(uuid) from public, anon, authenticated;
grant execute on function public.lister_verified_names(uuid) to service_role;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('anon', 'public.message_account_checks', 'select') then bad := bad || ' [anon reads checks]'; end if;
  if has_table_privilege('authenticated', 'public.message_account_checks', 'insert')
     or has_table_privilege('authenticated', 'public.message_account_checks', 'update')
     or has_table_privilege('authenticated', 'public.message_account_checks', 'delete') then
    bad := bad || ' [authenticated can write checks]';
  end if;
  if has_function_privilege('authenticated', 'public.lister_verified_names(uuid)', 'execute')
     or has_function_privilege('anon', 'public.lister_verified_names(uuid)', 'execute') then
    bad := bad || ' [a member can read verified names]';
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'message_account_checks'
                and column_name in ('account_number', 'account_name', 'resolved_name')) then
    bad := bad || ' [a column holds the number or the name]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
