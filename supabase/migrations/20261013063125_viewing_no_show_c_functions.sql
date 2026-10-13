-- Applied 13 October 2026, part of the viewing no-show and both-sides reminders migration (founder decisions, round 2).
-- Dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

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
