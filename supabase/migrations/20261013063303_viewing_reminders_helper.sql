-- Applied 13 October 2026, part of the viewing no-show and both-sides reminders migration (founder decisions, round 2).
-- Dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

create or replace function private.send_viewing_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  r        record;
  sent     integer := 0;
  lagos    timestamp := now() at time zone 'Africa/Lagos';
  aud      text;
  hhmm     text;
  day_text text;
begin
  for r in
    select i.id, i.requester_id, i.lister_id, i.slot_at,
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
    hhmm := to_char(r.slot_at at time zone 'Africa/Lagos', 'HH24:MI');
    day_text := to_char(r.slot_at at time zone 'Africa/Lagos', 'Dy DD Mon');
    -- The slot's Lagos day, and 19:00 Lagos the evening before it.
    if now() < r.slot_at - interval '2 hours'
       and lagos >= ((r.slot_at at time zone 'Africa/Lagos')::date - 1) + time '19:00' then
      foreach aud in array array['renter', 'lister'] loop
        insert into public.viewing_reminders (inspection_id, audience, stage, slot_at)
        values (r.id, aud, 'eve', r.slot_at) on conflict do nothing;
        if found then
          if aud = 'renter' then
            perform private.notify(r.requester_id, 'booking'::public.notification_kind,
              'Viewing tomorrow at ' || hhmm || ' Lagos time',
              'Your viewing in ' || r.place || ' is at ' || hhmm || ' on ' || day_text ||
                ' (Lagos time), shown by ' || r.shown_by || '.',
              '/bookings?kind=inspection');
          else
            perform private.notify(r.lister_id, 'booking'::public.notification_kind,
              'Viewing tomorrow at ' || hhmm || ' Lagos time',
              'You are showing ' || r.place || ' to ' || r.visitor || ' at ' || hhmm || ' on ' || day_text ||
                ' (Lagos time).',
              '/agent/inspections');
          end if;
          sent := sent + 1;
        end if;
      end loop;
    end if;
    if now() >= r.slot_at - interval '2 hours' then
      foreach aud in array array['renter', 'lister'] loop
        insert into public.viewing_reminders (inspection_id, audience, stage, slot_at)
        values (r.id, aud, 'soon', r.slot_at) on conflict do nothing;
        if found then
          if aud = 'renter' then
            perform private.notify(r.requester_id, 'booking'::public.notification_kind,
              'Viewing at ' || hhmm || ' Lagos time',
              'Your viewing in ' || r.place || ' is at ' || hhmm || ' today (Lagos time), shown by ' ||
                r.shown_by || '.',
              '/bookings?kind=inspection');
          else
            perform private.notify(r.lister_id, 'booking'::public.notification_kind,
              'Viewing at ' || hhmm || ' Lagos time',
              'You are showing ' || r.place || ' to ' || r.visitor || ' at ' || hhmm || ' today (Lagos time).',
              '/agent/inspections');
          end if;
          sent := sent + 1;
        end if;
      end loop;
    end if;
  end loop;
  return sent;
end;
$fn$;
revoke all on function private.send_viewing_reminders() from public, anon, authenticated;
