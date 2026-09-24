-- SEC-15: a staff-assisted way back in for a person who has lost their
-- mailbox. The address still cannot be changed by its owner (nothing in the
-- product calls updateUser with an email, and the confirm screen refuses
-- email_change tokens). A SUPER ADMIN can move an account to a new address
-- only when:
--   * the NIN the person gives matches the NIN on an APPROVED identity
--     application on file (agent_applications, id_type = 'nin');
--   * 72 hours have passed since the OLD address was told (cooling-off),
--     during which any admin or the account's owner can cancel it;
--   * the super admin is not moving their own account;
-- and every step writes an audit_log row. The auth row itself is changed by
-- the server with the service role (lib/admin/email-recovery-actions.ts)
-- between `admin_begin_email_recovery` and `admin_finish_email_recovery`.
--
-- TWO PEOPLE: the super admin who opened a request cannot begin it, and only
-- the super admin who began it can finish it.
-- THE NOTICE MUST HAVE GONE: begin refuses until the old address was told
-- (opened_notice_at), and the 72 hours count from that notice.
-- ON THE MOVE: every session of the account ends (refresh tokens cascade from
-- auth.sessions), and money cannot leave the account for 7 days (withdrawals,
-- wallet sends, wallet payments and escrow holds, new or repointed payout
-- accounts), enforced by triggers on the tables those doors write, so every
-- door is covered. Money coming in is never held.
-- An account that is closed, being closed or banned cannot be re-addressed.
-- The OWNER can cancel a request against their own account from the app.

create table if not exists public.email_recovery_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  old_email       text not null,
  new_email       text not null
                  check (length(new_email) <= 254 and new_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  identity_source text not null,
  evidence_ref    text not null check (length(btrim(evidence_ref)) >= 8),
  status          text not null default 'cooling_off'
                  check (status in ('cooling_off', 'completing', 'completed', 'cancelled')),
  opened_by       uuid not null references auth.users(id),
  opened_at       timestamptz not null default now(),
  eligible_at     timestamptz not null,
  completed_by    uuid references auth.users(id),
  completed_at    timestamptz,
  cancelled_by    uuid references auth.users(id),
  cancelled_at    timestamptz,
  cancel_reason   text,
  began_by        uuid references auth.users(id),
  last_error      text,
  -- When the old address was told (written by the server after the send).
  opened_notice_at    timestamptz,
  completed_notice_at timestamptz
);

create unique index if not exists email_recovery_requests_one_open
  on public.email_recovery_requests (user_id)
  where status in ('cooling_off', 'completing');

alter table public.email_recovery_requests enable row level security;

drop policy if exists email_recovery_requests_admin_select on public.email_recovery_requests;
create policy email_recovery_requests_admin_select on public.email_recovery_requests
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

drop policy if exists email_recovery_requests_owner_select on public.email_recovery_requests;
create policy email_recovery_requests_owner_select on public.email_recovery_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.email_recovery_requests from anon, authenticated;
grant select on public.email_recovery_requests to authenticated;

------------------------------------------------------------------------------
-- Open a request.
------------------------------------------------------------------------------
create or replace function public.admin_open_email_recovery(
  p_user uuid,
  p_new_email text,
  p_nin text,
  p_evidence_ref text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller  uuid := (select auth.uid());
  old     text;
  fresh   text := lower(btrim(coalesce(p_new_email, '')));
  source  uuid;
  request uuid;
begin
  if caller is null or not private.has_role(caller, 'super_admin'::public.app_role) then
    raise exception 'Only a super admin can move an account to a new address.' using errcode = '42501';
  end if;
  if caller = p_user then
    raise exception 'Nobody can move their own account. Another super admin has to do it.' using errcode = '42501';
  end if;

  select u.email into old from auth.users u where u.id = p_user and u.deleted_at is null;
  if old is null then
    raise exception 'There is no such account.' using errcode = 'RM040';
  end if;
  -- An account being deleted, deleted, or banned is not re-addressed.
  if exists (select 1 from public.account_deletion_requests d
              where d.user_id = p_user and d.status in ('SCHEDULED', 'PURGING', 'PURGED'))
     or exists (select 1 from auth.users u where u.id = p_user and u.banned_until > now()) then
    raise exception 'This account is closed, being closed, or banned, so it cannot be moved to a new address.'
      using errcode = 'RM040';
  end if;
  if fresh = '' or fresh = lower(old) then
    raise exception 'The new address has to be different from the one on the account.' using errcode = 'RM040';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = fresh) then
    raise exception 'That address already belongs to an account.' using errcode = 'RM040';
  end if;
  if length(regexp_replace(coalesce(p_nin, ''), '\D', '', 'g')) <> 11 then
    raise exception 'A NIN has eleven digits.' using errcode = 'RM040';
  end if;

  select a.id into source
    from public.agent_applications a
   where a.user_id = p_user
     and a.id_type = 'nin'
     and a.status = 'APPROVED'
     and regexp_replace(coalesce(a.id_number, ''), '\D', '', 'g') = regexp_replace(p_nin, '\D', '', 'g')
   order by a.reviewed_at desc nulls last
   limit 1;
  if source is null then
    raise exception 'The NIN given does not match an approved identity on file for this account, so it cannot be moved.'
      using errcode = 'RM040';
  end if;

  insert into public.email_recovery_requests
    (user_id, old_email, new_email, identity_source, evidence_ref, opened_by, eligible_at)
  values
    (p_user, old, fresh, 'agent_application:' || source::text, btrim(p_evidence_ref), caller, now() + interval '72 hours')
  returning id into request;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (caller, 'account.email_recovery.opened', 'user', p_user::text,
    jsonb_build_object('request_id', request, 'identity_source', 'agent_application:' || source::text,
                       'evidence_ref', btrim(p_evidence_ref), 'eligible_at', now() + interval '72 hours'));

  return request;
