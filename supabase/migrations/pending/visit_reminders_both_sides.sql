set lock_timeout = '5s';

-- DRAFT, NOT APPLIED. Visit reminders and visit notices on both sides (track visit-ops, 13 October 2026).
-- Written against the LIVE definitions read on 13 October 2026 with pg_get_functiondef:
--   private.send_viewing_reminders()   (called by private.send_member_reminders(), pg_cron
--                                        vallo_send_member_reminders at 7,22,37,52 * * * *; the
--                                        schedule is not touched here)
--   private.notify_inspection_change() (trigger inspection_requests_notify, after insert or update)
--   public.viewing_reminders           (stage check: 'eve', 'soon'; no read policy; service_role only)
--
-- WHAT THIS CHANGES
--   1. viewing_reminders.stage also accepts 'morning' (the one constraint is replaced in one
--      statement, so the table is never without it; no row changes).
--   2. Admins may read viewing_reminders (select only, the inspection_no_shows pattern), for the
--      console's visits calendar. Nobody else gains anything.
--   3. send_viewing_reminders(), with the stage rule in a new helper
--      private.viewing_reminder_stage(p_slot, p_confirmed, p_at) (postgres only):
--        'eve'     19:00 Lagos the evening before, and now only when the visit's Lagos date is
--                  exactly tomorrow (bug D-05: the live condition had no upper bound on the
--                  date, so a visit confirmed in the morning for later the SAME day was told
--                  "Viewing tomorrow at ...").
--        'morning' NEW. 08:00 Lagos on the day, for a visit at or after 10:00, confirmed before
--                  08:00 that day (one confirmed later has just been told), and skipped when the
--                  'soon' reminder would come within the hour.
--        'soon'    two hours before (unchanged).
--      Only the latest stage that is due is sent, so a missed earlier stage is never sent late
--      and out of order. Every message says the visit mode (in person at the area, or a video
--      call in Vallo) and links the renter to the visit page /listing/<listing_id>/visit/<id>
--      and the lister to /agent/inspections.
--   4. notify_inspection_change(): every notice already existed (request to the lister, renter
--      cancel or withdraw to the lister, confirm, new time and decline to the renter, accepted
--      time to the lister, done to both). They now say the visit mode, and the renter's link is
--      the visit page instead of /inspections. search_path is now '' (every name is qualified).
--
-- Grants: every function is owned by postgres with EXECUTE for postgres only (the two live ones
-- keep their ACL under CREATE OR REPLACE; the new helper is revoked from public, anon and
-- authenticated). No row is removed anywhere, and the only DROP is the stage
-- constraint in step 1, replaced in the same statement.

-- 1. The stage the ledger accepts.
alter table public.viewing_reminders
  drop constraint if exists viewing_reminders_stage_check,
  add constraint viewing_reminders_stage_check check (stage in ('eve', 'morning', 'soon'));

-- 2. The console reads the ledger (admins only; staff on a scope read through the service role).
grant select on public.viewing_reminders to authenticated;
create policy viewing_reminders_select_admin
  on public.viewing_reminders
  for select
  to authenticated
  using (
    (select private.has_role((select auth.uid()), 'admin'::public.app_role))
    or (select private.has_role((select auth.uid()), 'super_admin'::public.app_role))
  );

-- 3. The reminders. Which stage is due is its own function, so the rule can be read and tried
--    at any instant without a clock (private.viewing_reminder_stage).
create or replace function private.viewing_reminder_stage(
  p_slot      timestamptz,
  p_confirmed timestamptz,
  p_at        timestamptz
)
returns text
language plpgsql
stable
set search_path = ''
as $fn$
declare
  lagos      timestamp := p_at at time zone 'Africa/Lagos';
  today      date := (p_at at time zone 'Africa/Lagos')::date;
  slot_local timestamp := p_slot at time zone 'Africa/Lagos';
  slot_day   date := (p_slot at time zone 'Africa/Lagos')::date;
