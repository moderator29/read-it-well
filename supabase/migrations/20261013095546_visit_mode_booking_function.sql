set lock_timeout = '5s';

-- --------------------------------------------------------------------- 1
-- A NEW name, not a new overload: a fourth argument on book_viewing_slot would
-- need the three-argument version dropped first (two overloads with defaults
-- make calls ambiguous), and the connector cannot run DROP. So the mode-aware
-- booking is book_viewing_slot_mode, and the three-argument book_viewing_slot
-- now passes through to it as an in-person booking: one rule, two doors.
create or replace function public.book_viewing_slot_mode(
  p_listing uuid,
  p_slot timestamptz,
  p_note text default null,
  p_mode text default 'in_person'
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  caller uuid := (select auth.uid());
  owner_id uuid;
  chosen record;
  booked uuid;
begin
  if caller is null then
    raise exception 'sign in to book' using errcode = '42501';
  end if;
  if p_note is not null and length(p_note) > 400 then
    raise exception 'keep the note under 400 characters' using errcode = '22023';
  end if;
  -- visit_mode: one of the column's two values, and video only while calls are on.
  if p_mode is null or p_mode not in ('in_person', 'video') then
    raise exception 'unknown visit mode' using errcode = '22023', hint = 'viewing_mode_unknown';
  end if;
  if p_mode = 'video' and not private.call_flag_on('video_calls') then
    raise exception 'video visits are not available' using errcode = 'P0001', hint = 'viewing_video_off';
  end if;

  select a.user_id into owner_id
    from public.listings l join public.agents a on a.id = l.agent_id
   where l.id = p_listing;
  if owner_id is null then
    raise exception 'that slot is not free' using errcode = 'P0001', hint = 'viewing_slot_taken';
  end if;
  if owner_id = caller then
    raise exception 'this is your own home' using errcode = 'P0001', hint = 'viewing_own_home';
  end if;

  perform pg_advisory_xact_lock(hashtext('viewing_slot:' || owner_id::text));

  if exists (
    select 1 from public.inspection_requests ir
     where ir.listing_id = p_listing and ir.requester_id = caller
       and ir.state in ('REQUESTED', 'PROPOSED', 'CONFIRMED')
  ) then
    raise exception 'you already have a viewing for this home' using errcode = 'P0001', hint = 'viewing_already_booked';
  end if;

  select s.slot_at, s.window_id into chosen
    from private.free_viewing_slots(p_listing, 30, caller) s
   where s.slot_at = p_slot;
  if not found then
    raise exception 'that slot is not free' using errcode = 'P0001', hint = 'viewing_slot_taken';
  end if;

  insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at, responded_at, window_id, note, visit_mode)
  values (p_listing, caller, owner_id, 'CONFIRMED', chosen.slot_at, chosen.slot_at, now(), chosen.window_id, nullif(btrim(p_note), ''), p_mode)
  returning id into booked;
  return booked;
end;
$fn$;

revoke all on function public.book_viewing_slot_mode(uuid, timestamptz, text, text) from public, anon;
grant execute on function public.book_viewing_slot_mode(uuid, timestamptz, text, text) to authenticated, service_role;

comment on function public.book_viewing_slot_mode(uuid, timestamptz, text, text) is
  'V-94. Books a free slot as a CONFIRMED inspection for the caller, under a per-lister advisory lock taken before the free-slot check. Refuses the lister''s own home (viewing_own_home), a slot that is not free (viewing_slot_taken) and a second open viewing of the same home (viewing_already_booked). p_mode is inspection_requests.visit_mode (in_person or video; video only while video_calls is on).';

create or replace function public.book_viewing_slot(
  p_listing uuid,
  p_slot timestamptz,
  p_note text default null
)
returns uuid
language sql
security definer
set search_path to ''
as $fn$
  select public.book_viewing_slot_mode(p_listing, p_slot, p_note, 'in_person');
$fn$;
