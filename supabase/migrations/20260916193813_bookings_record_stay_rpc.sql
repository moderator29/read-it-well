-- SUPERSEDED BY 20260916194150_bookings_lifecycle_trail_revert_to_state_events.sql.
-- Kept so the folder replays to the database that is actually running. The
-- transition lives in a server action beside acceptBooking and declineBooking,
-- not in an RPC; the reason is written in the revert.
create or replace function private.is_listing_agent(check_user_id uuid, check_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.listings l
    join public.agents   a on a.id = l.agent_id
    where l.id = check_listing_id
      and a.user_id = check_user_id
  );
$function$;

create or replace function private.stamp_booking_transition()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.status is distinct from old.status then
    if new.status = 'CONFIRMED' and new.confirmed_at is null then
      new.confirmed_at := now();
    end if;
    if new.status = 'CANCELLED' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists bookings_stamp_transition on public.bookings;
create trigger bookings_stamp_transition
  before update on public.bookings
  for each row execute function private.stamp_booking_transition();

create or replace function public.record_booking_stay(
  booking_id uuid,
  outcome    public.booking_status,
  note       text default null
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
  if outcome not in ('COMPLETED', 'NO_SHOW') then
    raise exception 'An outcome is COMPLETED or NO_SHOW.' using errcode = '22023';
  end if;
  select * into bk from public.bookings where id = booking_id for update;
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
  if outcome = 'COMPLETED' and bk.check_out > today then
    raise exception 'This stay has not ended yet.' using errcode = '22023';
  end if;
  if outcome = 'NO_SHOW' and bk.check_in > today then
    raise exception 'Arrival day has not come yet.' using errcode = '22023';
  end if;
  update public.bookings
     set status           = outcome,
         stay_recorded_at = now(),
         stay_recorded_by = actor,
         stay_note        = nullif(btrim(note), '')
   where id = booking_id
   returning * into bk;
  return bk;
end;
$function$;

revoke all on function public.record_booking_stay(uuid, public.booking_status, text) from public;
grant execute on function public.record_booking_stay(uuid, public.booking_status, text) to authenticated;
