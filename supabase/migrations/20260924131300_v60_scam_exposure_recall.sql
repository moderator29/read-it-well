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
-- free-text reason and no category, and a recall is loud. So the desk chooses
-- the category (asking people to pay outside Vallo, or a scam), sees "This
-- will tell 14 people" first, and confirms. `suspend_agent` is not touched.
--
--   public.scam_recalls                 one row per recalled stop: category,
--                                       who sent it, when, to how many. At
--                                       most one recall per stop.
--   private.recall_audience(stop)       the distinct counterparties, each with
--                                       the title of the listing they most
--                                       recently talked about.
--   public.scam_recall_preview(stop)    staff: the audience size, and the
--                                       recall already sent, if one was.
--   public.scam_recall_send(stop, cat)  staff: notifies and queues the email
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

create or replace function private.recall_audience(p_suspension uuid)
returns table (user_id uuid, listing_title text)
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
           coalesce(c.last_message_at, c.created_at) as at
      from public.conversations c, s
     where s.stopped in (c.agent_id, c.guest_id)
       and coalesce(c.last_message_at, c.created_at) >= s.suspended_at - interval '60 days'
    union all
    select case when r.lister_id = s.stopped then r.requester_id else r.lister_id end,
           r.listing_id,
           r.created_at
      from public.inspection_requests r, s
     where s.stopped in (r.lister_id, r.requester_id)
       and r.created_at >= s.suspended_at - interval '60 days'
  )
  select distinct on (t.uid) t.uid, l.title
    from touch t
    cross join s
    left join public.listings l on l.id = t.listing_id
   where t.uid is not null and t.uid <> s.stopped
   order by t.uid, t.at desc;
$$;

revoke all on function private.recall_audience(uuid) from public, anon, authenticated;

create or replace function public.scam_recall_preview(p_suspension uuid)
returns table (audience integer, sent_at timestamptz, sent_to integer, category text, lifted boolean)
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
           r.sent_at, r.recipients, r.category, su.lifted_at is not null
      from public.agent_suspensions su
      left join public.scam_recalls r on r.suspension_id = su.id
     where su.id = p_suspension;
end;
$$;

comment on function public.scam_recall_preview(uuid) is
  'V-60. Staff: how many people a recall of this stop would tell, and the recall already sent if there was one.';

revoke all on function public.scam_recall_preview(uuid) from public, anon;
grant execute on function public.scam_recall_preview(uuid) to authenticated;

create or replace function public.scam_recall_send(p_suspension uuid, p_category text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  stop public.agent_suspensions;
  who record;
  told integer := 0;
  reason_words text;
begin
  if actor is null or not (private.has_role(actor, 'admin'::public.app_role)
                           or private.has_role(actor, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_category not in ('off_platform_payment', 'scam') then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into stop from public.agent_suspensions where id = p_suspension for update;
  if stop.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if stop.lifted_at is not null then return jsonb_build_object('status', 'lifted'); end if;

  insert into public.scam_recalls (suspension_id, category, sent_by)
  values (p_suspension, p_category, actor)
  on conflict (suspension_id) do nothing;
  if not found then return jsonb_build_object('status', 'already'); end if;

  reason_words := case p_category
    when 'off_platform_payment' then 'for asking people to pay outside Vallo'
    else 'for a scam'
  end;

  for who in select * from private.recall_audience(p_suspension) loop
    perform private.notify(
      who.user_id,
      'system'::public.notification_kind,
      'An account you talked to has been stopped',
      'An account you talked to'
        || case when who.listing_title is not null then ' about ' || who.listing_title else '' end
        || ' was stopped by Vallo ' || reason_words
        || '. If you paid them anything, tell us now. Here is what to do next.',
      '/safety'
    );
    perform private.email_outbox_enqueue(
      who.user_id,
      'safety.scam_recall',
      'scam_recall:' || p_suspension::text || ':' || who.user_id::text,
      jsonb_build_object('listing_title', who.listing_title, 'category', p_category)
    );
    told := told + 1;
  end loop;

  update public.scam_recalls set recipients = told where suspension_id = p_suspension;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'stop.recalled', 'agent', stop.agent_id::text,
          jsonb_build_object('suspension_id', p_suspension, 'category', p_category, 'recipients', told));

  return jsonb_build_object('status', 'sent', 'recipients', told);
end;
$$;

comment on function public.scam_recall_send(uuid, text) is
  'V-60. Staff: tell every member who talked to a stopped account in the 60 days before the stop, once per stop, by notification and email. Never names the reporter or the account. Refuses a lifted stop.';

revoke all on function public.scam_recall_send(uuid, text) from public, anon;
grant execute on function public.scam_recall_send(uuid, text) to authenticated;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('authenticated', 'public.scam_recalls', 'insert') then bad := bad || ' [a member can write a recall]'; end if;
  if has_function_privilege('authenticated', 'private.recall_audience(uuid)', 'execute') then bad := bad || ' [the audience is readable]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
