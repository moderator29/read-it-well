-- V-94, REVIEW FIX: GROUP VIEWINGS STAY POSSIBLE, BOOKING IS SERIALISED PER
-- LISTER, EVERY VIEWING OVERLAPS BY ITS OWN LENGTH, AND A BOOKED SLOT IS NEWS.
--
-- 1. The partial unique index on confirmed (lister_id, slot_at) refused a
--    lister confirming two renters for the same time (a group viewing), and
--    its raw 23505 reached the confirm and accept actions. It is dropped.
--    Two renters racing for one slot are kept apart instead by a transaction
--    advisory lock on the lister, taken BEFORE the free-slot check and the
--    insert, so the second booking re-reads the slots after the first commits
--    and is refused with the usual hint.
-- 2. A slot was compared with an existing viewing using the CANDIDATE's
--    length, so a 60-minute viewing from one window hid only the first 20
--    minutes from a 20-minute window. Each viewing now counts for its own
--    window's slot length (read through window_id); a viewing arranged by
--    request, which has no window, counts for the candidate's length as
--    before.
-- 3. A viewing inserted already CONFIRMED sent "Inspection requested ...
--    Confirm, offer another time, or decline" to the lister and nothing to
--    the renter. private.notify_inspection_change gains an INSERT-as-CONFIRMED
--    branch (additive: every other branch is unchanged): the renter hears it
--    is confirmed, the lister hears it was booked.
-- 4. A lister booking their own home now gets its own refusal
--    (viewing_own_home), and viewing_slots offers the owner nothing.
-- 5. viewing_slots is rate limited per caller (120 reads in ten minutes); over
--    the limit it refuses with the hint rate_limited, which the page shows as
--    its failure state. The booking's own read does not count.

drop index if exists public.inspection_requests_one_confirmed_per_slot;

create or replace function private.free_viewing_slots(p_listing uuid, p_days integer, p_caller uuid)
returns table (slot_at timestamptz, slot_minutes smallint, window_id uuid)
language sql
stable
security definer
set search_path to ''
as $function$
  with target as (
    select l.id, a.user_id as lister_id
      from public.listings l join public.agents a on a.id = l.agent_id
     where l.id = p_listing
       and l.status = 'PUBLISHED'::public.listing_status
       and l.is_demo = false
       and p_caller is not null
       and a.user_id <> p_caller
  ),
  days as (
    select ((now() at time zone 'Africa/Lagos')::date + g) as day
      from generate_series(0, greatest(least(coalesce(p_days, 14), 30), 1) - 1) as g
  ),
  candidate as (
    select w.id as window_id, w.slot_minutes, t.lister_id,
           gs as slot_at
      from target t
      join public.viewing_windows w on w.lister_id = t.lister_id and w.active and t.id = any (w.listing_ids)
      join days d on extract(dow from d.day)::smallint = w.weekday
      cross join lateral generate_series(
        (d.day + w.starts) at time zone 'Africa/Lagos',
        (d.day + w.ends) at time zone 'Africa/Lagos' - make_interval(mins => w.slot_minutes),
        make_interval(mins => w.slot_minutes)) as gs
  )
  select c.slot_at, c.slot_minutes, c.window_id
    from candidate c
   where c.slot_at > now() + interval '1 hour'
     and not exists (
       select 1
         from public.inspection_requests ir
         left join public.viewing_windows own on own.id = ir.window_id
        where ir.lister_id = c.lister_id
          and ir.state in ('REQUESTED', 'PROPOSED', 'CONFIRMED')
          and coalesce(ir.slot_at, ir.requested_at) < c.slot_at + make_interval(mins => c.slot_minutes)
          and coalesce(ir.slot_at, ir.requested_at)
              + make_interval(mins => coalesce(own.slot_minutes, c.slot_minutes)) > c.slot_at)
   order by c.slot_at
   limit 200;
$function$;

revoke all on function private.free_viewing_slots(uuid, integer, uuid) from public, anon, authenticated;

create or replace function public.viewing_slots(p_listing uuid, p_days integer default 14)
returns table (slot_at timestamptz, slot_minutes smallint, window_id uuid)
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    return;
  end if;
  if not private.consume_rate_limit('viewing_slots', caller::text, 120, 600) then
    raise exception 'too many reads, try again shortly' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  return query select s.slot_at, s.slot_minutes, s.window_id
                 from private.free_viewing_slots(p_listing, p_days, caller) s;
end;
$function$;

comment on function public.viewing_slots(uuid, integer) is
  'V-94. The free viewing slots for one published, real listing over the next N days (1 to 30), from its lister''s windows, less every slot the lister is already committed to (each viewing counted for its own length) and every slot within the hour. Signed in, never the lister; 120 reads in ten minutes per caller. Times only.';

