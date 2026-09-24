-- V-60, SCAM-EXPOSURE RECALL: WHEN AN ACCOUNT IS STOPPED FOR FRAUD, EVERYONE
-- IT TALKED TO IS TOLD.
--
-- A stop protects the renters who come next and says nothing to the ones
-- already in the funnel, who are exactly the people about to transfer. Nigerian
-- fraud runs on the delay between the promise and the discovery; this closes
-- it. For a standing stop, staff can recall: every member who had a
-- conversation or an inspection with the stopped account in the 60 days before
-- the stop (and since) gets a notification and an email: "An account you
-- talked to about Two bedroom flat in Ikeja GRA was stopped for asking people
-- to pay outside Vallo. If you paid them anything, tell us now." The reporter
-- is never named, and nothing names the stopped account either: the listing is
-- the only handle, and it is the recipient's own conversation.
--
-- WHY A SEPARATE, DELIBERATE STEP AND NOT A TRIGGER ON THE STOP. A stop is not
-- always fraud (it can be a document that lapsed), `suspend_agent` records a
-- free-text reason and no category, and a recall is loud. So a recall is
-- possible only when a report IN ONE OF THE TWO FRAUD CATEGORIES against the
-- stopped account was UPHELD (resolved): against one of their listings, a
-- conversation they were in (filed by the other party), or a message they
-- sent. The category is DERIVED from those reports, never chosen at recall
-- time: asking people to pay outside Vallo if any upheld report says so,
-- otherwise breaking Vallo's safety rules. The desk sees "This will tell 14
-- people" first, and confirms. `suspend_agent` is not touched.
--
-- THE REPORT IS THIS STOP'S. Only a report resolved from thirty days before
-- the stop to seven days after it counts, and the desk is shown which one.
--
-- WHO IS TOLD. A conversation counts only if somebody wrote in it; an
-- inspection counts as it is. Each person is pointed at their own
-- conversation with the account, where the report control is, or at their
-- inspections when there was no thread. The words come from the app's
-- dictionary (the send takes the templates), never from this file.
--
--   public.scam_recalls                 one row per recalled stop: category,
--                                       who sent it, when, to how many. At
--                                       most one recall per stop.
--   private.recall_category(stop)       the upheld report this stop rests on:
--                                       its category, id and when it was
--                                       resolved, or no row.
--   private.recall_audience(stop)       the distinct counterparties, each with
--                                       the listing they most recently talked
--                                       about and their conversation, if any.
--   public.scam_recall_preview(stop)    staff: the audience size, the derived
--                                       category, and the recall already sent.
--   public.scam_recall_send(stop, ...)  staff: notifies and queues the email
--                                       (template 'safety.scam_recall') for
--                                       every counterparty, once, audited.
--
-- A LIFTED STOP CANNOT BE RECALLED: "was stopped" would no longer be true.

create table if not exists public.scam_recalls (
  suspension_id uuid primary key references public.agent_suspensions(id) on delete cascade,
  category      text not null check (category in ('off_platform_payment', 'scam')),
  sent_by       uuid not null references auth.users(id),
  sent_at       timestamptz not null default now(),
  recipients    integer not null default 0 check (recipients >= 0)
);

comment on table public.scam_recalls is
  'V-60. A stop for fraud that staff chose to recall: every member who talked to the stopped account in the 60 days before was told. One row per stop.';

revoke all on public.scam_recalls from public, anon, authenticated;
alter table public.scam_recalls enable row level security;
grant all on public.scam_recalls to service_role;

create or replace function private.recall_category(p_suspension uuid)
returns table (category text, report_id uuid, resolved_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select ag.id as agent_id, ag.user_id as stopped, su.suspended_at
      from public.agent_suspensions su join public.agents ag on ag.id = su.agent_id
     where su.id = p_suspension
  )
  /* THE REPORT BEHIND THIS STOP, not any fraud report ever upheld: resolved
     from thirty days before the stop to seven days after it. A report about
     paying outside Vallo wins over a scam report; then the latest. */
  select r.category, r.id, r.resolved_at
    from public.reports r, s
   where r.status = 'resolved'::public.report_status
     and r.category in ('off_platform_payment', 'scam')
     and r.reporter_id <> s.stopped
     and r.resolved_at between s.suspended_at - interval '30 days' and s.suspended_at + interval '7 days'
     and (
       (r.target_type = 'listing' and exists (
          select 1 from public.listings l where l.id::text = r.target_id and l.agent_id = s.agent_id))
       or (r.target_type = 'conversation' and exists (
          select 1 from public.conversations c where c.id::text = r.target_id and s.stopped in (c.guest_id, c.agent_id)))
       or (r.target_type = 'message' and exists (
          select 1 from public.messages m where m.id::text = r.target_id and m.sender_id = s.stopped))
     )
   order by (r.category = 'off_platform_payment') desc, r.resolved_at desc
   limit 1;
$$;

revoke all on function private.recall_category(uuid) from public, anon, authenticated;

