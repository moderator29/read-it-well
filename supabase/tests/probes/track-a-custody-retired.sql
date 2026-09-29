-- TRACK-A: Vallo never holds customer money (25 September 2026,
-- docs/MONEY_ARCHITECTURE.md), and custody cannot come back quietly.
--   1. No table, view or function in public or private looks like custody
--      machinery (the same name rule the event trigger applies).
--   2. The event trigger that refuses creating one is installed and enabled,
--      and does refuse: creating public.wallets is answered custody_retired.
--   3. No custody switch can be turned on, by any role, the owner included;
--      a switch that is not custody still can be (control).
-- Replaces nine probes of the retired system (supabase/tests/retired/). Rolls back.
do $$
declare
  found text;
  refused boolean;
begin
  select string_agg(ns.nspname || '.' || c.relname, ', ') into found
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname in ('public', 'private') and c.relkind in ('r', 'v', 'm', 'p')
     and (lower(c.relname) ~ '(^|_)(wallets?|escrows?|pots?)(_|$)' or lower(c.relname) ~ '^held_payment');
  if found is not null then raise exception 'PROBE_FAIL track-a-custody-retired: custody relations exist: %', found; end if;

  select string_agg(distinct ns.nspname || '.' || p.proname, ', ') into found
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname in ('public', 'private')
     and (lower(p.proname) ~ '(^|_)(wallets?|escrows?|pots?)(_|$)' or lower(p.proname) ~ '^held_payment');
  if found is not null then raise exception 'PROBE_FAIL track-a-custody-retired: custody functions exist: %', found; end if;

  if not exists (select 1 from pg_event_trigger
                  where evtname = 'retired_custody_stays_retired' and evtenabled <> 'D'
                    and evtfoid = 'private.refuse_custody_objects'::regproc) then
    raise exception 'PROBE_FAIL track-a-custody-retired: the event trigger refusing custody objects is missing or disabled';
  end if;
  refused := false;
  begin
    create table public.wallets (id int);
  exception when insufficient_privilege then
    refused := sqlerrm like 'custody_retired%';
  end;
  if not refused then raise exception 'PROBE_FAIL track-a-custody-retired: a custody table could be created'; end if;

  foreach found in array array['wallet', 'wallet_pots', 'held_payments', 'held_payments_payouts'] loop
    refused := false;
    begin
      insert into public.feature_flags (key, enabled) values (found, true)
      on conflict (key) do update set enabled = true;
    exception when insufficient_privilege then
      refused := sqlerrm like 'custody_retired%';
    end;
    if not refused then raise exception 'PROBE_FAIL track-a-custody-retired: the % switch could be turned on', found; end if;
  end loop;

  -- Control: an ordinary switch still turns on.
  insert into public.feature_flags (key, enabled) values ('probe_track_a_control', true)
  on conflict (key) do update set enabled = true;

  raise exception 'PROBE_OK track-a-custody-retired';
end
$$;