begin
  if p_slot is null or p_at is null or p_at >= p_slot then
    return null;
  end if;
  -- Two hours before.
  if p_at >= p_slot - interval '2 hours' then
    return 'soon';
  end if;
  -- 08:00 Lagos on the day: a visit at or after 10:00, confirmed before 08:00 that day,
  -- and not when 'soon' comes within the hour.
  if today = slot_day
     and slot_local::time >= time '10:00'
     and lagos >= slot_day + time '08:00'
     and p_confirmed is not null
     and (p_confirmed at time zone 'Africa/Lagos') < slot_day + time '08:00'
     and p_at < p_slot - interval '3 hours' then
    return 'morning';
  end if;
  -- 19:00 Lagos the evening before (D-05): only when the visit's Lagos date is exactly
  -- tomorrow, never for a visit later the same day.
  if today = slot_day - 1 and lagos >= (slot_day - 1) + time '19:00' then
    return 'eve';
  end if;
  return null;
end;
$fn$;

revoke all on function private.viewing_reminder_stage(timestamptz, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function private.send_viewing_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  r           record;
  sent        integer := 0;
  due_stage   text;
  aud         text;
  slot_local  timestamp;
  hhmm        text;
  day_text    text;
  when_text   text;
  how_text    text;
  title       text;
  renter_href text;
begin
  for r in
    select i.id, i.listing_id, i.requester_id, i.lister_id, i.slot_at, i.visit_mode,
           coalesce(i.confirmed_at, i.updated_at) as confirmed_at,
           coalesce(nullif(l.area, ''), l.city, 'the property') as place,
           coalesce(nullif(p.display_name, ''), 'the lister') as shown_by,
           coalesce(nullif(v.display_name, ''), 'your visitor') as visitor
      from public.inspection_requests i
      join public.listings l on l.id = i.listing_id
      left join public.profiles p on p.id = i.lister_id
      left join public.profiles v on v.id = i.requester_id
     where i.state = 'CONFIRMED'
       and i.slot_at is not null
       and i.slot_at > now()
       and i.slot_at < now() + interval '2 days'
     limit 1000
  loop
    -- The latest stage that is due, and only that one: a missed earlier stage is never sent late.
    due_stage := private.viewing_reminder_stage(r.slot_at, r.confirmed_at, now());
    continue when due_stage is null;

    slot_local := r.slot_at at time zone 'Africa/Lagos';
    hhmm := to_char(slot_local, 'HH24:MI');
    day_text := to_char(slot_local, 'Dy DD Mon');
    when_text := case due_stage
      when 'eve' then 'tomorrow, ' || day_text || ', at ' || hhmm || ' (Lagos time)'
      else 'today at ' || hhmm || ' (Lagos time)'
    end;
    how_text := case when r.visit_mode = 'video'
      then 'by video call in Vallo'
      else 'in person at ' || r.place
    end;
    title := case when r.visit_mode = 'video' then 'Video viewing' else 'Viewing' end
      || case due_stage when 'eve' then ' tomorrow at ' when 'morning' then ' today at ' else ' at ' end
      || hhmm || ' Lagos time';
    renter_href := '/listing/' || r.listing_id::text || '/visit/' || r.id::text;

    foreach aud in array array['renter', 'lister'] loop
      insert into public.viewing_reminders (inspection_id, audience, stage, slot_at)
      values (r.id, aud, due_stage, r.slot_at) on conflict do nothing;
      if found then
        if aud = 'renter' then
          perform private.notify(r.requester_id, 'booking'::public.notification_kind,
            title,
            case when r.visit_mode = 'video'
              then 'Your viewing of the home in ' || r.place || ' is ' || how_text || ', ' || when_text ||
                   ', with ' || r.shown_by || '.'
              else 'Your viewing is ' || how_text || ', ' || when_text || ', shown by ' || r.shown_by || '.'
            end,
            renter_href);
        else
          perform private.notify(r.lister_id, 'booking'::public.notification_kind,
            title,
            'You are showing ' || r.place || ' to ' || r.visitor || ' ' ||
              case when r.visit_mode = 'video' then 'by video call in Vallo' else 'in person' end ||
              ', ' || when_text || '.',
            '/agent/inspections');
        end if;
        sent := sent + 1;
      end if;
    end loop;
  end loop;
  return sent;
end;
$fn$;

-- 4. The notices when a visit changes state.
create or replace function private.notify_inspection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  property    text;
  asker       text;
  asked_at    text;
  slot_at     text;
  how         text;
  renter_href text;
  actor       uuid := auth.uid();
begin
  select l.title into property from public.listings l where l.id = new.listing_id;
  property := coalesce(property, 'the property');

  asked_at := to_char(new.requested_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  slot_at  := to_char(coalesce(new.slot_at, new.requested_at) at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  asker := coalesce(
    (select p.display_name from public.profiles p where p.id = new.requester_id),
    'Somebody'
  );
  how := case when new.visit_mode = 'video' then 'by video call in Vallo' else 'in person' end;
  renter_href := '/listing/' || new.listing_id::text || '/visit/' || new.id::text;

  if tg_op = 'INSERT' then
    if new.state = 'CONFIRMED' then
      perform private.notify(
        new.requester_id,
        'listing'::public.notification_kind,
        'Viewing booked',
        property || ', ' || how || ', on ' || slot_at || '. The lister is expecting you.',
        renter_href
      );
      perform private.notify(
        new.lister_id,
        'listing'::public.notification_kind,
        'Viewing booked',
        asker || ' booked ' || slot_at || ' to see ' || property || ' ' || how || '.',
        '/agent/inspections'
      );
      return new;
    end if;
    perform private.notify(
      new.lister_id,
      'listing'::public.notification_kind,
      'Inspection requested',
      asker || ' wants to see ' || property || ' ' || how || ' on ' || asked_at || '. Confirm, offer another time, or decline.',
      '/agent/inspections'
    );
    return new;
  end if;

  if new.state is distinct from old.state then
    if new.state = 'CONFIRMED' then
      if actor is distinct from new.requester_id then
        perform private.notify(
          new.requester_id,
          'listing'::public.notification_kind,
          'Inspection confirmed',
          property || ', ' || how || ', on ' || slot_at || '. The lister is expecting you.',
          renter_href
        );
      end if;
      if old.state = 'PROPOSED' and actor is distinct from new.lister_id then
        perform private.notify(
          new.lister_id,
          'listing'::public.notification_kind,
          'Inspection time accepted',
          asker || ' will see ' || property || ' ' || how || ' on ' || slot_at || '.',
          '/agent/inspections'
        );
      end if;
    elsif new.state = 'PROPOSED' then
      perform private.notify(
        new.requester_id,
        'listing'::public.notification_kind,
        case when old.state = 'CONFIRMED' then 'Viewing moved' else 'Another time offered' end,
        'The lister of ' || property || ' can do ' || slot_at || ' instead, ' || how ||
          '. Accept it, or reply in the thread.',
        renter_href
      );
    elsif new.state = 'DECLINED' then
      if old.state = 'CONFIRMED' then
        perform private.notify(
          new.requester_id,
          'listing'::public.notification_kind,
          'Viewing cancelled',
          'The lister cancelled the viewing of ' || property || ' (' || how || ') on ' ||
            to_char(old.slot_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time.' ||
            case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
                 then ' ' || left(btrim(new.lister_note), 120) else '' end,
          renter_href
        );
      else
        perform private.notify(
          new.requester_id,
          'listing'::public.notification_kind,
          'Inspection declined',
          property || ' is not available to view ' || how || ' on ' || asked_at || '.' ||
            case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
                 then ' ' || left(btrim(new.lister_note), 120) else '' end,
          renter_href
        );
      end if;
    elsif new.state = 'WITHDRAWN' then
      perform private.notify(
        new.lister_id,
        'listing'::public.notification_kind,
        case when old.state = 'CONFIRMED' then 'Viewing cancelled' else 'Inspection withdrawn' end,
        asker || ' no longer needs to see ' || property || ' (' || how || ') on ' || slot_at || '.',
        '/agent/inspections'
      );
    elsif new.state = 'COMPLETED' then
      perform private.notify(
        new.requester_id,
        'listing'::public.notification_kind,
        'Inspection complete',
        'Your visit to ' || property || ' is recorded as done.',
        renter_href
      );
      perform private.notify(
        new.lister_id,
        'listing'::public.notification_kind,
        'Inspection complete',
        'The visit to ' || property || ' by ' || asker || ' is recorded as done.',
        '/agent/inspections'
      );
    end if;
  end if;

  return new;
end;
$fn$;

revoke all on function private.send_viewing_reminders() from public, anon, authenticated;
revoke all on function private.notify_inspection_change() from public, anon, authenticated;
