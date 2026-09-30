-- B5 AND B10: VIEWING REMINDERS AND RENT-DUE REMINDERS (30 September 2026).
-- Applied 30 September 2026 with the founder's approval. Idempotent and
-- additive: one internal ledger table, one sweep function, one pg_cron job.
-- No inspection, tenancy, payment or preference is changed.
--
-- WHAT IT SENDS, each ONCE (the ledger `public.member_reminders` records it),
-- through `private.notify` with kind 'booking', so it lands in the bell and
-- the push queue exactly like every other booking notification and honours
-- the person's own "bookings" preference and quiet hours there:
--
--   B5, a CONFIRMED inspection (inspection_requests.state = 'CONFIRMED',
--   slot_at in the future), to the RENTER who asked for it:
--     'eve'    from 19:00 Lagos the evening before the slot, until two hours
--              before it (a viewing confirmed late never gets a stale one);
--     'soon'   from two hours before the slot until the slot.
--   Each names the time, the area, and who is showing it (the lister's
--   display name), and nothing else: no street, no phone, no money.
--   Founder defaults (B5): 19:00 the evening before and two hours before;
--   the lister is NOT reminded (a decision left open in the write-up). To
--   remind the lister too, add a second perform with r.lister_id.
--
--   B10, a running tenancy the renter PAID (a tenancy snapshot exists), not
--   voided, let by the YEAR or QUARTER (a monthly tenancy would be reminded
--   every month, which is noise), to the TENANT:
--     'd180', 'd90', 'd30', 'd7'  when that many days are left before the
--   tenancy ends (private.tenancy_end), and only when that day falls after
--   move-in, so a tenancy that starts with 60 days left is never told "180".
--   Worded as a date and a figure; it links to the tenancy page, whose card
--   carries the arithmetic. No wallet, no pot, no savings product.
--
-- Everything is kind 'booking'. The ledger keeps 400 days, longer than any
-- tenancy stage window, so a stage can never be sent twice.

create table if not exists public.member_reminders (
  kind        text not null,
  subject_id  uuid not null,
  stage       text not null,
  sent_at     timestamptz not null default now(),
  primary key (kind, subject_id, stage),
  constraint member_reminders_kind_chk check (kind in ('viewing', 'rent_due')),
  constraint member_reminders_stage_chk check (stage in ('eve', 'soon', 'd180', 'd90', 'd30', 'd7'))
);
comment on table public.member_reminders is
  'B5/B10: which viewing and rent-due reminders were sent, so each is sent once. Written only by private.send_member_reminders.';
alter table public.member_reminders enable row level security;
revoke all on public.member_reminders from anon, authenticated;
-- No policy: only the definer function below reads or writes it.

create or replace function private.send_member_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  r        record;
  sent     integer := 0;
  lagos    timestamp := now() at time zone 'Africa/Lagos';
  today    date := (now() at time zone 'Africa/Lagos')::date;
  stage_n  integer;
  stage    text;
