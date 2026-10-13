/*
 * A VIEWING NOBODY CAME TO, REMINDERS FOR BOTH SIDES, AND NOTICES THAT SAY
 * WHOSE CLOCK THEY ARE ON.
 *
 * DRAFT. NOT APPLIED. Written by the viewing track (round 2, 13 October 2026)
 * from the founder's three decisions; apply it after reading it, then rename
 * and record it as CONTRIBUTING.md says. No DROP anywhere: every function is
 * `create or replace`, the enum gains a value, and two tables are new.
 *
 * 1. A NO-SHOW IS ITS OWN ENDING. `inspection_state` gains NO_SHOW, a
 *    terminal state beside DECLINED, COMPLETED and WITHDRAWN. It is not an
 *    `outcome` of COMPLETED: COMPLETED means the visit happened, and every
 *    door that opens on it (the rent payment, the truth questions, the
 *    agreement) would open on a visit nobody made.
 *
 *    `public.inspection_no_shows` records who reported it and who is said
 *    to have stayed away. It is written only by three SECURITY DEFINER
 *    functions, never by a member's own insert or update:
 *
 *      report_inspection_no_show   either party of a CONFIRMED viewing, from
 *                                  the agreed time (the frozen copy V-05
 *                                  keeps) and for 14 days after it; moves the
 *                                  inspection to NO_SHOW and tells the other
 *                                  side they can dispute it within 48 hours.
 *      dispute_inspection_no_show  the party said to have stayed away, once,
 *                                  within 48 hours of the report; opens a
 *                                  `risk_alerts` row (the admin alerts queue)
 *                                  and tells the reporter.
 *      resolve_inspection_no_show  staff: upheld or overturned; resolves the
 *                                  alert and tells both sides.
 *
 *    The guard admits CONFIRMED to NO_SHOW only for a party who has a report
 *    on file, so a direct update cannot make a no-show without its record.
 *    Repeated no-shows are read by the admin console from this table (an
 *    overturned report does not count); the admin policy below is what lets
 *    it.
 *
 * 2. LISTERS ARE REMINDED TOO, and a moved viewing is reminded again.
 *    `send_member_reminders` reminded the renter only, and its ledger was
 *    keyed by inspection and stage, so a viewing moved after its evening
 *    reminder never got one for the new day. Viewing reminders now use
 *    `public.viewing_reminders`, keyed by inspection, audience, stage AND the
 *    slot: a new slot is a new set of reminders, for both sides, at 19:00
 *    Lagos the evening before and two hours before. Reminders already sent
 *    under the old ledger are copied across for the slot they were for, so
 *    nobody is reminded twice for the same time. The rent-due half of the
 *    function is reproduced verbatim from 20260930084714.
 *
 * 3. NOTICES. Every viewing time in `notify_inspection_change` and in the
 *    reminders now ends "Lagos time". The renter is no longer told about
 *    their own acceptance of an offered time (the lister is). A booked
 *    viewing called off by either side is said as a cancellation, with the
 *    agreed time rather than the asked one. And the "viewing confirmed"
 *    email is keyed by the slot as well, so a rescheduled viewing sends a
 *    fresh confirmation to both sides instead of being swallowed as a
 *    duplicate of the first.
 *
 * PROBE AFTER APPLYING, as the real roles, each in a rolled-back transaction:
 *   - as a party of a CONFIRMED viewing whose slot is tomorrow,
 *     select public.report_inspection_no_show(id): expect hint
 *     no_show_too_early;
 *   - CONTROL: same on one whose slot passed an hour ago: expect 'reported'
 *     and the row in NO_SHOW;
 *   - as the reporter, select public.dispute_inspection_no_show(id): expect
 *     hint no_show_not_yours; as the other party: expect 'disputed' and one
 *     open risk_alerts row with entity_type 'inspection_no_show';
 *   - as a party, update the inspection to NO_SHOW directly with no report on
 *     file: expect check_violation.
 */

