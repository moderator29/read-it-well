/*
 * AML-19. Controls that management and the Compliance Officer cannot override.
 * This closes what ESC-07 and ESC-08 (20260924015442) left open.
 *
 * Already in place from ESC-07/08:
 *   - only a super admin rules;
 *   - a party never rules;
 *   - two super admins rule at or above N500,000 and after any reversal;
 *   - every ruling and every feature flag change is audited;
 *   - held payments stay shut while custody is undecided.
 *
 * Closed here:
 *   1. Nobody rules on, or reverses, an escrow they opened. A trigger on
 *      escrow_rulings refuses a proposer, approver, reversal proposer or
 *      reverser who is the payer, the payee or the opener, whichever function
 *      writes the row.
 *   2. Reversing a ruling takes two super admins. The first proposes the
 *      reversal and its reason. A second, who neither made nor approved the
 *      ruling, applies it word for word. The ruling guard refuses
 *      applied -> reversed without a live proposal from a different person.
 *      Every step is an audit row.
 *   3. Two super admins are needed, and an audit row is written, to:
 *        - open held payments (the held_payments flag switched on);
 *        - change custody_structure;
 *        - grant the admin or super_admin role.
 *      Each goes through private.control_requests: one proposes, a different
 *      super admin approves, and the change is made inside that approval. The
 *      guards on feature_flags, platform_settings and user_roles refuse the
 *      write otherwise.
 *      The database owner (a migration or the SQL console) is outside this
 *      control and is still audited.
 *      Closing held payments and removing a role stay one-person acts: they
 *      only ever reduce what can be done.
 *   4. Every fee_rates write is audited, whatever the path (set_fee_rate
 *      already audited its own inserts; the table itself did not).
 *
 * With one super admin, as today, every two-person path records the proposal
 * and waits. It fails closed, as the rulings above N500,000 already do.
 */

-- 0. The database owner, as opposed to anybody reaching the API.
create or replace function private.is_owner_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon', 'service_role')
     and session_user::text <> 'authenticator';
$$;
revoke all on function private.is_owner_session() from public, anon, authenticated, service_role;

-- 1. Two-person requests.
create table if not exists private.control_requests (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('held_payments_open', 'custody_structure', 'staff_role_grant')),
  target      text not null,
  value       text not null,
  note        text,
  state       text not null default 'proposed' check (state in ('proposed', 'applied', 'lapsed')),
  proposed_by uuid not null,
  proposed_at timestamptz not null default now(),
  approved_by uuid,
  applied_at  timestamptz,
  check (approved_by is null or approved_by <> proposed_by),
  check ((state = 'applied') = (approved_by is not null and applied_at is not null))
);
create unique index if not exists control_requests_one_open
  on private.control_requests (kind, target) where state = 'proposed';
revoke all on private.control_requests from public, anon, authenticated, service_role;

create or replace function private.audit_control_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'control_requests_are_kept: a two-person request is never deleted' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE'
     and (new.kind, new.target, new.value, new.note, new.proposed_by, new.proposed_at)
         is distinct from (old.kind, old.target, old.value, old.note, old.proposed_by, old.proposed_at) then
    raise exception 'control_requests_are_kept: who proposed what is fixed' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.state <> 'proposed' then
    raise exception 'control_requests_are_kept: a % request is final', old.state using errcode = '42501';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    coalesce(new.approved_by, new.proposed_by),
    'control_request.' || new.state,
    'control_request',
    new.id::text,
    jsonb_build_object('kind', new.kind, 'target', new.target, 'value', new.value, 'note', new.note,
                       'proposed_by', new.proposed_by, 'approved_by', new.approved_by));
  return new;
end;
$$;
revoke all on function private.audit_control_request() from public, anon, authenticated, service_role;
drop trigger if exists control_requests_audit on private.control_requests;
create trigger control_requests_audit
  before insert or update or delete on private.control_requests
  for each row execute function private.audit_control_request();

