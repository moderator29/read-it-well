-- RT01 (pending migration rt01_remove_retired_objects.sql): every retired
-- object Part A removes is gone, and the live objects that replaced them, or
-- that sit next to them, are still there and still reachable by the roles that
-- use them. The control reads public.listing_lister as anon, which must work.
-- Read only; the final raise rolls everything back.
do $$
declare
  n integer;
begin
  -- CONTROL: the public listing projection still answers a signed-out caller.
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.listing_lister;
  if n is null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects control: listing_lister did not answer anon';
  end if;
  reset role;

  -- 1. The retired functions are gone.
  if to_regprocedure('private.room_type_is_public(uuid)') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.room_type_is_public is still present';
  end if;
  if to_regprocedure('private.accommodation_is_public(uuid)') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.accommodation_is_public is still present';
  end if;
  if to_regprocedure('private.business_is_public(uuid)') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.business_is_public is still present';
  end if;
  if to_regprocedure('private.area_visible(uuid)') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.area_visible is still present';
  end if;
  if to_regprocedure('private.is_area_moderator(uuid, uuid)') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.is_area_moderator is still present';
  end if;
  if to_regprocedure('private.bot_spend_this_month()') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.bot_spend_this_month is still present';
  end if;
  if to_regprocedure('private.prune_read_notifications(integer)') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.prune_read_notifications is still present';
  end if;
  if to_regprocedure('private.touch_places_cache()') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.touch_places_cache is still present';
  end if;
  if to_regprocedure('private.referral_cap_reason(uuid)') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: private.referral_cap_reason is still present';
  end if;
  if to_regprocedure('public.listing_review_stats(uuid[])') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: public.listing_review_stats is still present';
  end if;
  if to_regprocedure('public.closed_listing_count()') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: public.closed_listing_count is still present';
  end if;
  if to_regprocedure('public.closed_listing_reasons(uuid[])') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: public.closed_listing_reasons is still present';
  end if;
  if to_regprocedure('public.listing_truth_for_lister(uuid)') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 1: public.listing_truth_for_lister is still present';
  end if;

  -- 2. The retired view and tables are gone.
  if to_regclass('public.listing_lister_tier') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 2: public.listing_lister_tier is still present';
  end if;
  if to_regclass('private.platform_settings') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 2: private.platform_settings is still present';
  end if;
  if to_regclass('private.platform_switches') is not null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 2: private.platform_switches is still present';
  end if;

  -- 3. The live replacements and neighbours are still there, with their grants.
  if to_regprocedure('private.public_accommodation_ids()') is null
     or to_regprocedure('private.public_business_ids()') is null
     or to_regprocedure('private.public_room_type_ids()') is null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 3: a public_*_ids set function is missing';
  end if;
  if not has_function_privilege('anon', 'private.public_business_ids()', 'execute') then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 3: anon lost EXECUTE on private.public_business_ids';
  end if;
  if to_regprocedure('private.is_area_member(uuid, uuid)') is null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 3: private.is_area_member is missing';
  end if;
  if to_regprocedure('public.book_viewing_slot(uuid, timestamp with time zone, text)') is null
     or to_regprocedure('public.book_viewing_slot_mode(uuid, timestamp with time zone, text, text)') is null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 3: a viewing booking function is missing';
  end if;
  if not has_function_privilege('authenticated', 'public.book_viewing_slot(uuid, timestamp with time zone, text)', 'execute') then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 3: authenticated lost EXECUTE on book_viewing_slot';
  end if;
  if to_regclass('public.listing_lister') is null or to_regclass('public.listing_truth_summary') is null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 3: a public listing view is missing';
  end if;
  if not has_table_privilege('anon', 'public.listing_truth_summary', 'select') then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 3: anon lost SELECT on listing_truth_summary';
  end if;
  if to_regprocedure('public.purge_account_rows(uuid)') is null
     or to_regprocedure('public.admin_person_file(uuid)') is null
     or to_regprocedure('public.destroy_expired_money_records(integer)') is null then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 3: a money-records function is missing';
  end if;

  -- 4. Every cron job still calls a function that exists.
  select count(*) into n
    from cron.job j
   where not exists (
     select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
      where s.nspname in ('public', 'private')
        and j.command ~ ('\m' || s.nspname || '\.' || p.proname || '\M'));
  if n <> 0 then
    raise exception 'PROBE_FAIL rt01-remove-retired-objects 4: % cron job(s) call a function that does not exist', n;
  end if;

  raise exception 'PROBE_OK rt01-remove-retired-objects';
end
$$;
