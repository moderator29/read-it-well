-- SUPERSEDED BY 20260916194150_bookings_lifecycle_trail_revert_to_state_events.sql,
-- which drops this function entirely. Kept so the folder replays to the database
-- that is actually running.
--
-- Two corrections to the function as first applied. ONE: `revoke all from public`
-- does not reach `anon`, because Supabase's default privileges grant EXECUTE on
-- new functions to `anon` and `authenticated` directly. This repository has hit
-- that exact trap before: see 20260809094339_revoking_from_public_does_not_revoke_from_anon.
-- TWO: every other RPC here names its arguments p_something, and one function
-- spelling them differently is a thing that makes the next reader check twice.
drop function if exists public.record_booking_stay(uuid, public.booking_status, text);

create or replace function public.record_booking_stay(
  p_booking uuid,
  p_outcome public.booking_status,
  p_note    text default null
)
returns public.bookings
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := auth.uid();
  bk    public.bookings;
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if actor is null then
    raise exception 'Sign in to record a stay.' using errcode = '28000';
  end if;
  if p_outcome not in ('COMPLETED', 'NO_SHOW') then
    raise exception 'An outcome is COMPLETED or NO_SHOW.' using errcode = '22023';
  end if;
  select * into bk from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'That booking no longer exists.' using errcode = 'P0002';
  end if;
  if not (
    private.is_listing_agent(actor, bk.listing_id)
    or private.has_role(actor, 'admin')
    or private.has_role(actor, 'super_admin')
  ) then
    raise exception 'That booking is not yours to record.' using errcode = '42501';
  end if;
  if bk.status <> 'CONFIRMED' then
    raise exception 'Only a confirmed booking can be recorded, and this one is %.', bk.status
      using errcode = '22023';
  end if;
  if p_outcome = 'COMPLETED' and bk.check_out > today then
    raise exception 'This stay has not ended yet.' using errcode = '22023';
  end if;
  if p_outcome = 'NO_SHOW' and bk.check_in > today then
    raise exception 'Arrival day has not come yet.' using errcode = '22023';
  end if;
  update public.bookings
     set status           = p_outcome,
         stay_recorded_at = now(),
         stay_recorded_by = actor,
         stay_note        = nullif(btrim(p_note), '')
   where id = p_booking
   returning * into bk;
  return bk;
end;
$function$;

revoke all on function public.record_booking_stay(uuid, public.booking_status, text) from public;
revoke all on function public.record_booking_stay(uuid, public.booking_status, text) from anon;
grant execute on function public.record_booking_stay(uuid, public.booking_status, text) to authenticated;
