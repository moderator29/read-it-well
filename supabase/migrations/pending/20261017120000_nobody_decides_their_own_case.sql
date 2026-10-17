-- DRAFT, NOT APPLIED. NOBODY DECIDES THEIR OWN CASE, IN THE DATABASE.
--
-- Agent D audit, 17 October 2026. The admin desks refuse self-review for
-- listings, applications, businesses, documents, verification rungs,
-- agreements, Guarantee claims, caution rulings, chargeback holds and review
-- contests. These decisions did not:
--   1. moderation_decide: a moderator could release their own held post,
--      story, comment or bio. Now 'own_content'.
--   2. reservation_resolve_seating: drafted separately, see 20261017141000
--      (own_table, not_disputed); removed from this file so the two drafts
--      never replace the same function.
--   3. resolve_inspection_no_show: staff could decide a no-show on a viewing
--      they were part of. Now 42501 with hint 'no_show_own_case'.
--   4. decide_refund_request: an admin could decide a refund on a stay they
--      booked or host. Now 'own_booking'.
--   5. admin_referral_decide: staff could approve a referral they made or
--      were invited by. Now 'own_referral'.
--   6. admin_rewards_payout_decide: staff could release their own rewards
--      payout. Now 'own_payout'.
--   7. user_badges: an admin could grant themselves a manual badge. A check
--      constraint, NOT VALID so existing rows are not re-read (validate after
--      checking none breaks it).
--   8. record_credential: an admin could record a LASRERA or ESVARBON
--      register check on their own account. Now 'own_record'.
--
-- Each function below is the newest definition in supabase/migrations/ with
-- only the self-review lines added (file named above each). BEFORE APPLYING:
-- read the live body (select pg_get_functiondef('public.<name>'::regproc)) and
-- confirm it still matches the file named; grants are unchanged by
-- create or replace. The app already refuses each case in words
-- (lib/admin/self-review.ts and the desks that call it); this is the wall
-- behind the sentence. Probe: supabase/tests/probes-pending/self-review-desks.sql.
set lock_timeout = '5s';

-- 1. from 20260929012228_moderation_staff_decisions_land_through_moderation_decide.sql
create or replace function public.moderation_decide(p_target text, p_id uuid, p_decision text, p_reason text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  actor  uuid := (select auth.uid());
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
  n      integer := 0;
begin
  if actor is null or not private.staff_can(actor, 'moderation') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_id is null or p_target not in ('post', 'story', 'comment', 'bio')
     or p_decision not in ('RELEASE', 'REMOVE')
     or (reason is not null and char_length(reason) > 400) then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_decision = 'REMOVE' and reason is null then
    return jsonb_build_object('status', 'reason_needed');
  end if;
  -- NOBODY DECIDES THEIR OWN WORDS. A moderator whose own post, story,
  -- comment or bio is held leaves it for another moderator.
  if (p_target = 'bio' and p_id = actor)
     or (p_target = 'post' and exists (select 1 from public.posts x where x.id = p_id and x.author_id = actor))
     or (p_target = 'story' and exists (select 1 from public.stories x where x.id = p_id and x.author_id = actor))
     or (p_target = 'comment' and exists (select 1 from public.story_comments x where x.id = p_id and x.author_id = actor)) then
    return jsonb_build_object('status', 'own_content');
  end if;

  perform set_config('vallo.moderation_actor', actor::text, true);

  if p_target = 'bio' then
    update public.social_profiles
       set bio_status = case when p_decision = 'RELEASE' then 'LIVE' else 'REMOVED' end::public.social_status,
           bio = case when p_decision = 'REMOVE' then null else bio end
     where user_id = p_id and bio_status = 'HELD'::public.social_status;
  elsif p_target = 'post' then
    update public.posts
       set status = case when p_decision = 'RELEASE' then 'LIVE' else 'REMOVED' end::public.social_status,
           hold_reason = case when p_decision = 'REMOVE' then reason end,
           hidden_by = case when p_decision = 'REMOVE' then actor end
     where id = p_id and status = 'HELD'::public.social_status;
  elsif p_target = 'story' then
    update public.stories
       set status = case when p_decision = 'RELEASE' then 'LIVE' else 'REMOVED' end::public.social_status,
           hold_reason = case when p_decision = 'REMOVE' then reason end,
           hidden_by = case when p_decision = 'REMOVE' then actor end,
           removed_at = case when p_decision = 'REMOVE' then now() else removed_at end
     where id = p_id and status = 'HELD'::public.social_status;
  else
    update public.story_comments
       set status = case when p_decision = 'RELEASE' then 'LIVE' else 'REMOVED' end::public.social_status,
           hold_reason = case when p_decision = 'REMOVE' then reason end
     where id = p_id and status = 'HELD'::public.social_status;
  end if;
  get diagnostics n = row_count;

  perform set_config('vallo.moderation_actor', '', true);

  if n = 0 then
    return jsonb_build_object('status', 'gone');
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor,
          case when p_decision = 'RELEASE' then 'moderation.release' else 'moderation.remove' end,
          p_target, p_id::text,
          jsonb_build_object('decision', p_decision, 'reason', reason));

  return jsonb_build_object('status', 'ok');
