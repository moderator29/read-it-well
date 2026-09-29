-- NEW WORK TELLS THE PEOPLE WHOSE JOB IT IS (29 September 2026).
--
-- A listing submitted, an application filed, a report, a message flag, a
-- support ticket, an agreement sent for review or a Guarantee claim reached
-- nobody: staff learned of work only by opening their desk. Now each tells the
-- holders of the scope that decides it, in the app, with a link to it:
--
--   listing submitted       listing_approval   /admin/listings/<id>
--   application submitted   kyc_review         /admin/agents
--   report filed            moderation         /admin/queue?tab=reports
--   message flagged         moderation         /admin/queue?tab=flags
--   support ticket opened   support            /admin/support?ticket=<id>
--   agreement in review     agreements         /admin/agreements
--   Guarantee claim filed   guarantee          /admin/agreements#claims
--
-- Holders are staff with a live grant carrying the scope who have acknowledged
-- the current handbook. When nobody holds the scope, the admins are told
-- instead, so work is never silent. A party to the item (the lister, the
-- applicant, the reporter, the member who wrote in, the parties to an
-- agreement or claim) is never told about their own case through this path.
-- A failure here never blocks the write that caused it.

create or replace function private.tell_scope(p_scope text, p_title text, p_body text, p_href text, p_exclude uuid[] default '{}')
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  who uuid;
  told integer := 0;
begin
  for who in
    select g.user_id from public.staff_grants g
     where g.revoked_at is null
       and p_scope = any (g.scopes::text[])
       and exists (select 1 from public.staff_handbook_acks a
                    where a.user_id = g.user_id and a.version = private.staff_handbook_version())
       and not (g.user_id = any (coalesce(p_exclude, '{}')))
  loop
    perform private.notify(who, 'system'::public.notification_kind, p_title, p_body, p_href);
    told := told + 1;
  end loop;
  if told = 0 then
    for who in
      select distinct r.user_id from public.user_roles r
       where r.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
         and not (r.user_id = any (coalesce(p_exclude, '{}')))
    loop
      perform private.notify(who, 'system'::public.notification_kind, p_title, p_body, p_href);
    end loop;
  end if;
end;
$function$;

create or replace function private.announce_new_work()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n jsonb := to_jsonb(new);
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  lister uuid;
begin
  begin
    if tg_table_name = 'listings' then
      if n ->> 'status' = 'SUBMITTED' and (o ->> 'status') is distinct from 'SUBMITTED' then
        select a.user_id into lister from public.agents a where a.id = new.agent_id;
        perform private.tell_scope('listing_approval', 'A listing is waiting for review',
          coalesce(n ->> 'title', 'A listing') || ' was submitted.', '/admin/listings/' || (n ->> 'id'),
          array[lister]);
      end if;
    elsif tg_table_name = 'agent_applications' then
      if n ->> 'status' = 'SUBMITTED' and (o ->> 'status') is distinct from 'SUBMITTED' then
        perform private.tell_scope('kyc_review', 'An application is waiting for verification',
          'Application ' || coalesce(n ->> 'reference', '') || ' was submitted.', '/admin/agents',
          array[(n ->> 'user_id')::uuid]);
      end if;
    elsif tg_table_name = 'reports' then
      perform private.tell_scope('moderation', 'A new report',
        'Somebody reported a ' || coalesce(n ->> 'target_type', 'thing') || '.', '/admin/queue?tab=reports',
        array[(n ->> 'reporter_id')::uuid]);
    elsif tg_table_name = 'message_flags' then
      perform private.tell_scope('moderation', 'A message was flagged',
        'The message scan flagged a message for review.', '/admin/queue?tab=flags', '{}');
    elsif tg_table_name = 'support_tickets' then
      perform private.tell_scope('support', 'A new support ticket',
        'Ticket ' || coalesce(n ->> 'reference', '') || ' is waiting for a reply.',
        '/admin/support?ticket=' || (n ->> 'id'),
        case when n ->> 'user_id' is null then '{}'::uuid[] else array[(n ->> 'user_id')::uuid] end);
    elsif tg_table_name = 'deal_agreements' then
      if n ->> 'status' = 'in_review' and (o ->> 'status') is distinct from 'in_review' then
        perform private.tell_scope('agreements', 'An agreement is waiting for approval',
          'Both parties confirmed an agreement. Payment opens when it is approved.', '/admin/agreements',
          array[(n ->> 'renter_id')::uuid, (n ->> 'owner_id')::uuid]);
      end if;
    elsif tg_table_name = 'guarantee_claims' then
      if n ->> 'status' = 'submitted' and (o ->> 'status') is distinct from 'submitted' then
        perform private.tell_scope('guarantee', 'A Guarantee claim was filed',
          'A claim is waiting for a decision.', '/admin/agreements#claims',
          array[(n ->> 'claimant_id')::uuid]);
      end if;
    end if;
  exception when others then
    -- Telling staff is never a reason to refuse the member's write.
    raise warning 'announce_new_work(%): %', tg_table_name, sqlerrm;
  end;
  return new;
end;
$function$;

revoke all on function private.tell_scope(text, text, text, text, uuid[]) from public, anon, authenticated;
revoke all on function private.announce_new_work() from public, anon, authenticated;

drop trigger if exists zz_announce_new_work on public.listings;
create trigger zz_announce_new_work after insert or update of status on public.listings
  for each row execute function private.announce_new_work();
drop trigger if exists zz_announce_new_work on public.agent_applications;
create trigger zz_announce_new_work after insert or update of status on public.agent_applications
  for each row execute function private.announce_new_work();
drop trigger if exists zz_announce_new_work on public.reports;
create trigger zz_announce_new_work after insert on public.reports
  for each row execute function private.announce_new_work();
drop trigger if exists zz_announce_new_work on public.message_flags;
create trigger zz_announce_new_work after insert on public.message_flags
  for each row execute function private.announce_new_work();
drop trigger if exists zz_announce_new_work on public.support_tickets;
create trigger zz_announce_new_work after insert on public.support_tickets
  for each row execute function private.announce_new_work();
drop trigger if exists zz_announce_new_work on public.deal_agreements;
create trigger zz_announce_new_work after insert or update of status on public.deal_agreements
  for each row execute function private.announce_new_work();
drop trigger if exists zz_announce_new_work on public.guarantee_claims;
create trigger zz_announce_new_work after insert or update of status on public.guarantee_claims
  for each row execute function private.announce_new_work();
