-- SUBSCRIPTIONS-CHECKOUT: Vallo Pro and Vallo Business can be tried and paid for.
-- Needs, applied in order: b2_ledger, b3_tax_entitlements_promotion,
-- d84_founder_rulings_8_october, subscriptions_checkout (pending).
--  PROBE 1  the switch: a missing `subscriptions_checkout` row reads off, and
--           off, no trial starts and no checkout opens
--  PROBE 2  a trial needs no card, grants the plan at once through
--           member_entitlement_plans (entitlement_check answers for it), lasts
--           subscription_settings.trial_days, and happens once per member ever
--  PROBE 3  members: read their own rows only, never the management token or
--           the email hash, and cannot write a row or call the service doors
--  PROBE 4  a checkout opens only at the plan row's price and a recorded
--           Paystack plan code; the first recorded code wins
--  PROBE 5  Paystack's events move the subscription: subscription.create is
--           found by the checkout's email hash, charge.success activates it
--           (ending the trial), a replay is a duplicate, a failed invoice is
--           past_due, a paid invoice is active again and extends the period, a
--           renewal charge with Paystack's own reference is found by customer
--           and plan, not_renew keeps the plan to the end of the paid period
--  PROBE 6  a live-mode charge posts revenue once; a test-mode charge posts none
--  PROBE 7  money that does not match is never granted (mismatch), and an
--           event about nothing of ours is recorded as unmatched
--  PROBE 8  the sweep: a trial past its end expires, a non-renewing plan past
--           its period is cancelled, and the plan is no longer granted
-- The switch is set inside the transaction; no live value is asserted. Fixture
-- users are created here. Everything is rolled back by the final raise.
do $$
declare
  alice uuid := gen_random_uuid();
  bob   uuid := gen_random_uuid();
  carol uuid := gen_random_uuid();
  r jsonb; n int; days int; pro_price bigint; biz_price bigint;
  s public.member_subscriptions; t public.member_subscriptions;
  ref text; bob_ref text; carol_ref text;
  alice_sha text := encode(sha256(convert_to('probe-subs-alice@example.invalid', 'UTF8')), 'hex');
  g public.member_entitlement_plans;
  pro_code text := 'PLN_probesubs' || substr(md5(random()::text), 1, 8);
  live_code text := 'PLN_probesubslive' || substr(md5(random()::text), 1, 8);
  sub_code text := 'SUB_probesubs' || substr(md5(random()::text), 1, 8);
  cus_code text := 'CUS_probesubs' || substr(md5(random()::text), 1, 8);
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select x.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', x.email, '{}', '{}', now(), now()
    from (values (alice, 'probe-subs-alice@example.invalid'), (bob, 'probe-subs-bob@example.invalid'),
                 (carol, 'probe-subs-carol@example.invalid')) as x(id, email);
  select price_minor into pro_price from public.entitlement_plans
   where plan_key = 'pro' and effective_from <= now() and (effective_to is null or effective_to > now())
   order by effective_from desc limit 1;
  select price_minor into biz_price from public.entitlement_plans
   where plan_key = 'business' and effective_from <= now() and (effective_to is null or effective_to > now())
   order by effective_from desc limit 1;
  if pro_price is null or biz_price is null then
    raise exception 'PROBE_FAIL subscriptions-checkout 0: no priced pro or business plan in force';
  end if;
  update public.subscription_settings set trial_days = 4 where id = 1;
  select trial_days into days from public.subscription_settings where id = 1;

  -- PROBE 1: a missing row reads off; off, nothing opens.
  delete from public.feature_flags where key = 'subscriptions_checkout';
  if private.subscriptions_checkout_on() then
    raise exception 'PROBE_FAIL subscriptions-checkout 1: a missing switch row reads on';
  end if;
  insert into public.feature_flags (key, enabled) values ('subscriptions_checkout', false);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  r := public.subscription_start_trial('pro');
  if r ->> 'reason' is distinct from 'closed' then
    raise exception 'PROBE_FAIL subscriptions-checkout 1: a trial started with the switch off: %', r;
  end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if public.subscription_checkout_open(bob, 'pro', 'test', 'PLN_x', pro_price, null) ->> 'reason' is distinct from 'closed' then
    raise exception 'PROBE_FAIL subscriptions-checkout 1: a checkout opened with the switch off';
  end if;
  update public.feature_flags set enabled = true where key = 'subscriptions_checkout';

  -- PROBE 2: the trial.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  if public.entitlement_check(alice, 'listing_boost', now() + interval '1 hour') then
    raise exception 'PROBE_FAIL subscriptions-checkout 2: the fixture member already holds Boosts';
  end if;
  r := public.subscription_start_trial('pro');
  if (r ->> 'ok')::boolean is not true then
    raise exception 'PROBE_FAIL subscriptions-checkout 2: the trial did not start: %', r;
  end if;
  if not public.entitlement_check(alice, 'listing_boost', now() + interval '1 hour') then
    raise exception 'PROBE_FAIL subscriptions-checkout 2: the trial did not grant the plan';
  end if;
  if public.entitlement_check(alice, 'listing_boost', now() + make_interval(days => days) + interval '1 minute') then
    raise exception 'PROBE_FAIL subscriptions-checkout 2: the trial grant outlives the trial';
  end if;
  r := public.subscription_start_trial('business');
  if r ->> 'reason' is distinct from 'trial_used' then
    raise exception 'PROBE_FAIL subscriptions-checkout 2: a second trial was not refused: %', r;
  end if;

  -- PROBE 3: what a member can and cannot do.
  select count(id) into n from public.member_subscriptions where user_id = alice and kind = 'trial' and status = 'trialing'
     and trial_ends_at = now() + make_interval(days => days);
  if n <> 1 then
    raise exception 'PROBE_FAIL subscriptions-checkout 3: the member cannot read their trial, or it is not % days', days;
  end if;
  begin
    perform provider_email_token from public.member_subscriptions limit 1;
    raise exception 'PROBE_FAIL subscriptions-checkout 3: a member can read the management token';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.member_subscriptions (user_id, plan_id, plan_key, kind, status, trial_ends_at)
    select alice, id, 'pro', 'trial', 'trialing', now() + interval '1 year' from public.entitlement_plans where plan_key = 'pro' limit 1;
    raise exception 'PROBE_FAIL subscriptions-checkout 3: a member wrote a subscription row';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.subscription_apply_event('test', 'charge.success', 'charge.success:rm-sub-probe', '{}'::jsonb);
    raise exception 'PROBE_FAIL subscriptions-checkout 3: a member called apply_event';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.subscription_checkout_open(alice, 'pro', 'test', 'PLN_x', pro_price, null);
    raise exception 'PROBE_FAIL subscriptions-checkout 3: a member called checkout_open';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(id) into n from public.member_subscriptions where user_id = alice;
  if n <> 0 then
    raise exception 'PROBE_FAIL subscriptions-checkout 3: one member can read another''s subscription';
  end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if has_function_privilege('anon', 'public.subscription_start_trial(text)', 'execute') then
    raise exception 'PROBE_FAIL subscriptions-checkout 3: anon can start a trial';
  end if;

  -- PROBE 4: opening a checkout.
  r := public.subscription_checkout_open(alice, 'pro', 'test', pro_code, pro_price, alice_sha);
  if r ->> 'reason' is distinct from 'plan_code_unknown' then
    raise exception 'PROBE_FAIL subscriptions-checkout 4: a checkout opened on an unrecorded plan code: %', r;
  end if;
  if public.subscription_provider_plan_record('pro', 'test', pro_code, pro_price) is distinct from pro_code
     or public.subscription_provider_plan_record('pro', 'test', 'PLN_probesubsother', pro_price) is distinct from pro_code then
    raise exception 'PROBE_FAIL subscriptions-checkout 4: the first recorded plan code does not win';
  end if;
  r := public.subscription_checkout_open(alice, 'pro', 'test', pro_code, pro_price - 1, alice_sha);
  if r ->> 'reason' is distinct from 'price_changed' then
    raise exception 'PROBE_FAIL subscriptions-checkout 4: a checkout opened at another price: %', r;
  end if;
  r := public.subscription_checkout_open(alice, 'pro', 'test', pro_code, pro_price, alice_sha);
  ref := r ->> 'reference';
  if (r ->> 'ok')::boolean is not true or ref not like 'rm-sub-%' or (r ->> 'amount_minor')::bigint <> pro_price
     or (r ->> 'in_trial')::boolean is not true then
    raise exception 'PROBE_FAIL subscriptions-checkout 4: the checkout did not open at the plan price: %', r;
  end if;

  -- PROBE 5: Paystack's events.
  r := public.subscription_apply_event('test', 'subscription.create', 'subscription.create:' || sub_code,
         jsonb_build_object('subscription_code', sub_code, 'email_token', 'tok_probe', 'customer_code', cus_code,
                            'email_sha256', alice_sha, 'plan_code', pro_code,
                            'next_payment_date', to_char((now() + interval '1 month') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  select * into s from public.member_subscriptions where checkout_reference = ref;
  if r ->> 'outcome' is distinct from 'recorded' or s.provider_subscription_code is distinct from sub_code
     or s.status <> 'incomplete' then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: subscription.create was not matched to its checkout: % %', r, s.status;
  end if;
  r := public.subscription_apply_event('test', 'charge.success', 'charge.success:' || ref,
         jsonb_build_object('reference', ref, 'amount_minor', pro_price, 'currency', 'NGN', 'customer_code', cus_code,
                            'plan_code', pro_code));
  select * into s from public.member_subscriptions where checkout_reference = ref;
  select * into t from public.member_subscriptions where user_id = alice and kind = 'trial';
  if r ->> 'outcome' is distinct from 'applied' or s.status <> 'active' or s.current_period_end is null
     or t.status <> 'converted' then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: charge.success did not activate the plan and end the trial: % % %', r, s.status, t.status;
  end if;
  if not public.entitlement_check(alice, 'listing_boost', now() + interval '20 days') then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: the paid plan is not granted';
  end if;
  r := public.subscription_apply_event('test', 'charge.success', 'charge.success:' || ref,
         jsonb_build_object('reference', ref, 'amount_minor', pro_price, 'currency', 'NGN'));
  if r ->> 'outcome' is distinct from 'duplicate' then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: a replayed charge.success was not a duplicate: %', r;
  end if;
  r := public.subscription_apply_event('test', 'invoice.payment_failed', 'invoice.payment_failed:INV_probe1',
         jsonb_build_object('subscription_code', sub_code, 'invoice_code', 'INV_probe1', 'provider_status', 'failed'));
  if r ->> 'status' is distinct from 'past_due' then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: a failed invoice did not make the plan past_due: %', r;
  end if;
  r := public.subscription_apply_event('test', 'invoice.update', 'invoice.update:INV_probe1:success',
         jsonb_build_object('subscription_code', sub_code, 'invoice_code', 'INV_probe1', 'provider_status', 'success', 'paid', true,
                            'next_payment_date', to_char((now() + interval '2 months') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  select * into s from public.member_subscriptions where checkout_reference = ref;
  if r ->> 'status' is distinct from 'active' or s.current_period_end < now() + interval '59 days' then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: a paid invoice did not restore and extend the plan: % %', r, s.current_period_end;
  end if;
  if not public.entitlement_check(alice, 'listing_boost', now() + interval '55 days') then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: the extended period is not granted';
  end if;
  r := public.subscription_apply_event('test', 'charge.success', 'charge.success:T_probe_renewal',
         jsonb_build_object('reference', 'T_probe_renewal', 'amount_minor', pro_price, 'currency', 'NGN',
                            'customer_code', cus_code, 'plan_code', pro_code,
                            'paid_at', to_char((now() + interval '2 months') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  select * into s from public.member_subscriptions where checkout_reference = ref;
  if r ->> 'outcome' is distinct from 'applied' or s.current_period_end < now() + interval '89 days' then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: a renewal charge was not found by customer and plan: % %', r, s.current_period_end;
  end if;
  r := public.subscription_apply_event('test', 'subscription.not_renew', 'subscription.not_renew:' || sub_code,
         jsonb_build_object('subscription_code', sub_code, 'provider_status', 'non-renewing'));
  select * into s from public.member_subscriptions where checkout_reference = ref;
  select * into g from public.member_entitlement_plans where id = s.grant_id;
  if s.status <> 'non_renewing' or g.effective_to is distinct from s.current_period_end then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: not_renew did not keep the plan to the end of the paid period: % % %', s.status, g.effective_to, s.current_period_end;
  end if;
  if (public.subscription_mark_cancelled(alice, s.id) ->> 'status') is distinct from 'non_renewing'
     or (public.subscription_mark_cancelled(bob, s.id) ->> 'reason') is distinct from 'not_found' then
    raise exception 'PROBE_FAIL subscriptions-checkout 5: cancelling is not idempotent, or another member can cancel it';
  end if;

  -- PROBE 6: revenue, live mode only.
  if exists (select 1 from public.ledger_vallo_revenue where idempotency_key = 'subscription:' || ref) then
    raise exception 'PROBE_FAIL subscriptions-checkout 6: a test-mode charge was posted as revenue';
  end if;
  perform public.subscription_provider_plan_record('business', 'live', live_code, biz_price);
  r := public.subscription_checkout_open(bob, 'business', 'live', live_code, biz_price, null);
  bob_ref := r ->> 'reference';
  if (r ->> 'in_trial')::boolean then
    raise exception 'PROBE_FAIL subscriptions-checkout 6: a member with no trial reads as in a trial';
  end if;
  r := public.subscription_apply_event('live', 'charge.success', 'charge.success:' || bob_ref,
         jsonb_build_object('reference', bob_ref, 'amount_minor', biz_price, 'currency', 'NGN', 'customer_code', 'CUS_probebob'));
  perform public.subscription_apply_event('live', 'charge.success', 'charge.success:' || bob_ref || ':again',
         jsonb_build_object('reference', bob_ref, 'amount_minor', biz_price, 'currency', 'NGN'));
  select count(*) into n from public.ledger_vallo_revenue
   where idempotency_key = 'subscription:' || bob_ref and amount_minor = biz_price and event_type = 'FEE_CHARGED' and direction = 'in';
  if r ->> 'status' is distinct from 'active' or n <> 1 then
    raise exception 'PROBE_FAIL subscriptions-checkout 6: a live charge was not posted exactly once (% rows): %', n, r;
  end if;
  if public.subscription_checkout_open(bob, 'business', 'live', live_code, biz_price, null) ->> 'reason' is distinct from 'already_subscribed' then
    raise exception 'PROBE_FAIL subscriptions-checkout 6: a subscribed member opened a second checkout';
  end if;

  -- PROBE 7: mismatch and unmatched.
  r := public.subscription_checkout_open(carol, 'business', 'live', live_code, biz_price, null);
  carol_ref := r ->> 'reference';
  r := public.subscription_apply_event('live', 'charge.success', 'charge.success:' || carol_ref,
         jsonb_build_object('reference', carol_ref, 'amount_minor', 100, 'currency', 'NGN'));
  if r ->> 'outcome' is distinct from 'mismatch' or r ->> 'status' is distinct from 'mismatch'
     or public.entitlement_check(carol, 'business_pro', now() + interval '1 hour') then
    raise exception 'PROBE_FAIL subscriptions-checkout 7: a charge for the wrong amount granted the plan: %', r;
  end if;
  r := public.subscription_apply_event('live', 'subscription.disable', 'subscription.disable:SUB_probe_nobody',
         jsonb_build_object('subscription_code', 'SUB_probe_nobody'));
  if r ->> 'outcome' is distinct from 'unmatched'
     or not exists (select 1 from public.subscription_events where event_key = 'subscription.disable:SUB_probe_nobody'
                      and outcome = 'unmatched') then
    raise exception 'PROBE_FAIL subscriptions-checkout 7: an event about nothing of ours was not recorded as unmatched: %', r;
  end if;

  -- PROBE 8: the sweep.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', carol, 'role', 'authenticated')::text, true);
  r := public.subscription_start_trial('business');
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if (r ->> 'ok')::boolean is not true then
    raise exception 'PROBE_FAIL subscriptions-checkout 8: the fixture trial did not start: %', r;
  end if;
  update public.member_subscriptions set trial_ends_at = now() - interval '1 minute' where user_id = carol and kind = 'trial';
  update public.member_subscriptions set current_period_end = now() - interval '1 minute' where checkout_reference = ref;
  perform private.subscriptions_sweep();
  select * into t from public.member_subscriptions where user_id = carol and kind = 'trial';
  select * into s from public.member_subscriptions where checkout_reference = ref;
  if t.status <> 'expired' or s.status <> 'cancelled' then
    raise exception 'PROBE_FAIL subscriptions-checkout 8: the sweep did not end the trial (%) and the cancelled plan (%)', t.status, s.status;
  end if;
  if public.entitlement_check(carol, 'business_pro', now() + interval '1 hour')
     or public.entitlement_check(alice, 'listing_boost', now() + interval '1 hour') then
    raise exception 'PROBE_FAIL subscriptions-checkout 8: a plan is still granted after the sweep ended it';
  end if;

  raise exception 'PROBE_OK subscriptions-checkout';
end $$;