end;
$fn$;

-- 2. reservation_resolve_seating: NOT HERE. The same guard is drafted in
--    pending/20261017141000_seating_dispute_guards.sql (codes 'own_table' and
--    'not_disputed', which the app already maps); apply that one.

-- 3. from 20261013063125_viewing_no_show_c_functions.sql
create or replace function public.resolve_inspection_no_show(p_inspection uuid, p_upheld boolean)
returns text
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  caller   uuid := (select auth.uid());
  s        record;
  property text;
  word     text;
begin
  if caller is not null
     and not private.has_role(caller, 'admin'::public.app_role)
     and not private.has_role(caller, 'super_admin'::public.app_role) then
    raise exception 'staff only' using errcode = '42501';
  end if;
  if p_upheld is null then
    raise exception 'say upheld or overturned' using errcode = '22023';
  end if;

  select n.inspection_id, n.reported_by, n.absent_id, n.disputed_at, n.resolved_at, i.listing_id, i.lister_id
    into s
    from public.inspection_no_shows n
    join public.inspection_requests i on i.id = n.inspection_id
   where n.inspection_id = p_inspection
   for update of n;
  if not found or s.disputed_at is null then
    raise exception 'no open dispute' using errcode = 'P0001', hint = 'no_show_no_dispute';
  end if;
  if s.resolved_at is not null then
    raise exception 'already resolved' using errcode = 'P0001', hint = 'no_show_already_resolved';
  end if;
  -- Nobody decides a viewing they were part of. A staff member's service
  -- client carries no caller; the app refuses that case before calling.
  if caller is not null
     and (caller in (s.reported_by, s.absent_id, s.lister_id)
          or exists (select 1 from public.inspection_requests i
                      where i.id = p_inspection and i.requester_id = caller)) then
    raise exception 'own viewing' using errcode = '42501', hint = 'no_show_own_case';
  end if;

  word := case when p_upheld then 'upheld' else 'overturned' end;
  update public.inspection_no_shows
     set resolved_at = now(), resolution = word, resolved_by = caller
   where inspection_id = p_inspection;

  update public.risk_alerts
     set status = 'resolved', resolved_at = now(), resolved_by = caller
   where entity_type = 'inspection_no_show'
     and entity_id = p_inspection::text
     and status = 'open';

  select l.title into property from public.listings l where l.id = s.listing_id;
  perform private.notify(
    who,
    'listing'::public.notification_kind,
    case when p_upheld then 'No-show stands' else 'No-show removed' end,
    'Vallo looked at the no-show on the viewing of ' || coalesce(property, 'the property') || ': '
      || case when p_upheld then 'it stands.' else 'it has been taken off the record.' end,
    case when who = s.lister_id then '/agent/inspections' else '/inspections' end
  )
  from unnest(array[s.reported_by, s.absent_id]) as who;
  return word;
