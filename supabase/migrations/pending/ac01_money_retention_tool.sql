-- DRAFT, not applied. ADMIN COVERAGE 1 of 1: THE MONEY-RECORD RETENTION TOOL.
--
-- WHY. public.destroy_expired_money_records(limit) (AML-11, migration
-- 20260924095920) redacts a purged account's bank accounts, payout accounts
-- and wallet-entry destinations once account_deletion_requests.money_retain_until
-- passes. It is granted to service_role only, nothing in the app calls it, and
-- no scheduled job calls it (cron.job on 13 October 2026 lists no
-- destroy_expired_money_records, and the daily account purge in the app
-- calls destroy_expired_kyc, not this). So the retention date has no effect
-- today. This draft gives the console a careful, audited, manual way to run it,
-- with a dry run first. It does NOT schedule it: whether the destruction
-- should run by itself is the founder's call, not a default.
--
-- WHAT IT ADDS (nothing existing is changed)
--   private.money_retention_due(limit)
--       the accounts past their date, oldest first, with how many rows of
--       each kind the destroy function would remove. The same predicate and
--       the same payout hold (an identification still inside its own
--       retention keeps the payout accounts) as destroy_expired_money_records.
--       No names, no account numbers, no user ids leave the database.
--   public.staff_money_retention_preview()
--       the dry run. jsonb: due, kept, next_due, totals, and up to 50 rows.
--       Admins and super admins on the finance scope (step-up included).
--   public.staff_destroy_expired_money_records(limit, confirm, expected)
--       super admin only, on the finance scope. Refuses unless confirm is
--       exactly 'DESTROY' and expected equals the number of accounts it is
--       about to touch, so a list that changed under the reader destroys
--       nothing. Runs the existing destroy function, then writes one more
--       audit row carrying the caller's id (the destroy function's own rows
--       have no actor because it runs as the service role).
--
-- Nothing here deletes by itself; both public functions are granted to
-- authenticated and decide on auth.uid().
-- Probe: supabase/tests/probes-pending/ac01-money-retention-tool.sql
set lock_timeout = '5s';

create or replace function private.money_retention_due(p_limit integer default 50)
returns table (
  request_id uuid,
  retain_until timestamptz,
  bank_accounts integer,
  payout_accounts integer,
  payout_held boolean,
  wallet_entries integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id,
         d.money_retain_until,
         (select count(*)::integer from public.bank_accounts b where b.user_id = d.user_id),
         case when h.held then 0
              else (select count(*)::integer from public.payout_accounts pa
                     where pa.agent_id in (select ag.id from public.agents ag where ag.user_id = d.user_id))
         end,
         h.held,
         (select count(*)::integer
            from retired_custody.wallet_entries we
            join retired_custody.wallets w on w.id = we.wallet_id
           where w.user_id = d.user_id
             and we.metadata ?| array['name', 'account_name', 'account_number'])
    from public.account_deletion_requests d
    cross join lateral (
      select exists (select 1 from public.agent_applications a
                      where a.user_id = d.user_id
                        and a.kyc_retain_until is not null
                        and a.kyc_retain_until > now()) as held
    ) h
   where d.status = 'PURGED'
     and d.money_retain_until is not null
     and d.money_retain_until <= now()
   order by d.money_retain_until, d.id
   limit greatest(1, least(coalesce(p_limit, 50), 500));
$$;

revoke all on function private.money_retention_due(integer) from public, anon, authenticated;

create or replace function public.staff_money_retention_preview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  due_n integer;
  kept_n integer;
  next_due timestamptz;
  rows_json jsonb;
  tot record;
begin
  if me is null
     or not (private.has_role(me, 'admin'::public.app_role) or private.has_role(me, 'super_admin'::public.app_role))
     or not private.staff_can(me, 'finance') then
    raise exception 'retention:forbidden' using errcode = '42501';
  end if;

  select count(*) into due_n
    from public.account_deletion_requests d
   where d.status = 'PURGED' and d.money_retain_until is not null and d.money_retain_until <= now();

  select count(*), min(d.money_retain_until) into kept_n, next_due
    from public.account_deletion_requests d
   where d.status = 'PURGED' and d.money_retain_until is not null and d.money_retain_until > now();

  select coalesce(sum(x.bank_accounts), 0)::integer as bank,
         coalesce(sum(x.payout_accounts), 0)::integer as payout,
         coalesce(sum(x.wallet_entries), 0)::integer as wallet
    into tot
    from private.money_retention_due(500) x;

  select coalesce(jsonb_agg(jsonb_build_object(
           'request_id', x.request_id,
           'retain_until', x.retain_until,
           'bank_accounts', x.bank_accounts,
           'payout_accounts', x.payout_accounts,
           'payout_held', x.payout_held,
           'wallet_entries', x.wallet_entries) order by x.retain_until, x.request_id), '[]'::jsonb)
    into rows_json
    from private.money_retention_due(50) x;

  return jsonb_build_object(
    'due', due_n,
    'kept', kept_n,
    'next_due', next_due,
    'bank_accounts', tot.bank,
    'payout_accounts', tot.payout,
    'wallet_entries', tot.wallet,
    'rows', rows_json);
end;
$$;

comment on function public.staff_money_retention_preview() is
  'AC-01. Dry run of destroy_expired_money_records: how many purged accounts are past money_retain_until and what would go. Admin or super admin on the finance scope. Reads only.';
revoke all on function public.staff_money_retention_preview() from public, anon;
grant execute on function public.staff_money_retention_preview() to authenticated;

create or replace function public.staff_destroy_expired_money_records(
  p_limit integer,
  p_confirm text,
  p_expected integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  lim integer := greatest(1, least(coalesce(p_limit, 50), 500));
  due_n integer;
  result jsonb;
  done integer;
begin
  if me is null
     or not private.has_role(me, 'super_admin'::public.app_role)
     or not private.staff_can(me, 'finance') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_confirm is distinct from 'DESTROY' then
    return jsonb_build_object('status', 'confirm');
  end if;

  -- One destroyer at a time, so two people pressing the button count once.
  perform pg_advisory_xact_lock(hashtext('ac01_destroy_expired_money_records'));

  select count(*) into due_n from (
    select 1
      from public.account_deletion_requests d
     where d.status = 'PURGED' and d.money_retain_until is not null and d.money_retain_until <= now()
     limit lim) x;

  if due_n = 0 then
    return jsonb_build_object('status', 'nothing_due');
  end if;
  if p_expected is distinct from due_n then
    return jsonb_build_object('status', 'changed', 'due', due_n);
  end if;

  result := public.destroy_expired_money_records(lim);
  done := coalesce((result ->> 'redacted')::integer, 0);

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, 'retention.money_records.destroyed_by_staff', 'retention', 'money_records',
          jsonb_build_object('expected', p_expected, 'redacted', done, 'limit', lim));

  return jsonb_build_object('status', 'ok', 'redacted', done);
end;
$$;

comment on function public.staff_destroy_expired_money_records(integer, text, integer) is
  'AC-01. Super admin on the finance scope runs destroy_expired_money_records after typing DESTROY, only if the number of accounts it will touch equals p_expected. Writes an audit row with the caller.';
revoke all on function public.staff_destroy_expired_money_records(integer, text, integer) from public, anon;
grant execute on function public.staff_destroy_expired_money_records(integer, text, integer) to authenticated;
