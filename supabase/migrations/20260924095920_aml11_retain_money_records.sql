-- RECOVERED FROM THE LIVE HISTORY (DB2, 2026-09-28). This migration was applied as
-- version 20260924095920 but never committed. Everything below this header is
-- supabase_migrations.schema_migrations.statements[1] for that version,
-- byte for byte (md5 checked against the live row). Do not edit.

-- AML-11 (SCUML AML/CFT checklist, item 11): transaction records are kept
-- five years and must be reconstructable. For a transaction record the AML
-- retention obligation beats NDPA minimisation: a purge may anonymise the
-- person, but it keeps the financial record.
--
-- public.purge_account_rows deleted the person's bank accounts (and, for an
-- agent without an approved application, their payout accounts) and stripped
-- `account_name`, `account_number` and `name` from their wallet entries, so a
-- purged account's withdrawal no longer said who was paid. Now, when the
-- account has money history (any wallet entry, card transaction on a booking,
-- escrow or rent charge):
--   * bank accounts and payout accounts are kept, marked deleted, with their
--     Paystack recipient code cleared so nothing can pay out through them;
--   * a wallet entry keeps the withdrawal's destination (account name and
--     number, and the payee's name); contact data (email, phone) still goes;
--   * account_deletion_requests.money_retain_until is set to five years on.
-- Saved card tokens are still deleted: they are a credential to charge, not a
-- record; a card payment is reconstructed from its processor reference.
-- An account with no money history is purged exactly as before. An approved
-- agent's identification was already kept (kyc_retain_until); it is stamped in
-- the same statement, so the two dates are equal.
--
-- public.destroy_expired_money_records(limit), run by the daily account-purge
-- job, redacts what was kept once money_retain_until passes: the bank accounts
-- and (unless an identification hold is still running) the payout accounts go,
-- and the wallet entries lose the destination keys. One audit row per account.
--
-- The purge body is edited in place: each edit asserts its anchor occurs
-- exactly once, so this fails rather than guessing on a body that has moved.

alter table public.account_deletion_requests
  add column if not exists money_retain_until timestamptz;
comment on column public.account_deletion_requests.money_retain_until is
  'AML-11. Until when a purged account''s financial record (bank and payout accounts, withdrawal destinations) is kept; destroy_expired_money_records redacts it after.';

create or replace function private.has_money_history(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.wallet_entries we join public.wallets w on w.id = we.wallet_id
                  where w.user_id = p_user)
      or exists (select 1 from public.transactions t join public.bookings b on b.id = t.booking_id
                  where b.guest_id = p_user)
      or exists (select 1 from public.escrows e where e.payer_id = p_user or e.payee_id = p_user)
      or exists (select 1 from public.rent_payments rp where rp.tenant_id = p_user or rp.lister_id = p_user);
$$;
revoke all on function private.has_money_history(uuid) from public, anon, authenticated;
grant execute on function private.has_money_history(uuid) to service_role;

