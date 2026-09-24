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
-- Control: a signed-in member can still read their own wallet rows, and the
-- one client-written money table (wallet_pots) keeps the authenticated
-- INSERT/UPDATE its pot screens use.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  money constant text[] := array[
    'ledger_entries', 'wallet_entries', 'wallets', 'transactions', 'rent_payments',
    'escrows', 'platform_revenue', 'fee_rates', 'audit_log', 'booking_refunds'];
  t text;
  r text;
  priv text;
  bad text := '';
  n bigint;
begin
  foreach t in array money loop
    if to_regclass('public.' || t) is null then
      raise exception 'PROBE_FAIL mon-10-money-grants: public.% no longer exists; update the list', t;
    end if;
    foreach r in array array['anon', 'authenticated'] loop
      foreach priv in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
        if has_table_privilege(r, ('public.' || t)::regclass, priv) then
          bad := bad || format(' [%s holds %s on %s]', r, priv, t);
        end if;
      end loop;
      if has_any_column_privilege(r, ('public.' || t)::regclass, 'INSERT, UPDATE') then
        bad := bad || format(' [%s holds a column INSERT/UPDATE on %s]', r, t);
      end if;
    end loop;
  end loop;
  if has_table_privilege('anon', 'public.wallet_pots'::regclass, 'INSERT, UPDATE, DELETE') then
    bad := bad || ' [anon holds a write on wallet_pots]';
  end if;
  if not has_table_privilege('authenticated', 'public.wallet_pots'::regclass, 'INSERT')
     or not has_table_privilege('authenticated', 'public.wallet_pots'::regclass, 'UPDATE') then
    raise exception 'PROBE_FAIL mon-10-money-grants: control, authenticated lost INSERT/UPDATE on wallet_pots (the pot screens write it)';
  end if;

  -- Behaviour, as a signed-in member.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    select count(*) into n from public.wallets where user_id = member;
  exception when others then
    raise exception 'PROBE_FAIL mon-10-money-grants: control, member cannot read own wallets (% %)', sqlstate, sqlerrm;
  end;
  foreach t in array money loop
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
  foreach t in array money loop
    begin
      execute format('delete from public.%I where false', t);
      bad := bad || format(' [anon DELETE on %s was not refused]', t);
    exception when insufficient_privilege then null;
    end;
  end loop;

  if bad <> '' then
    raise exception 'PROBE_FAIL mon-10-money-grants: API roles can write money tables directly:%', bad;
  end if;
  raise exception 'PROBE_OK mon-10-money-grants: anon and authenticated hold no write on % money tables; wallet_pots keeps its client writes', array_length(money, 1);
end;
$$;
