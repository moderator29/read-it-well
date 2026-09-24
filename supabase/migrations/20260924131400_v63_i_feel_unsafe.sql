-- V-63, "I FEEL UNSAFE": ONE CONTROL IN EVERY THREAD AND ON EVERY INSPECTION.
--
-- Report, block and mute exist. What did not is a path for the moment of fear,
-- when a person does not want to choose a report category. One sheet, four
-- actions in order: call 112, leave and block, tell Vallo, tell someone. This
-- file is the database half of the middle two:
--
--   public.feel_unsafe(conversation, inspection, block)
--     for a PARTY to that conversation or inspection only. Files a report as
--     `unsafe` (the four-hour clock in lib/trust/standards.ts), blocks the
--     other person when asked, and puts the other person on a SAFETY HOLD.
--     Answers with the report id. Never tells the other side anything.
--   private.safety_holds
--     one row per hold: who is held, who filed, the report, when, when it
--     lapses, and when a moderator cleared it. While a hold is open the HELD
--     PERSON cannot REQUEST an inspection of the FILER'S listings (a trigger
--     refuses the insert; the app says so first). It does not follow them to
--     anybody else's. Nothing stops anyone RECEIVING a request: a hold on
--     an agent's inbound requests would let one report shut an agent's
--     business, which is the lever V-63 must not hand anybody.
--     A hold lapses after 72 hours unless a moderator extends it
--     (`extend_safety_hold`), and a moderator clears it early
--     (`clear_safety_hold`); both audited, both on the moderation lane
--     (`open_safety_holds`).
--
-- WHAT IS NOT HERE. "Cancels any pending inspection without notifying the
-- other side until a moderator has looked" needs the inspection notification
-- trigger (`notify_inspection_change`, audit-owned) to hold its message; a
-- withdrawal today tells the lister at once. So pending inspections are left
-- as they are, and the moderator, who is told by the report on the four-hour
-- clock, withdraws them. Recorded as partial.
--
-- ABUSE. A hold needs the filer to have SENT at least one message in that
-- conversation (or, from an inspection with no thread, to be a party to a
-- confirmed or completed inspection): a sock that has only ever opened a
-- thread files a report and holds nobody. One open hold per pair, 72 hours,
-- and a moderator lane to clear it bound the rest. Escalating an open report
-- to `unsafe` raises a HIGH risk alert, because nothing else would wake the
-- desk for a report that already existed.

