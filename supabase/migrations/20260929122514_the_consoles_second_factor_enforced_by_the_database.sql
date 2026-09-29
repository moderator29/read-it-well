-- THE CONSOLE'S SECOND FACTOR, ENFORCED BY THE DATABASE (29 September 2026).
--
-- APPLY ONLY AFTER the release carrying the console's security-key screen
-- (app/admin/_components/ConsoleStepUp.tsx, lib/security/console-step-up.ts)
-- AND the staff key rules (a staff account's first key takes the password and
-- an emailed code; any later key, or removing one, takes an existing key) is
-- live: from this moment an admin role or a staff scope is held by the
-- caller only while their session has proved a security key.
--
-- The repository is public and the publishable key is in every browser, so a
-- stolen staff password was enough to call every admin function and read
-- every admin-visible row straight through PostgREST. Now:
--
--  * public.console_step_ups records a proof: this user, this session (the
--    `session_id` claim of the JWT PostgREST verified), until when. Written
--    only by the service role after the WebAuthn assertion checks out.
--  * private.has_role(user, 'admin' | 'super_admin') answers true for the
--    CALLER'S OWN id only while their session holds a live proof. Asked about
--    somebody else, or by the service role (no auth.uid()), it answers exactly
--    as before, so jobs, triggers and "is this person an admin" checks about
--    other people are unchanged. Every other role is unchanged.
--  * private.staff_can applies the same rule to a staff member's own scopes.
--  * public.my_staff_access reports the raw roles (so the app knows to show
--    the key screen rather than a refusal) and `console_verified`.
--
-- An admin who has not proved a key is, to the database, an ordinary member
-- until they do. There is no password-only way back in; a lost key is reset
-- by the founder from the database (delete the person's money_credentials).

create table if not exists public.console_step_ups (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  credential_id text,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, session_id)
);
alter table public.console_step_ups enable row level security;
revoke all on public.console_step_ups from anon, authenticated;
create index if not exists console_step_ups_expiry_idx on public.console_step_ups (expires_at);

create or replace function private.console_step_up_ok()
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.console_step_ups s
     where s.user_id = (select auth.uid())
       and s.session_id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
       and s.expires_at > now());
$function$;

create or replace function private.has_role(check_user_id uuid, check_role public.app_role)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role = check_role
  )
  and (check_role not in ('admin'::public.app_role, 'super_admin'::public.app_role)
       or check_user_id is distinct from (select auth.uid())
       or private.console_step_up_ok());
$function$;

create or replace function private.staff_can(p_user uuid, p_scope text)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null
     and (p_user is distinct from (select auth.uid()) or private.console_step_up_ok())
     and (exists (select 1 from public.user_roles r
                   where r.user_id = p_user and r.role in ('admin'::public.app_role, 'super_admin'::public.app_role))
          or exists (
            select 1 from public.staff_grants g
             where g.user_id = p_user
               and g.revoked_at is null
               and p_scope = any (g.scopes::text[])
               and exists (select 1 from public.staff_handbook_acks a
                            where a.user_id = p_user
                              and a.version = private.staff_handbook_version())));
$function$;

create or replace function public.my_staff_access()
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  select jsonb_build_object(
    'is_admin', exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'::public.app_role),
    'is_super_admin', exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'super_admin'::public.app_role),
    'scopes', coalesce((select to_jsonb(g.scopes::text[]) from public.staff_grants g
                         where g.user_id = auth.uid() and g.revoked_at is null), '[]'::jsonb),
    'position', (select g.position from public.staff_grants g
                  where g.user_id = auth.uid() and g.revoked_at is null),
    'handbook_version', private.staff_handbook_version(),
    'handbook_acknowledged', exists (select 1 from public.staff_handbook_acks a
                                      where a.user_id = auth.uid()
                                        and a.version = private.staff_handbook_version()),
    'console_verified', private.console_step_up_ok());
$function$;

revoke all on function private.console_step_up_ok() from public, anon, authenticated;
revoke all on function public.my_staff_access() from public, anon;
grant execute on function public.my_staff_access() to authenticated;

-- A STAFF ACCOUNT'S KEYS OPEN THE CONSOLE, so every key added to or removed
-- from one is written to the audit log and told to the holder and every
-- super admin, whatever wrote it. The app refuses to add or remove one on a
-- password alone (money-step-up-actions.ts); this is the alarm if anything
-- ever does.
create or replace function private.announce_staff_key_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  holder uuid := coalesce(new.user_id, old.user_id);
  added boolean := tg_op = 'INSERT';
  who text;
  boss uuid;
begin
  if not (exists (select 1 from public.user_roles r where r.user_id = holder and r.role in ('admin', 'super_admin'))
          or exists (select 1 from public.staff_grants g where g.user_id = holder and g.revoked_at is null)) then
    return null;
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (holder, case when added then 'staff.key_added' else 'staff.key_removed' end, 'user', holder::text,
          jsonb_build_object('credential', coalesce(new.id, old.id)));
  select coalesce(nullif(btrim(p.display_name), ''), 'A staff member') into who
    from public.profiles p where p.id = holder;
  perform private.notify(holder, 'system'::public.notification_kind,
    case when added then 'A security key was added to your staff account' else 'A security key was removed from your staff account' end,
    'Your security key opens the Vallo console. If this was not you, tell the founder at once.',
    '/settings/privacy');
  for boss in
    select distinct r.user_id from public.user_roles r
     where r.role = 'super_admin'::public.app_role and r.user_id <> holder
  loop
    perform private.notify(boss, 'system'::public.notification_kind,
      case when added then 'Staff security key added' else 'Staff security key removed' end,
      coalesce(who, 'A staff member') || case when added then ' added a security key.' else ' removed a security key.' end,
      '/admin/audit?q=staff.key_');
  end loop;
  return null;
exception when others then
  raise warning '[staff key] announce failed: %', sqlstate;
  return null;
end;
$function$;

revoke all on function private.announce_staff_key_change() from public, anon, authenticated;

drop trigger if exists money_credentials_announce_staff_key on public.money_credentials;
create trigger money_credentials_announce_staff_key after insert or delete on public.money_credentials
  for each row execute function private.announce_staff_key_change();

-- Read back: with no caller, admin checks about a real admin still answer
-- true (jobs and triggers are unchanged), and the proof check is false.
do $$
declare
  sa uuid;
begin
  select user_id into sa from public.user_roles where role = 'super_admin' limit 1;
  if sa is not null and not private.has_role(sa, 'super_admin'::public.app_role) then
    raise exception 'has_role must be unchanged for the service role';
  end if;
  if private.console_step_up_ok() then
    raise exception 'no caller has a console proof';
  end if;
end $$;

notify pgrst, 'reload schema';
