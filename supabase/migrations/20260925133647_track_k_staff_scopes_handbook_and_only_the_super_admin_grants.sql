-- Track K, 25 September 2026: a tiered staff console.
--
-- THE RULES, ENFORCED HERE RATHER THAN IN THE APP:
--   * Only a super_admin can add, change or remove staff access
--     (`admin_grant_staff`, `admin_revoke_staff` check the caller's own
--     identity, auth.uid(), never an argument).
--   * Staff access is a set of named scopes, never an app_role. A staff
--     member holds no admin role, so every admin RLS policy still refuses
--     them; the console reaches a scoped desk only through the app's single
--     door, which asks `staff_can` first.
--   * Nothing unlocks until the member has acknowledged the CURRENT handbook.
--   * Nobody writes the grant or acknowledgement tables directly: no insert,
--     update or delete grant exists for any API role.
--   * Every grant, change, revocation and acknowledgement is written to the
--     append-only audit_log, and the member is told by email and in the app,
--     naming the exact access given.

do $$ begin
  create type public.staff_scope as enum (
    'listing_approval', 'kyc_review', 'moderation', 'support', 'agreements', 'guarantee'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.staff_grants (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  scopes      public.staff_scope[] not null check (cardinality(scopes) > 0),
  note        text check (note is null or char_length(note) <= 500),
  granted_by  uuid not null references auth.users(id),
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  revoked_by  uuid references auth.users(id),
  revoke_reason text check (revoke_reason is null or char_length(revoke_reason) <= 500)
);
create index if not exists staff_grants_granted_by_idx on public.staff_grants (granted_by);
create index if not exists staff_grants_revoked_by_idx on public.staff_grants (revoked_by);

create table if not exists public.staff_handbook_acks (
  user_id         uuid not null references auth.users(id) on delete cascade,
  version         text not null,
  acknowledged_at timestamptz not null default now(),
  primary key (user_id, version)
);

alter table public.staff_grants enable row level security;
alter table public.staff_handbook_acks enable row level security;
revoke all on public.staff_grants from anon, authenticated;
revoke all on public.staff_handbook_acks from anon, authenticated;
grant select on public.staff_grants to authenticated;
grant select on public.staff_handbook_acks to authenticated;

drop policy if exists staff_grants_read on public.staff_grants;
create policy staff_grants_read on public.staff_grants for select to authenticated
  using (user_id = (select auth.uid())
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
drop policy if exists staff_handbook_acks_read on public.staff_handbook_acks;
create policy staff_handbook_acks_read on public.staff_handbook_acks for select to authenticated
  using (user_id = (select auth.uid())
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

-- The handbook version that must be acknowledged. Bump it when the handbook
-- (apps/web/src/lib/admin/staff-handbook.ts) changes what staff agree to.
create or replace function private.staff_handbook_version()
returns text language sql immutable set search_path to '' as $f$ select '2026-09-25'::text $f$;

-- Who may work a scope. Admins and super admins may work every scope; a staff
-- member only the scopes granted, only while the grant stands, and only after
-- acknowledging the current handbook.
create or replace function private.staff_can(p_user uuid, p_scope text)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null
     and (private.has_role(p_user, 'super_admin'::public.app_role)
          or private.has_role(p_user, 'admin'::public.app_role)
          or exists (
            select 1 from public.staff_grants g
             where g.user_id = p_user
               and g.revoked_at is null
               and p_scope = any (g.scopes::text[])
               and exists (select 1 from public.staff_handbook_acks a
                            where a.user_id = p_user
                              and a.version = private.staff_handbook_version())));
$function$;

-- What the signed-in person may do, for the app's single door.
create or replace function public.my_staff_access()
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  select jsonb_build_object(
    'is_admin', private.has_role(auth.uid(), 'admin'::public.app_role),
    'is_super_admin', private.has_role(auth.uid(), 'super_admin'::public.app_role),
    'scopes', coalesce((select to_jsonb(g.scopes::text[]) from public.staff_grants g
                         where g.user_id = auth.uid() and g.revoked_at is null), '[]'::jsonb),
    'handbook_version', private.staff_handbook_version(),
    'handbook_acknowledged', exists (select 1 from public.staff_handbook_acks a
                                      where a.user_id = auth.uid()
                                        and a.version = private.staff_handbook_version()));
$function$;

create or replace function private.staff_scope_words(p_scopes public.staff_scope[])
returns text
language sql
immutable
set search_path to ''
as $function$
  select string_agg(case s
      when 'listing_approval' then 'Listing approval'
      when 'kyc_review' then 'KYC review'
      when 'moderation' then 'Reports and moderation'
      when 'support' then 'Support'
      when 'agreements' then 'Agreement approval'
      when 'guarantee' then 'Guarantee claims'
    end, ', ' order by s)
  from unnest(p_scopes) s;
$function$;

create or replace function public.admin_grant_staff(p_user uuid, p_scopes text[], p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor  uuid := auth.uid();
  scopes public.staff_scope[];
  prior  public.staff_grants;
  words  text;
begin
  if actor is null or not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_user is null or p_user = actor then
    return jsonb_build_object('status', 'invalid_target');
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    return jsonb_build_object('status', 'no_such_user');
  end if;
  if private.has_role(p_user, 'admin'::public.app_role) or private.has_role(p_user, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'already_admin');
  end if;
  begin
    select array_agg(distinct s::public.staff_scope order by s::public.staff_scope)
      into scopes from unnest(p_scopes) s;
  exception when invalid_text_representation then
    return jsonb_build_object('status', 'invalid_scope');
  end;
  if scopes is null or cardinality(scopes) = 0 then
    return jsonb_build_object('status', 'no_scopes');
  end if;

  select * into prior from public.staff_grants where user_id = p_user;
  insert into public.staff_grants (user_id, scopes, note, granted_by, granted_at, revoked_at, revoked_by, revoke_reason)
  values (p_user, scopes, nullif(btrim(p_note), ''), actor, now(), null, null, null)
  on conflict (user_id) do update
    set scopes = excluded.scopes, note = excluded.note, granted_by = excluded.granted_by,
        granted_at = excluded.granted_at, revoked_at = null, revoked_by = null, revoke_reason = null;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, case when prior.user_id is null or prior.revoked_at is not null then 'staff.grant' else 'staff.change' end,
          'staff_grant', p_user,
          jsonb_build_object('scopes', to_jsonb(scopes::text[]),
                             'previous_scopes', case when prior.user_id is null then null else to_jsonb(prior.scopes::text[]) end,
                             'note', nullif(btrim(p_note), '')));

  words := private.staff_scope_words(scopes);
  perform private.notify(p_user, 'system'::public.notification_kind,
    'You have Vallo staff access',
    'Access given: ' || words || '. Read and acknowledge the staff handbook before anything unlocks.',
    '/admin/handbook');
  perform private.email_outbox_enqueue(p_user, 'staff.access_granted',
    'staff.access_granted:' || p_user::text || ':' || extract(epoch from now())::bigint::text,
    jsonb_build_object('scopes', to_jsonb(scopes::text[]), 'scope_words', words));

  return jsonb_build_object('status', 'ok', 'scopes', to_jsonb(scopes::text[]));
end;
$function$;

create or replace function public.admin_revoke_staff(p_user uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  g     public.staff_grants;
begin
  if actor is null or not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 then
    return jsonb_build_object('status', 'reason_needed');
  end if;
  select * into g from public.staff_grants where user_id = p_user for update;
  if g.user_id is null or g.revoked_at is not null then
    return jsonb_build_object('status', 'not_staff');
  end if;
  update public.staff_grants
     set revoked_at = now(), revoked_by = actor, revoke_reason = btrim(p_reason)
   where user_id = p_user;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'staff.revoke', 'staff_grant', p_user,
          jsonb_build_object('scopes', to_jsonb(g.scopes::text[]), 'reason', btrim(p_reason)));
  perform private.notify(p_user, 'system'::public.notification_kind,
    'Your Vallo staff access has ended', btrim(p_reason), '/home');
  return jsonb_build_object('status', 'ok');
end;
$function$;

create or replace function public.staff_acknowledge_handbook(p_version text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if not exists (select 1 from public.staff_grants g where g.user_id = actor and g.revoked_at is null)
     and not private.has_role(actor, 'admin'::public.app_role)
     and not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'not_staff');
  end if;
  if p_version is distinct from private.staff_handbook_version() then
    return jsonb_build_object('status', 'stale_version');
  end if;
  insert into public.staff_handbook_acks (user_id, version) values (actor, p_version)
  on conflict do nothing;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'staff.handbook_acknowledged', 'staff_grant', actor, jsonb_build_object('version', p_version));
  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function private.staff_handbook_version() from public, anon, authenticated;
revoke all on function private.staff_scope_words(public.staff_scope[]) from public, anon, authenticated;
revoke all on function private.staff_can(uuid, text) from public, anon, authenticated;
revoke all on function public.my_staff_access() from public, anon;
revoke all on function public.admin_grant_staff(uuid, text[], text) from public, anon;
revoke all on function public.admin_revoke_staff(uuid, text) from public, anon;
revoke all on function public.staff_acknowledge_handbook(text) from public, anon;
grant execute on function public.my_staff_access() to authenticated;
grant execute on function public.admin_grant_staff(uuid, text[], text) to authenticated;
grant execute on function public.admin_revoke_staff(uuid, text) to authenticated;
grant execute on function public.staff_acknowledge_handbook(text) to authenticated;
