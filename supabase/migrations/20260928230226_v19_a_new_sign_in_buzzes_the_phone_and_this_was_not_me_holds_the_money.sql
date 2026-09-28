/*
 * CUSTODY IS RETIRED (25 September 2026). The wallet and its debit trigger
 * are gone, so a hold now refuses only what the two live triggers guard:
 * adding or changing a bank account or a payout account
 * (`bank_accounts_00_money_hold`, `payout_accounts_00_money_hold`). That is
 * still the point: whoever took the session cannot redirect where the
 * person is paid. The notice says so, with kind `system` and a link to the
 * devices screen, instead of a wallet that no longer exists. The wallet
 * wording below describes the design as written on 24 September.
 *
 * V-19. A NEW SIGN-IN BUZZES THE PHONE, AND "THIS WAS NOT ME" HOLDS THE MONEY.
 *
 * `20260923093115` taught the database to notice a new device: `auth.sessions`
 * gets a row, `private.enqueue_new_device_email` writes a digest into
 * `public.known_devices`, and from the second distinct device onwards an email
 * is queued. That email is right and it is slow. `THE_FORTY_EVENTS.md` row 5
 * says it plainly: the most push-worthy security event in the product reaches
 * a person's inbox and not their phone, and an inbox is read hours later.
 *
 * WHY THE DIGEST NOW MEANS SOMETHING. Web sign-in runs in a server action, so
 * GoTrue recorded Node's own user agent ("node") on 99 of 105 live sessions,
 * and every web sign-in, a stranger's included, hashed to the same device.
 * `lib/security/agent-client.ts` forwards the browser's header on the three
 * calls that create a session, which is what makes the trigger below fire for
 * a stranger at all.
 *
 * Two things are added, and neither replaces anything that exists.
 *
 * 1. THE BUZZ. An AFTER INSERT trigger on `known_devices` calls
 *    `private.notify` for the same condition the email uses (a second distinct
 *    device or later). The row's own trigger (`notifications_push_enqueue`)
 *    queues the push, and `lib/push/policy.ts` treats this path as urgent
 *    through quiet hours. The existing trigger function is NOT replaced.
 *
 * 2. THE BUTTON. `public.report_not_me()` ends every other session and places
 *    a hold in THE AUDIT'S OWN HOLD, `public.account_money_holds` (live
 *    migration `20260924012454_staff_assisted_email_recovery`), with reason
 *    `not_me`. That hold is already enforced by the audit's triggers
 *    (`wallet_entries_00_money_hold`, `bank_accounts_00_money_hold`,
 *    `payout_accounts_00_money_hold`, all calling
 *    `private.refuse_money_out_during_hold`). Read from the live function,
 *    while it stands it refuses: a wallet DEBIT of kind withdrawal,
 *    transfer_out, payment or escrow_hold; adding a bank account or changing
 *    one's number or bank; and the same on an agent's payout account.
 *    Credits, card payments (which never debit the wallet) and removing an
 *    account still work. The trigger's own RM050 text names a support email
 *    change whatever the reason, so the app never shows it raw:
 *    `lib/security/account-hold-guard.ts` maps RM050 to the sentence for the
 *    hold's actual reason. This migration adds no second hold and no second
 *    trigger; it writes one row into the audit's table, under these rules:
 *
 *    - NO HOLD IN FORCE: a 24-hour hold is placed.
 *    - A HOLD IN FORCE, pressed from a session OLDER than the hold: the
 *      presser was signed in before whoever placed it, which is what the real
 *      owner looks like when a thief pressed first. The hold is extended to
 *      24 hours from now, never beyond 72 hours from when it was placed.
 *    - A HOLD IN FORCE, pressed from a newer session: nothing is extended, so
 *      a person who signs in and presses repeatedly cannot freeze an account
 *      for ever.
 *    - An existing hold with another reason (a support email change) keeps its
 *      reason and is only ever lengthened, never shortened.
 *    - Five presses an hour per account, through `private.consume_rate_limit`.
 *      The limit gates ONLY the hold and its notification. Every press ends
 *      every other session, so a thief who presses five times first cannot
 *      use up the owner's press; the owner's press still signs them out.
 *
 *    The password change is the step the server cannot take for them, so the
 *    screen sends them straight to it. Note for the audit, reported, not
 *    fixed here: `/reset-password` accepts any signed-in session without the
 *    current password, so an attacker who is still signed in could set one.
 *
 * WHAT THE NOTIFICATION DOES NOT SAY. No place: the address on
 * `auth.sessions` is whichever of our servers refreshed the token. No "just
 * now": a notification is read later than it is written. The device words
 * come from `private.device_words`, the fixed list of proper nouns.
 */

-- ----------------------------------------------------------------------------
-- "THIS WAS NOT ME".