/* True only inside the approval that applied this exact change: the setting
   names a request, and the request row, which no API role can write, says
   applied, now, for this kind, target and value. */
create or replace function private.control_approved(p_kind text, p_target text, p_value text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  raw text := coalesce(current_setting('vallo.control_request', true), '');
begin
  if raw !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from private.control_requests c
     where c.id = raw::uuid and c.state = 'applied' and c.applied_at = now()
       and c.kind = p_kind and c.target = p_target and c.value = p_value);
end;
$$;
revoke all on function private.control_approved(text, text, text) from public, anon, authenticated, service_role;

create or replace function private.control_request_apply(
  p_actor uuid, p_kind text, p_target text, p_value text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  req private.control_requests;
  target_user uuid;
begin
  if p_actor is null or not private.has_role(p_actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if p_kind = 'held_payments_open' then
    if p_target <> 'held_payments' or p_value <> 'on' then
      return jsonb_build_object('status', 'bad_request');
    end if;
    if private.custody_structure() not in ('trustee', 'licensed_partner') then
      return jsonb_build_object('status', 'custody_undecided');
    end if;
  elsif p_kind = 'custody_structure' then
    if p_target <> 'custody_structure' or p_value not in ('undecided', 'trustee', 'licensed_partner') then
      return jsonb_build_object('status', 'bad_request');
    end if;
  elsif p_kind = 'staff_role_grant' then
    if p_value not in ('admin', 'super_admin')
       or p_target !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return jsonb_build_object('status', 'bad_request');
    end if;
    target_user := p_target::uuid;
    if not exists (select 1 from auth.users u where u.id = target_user) then
      return jsonb_build_object('status', 'no_account');
    end if;
    -- Nobody proposes or approves their own promotion.
    if target_user = p_actor then
      return jsonb_build_object('status', 'not_for_yourself');
    end if;
    if exists (select 1 from public.user_roles r where r.user_id = target_user and r.role = p_value::public.app_role) then
      return jsonb_build_object('status', 'already_held');
    end if;
  else
    return jsonb_build_object('status', 'bad_request');
  end if;

  update private.control_requests
     set state = 'lapsed'
   where kind = p_kind and target = p_target and state = 'proposed'
     and proposed_at < now() - interval '72 hours';

  select * into req from private.control_requests
   where kind = p_kind and target = p_target and state = 'proposed'
   for update;

  if req.id is null then
    insert into private.control_requests (kind, target, value, note, proposed_by)
    values (p_kind, p_target, p_value, nullif(btrim(coalesce(p_note, '')), ''), p_actor)
    returning * into req;
    return jsonb_build_object('status', 'awaiting_second_approval', 'request_id', req.id);
  end if;
  if req.proposed_by = p_actor then
    return jsonb_build_object('status', 'awaiting_second_approval', 'request_id', req.id);
  end if;
  if req.value <> p_value then
    return jsonb_build_object('status', 'conflicting_proposal', 'request_id', req.id, 'proposed_value', req.value);
  end if;

  update private.control_requests
     set state = 'applied', approved_by = p_actor, applied_at = now()
   where id = req.id;

  perform set_config('vallo.control_request', req.id::text, true);
  if p_kind = 'held_payments_open' then
    insert into public.feature_flags (key, enabled, note)
    values ('held_payments', true, 'Opened by two super admins (control request ' || req.id::text || ')')
    on conflict (key) do update set enabled = true;
  elsif p_kind = 'custody_structure' then
    insert into private.platform_settings (key, value, note, updated_at)
    values ('custody_structure', p_value, 'Set by two super admins (control request ' || req.id::text || ')', now())
    on conflict (key) do update set value = excluded.value, note = excluded.note, updated_at = now();
  else
    insert into public.user_roles (user_id, role) values (target_user, p_value::public.app_role)
    on conflict do nothing;
    perform private.notify(
      target_user,
      'system'::public.notification_kind,
      case when p_value = 'super_admin' then 'You are now a Vallo super administrator'
           else 'You are now a Vallo administrator' end,
      'Two super administrators approved this. If you were not expecting it, write to support straight away.',
      '/admin');
  end if;
  perform set_config('vallo.control_request', '', true);

  return jsonb_build_object('status', 'ok', 'request_id', req.id);
end;
$$;
revoke all on function private.control_request_apply(uuid, text, text, text, text) from public, anon, authenticated, service_role;

-- The API door: the signed-in super admin, never a parameter.
create or replace function public.control_request(p_kind text, p_target text, p_value text, p_note text default null)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.control_request_apply((select auth.uid()), p_kind, p_target, p_value, p_note);
$$;
revoke all on function public.control_request(text, text, text, text) from public, anon, service_role;
grant execute on function public.control_request(text, text, text, text) to authenticated;

-- 2. held_payments opens only through a two-person request.
create or replace function private.guard_feature_flag_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_caller boolean := coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon');
  uid uuid := auth.uid();
  is_super boolean := uid is not null and private.has_role(uid, 'super_admin'::public.app_role);
  touched_key text := coalesce(new.key, old.key);
begin
  if touched_key = 'held_payments' or old.key = 'held_payments' then
    if api_caller and not is_super then
      raise exception 'held_payments_is_super_admin_only: only a super admin may change the held payments switch'
        using errcode = '42501', hint = 'ESC-08.';
    end if;
    if tg_op <> 'DELETE' and new.enabled
       and private.custody_structure() not in ('trustee', 'licensed_partner') then
      raise exception 'held_payments_custody_undecided: held payments stay closed until custody is decided'
        using errcode = '42501', hint = 'ESC-08: private.platform_settings custody_structure is undecided.';
    end if;
    -- AML-19. Opening takes two super admins (public.control_request).
    if tg_op <> 'DELETE' and new.enabled and (tg_op = 'INSERT' or not old.enabled)
       and not private.is_owner_session()
       and not private.control_approved('held_payments_open', 'held_payments', 'on') then
      raise exception 'held_payments_opens_with_two_super_admins: opening held payments needs a second super admin'
        using errcode = '42501', hint = 'AML-19: public.control_request(''held_payments_open'', ''held_payments'', ''on'').';
    end if;
  end if;
  -- ESC-05. Anybody on staff may pause payouts; only a super admin resumes
  -- them, creates the switch or removes it.
  if touched_key = 'held_payments_payouts' or old.key = 'held_payments_payouts' then
    if api_caller and not is_super
       and not (tg_op = 'UPDATE' and new.key = old.key and new.enabled = false) then
      raise exception 'held_payments_payouts_resume_is_super_admin_only: only a super admin may resume escrow payouts'
        using errcode = '42501', hint = 'ESC-05.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

-- 3. custody_structure changes through a two-person request, and every
--    settings write is audited.
create or replace function private.guard_platform_setting_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.key, old.key) = 'custody_structure'
     and not private.is_owner_session()
     and (tg_op = 'DELETE'
          or not private.control_approved('custody_structure', 'custody_structure', new.value)) then
    raise exception 'custody_structure_needs_two_super_admins: custody changes only through a two-person request'
      using errcode = '42501', hint = 'AML-19.';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_platform_setting_write() from public, anon, authenticated, service_role;

create or replace function private.audit_platform_setting_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'platform_setting.' || lower(tg_op),
    'platform_setting',
    coalesce(new.key, old.key),
    jsonb_build_object(
      'before', case when tg_op = 'INSERT' then null else old.value end,
      'after', case when tg_op = 'DELETE' then null else new.value end,
      'control_request', nullif(coalesce(current_setting('vallo.control_request', true), ''), ''),
      'db_role', coalesce(current_setting('role', true), 'none'),
      'owner_session', private.is_owner_session()));
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_platform_setting_write() from public, anon, authenticated, service_role;

