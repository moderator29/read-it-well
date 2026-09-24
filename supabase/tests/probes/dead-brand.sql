-- THE DEAD BRAND: no public-facing row may carry the dead working name. The
-- example collection is listed as "Vallo Examples"; system posts say Vallo.
-- Read as anon (what a stranger's page would read) and as the owner (the
-- rows behind the cards). Rolls back always.
do $$
declare
  n int;
begin
  select count(*) into n from public.agents where display_name ilike '%rentme%';
  if n > 0 then raise exception 'PROBE_FAIL dead-brand: % agents still named RentMe', n; end if;
  select count(*) into n from public.profiles where display_name ilike '%rentme%';
  if n > 0 then raise exception 'PROBE_FAIL dead-brand: % profiles still named RentMe', n; end if;
  select count(*) into n from public.social_profiles where display_label ilike '%rentme%';
  if n > 0 then raise exception 'PROBE_FAIL dead-brand: % public identities still named RentMe', n; end if;
  select count(*) into n from public.posts where author_kind = 'SYSTEM' and body ilike '%rentme%';
  if n > 0 then raise exception 'PROBE_FAIL dead-brand: % system posts still say RentMe', n; end if;

  -- CONTROL: the example collection exists and is named for Vallo.
  select count(*) into n from public.agents where is_demo and display_name = 'Vallo Examples';
  if n < 1 then raise exception 'PROBE_FAIL dead-brand: no example agent named Vallo Examples'; end if;

  set local role anon;
  select count(*) into n from public.social_profiles where display_label ilike '%rentme%';
  if n > 0 then raise exception 'PROBE_FAIL dead-brand: anon still reads RentMe on % identities', n; end if;
  reset role;

  raise exception 'PROBE_OK dead-brand';
end $$;