/* ------------------------------------------------------------ the state */

alter type public.inspection_state add value if not exists 'NO_SHOW';

/* ------------------------------------------------------------ the record */

create table if not exists public.inspection_no_shows (
  inspection_id uuid primary key references public.inspection_requests (id) on delete cascade,
  reported_by   uuid not null references auth.users (id) on delete cascade,
  absent_id     uuid not null references auth.users (id) on delete cascade,
  absent_role   text not null check (absent_role in ('requester', 'lister')),
  note          text check (note is null or length(note) <= 400),
  reported_at   timestamptz not null default now(),
  disputed_at   timestamptz,
  dispute_note  text check (dispute_note is null or length(dispute_note) <= 400),
  resolved_at   timestamptz,
  resolution    text check (resolution is null or resolution in ('upheld', 'overturned')),
  resolved_by   uuid references auth.users (id) on delete set null,
  constraint inspection_no_shows_parties_differ check (reported_by <> absent_id),
  constraint inspection_no_shows_resolved_after_dispute check (resolved_at is null or disputed_at is not null)
);

comment on table public.inspection_no_shows is
  'A viewing one party says the other did not come to: who reported it, who is said to have stayed away, the 48-hour dispute and staff''s resolution. Written only by report_/dispute_/resolve_inspection_no_show.';

create index if not exists inspection_no_shows_reported_by_idx on public.inspection_no_shows (reported_by);
create index if not exists inspection_no_shows_absent_idx on public.inspection_no_shows (absent_id, reported_at desc);
create index if not exists inspection_no_shows_resolved_by_idx on public.inspection_no_shows (resolved_by);

alter table public.inspection_no_shows enable row level security;
revoke all on public.inspection_no_shows from public, anon, authenticated;
grant select on public.inspection_no_shows to authenticated;
grant all on public.inspection_no_shows to service_role;

create policy inspection_no_shows_select_party on public.inspection_no_shows
  for select to authenticated
  using (reported_by = (select auth.uid()) or absent_id = (select auth.uid()));

create policy inspection_no_shows_select_admin on public.inspection_no_shows
  for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

/* ------------------------------------------------------------ the guard */

/* The live body (20260918120100) with NO_SHOW added twice: as a terminal
   state, and as a move from CONFIRMED for a party with a report on file. */
create or replace function private.guard_inspection_transition()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller uuid := auth.uid();
  is_lister boolean;
  is_requester boolean;
begin
  /* The outcome travels with the transition to COMPLETED and nowhere else. */
  if new.outcome is distinct from old.outcome then
    if not (new.state = 'COMPLETED' and old.state <> 'COMPLETED') then
      raise exception 'an inspection outcome is recorded when it is completed, not afterwards'
        using errcode = 'check_violation';
    end if;
  end if;

  /* The service role and database-internal work carry no JWT. They are
     already trusted; this guard is about the two humans. */
  if caller is null then
    return new;
  end if;

  is_lister := caller = old.lister_id;
  is_requester := caller = old.requester_id;

  if new.state = old.state then
    return new;
  end if;

  if old.state in ('DECLINED', 'COMPLETED', 'WITHDRAWN', 'NO_SHOW') then
    raise exception 'inspection % is finished and cannot change', old.id
      using errcode = 'check_violation';
  end if;

  if is_lister and new.state in ('CONFIRMED', 'PROPOSED', 'DECLINED') then
    if new.responded_at is null then
      new.responded_at := now();
    end if;
    return new;
  end if;

  if is_requester and new.state = 'WITHDRAWN' then
    return new;
  end if;

  /* Taking the time the lister offered. Only from PROPOSED, because from
     REQUESTED it would be the requester confirming their own request. */
  if is_requester and new.state = 'CONFIRMED' and old.state = 'PROPOSED' then
    return new;
  end if;

  if (is_lister or is_requester) and new.state = 'COMPLETED'
     and old.state = 'CONFIRMED' then
    return new;
  end if;

  /* A no-show, only with its record: report_inspection_no_show writes the
     report and then moves the state, as the reporting party. */
  if (is_lister or is_requester) and new.state = 'NO_SHOW'
     and old.state = 'CONFIRMED'
     and exists (
       select 1 from public.inspection_no_shows s
        where s.inspection_id = old.id and s.reported_by = caller
     ) then
    return new;
  end if;

  raise exception 'illegal inspection transition % -> %', old.state, new.state
    using errcode = 'check_violation';