drop trigger if exists platform_settings_guard on private.platform_settings;
create trigger platform_settings_guard
  before insert or update or delete on private.platform_settings
  for each row execute function private.guard_platform_setting_write();
drop trigger if exists platform_settings_audit on private.platform_settings;
create trigger platform_settings_audit
  after insert or update or delete on private.platform_settings
  for each row execute function private.audit_platform_setting_write();

-- 4. Staff roles are granted through a two-person request, and every role
--    change is audited.
create or replace function private.guard_staff_role_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
     and (tg_op = 'INSERT' or (new.user_id, new.role) is distinct from (old.user_id, old.role))
     and not private.is_owner_session()
     and not private.control_approved('staff_role_grant', new.user_id::text, new.role::text) then
    raise exception 'staff_role_needs_two_super_admins: % is granted only through a two-person request', new.role
      using errcode = '42501', hint = 'AML-19: public.control_request(''staff_role_grant'', <user id>, <role>).';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_staff_role_grant() from public, anon, authenticated, service_role;

create or replace function private.audit_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'user_role.' || lower(tg_op),
    'user',
    coalesce(new.user_id, old.user_id)::text,
    jsonb_build_object(
      'before_role', case when tg_op = 'INSERT' then null else old.role end,
      'after_role', case when tg_op = 'DELETE' then null else new.role end,
      'control_request', nullif(coalesce(current_setting('vallo.control_request', true), ''), ''),
      'db_role', coalesce(current_setting('role', true), 'none')));
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_user_role_change() from public, anon, authenticated, service_role;

