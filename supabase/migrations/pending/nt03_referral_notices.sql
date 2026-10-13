-- DRAFT, not applied. NOTIFICATIONS 3 of 5. Needs nt01.
--
-- GAP: the referral programme tells the person who invited nobody anything. A
-- friend joins with their code, finishes the steps, the review window passes,
-- the reward becomes available, a payout is sent or fails: not one of those
-- writes a notification, so the only way to learn is to open Rewards and look.
-- Nothing in the schema references private.notify for referrals.
--
-- WHAT THIS ADDS, WITHOUT TOUCHING A REFERRAL OR REWARD FUNCTION:
--   * a trigger on public.referrals (insert, and status change) that tells the
--     referrer: someone joined with your invite; your invite counts (the phone
--     or other step was done and the reward is waiting out its review window);
--     the reward is available; an invite did not count; a reward was taken
--     back. It says nothing about risk or why a check happened (a person under
--     review hears the same neutral line as one who is not).
--   * a trigger on public.rewards_payouts that tells the member their payout
--     was sent, arrived, or did not go through.
-- The referred person is never named: the invite is told, not the friend.
--
-- Kind 'system' (no switch claims to govern it, like a support reply), through
-- private.notify_once so each referral state and each payout state is told
-- once. Both triggers swallow their own errors: a notice may never be the
-- reason a reward or a payout write fails.
--
-- Additive only, nothing is removed: new functions and two new triggers.
-- Probe: supabase/tests/probes-pending/nt03-referral-notices.sql
set lock_timeout = '5s';

create or replace function private.tell_referral_change(
  p_referral uuid,
  p_referrer uuid,
  p_old text,
  p_new text,
  p_reward_minor bigint
)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  reward text := case
    when p_reward_minor is not null and p_reward_minor > 0
      then 'NGN ' || to_char(p_reward_minor::numeric / 100, 'FM999,999,999,990.00')
    else 'Your reward'
  end;
  key text := 'referral:' || p_referral::text || ':' || p_new;
begin
  if p_new = 'attributed' then
    perform private.notify_once(key, p_referrer, 'system', 'Someone joined with your invite',
      'They need to finish a few steps, such as confirming a phone number, before the invite counts. We will tell you when it does.',
      '/rewards/referrals');
  elsif p_new in ('pending', 'under_review') and p_old in ('attributed', 'qualified') then
    /* One line for both: nobody is told why a check happened. */
    perform private.notify_once('referral:' || p_referral::text || ':counts', p_referrer, 'system', 'Your invite counts',
      reward || ' is waiting out its review period. We will tell you when it is available.',
      '/rewards/referrals');
  elsif p_new = 'available' then
    perform private.notify_once(key, p_referrer, 'system', 'Your referral reward is available',
      reward || ' is ready in Rewards.',
      '/rewards');
  elsif p_new = 'rejected' then
    perform private.notify_once(key, p_referrer, 'system', 'An invite did not count',
      'We looked at one of your invites and could not count it. Open Rewards for the details.',
      '/rewards/referrals');
  elsif p_new = 'reversed' and p_old in ('available', 'withdrawal_requested', 'sent', 'paid') then
    /* Only a reward that had already been earned is "taken back". */
    perform private.notify_once(key, p_referrer, 'system', 'A referral reward was taken back',
      reward || ' was taken back. Open Rewards for the details.',
      '/rewards/history');
  elsif p_new = 'reversed' then
    perform private.notify_once(key, p_referrer, 'system', 'An invite did not count',
      'One of your invites could not be counted. Open Rewards for the details.',
      '/rewards/referrals');
  end if;
end;
$fn$;

create or replace function private.notify_referral_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  begin
    if tg_op = 'INSERT' then
      perform private.tell_referral_change(new.id, new.referrer_id, null, new.status, new.reward_minor);
    elsif new.status is distinct from old.status then
      perform private.tell_referral_change(new.id, new.referrer_id, old.status, new.status, new.reward_minor);
    end if;
  exception when others then
    raise warning '[notify] referral notice failed: %', sqlstate;
  end;
  return new;
end;
$fn$;

create or replace trigger referrals_zz_notify_referrer
  after insert or update of status on public.referrals
  for each row execute function private.notify_referral_change();

create or replace function private.tell_reward_payout(
  p_payout uuid,
  p_member uuid,
  p_status text,
  p_amount_minor bigint,
  p_last4 text
)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  amt text := 'NGN ' || to_char(p_amount_minor::numeric / 100, 'FM999,999,999,990.00');
  acct text := case when coalesce(p_last4, '') ~ '^[0-9]{4}$' then ' ending ' || p_last4 else '' end;
begin
  if p_status = 'sent' then
    perform private.notify_once('payout:' || p_payout::text || ':sent', p_member, 'system', 'Your payout is on its way',
      amt || ' was sent to your bank account' || acct || '. Banks usually show it the same day.',
      '/rewards/history');
  elsif p_status = 'paid' then
    perform private.notify_once('payout:' || p_payout::text || ':paid', p_member, 'system', 'Your payout arrived',
      amt || ' reached your bank account' || acct || '.',
      '/rewards/history');
  elsif p_status = 'failed' then
    perform private.notify_once('payout:' || p_payout::text || ':failed', p_member, 'system', 'Your payout did not go through',
      amt || ' did not reach your bank account' || acct || '. The reward is still yours: open Rewards to try again, or contact support.',
      '/rewards');
  end if;
end;
$fn$;

create or replace function private.notify_reward_payout()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  begin
    if new.status is distinct from old.status and new.status in ('sent', 'paid', 'failed') then
      perform private.tell_reward_payout(new.id, new.member_id, new.status, new.amount_minor, new.account_last4);
    end if;
  exception when others then
    raise warning '[notify] reward payout notice failed: %', sqlstate;
  end;
  return new;
end;
$fn$;

create or replace trigger rewards_payouts_zz_notify_member
  after update of status on public.rewards_payouts
  for each row execute function private.notify_reward_payout();

revoke all on function
  private.tell_referral_change(uuid, uuid, text, text, bigint),
  private.notify_referral_change(),
  private.tell_reward_payout(uuid, uuid, text, bigint, text),
  private.notify_reward_payout()
  from public, anon, authenticated, service_role;