end;
$function$;

revoke execute on function private.guard_inspection_transition() from public, anon, authenticated;

/* ------------------------------------------------------------ report */

create or replace function public.report_inspection_no_show(p_inspection uuid, p_note text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller   uuid := (select auth.uid());
  r        record;
  agreed   timestamptz;
  absent   uuid;
  property text;
  at_text  text;
begin
  if caller is null then
    raise exception 'sign in to report a no-show' using errcode = '42501';
  end if;
  if p_note is not null and length(p_note) > 400 then
    raise exception 'keep the note under 400 characters' using errcode = '22023';
  end if;

  select i.id, i.listing_id, i.requester_id, i.lister_id, i.state, i.slot_at, i.requested_at
    into r
    from public.inspection_requests i
   where i.id = p_inspection
   for update;
  if not found or caller not in (r.requester_id, r.lister_id) then
    raise exception 'no such viewing' using errcode = 'P0001', hint = 'no_show_not_found';
  end if;
  if r.state::text <> 'CONFIRMED' then
    raise exception 'only a booked viewing can be a no-show' using errcode = 'P0001', hint = 'no_show_not_booked';
  end if;

  agreed := coalesce(
    (select a.slot_at from private.inspection_slot_agreed a where a.inspection_id = r.id),
    r.slot_at,
    r.requested_at
  );
  if agreed > now() then
    raise exception 'the viewing time has not come' using errcode = 'P0001', hint = 'no_show_too_early';
  end if;
  if agreed < now() - interval '14 days' then
    raise exception 'too long after the viewing' using errcode = 'P0001', hint = 'no_show_too_late';
  end if;

  absent := case when caller = r.requester_id then r.lister_id else r.requester_id end;

  insert into public.inspection_no_shows (inspection_id, reported_by, absent_id, absent_role, note)
  values (r.id, caller, absent,
          case when absent = r.requester_id then 'requester' else 'lister' end,
          nullif(btrim(coalesce(p_note, '')), ''));

  update public.inspection_requests
     set state = 'NO_SHOW'::public.inspection_state
   where id = r.id
     and state = 'CONFIRMED'::public.inspection_state;

  select l.title into property from public.listings l where l.id = r.listing_id;
  at_text := to_char(agreed at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  perform private.notify(
    absent,
    'listing'::public.notification_kind,
    'Marked as a no-show',
    case when absent = r.requester_id then 'The lister' else 'The renter' end
      || ' says you did not come to the viewing of ' || coalesce(property, 'the property')
      || ' on ' || at_text || '. If that is not right, dispute it within 48 hours.',
    case when absent = r.requester_id then '/inspections' else '/agent/inspections' end
  );
  return 'reported';
end;
$function$;

comment on function public.report_inspection_no_show(uuid, text) is
  'A party of a CONFIRMED viewing says the other did not come: from the agreed time to 14 days after it. Records the report, moves the inspection to NO_SHOW, tells the other side they can dispute within 48 hours.';

/* ------------------------------------------------------------ dispute */

create or replace function public.dispute_inspection_no_show(p_inspection uuid, p_note text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller   uuid := (select auth.uid());
  s        record;
  property text;
begin
  if caller is null then
    raise exception 'sign in to dispute' using errcode = '42501';
  end if;
  if p_note is not null and length(p_note) > 400 then
    raise exception 'keep the note under 400 characters' using errcode = '22023';
  end if;

  select n.inspection_id, n.reported_by, n.absent_id, n.reported_at, n.disputed_at, i.listing_id
    into s
    from public.inspection_no_shows n
    join public.inspection_requests i on i.id = n.inspection_id
   where n.inspection_id = p_inspection
   for update of n;
  if not found or s.absent_id <> caller then
    raise exception 'not yours to dispute' using errcode = 'P0001', hint = 'no_show_not_yours';
  end if;
  if s.disputed_at is not null then
    raise exception 'already disputed' using errcode = 'P0001', hint = 'no_show_already_disputed';
  end if;
  if now() > s.reported_at + interval '48 hours' then
    raise exception 'the 48 hours have passed' using errcode = 'P0001', hint = 'no_show_dispute_closed';
  end if;

  update public.inspection_no_shows
     set disputed_at = now(),
         dispute_note = nullif(btrim(coalesce(p_note, '')), '')
   where inspection_id = p_inspection;

  select l.title into property from public.listings l where l.id = s.listing_id;
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  values (
    'medium', 'open', 'A no-show is disputed',
    format('Viewing %s of %s: the party marked absent says they were there. Reported %s, disputed %s.%s',
           p_inspection, coalesce(property, 'a property'),
           to_char(s.reported_at at time zone 'Africa/Lagos', 'DD Mon HH24:MI'),
           to_char(now() at time zone 'Africa/Lagos', 'DD Mon HH24:MI'),
           case when nullif(btrim(coalesce(p_note, '')), '') is not null
                then ' Their note: ' || left(btrim(p_note), 300) else '' end),
    'inspection_no_show', p_inspection::text
  );

  perform private.notify(
    s.reported_by,
    'listing'::public.notification_kind,
    'No-show disputed',
    'The other side says they were at the viewing of ' || coalesce(property, 'the property')
      || '. Vallo will look at it and tell you both.',
    case when s.reported_by = (select i.lister_id from public.inspection_requests i where i.id = p_inspection)
         then '/agent/inspections' else '/inspections' end
  );
  return 'disputed';
end;
$function$;

comment on function public.dispute_inspection_no_show(uuid, text) is
  'The party marked absent says they were there: once, within 48 hours of the report. Opens a risk_alerts row for staff and tells the reporter.';

/* ------------------------------------------------------------ resolve */

create or replace function public.resolve_inspection_no_show(p_inspection uuid, p_upheld boolean)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller   uuid := (select auth.uid());
  s        record;
  property text;
  word     text;
begin
  if caller is not null
     and not private.has_role(caller, 'admin'::public.app_role)
     and not private.has_role(caller, 'super_admin'::public.app_role) then
    raise exception 'staff only' using errcode = '42501';
  end if;
  if p_upheld is null then
    raise exception 'say upheld or overturned' using errcode = '22023';
  end if;

  select n.inspection_id, n.reported_by, n.absent_id, n.disputed_at, n.resolved_at, i.listing_id, i.lister_id
    into s
    from public.inspection_no_shows n
    join public.inspection_requests i on i.id = n.inspection_id
   where n.inspection_id = p_inspection
   for update of n;
  if not found or s.disputed_at is null then
    raise exception 'no open dispute' using errcode = 'P0001', hint = 'no_show_no_dispute';
  end if;
  if s.resolved_at is not null then
    raise exception 'already resolved' using errcode = 'P0001', hint = 'no_show_already_resolved';
  end if;

  word := case when p_upheld then 'upheld' else 'overturned' end;
  update public.inspection_no_shows
     set resolved_at = now(), resolution = word, resolved_by = caller
   where inspection_id = p_inspection;

  update public.risk_alerts
     set status = 'resolved', resolved_at = now(), resolved_by = caller
   where entity_type = 'inspection_no_show'
     and entity_id = p_inspection::text
     and status = 'open';

  select l.title into property from public.listings l where l.id = s.listing_id;
  perform private.notify(
    who,
    'listing'::public.notification_kind,
    case when p_upheld then 'No-show stands' else 'No-show removed' end,
    'Vallo looked at the no-show on the viewing of ' || coalesce(property, 'the property') || ': '
      || case when p_upheld then 'it stands.' else 'it has been taken off the record.' end,
    case when who = s.lister_id then '/agent/inspections' else '/inspections' end
  )
  from unnest(array[s.reported_by, s.absent_id]) as who;
  return word;
end;
$function$;

comment on function public.resolve_inspection_no_show(uuid, boolean) is
  'Staff decide a disputed no-show: upheld or overturned. Resolves its risk alert and tells both sides. An overturned no-show does not count toward repeats.';

revoke all on function public.report_inspection_no_show(uuid, text) from public, anon;
revoke all on function public.dispute_inspection_no_show(uuid, text) from public, anon;
revoke all on function public.resolve_inspection_no_show(uuid, boolean) from public, anon;
grant execute on function public.report_inspection_no_show(uuid, text) to authenticated;
grant execute on function public.dispute_inspection_no_show(uuid, text) to authenticated;
grant execute on function public.resolve_inspection_no_show(uuid, boolean) to authenticated;

/* ------------------------------------------------------------ reminders */

create table if not exists public.viewing_reminders (
  inspection_id uuid not null references public.inspection_requests (id) on delete cascade,
  audience      text not null check (audience in ('renter', 'lister')),
  stage         text not null check (stage in ('eve', 'soon')),
  slot_at       timestamptz not null,
  sent_at       timestamptz not null default now(),
  primary key (inspection_id, audience, stage, slot_at)
);

comment on table public.viewing_reminders is
  'Which viewing reminders were sent, to which side, for which slot. Keyed by the slot, so a moved viewing is reminded again. Written only by private.send_member_reminders.';

alter table public.viewing_reminders enable row level security;
revoke all on public.viewing_reminders from public, anon, authenticated;
grant all on public.viewing_reminders to service_role;

/* The renter reminders already sent, for the slot they were for. */
insert into public.viewing_reminders (inspection_id, audience, stage, slot_at, sent_at)
select m.subject_id, 'renter', m.stage, i.slot_at, m.sent_at
  from public.member_reminders m
  join public.inspection_requests i on i.id = m.subject_id
 where m.kind = 'viewing'
   and m.stage in ('eve', 'soon')
   and i.slot_at is not null
on conflict do nothing;

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
  aud      text;
  hhmm     text;
  day_text text;
begin
  ------------------------------------------------- B5 viewings, both sides
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
  delete from public.viewing_reminders where sent_at < now() - interval '400 days';
  return sent;
end;
$function$;

revoke all on function private.send_member_reminders() from public, anon, authenticated;

/* ------------------------------------------------------------ notices */

/* The live body (20260924110341) with three changes: every time ends
   "Lagos time"; the person who made a move is not told about it (the
   renter taking an offered time, read off auth.uid()); and a booked viewing
   called off by either side is said as a cancellation, with the agreed time. */
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
  actor     uuid := auth.uid();
begin
  select l.title into property from public.listings l where l.id = new.listing_id;
  property := coalesce(property, 'the property');

  /* Rendered in Lagos, never in the server's zone, and said as such, so the
     hour in the notification is the hour somebody has to be at the gate,
     whichever zone their phone is in. */
  asked_at := to_char(new.requested_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  slot_at  := to_char(coalesce(new.slot_at, new.requested_at) at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
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
      /* The renter hears unless the renter is the one who moved it (taking
         the lister's offered time); then the lister is the one to tell. */
      if actor is distinct from new.requester_id then
        perform private.notify(
          new.requester_id,
          'listing',
          'Inspection confirmed',
          property || ' on ' || slot_at || '. The lister is expecting you.',
          '/inspections'
        );
      end if;
      if old.state = 'PROPOSED' and actor is distinct from new.lister_id then
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
        case when old.state = 'CONFIRMED' then 'Viewing moved' else 'Another time offered' end,
        'The lister of ' || property || ' can do ' || slot_at || ' instead. Accept it, or reply in the thread.',
        '/inspections'
      );
    elsif new.state = 'DECLINED' then
      if old.state = 'CONFIRMED' then
        perform private.notify(
          new.requester_id,
          'listing',
          'Viewing cancelled',
          'The lister cancelled the viewing of ' || property || ' on ' ||
            to_char(old.slot_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time.' ||
            case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
                 then ' ' || left(btrim(new.lister_note), 120) else '' end,
          '/inspections'
        );
      else
        perform private.notify(
          new.requester_id,
          'listing',
          'Inspection declined',
          property || ' is not available to view on ' || asked_at || '.' ||
            case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
                 then ' ' || left(btrim(new.lister_note), 120) else '' end,
          '/inspections'
        );
      end if;
    elsif new.state = 'WITHDRAWN' then
      perform private.notify(
        new.lister_id,
        'listing',
        case when old.state = 'CONFIRMED' then 'Viewing cancelled' else 'Inspection withdrawn' end,
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
    /* NO_SHOW is announced by report_inspection_no_show, which knows who
       reported it and who is said to have stayed away. */
  end if;

  return new;
end;
$function$;

revoke execute on function private.notify_inspection_change() from public, anon, authenticated;

/* The "viewing confirmed" email, keyed by the slot as well: a viewing moved
   and confirmed again is a new appointment, and its email used to be dropped
   as a duplicate of the first. The live body (20260923093213) otherwise. */
create or replace function private.enqueue_inspection_booked_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE' and old.state is not distinct from new.state then
    return new;
  end if;
  if new.state <> 'CONFIRMED' then
    return new;
  end if;
  /* Without a time there is nothing to put in the email, and the message is
     entirely about where to be and when. */
  if new.slot_at is null then
    return new;
  end if;

  perform private.email_outbox_enqueue(
    new.requester_id,
    'inspection.scheduled',
    'inspection:' || new.id::text || ':CONFIRMED:' || new.requester_id::text || ':' || extract(epoch from new.slot_at)::bigint::text,
    jsonb_build_object(
      'inspection_id', new.id,
      'listing_id', new.listing_id,
      'audience', 'viewer',
      'counterparty_id', new.lister_id,
      'slot_at', new.slot_at
    )
  );

  if new.lister_id is not null then
    perform private.email_outbox_enqueue(
      new.lister_id,
      'inspection.scheduled',
      'inspection:' || new.id::text || ':CONFIRMED:' || new.lister_id::text || ':' || extract(epoch from new.slot_at)::bigint::text,
      jsonb_build_object(
        'inspection_id', new.id,
        'listing_id', new.listing_id,
        'audience', 'lister',
        'counterparty_id', new.requester_id,
        'slot_at', new.slot_at
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_inspection_booked_email() from public, anon, authenticated;

/* ------------------------------------------------------------ read-back */

do $readback$
declare
  bad text := '';
begin
  if not exists (select 1 from pg_enum where enumtypid = 'public.inspection_state'::regtype and enumlabel = 'NO_SHOW') then
    bad := bad || ' [NO_SHOW missing]';
  end if;
  if has_table_privilege('authenticated', 'public.inspection_no_shows', 'insert')
     or has_table_privilege('authenticated', 'public.inspection_no_shows', 'update') then
    bad := bad || ' [a member can write no-shows directly]';
  end if;
  if has_table_privilege('authenticated', 'public.viewing_reminders', 'select') then
    bad := bad || ' [reminder ledger readable]';
  end if;
  if has_function_privilege('anon', 'public.report_inspection_no_show(uuid, text)', 'execute') then
    bad := bad || ' [anon can report]';
  end if;
  if has_function_privilege('authenticated', 'private.send_member_reminders()', 'execute') then
    bad := bad || ' [reminders callable]';
  end if;
  if bad <> '' then
    raise exception 'READ-BACK FAILED:%', bad;
  end if;
end;
$readback$;
