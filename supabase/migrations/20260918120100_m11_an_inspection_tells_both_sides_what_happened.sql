-- M11. An inspection tells both sides what happened.
--
-- public.inspection_requests has had a state machine since 20260809074952 and
-- has never sent a notification: a lister was asked to show a property and
-- found out by opening their dashboard, a renter was offered another time and
-- found out by luck. docs/research/TWO_MODE_BACKEND_RESEARCH.md section 4.4
-- is the fan-out table; this file is that table on private.notify(), exactly
-- the notify_reservation pattern: Lagos times, silence on anything that is
-- not a state change, kind 'listing' rather than a widened enum.
--
-- It also adds the one honest word for "closed = the deal was done": an
-- `outcome` on COMPLETED (section 4.2). Not a seventh state, which would fork
-- every Record<InspectionState, ...> in the components, but a reason on the
-- state that already means "it happened".

alter table public.inspection_requests
  add column if not exists outcome text
    check (outcome in ('inspected', 'deal_done', 'no_deal'));

comment on column public.inspection_requests.outcome is
  'Why a COMPLETED inspection is complete: inspected (they saw it), deal_done (they took it), no_deal. Null on every other state, and only ever written alongside the move to COMPLETED.';

-- Structural half: an outcome can only sit on a completed row.
alter table public.inspection_requests drop constraint if exists inspection_requests_outcome_on_completed;
alter table public.inspection_requests
  add constraint inspection_requests_outcome_on_completed
  check (outcome is null or state = 'COMPLETED');

-- Transition half: the guard, extended. The live body is reproduced verbatim
-- below with one block added at the top, before the null-caller early return,
-- so the outcome rule holds for the service role too: an outcome is written
-- with the move to COMPLETED or not at all, and never rewritten afterwards.
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

  if old.state in ('DECLINED', 'COMPLETED', 'WITHDRAWN') then
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

  raise exception 'illegal inspection transition % -> %', old.state, new.state
    using errcode = 'check_violation';
end;
$function$;

-- The fan-out. Requester-side hrefs go to /inspections, the page this build
-- gives renters; lister-side hrefs go to the agent queue that already exists.
-- Both are Property-side paths, so there is no side ambiguity to resolve.
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

revoke execute on function private.notify_inspection_change() from public, anon, authenticated;

drop trigger if exists inspection_requests_notify on public.inspection_requests;
create trigger inspection_requests_notify
  after insert or update on public.inspection_requests
  for each row execute function private.notify_inspection_change();
