/*
 * NOTIFICATION LINKS THAT OPENED NOTHING, OR THE WRONG SIDE OF A THREAD.
 *
 * Every body below is the live body read from pg_proc on 28 September 2026,
 * with ONLY the href changed. Nothing else about who is told, or what they are
 * told, moves.
 *
 * 1. EVENTS. `private.notify_event_insert`, `private.notify_event_change` and
 *    `public.close_future_commitments` linked `/events/<id>`. There is no
 *    `/events` route in the app and no redirect for one, so every event
 *    notification (checked, live, removed, cancelled, moved, host closed their
 *    account) opened the not-found page. An event belongs to an Around place
 *    (`events.area_id`, on delete cascade, so never null for a live row), and
 *    `/around/<slug>` is that place's page. The link is now the place, with
 *    `/around` as the fallback if the area cannot be read.
 *
 * 2. MESSAGES. `private.notify_message` linked every recipient to
 *    `/messages/<conversation>`. When the recipient is the conversation's
 *    `agent_id` (the lister or host side), the thread belongs in the agent
 *    workspace at `/agent/messages/<conversation>`, which renders the same
 *    thread inside the agent frame and itself sends anybody without an
 *    agent row back to `/messages/<id>`. So the host side lands in its
 *    workspace and nobody can land somewhere they are not. The guest side is
 *    unchanged.
 *
 * 3. KYC DECISIONS. `private.review_kyc_document` linked `/verify`, which
 *    only resolves through a next.config redirect to `/verification`. It now
 *    links `/verification` directly, the page where a rejected document is
 *    shown with the reviewer's words and can be sent again.
 *
 * The read-back at the foot raises if any of the five bodies still carries an
 * old link or lacks the new one.
 */

create or replace function private.notify_event_insert()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.status = 'HELD' then
    perform private.notify(new.host_id, 'social', 'Your event is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      coalesce((select '/around/' || ar.slug from public.areas ar where ar.id = new.area_id), '/around'));
  end if;
  return new;
end;
$function$;

create or replace function private.notify_event_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  a record;
  place_href text := coalesce((select '/around/' || ar.slug from public.areas ar where ar.id = new.area_id), '/around');
begin
  if new.status = 'CANCELLED' and old.status <> 'CANCELLED' then
    for a in select user_id from public.event_attendees
              where event_id = new.id and state in ('GOING', 'WAITLIST') loop
      perform private.notify(a.user_id, 'social', 'An event you were going to is cancelled',
        new.title || ': ' || coalesce(nullif(btrim(new.cancel_reason), ''), 'the host called it off.'),
        place_href);
    end loop;

  elsif new.status = 'HELD' and old.status <> 'HELD' then
    perform private.notify(new.host_id, 'social', 'Your event is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      place_href);

  elsif new.status = 'LIVE' and old.status = 'HELD' then
    perform private.notify(new.host_id, 'social', 'Your event is live',
      'The check finished and it is showing again.', place_href);

  elsif new.status = 'REMOVED' and new.hidden_by is not null then
    perform private.notify(new.host_id, 'social', 'Your event was removed',
      coalesce(nullif(btrim(new.hold_reason), ''), 'It broke the rules of the place it was posted in.'),
      place_href);

  elsif new.starts_at is distinct from old.starts_at or new.venue_label is distinct from old.venue_label then
    for a in select user_id from public.event_attendees
              where event_id = new.id and state = 'GOING' loop
      perform private.notify(a.user_id, 'social', 'An event you are going to has changed',
        new.title || ' is now at ' || new.venue_label || '.', place_href);
    end loop;
  end if;

  return new;
end;
$function$;

create or replace function private.notify_message()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  recipient uuid;
  recipient_is_agent_side boolean;
begin
  select case when c.guest_id = new.sender_id then c.agent_id else c.guest_id end,
         (c.guest_id = new.sender_id)
  into recipient, recipient_is_agent_side
  from public.conversations c
  where c.id = new.conversation_id;

  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  perform private.notify(recipient, 'message', 'New message',
    left(new.body, 120),
    case when coalesce(recipient_is_agent_side, false)
         then '/agent/messages/' || new.conversation_id
         else '/messages/' || new.conversation_id end);

  return new;
end;
$function$;

create or replace function private.review_kyc_document(acting_admin uuid, p_document uuid, p_approve boolean, p_reason text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  doc public.agent_documents;
  owner_user uuid;
  target_agent uuid;
  rung text;
  all_approved boolean;
begin
  if acting_admin is null or not private.staff_can(acting_admin, 'kyc_review') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if not p_approve and (p_reason is null or char_length(btrim(p_reason)) < 8) then
    return jsonb_build_object('status', 'needs_a_reason');
  end if;

  select * into doc from public.agent_documents where id = p_document for update;
  if doc.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  owner_user := coalesce(
    doc.uploader_id,
    (select a.user_id from public.agent_applications a where a.id = doc.application_id)
  );
  if owner_user = acting_admin then
    return jsonb_build_object('status', 'own_document');
  end if;

  update public.agent_documents
     set review_status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = acting_admin,
         reviewed_at = now(),
         rejection_reason = case when p_approve then null else btrim(p_reason) end
   where id = doc.id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    acting_admin,
    case when p_approve then 'kyc.document.approved' else 'kyc.document.rejected' end,
    'agent_document', doc.id::text,
    jsonb_build_object(
      'kind', doc.kind,
      'subtype', doc.subtype,
      'subject_user', owner_user,
      'reason', case when p_approve then null else btrim(p_reason) end
    )
  );

  rung := case doc.kind when 'identity' then 'identity' when 'address' then 'address' else null end;
  select a.id into target_agent from public.agents a where a.user_id = owner_user;

  if rung is not null and target_agent is not null then
    select bool_and(d.review_status = 'approved')
      into all_approved
      from public.agent_documents d
     where d.kind = doc.kind
       and coalesce(
             d.uploader_id,
             (select a2.user_id from public.agent_applications a2 where a2.id = d.application_id)
           ) = owner_user;

    perform private.record_verification_check(
      target_agent, rung,
      case when coalesce(all_approved, false) then 'passed' else 'pending' end,
      case when coalesce(all_approved, false)
           then 'Documents approved by review.'
           else 'Waiting on a document.' end,
      acting_admin
    );
  end if;

  if owner_user is not null then
    perform private.notify(
      owner_user, 'agent',
      case when p_approve then 'A document was approved' else 'A document needs redoing' end,
      case when p_approve
           then 'One of your verification documents has been accepted.'
           else btrim(p_reason) end,
      '/verification'
    );
  end if;

  return jsonb_build_object('status', 'ok', 'document_id', doc.id, 'approved', p_approve);
end;
$function$;

/*
 * public.close_future_commitments is long and its only change is the event
 * link in section 1, so it is rewritten from its own live definition rather
 * than retyped: the two fragments are replaced, each must occur exactly once,
 * and the result is executed. Its signature, SECURITY DEFINER and empty
 * search_path come across untouched because they are part of the text read.
 */
do $rewrite$
declare
  def text := pg_get_functiondef('public.close_future_commitments(uuid)'::regprocedure);
  old_select constant text := 'select e.id, e.title, a.user_id';
  new_select constant text := 'select e.id, e.title, e.area_id, a.user_id';
  old_href constant text := $$'/events/' || v_row.id::text);$$;
  new_href constant text := $$coalesce((select '/around/' || ar.slug from public.areas ar where ar.id = v_row.area_id), '/around'));$$;