end;
$$;

------------------------------------------------------------------------------
-- Begin: the cooling-off is over; the server now changes the auth row.
------------------------------------------------------------------------------
create or replace function public.admin_begin_email_recovery(p_request uuid)
returns table (user_id uuid, old_email text, new_email text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  r      public.email_recovery_requests;
begin
  if caller is null or not private.has_role(caller, 'super_admin'::public.app_role) then
    raise exception 'Only a super admin can move an account to a new address.' using errcode = '42501';
  end if;

  select * into r from public.email_recovery_requests q where q.id = p_request for update;
  if r.id is null or r.status <> 'cooling_off' then
    raise exception 'That request is not waiting to be completed.' using errcode = 'RM041';
  end if;
  if r.user_id = caller then
    raise exception 'Nobody can move their own account. Another super admin has to do it.' using errcode = '42501';
  end if;
  if r.opened_by = caller then
    raise exception 'A different super admin from the one who opened it has to complete it.' using errcode = '42501';
  end if;
  if r.opened_notice_at is null then
    raise exception 'The old address has not been told yet. Send the notice first; the 72 hours count from it.' using errcode = 'RM041';
  end if;
  if now() < greatest(r.eligible_at, r.opened_notice_at + interval '72 hours') then
    raise exception 'The 72 hour cooling-off has not passed yet.' using errcode = 'RM041';
  end if;

  update public.email_recovery_requests q set status = 'completing', began_by = caller, last_error = null where q.id = r.id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (caller, 'account.email_recovery.completing', 'user', r.user_id::text, jsonb_build_object('request_id', r.id));

  return query select r.user_id, r.old_email, r.new_email;
end;
$$;

------------------------------------------------------------------------------
-- The money hold after a move: 7 days in which nothing can leave the account.
------------------------------------------------------------------------------
create table if not exists public.account_money_holds (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  hold_until timestamptz not null,
  reason     text not null,
  created_at timestamptz not null default now()
);

alter table public.account_money_holds enable row level security;

drop policy if exists account_money_holds_read on public.account_money_holds;
create policy account_money_holds_read on public.account_money_holds
  for select to authenticated
  using (user_id = (select auth.uid())
      or private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

revoke all on public.account_money_holds from anon, authenticated;
grant select on public.account_money_holds to authenticated;

create or replace function private.money_hold_until(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select h.hold_until from public.account_money_holds h
   where h.user_id = p_user and h.hold_until > now();
$$;

revoke all on function private.money_hold_until(uuid) from public, anon, authenticated;

create or replace function private.refuse_money_out_during_hold()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  until timestamptz;
begin
  -- An edit that does not change where money goes (the default flag, a
  -- removal and the default promoted after it, a cached recipient code) is
  -- not money leaving, and removing an account must keep working.
  if tg_op = 'UPDATE' then
    if new.account_number is not distinct from old.account_number
       and new.bank_code is not distinct from old.bank_code then
      return new;
    end if;
  end if;

  if tg_table_name = 'wallet_entries' then
    -- Paying for something from the wallet (payment, escrow_hold) is held
    -- too: a taken-over account must not be drained by paying a colluding
    -- host. Card payments do not debit the wallet and are unaffected.
    if new.direction::text <> 'debit'
       or new.kind::text not in ('withdrawal', 'transfer_out', 'payment', 'escrow_hold') then
      return new;
    end if;
    select w.user_id into owner from public.wallets w where w.id = new.wallet_id;
  elsif tg_table_name = 'bank_accounts' then
    owner := new.user_id;
  else
    select a.user_id into owner from public.agents a where a.id = new.agent_id;
  end if;

  until := private.money_hold_until(owner);
  if until is not null then
    raise exception 'Money cannot leave this account until %, because its email address was changed by support.',
      to_char(until at time zone 'Africa/Lagos', 'FMDD Month YYYY, HH24:MI')
      using errcode = 'RM050';
  end if;
  return new;
end;
$$;

revoke all on function private.refuse_money_out_during_hold() from public, anon, authenticated;

drop trigger if exists wallet_entries_00_money_hold on public.wallet_entries;
create trigger wallet_entries_00_money_hold
  before insert on public.wallet_entries
  for each row execute function private.refuse_money_out_during_hold();

drop trigger if exists bank_accounts_00_money_hold on public.bank_accounts;
create trigger bank_accounts_00_money_hold
  before insert or update on public.bank_accounts
  for each row execute function private.refuse_money_out_during_hold();

drop trigger if exists payout_accounts_00_money_hold on public.payout_accounts;
create trigger payout_accounts_00_money_hold
  before insert or update on public.payout_accounts
  for each row execute function private.refuse_money_out_during_hold();

------------------------------------------------------------------------------
-- Finish: only the super admin who began it. On success every session ends
-- and the 7 day money hold starts.
------------------------------------------------------------------------------
create or replace function public.admin_finish_email_recovery(p_request uuid, p_ok boolean, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller   uuid := (select auth.uid());
  r        public.email_recovery_requests;
  ended    integer := 0;
  until    timestamptz := now() + interval '7 days';
begin
  if caller is null or not private.has_role(caller, 'super_admin'::public.app_role) then
    raise exception 'Only a super admin can move an account to a new address.' using errcode = '42501';
  end if;

  select * into r from public.email_recovery_requests q where q.id = p_request for update;
  if r.id is null or r.status <> 'completing' then
    raise exception 'That request is not being completed.' using errcode = 'RM041';
  end if;
  if r.began_by is distinct from caller then
    raise exception 'Only the super admin who began the move can finish it.' using errcode = '42501';
  end if;

  if p_ok then
    update public.email_recovery_requests q
       set status = 'completed', completed_by = caller, completed_at = now(), last_error = null
     where q.id = r.id;
    -- Whoever holds the account now signs in again, at the new address.
    -- auth.refresh_tokens cascades from auth.sessions.
    delete from auth.sessions s where s.user_id = r.user_id;
    get diagnostics ended = row_count;
    insert into public.account_money_holds (user_id, hold_until, reason)
    values (r.user_id, until, 'email address moved by support (request ' || r.id::text || ')')
    on conflict (user_id) do update
      set hold_until = greatest(public.account_money_holds.hold_until, excluded.hold_until),
          reason = excluded.reason;
  else
    update public.email_recovery_requests q
       set status = 'cooling_off', began_by = null, last_error = left(coalesce(p_error, 'unknown'), 500)
     where q.id = r.id;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (caller,
    case when p_ok then 'account.email_recovery.completed' else 'account.email_recovery.failed' end,
    'user', r.user_id::text,
    jsonb_build_object('request_id', r.id,
                       'sessions_ended', case when p_ok then ended else null end,
                       'money_hold_until', case when p_ok then until else null end,
                       'error', case when p_ok then null else left(coalesce(p_error, 'unknown'), 500) end));
end;
$$;

------------------------------------------------------------------------------
-- Cancel: any admin, or the account's own owner, during the cooling-off.
------------------------------------------------------------------------------
create or replace function public.admin_cancel_email_recovery(p_request uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  staff  boolean;
  r      public.email_recovery_requests;
begin
  if caller is null then
    raise exception 'Sign in to cancel this.' using errcode = '42501';
  end if;
  staff := private.has_role(caller, 'admin'::public.app_role)
        or private.has_role(caller, 'super_admin'::public.app_role);

  select * into r from public.email_recovery_requests q where q.id = p_request for update;
  if r.id is null or not (staff or r.user_id = caller) then
    raise exception 'There is no such request on your account.' using errcode = '42501';
  end if;
  if staff and r.user_id <> caller and length(btrim(coalesce(p_reason, ''))) < 4 then
    raise exception 'Say why it is being cancelled.' using errcode = 'RM041';
  end if;
  if r.status <> 'cooling_off' then
    raise exception 'Only a request still in its cooling-off can be cancelled.' using errcode = 'RM041';
  end if;

  update public.email_recovery_requests q
     set status = 'cancelled', cancelled_by = caller, cancelled_at = now(),
         cancel_reason = coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'cancelled by the account owner')
   where q.id = r.id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (caller, 'account.email_recovery.cancelled', 'user', r.user_id::text,
    jsonb_build_object('request_id', r.id, 'by_owner', r.user_id = caller,
                       'reason', coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'cancelled by the account owner')));
end;
$$;

revoke all on function public.admin_open_email_recovery(uuid, text, text, text) from public, anon;
revoke all on function public.admin_begin_email_recovery(uuid) from public, anon;
revoke all on function public.admin_finish_email_recovery(uuid, boolean, text) from public, anon;
revoke all on function public.admin_cancel_email_recovery(uuid, text) from public, anon;
grant execute on function public.admin_open_email_recovery(uuid, text, text, text) to authenticated;
grant execute on function public.admin_begin_email_recovery(uuid) to authenticated;
grant execute on function public.admin_finish_email_recovery(uuid, boolean, text) to authenticated;
grant execute on function public.admin_cancel_email_recovery(uuid, text) to authenticated;