begin
  ---------------------------------------------------------------- B5 viewings
  for r in
    select i.id, i.requester_id, i.slot_at,
           coalesce(nullif(l.area, ''), l.city, 'the property') as place,
           coalesce(nullif(p.display_name, ''), 'the lister') as shown_by
      from public.inspection_requests i
      join public.listings l on l.id = i.listing_id
      left join public.profiles p on p.id = i.lister_id
     where i.state = 'CONFIRMED'
       and i.slot_at is not null
       and i.slot_at > now()
       and i.slot_at < now() + interval '2 days'
     limit 1000
  loop
    -- The slot's Lagos day, and 19:00 Lagos the evening before it.
    if now() < r.slot_at - interval '2 hours'
       and lagos >= ((r.slot_at at time zone 'Africa/Lagos')::date - 1) + time '19:00' then
      insert into public.member_reminders (kind, subject_id, stage) values ('viewing', r.id, 'eve') on conflict do nothing;
      if found then
        perform private.notify(r.requester_id, 'booking'::public.notification_kind,
          'Viewing tomorrow at ' || to_char(r.slot_at at time zone 'Africa/Lagos', 'HH24:MI'),
          'Your viewing in ' || r.place || ' is at ' ||
            to_char(r.slot_at at time zone 'Africa/Lagos', 'HH24:MI "on" Dy DD Mon') ||
            ', shown by ' || r.shown_by || '.',
          '/bookings?kind=inspection');
        sent := sent + 1;
      end if;
    end if;
    if now() >= r.slot_at - interval '2 hours' then
      insert into public.member_reminders (kind, subject_id, stage) values ('viewing', r.id, 'soon') on conflict do nothing;
      if found then
        perform private.notify(r.requester_id, 'booking'::public.notification_kind,
          'Viewing at ' || to_char(r.slot_at at time zone 'Africa/Lagos', 'HH24:MI'),
          'Your viewing in ' || r.place || ' is at ' ||
            to_char(r.slot_at at time zone 'Africa/Lagos', 'HH24:MI') ||
            ' today, shown by ' || r.shown_by || '.',
          '/bookings?kind=inspection');
        sent := sent + 1;
      end if;
    end if;
  end loop;

  ------------------------------------------------------------ B10 rent due
  for r in
    select rp.id, rp.tenant_id, rp.move_in, private.tenancy_end(rp.move_in, rp.rent_period) as ends_on
      from public.rent_payments rp
     where rp.rent_period in ('year', 'quarter')
       and exists (select 1 from public.tenancy_snapshots s where s.rent_payment_id = rp.id)
       and private.tenancy_end(rp.move_in, rp.rent_period) >= today
       and private.tenancy_end(rp.move_in, rp.rent_period) <= today + 180
     limit 2000
  loop
    if private.tenancy_void(r.id) then
      continue;
    end if;
    stage := null;
    foreach stage_n in array array[7, 30, 90, 180] loop
      if r.ends_on - today <= stage_n and (r.ends_on - stage_n) > r.move_in then
        stage := 'd' || stage_n;
        exit;
      end if;
    end loop;
    continue when stage is null;
    insert into public.member_reminders (kind, subject_id, stage) values ('rent_due', r.id, stage) on conflict do nothing;
    continue when not found;
    perform private.notify(r.tenant_id, 'booking'::public.notification_kind,
      case when r.ends_on - today <= 1 then 'Your rent is due tomorrow'
           else 'Your rent is due in ' || (r.ends_on - today) || ' days' end,
      'Your tenancy runs to ' || to_char(r.ends_on, 'FMDD FMMonth YYYY') ||
        '. Open it to see the figure and what setting it aside each month adds up to.',
      '/tenancy/' || r.id);
    sent := sent + 1;
  end loop;

  delete from public.member_reminders where sent_at < now() - interval '400 days';
  return sent;
end;
$function$;
revoke all on function private.send_member_reminders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'vallo_send_member_reminders') then
      perform cron.unschedule('vallo_send_member_reminders');
    end if;
    perform cron.schedule('vallo_send_member_reminders', '7,22,37,52 * * * *', 'select private.send_member_reminders();');
  end if;
end $$;

-- ------------------------------------------------------------ read-back
do $$
begin
  if to_regclass('public.member_reminders') is null then
    raise exception 'b5/b10: member_reminders is missing';
  end if;
  if not (select relrowsecurity from pg_catalog.pg_class where oid = 'public.member_reminders'::regclass) then
    raise exception 'b5/b10: row level security is off on member_reminders';
  end if;
  if to_regprocedure('private.send_member_reminders()') is null then
    raise exception 'b5/b10: private.send_member_reminders is missing';
  end if;
  if has_function_privilege('authenticated', 'private.send_member_reminders()', 'execute') then
    raise exception 'b5/b10: the reminder sweep is open to members';
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'vallo_send_member_reminders') then
      raise exception 'b5/b10: the reminder job is not scheduled';
    end if;
  end if;
end $$;