create table if not exists private.safety_holds (
  id          uuid primary key default gen_random_uuid(),
  held_id     uuid not null references auth.users(id) on delete cascade,
  filed_by    uuid not null references auth.users(id) on delete cascade,
  report_id   uuid references public.reports(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '72 hours',
  cleared_at  timestamptz,
  cleared_by  uuid references auth.users(id),
  constraint safety_holds_not_self check (held_id <> filed_by)
);

comment on table private.safety_holds is
  'V-63. While a hold is open (not cleared, not lapsed), the held person cannot request an inspection. Never stops anyone receiving one. Opened by "I feel unsafe", lapses after 72 hours unless extended, cleared by a moderator.';

create unique index if not exists safety_holds_one_open_per_pair
  on private.safety_holds (held_id, filed_by) where cleared_at is null;
create index if not exists safety_holds_open_idx on private.safety_holds (held_id, expires_at) where cleared_at is null;

revoke all on private.safety_holds from public, anon, authenticated;
grant all on private.safety_holds to service_role;

/* The one definition of an open hold: THIS person held against THIS lister,
   the one who filed it. Private: nobody may ask it about somebody else. */
create or replace function private.has_open_safety_hold(p_user uuid, p_lister uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.safety_holds h
                  where h.held_id = p_user and h.filed_by = p_lister
                    and h.cleared_at is null and h.expires_at > now());
$$;

revoke all on function private.has_open_safety_hold(uuid, uuid) from public, anon, authenticated;

/* Am I held against the lister of this listing? Answers for the caller only,
   so it cannot be used to learn whether somebody else was reported. */
create or replace function public.safety_hold_open(p_listing uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.has_open_safety_hold(
           (select auth.uid()),
           (select a.user_id from public.listings l join public.agents a on a.id = l.agent_id where l.id = p_listing)), false);
$$;

comment on function public.safety_hold_open(uuid) is
  'V-63. True while the caller is on an open safety hold filed by the lister of this listing. Never answers about anybody else.';

revoke all on function public.safety_hold_open(uuid) from public, anon;
grant execute on function public.safety_hold_open(uuid) to authenticated;

create or replace function public.feel_unsafe(p_conversation uuid, p_inspection uuid, p_block boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  other uuid;
  listing uuid;
  v_target_type text;
  v_target_id text;
  report uuid;
  escalated boolean := false;
  previous text;
  may_hold boolean := false;
  held boolean := false;
begin
  if me is null then return jsonb_build_object('status', 'signed_out'); end if;

  if p_conversation is not null then
    select case when c.guest_id = me then c.agent_id else c.guest_id end, c.listing_id
      into other, listing
      from public.conversations c
     where c.id = p_conversation and me in (c.guest_id, c.agent_id);
    v_target_type := 'conversation';
    v_target_id := p_conversation::text;
    /* The filer has to have said something in this thread to hold anybody. */
    may_hold := exists (select 1 from public.messages m where m.conversation_id = p_conversation and m.sender_id = me);
  elsif p_inspection is not null then
    select case when r.requester_id = me then r.lister_id else r.requester_id end, r.listing_id,
           r.conversation_id,
           r.state in ('CONFIRMED'::public.inspection_state, 'COMPLETED'::public.inspection_state)
      into other, listing, p_conversation, may_hold
      from public.inspection_requests r
     where r.id = p_inspection and me in (r.requester_id, r.lister_id);
    v_target_type := case when p_conversation is not null then 'conversation' else 'listing' end;
    v_target_id := coalesce(p_conversation::text, listing::text);
  end if;
  if other is null then return jsonb_build_object('status', 'not_a_party'); end if;

  /* One open report per reporter per target (`reports_one_open_per_target`):
     a person who already reported this thread for something else has that
     report raised to `unsafe`, which moves it onto the four-hour clock, and
     staff are woken with a high alert because no new row will. */
  begin
    insert into public.reports (reporter_id, target_type, target_id, category, reason)
    values (me, v_target_type, v_target_id, 'unsafe', 'Filed from "I feel unsafe".')
    returning id into report;
  exception when unique_violation then
    select r.category into previous from public.reports r
     where r.reporter_id = me and r.target_type = v_target_type and r.target_id = v_target_id
       and r.status in ('open'::public.report_status, 'reviewing'::public.report_status)
     limit 1;
    update public.reports r set category = 'unsafe'
     where r.reporter_id = me and r.target_type = v_target_type and r.target_id = v_target_id
       and r.status in ('open'::public.report_status, 'reviewing'::public.report_status)
    returning r.id into report;
    /* Only a real raise wakes the desk: pressing again on a report that is
       already unsafe changes nothing. */
    escalated := report is not null and previous is distinct from 'unsafe';
  end;
  if escalated then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high'::public.alert_severity, 'open'::public.alert_status,
            'A report was raised to unsafe',
            'Somebody pressed "I feel unsafe" on a thread they had already reported. The report is now on the four-hour clock.',
            'report', report::text);
  end if;

  if p_block then
    insert into public.blocks (user_id, other_id) values (me, other) on conflict do nothing;
  end if;

  if may_hold then
    /* A lapsed hold for this pair is closed first, so a new one can open. */
    update private.safety_holds set cleared_at = expires_at
     where held_id = other and filed_by = me and cleared_at is null and expires_at <= now();
    insert into private.safety_holds (held_id, filed_by, report_id)
    values (other, me, report)
    on conflict (held_id, filed_by) where cleared_at is null do nothing;
    held := true;
  end if;

  return jsonb_build_object('status', 'filed', 'report_id', report, 'blocked', coalesce(p_block, false), 'held', held);
end;
$$;

comment on function public.feel_unsafe(uuid, uuid, boolean) is
  'V-63. For a party to a conversation or inspection: files an unsafe report (four-hour clock), blocks the other person when asked, and, when the filer has sent a message there or has a confirmed inspection with them, pauses that person''s own inspection requests for 72 hours or until a moderator clears it. Never names the filer.';

revoke all on function public.feel_unsafe(uuid, uuid, boolean) from public, anon;
grant execute on function public.feel_unsafe(uuid, uuid, boolean) to authenticated;

create or replace function public.clear_safety_hold(p_hold uuid, p_note text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  held uuid;
begin
  if actor is null or not (private.has_role(actor, 'admin'::public.app_role)
                           or private.has_role(actor, 'super_admin'::public.app_role)) then
    return 'forbidden';
  end if;
  update private.safety_holds set cleared_at = now(), cleared_by = actor
   where id = p_hold and cleared_at is null
  returning held_id into held;
  if held is null then return 'not_found'; end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'safety_hold.cleared', 'user', held::text, jsonb_build_object('hold_id', p_hold, 'note', left(coalesce(p_note, ''), 500)));
  return 'cleared';
end;
$$;

comment on function public.clear_safety_hold(uuid, text) is
  'V-63. Staff clear a safety hold after looking, audited.';

revoke all on function public.clear_safety_hold(uuid, text) from public, anon;
grant execute on function public.clear_safety_hold(uuid, text) to authenticated;

create or replace function public.extend_safety_hold(p_hold uuid, p_note text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  held uuid;
begin
  if actor is null or not (private.has_role(actor, 'admin'::public.app_role)
                           or private.has_role(actor, 'super_admin'::public.app_role)) then
    return 'forbidden';
  end if;
  update private.safety_holds set expires_at = greatest(expires_at, now()) + interval '72 hours'
   where id = p_hold and cleared_at is null
  returning held_id into held;
  if held is null then return 'not_found'; end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'safety_hold.extended', 'user', held::text, jsonb_build_object('hold_id', p_hold, 'note', left(coalesce(p_note, ''), 500)));
  return 'extended';
end;
$$;

comment on function public.extend_safety_hold(uuid, text) is
  'V-63. Staff extend a safety hold by 72 hours from now or from its current end, audited.';

revoke all on function public.extend_safety_hold(uuid, text) from public, anon;
grant execute on function public.extend_safety_hold(uuid, text) to authenticated;

/* The moderation lane's list: open holds, soonest to lapse first. */
create or replace function public.open_safety_holds()
returns table (id uuid, held_id uuid, held_name text, report_id uuid, created_at timestamptz, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role)) then
    return;
  end if;
  return query
    select h.id, h.held_id,
           coalesce((select p.display_name from public.profiles p where p.id = h.held_id), 'A member'),
           h.report_id, h.created_at, h.expires_at
      from private.safety_holds h
     where h.cleared_at is null and h.expires_at > now()
     order by h.expires_at
     limit 200;