end;
$fn$;

-- 4. from 20260929001248_money_v24_refund_clock_to_paystack_initiation_and_success.sql
create or replace function public.decide_refund_request(p_request uuid, p_decision text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $fn$
declare
  q public.refund_requests%rowtype;
  caller uuid := (select auth.uid());
begin
  if not (private.has_role(caller, 'admin'::public.app_role)
          or private.has_role(caller, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'not_allowed');
  end if;
  select * into q from public.refund_requests where id = p_request;
  if q.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- Nobody decides a refund on a stay they booked or host.
  if caller = q.guest_id or exists (
       select 1 from public.bookings b
         join public.listings l on l.id = b.listing_id
         join public.agents a on a.id = l.agent_id
        where b.id = q.booking_id and a.user_id = caller) then
    return jsonb_build_object('status', 'own_booking');
  end if;
  if p_decision not in ('declined', 'refunded') then
    return jsonb_build_object('status', 'bad_decision');
  end if;
  if p_decision = 'declined' and nullif(btrim(coalesce(p_note, '')), '') is null then
    return jsonb_build_object('status', 'needs_reason');
  end if;
  -- DECIDED means Paystack accepted the refund, never that a row was typed.
  if p_decision = 'refunded' and private.refund_request_initiated_at(q.id) is null then
    return jsonb_build_object('status', 'no_refund_initiated');
  end if;
  insert into public.refund_request_decisions (request_id, decision, note, decided_by)
  values (q.id, p_decision, left(nullif(btrim(coalesce(p_note, '')), ''), 1000), caller)
  on conflict (request_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_decided');
  end if;
  if p_decision = 'declined' then
    begin
      perform private.notify(q.guest_id, 'booking'::public.notification_kind,
        'Support answered your refund request', 'Open the booking to read the answer.', '/bookings/' || q.booking_id);
    exception when others then
      null;
    end;
  end if;
  return jsonb_build_object('status', 'ok');
end;
$fn$;

-- 5. from 20261006154817_b4_referral_campaigns.sql
create or replace function public.admin_referral_decide(p_referral uuid, p_decision text, p_reason text)
returns text language plpgsql security definer set search_path = '' as $fn$
declare r public.referrals; actor uuid := (select auth.uid());
begin
  if not private.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 8 then raise exception 'Say why, in a sentence.' using errcode = '22023'; end if;
  select * into r from public.referrals where id = p_referral for update;
  if r.id is null then return 'not_found'; end if;
  -- Nobody decides a referral they invited or were invited by.
  if actor in (r.referrer_id, r.referred_id) then return 'own_referral'; end if;
  if p_decision = 'approve' and r.status = 'under_review' then
    perform private.referral_move(r.id, 'approved', p_reason, actor);
  elsif p_decision = 'reject' and r.status = 'under_review' then
    perform private.referral_move(r.id, 'rejected', p_reason, actor);
    perform private.referral_reverse(r.id, p_reason, actor);
  elsif p_decision = 'reverse' then
    perform private.referral_reverse(r.id, p_reason, actor);
  elsif p_decision = 'review' and r.status in ('pending','approved','available') then
    perform private.referral_move(r.id, 'under_review', p_reason, actor);
  else
    return 'refused';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'referral_' || p_decision, 'referral', r.id::text, jsonb_build_object('reason', p_reason, 'from', r.status));
  return (select status from public.referrals where id = p_referral);
end $fn$;

-- 6. from 20261013193153_cbh01_chargeback_hold_enforced.sql
create or replace function public.admin_rewards_payout_decide(p_payout uuid, p_decision text, p_reason text)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare p public.rewards_payouts;
begin
  if not private.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 8 then raise exception 'Say why, in a sentence.' using errcode = '22023'; end if;
  select * into p from public.rewards_payouts where id = p_payout for update;
  if p.id is null then return 'refused'; end if;
  -- Nobody releases, refuses or closes their own payout.
  if p.member_id = (select auth.uid()) then return 'own_payout'; end if;
  if p_decision = 'fail_unsent' then
    if p.status not in ('processing','sent','unknown') or p.created_at > now() - interval '24 hours' then
      return 'refused';
    end if;
    if length(btrim(p_reason)) < 20 then
      raise exception 'Say what the provider dashboard showed.' using errcode = '22023';
    end if;
    perform private.rewards_payout_fail(p.id, 'never sent (staff): ' || p_reason);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_failed_unsent', 'rewards_payout', p.id::text,
            jsonb_build_object('reason', p_reason, 'prior_status', p.status, 'transfer_initiated_at', p.transfer_initiated_at));
    return 'failed';
  end if;
  if p.status <> 'under_review' then return 'refused'; end if;
  if p_decision = 'release' then
    if p.recipient_code is null then return 'no_recipient'; end if;
    -- THE PAYOUT RULE: only a finance override lets a held member's payout go.
    if private.chargeback_hold_blocks('rewards_payout', p.id, p.member_id) then
      perform private.chargeback_hold_refused('rewards_payout', p.id, p.member_id, 'rewards_payout_release');
      return 'chargeback_hold';
    end if;
    update public.rewards_payouts set status = 'processing' where id = p.id;
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_released', 'rewards_payout', p.id::text, jsonb_build_object('reason', p_reason));
    return 'processing';
  elsif p_decision = 'refuse' then
    perform private.rewards_payout_fail(p.id, 'refused on review: ' || p_reason);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'rewards_payout_refused', 'rewards_payout', p.id::text, jsonb_build_object('reason', p_reason));
    return 'failed';
  end if;
  return 'refused';