do $migrate$
declare
  body text;
  edits text[][] := array[
    -- 1. the flag
    array['  v_kyc_keep   boolean;
',
          '  v_kyc_keep   boolean;
  v_money_keep boolean;
'],
    -- 2. decided before anything is erased
    array['  select ai.email_canonical, ai.canonical_rule into v_canon, v_rule
',
          '  /* AML-11: an account that moved money keeps its financial record for five
     years (SCUML item 11); the person is anonymised, the record is not. */
  v_money_keep := private.has_money_history(v_user);

  select ai.email_canonical, ai.canonical_rule into v_canon, v_rule
'],
    -- 3. bank accounts
    array['  delete from public.bank_accounts where user_id = v_user;
',
          '  if v_money_keep then
    update public.bank_accounts
       set recipient_code = null,
           deleted_at = coalesce(deleted_at, now())
     where user_id = v_user;
    get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object(''bank_accounts_retained'', n);
  else
    delete from public.bank_accounts where user_id = v_user;
  end if;
'],
    -- 4. payout accounts: kept for an approved agent (as before) or with money history; never payable
    array['    select count(*) into n from public.agent_documents where uploader_id = v_user;
    v_counts := v_counts || jsonb_build_object(''agent_documents_retained'', n);
  else
    delete from public.payout_accounts
     where agent_id in (select id from public.agents where user_id = v_user);
',
          '    select count(*) into n from public.agent_documents where uploader_id = v_user;
    v_counts := v_counts || jsonb_build_object(''agent_documents_retained'', n);
    update public.payout_accounts set recipient_code = null
     where agent_id in (select id from public.agents where user_id = v_user);
  else
    if v_money_keep then
      update public.payout_accounts set recipient_code = null
       where agent_id in (select id from public.agents where user_id = v_user);
    else
      delete from public.payout_accounts
       where agent_id in (select id from public.agents where user_id = v_user);
    end if;
'],
    -- 5. the ledger keeps who was paid; contact data still goes
    array['     set metadata = we.metadata - ''email'' - ''name'' - ''phone'' - ''customer_email''
                    - ''account_name'' - ''account_number'' - ''guest_name''
',
          '     set metadata = we.metadata - ''email'' - ''phone'' - ''customer_email''
                    - ''guest_name''
'],
    -- 6. the retention date, and the count
    array['     set counts = v_counts, restore_code_hash = null
',
          '     set counts = v_counts || jsonb_build_object(''money_retained'', v_money_keep),
         restore_code_hash = null,
         money_retain_until = case when v_money_keep then now() + interval ''5 years''
                                   else money_retain_until end
']
  ];
  i int;
  hits int;
begin
  select pg_get_functiondef(p.oid) into body
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'purge_account_rows';
  if body is null then raise exception 'AML-11: public.purge_account_rows not found'; end if;
  for i in 1 .. array_length(edits, 1) loop
    hits := (length(body) - length(replace(body, edits[i][1], ''))) / length(edits[i][1]);
    if hits <> 1 then
      raise exception 'AML-11: edit % matches % times in purge_account_rows (expected 1)', i, hits;
    end if;
    body := replace(body, edits[i][1], edits[i][2]);
  end loop;
  -- The approved-agent retention stamps kyc_retain_until with now(), the same
  -- transaction timestamp as money_retain_until, so the two dates are equal.
  if position('kyc_retain_until = now() + interval ''5 years''' in body) = 0 then
    raise exception 'AML-11: the approved-agent retention is not stamped as expected';
  end if;
  execute body;
end
$migrate$;

create or replace function public.destroy_expired_money_records(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r         record;
  n_bank    integer;
  n_payout  integer;
  n_entries integer;
  done      integer := 0;
begin
  for r in
    select d.id, d.user_id
      from public.account_deletion_requests d
     where d.status = 'PURGED'
       and d.money_retain_until is not null
       and d.money_retain_until <= now()
     order by d.money_retain_until
     limit greatest(1, least(coalesce(p_limit, 50), 500))
       for update skip locked
  loop
    delete from public.bank_accounts where user_id = r.user_id;
    get diagnostics n_bank = row_count;
    -- An approved agent's payout details end with their identification
    -- (destroy_expired_kyc), never before it.
    if exists (select 1 from public.agent_applications a
                where a.user_id = r.user_id and a.kyc_retain_until is not null and a.kyc_retain_until > now()) then
      n_payout := 0;
    else
      delete from public.payout_accounts
       where agent_id in (select ag.id from public.agents ag where ag.user_id = r.user_id);
      get diagnostics n_payout = row_count;
    end if;
    update public.wallet_entries we
       set metadata = we.metadata - 'name' - 'account_name' - 'account_number'
      from public.wallets w
     where w.id = we.wallet_id and w.user_id = r.user_id
       and we.metadata ?| array['name', 'account_name', 'account_number'];
    get diagnostics n_entries = row_count;
    update public.account_deletion_requests set money_retain_until = null where id = r.id;
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'account.money_records.redacted', 'user', r.user_id::text,
            jsonb_build_object('bank_accounts', n_bank, 'payout_accounts', n_payout,
                               'wallet_entries', n_entries));
    done := done + 1;
  end loop;
  return jsonb_build_object('redacted', done);
end;
$$;
revoke all on function public.destroy_expired_money_records(integer) from public, anon, authenticated;
grant execute on function public.destroy_expired_money_records(integer) to service_role;