begin
  if (length(def) - length(replace(def, old_select, ''))) / length(old_select) <> 1 then
    raise exception 'close_future_commitments: the event select is not there exactly once';
  end if;
  if (length(def) - length(replace(def, old_href, ''))) / length(old_href) <> 1 then
    raise exception 'close_future_commitments: the /events/ link is not there exactly once';
  end if;
  execute replace(replace(def, old_select, new_select), old_href, new_href);
end;
$rewrite$;

/* Read-back. */
do $check$
declare
  f text;
  d text;
begin
  foreach f in array array[
    'private.notify_event_insert()',
    'private.notify_event_change()',
    'public.close_future_commitments(uuid)'
  ] loop
    d := pg_get_functiondef(f::regprocedure);
    if d like '%/events/%' then
      raise exception '%: still links /events/', f;
    end if;
    if d not like '%''/around/'' || ar.slug%' then
      raise exception '%: does not link the event''s place', f;
    end if;
  end loop;

  d := pg_get_functiondef('private.notify_message()'::regprocedure);
  if d not like '%''/agent/messages/'' || new.conversation_id%'
     or d not like '%''/messages/'' || new.conversation_id%' then
    raise exception 'notify_message: the two-sided link is not there';
  end if;

  d := pg_get_functiondef('private.review_kyc_document(uuid, uuid, boolean, text)'::regprocedure);
  if d like '%''/verify''%' or d not like '%''/verification''%' then
    raise exception 'review_kyc_document: still links /verify';
  end if;

  select pg_get_functiondef('public.close_future_commitments(uuid)'::regprocedure) into d;
  if d not like '%SECURITY DEFINER%' or d not like '%search_path TO ''''%' then
    raise exception 'close_future_commitments: lost its security definer or its empty search_path';
  end if;
end;
$check$;
