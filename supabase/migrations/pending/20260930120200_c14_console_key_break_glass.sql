-- C14: A WRITTEN WAY BACK FOR A LOST CONSOLE KEY (30 September 2026).
--
-- WAITS FOR THE LEAD'S REVIEW (second draft, after the lead held the first).
-- Idempotent and additive: one new table, one trigger, one function. It
-- DELETES NO KEY. No existing table, row, policy or function is changed.
--
-- WHY THE FIRST DRAFT WAS HELD. It deleted every row of `money_credentials`
-- for ANY target. That table has no kind or purpose column: one platform key
-- is at once the person's money lock, their passcode unlock and their console
-- proof. "Remove only the console key" cannot be a filter on a column that
-- does not exist, and deleting the row would have taken the money lock and
-- the passcode unlock with it.
--
-- WHAT THIS DOES INSTEAD: the key stays; its CONSOLE use is revoked.
--   * public.console_key_revocations (credential_id, user_id, reason, who,
--     when): RLS on, no policy, written only by the function below.
--   * private.refuse_revoked_console_key: a BEFORE INSERT OR UPDATE trigger on
--     public.console_step_ups that refuses a proof made with a revoked key,
--     whatever path writes it (lib/security/console-step-up.ts upserts there).
--     The money lock and the passcode unlock never read this table, so the
--     same key keeps working for them.
--   * public.admin_clear_console_keys(p_user, p_reason), same signature as the
--     first draft so the staff page needs no change to call it:
--       - only a super admin WITH A LIVE CONSOLE PROOF on this session
--         (private.has_role checks the proof for auth.uid(), and
--         private.console_step_up_ok() is also asked outright);
--       - never on themselves (a second super admin does it);
--       - only on a person who holds a live staff grant or an admin or
--         super_admin role (a member's keys are nobody's console business);
--       - a reason of 10 to 500 characters, required;
--       - revokes console use of every key the target holds today and ends
--         their open console proofs; keys enrolled afterwards are not revoked;
--       - writes ONE audit row, `staff.console_keys_revoked`, with the reason
--         and the count. No key material is copied anywhere.
--     Returns keys_removed (the count revoked for the console, kept under the
--     old name for the staff page) and keys_revoked.
--
-- WHAT THE APP STILL OWES (Admin/Platform lane, not in this file): the
-- console offers "Set up your key" only to a person holding NO key, so after
-- a revocation the person must enrol a NEW key; the enrolment check in
-- apps/web/src/app/admin/_components/ConsoleStepUp.tsx should count keys not
-- in console_key_revocations. Until then the person adds a second key from
-- the money-lock settings, and the console accepts that new key.
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

create table if not exists public.console_key_revocations (
  credential_id text primary key references public.money_credentials (credential_id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  revoked_by    uuid references auth.users (id) on delete set null,
  reason        text not null,
  revoked_at    timestamptz not null default now(),
  constraint console_key_revocations_reason_chk check (char_length(reason) between 10 and 500)
);
create index if not exists console_key_revocations_user_idx on public.console_key_revocations (user_id);
create index if not exists console_key_revocations_by_idx on public.console_key_revocations (revoked_by) where revoked_by is not null;
alter table public.console_key_revocations enable row level security;
revoke all on public.console_key_revocations from anon, authenticated;
-- No policy: only the definer function and trigger below touch it.

create or replace function private.refuse_revoked_console_key()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.credential_id is not null
     and exists (select 1 from public.console_key_revocations r where r.credential_id = new.credential_id) then
    raise exception 'console_key_revoked: this key can no longer open the console; enrol a new one'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;
revoke all on function private.refuse_revoked_console_key() from public, anon, authenticated;
drop trigger if exists console_step_ups_refuse_revoked_key on public.console_step_ups;
create trigger console_step_ups_refuse_revoked_key before insert or update of credential_id on public.console_step_ups
  for each row execute function private.refuse_revoked_console_key();

create or replace function public.admin_clear_console_keys(p_user uuid, p_reason text)
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor   uuid := (select auth.uid());
  reason  text := btrim(coalesce(p_reason, ''));
  revoked integer := 0;
begin
  if actor is null
     or not private.has_role(actor, 'super_admin'::public.app_role)
     or not coalesce(private.console_step_up_ok(), false) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_user is null or p_user = actor then
    return jsonb_build_object('status', 'invalid_target');
  end if;
  if char_length(reason) < 10 or char_length(reason) > 500 then
    return jsonb_build_object('status', 'reason_required');
  end if;
  if not exists (select 1 from public.staff_grants g where g.user_id = p_user and g.revoked_at is null)
     and not exists (select 1 from public.user_roles r
                      where r.user_id = p_user and r.role in ('admin'::public.app_role, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'not_staff');
  end if;

  insert into public.console_key_revocations (credential_id, user_id, revoked_by, reason)
  select mc.credential_id, p_user, actor, left(reason, 500)
    from public.money_credentials mc
   where mc.user_id = p_user
  on conflict (credential_id) do nothing;
  get diagnostics revoked = row_count;

  delete from public.console_step_ups where user_id = p_user;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'staff.console_keys_revoked', 'user', p_user::text,
          jsonb_build_object('reason', left(reason, 500), 'keys_revoked', revoked,
                             'note', 'console use only; money lock and passcode unlock keep the key'));

  return jsonb_build_object('status', 'ok', 'keys_removed', revoked, 'keys_revoked', revoked);
end;
$function$;

revoke all on function public.admin_clear_console_keys(uuid, text) from public, anon;
grant execute on function public.admin_clear_console_keys(uuid, text) to authenticated;

-- READ-BACK: raise if anything above did not land, or if the function could
-- delete a key.
do $check$
declare
  def text;
begin
  if to_regprocedure('public.admin_clear_console_keys(uuid, text)') is null then
    raise exception 'admin_clear_console_keys missing';
  end if;
  def := pg_get_functiondef('public.admin_clear_console_keys(uuid, text)'::regprocedure);
  if position('delete from public.money_credentials' in lower(def)) > 0 then
    raise exception 'admin_clear_console_keys must never delete a money credential';
  end if;
  if position('console_step_up_ok' in def) = 0 or position('staff_grants' in def) = 0 then
    raise exception 'admin_clear_console_keys is missing its proof or staff-target check';
  end if;
  if has_function_privilege('anon', 'public.admin_clear_console_keys(uuid, text)', 'execute') then
    raise exception 'admin_clear_console_keys is callable by anon';
  end if;
  if not (select prosecdef from pg_proc where oid = 'public.admin_clear_console_keys(uuid, text)'::regprocedure) then
    raise exception 'admin_clear_console_keys is not security definer';
  end if;
  if to_regclass('public.console_key_revocations') is null
     or not (select relrowsecurity from pg_class where oid = 'public.console_key_revocations'::regclass) then
    raise exception 'console_key_revocations is missing or has RLS off';
  end if;
  if has_table_privilege('authenticated', 'public.console_key_revocations', 'select')
     or has_table_privilege('authenticated', 'public.console_key_revocations', 'insert') then
    raise exception 'console_key_revocations is open to members';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'console_step_ups_refuse_revoked_key'
                   and tgrelid = 'public.console_step_ups'::regclass) then
    raise exception 'the revoked-key trigger is not on console_step_ups';
  end if;
end;
$check$;
