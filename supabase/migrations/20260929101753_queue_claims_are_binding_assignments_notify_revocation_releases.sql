-- QUEUE CLAIMS ARE BINDING (29 September 2026).
--
-- A claim (public.queue_claims, 30 idle minutes) said who was working an item
-- but nothing checked it: two staff could decide the same report, and the
-- claim UI was the only thing that knew. Now:
--
--  1. A decision on a claimed item by anybody other than the live claim holder
--     is refused, in the database, whichever client wrote it. A "decision" is
--     the moment the row's reviewer column or decision time is written, so a
--     lister withdrawing their own listing, or a reporter's row changing for any
--     other reason, is never blocked. Staff replies on a claimed support ticket
--     follow the same rule. An unclaimed item, or a lapsed claim, is open to
--     any holder of the scope, as before.
--  2. Assigning an item to somebody tells them, in the app, with a link to it.
--  3. Revoking a staff member's access releases every claim they hold, so their
--     work is free for the team at once rather than after 30 minutes.

create or replace function private.decision_respects_claim()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_kind   text := tg_argv[0];
  v_actor  text := tg_argv[1];
  v_item   text := tg_argv[2];
  v_when   text := tg_argv[3];
  n        jsonb := to_jsonb(new);
  o        jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  actor    uuid;
  holder   uuid;
begin
  actor := nullif(n ->> v_actor, '')::uuid;
  if actor is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and (n ->> v_actor) is not distinct from (o ->> v_actor)
     and (v_when = '' or (n ->> v_when) is not distinct from (o ->> v_when)) then
    return new;
  end if;
  if tg_table_name = 'support_ticket_messages' and coalesce(n ->> 'sender_role', '') <> 'admin' then
    return new;
  end if;
  select c.claimed_by into holder
    from public.queue_claims c
   where c.kind = v_kind
     and c.item_id = (n ->> v_item)::uuid
     and c.touched_at > now() - interval '30 minutes';
  if holder is not null and holder <> actor then
    raise exception 'Somebody else has claimed this item. Ask them to release it, or wait until their claim lapses.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.decision_respects_claim() from public, anon, authenticated;

drop trigger if exists listings_02_claim on public.listings;
create trigger listings_02_claim before update of reviewer_id, reviewed_at on public.listings
  for each row execute function private.decision_respects_claim('listing', 'reviewer_id', 'id', 'reviewed_at');

drop trigger if exists agent_applications_02_claim on public.agent_applications;
create trigger agent_applications_02_claim before update of reviewer_id, reviewed_at on public.agent_applications
  for each row execute function private.decision_respects_claim('application', 'reviewer_id', 'id', 'reviewed_at');

drop trigger if exists reports_02_claim on public.reports;
create trigger reports_02_claim before update of resolved_by, resolved_at, status on public.reports
  for each row execute function private.decision_respects_claim('report', 'resolved_by', 'id', 'status');

drop trigger if exists message_flags_02_claim on public.message_flags;
create trigger message_flags_02_claim before update of reviewed_by, status on public.message_flags
  for each row execute function private.decision_respects_claim('flag', 'reviewed_by', 'id', 'status');

drop trigger if exists support_ticket_messages_02_claim on public.support_ticket_messages;
create trigger support_ticket_messages_02_claim before insert on public.support_ticket_messages
  for each row execute function private.decision_respects_claim('ticket', 'sender_id', 'ticket_id', '');

-- 2. An assignment tells the assignee.
do $$
declare
  def text := pg_get_functiondef('public.queue_assign(text,uuid,uuid,uuid)'::regprocedure);
  anchor text := '  return jsonb_build_object(''status'', ''ok'');
end;';
begin
  if position(anchor in def) = 0 then
    raise exception 'queue_assign: end not found';
  end if;
  execute replace(def, anchor,
'  if p_to <> actor then
    perform private.notify(p_to, ''system''::public.notification_kind,
      ''Work assigned to you'',
      ''A '' || case p_kind when ''listing'' then ''listing'' when ''application'' then ''verification''
                          when ''report'' then ''report'' when ''ticket'' then ''support ticket''
                          else ''message flag'' end || '' was assigned to you. It is yours for the next 30 minutes.'',
      case p_kind when ''listing'' then ''/admin/listings/'' || p_item::text
                  when ''application'' then ''/admin/agents''
                  when ''report'' then ''/admin/queue?tab=reports''
                  when ''ticket'' then ''/admin/support?ticket='' || p_item::text
                  else ''/admin/queue?tab=flags'' end);
  end if;
' || anchor);
end $$;

-- 3. Revoking access releases the person's claims.
do $$
declare
  def text := pg_get_functiondef('public.admin_revoke_staff(uuid,text)'::regprocedure);
  anchor text := '  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, ''staff.revoke''';
begin
  if position(anchor in def) = 0 then
    raise exception 'admin_revoke_staff: anchor not found';
  end if;
  execute replace(def, anchor, '  delete from public.queue_claims where claimed_by = p_user;
' || anchor);
end $$;

do $$
begin
  if pg_get_functiondef('public.queue_assign(text,uuid,uuid,uuid)'::regprocedure) not like '%Work assigned to you%' then
    raise exception 'assign notice missing';
  end if;
  if pg_get_functiondef('public.admin_revoke_staff(uuid,text)'::regprocedure) not like '%delete from public.queue_claims where claimed_by = p_user%' then
    raise exception 'revoke release missing';
  end if;
end $$;