drop trigger if exists user_roles_00_staff_grant_guard on public.user_roles;
create trigger user_roles_00_staff_grant_guard
  before insert or update on public.user_roles
  for each row execute function private.guard_staff_role_grant();
drop trigger if exists user_roles_audit on public.user_roles;
create trigger user_roles_audit
  after insert or update or delete on public.user_roles
  for each row execute function private.audit_user_role_change();

/* The service-role door took the acting admin as a parameter, so one key could
   play both super admins. It now answers only to a signed-in super admin and
   goes through the same two-person request. */
create or replace function private.grant_staff_role(acting_admin uuid, target_email text, new_role public.app_role)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  target_id   uuid;
  clean_email text := lower(btrim(coalesce(target_email, '')));
  caller      uuid := (select auth.uid());
begin
  if acting_admin is null or clean_email = '' then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if caller is null or caller <> acting_admin then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if new_role not in ('admin'::public.app_role, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'not_a_staff_role', 'role', new_role);
  end if;
  select u.id into target_id from auth.users u where lower(u.email) = clean_email limit 1;
  if target_id is null then
    return jsonb_build_object('status', 'no_account', 'email', clean_email);
  end if;
  return private.control_request_apply(caller, 'staff_role_grant', target_id::text, new_role::text, null)
         || jsonb_build_object('user_id', target_id, 'role', new_role);
end;
$function$;

-- 5. Every fee rate write is audited, whatever the path.
create or replace function private.audit_fee_rate_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    coalesce(auth.uid(), new.created_by, old.created_by),
    'fee_rate.row_' || lower(tg_op),
    'fee_rate',
    coalesce(new.id, old.id)::text,
    jsonb_build_object(
      'before', case when tg_op = 'INSERT' then null else to_jsonb(old) end,
      'after', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
      'db_role', coalesce(current_setting('role', true), 'none')));
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_fee_rate_write() from public, anon, authenticated, service_role;
drop trigger if exists fee_rates_audit on public.fee_rates;
create trigger fee_rates_audit
  after insert or update or delete on public.fee_rates
  for each row execute function private.audit_fee_rate_write();

-- 6. Rulings: never by the opener, and reversed only by two people.
alter table public.escrow_rulings
  add column if not exists reversal_proposed_by   uuid,
  add column if not exists reversal_proposed_at   timestamptz,
  add column if not exists reversal_proposed_note text;
