/*
 * V-19. A NEW SIGN-IN BUZZES THE PHONE, AND "THIS WAS NOT ME" HOLDS THE MONEY.
 *
 * `20260923093115` taught the database to notice a new device: `auth.sessions`
 * gets a row, `private.enqueue_new_device_email` writes a digest into
 * `public.known_devices`, and from the second distinct device onwards an email
 * is queued. That email is right and it is slow. `THE_FORTY_EVENTS.md` row 5
 * says it plainly: the most push-worthy security event in the product reaches
 * a person's inbox and not their phone, and an inbox is read hours later.
 *
 * Three things are added, and none of them replaces anything that exists.
 *
 * 1. THE BUZZ. An AFTER INSERT trigger on `known_devices` calls
 *    `private.notify` for the same condition the email uses (a second distinct
 *    device or later). `private.notify` writes the in-app row, and the row's
 *    own trigger (`notifications_push_enqueue`) puts it on the push queue if
 *    the person has any device registered. The push drain then sends it
 *    through `lib/push/policy.ts`, which treats the path this row carries as
 *    urgent, so quiet hours do not sit on it until morning. The existing
 *    trigger function is NOT replaced: a second trigger on the table the first
 *    one writes is additive, and the first one's exception handler still wraps
 *    the whole of sign-in.
 *
 * 2. THE HOLD. `public.account_holds` records "this was not me" as a dated
 *    row that ends by itself 24 hours later. A BEFORE INSERT trigger on
 *    `wallet_entries` refuses the two movements that take money out of the
 *    person's reach: a withdrawal debit and a wallet-to-wallet `transfer_out`.
 *    Nothing else is touched. Paying rent or a booking, funding, pots and
 *    escrow all carry on, because the hold exists to stop money LEAVING to a
 *    stranger, and a hold on everything would punish the owner for pressing
 *    the right button.
 *
 *    WHY A TRIGGER AND NOT AN EDIT TO THE TWO FUNCTIONS. `hold_wallet_withdrawal`
 *    and `private.transfer_between_wallets` are the audited money path and
 *    they belong to the audit session. A trigger on the ledger they both write
 *    reaches every door that writes those rows, including any door added
 *    later, without changing a line of either function. The server actions
 *    ask the same question first so the person reads a sentence rather than a
 *    database error; the trigger is the rule and the sentence is the courtesy.
 *
 * 3. THE BUTTON. `public.report_not_me()` ends every other session on the
 *    account, places the hold (once: pressing it again does not stack a
 *    second 24 hours on the first), writes an audit row and tells the person,
 *    in app, until when the hold stands. The password change is the step the
 *    server cannot take for them, so the screen sends them straight to it.
 *
 * WHAT THE NOTIFICATION DOES NOT SAY. The recommendation's example read
 * "Chrome on Android, Lagos, just now". There is no Lagos: the address on
 * `auth.sessions` is whichever of our servers refreshed the token, which is
 * the reason the devices screen shows no location either (`lib/security/
 * sessions.ts`). And there is no "just now", because a notification is read
 * later than it is written and carries its own time. The device words come
 * from `private.device_words`, the fixed list of proper nouns, and a device it
 * cannot name is called exactly that.
 */

-- ----------------------------------------------------------------------------
-- THE HOLD, AS A DATED ROW.

create table if not exists public.account_holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /* One reason today. A check constraint rather than an enum so a second
     reason (a support-placed hold, say) is a one-line migration. */
  reason text not null check (reason in ('not_me')),
  placed_at timestamptz not null default now(),
  ends_at timestamptz not null,
  /* How many other sessions the button ended. Recorded because "we signed you
     out everywhere else" is a claim, and the number is what proves it. */
  sessions_ended integer not null default 0 check (sessions_ended >= 0),
  constraint account_holds_ends_after_placed check (ends_at > placed_at)
);

create index if not exists account_holds_user_ends_idx
  on public.account_holds (user_id, ends_at desc);

comment on table public.account_holds is
  'V-19. A dated hold on money leaving an account (withdrawals and wallet-to-wallet sends), placed by the owner pressing "This was not me". Ends by itself at ends_at. The owner may read their own rows; only report_not_me() writes.';

alter table public.account_holds enable row level security;

/* BORN LOCKED. The default ACL hands every new table in `public` to anon and
   authenticated; take it back before anything is granted. */
revoke all on table public.account_holds from public, anon, authenticated;
grant select on table public.account_holds to authenticated;

drop policy if exists account_holds_select_own on public.account_holds;
create policy account_holds_select_own on public.account_holds
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- UNTIL WHEN IS THIS ACCOUNT HELD. NULL MEANS IT IS NOT.

