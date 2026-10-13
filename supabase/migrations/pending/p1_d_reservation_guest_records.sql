-- DRAFT, not applied. Batch 1, RESTAURANT-06.
-- The venue sees, on each request, how many past tables this diner kept and
-- missed in the last 12 months, across Vallo. Counts only: no venue names,
-- no dates, no other diner data. The OpenTable pattern of flagging a likely
-- no-show early, adapted: the venue decides, Vallo never blocks the diner.
-- Only rows the caller hosts come back; anything else is skipped silently.
set lock_timeout = '5s';

create or replace function public.reservation_guest_records(p_reservations uuid[])
 returns table (reservation_id uuid, kept integer, missed integer)
 language plpgsql
 stable
 security definer
 set search_path to ''
as $fn$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'sign in' using errcode = '42501';
  end if;
  if p_reservations is null or cardinality(p_reservations) = 0 then
    return;
  end if;
  if cardinality(p_reservations) > 200 then
    raise exception 'at most 200 reservations at once' using errcode = '22023';
  end if;

  return query
  with mine as (
    select r.id, r.guest_id
      from public.reservations r
     where r.id = any (p_reservations)
       and ((r.business_id is not null and private.owns_business(r.business_id))
            or (r.listing_id is not null and exists (
                  select 1 from public.listings l
                   where l.id = r.listing_id and private.listing_agent_is_me(l.agent_id))))
  )
  select m.id,
         (count(h.id) filter (where h.status = 'COMPLETED'))::integer,
         (count(h.id) filter (where h.status = 'NO_SHOW'))::integer
    from mine m
    left join public.reservations h
      on h.guest_id = m.guest_id
     and h.id <> m.id
     and h.reserved_for > now() - interval '365 days'
     and h.reserved_for < now()
   group by m.id;
end;
$fn$;

revoke all on function public.reservation_guest_records(uuid[]) from public, anon;
grant execute on function public.reservation_guest_records(uuid[]) to authenticated;
