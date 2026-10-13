-- APPLIED 13 October 2026 (version 20261013182504). PHONE GATE 1 of 1 (track/phone-gate, 13 October 2026).
-- CREATE OR REPLACE ONLY: no table, column, row or grant is added or removed,
-- every signature is unchanged, and every change only WIDENS who passes, so
-- the live old site (origin/main) keeps working exactly as before for every
-- account that is not a QA account and has no V-50 confirmed phone.
--
-- Founder's rulings it carries into the database:
--
--   TESTERS EXEMPT. The two QA accounts (public.qa_accounts, read through
--   private.is_qa_account) sign in by email and are never stopped at a phone
--   gate. pg_proc was searched for every function that reads
--   confirmed_phones, phone_confirmation or auth.users.phone_confirmed_at;
--   the ones that GATE an action are changed here:
--
--     private.inspection_truth_consequences  with phone_confirmation on, a
--       renter's "not available / not the flat" answer counts toward the
--       truth autopause only from a confirmed phone. A QA account's answer
--       now counts as it does with the flag off (one per account).
--     private.may_host_event  (guard_event_write: "Confirm your phone
--       number, and come back when your account is thirty days old"). A QA
--       account may host (never blocked, age included: they are the
--       founder's own proof accounts). And a FIX on the way: a phone
--       confirmed through /settings/phone lives in public.confirmed_phones,
--       not in auth.users.phone_confirmed_at, so a member who signed up by
--       email and confirmed their phone could never host an event. Either
--       now counts.
--
--   Deliberately NOT changed, and reported: referral_req_phone_verified,
--   referral_try_qualify, rewards_payout_open (money leaving Vallo, tied to
--   one real person; a QA account earns no reward), passport_facts and
--   thread_counterpart_facts (they state a fact, "phone confirmed", that is
--   false for a tester and must stay false), phone_otp_issue and
--   confirm_phone (they answer codes, never words: the app turns `taken`
--   and `invalid` into one neutral sentence and keeps the real reason for
--   staff in audit_log as phone.number_refused).
--
--   STAFF SEE THE REAL SIGNAL. public.admin_report_signals told the
--   moderation queue a reporter's phone was confirmed only from
--   auth.users.phone_confirmed_at, so every V-50 confirmation was read as
--   "not confirmed". It now reads both.
--
-- Probe: supabase/tests/probes/pg01-testers-never-phone-gated.sql
set lock_timeout = '5s';

create or replace function private.inspection_truth_consequences()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  witnesses integer;
  lister uuid;
  property text;
  pause_on boolean;
  phones_on boolean;
begin
  if new.off_platform_ask = 'yes' then
    insert into public.reports (reporter_id, target_type, target_id, category, reason)
    values (
      new.respondent_id, 'listing', new.listing_id::text, 'off_platform_payment',
      'Filed automatically from the questions after inspection ' || new.inspection_id::text ||
      ': the renter was asked for money outside Vallo.'
    )
    on conflict do nothing;
  end if;

  select coalesce((select f.enabled from public.feature_flags f where f.key = 'truth_autopause'), false)
    into pause_on;
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'phone_confirmation'), false)
    into phones_on;

  if pause_on and (new.available = 'no' or new.property_matched = 'no') then
    /* V-50: with phone confirmation on, a witness is a confirmed phone.
       A QA account is never asked for one, so its answer counts per account,
       as every answer does with the flag off (13 October 2026). */
    select count(distinct coalesce(cp.phone, t.respondent_id::text)) into witnesses
      from public.inspection_truth t
      left join public.confirmed_phones cp on cp.user_id = t.respondent_id
     where t.listing_id = new.listing_id
       and t.answered_at > now() - interval '30 days'
       and (t.available = 'no' or t.property_matched = 'no')
       and t.weight_withheld_reason is null
       and (not phones_on or cp.phone is not null or private.is_qa_account(t.respondent_id))
       and t.answered_at > coalesce(
             (select max(al.created_at) from public.audit_log al
               where al.entity_type = 'listing' and al.entity_id = new.listing_id::text
                 and al.action = 'listing.paused_by_truth_answers'),
             '-infinity'::timestamptz);

    if witnesses >= 2 then
      update public.listings
         set status = 'MORE_INFO_REQUIRED'::public.listing_status
       where id = new.listing_id
         and status = 'PUBLISHED'::public.listing_status
      returning (select a.user_id from public.agents a where a.id = listings.agent_id), title
        into lister, property;

      if lister is not null then
        insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
        values (
          null, 'listing.paused_by_truth_answers', 'listing', new.listing_id::text,
          jsonb_build_object(
            'rule', 'two different renters said not available or not the flat in the photos within 30 days',
            'witnesses', witnesses,
            'counted_per_phone', phones_on
          )
        );
        perform private.notify(
          lister,
          'listing',
          'Listing paused: please reconfirm it',
          witnesses::text || ' renters who inspected ' || coalesce(property, 'this listing') ||
            ' in the last 30 days said it was not available or not the flat in the photos. ' ||
            'It is off search until you reconfirm it.',
          '/agent/listings'
        );
      end if;
    end if;
  end if;

  return new;
end;
$function$;

create or replace function private.may_host_event(p_user uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select private.is_qa_account(p_user)
      or exists (
    select 1
      from auth.users u
      join public.profiles p on p.id = u.id
     where u.id = p_user
       /* A phone confirmed at sign-in (auth) or in Settings (V-50). */
       and (u.phone_confirmed_at is not null
            or exists (select 1 from public.confirmed_phones cp where cp.user_id = u.id))
       and p.created_at <= now() - interval '30 days'
       and not exists (
         select 1 from public.reports r
          where r.target_type = 'user' and r.target_id = p_user::text
            and r.status = 'resolved'
            and r.resolved_at >= now() - interval '90 days'
       )
  );
$function$;

create or replace function public.admin_report_signals(p_reports uuid[])
 returns table(report_id uuid, phone_confirmed boolean, attended_at timestamp with time zone, past_closed integer, past_upheld integer)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select r.id,
         /* A phone confirmed at sign-in (auth) or in Settings (V-50). */
         (u.phone_confirmed_at is not null
          or exists (select 1 from public.confirmed_phones cp where cp.user_id = r.reporter_id)),
         (select max(coalesce(i.slot_at, i.updated_at))
            from public.inspection_requests i
           where i.requester_id = r.reporter_id
             and r.target_type = 'listing'
             and i.listing_id::text = r.target_id
             and i.state = 'COMPLETED'::public.inspection_state),
         (select count(*)::int from public.reports p
           where p.reporter_id = r.reporter_id and p.id <> r.id and p.status::text in ('resolved', 'dismissed')),
         (select count(*)::int from public.reports p
           where p.reporter_id = r.reporter_id and p.id <> r.id and p.status::text = 'resolved')
    from public.reports r
    left join auth.users u on u.id = r.reporter_id
   where r.id = any(p_reports)
     and private.staff_can((select auth.uid()), 'moderation');
$function$;
