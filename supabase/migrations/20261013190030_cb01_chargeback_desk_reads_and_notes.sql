-- Applied 13 October 2026. CHARGEBACKS DESK 1 of 1 (track/chargebacks, 13 Oct 2026).
-- Needs 20261006093655_chargebacks_record_state_recovery_and_payout_hold.
-- Probe: supabase/tests/probes-pending/cb01-chargeback-desk.sql
--
-- The chargeback backend (6 October) has a desk read (staff_chargebacks) and
-- two writes (chargeback_open, chargeback_move), and no app role holds any
-- privilege on either table, service_role included. Three things the desk and
-- the lister's money screens need could therefore not be read at all:
--
--  1. public.staff_chargeback_events(chargeback): the TIMELINE. Every event
--     row of one chargeback, oldest first, with the note (the evidence and the
--     reasons staff gave), the recovery state and the evidence deadline each
--     one set, and whether a raw processor payload is stored (`has_raw`, never
--     the payload itself: it can carry the card holder's details). Finance
--     staff only, the exact check staff_chargebacks makes: an admin or super
--     admin, or a staff grant holding `finance` with the current handbook
--     acknowledged, on a session that proved its security key
--     (private.staff_can). Anybody else gets insufficient_privilege.
--
--  2. public.chargeback_add_note(chargeback, note): an EVIDENCE NOTE. A move
--     that changes nothing returns `noop` and writes nothing, so until now
--     there was no way to put "receipt and check-in photos sent to Paystack"
--     on the record without moving the state. A note is an append-only event
--     of a new kind, `note` (the kind check is widened to allow it; to_state
--     and from_state are the state it was written in), with an audit_log row
--     `chargeback.noted`. Finance staff only (not the service role: a note is
--     a person's). 12 to 2000 characters, the same 12-character floor the
--     reversals use for a reason.
--
--  3. public.my_chargeback_hold(): THE LISTER'S OWN VIEW of the payout rule.
--     public.lister_chargeback_hold(uuid) stays service-role only; this is the
--     signed-in person's own answer, never anybody else's: whether a hold
--     applies (a LOST chargeback whose recovery is still `owed`, the same
--     predicate), how much is owed in total (amount less what was recovered),
--     the currency, how many, since when, and how many disputes on their
--     payments are still undecided (which hold nothing). No reference, no
--     payer, no processor detail.
--
-- Additive: one constraint widened (a superset of the old list), three
-- functions via create or replace. Nothing is removed. A read-back block at
-- the end raises if anything did not land.
set lock_timeout = '5s';

-- 1. A note is an event kind.
alter table public.chargeback_events drop constraint if exists chargeback_events_kind_check;
alter table public.chargeback_events add constraint chargeback_events_kind_check
  check (kind in ('opened', 'transition', 'status_only', 'refreshed', 'note'));

-- 2. The timeline.
create or replace function public.staff_chargeback_events(p_chargeback uuid)
returns table (id uuid, kind text, from_state text, to_state text, recovery text, recovered_minor bigint,
               evidence_due_at timestamptz, actor_id uuid, note text, has_raw boolean, created_at timestamptz)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if not coalesce(private.staff_can(auth.uid(), 'finance'), false) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  return query
    select e.id, e.kind, e.from_state, e.to_state, e.recovery, e.recovered_minor, e.evidence_due_at,
           e.actor_id, e.note, e.raw is not null, e.created_at
      from public.chargeback_events e
     where e.chargeback_id = p_chargeback
     -- The opening event first even when a later one shares its timestamp
     -- (one transaction, as the intake's own retry handling can produce).
     order by e.created_at, (e.kind <> 'opened'), e.id;
end;
$function$;

-- 3. An evidence note.
create or replace function public.chargeback_add_note(p_chargeback uuid, p_note text)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  cb    public.chargebacks%rowtype;
  body  text := btrim(coalesce(p_note, ''));
  ev    uuid;
begin
  if not coalesce(private.staff_can(auth.uid(), 'finance'), false) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if length(body) < 12 or length(body) > 2000 then
    return jsonb_build_object('status', 'reason_needed');
  end if;
  -- The same row lock chargeback_move takes, so a note is never written
  -- against a state a concurrent move is changing.
  select * into cb from public.chargebacks where id = p_chargeback for update;
  if cb.id is null then
    return jsonb_build_object('status', 'gone');
  end if;
  insert into public.chargeback_events (chargeback_id, kind, from_state, to_state, recovery, actor_id, note)
  values (cb.id, 'note', cb.state, cb.state, cb.recovery_state, auth.uid(), body)
  returning id into ev;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'chargeback.noted', 'chargeback', cb.id::text,
          jsonb_build_object('event_id', ev, 'state', cb.state, 'length', length(body), 'via', 'staff'));
  return jsonb_build_object('status', 'ok', 'event_id', ev);
end;
$function$;

-- 4. The lister's own view of the payout rule.
create or replace function public.my_chargeback_hold()
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  with me as (select (select auth.uid()) as id),
  held as (
    select c.amount_minor - c.recovered_minor as owed, c.currency, c.closed_at
      from public.chargebacks c, me
     where me.id is not null and c.lister_user_id = me.id
       and c.state = 'lost' and c.recovery_state = 'owed'
  ),
  undecided as (
    select count(*) as n
      from public.chargebacks c, me
     where me.id is not null and c.lister_user_id = me.id
       and c.state in ('opened', 'evidence_requested', 'evidence_submitted')
  )
  select jsonb_build_object(
    'held', (select count(*) from held) > 0,
    'count', (select count(*) from held),
    'owed_minor', (select coalesce(sum(owed), 0) from held),
    'currency', (select min(currency) from held),
    'since', (select min(closed_at) from held),
    'open_count', (select n from undecided));
$function$;

revoke all on function public.staff_chargeback_events(uuid) from public, anon;
revoke all on function public.chargeback_add_note(uuid, text) from public, anon;
revoke all on function public.my_chargeback_hold() from public, anon;
grant execute on function public.staff_chargeback_events(uuid) to authenticated;
grant execute on function public.chargeback_add_note(uuid, text) to authenticated;
grant execute on function public.my_chargeback_hold() to authenticated;

do $check$
begin
  if (select pg_get_constraintdef(oid) from pg_constraint
       where conrelid = 'public.chargeback_events'::regclass and conname = 'chargeback_events_kind_check') not like '%note%' then
    raise exception 'chargeback_events kind check does not allow note';
  end if;
  if to_regprocedure('public.staff_chargeback_events(uuid)') is null
     or to_regprocedure('public.chargeback_add_note(uuid,text)') is null
     or to_regprocedure('public.my_chargeback_hold()') is null then
    raise exception 'a chargeback desk function is missing';
  end if;
  if not (select bool_and(prosecdef) from pg_proc
           where oid in ('public.staff_chargeback_events(uuid)'::regprocedure,
                         'public.chargeback_add_note(uuid,text)'::regprocedure,
                         'public.my_chargeback_hold()'::regprocedure)) then
    raise exception 'a chargeback desk function is not a definer';
  end if;
  if has_function_privilege('anon', 'public.staff_chargeback_events(uuid)', 'execute')
     or has_function_privilege('anon', 'public.chargeback_add_note(uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.my_chargeback_hold()', 'execute') then
    raise exception 'chargeback desk grants are too wide';
  end if;
  -- The tables stay closed to every app role.
  if has_table_privilege('authenticated', 'public.chargeback_events', 'select')
     or has_table_privilege('service_role', 'public.chargeback_events', 'insert') then
    raise exception 'chargeback_events opened to an app role';
  end if;
end;
$check$;
