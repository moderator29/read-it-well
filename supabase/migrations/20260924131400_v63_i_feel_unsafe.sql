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
--     one row per hold: who is held, who filed, the report, when, and when a
--     moderator cleared it. While a hold is open, the held person can neither
--     request an inspection nor receive a new request on their listings: a
--     trigger on `inspection_requests` refuses the insert (the app says so
--     first). Four hours is the promise; a moderator clears it with
--     `public.clear_safety_hold`, audited.
--
-- WHAT IS NOT HERE. "Cancels any pending inspection without notifying the
-- other side until a moderator has looked" needs the inspection notification
-- trigger (`notify_inspection_change`, audit-owned) to hold its message; a
-- withdrawal today tells the lister at once. So pending inspections are left
-- as they are, and the moderator, who is told by the report on the four-hour
-- clock, withdraws them. Recorded as partial.
--
-- ABUSE. A hold is a lever: one report freezes an agent's new inspection
-- requests until a moderator looks. It takes being a real party to a real
-- conversation or inspection with them, a person can hold the same
-- counterpart once, and the four-hour clock bounds it.

create table if not exists private.safety_holds (
  id          uuid primary key default gen_random_uuid(),
  held_id     uuid not null references auth.users(id) on delete cascade,
  filed_by    uuid not null references auth.users(id) on delete cascade,
  report_id   uuid references public.reports(id) on delete set null,
  created_at  timestamptz not null default now(),
  cleared_at  timestamptz,
  cleared_by  uuid references auth.users(id),
  constraint safety_holds_not_self check (held_id <> filed_by)
);

comment on table private.safety_holds is
  'V-63. While a hold is open (cleared_at null), the held person cannot request an inspection or receive a new one. Opened by "I feel unsafe", cleared by a moderator.';

create unique index if not exists safety_holds_one_open_per_pair
  on private.safety_holds (held_id, filed_by) where cleared_at is null;
create index if not exists safety_holds_open_idx on private.safety_holds (held_id) where cleared_at is null;

revoke all on private.safety_holds from public, anon, authenticated;
grant all on private.safety_holds to service_role;

/* Is this person on an open hold? For the app's courtesy check and the trigger. */
create or replace function public.safety_hold_open(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.safety_holds h where h.held_id = p_user and h.cleared_at is null);
$$;

comment on function public.safety_hold_open(uuid) is
  'V-63. True while a moderator has not cleared a safety hold on this person. Answers only yes or no; never who filed it.';

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
begin
  if me is null then return jsonb_build_object('status', 'signed_out'); end if;

  if p_conversation is not null then
    select case when c.guest_id = me then c.agent_id else c.guest_id end, c.listing_id
      into other, listing
      from public.conversations c
     where c.id = p_conversation and me in (c.guest_id, c.agent_id);
    v_target_type := 'conversation';
    v_target_id := p_conversation::text;
  elsif p_inspection is not null then
    select case when r.requester_id = me then r.lister_id else r.requester_id end, r.listing_id,
           r.conversation_id
      into other, listing, p_conversation
      from public.inspection_requests r
     where r.id = p_inspection and me in (r.requester_id, r.lister_id);
    v_target_type := case when p_conversation is not null then 'conversation' else 'listing' end;
    v_target_id := coalesce(p_conversation::text, listing::text);
  end if;
  if other is null then return jsonb_build_object('status', 'not_a_party'); end if;

  /* One open report per reporter per target (`reports_one_open_per_target`):
     a person who already reported this thread for something else has that
     report raised to `unsafe`, which moves it onto the four-hour clock. */
  begin
    insert into public.reports (reporter_id, target_type, target_id, category, reason)
    values (me, v_target_type, v_target_id, 'unsafe', 'Filed from "I feel unsafe".')
    returning id into report;
  exception when unique_violation then
    update public.reports r set category = 'unsafe'
     where r.reporter_id = me and r.target_type = v_target_type and r.target_id = v_target_id
       and r.status in ('open'::public.report_status, 'reviewing'::public.report_status)
    returning r.id into report;
  end;

  if p_block then
    insert into public.blocks (user_id, other_id) values (me, other) on conflict do nothing;
  end if;

  insert into private.safety_holds (held_id, filed_by, report_id)
  values (other, me, report)
  on conflict (held_id, filed_by) where cleared_at is null do nothing;

  return jsonb_build_object('status', 'filed', 'report_id', report, 'blocked', coalesce(p_block, false));
end;
$$;

comment on function public.feel_unsafe(uuid, uuid, boolean) is
  'V-63. For a party to a conversation or inspection: files an unsafe report (four-hour clock), blocks the other person when asked, and holds their inspection requests until a moderator clears it. Tells the other side nothing.';

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

/* The hold, enforced where the request is written. */
create or replace function private.refuse_held_inspection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.safety_holds h
              where h.cleared_at is null and h.held_id in (new.requester_id, new.lister_id)) then
    raise exception 'inspection requests are paused while Vallo looks at a safety report'
      using errcode = 'P0001', hint = 'safety_hold';
  end if;
  return new;
end;
$$;

revoke all on function private.refuse_held_inspection() from public, anon, authenticated;

/* Named to sort after `inspection_requests_set_lister`, which fills lister_id. */
drop trigger if exists inspection_requests_z_safety_hold on public.inspection_requests;
create trigger inspection_requests_z_safety_hold
  before insert on public.inspection_requests
  for each row execute function private.refuse_held_inspection();

do $readback$
declare bad text := '';
begin
  if has_table_privilege('authenticated', 'private.safety_holds', 'select') then bad := bad || ' [holds are readable]'; end if;
  if has_function_privilege('anon', 'public.feel_unsafe(uuid, uuid, boolean)', 'execute') then bad := bad || ' [anon can file]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