end;
$$;

comment on function public.open_safety_holds() is
  'V-63. Staff: the open safety holds, soonest to lapse first, for the moderation lane.';

revoke all on function public.open_safety_holds() from public, anon;
grant execute on function public.open_safety_holds() to authenticated;

/* The hold, enforced where the request is written. */
create or replace function private.refuse_held_inspection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  /* The requester, and only toward the lister who filed the hold. A hold never
     stops anybody receiving a request, and never follows the held person to
     other listers. */
  if private.has_open_safety_hold(new.requester_id, new.lister_id) then
    raise exception 'inspection requests are paused while Vallo looks at a safety report'
      using errcode = 'P0001', hint = 'safety_hold';
  end if;
  return new;
end;
$$;

revoke all on function private.refuse_held_inspection() from public, anon, authenticated;

drop trigger if exists inspection_requests_z_safety_hold on public.inspection_requests;
create trigger inspection_requests_z_safety_hold
  before insert on public.inspection_requests
  for each row execute function private.refuse_held_inspection();

do $readback$
declare bad text := '';
begin
  if has_table_privilege('authenticated', 'private.safety_holds', 'select') then bad := bad || ' [holds are readable]'; end if;
  if has_function_privilege('anon', 'public.feel_unsafe(uuid, uuid, boolean)', 'execute') then bad := bad || ' [anon can file]'; end if;
  if has_function_privilege('authenticated', 'private.has_open_safety_hold(uuid, uuid)', 'execute') then bad := bad || ' [holds can be tested for anyone]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