create or replace function private.recall_audience(p_suspension uuid)
returns table (user_id uuid, listing_title text, conversation_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select ag.user_id as stopped, su.suspended_at
      from public.agent_suspensions su
      join public.agents ag on ag.id = su.agent_id
     where su.id = p_suspension
  ),
  touch as (
    select case when c.agent_id = s.stopped then c.guest_id else c.agent_id end as uid,
           c.listing_id,
           c.id as conversation_id,
           coalesce(c.last_message_at, c.created_at) as at
      from public.conversations c, s
     where s.stopped in (c.agent_id, c.guest_id)
       and coalesce(c.last_message_at, c.created_at) >= s.suspended_at - interval '60 days'
       /* A thread nobody wrote in is not a conversation anybody had. */
       and exists (select 1 from public.messages m where m.conversation_id = c.id)
    union all
    select case when r.lister_id = s.stopped then r.requester_id else r.lister_id end,
           r.listing_id,
           null::uuid,
           r.created_at
      from public.inspection_requests r, s
     where s.stopped in (r.lister_id, r.requester_id)
       and r.created_at >= s.suspended_at - interval '60 days'
  )
  select distinct on (t.uid) t.uid, l.title,
         (select t2.conversation_id from touch t2 where t2.uid = t.uid and t2.conversation_id is not null
           order by t2.at desc limit 1)
    from touch t
    cross join s
    left join public.listings l on l.id = t.listing_id
   where t.uid is not null and t.uid <> s.stopped
   order by t.uid, t.at desc;
$$;

revoke all on function private.recall_audience(uuid) from public, anon, authenticated;

create or replace function public.scam_recall_preview(p_suspension uuid)
returns table (audience integer, category text, report_id uuid, report_resolved_at timestamptz,
               sent_at timestamptz, sent_to integer, sent_category text, lifted boolean)
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
    select (select count(*)::integer from private.recall_audience(p_suspension)),
           rc.category, rc.report_id, rc.resolved_at,
           r.sent_at, r.recipients, r.category, su.lifted_at is not null
      from public.agent_suspensions su
      left join public.scam_recalls r on r.suspension_id = su.id
      left join lateral private.recall_category(su.id) rc on true
     where su.id = p_suspension;
end;
$$;

comment on function public.scam_recall_preview(uuid) is
  'V-60. Staff: how many people a recall of this stop would tell, the upheld report it rests on (category, id, when it was resolved; null: no recall), and the recall already sent if there was one.';

revoke all on function public.scam_recall_preview(uuid) from public, anon;
grant execute on function public.scam_recall_preview(uuid) to authenticated;

/* The words are the app's, in the dictionary: a title, a body with
   `{listing}` and `{reason}`, a body without the listing, and the two reason
   phrases. The category is derived here, never taken from the caller. */
create or replace function public.scam_recall_send(
  p_suspension uuid,
  p_title text,
  p_body_about text,
  p_body_plain text,
  p_reason_pay text,
  p_reason_rules text,
  p_listing_fallback text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  stop public.agent_suspensions;
  cat text;
  who record;
  told integer := 0;
  reason_words text;
begin
  if actor is null or not (private.has_role(actor, 'admin'::public.app_role)
                           or private.has_role(actor, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_body_about), '') = '' or coalesce(btrim(p_body_plain), '') = ''
     or coalesce(btrim(p_reason_pay), '') = '' or coalesce(btrim(p_reason_rules), '') = ''
     or coalesce(btrim(p_listing_fallback), '') = '' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into stop from public.agent_suspensions where id = p_suspension for update;
  if stop.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if stop.lifted_at is not null then return jsonb_build_object('status', 'lifted'); end if;
  select rc.category into cat from private.recall_category(p_suspension) rc;
  if cat is null then return jsonb_build_object('status', 'no_upheld_report'); end if;

  insert into public.scam_recalls (suspension_id, category, sent_by)
  values (p_suspension, cat, actor)
  on conflict (suspension_id) do nothing;
  if not found then return jsonb_build_object('status', 'already'); end if;

  reason_words := case cat when 'off_platform_payment' then p_reason_pay else p_reason_rules end;

  for who in select * from private.recall_audience(p_suspension) loop
    perform private.notify(
      who.user_id,
      'system'::public.notification_kind,
      p_title,
      /* The thread wording only for somebody who has a thread to open. */
      replace(replace(case when who.conversation_id is not null then p_body_about else p_body_plain end,
                      '{listing}', coalesce(who.listing_title, p_listing_fallback)), '{reason}', reason_words),
      case when who.conversation_id is not null then '/messages/' || who.conversation_id::text else '/inspections' end
    );
    perform private.email_outbox_enqueue(
      who.user_id,
      'safety.scam_recall',
      'scam_recall:' || p_suspension::text || ':' || who.user_id::text,
      jsonb_build_object('listing_title', who.listing_title, 'category', cat,
                         'conversation_id', who.conversation_id)
    );
    told := told + 1;
  end loop;

  update public.scam_recalls set recipients = told where suspension_id = p_suspension;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'stop.recalled', 'agent', stop.agent_id::text,
          jsonb_build_object('suspension_id', p_suspension, 'category', cat, 'recipients', told));

  return jsonb_build_object('status', 'sent', 'recipients', told, 'category', cat);
end;
$$;

comment on function public.scam_recall_send(uuid, text, text, text, text, text, text) is
  'V-60. Staff: when an upheld fraud report stands against a stopped account, tell every member who talked to it in the 60 days before the stop, once, by notification and email, in the app''s words. Never names the reporter or the account. Refuses a lifted stop and a stop with no upheld report.';

revoke all on function public.scam_recall_send(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.scam_recall_send(uuid, text, text, text, text, text, text) to authenticated;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('authenticated', 'public.scam_recalls', 'insert') then bad := bad || ' [a member can write a recall]'; end if;
  if has_function_privilege('authenticated', 'private.recall_audience(uuid)', 'execute') then bad := bad || ' [the audience is readable]'; end if;
  if has_function_privilege('authenticated', 'private.recall_category(uuid)', 'execute') then bad := bad || ' [the category is readable]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
