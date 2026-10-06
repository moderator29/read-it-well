-- D48 step 2: every member with a `wallet` notification preference has a
-- `payments` preference too, the old key is kept, and the copy is the same
-- choice for every member whose `payments` was carried across. Run after
-- b4_d48_payments_notification_preference.sql is applied. Rolls back.
do $$
declare missing int; differ int;
begin
  select count(*) into missing from public.profiles
   where jsonb_typeof(settings -> 'notifications') = 'object'
     and (settings -> 'notifications') ? 'wallet'
     and not (settings -> 'notifications') ? 'payments';
  if missing > 0 then
    raise exception 'PROBE_FAIL b4-d48-payments-pref: % members have wallet but no payments preference', missing;
  end if;

  select count(*) into differ from public.profiles
   where (settings -> 'notifications') ? 'wallet'
     and (settings -> 'notifications') ? 'payments'
     and settings -> 'notifications' -> 'wallet' is distinct from settings -> 'notifications' -> 'payments';
  if differ > 0 then
    raise notice 'b4-d48-payments-pref: % members now hold different wallet and payments choices (a later toggle of payments)', differ;
  end if;

  raise exception 'PROBE_OK b4-d48-payments-pref';
end $$;