create or replace function public.book_viewing_slot(p_listing uuid, p_slot timestamptz, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
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

  select a.user_id into owner_id
    from public.listings l join public.agents a on a.id = l.agent_id
   where l.id = p_listing;
  if owner_id is null then
    raise exception 'that slot is not free' using errcode = 'P0001', hint = 'viewing_slot_taken';
  end if;
  if owner_id = caller then
    raise exception 'this is your own home' using errcode = 'P0001', hint = 'viewing_own_home';
  end if;

  /* One booking at a time per lister, before the check and the insert, so a
     second renter reads the slots only after the first booking commits. */
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

  insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at, responded_at, window_id, note)
  values (p_listing, caller, owner_id, 'CONFIRMED', chosen.slot_at, chosen.slot_at, now(), chosen.window_id, nullif(btrim(p_note), ''))
  returning id into booked;
  return booked;
end;
$function$;

comment on function public.book_viewing_slot(uuid, timestamptz, text) is
  'V-94. Books a free slot as a CONFIRMED inspection for the caller, under a per-lister advisory lock taken before the free-slot check. Refuses the lister''s own home (viewing_own_home), a slot that is not free (viewing_slot_taken) and a second open viewing of the same home (viewing_already_booked).';

revoke all on function public.viewing_slots(uuid, integer) from public, anon;
revoke all on function public.book_viewing_slot(uuid, timestamptz, text) from public, anon;
grant execute on function public.viewing_slots(uuid, integer) to authenticated;
grant execute on function public.book_viewing_slot(uuid, timestamptz, text) to authenticated;

-- FIX_SCOPE: private.notify_inspection_change, additively. Only the INSERT
-- branch changes: a row born CONFIRMED (a booked slot) is announced as
-- booked to both sides instead of as a request to the lister. Every UPDATE
-- branch is copied unchanged.
create or replace function private.notify_inspection_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  property  text;
  asker     text;
  asked_at  text;
  slot_at   text;
begin
  select l.title into property from public.listings l where l.id = new.listing_id;
  property := coalesce(property, 'the property');

  /* Rendered in Lagos, never in the server's zone, so the hour in the
     notification is the hour somebody has to be at the gate. */
  asked_at := to_char(new.requested_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI');
  slot_at  := to_char(coalesce(new.slot_at, new.requested_at) at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI');
  asker := coalesce(
    (select p.display_name from public.profiles p where p.id = new.requester_id),
    'Somebody'
  );

  if tg_op = 'INSERT' then
    if new.state = 'CONFIRMED' then
      /* V-94: a slot booked from a viewing window. Nothing to answer; both
         sides only need to know where to be and when. */
      perform private.notify(
        new.requester_id,
        'listing',
        'Viewing booked',
        property || ' on ' || slot_at || '. The lister is expecting you.',
        '/inspections'
      );
      perform private.notify(
        new.lister_id,
        'listing',
        'Viewing booked',
        asker || ' booked ' || slot_at || ' to see ' || property || '.',
        '/agent/inspections'
      );
      return new;
    end if;
    perform private.notify(
      new.lister_id,
      'listing',
      'Inspection requested',
      asker || ' wants to see ' || property || ' on ' || asked_at || '. Confirm, offer another time, or decline.',
      '/agent/inspections'
    );
    return new;
  end if;

  -- Only a change of state is news. A note edited, a slot re-saved with the
  -- same state, or an update that changes nothing stays silent.
  if new.state is distinct from old.state then
    if new.state = 'CONFIRMED' then
      perform private.notify(
        new.requester_id,
        'listing',
        'Inspection confirmed',
        property || ' on ' || slot_at || '. The lister is expecting you.',
        '/inspections'
      );
      if old.state = 'PROPOSED' then
        /* The requester took the time the lister offered, so the lister is
           the one who has not yet heard. */
        perform private.notify(
          new.lister_id,
          'listing',
          'Inspection time accepted',
          asker || ' will see ' || property || ' on ' || slot_at || '.',
          '/agent/inspections'
        );
      end if;
    elsif new.state = 'PROPOSED' then
      perform private.notify(
        new.requester_id,
        'listing',
        'Another time offered',
        'The lister of ' || property || ' can do ' || slot_at || ' instead. Accept it, or reply in the thread.',
        '/inspections'
      );
    elsif new.state = 'DECLINED' then
      perform private.notify(
        new.requester_id,
        'listing',
        'Inspection declined',
        property || ' is not available to view on ' || asked_at || '.' ||
          case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
               then ' ' || left(btrim(new.lister_note), 120) else '' end,
        '/inspections'
      );
    elsif new.state = 'WITHDRAWN' then
      perform private.notify(
        new.lister_id,
        'listing',
        'Inspection withdrawn',
        asker || ' no longer needs to see ' || property || ' on ' || slot_at || '.',
        '/agent/inspections'
      );
    elsif new.state = 'COMPLETED' then
      perform private.notify(
        new.requester_id,
        'listing',
        'Inspection complete',
        'Your visit to ' || property || ' is recorded as done.',
        '/inspections'
      );
      perform private.notify(
        new.lister_id,
        'listing',
        'Inspection complete',
        'The visit to ' || property || ' by ' || asker || ' is recorded as done.',
        '/agent/inspections'
      );
    end if;
  end if;

  return new;
end;
$function$;