alter table public.escrow_rulings
  add constraint escrow_rulings_reversal_is_two_people
  check (reversed_by is null or (reversal_proposed_by is not null and reversed_by <> reversal_proposed_by));

create or replace function private.escrow_ruling_refuses_the_parties()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.escrows;
begin
  select * into e from public.escrows where id = new.escrow_id;
  if exists (
    select 1 from unnest(array[new.proposed_by, new.approved_by, new.reversal_proposed_by, new.reversed_by]) p
     where p is not null and p in (e.payer_id, e.payee_id, e.opened_by)
  ) then
    raise exception 'escrow_ruling_conflicted: nobody rules on an escrow they are party to or opened'
      using errcode = '42501', hint = 'AML-19.';
  end if;
  return new;
end;
$$;
revoke all on function private.escrow_ruling_refuses_the_parties() from public, anon, authenticated, service_role;
drop trigger if exists escrow_rulings_conflict on public.escrow_rulings;
create trigger escrow_rulings_conflict
  before insert or update on public.escrow_rulings
  for each row execute function private.escrow_ruling_refuses_the_parties();

create or replace function private.guard_escrow_ruling_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'escrow_rulings_are_kept: a ruling is never deleted' using errcode = '42501', hint = 'ESC-07.';
  end if;
  if (new.id, new.escrow_id, new.direction, new.note, new.amount_minor, new.threshold_minor,
      new.proposed_by, new.proposed_at)
     is distinct from
     (old.id, old.escrow_id, old.direction, old.note, old.amount_minor, old.threshold_minor,
      old.proposed_by, old.proposed_at) then
    raise exception 'escrow_rulings_are_kept: who proposed what is fixed' using errcode = '42501', hint = 'ESC-07.';
  end if;
  if new.state is distinct from old.state
     and (old.state, new.state) not in (('proposed', 'applied'), ('proposed', 'lapsed'), ('applied', 'reversed')) then
    raise exception 'escrow_rulings_are_kept: a ruling cannot go from % to %', old.state, new.state
      using errcode = '42501', hint = 'ESC-07.';
  end if;
  if old.state <> 'proposed'
     and (new.approved_by, new.applied_at, new.settlement_reference)
         is distinct from (old.approved_by, old.applied_at, old.settlement_reference) then
    raise exception 'escrow_rulings_are_kept: an applied ruling''s approval is fixed' using errcode = '42501', hint = 'ESC-07.';
  end if;
  if old.state = 'reversed' and new is distinct from old then
    raise exception 'escrow_rulings_are_kept: a reversed ruling is final' using errcode = '42501', hint = 'ESC-07.';
  end if;
  -- AML-19. A reversal proposal is made on an applied ruling, and replaced
  -- only once it has lapsed (72 hours).
  if (new.reversal_proposed_by, new.reversal_proposed_at, new.reversal_proposed_note)
     is distinct from (old.reversal_proposed_by, old.reversal_proposed_at, old.reversal_proposed_note) then
    if not (old.state = 'applied' and new.state = 'applied'
            and (old.reversal_proposed_by is null or old.reversal_proposed_at < now() - interval '72 hours')
            and new.reversal_proposed_by is not null and new.reversal_proposed_at = now()) then
      raise exception 'escrow_rulings_are_kept: a reversal proposal is made once, on an applied ruling'
        using errcode = '42501', hint = 'AML-19.';
    end if;
  end if;
  -- AML-19. Reversed only on a live proposal, by somebody else.
  if old.state = 'applied' and new.state = 'reversed'
     and (old.reversal_proposed_by is null
          or old.reversal_proposed_at < now() - interval '72 hours'
          or new.reversed_by is null
          or new.reversed_by = old.reversal_proposed_by) then
    raise exception 'escrow_rulings_are_kept: a ruling is reversed by two super admins'
      using errcode = '42501', hint = 'AML-19.';
  end if;
  return new;
end;
$$;

