-- Two things, in one transaction.
--
-- 1. A staff ROLE change is written to the audit log. private.grant_staff_role
--    and private.revoke_staff_role add and remove admin / super_admin rows in
--    user_roles and notify the person, but wrote nothing to audit_log, while
--    the scoped-staff door (public.admin_grant_staff) always has. The most
--    powerful change on the platform was the one change with no record. Both
--    bodies are the live definitions (read with pg_get_functiondef on
--    28 September 2026) with one insert added after the change itself, so
--    grants (service_role only) are untouched by create or replace.
--
-- 2. babatolasam@gmail.com becomes a super administrator, on the founder's
--    written instruction of 28 September 2026. It goes through the audited
--    function above with the founder's account as the acting super admin, so
--    the grant, its notification and its audit row are the same as any other.
--    The verified mark follows by itself: public.person_badge gives the staff
--    tier to anybody holding admin or super_admin (public.is_platform_staff),
--    which is the mark the founder's own account carries.

create or replace function private.grant_staff_role(acting_admin uuid, target_email text, new_role app_role)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  target_id   uuid;
  clean_email text := lower(btrim(coalesce(target_email, '')));
  target_name text;
  caller      uuid := (select auth.uid());
begin
  if acting_admin is null or clean_email = '' then
    return jsonb_build_object('status', 'bad_request');
  end if;

  -- A caller carrying a real user token may only ever act as themselves.
  if caller is not null and caller <> acting_admin then
    return jsonb_build_object('status', 'forbidden');
  end if;

  if new_role not in ('admin'::public.app_role, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'not_a_staff_role', 'role', new_role);
  end if;

  if not private.has_role(acting_admin, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select u.id into target_id from auth.users u
   where lower(u.email) = clean_email
   limit 1;

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

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (acting_admin, 'staff.role_grant', 'user_role', target_id::text,
          jsonb_build_object('role', new_role::text));

  perform private.notify(
    target_id,
    'system'::public.notification_kind,
    case when new_role = 'super_admin'::public.app_role
      then 'You are now a Vallo super administrator'
      else 'You are now a Vallo administrator'
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
$function$;

create or replace function private.revoke_staff_role(acting_admin uuid, target_user uuid, old_role app_role)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  remaining   integer;
  target_name text;
  caller      uuid := (select auth.uid());
begin
  if acting_admin is null or target_user is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  if caller is not null and caller <> acting_admin then
    return jsonb_build_object('status', 'forbidden');
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

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (acting_admin, 'staff.role_revoke', 'user_role', target_user::text,
          jsonb_build_object('role', old_role::text));

  perform private.notify(
    target_user,
    'system'::public.notification_kind,
    'Your Vallo console access has ended',
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
$function$;

do $grant$
declare
  founder uuid;
  result  jsonb;
begin
  select id into founder from auth.users where lower(email) = 'phantomfcalls@gmail.com';
  if founder is null or not private.has_role(founder, 'super_admin'::public.app_role) then
    raise exception 'the acting super admin is not a super admin';
  end if;
  result := private.grant_staff_role(founder, 'babatolasam@gmail.com', 'super_admin'::public.app_role);
  if result ->> 'status' not in ('ok', 'already_held') then
    raise exception 'grant refused: %', result;
  end if;
end;
$grant$;

do $readback$
declare
  target uuid;
begin
  select id into target from auth.users where lower(email) = 'babatolasam@gmail.com';
  if not private.has_role(target, 'super_admin'::public.app_role) then
    raise exception 'READ-BACK FAILED: the role is not held';
  end if;
  if not exists (select 1 from public.audit_log
                  where action = 'staff.role_grant' and entity_id = target::text
                    and metadata ->> 'role' = 'super_admin') then
    raise exception 'READ-BACK FAILED: no audit row';
  end if;
  if not public.is_platform_staff(target) then
    raise exception 'READ-BACK FAILED: the badge would not follow';
  end if;
  if has_function_privilege('authenticated', 'private.grant_staff_role(uuid,text,public.app_role)', 'execute')
     or has_function_privilege('anon', 'private.grant_staff_role(uuid,text,public.app_role)', 'execute') then
    raise exception 'READ-BACK FAILED: the grant door is open to app roles';
  end if;
end;
$readback$;
