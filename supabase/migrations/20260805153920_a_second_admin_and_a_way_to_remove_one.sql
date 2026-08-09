-- A second admin, and a way to remove one.
--
-- `public.user_roles` is written in exactly one place in the whole application:
-- `lib/admin/actions.ts` grants `agent` when an application is approved. There
-- is no path anywhere to grant or revoke a staff role.
--
-- The only way anybody becomes an admin today is `public.admin_bootstrap`,
-- which `public.handle_new_user` consults **at signup**. So the first admin
-- arrives with the platform, and after that:
--
--   * a staff member who already has an account can never be made an admin,
--     because the allow list only fires on the insert into auth.users that
--     already happened;
--   * a staff member who leaves can never have it taken away.
--
-- The second one is the serious half. An operations account with admin rights
-- can read every booking, every support ticket and every identity document on
-- the platform, and there was no way to end that.
--
-- Two functions, both SECURITY DEFINER because `user_roles_admin_manage`
-- restricts every write to a super_admin and the last-super-admin rule below
-- cannot be expressed as a policy at all: a policy sees one row and this rule
-- is about how many rows are left.
--
-- **Only `admin` and `super_admin` pass through here.** `agent` is refused on
-- purpose. Granting it is not one row: the applications queue also creates the
-- `agents` row the rest of the platform joins to, and a person holding the
-- agent role with no agent profile is a half nobody would find until a listing
-- failed to save. Taking it away is the stops desk, which also withdraws their
-- listings and tells them why. `user` is refused because it is granted at
-- signup and means nothing on its own.
--
-- The email is resolved inside the function rather than by the caller, so
-- `auth.users` is never read from an RLS-bound client and no screen has to
-- hold a service key to find somebody.

