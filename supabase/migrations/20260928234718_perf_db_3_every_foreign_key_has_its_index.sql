/*
 * PERF-DB 3. EVERY FOREIGN KEY OUTSIDE THE MONEY TABLES HAS A COVERING INDEX,
 * AND messages LOSES ITS SECOND COPY OF THE SAME INDEX.
 *
 * WHY. The performance advisor lists 49 foreign keys with no index whose
 * leading columns match them (listings.assigned_agent_id,
 * listings.closed_rent_payment_id, conversations.routed_agent_id,
 * inspection_requests.window_id, brief_answers.*, briefs.*, ...). Without
 * one, every delete or key update on the referenced row scans the whole
 * referencing table to enforce the constraint, and a join on that column
 * cannot use an index. The tables are small today, which is exactly when the
 * index is cheap to build.
 *
 * `messages` carries two identical btree indexes on (conversation_id,
 * created_at): `messages_conversation_idx` (engagement, July) and
 * `messages_conversation_created_idx` (V-34). Every message insert pays for
 * both. The newer one goes; the original stays.
 *
 * SCOPE. Additive indexes only (plus the one duplicate drop). No policy,
 * grant, function or data changes. The money tables (wallet, escrow, custody,
 * ledger, transactions, payouts, rent payments, refunds, guarantees, deal
 * agreements, money policy) are left alone on purpose.
 *
 * READ-BACK. The DO block raises, and the migration rolls back, unless no
 * in-scope foreign key is left without a covering index and the duplicate is
 * gone while its twin remains.
 */
do $mig$
declare
  excluded constant text[] := array[
    'account_money_holds','bank_accounts','booking_refunds','ledger_entries',
    'payment_methods','payout_accounts','rent_payments','rent_refunds_owed',
    'transactions','guarantee_claims','guarantee_reserve_entries',
    'deal_agreements','deal_agreement_events','money_policy'];
  r record;
  idx text;
  made int := 0;
  bad int;
begin
  for r in
    with fk as (
      select c.oid, c.conrelid, c.conkey, n.nspname, t.relname,
             array_agg(a.attname order by k.ord) cols
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        cross join lateral unnest(c.conkey) with ordinality k(attnum, ord)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
       where c.contype = 'f' and n.nspname in ('public', 'private')
       group by 1, 2, 3, 4, 5
    )
    select fk.* from fk
     where fk.relname <> all (excluded)
       and fk.relname !~ '(wallet|escrow|custody)'
       and not exists (
         select 1 from pg_index i
          where i.indrelid = fk.conrelid
            and (i.indkey::int2[])[0:cardinality(fk.conkey) - 1] @> fk.conkey
            and (i.indkey::int2[])[0:cardinality(fk.conkey) - 1] <@ fk.conkey)
     order by fk.nspname, fk.relname
  loop
    idx := left(r.relname || '_' || array_to_string(r.cols, '_'), 58) || '_fkix';
    execute format('create index if not exists %I on %I.%I (%s)',
                   idx, r.nspname, r.relname,
                   (select string_agg(format('%I', c), ', ') from unnest(r.cols) c));
    made := made + 1;
  end loop;

  drop index if exists public.messages_conversation_created_idx;

  /* Read-back. */
  select count(*) into bad
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where c.contype = 'f' and n.nspname in ('public', 'private')
     and t.relname <> all (excluded) and t.relname !~ '(wallet|escrow|custody)'
     and not exists (
       select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey
          and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] <@ c.conkey);
  if bad <> 0 then
    raise exception 'PERF-DB 3: % in-scope foreign keys still have no covering index', bad;
  end if;
  if to_regclass('public.messages_conversation_created_idx') is not null
     or to_regclass('public.messages_conversation_idx') is null then
    raise exception 'PERF-DB 3: the messages index pair is not in the intended state';
  end if;

  raise notice 'PERF-DB 3: % covering indexes created; duplicate messages index dropped', made;
end
$mig$;