end $fn$;

-- 8. from 20260928224407_v87_lasrera_esvarbon_and_cac_as_dated_credentials.sql
create or replace function public.record_credential(
  p_subject uuid, p_kind text, p_number text, p_company text, p_source text, p_register_name text
)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not (private.has_role(actor, 'admin'::public.app_role)
                           or private.has_role(actor, 'super_admin'::public.app_role)) then
    return 'forbidden';
  end if;
  -- Nobody records a register check on themselves.
  if p_subject = actor then return 'own_record'; end if;
  if p_kind not in ('lasrera', 'esvarbon', 'cac_director') then return 'invalid'; end if;
  if p_number is null or length(btrim(p_number)) < 2 then return 'invalid'; end if;
  if (p_kind = 'cac_director') <> (p_company is not null and length(btrim(p_company)) >= 2) then return 'invalid'; end if;
  /* This is the desk's door, and the desk reads registers by hand. The
     aggregator will write through its own service-role path, so a member of
     staff cannot claim an aggregator check here, and a CAC directorship,
     which only the aggregator can see, is refused. */
  if coalesce(p_source, 'register_by_hand') <> 'register_by_hand' then return 'invalid'; end if;
  if p_kind = 'cac_director' then return 'needs_aggregator'; end if;
  if p_register_name is null or length(btrim(p_register_name)) < 2 then return 'no_name'; end if;

  insert into public.credentials (subject_id, kind, number, company_name, register_name, source, checked_at, checked_by)
  values (p_subject, p_kind, btrim(p_number), nullif(btrim(coalesce(p_company, '')), ''),
          nullif(btrim(coalesce(p_register_name, '')), ''),
          'register_by_hand', now(), actor)
  on conflict (subject_id, kind) do update
    set number = excluded.number, company_name = excluded.company_name, register_name = excluded.register_name,
        source = excluded.source, checked_at = now(), checked_by = actor;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'credential.checked', 'user', p_subject::text,
          jsonb_build_object('kind', p_kind, 'source', 'register_by_hand'));
  return 'recorded';
end;
$fn$;

-- 7. A manual badge names somebody other than the holder.
alter table public.user_badges
  add constraint user_badges_not_self_granted
  check (granted_by is null or granted_by <> user_id) not valid;
