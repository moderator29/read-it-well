-- B4 referral engine (D51): dated policy, lifecycle guard, append-only ledger,
-- one reward per phone, idempotent payout settlement that never pays on a
-- timeout and puts a failed payout back in the balance. Rolls back.
do $$
declare
  referrer constant uuid := gen_random_uuid();
  referred constant uuid := gen_random_uuid();
  other    constant uuid := gen_random_uuid();
  rid uuid; rid2 uuid; rid3 uuid; pid uuid; ok boolean; bal bigint; res jsonb; st text;
begin
  if (private.referral_policy_now()).reward_minor is distinct from 7000
     or (private.referral_policy_now()).member_monthly_cap is distinct from 1500
     or (private.referral_policy_now()).withdrawal_min_minor is distinct from 100000 then
    raise exception 'PROBE_FAIL b4-referral: the current policy row is not 70 naira, 1,500 a month, 1,000 naira minimum';
  end if;

  -- A policy row is never rewritten.
  ok := false;
  begin
    update public.referral_policy set reward_minor = 1 where id = (private.referral_policy_now()).id;
  exception when others then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b4-referral: a policy row was rewritten'; end if;

  insert into public.referrals (referrer_id, referred_id, code) values (referrer, referred, 'PROBE1') returning id into rid;

  -- Lifecycle: pending cannot jump to paid.
  ok := false;
  begin
    update public.referrals set status = 'paid' where id = rid;
  exception when others then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b4-referral: pending moved straight to paid'; end if;

  -- Walk it to available with a reward, as qualification and the hold would.
  update public.referrals set status = 'qualified', reward_minor = 60000, month = private.lagos_month(now()),
         referred_phone_key = 'probe-phone-key' where id = rid;
  update public.referrals set status = 'approved', approved_at = now() - interval '30 days' where id = rid;
  perform public.referral_release_due();
  select status into st from public.referrals where id = rid;
  if st <> 'available' then raise exception 'PROBE_FAIL b4-referral: release_due left the referral %', st; end if;
  select coalesce(sum(amount_minor), 0) into bal from public.rewards_ledger where member_id = referrer;
  if bal <> 60000 then raise exception 'PROBE_FAIL b4-referral: balance after release is %, not 60000', bal; end if;

  -- The reward is fixed once set.
  ok := false;
  begin
    update public.referrals set reward_minor = 1 where id = rid;
  exception when others then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b4-referral: a fixed reward was changed'; end if;

  -- One reward per verified identity.
  ok := false;
  begin
    insert into public.referrals (referrer_id, referred_id, code, referred_phone_key) values (other, gen_random_uuid(), 'PROBE2', 'probe-phone-key');
  exception when unique_violation then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b4-referral: one phone earned two referral rewards'; end if;

  -- The ledger is append-only.
  ok := false;
  begin
    update public.rewards_ledger set amount_minor = 99999 where member_id = referrer;
  exception when others then ok := true;
  end;
  if not ok then raise exception 'PROBE_FAIL b4-referral: a ledger entry was rewritten'; end if;

  -- A payout: held, then a timeout (unknown) releases nothing, then failure
  -- releases it exactly once, and a late success cannot overturn the failure.
  insert into public.rewards_payouts (member_id, amount_minor, reference, bank_code, account_last4, account_name)
  values (referrer, 60000, 'vallo-rw-probe', '058', '1234', 'PROBE NAME') returning id into pid;
  insert into public.rewards_ledger (member_id, kind, amount_minor, payout_id, reason, idempotency_key)
  values (referrer, 'payout_hold', -60000, pid, 'probe hold', 'hold:' || pid);
  update public.referrals set status = 'processing', payout_id = pid where id = rid;

  res := public.rewards_payout_settle('vallo-rw-probe', 'unknown');
  select coalesce(sum(amount_minor), 0) into bal from public.rewards_ledger where member_id = referrer;
  if bal <> 0 then raise exception 'PROBE_FAIL b4-referral: a timeout moved the balance to %', bal; end if;

  res := public.rewards_payout_settle('vallo-rw-probe', 'failed', 'failed', null, null, 'probe');
  res := public.rewards_payout_settle('vallo-rw-probe', 'failed', 'failed', null, null, 'probe');
  select coalesce(sum(amount_minor), 0) into bal from public.rewards_ledger where member_id = referrer;
  if bal <> 60000 then raise exception 'PROBE_FAIL b4-referral: after a failed payout the balance is %, not 60000', bal; end if;
  select status into st from public.referrals where id = rid;
  if st <> 'available' then raise exception 'PROBE_FAIL b4-referral: a failed payout left the referral %', st; end if;
  res := public.rewards_payout_settle('vallo-rw-probe', 'paid');
  if (res ->> 'changed')::boolean then raise exception 'PROBE_FAIL b4-referral: a failed payout became paid'; end if;

  -- Reversal writes a negative entry with its reason; nothing is rewritten.
  perform private.referral_reverse(rid, 'probe: the booking was refunded', null);
  select coalesce(sum(amount_minor), 0) into bal from public.rewards_ledger where member_id = referrer;
  if bal <> 0 then raise exception 'PROBE_FAIL b4-referral: after reversal the balance is %', bal; end if;
  if not exists (select 1 from public.rewards_ledger where referral_id = rid and kind = 'reward_reversed'
                   and reason = 'probe: the booking was refunded') then
    raise exception 'PROBE_FAIL b4-referral: the reversal entry carries no reason';
  end if;

  -- A reward earned and then moved to under_review is still taken back
  -- (reversal decides by the earn entry, never by status).
  insert into public.referrals (referrer_id, referred_id, code) values (other, gen_random_uuid(), 'PROBE3') returning id into rid3;
  update public.referrals set status = 'qualified', reward_minor = 7000, month = private.lagos_month(now()) where id = rid3;
  update public.referrals set status = 'approved', approved_at = now() - interval '30 days' where id = rid3;
  perform public.referral_release_due();
  update public.referrals set status = 'under_review' where id = rid3;
  perform private.referral_reverse(rid3, 'probe: chargeback while under review', null);
  select coalesce(sum(amount_minor), 0) into bal from public.rewards_ledger where member_id = other;
  if bal <> 0 then raise exception 'PROBE_FAIL b4-referral: an under_review reversal left % in the balance', bal; end if;

  -- Payouts are off by default: nothing is held or opened.
  res := public.rewards_payout_open(referrer, '058', '0123456789', 'PROBE NAME', 'RCP_probe');
  if res ->> 'status' <> 'not_available' then
    raise exception 'PROBE_FAIL b4-referral: a payout opened while payouts are off (%)', res;
  end if;

  -- Members never see fraud signals, provider handles or the policy.
  if has_column_privilege('authenticated', 'public.rewards_payouts', 'risk_score', 'SELECT')
     or has_column_privilege('authenticated', 'public.rewards_payouts', 'account_key', 'SELECT')
     or has_column_privilege('authenticated', 'public.rewards_payouts', 'recipient_code', 'SELECT')
     or has_table_privilege('authenticated', 'public.referral_policy', 'SELECT') then
    raise exception 'PROBE_FAIL b4-referral: a member can read risk, account keys or the policy';
  end if;
  if has_table_privilege('service_role', 'public.rewards_ledger', 'TRUNCATE') then
    raise exception 'PROBE_FAIL b4-referral: service_role can truncate the ledger';
  end if;

  -- Members cannot write; anon cannot read.
  if has_table_privilege('authenticated', 'public.rewards_ledger', 'INSERT')
     or has_table_privilege('anon', 'public.referrals', 'SELECT') then
    raise exception 'PROBE_FAIL b4-referral: the API can write the ledger or read referrals';
  end if;
  if has_function_privilege('authenticated', 'public.rewards_payout_settle(text,text,text,text,text,text)', 'EXECUTE') then
    raise exception 'PROBE_FAIL b4-referral: a member can settle a payout';
  end if;

  raise exception 'PROBE_OK b4-referral';
end $$;
