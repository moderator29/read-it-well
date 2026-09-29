-- MON-10 / DB-06 (ESC-18): the money tables are written only through SECURITY
-- DEFINER functions, so the API roles must hold no write privilege on them at
-- all. RLS (SELECT-only policies) is then a second wall, not the only one.
--
-- Checked two ways, because either alone can be fooled:
--   1. the catalogue, with has_table_privilege / has_any_column_privilege
--      evaluated FOR the role (never information_schema, which answers about
--      the observer);
--   2. behaviour: as each role, a write that touches no row (`where false`).
--      Table privileges are checked before any row is looked at, so a
--      remaining grant shows up as "no error" and a revoked one as 42501.
-- Control: a signed-in member can still read their own transactions, and the
-- three client-written money-adjacent tables keep exactly the narrow writes
-- their screens use: payment_methods UPDATE (choose the default card),
-- payout_accounts UPDATE/DELETE (default and remove) and refund_requests
-- INSERT (a guest asks; a decision is the server's).
--
-- 29 September 2026: rewritten after custody was retired (Track A). The
-- wallet, wallet_entries, escrows and wallet_pots are gone and must stay gone
-- (track-a-custody-retired.sql). Besides a named core that must exist, every
-- public table whose name reads as money is swept by pattern, so a money
-- table added later is held to the rule without anybody editing this list.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  core constant text[] := array[
    'ledger_entries', 'transactions', 'rent_payments', 'platform_revenue', 'fee_rates',
    'audit_log', 'booking_refunds', 'deal_agreements', 'deal_agreement_events',
    'guarantee_claims', 'guarantee_reserve_entries', 'rent_payment_contributors'];
  pattern constant text := '(transaction|payment|refund|revenue|fee_rate|ledger|guarantee|claim|settle|split|payout|commission|receipt|audit_log|charge|agreement|threshold|quote|caution|crypto)';
  -- The only client writes on a money-named table, each behind a policy.
  allowed constant text[] := array['payment_methods:UPDATE', 'payout_accounts:UPDATE', 'payout_accounts:DELETE', 'refund_requests:INSERT'];
  money text[];
  t text;
  r text;
  priv text;
  bad text := '';
  n bigint;
begin
  foreach t in array core loop
    if to_regclass('public.' || t) is null then
      raise exception 'PROBE_FAIL mon-10-money-grants: public.% no longer exists; update the list', t;
    end if;
  end loop;
  select array_agg(c.relname order by c.relname) into money
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind in ('r', 'p') and c.relname ~ pattern;
  if not (money @> core) then
    raise exception 'PROBE_FAIL mon-10-money-grants: harness broken, the pattern does not reach every core table';
  end if;

  foreach t in array money loop
    foreach r in array array['anon', 'authenticated'] loop
      foreach priv in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
        if (has_table_privilege(r, ('public.' || t)::regclass, priv)
            or (priv in ('INSERT', 'UPDATE') and has_any_column_privilege(r, ('public.' || t)::regclass, priv)))
           and not (r = 'authenticated' and (t || ':' || priv) = any (allowed)) then
          bad := bad || format(' [%s holds %s on %s]', r, priv, t);
        end if;
      end loop;
    end loop;
  end loop;
  foreach t in array allowed loop
    if not (has_table_privilege('authenticated', ('public.' || split_part(t, ':', 1))::regclass, split_part(t, ':', 2))
            or has_any_column_privilege('authenticated', ('public.' || split_part(t, ':', 1))::regclass, split_part(t, ':', 2))) then
      raise exception 'PROBE_FAIL mon-10-money-grants: control, authenticated lost % (a screen writes it)', t;
    end if;
  end loop;

  -- Behaviour, as a signed-in member.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    select count(*) into n from public.transactions;
  exception when others then
    raise exception 'PROBE_FAIL mon-10-money-grants: control, member cannot read transactions (% %)', sqlstate, sqlerrm;
  end;
  foreach t in array core loop
    begin
      execute format('delete from public.%I where false', t);
      bad := bad || format(' [authenticated DELETE on %s was not refused]', t);
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('update public.%I set %I = %I where false', t,
        (select attname from pg_attribute where attrelid = ('public.' || t)::regclass and attnum > 0 and not attisdropped order by attnum limit 1),
        (select attname from pg_attribute where attrelid = ('public.' || t)::regclass and attnum > 0 and not attisdropped order by attnum limit 1));
      bad := bad || format(' [authenticated UPDATE on %s was not refused]', t);
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- Behaviour, signed out.
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  foreach t in array core loop
    begin
      execute format('delete from public.%I where false', t);
      bad := bad || format(' [anon DELETE on %s was not refused]', t);
    exception when insufficient_privilege then null;
    end;
  end loop;

  if bad <> '' then
    raise exception 'PROBE_FAIL mon-10-money-grants: API roles can write money tables directly:%', bad;
  end if;
  raise exception 'PROBE_OK mon-10-money-grants: anon and authenticated hold no write on % money tables beyond the four named client writes', array_length(money, 1);
end;
$$;
