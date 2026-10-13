-- NT03 (pending migration nt03_referral_notices): the referrer hears about each
-- step of an invite, once, without being told about risk, and the member hears
-- about each payout state once.
--   * a real referral insert (attributed) tells the referrer;
--   * the same state told again writes nothing;
--   * qualified-then-pending and qualified-then-under_review tell the same
--     neutral line, exactly once between them;
--   * available tells the reward amount; reversed-before-qualifying and
--     reversed-after-reward use different words;
--   * a payout sent, paid and failed each tell once, with the last four digits;
--   * nothing says safe, secure, verified or guaranteed;
--   * the two triggers exist and the functions are closed to API roles.
-- Rolled back by the final raise.
do $$
declare
  referrer uuid;
  friend uuid;
  rid constant uuid := gen_random_uuid();
  pid constant uuid := gen_random_uuid();
  n integer;
  b text;
begin
  select id into referrer from public.profiles order by created_at limit 1;
  select id into friend from public.profiles pr where pr.id <> referrer
     and not exists (select 1 from public.referrals r where r.referred_id = pr.id) order by pr.created_at limit 1;
  if referrer is null or friend is null then
    raise exception 'PROBE_FAIL nt03: need two profiles';
  end if;
  update public.profiles set settings = '{}'::jsonb where id = referrer;

  /* ---- a real insert fires the trigger ---- */
  insert into public.referrals (id, referrer_id, referred_id, code)
  values (rid, referrer, friend, 'PROBENT03');
  select count(*) into n from public.notifications
   where user_id = referrer and title = 'Someone joined with your invite' and href = '/rewards/referrals';
  if n <> 1 then raise exception 'PROBE_FAIL nt03: the attribution did not tell the referrer once (%)', n; end if;

  /* ---- the same state again: nothing ---- */
  perform private.tell_referral_change(rid, referrer, null, 'attributed', null);
  select count(*) into n from public.notifications where user_id = referrer and title = 'Someone joined with your invite';
  if n <> 1 then raise exception 'PROBE_FAIL nt03: a repeat told the attribution again'; end if;

  /* ---- counts: pending and under_review share one neutral line, once ---- */
  perform private.tell_referral_change(rid, referrer, 'qualified', 'pending', 100000);
  perform private.tell_referral_change(rid, referrer, 'qualified', 'under_review', 100000);
  select count(*), min(body) into n, b from public.notifications where user_id = referrer and title = 'Your invite counts';
  if n <> 1 then raise exception 'PROBE_FAIL nt03: "counts" told % times', n; end if;
  if b not like 'NGN 1,000.00 is waiting%' or b ilike '%risk%' or b ilike '%review team%' then
    raise exception 'PROBE_FAIL nt03: the counts line is wrong or leaks why: %', b;
  end if;

  /* ---- available, rejected, reversed ---- */
  perform private.tell_referral_change(rid, referrer, 'pending', 'available', 100000);
  select body into b from public.notifications where user_id = referrer and title = 'Your referral reward is available';
  if b is distinct from 'NGN 1,000.00 is ready in Rewards.' then raise exception 'PROBE_FAIL nt03: available words: %', b; end if;
  perform private.tell_referral_change(rid, referrer, 'under_review', 'rejected', 100000);
  perform private.tell_referral_change(rid, referrer, 'attributed', 'reversed', null);
  perform private.tell_referral_change(gen_random_uuid(), referrer, 'available', 'reversed', 100000);
  select count(*) into n from public.notifications where user_id = referrer and title = 'An invite did not count';
  /* rejected, and reversed before a reward was earned: two rows */
  if n <> 2 then raise exception 'PROBE_FAIL nt03: "did not count" expected 2 rows, found %', n; end if;
  select count(*) into n from public.notifications where user_id = referrer and title = 'A referral reward was taken back';
  if n <> 1 then raise exception 'PROBE_FAIL nt03: taken-back reward not told once'; end if;

  /* ---- payouts ---- */
  perform private.tell_reward_payout(pid, referrer, 'sent', 250000, '1234');
  perform private.tell_reward_payout(pid, referrer, 'sent', 250000, '1234');
  perform private.tell_reward_payout(pid, referrer, 'paid', 250000, '1234');
  perform private.tell_reward_payout(pid, referrer, 'failed', 250000, 'oops');
  perform private.tell_reward_payout(pid, referrer, 'processing', 250000, '1234');
  select count(*) into n from public.notifications where user_id = referrer and title in ('Your payout is on its way', 'Your payout arrived', 'Your payout did not go through');
  if n <> 3 then raise exception 'PROBE_FAIL nt03: payout rows expected 3, found %', n; end if;
  select body into b from public.notifications where user_id = referrer and title = 'Your payout is on its way';
  if b is distinct from 'NGN 2,500.00 was sent to your bank account ending 1234. Banks usually show it the same day.' then
    raise exception 'PROBE_FAIL nt03: sent words: %', b;
  end if;
  select body into b from public.notifications where user_id = referrer and title = 'Your payout did not go through';
  if b like '%ending%' then raise exception 'PROBE_FAIL nt03: a malformed last four was printed'; end if;

  if exists (select 1 from public.notifications where user_id = referrer and href like '/rewards%'
              and (body ilike '%safe%' or body ilike '%secure%' or body ilike '%verified%' or body ilike '%guarantee%')) then
    raise exception 'PROBE_FAIL nt03: a referral notice makes a claim with no mechanism';
  end if;

  /* ---- the triggers and the grants ---- */
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.referrals'::regclass and t.tgname = 'referrals_zz_notify_referrer'
                  and not t.tgisinternal and (t.tgtype & 4) <> 0 and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt03: the referral trigger is missing or not on insert and update';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.rewards_payouts'::regclass and t.tgname = 'rewards_payouts_zz_notify_member'
                  and not t.tgisinternal and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt03: the payout trigger is missing';
  end if;
  if has_function_privilege('authenticated', 'private.tell_referral_change(uuid, uuid, text, text, bigint)', 'execute')
     or has_function_privilege('anon', 'private.tell_reward_payout(uuid, uuid, text, bigint, text)', 'execute')
     or has_function_privilege('service_role', 'private.notify_referral_change()', 'execute') then
    raise exception 'PROBE_FAIL nt03: an API role can run a notice function';
  end if;

  raise exception 'PROBE_OK nt03-referral-notices';
end
$$;
