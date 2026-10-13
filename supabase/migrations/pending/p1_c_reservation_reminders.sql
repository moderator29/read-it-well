-- DRAFT, not applied. Batch 1, RESTAURANT-02.
-- Diner reminders for a CONFIRMED table: the evening before (from 19:00 Lagos)
-- and two hours before, the same stages as viewings. Its own ledger and its
-- own job, so it never edits private.send_member_reminders or
-- private.send_viewing_reminders, which the visit-ops track owns.
-- Patterned on the live private.send_viewing_reminders (13 October 2026).
-- After applying: add the job to PG_CRON_JOBS (apps/web/src/lib/admin/reads/jobs.ts)
-- and to the table and count in docs/ADMIN_CONSOLE.md (lead owns both files).
set lock_timeout = '5s';

create table if not exists public.reservation_reminders (
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  stage          text not null check (stage in ('eve', 'soon')),
  reserved_for   timestamptz not null,
  sent_at        timestamptz not null default now(),
  primary key (reservation_id, stage, reserved_for)
);
alter table public.reservation_reminders enable row level security;
revoke all on public.reservation_reminders from public, anon, authenticated;
grant all on public.reservation_reminders to service_role;

create or replace function private.send_reservation_reminders()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  r        record;
  sent     integer := 0;
  lagos    timestamp := now() at time zone 'Africa/Lagos';
  hhmm     text;
  day_text text;
  party    text;
begin
  for r in
    select x.id, x.guest_id, x.reserved_for, x.party_size, x.created_at,
           coalesce(nullif(b.name, ''), 'the restaurant') as venue
      from public.reservations x
      join public.businesses b on b.id = x.business_id
     where x.status = 'CONFIRMED'
       and x.reserved_for > now()
       and x.reserved_for < now() + interval '2 days'
     limit 1000
  loop
    hhmm := to_char(r.reserved_for at time zone 'Africa/Lagos', 'HH24:MI');
    day_text := to_char(r.reserved_for at time zone 'Africa/Lagos', 'Dy DD Mon');
    party := case when r.party_size = 1 then 'one' else r.party_size::text || ' people' end;

    -- The evening before, only on the evening before: a table booked today
    -- for tonight never reads "tomorrow".
    if lagos::date = (r.reserved_for at time zone 'Africa/Lagos')::date - 1
       and lagos::time >= time '19:00' then
      insert into public.reservation_reminders (reservation_id, stage, reserved_for)
      values (r.id, 'eve', r.reserved_for) on conflict do nothing;
      if found then
        perform private.notify(r.guest_id, 'booking'::public.notification_kind,
          'Your table tomorrow at ' || hhmm || ' Lagos time',
          'A table for ' || party || ' at ' || r.venue || ' on ' || day_text || ' at ' || hhmm ||
            ' (Lagos time). If your plans change, cancel from Bookings so the table can go to somebody else.',
          '/bookings');
        sent := sent + 1;
      end if;
    end if;

    -- Two hours before, unless the table was booked inside those two hours.
    if now() >= r.reserved_for - interval '2 hours'
       and r.created_at < r.reserved_for - interval '2 hours' then
      insert into public.reservation_reminders (reservation_id, stage, reserved_for)
      values (r.id, 'soon', r.reserved_for) on conflict do nothing;
      if found then
        perform private.notify(r.guest_id, 'booking'::public.notification_kind,
          'Your table at ' || hhmm || ' Lagos time',
          'A table for ' || party || ' at ' || r.venue || ' today at ' || hhmm ||
            ' (Lagos time). Show your check-in code when you arrive.',
          '/bookings');
        sent := sent + 1;
      end if;
    end if;
  end loop;
  return sent;
end;
$fn$;

revoke all on function private.send_reservation_reminders() from public, anon, authenticated;

select cron.schedule(
  'vallo_send_reservation_reminders',
  '1,16,31,46 * * * *',
  $cron$select private.send_reservation_reminders();$cron$
);
