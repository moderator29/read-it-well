-- DRAFT, not applied. Batch 1, RESTAURANT-02.
-- Diner reminders for a CONFIRMED table: the evening before (from 19:00 Lagos)
-- and two hours before, the same stages as viewings. Its own ledger and its
-- own job, so it never edits private.send_member_reminders or
-- private.send_viewing_reminders, which the visit-ops track owns.
-- Patterned on the live private.send_viewing_reminders (13 October 2026).
--
-- Reviewed against the live definitions on 13 October 2026 (track/restaurant-desk):
--   * reservations has two spines, business_id and listing_id (either may be
--     null). The first draft joined businesses with an INNER join, so a table
--     at a listing-spine restaurant was never reminded. Both are LEFT joins now,
--     the venue name read the way private.remind_hosts_to_decide reads it.
--   * The eve stage fires only when the Lagos date is the day BEFORE the table
--     and the Lagos clock is at or past 19:00, and never inside the last two
--     hours (that is the soon stage's window). A table booked today for tonight
--     can never read "tomorrow", and a run that lands after midnight sends no
--     eve at all rather than a late one.
--   * The soon stage needs the table both booked AND confirmed before the
--     two-hour mark: a table the venue confirmed ten minutes ago has just told
--     the diner, and a second notice straight after is noise.
--   * The soon notice says "today" only when the table is today on the Lagos
--     clock: a 00:30 table is reminded at 22:30 the evening before, and says
--     "on Wed 21 Oct" instead.
--   * One bad row cannot stop the run: each send is its own block, and a
--     failed send rolls back its own ledger row so the next run tries again.
--
-- Acceptance: one eve and one soon notification per confirmed table, never
-- twice (the ledger's primary key), none for a table booked inside the last
-- two hours. Probe: supabase/tests/probes-pending/p1_c_reservation_reminders.sql.
--
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
  local_at timestamp;
  hhmm     text;
  day_text text;
  when_txt text;
  party    text;
begin
  for r in
    select x.id, x.guest_id, x.reserved_for, x.party_size, x.created_at,
           coalesce(x.responded_at, x.created_at) as confirmed_at,
           coalesce(nullif(b.name, ''), nullif(l.title, ''), 'the restaurant') as venue
      from public.reservations x
      left join public.businesses b on b.id = x.business_id
      left join public.listings l on l.id = x.listing_id
     where x.status = 'CONFIRMED'
       and x.reserved_for > now()
       and x.reserved_for < now() + interval '2 days'
     order by x.reserved_for
     limit 1000
  loop
    local_at := r.reserved_for at time zone 'Africa/Lagos';
    hhmm := to_char(local_at, 'HH24:MI');
    day_text := to_char(local_at, 'Dy DD Mon');
    party := case when r.party_size = 1 then 'one' else r.party_size::text || ' people' end;

    -- The evening before, and only the evening before: the Lagos date is the
    -- day before the table, the Lagos clock is past 19:00, and the table is
    -- more than two hours away. Never on the day itself.
    if lagos::date = local_at::date - 1
       and lagos::time >= time '19:00'
       and now() < r.reserved_for - interval '2 hours' then
      begin
        insert into public.reservation_reminders (reservation_id, stage, reserved_for)
        values (r.id, 'eve', r.reserved_for) on conflict do nothing;
        if found then
          perform private.notify(r.guest_id, 'booking'::public.notification_kind,
            'Your table tomorrow at ' || hhmm || ' Lagos time',
            'A table for ' || party || ' at ' || r.venue || ' on ' || day_text || ' at ' || hhmm ||
              ' (Lagos time). If your plans change, cancel from Bookings so the table can go to somebody else.',
            '/bookings?side=stays');
          sent := sent + 1;
        end if;
      exception when others then
        null;
      end;
    end if;

    -- Two hours before, unless the table was booked or confirmed inside
    -- those two hours.
    if now() >= r.reserved_for - interval '2 hours'
       and r.created_at < r.reserved_for - interval '2 hours'
       and r.confirmed_at < r.reserved_for - interval '2 hours' then
      begin
        insert into public.reservation_reminders (reservation_id, stage, reserved_for)
        values (r.id, 'soon', r.reserved_for) on conflict do nothing;
        if found then
          -- "today" only when it is: a 00:30 table reminded at 22:30 the
          -- evening before names its day instead.
          when_txt := case when lagos::date = local_at::date then 'today' else 'on ' || day_text end;
          perform private.notify(r.guest_id, 'booking'::public.notification_kind,
            'Your table at ' || hhmm || ' Lagos time',
            'A table for ' || party || ' at ' || r.venue || ' ' || when_txt || ' at ' || hhmm ||
              ' (Lagos time). Show your check-in code when you arrive.',
            '/bookings?side=stays');
          sent := sent + 1;
        end if;
      exception when others then
        null;
      end;
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
