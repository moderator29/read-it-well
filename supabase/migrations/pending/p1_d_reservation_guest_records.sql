-- DRAFT, not applied. Batch 1, RESTAURANT-06.
-- The venue sees, on each request, how many past tables this diner kept and
-- missed in the last 12 months, across Vallo. Counts only: no venue names,
-- no dates, no other diner data. The OpenTable pattern of flagging a likely
-- no-show early, adapted: the venue decides, Vallo never blocks the diner.
-- Only rows the caller hosts come back; anything else is skipped silently.
-- Founder ruling (13 October 2026): counts only, last 12 months, no venue
-- names, nothing for a first-time diner (the app shows no line at 0 and 0).
--
-- Reviewed against the live definitions on 13 October 2026 (track/restaurant-desk):
--   * "Mine to host" is private.reservation_is_mine_to_host, the same helper
--     reservation_record_outcome and reservation_seat_by_code use, rather than
--     a second copy of its rule. It also refuses a host's own table as a guest.
--   * Kept is status COMPLETED and missed is status NO_SHOW. Those are what
--     private.settle_seating writes for every way a table ends (code, the
--     venue's mark, the diner's answer, a paid bill, staff).
--   * A table whose outcome is under an open dispute (the venue and the diner
--     disagree, reservation_seatings.disputed_at set and not yet resolved)
--     counts as neither until staff resolve it: one side's word is not a
--     record held against the diner.
--   * "Last 12 months" is interval '12 months', not 365 days.
--
-- Probe: supabase/tests/probes-pending/p1_d_reservation_guest_records.sql.
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
       and private.reservation_is_mine_to_host(r.id)
  )
  select m.id,
         (count(h.id) filter (where h.status = 'COMPLETED'))::integer,
         (count(h.id) filter (where h.status = 'NO_SHOW'))::integer
    from mine m
    left join public.reservations h
      on h.guest_id = m.guest_id
     and h.id <> m.id
     and h.status in ('COMPLETED', 'NO_SHOW')
     and h.reserved_for > now() - interval '12 months'
     and h.reserved_for < now()
     and not exists (
           select 1 from public.reservation_seatings s
            where s.reservation_id = h.id
              and s.disputed_at is not null
              and s.dispute_resolved_at is null)
   group by m.id;
end;
$fn$;

revoke all on function public.reservation_guest_records(uuid[]) from public, anon;
grant execute on function public.reservation_guest_records(uuid[]) to authenticated;