create or replace function private.audit_escrow_ruling_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    coalesce(auth.uid(), new.reversed_by, new.reversal_proposed_by, new.approved_by, new.proposed_by),
    case when tg_op = 'UPDATE' and new.state = old.state
              and new.reversal_proposed_by is distinct from old.reversal_proposed_by
         then 'escrow_ruling.reversal_proposed'
         else 'escrow_ruling.' || new.state end,
    'escrow',
    new.escrow_id::text,
    jsonb_build_object(
      'ruling_id', new.id,
      'from_state', case when tg_op = 'INSERT' then null else old.state end,
      'to_state', new.state,
      'direction', new.direction,
      'amount_minor', new.amount_minor,
      'threshold_minor', new.threshold_minor,
      'proposed_by', new.proposed_by,
      'approved_by', new.approved_by,
      'reversal_proposed_by', new.reversal_proposed_by,
      'reversed_by', new.reversed_by,
      'note', new.note,
      'reversal_proposed_note', new.reversal_proposed_note,
      'reversal_note', new.reversal_note
    ));
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.escrow_reverse_ruling(p_ruling uuid, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := auth.uid();
  r public.escrow_rulings;
  e public.escrows;
  why text := btrim(coalesce(p_note, ''));
  credit public.wallet_entries;
  credited_user uuid;
  credited_wallet uuid;
  spendable bigint;
  removed_commission jsonb;
begin
  if actor is null or not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if char_length(why) < 20 then
    return jsonb_build_object('status', 'needs_a_reason', 'minimum', 20);
  end if;

  select * into r from public.escrow_rulings where id = p_ruling for update;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.state <> 'applied' then
    return jsonb_build_object('status', 'not_applied', 'state', r.state);
  end if;

  select * into e from public.escrows where id = r.escrow_id for update;
  if actor in (e.payer_id, e.payee_id, e.opened_by) then
    return jsonb_build_object('status', 'conflicted');
  end if;
  if e.state <> 'RESOLVED' then
    return jsonb_build_object('status', 'not_resolved', 'state', e.state);
  end if;

  /* AML-19. TWO PEOPLE REVERSE A RULING. The first super admin proposes the
     reversal and its reason; a second, who neither made nor approved the
     ruling, applies it word for word. A proposal lapses after 72 hours. */
  if r.reversal_proposed_by is null or r.reversal_proposed_at < now() - interval '72 hours' then
    update public.escrow_rulings
       set reversal_proposed_by = actor, reversal_proposed_at = now(), reversal_proposed_note = why
     where id = r.id;
    return jsonb_build_object('status', 'awaiting_second_approval', 'ruling_id', r.id);
  end if;
  if r.reversal_proposed_by = actor then
    return jsonb_build_object('status', 'awaiting_second_approval', 'ruling_id', r.id);
  end if;
  if actor = r.proposed_by or actor is not distinct from r.approved_by then
    return jsonb_build_object('status', 'needs_a_different_super_admin');
  end if;
  why := r.reversal_proposed_note;

  select * into credit from public.wallet_entries
   where reference = r.settlement_reference and status = 'COMPLETED'
   for update;
  if credit.id is null then
    return jsonb_build_object('status', 'settlement_missing');
  end if;

  select w.user_id into credited_user from public.wallets w where w.id = credit.wallet_id;
  credited_wallet := private.wallet_for_update(credited_user);
  spendable := private.wallet_spendable_locked(credited_wallet);
  if spendable < credit.amount_minor then
    -- No correction overdraws a wallet. The desk recovers the money first, and
    -- the refusal is on the desk so the waiting reversal is not forgotten.
    if not exists (select 1 from public.risk_alerts a
                    where a.entity_type = 'escrow' and a.entity_id = e.id::text and a.status = 'open'
                      and a.title = 'A ruling reversal is waiting for money to be recovered') then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'A ruling reversal is waiting for money to be recovered',
              format('Reversing ruling %s on escrow %s needs %s kobo back from the person it paid, who has %s spendable. '
                     || 'Recover it, then reverse again. Asked by %s: %s',
                     r.id, e.id, credit.amount_minor, spendable, actor, why),
              'escrow', e.id::text);
    end if;
    return jsonb_build_object('status', 'shortfall', 'spendable_minor', spendable,
                              'needed_minor', credit.amount_minor);
  end if;

  -- The settlement stops counting, and its reference is freed for the next
  -- ruling. The flag also tells the ledger guard (MON-10) this one correction
  -- of a COMPLETED entry is sanctioned.
  perform set_config('vallo.escrow_reversal', 'on', true);
  update public.wallet_entries
     set status = 'REVERSED',
         reference = credit.reference || ':reversed:' || r.id::text,
         metadata = credit.metadata || jsonb_build_object('reversed_by', actor, 'reversal_of_ruling', r.id,
                                                          'reversal_proposed_by', r.reversal_proposed_by,
                                                          'reversal_note', why)
   where id = credit.id;

  -- The commission leaves the revenue table so its reference is free for the
  -- next ruling, and its whole row is kept in the audit log.
  delete from public.platform_revenue pr
   where pr.escrow_id = e.id and pr.source = 'escrow_commission'
  returning to_jsonb(pr.*) into removed_commission;
  if removed_commission is not null then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'platform_revenue.reversed', 'escrow', e.id::text,
            jsonb_build_object('ruling_id', r.id, 'removed_row', removed_commission, 'reason', why));
  end if;

  update public.escrows
     set state = 'DISPUTED',
         resolved_at = null,
         resolved_by = null,
         resolution_note = null,
         released_at = null,
         refunded_at = null,
         commission_minor = null,
         commission_rate_id = null
   where id = e.id;
  perform set_config('vallo.escrow_reversal', '', true);

  update public.escrow_rulings
     set state = 'reversed', reversed_by = actor, reversed_at = now(), reversal_note = why
   where id = r.id;

  perform private.notify(e.payer_id, 'wallet', 'A decision on your held payment was reversed', why,
                         '/escrow/' || e.id::text);
  perform private.notify(e.payee_id, 'wallet', 'A decision on your held payment was reversed', why,
                         '/escrow/' || e.id::text);

  return jsonb_build_object('status', 'ok', 'escrow_id', e.id, 'state', 'DISPUTED',
                            'reversed_minor', credit.amount_minor,
                            'commission_removed_minor', coalesce((removed_commission ->> 'amount_minor')::bigint, 0));