create or replace function private.account_hold_until(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $$
  select max(h.ends_at)
    from public.account_holds h
   where h.user_id = p_user
     and h.ends_at > now();
$$;

revoke all on function private.account_hold_until(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- THE RULE: NO MONEY LEAVES A HELD ACCOUNT.

create or replace function private.refuse_money_out_during_account_hold()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid;
  v_until timestamptz;
begin
  /* Only the two movements that take money out of the person's reach. Every
     other kind passes without a lookup, so the ledger's hot path pays for one
     comparison and nothing else. */
  if not ((new.kind = 'withdrawal'::public.wallet_entry_kind and new.direction = 'debit')
          or new.kind = 'transfer_out'::public.wallet_entry_kind) then
    return new;
  end if;

  select w.user_id into v_user from public.wallets w where w.id = new.wallet_id;
  if v_user is null then
    return new;
  end if;

  v_until := private.account_hold_until(v_user);
  if v_until is not null then
    /* Deliberately NOT swallowed. Unlike the notification triggers, the whole
       point of this one is to stop the write. */
    raise exception 'account_hold_active'
      using errcode = 'P0001',
            hint = 'held until ' || to_char(v_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;

  return new;
end;
$$;

revoke all on function private.refuse_money_out_during_account_hold() from public, anon, authenticated;

drop trigger if exists wallet_entries_refuse_during_account_hold on public.wallet_entries;
create trigger wallet_entries_refuse_during_account_hold
  before insert on public.wallet_entries
  for each row
  execute function private.refuse_money_out_during_account_hold();

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
  v_ended integer;
  v_until timestamptz;
  v_placed boolean := false;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  /* Everything but the phone in the hand. `is distinct from`, as in
     `end_other_sessions`, so a token with no session claim ends everything
     rather than sparing everything. */
  delete from auth.sessions s
   where s.user_id = actor
     and s.id is distinct from current_session;
  get diagnostics v_ended = row_count;

  /* ONE HOLD, NOT A STACK. A second press inside the window keeps the first
     end time. Otherwise whoever holds a session could keep an owner's money
     frozen forever by pressing it once a day. */
  v_until := private.account_hold_until(actor);
  if v_until is null then
    v_until := now() + interval '24 hours';
    insert into public.account_holds (user_id, reason, ends_at, sessions_ended)
    values (actor, 'not_me', v_until, v_ended);
    v_placed := true;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'security.not_me', 'account', actor::text,
          jsonb_build_object('sessions_ended', v_ended, 'hold_until', v_until, 'hold_placed', v_placed));

  if v_placed then
    perform private.notify(
      actor,
      'wallet'::public.notification_kind,
      'Withdrawals and sends are on hold',
      'You said a sign-in was not you. We signed out every other device and nothing can leave your wallet for 24 hours. Change your password now.',
      '/wallet'
    );
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'ended', v_ended,
    'hold_until', v_until,
    'hold_placed', v_placed
  );
end;
$$;

revoke all on function public.report_not_me() from public, anon, authenticated;
grant execute on function public.report_not_me() to authenticated;

comment on function public.report_not_me() is
  'V-19. The owner says a sign-in was not them: every other session ends, withdrawals and wallet-to-wallet sends are held for 24 hours (once, never stacked), and an audit row is written. Authorises off auth.uid() only.';

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
begin
  /* The same rule as the email: the first device an account ever sees is
     the sign-up, not a stranger. */
  select count(*) into v_known from public.known_devices where user_id = new.user_id;
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
  v_triggers int;
  v_table_open int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in ('account_hold_until', 'refuse_money_out_during_account_hold', 'notify_new_device')
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: % private function(s) are executable by anon or authenticated', v_open;
  end if;

  if has_function_privilege('anon', 'public.report_not_me()', 'EXECUTE')
     or has_function_privilege('anon', 'public.my_new_device(text)', 'EXECUTE') then
    raise exception 'the not-me doors are open to anon';
  end if;

  select count(*) into v_triggers
    from pg_trigger t
   where not t.tgisinternal and t.tgenabled = 'O'
     and t.tgname in ('wallet_entries_refuse_during_account_hold', 'known_devices_notify_new_device');
  if v_triggers <> 2 then
    raise exception 'the two V-19 triggers are not both installed and enabled (%)', v_triggers;
  end if;

  select count(*) into v_table_open
    from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'account_holds'
     and (grantee in ('anon', 'PUBLIC')
       or (grantee = 'authenticated' and privilege_type <> 'SELECT'));
  if v_table_open <> 0 then
    raise exception 'account_holds is not born locked: % grant(s) stand', v_table_open;
  end if;
end
$$;
