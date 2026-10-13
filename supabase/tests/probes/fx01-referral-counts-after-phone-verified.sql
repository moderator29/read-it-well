-- FX01 (pending migration fx01_referral_counts_after_phone_verified): an invited
-- person counts only after they verify their phone number.
--
-- Proves, all rolled back by the final raise:
--   1. signup-80-phone is the one live consumer campaign and requires
--      phone_verified; signup-80 is ended;
--   2. a sign-up with a code, email confirmed and onboarding finished, but no
--      confirmed phone, is NOT qualified by the trigger, by try_qualify or by
--      the sweep, and the member reads "waiting on phone";
--   3. confirming the phone qualifies it at 8,000 kobo, pending its 7 day window.
do $$
declare
  alphabet   constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  this_month date := date_trunc('month', now() at time zone 'Africa/Lagos')::date;
  tag        text := replace(left(gen_random_uuid()::text, 8), '-', '');
  referrer   uuid := gen_random_uuid();
  invited    uuid := gen_random_uuid();
  inv_code   text := '';
  rid        uuid;
  st         text; v text; amt bigint; i int;
  prog       record;
begin
  if not exists (select 1 from public.referral_campaigns
                  where slug = 'signup-80-phone' and status = 'active' and kind = 'consumer' and reward_minor = 8000
                    and requirement_keys = array['phone_verified', 'onboarding_completed'] and review_window = interval '7 days') then
    raise exception 'PROBE_FAIL fx01-referral-counts-after-phone-verified: signup-80-phone is not the live sign-up campaign';
  end if;
  if exists (select 1 from public.referral_campaigns where slug = 'signup-80' and status <> 'ended') then
    raise exception 'PROBE_FAIL fx01-referral-counts-after-phone-verified: signup-80 is still live';
  end if;
  if (select count(*) from public.referral_campaigns where kind = 'consumer' and status = 'active') <> 1 then
    raise exception 'PROBE_FAIL fx01-referral-counts-after-phone-verified: more than one consumer campaign is live';
  end if;

  insert into public.referral_budget_periods as b (period_month, cap_minor, reason)
  values (this_month, 1000000, 'probe: this month''s budget for this transaction')
  on conflict (period_month) do update set cap_minor = b.cap_minor + 1000000;

  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
  values (referrer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'probe-fx01-ref-' || tag || '@example.invalid', '{}', '{"first_name": "Rita", "terms_version": "probe"}', now(), now(), now());
  for i in 1..20 loop
    inv_code := '';
    for v in select substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1) from generate_series(1, 6) loop
      inv_code := inv_code || v;
    end loop;
    exit when not exists (select 1 from public.referral_codes where referral_codes.code = inv_code);
  end loop;
  insert into public.referral_codes (user_id, code) values (referrer, inv_code);

  -- Signed up with the code, email confirmed, onboarding finished: no phone.
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
  values (invited, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'probe-fx01-invited-' || tag || '@example.invalid', '{}',
          jsonb_build_object('referral_code', inv_code, 'first_name', 'Ada', 'terms_version', 'probe'), now(), now(), now());
  insert into public.profiles (id, first_name, terms_accepted_at, terms_version)
  values (invited, 'Ada', now(), 'probe') on conflict (id) do update
     set first_name = 'Ada', terms_accepted_at = coalesce(public.profiles.terms_accepted_at, now()), terms_version = 'probe';

  select id, status into rid, st from public.referrals where referred_id = invited;
  if rid is null or st <> 'attributed' then
    raise exception 'PROBE_FAIL fx01-referral-counts-after-phone-verified: a sign-up with an email and onboarding but no phone is % (counted on an email alone)', coalesce(st, 'missing');
  end if;
  v := private.referral_try_qualify(invited);
  select status, blocked_on into st, v from public.referrals where id = rid;
  if st <> 'attributed' or v is distinct from 'phone_not_verified' then
    raise exception 'PROBE_FAIL fx01-referral-counts-after-phone-verified: try_qualify without a phone gave % (%)', st, v;
  end if;
  perform public.referral_qualify_pending(5000);
  if (select status from public.referrals where id = rid) <> 'attributed' then
    raise exception 'PROBE_FAIL fx01-referral-counts-after-phone-verified: the sweep qualified a referral with no confirmed phone';
  end if;

  -- The member's own progress line says what is missing.
  perform set_config('request.jwt.claim.sub', referrer::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', referrer, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into prog from public.my_referral_progress(10) where id = rid;
  execute 'reset role';
  if prog.waiting_on is distinct from 'phone' then
    raise exception 'PROBE_FAIL fx01-referral-counts-after-phone-verified: the member reads waiting_on % instead of phone', prog.waiting_on;
  end if;

  -- Confirming the phone qualifies it.
  insert into public.confirmed_phones (user_id, phone) values (invited, '+23480' || (10000000 + floor(random() * 89999999))::bigint);
  select status, reward_minor into st, amt from public.referrals where id = rid;
  if st <> 'pending' or amt <> 8000 then
    raise exception 'PROBE_FAIL fx01-referral-counts-after-phone-verified: with the phone confirmed the referral is % at % kobo, not pending at 8,000', st, amt;
  end if;

  raise exception 'PROBE_OK fx01-referral-counts-after-phone-verified';
end
$$;