end;
$function$;

-- 7. The ruling door refuses the opener itself, before anything moves; the
--    escrow_rulings trigger stays as the backstop.
CREATE OR REPLACE FUNCTION public.escrow_admin_resolve(p_escrow uuid, p_direction text, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor uuid := auth.uid();
  e public.escrows;
  outcome jsonb;
  ruling text;
  float_now jsonb;
  threshold bigint := private.escrow_two_person_threshold_minor();
  open_proposal public.escrow_rulings;
  ruling_id uuid;
begin
  -- ESC-07. Rulings are a super admin's, and never on their own escrow.
  if actor is null or not private.has_role(actor, 'super_admin') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_direction not in ('release', 'refund') then
    return jsonb_build_object('status', 'bad_direction');
  end if;

  ruling := btrim(coalesce(p_note, ''));
  if char_length(ruling) < 20 then
    return jsonb_build_object('status', 'needs_a_reason', 'minimum', 20);
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- AML-19. Nor on one they opened.
  if actor in (e.payer_id, e.payee_id, e.opened_by) then
    return jsonb_build_object('status', 'conflicted');
  end if;
  if e.state <> 'DISPUTED' then
    return jsonb_build_object('status', 'not_disputed', 'state', e.state);
  end if;

  /*
   * ESC-01. THE FLOAT IS CHECKED BEFORE ANY RULING. When the ledger already
   * holds less than the live agreements promise, something has paid out
   * money it never took: the desk is alerted, and no release moves more until
   * the reconciliation has been read.
   */
  float_now := private.escrow_float_components();
  if coalesce((float_now ->> 'difference_minor')::bigint, 0) < 0 then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'Held money does not reconcile at a ruling',
            format('The ledger holds %s kobo less than the live agreements promise. A %s ruling on escrow %s '
                   || 'was %s. Read the float before any further release.',
                   -((float_now ->> 'difference_minor')::bigint), p_direction, e.id,
                   case when p_direction = 'refund' then 'allowed, because it returns this agreement''s own posted hold to its payer'
                        else 'refused' end),
            'escrow', e.id::text);
    if p_direction <> 'refund' then
      return jsonb_build_object('status', 'float_out_of_balance',
                                'difference_minor', (float_now ->> 'difference_minor')::bigint);
    end if;
  end if;

  -- Two people at the threshold, and for any ruling that follows a reversal,
  -- so the person who reversed a decision cannot also make the next one alone.
  if e.amount_minor >= threshold
     or exists (select 1 from public.escrow_rulings x where x.escrow_id = e.id and x.state = 'reversed') then
    -- ESC-07. TWO PEOPLE AT THIS SIZE. A proposal lapses after 72 hours.
    update public.escrow_rulings
       set state = 'lapsed'
     where escrow_id = e.id and state = 'proposed' and proposed_at < now() - interval '72 hours';
    select * into open_proposal from public.escrow_rulings
     where escrow_id = e.id and state = 'proposed';
    if open_proposal.id is null then
      insert into public.escrow_rulings
        (escrow_id, direction, note, amount_minor, threshold_minor, proposed_by)
      values (e.id, p_direction, ruling, e.amount_minor, threshold, actor)
      returning id into ruling_id;
      return jsonb_build_object('status', 'awaiting_second_approval', 'ruling_id', ruling_id,
                                'threshold_minor', threshold, 'amount_minor', e.amount_minor);
    end if;
    if open_proposal.proposed_by = actor then
      return jsonb_build_object('status', 'awaiting_second_approval', 'ruling_id', open_proposal.id,
                                'threshold_minor', threshold, 'amount_minor', e.amount_minor);
    end if;
    if open_proposal.direction <> p_direction then
      return jsonb_build_object('status', 'conflicting_proposal', 'ruling_id', open_proposal.id,
                                'proposed_direction', open_proposal.direction);
    end if;
    -- The second super admin applies the first one's ruling, word for word.
    ruling_id := open_proposal.id;
    ruling := open_proposal.note;
  end if;

  outcome := private.escrow_settle(e.id, p_direction, 'RESOLVED', actor, ruling);
  if outcome ->> 'status' <> 'ok' then
    -- Nothing was settled. An open proposal stays open; no applied row is written.
    return outcome;
  end if;

  if ruling_id is null then
    -- Below the threshold: one super admin's ruling, recorded as applied.
    insert into public.escrow_rulings
      (escrow_id, direction, note, amount_minor, threshold_minor, proposed_by,
       state, applied_at, settlement_reference)
    values (e.id, p_direction, ruling, e.amount_minor, threshold, actor,
            'applied', now(), 'escrow:' || p_direction || ':' || e.id::text)
    returning id into ruling_id;
  else
    update public.escrow_rulings
       set state = 'applied',
           approved_by = actor,
           applied_at = now(),
           settlement_reference = 'escrow:' || p_direction || ':' || e.id::text
     where id = ruling_id;
  end if;

  /*
   * WORD FOR WORD, TO BOTH. An operator's reasons summarised for one party
   * and quoted to the other is how a decision becomes an argument, and the
   * party who got the summary is always the one who lost.
   */
  perform private.notify(
    e.payer_id, 'wallet', 'A decision on your held payment', ruling,
    '/escrow/' || e.id::text);
  perform private.notify(
    e.payee_id, 'wallet', 'A decision on your held payment', ruling,
    '/escrow/' || e.id::text);

  return outcome || jsonb_build_object('ruling_id', ruling_id);
end;
$function$;