create or replace function private.grant_staff_role(
  acting_admin uuid,
  target_email text,
  new_role     public.app_role
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  target_id   uuid;
  clean_email text := lower(btrim(coalesce(target_email, '')));
  target_name text;
begin
  if acting_admin is null or clean_email = '' then
    return jsonb_build_object('status', 'bad_request');
  end if;

  if new_role not in ('admin'::public.app_role, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'not_a_staff_role', 'role', new_role);
  end if;

  -- SECURITY DEFINER means this function is the last gate, so it proves the
  -- role here rather than trusting a caller that says it already did. Admin is
  -- deliberately not enough: an admin who could make themselves a super_admin
  -- would make the distinction meaningless.
  if not private.has_role(acting_admin, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select u.id into target_id from auth.users u
   where lower(u.email) = clean_email
   limit 1;

  -- No account yet. The caller is told so rather than being refused, because
  -- the useful answer is the allow list, and the screen offers it.
  if target_id is null then
    return jsonb_build_object('status', 'no_account', 'email', clean_email);
  end if;

  select p.display_name into target_name from public.profiles p where p.id = target_id;

  if exists (
    select 1 from public.user_roles r where r.user_id = target_id and r.role = new_role
  ) then
    return jsonb_build_object(
      'status', 'already_held',
      'user_id', target_id,
      'display_name', target_name,
      'role', new_role
    );
  end if;

  insert into public.user_roles (user_id, role) values (target_id, new_role)
  on conflict do nothing;

  -- The person is told. A role that appears on somebody's account without
  -- their knowledge is how an account gets used without its owner noticing.
  perform private.notify(
    target_id,
    'system'::public.notification_kind,
    case when new_role = 'super_admin'::public.app_role
      then 'You are now a RentMe super administrator'
      else 'You are now a RentMe administrator'
    end,
    'The operations console is open to you. If you were not expecting this, write to support straight away.',
    '/admin'
  );

  return jsonb_build_object(
    'status', 'ok',
    'user_id', target_id,
    'display_name', target_name,
    'email', clean_email,
    'role', new_role
  );
end;
$fn$;

create or replace function private.revoke_staff_role(
  acting_admin uuid,
  target_user  uuid,
  old_role     public.app_role
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  remaining   integer;
  target_name text;
begin
  if acting_admin is null or target_user is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  if old_role not in ('admin'::public.app_role, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'not_a_staff_role', 'role', old_role);
  end if;

  if not private.has_role(acting_admin, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if not exists (
    select 1 from public.user_roles r where r.user_id = target_user and r.role = old_role
  ) then
    return jsonb_build_object('status', 'not_held', 'role', old_role);
  end if;

  /*
   * The rule a policy cannot hold.
   *
   * Nobody but a super_admin can grant a super_admin. So the moment the last
   * one is removed, the role can never be granted again by anybody, from any
   * screen, ever: `admin_bootstrap` only fires on the insert into auth.users,
   * which for every existing account already happened. The platform would be
   * permanently unadministrable and the only way back would be somebody with
   * the service key going into the database by hand.
   *
   * The rows are locked before they are counted, because two super_admins each
   * revoking the other in the same instant would otherwise each read two and
   * each leave zero. The lock and the count are two statements on purpose:
   * `select count(*) ... for update` is not valid SQL, and a plpgsql body is
   * only parsed when it runs, so that version would have applied green and
   * failed on the first revoke somebody ever tried.
   */
  if old_role = 'super_admin'::public.app_role then
    perform 1 from public.user_roles r
     where r.role = 'super_admin'::public.app_role
       for update;

    select count(*) into remaining
      from public.user_roles r
     where r.role = 'super_admin'::public.app_role;

    if remaining <= 1 then
      return jsonb_build_object('status', 'last_super_admin');
    end if;
  end if;

  select p.display_name into target_name from public.profiles p where p.id = target_user;

  delete from public.user_roles r where r.user_id = target_user and r.role = old_role;

  perform private.notify(
    target_user,
    'system'::public.notification_kind,
    'Your RentMe console access has ended',
    case when old_role = 'super_admin'::public.app_role
      then 'Your super administrator role has been removed. Everything else about your account is unchanged.'
      else 'Your administrator role has been removed. Everything else about your account is unchanged.'
    end,
    null
  );

  return jsonb_build_object(
    'status', 'ok',
    'user_id', target_user,
    'display_name', target_name,
    'role', old_role
  );
end;
$fn$;

-- PostgREST exposes `public` only, so a `private` function has no endpoint
-- without a thin wrapper. Same shape as public.suspend_agent.
create or replace function public.grant_staff_role(
  acting_admin uuid,
  target_email text,
  new_role     public.app_role
)
returns jsonb
language sql
security definer
set search_path to 'public'
as $fn$
  select private.grant_staff_role(acting_admin, target_email, new_role);
$fn$;

create or replace function public.revoke_staff_role(
  acting_admin uuid,
  target_user  uuid,
  old_role     public.app_role
)
returns jsonb
language sql
security definer
set search_path to 'public'
as $fn$
  select private.revoke_staff_role(acting_admin, target_user, old_role);
$fn$;

revoke all on function public.grant_staff_role(uuid, text, public.app_role) from public, anon;
revoke all on function public.revoke_staff_role(uuid, uuid, public.app_role) from public, anon;
grant execute on function public.grant_staff_role(uuid, text, public.app_role)
  to authenticated, service_role;
grant execute on function public.revoke_staff_role(uuid, uuid, public.app_role)
  to authenticated, service_role;

-- ------------------------------------------------------------- the allow list
--
-- `admin_bootstrap` had a select policy and no reader anywhere in the
-- application: the whole table existed only for `handle_new_user` to consult.
-- The screen this migration is for reads it, so the one thing it needs is a way
-- to name the person who added a row, which it did not record.
--
-- `claimed_at` is stamped by the signup trigger and, deliberately, is still not
-- consulted by it. Filtering the lookup on `claimed_at is null` would read
-- better, and it would mean that an admin who deleted their account and signed
-- up again with the same address arrived as an ordinary user with no way back,
-- which on a platform whose only other route to the role is a super_admin who
-- may no longer exist is a worse failure than a re-grant. The column stays
-- informational, the screen prints it, and this paragraph is why.
alter table public.admin_bootstrap
  add column if not exists added_by uuid references auth.users(id) on delete set null;

comment on column public.admin_bootstrap.added_by is
  'The super_admin who added this address. Null once their own account is closed, which the foreign key does on the way out; the row itself outlives them.';
