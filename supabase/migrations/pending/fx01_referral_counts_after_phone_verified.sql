-- DRAFT, not applied. FIXES BUNDLE 7 of 7 (13 October 2026): an invited person
-- counts only after they verify their phone number.
--
-- THE RULING. The founder, 13 October 2026: an invited person counts only
-- after they verify their phone number. Read live on 13 October (project
-- uccixoonmbhrnyczyigt, read only): the live campaign `signup-80` requires
-- ['email_verified', 'onboarding_completed'] and NOT phone_verified, and
-- public.referral_qualify_pending() sweeps anybody with a confirmed phone OR a
-- confirmed email, so today an invited person counts on an email alone.
-- d85's own header said what to do: "phone_verified is to be added by a
-- successor campaign once TERMII_SENDER_ID is set (a campaign's terms are
-- written once; the change is a new campaign)". This is that successor.
--
-- WHAT CHANGES
--  1. `signup-80` is ended (the move the campaign guard allows, active > ended
--     with its end date set) and `signup-80-phone` starts, the same terms in
--     every way but the requirements: 8,000 kobo, 7 day review window, the same
--     member cap, requirement_keys ['phone_verified', 'onboarding_completed'].
--     email_verified is not required: a person who signs up by phone has no
--     email to confirm, and the phone is the identity anchor anyway
--     (private.referral_try_qualify keys on the confirmed phone).
--     Nothing in flight is lost or frozen: the live table has no referrals yet
--     (read 13 October: 0 rows), and any referral still `attributed` under
--     signup-80 re-points to the live campaign of its kind
--     (referral_try_qualify does that), so it simply waits for the phone.
--     Anything already qualified stays qualified (terms are frozen per row).
--  2. public.referral_qualify_pending() sweeps only people with a CONFIRMED
--     PHONE. It is the live definition with the first loop's filter narrowed;
--     the second loop (the refund reversal sweep) is unchanged.
--  3. Nothing else is touched: the member progress function already says
--     waiting_on = 'phone' for a missing phone_verified, the confirmed_phones
--     trigger already tries qualification on a phone confirmation, and the
--     app copy says it (`fixesV2.referral`, "Your invite counts once they
--     verify their phone number.").
--
-- ORDER OF RELEASE. Apply AFTER phone codes can be sent in production
-- (TERMII_SENDER_ID set and approved on the Termii account, the
-- `phone_confirmation` flag on): until then nobody can verify a phone, and no
-- invite would count. The founder's providers page lists the Termii sender
-- IDs and says whether the one set matches an approved one.
--
-- House rules: no DROP, no DELETE, no transaction control. Create or replace
-- and insert only; one campaign moved active > ended (as d85 did).
-- Probe: supabase/tests/probes-pending/fx01-referral-counts-after-phone-verified.sql
set local lock_timeout = '5s';

-- ------------------------------------------------------------ 1. the campaign

update public.referral_campaigns
   set status = 'ended', ends_at = now()
 where slug = 'signup-80' and status in ('active', 'paused');

insert into public.referral_campaigns
  (slug, kind, title, reward_minor, member_cap_minor, review_window, requirement_keys, requirement_params, status, starts_at, reason)
select 'signup-80-phone', 'consumer', 'Invite and Earn', 8000, 12000000, interval '7 days',
       array['phone_verified', 'onboarding_completed'], '{}'::jsonb, 'active', now(),
       'Founder ruling 13 October 2026: an invited person counts only after they verify their phone number (terms accepted and first name set as before; no payment). Supersedes signup-80, which counted on a confirmed email.'
 where not exists (select 1 from public.referral_campaigns where slug = 'signup-80-phone')
   and not exists (select 1 from public.referral_campaigns where kind = 'consumer' and status = 'active');

-- ------------------------------------------------------- 2. the retry sweep

-- The live definition (read 13 October 2026) with ONE change: the first loop
-- looks only at people with a confirmed phone.
create or replace function public.referral_qualify_pending(p_limit int default 500)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '2s' as $$
declare v_user uuid; v_out text; n int := 0; moved int := 0; failed int := 0;
begin
  for v_user in
    select u.id from (
      select r.referred_id as id, r.last_checked_at as at from public.referrals r where r.status = 'attributed'
      union all
      select au.id, null from auth.users au
       where nullif(btrim(au.raw_user_meta_data ->> 'referral_code'), '') is not null
         and not exists (select 1 from public.referrals r where r.referred_id = au.id)
    ) u
    -- A confirmed phone is the only door: an email alone never counts.
    where exists (select 1 from public.confirmed_phones c where c.user_id = u.id)
    order by u.at nulls first, u.id
    limit greatest(1, least(coalesce(p_limit, 500), 5000))
  loop
    n := n + 1;
    begin
      v_out := private.referral_try_qualify(v_user);
      if v_out in ('pending','under_review','reversed') then moved := moved + 1; end if;
    exception when others then
      failed := failed + 1;
      raise warning 'referral_qualify_pending: % for %', sqlerrm, v_user;
    end;
  end loop;

  for v_user in
    select r.id from public.referrals r
     where r.status <> 'reversed' and (
       exists (select 1 from public.transactions t where t.id = r.qualifying_tx_id and t.status = 'REFUNDED')
       or exists (select 1 from public.booking_refunds br where br.booking_id = r.qualifying_booking_id
                    and br.paid_minor is not null and br.refund_minor >= br.paid_minor and br.refund_minor > 0))
     limit 500
  loop
    begin
      perform private.referral_reverse(v_user, 'the qualifying payment was fully refunded (sweep)', null);
      moved := moved + 1;
    exception when others then
      failed := failed + 1;
      raise warning 'referral_qualify_pending reversal: % for %', sqlerrm, v_user;
    end;
  end loop;
  return jsonb_build_object('checked', n, 'moved', moved, 'failed', failed);
end $$;

revoke all on function public.referral_qualify_pending(int) from public, anon, authenticated;
grant execute on function public.referral_qualify_pending(int) to service_role;

-- --------------------------------------------------------------- read back

do $check$
declare missing text := '';
begin
  if not exists (select 1 from public.referral_campaigns where slug = 'signup-80-phone' and status = 'active'
                   and reward_minor = 8000 and requirement_keys = array['phone_verified', 'onboarding_completed']
                   and review_window = interval '7 days' and member_cap_minor = 12000000) then
    missing := missing || ' signup_80_phone_active';
  end if;
  if exists (select 1 from public.referral_campaigns where slug = 'signup-80' and status <> 'ended') then
    missing := missing || ' signup_80_not_ended';
  end if;
  if (select count(*) from public.referral_campaigns where kind = 'consumer' and status = 'active') <> 1 then
    missing := missing || ' one_consumer_campaign';
  end if;
  if has_function_privilege('authenticated', 'public.referral_qualify_pending(int)', 'EXECUTE') then
    missing := missing || ' member_exec:referral_qualify_pending';
  end if;
  if missing <> '' then
    raise exception 'fx01 read-back failed:%', missing;
  end if;
end $check$;