create or replace function public.report_not_me()
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
  current_session uuid := nullif(((select auth.jwt()) ->> 'session_id'), '')::uuid;
  v_session_started timestamptz;
  v_hold public.account_money_holds%rowtype;
  v_ended integer;
  v_until timestamptz;
  v_placed boolean := false;
  v_extended boolean := false;
  v_allowed boolean;
  v_reason text;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select s.created_at into v_session_started from auth.sessions s where s.id = current_session;

  /* Everything but the phone in the hand. `is distinct from`, as in
     `end_other_sessions`, so a token with no session claim ends everything
     rather than sparing everything. */
  delete from auth.sessions s
   where s.user_id = actor
     and s.id is distinct from current_session;
  get diagnostics v_ended = row_count;

  /* The limit gates only the hold and the notification, never the signing
     out: a thief pressing five times must not use up the owner's press. */
  v_allowed := private.consume_rate_limit('security_not_me', actor::text, 5, 3600);

  select * into v_hold from public.account_money_holds h where h.user_id = actor for update;
  v_reason := case when found and v_hold.hold_until > now() then v_hold.reason else null end;

  if not v_allowed then
    v_until := case when v_reason is not null then v_hold.hold_until else null end;
  elsif not found or v_hold.hold_until <= now() then
    v_until := now() + interval '24 hours';
    insert into public.account_money_holds (user_id, hold_until, reason, created_at)
    values (actor, v_until, 'not_me', now())
    on conflict (user_id) do update
      set hold_until = excluded.hold_until, reason = excluded.reason, created_at = excluded.created_at;
    v_placed := true;
  elsif v_session_started is not null and v_session_started < v_hold.created_at then
    v_until := least(greatest(v_hold.hold_until, now() + interval '24 hours'),
                     v_hold.created_at + interval '72 hours');
    if v_until > v_hold.hold_until then
      update public.account_money_holds set hold_until = v_until where user_id = actor;
      v_extended := true;
    else
      v_until := v_hold.hold_until;
    end if;
  else
    v_until := v_hold.hold_until;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'security.not_me', 'account', actor::text,
          jsonb_build_object('sessions_ended', v_ended, 'hold_until', v_until,
                             'hold_placed', v_placed, 'hold_extended', v_extended,
                             'rate_limited', not v_allowed));

  if v_placed or v_extended then
    perform private.notify(
      actor,
      'system'::public.notification_kind,
      'Your payout details are locked for now',
      'You said a sign-in was not you. We signed out every other device, and nobody can add or change a bank or payout account on this account until the hold ends. Change your password now.',
      '/settings/devices'
    );
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'ended', v_ended,
    'hold_until', v_until,
    'hold_placed', v_placed,
    'hold_extended', v_extended,
    'hold_reason', v_reason,
    'rate_limited', not v_allowed
  );
end;
$$;

revoke all on function public.report_not_me() from public, anon, authenticated;
grant execute on function public.report_not_me() to authenticated;

comment on function public.report_not_me() is
  'V-19. The owner says a sign-in was not them: every other session ends, always, and a not_me row is written to the audit-owned public.account_money_holds (24h; extended to at most 72h only when pressed from a session older than the hold). The hold and its notification are limited to five an hour; the sign-out is not. Authorises off auth.uid() only.';

-- ----------------------------------------------------------------------------
-- WHICH DEVICE THE ALERT IS ABOUT, FOR ITS OWNER ONLY.

create or replace function public.my_new_device(p_fingerprint text)
returns table (device_words text, first_seen_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $$
  select d.device_words, d.first_seen_at
    from public.known_devices d
   where d.user_id = (select auth.uid())
     and d.fingerprint = left(coalesce(p_fingerprint, ''), 16);
$$;

revoke all on function public.my_new_device(text) from public, anon, authenticated;
grant execute on function public.my_new_device(text) to authenticated;

-- ----------------------------------------------------------------------------
-- THE BUZZ.

create or replace function private.notify_new_device()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_known integer;
  /* The digest of Node's own agent, which GoTrue recorded on nearly every
     web session before `agent-client.ts` forwarded the browser's. It is our
     server, not a device, so it neither counts as a first device nor is one. */
  c_node constant text := left(md5('node'), 16);
begin
  if new.fingerprint = c_node then
    return new;
  end if;
  /* The same rule as the email: the first device an account ever sees is
     the sign-up, not a stranger. The node digest does not count, so the
     first real browser after the fix is not announced as a stranger. */
  select count(*) into v_known
    from public.known_devices
   where user_id = new.user_id
     and fingerprint <> c_node;
  if v_known < 2 then
    return new;
  end if;

  perform private.notify(
    new.user_id,
    'system'::public.notification_kind,
    'New sign-in to Vallo',
    coalesce(new.device_words, 'A device we could not name')
      || ' signed in to your account. Was this you? If not, open this and tap This was not me.',
    '/settings/devices/alert?d=' || new.fingerprint
  );
  return new;
exception when others then
  /* This fires inside sign-in. It may never break it. */
  raise warning '[notify] new device notification failed: %', sqlstate;
  return new;
end;
$$;

revoke all on function private.notify_new_device() from public, anon, authenticated;

drop trigger if exists known_devices_notify_new_device on public.known_devices;
create trigger known_devices_notify_new_device
  after insert on public.known_devices
  for each row
  execute function private.notify_new_device();


-- ----------------------------------------------------------------------------
-- READ BACK.

do $$
declare
  v_open int;
begin
  if to_regclass('public.account_money_holds') is null then
    raise exception 'V-19 writes the audit hold public.account_money_holds, which is not here (20260924012454 must run first)';
  end if;

  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname = 'notify_new_device'
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: notify_new_device is executable by anon or authenticated';
  end if;

  if has_function_privilege('anon', 'public.report_not_me()', 'EXECUTE')
     or has_function_privilege('anon', 'public.my_new_device(text)', 'EXECUTE') then
    raise exception 'the not-me doors are open to anon';
  end if;

  if not exists (
    select 1 from pg_trigger t
     where not t.tgisinternal and t.tgenabled = 'O' and t.tgname = 'known_devices_notify_new_device'
  ) then
    raise exception 'the new sign-in trigger is not installed and enabled';
  end if;
end
$$;
