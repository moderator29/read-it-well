-- SUP-12: a night the host closed stays closed when a stay's nights are written and released.
-- Runs against the live schema; everything it writes is rolled back by the final raise.
do $$
declare
  lid uuid;
  s text;
begin
  select id into lid from public.listings order by created_at limit 1;
  insert into public.availability (listing_id, date, status) values
    (lid, '2099-01-01', 'unavailable'), (lid, '2099-01-03', 'unavailable');
  -- the writers' upsert
  insert into public.availability (listing_id, date, status)
  select lid, d::date, 'booked' from generate_series('2099-01-01'::timestamp, '2099-01-02'::timestamp, interval '1 day') d
  on conflict (listing_id, date) do update set status = 'booked';
  select status::text into s from public.availability where listing_id = lid and date = '2099-01-01';
  if s <> 'unavailable' then raise exception 'PROBE_FAIL sup-12: a closed night was overwritten to %', s; end if;
  select status::text into s from public.availability where listing_id = lid and date = '2099-01-02';
  if s <> 'booked' then raise exception 'PROBE_FAIL sup-12: an open night was not booked (%)', s; end if;
  -- the release deletes only booked rows, so the closure survives a cancellation
  delete from public.availability where listing_id = lid and status = 'booked' and date >= '2099-01-01' and date < '2099-01-03';
  if not exists (select 1 from public.availability where listing_id = lid and date = '2099-01-01' and status = 'unavailable') then
    raise exception 'PROBE_FAIL sup-12: the closure was lost at release';
  end if;
  -- the host can still reopen a night
  update public.availability set status = 'available' where listing_id = lid and date = '2099-01-03';
  select status::text into s from public.availability where listing_id = lid and date = '2099-01-03';
  if s <> 'available' then raise exception 'PROBE_FAIL sup-12: the host could not reopen a night (%)', s; end if;
  raise exception 'PROBE_OK sup-12';
end $$;
