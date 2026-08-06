/*
 * Two functions that hand out the highest role on the platform were callable
 * by anybody with an account.
 *
 * `20260805170000_a_second_admin_and_a_way_to_remove_one.sql` granted execute
 * on `public.grant_staff_role` and `public.revoke_staff_role` to
 * `authenticated, service_role`. Its own comment says the wrappers have the
 * "same shape as public.suspend_agent", and that is exactly where the two
 * diverge: `suspend_agent`, `reinstate_agent` and `refund_and_cancel_booking`
 * all revoke from `authenticated` and grant to `service_role` alone. These two
 * did not.
 *
 * Both functions decide who is allowed by reading their own `acting_admin`
 * argument rather than the caller's identity, which is correct for a
 * service-role caller that has already proved the actor and wrong for anybody
 * else. With execute granted to `authenticated`, PostgREST exposes
 * `/rest/v1/rpc/grant_staff_role` to every signed-in account, and the argument
 * is simply whatever the request body says it is. A user who knows one super
 * administrator's uuid, which is on their public profile, posts their own
 * email address with `new_role: super_admin` and the function grants it. The
 * whole operations console follows.
 *
 * Probed through the real policy path, as `authenticated` after
 * `private.probe_as`, in a transaction that was rolled back:
 *
 *   before this migration, ordinary user calls the rpc   status ok, role granted
 *   after this migration, ordinary user calls the rpc    refused 42501
 *   after this migration, service role calls the rpc     status ok
 *   after this migration, acting_admin is not an admin   status forbidden
 *
 * Nothing in the application calls either function today; the console screen
 * these wrappers were written for reads `admin_bootstrap` and does not use
 * them. So the grant bought nothing and cost everything.
 */

revoke all on function public.grant_staff_role(uuid, text, public.app_role)
  from public, anon, authenticated;
revoke all on function public.revoke_staff_role(uuid, uuid, public.app_role)
  from public, anon, authenticated;

grant execute on function public.grant_staff_role(uuid, text, public.app_role) to service_role;
grant execute on function public.revoke_staff_role(uuid, uuid, public.app_role) to service_role;

/*
 * The grant is the hole, and the reason the hole was worth this much is that
 * the functions trust an argument for the one fact they must not take on
 * trust. So the argument is now checked against the caller as well.
 *
 * `auth.uid()` is null for a service-role call, which is the path the console
 * uses: it has already run `requireAdmin()` and is passing the actor it
 * proved. It is non-null only when a real end user's token reached the
 * function, and in that case the actor they claim has to be themselves. That
 * way a future re-grant, or a wrapper added somewhere else, cannot resurrect
 * the same escalation.
 */

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

/*
 * The two append-only guards run with a search path the caller chooses.
 *
 * Both are SECURITY INVOKER, so this is not the classic privilege escalation,
 * but what they are is the thing standing between an administrator and a
 * rewritten audit log. Their whole decision rests on `to_jsonb(new)` matching
 * `to_jsonb(old)`, and an unqualified name is resolved against whatever
 * search_path is in force when the trigger fires. A caller who can put a
 * schema of their own in front of `pg_catalog` decides what that comparison
 * returns, and therefore decides whether the append-only rule holds.
 *
 * Pinning the path costs nothing and removes the question.
 */

create or replace function private.audit_log_is_append_only()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $fn$
begin
  if tg_op = 'UPDATE'
     and old.actor_id is not null
     and new.actor_id is null
     and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;

  raise exception 'public.audit_log is append-only' using errcode = '42501';
end;
$fn$;

create or replace function private.booking_refunds_is_append_only()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $fn$
begin
  if tg_op = 'UPDATE'
     and old.decided_by is not null
     and new.decided_by is null
     and (to_jsonb(new) - 'decided_by') = (to_jsonb(old) - 'decided_by') then
    return new;
  end if;

  raise exception 'public.booking_refunds is append-only' using errcode = '42501';
end;
$fn$;

/*
 * The last eight policies on the platform that call `auth.uid()` bare.
 *
 * Every policy in `public` already wraps it as `(select auth.uid())`, which is
 * what lets the planner hoist the call into an InitPlan and evaluate it once
 * for the statement instead of once per row. These eight, all written against
 * `storage.objects` before that rule was settled, were missed. `storage.objects`
 * is the one table on the platform that grows without a ceiling, so a per-row
 * call here is the worst place to leave one.
 *
 * The expressions are otherwise unchanged: same bucket, same owning folder.
 */

drop policy if exists "avatars owner read" on storage.objects;
create policy "avatars owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

drop policy if exists "listing photos owner read" on storage.objects;
create policy "listing photos owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

drop policy if exists "listing photos owner insert" on storage.objects;
create policy "listing photos owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

drop policy if exists "listing photos owner update" on storage.objects;
create policy "listing photos owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  )
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

drop policy if exists "listing photos owner delete" on storage.objects;
create policy "listing photos owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = ((select auth.uid()))::text
  );
