/*
 * PERF-DB 4. THE APP SHELL ASKS THE DATABASE ONE QUESTION, NOT NINE.
 *
 * WHY. Every in-app navigation (and every RSC prefetch) renders
 * `app/(app)/layout.tsx`, which issued nine PostgREST requests in parallel:
 * profiles, social_profiles, a notifications count, agents, user_roles and
 * `my_staff_access` for the identity, then agents, businesses and user_roles
 * AGAIN for the workspace switch. Each is a separate HTTPS round trip from
 * Vercel dub1 to eu-west-1 plus PostgREST's per-request role/claims set-up,
 * and the shell waits for the slowest of the nine (edge p95 for those paths
 * was 175-250 ms).
 *
 * WHAT. `public.shell_context()` returns, in one jsonb, exactly what those
 * nine reads returned, with the same predicates:
 *   profile     profiles where id = me                     (first_name, nickname, display_name, avatar_url)
 *   handle      social_profiles where user_id = me
 *   unread      count(notifications where read_at is null) (RLS decides whose, as the app's count did)
 *   agent       agents where user_id = me, any status      (id, display_name, type, status)
 *   businesses  businesses where owner_id = me or agent_id = me (id, name, kind, status, is_demo)
 *   roles       user_roles where user_id = me and role in (admin, super_admin)
 *   staff       public.my_staff_access()
 *   is_host     a non-example, non-agency business whose owner_id = me
 *               (the host workspace is `kind <> 'agency'`, see lib/supply/workspaces-queries.ts)
 *
 * SECURITY. SECURITY INVOKER: every read runs under the caller's own RLS and
 * grants, exactly as the separate PostgREST reads did; nothing is readable
 * through it that was not readable before. `me` is `auth.uid()` from the same
 * JWT PostgREST verified. Executable by `authenticated` only (a signed-out
 * shell never calls it). No policy, grant or table is changed.
 *
 * READ-BACK. The DO block raises unless the function exists, is SECURITY
 * INVOKER and STABLE, anon cannot execute it, authenticated can, and a call
 * with no caller returns the empty shape.
 */
create or replace function public.shell_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (select (select auth.uid()) as uid)
  select jsonb_build_object(
    'profile', (select jsonb_build_object(
                         'first_name', p.first_name, 'nickname', p.nickname,
                         'display_name', p.display_name, 'avatar_url', p.avatar_url)
                  from public.profiles p, me where p.id = me.uid),
    'handle', (select s.handle from public.social_profiles s, me where s.user_id = me.uid),
    'unread', (select count(*) from public.notifications n where n.read_at is null),
    'agent', (select jsonb_build_object('id', a.id, 'display_name', a.display_name,
                                        'type', a.type, 'status', a.status)
                from public.agents a, me where a.user_id = me.uid),
    'businesses', coalesce((select jsonb_agg(jsonb_build_object(
                                     'id', b.id, 'name', b.name, 'kind', b.kind,
                                     'status', b.status, 'is_demo', b.is_demo)
                                   order by b.created_at, b.id)
                              from public.businesses b, me
                             where b.owner_id = me.uid or b.agent_id = me.uid), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(r.role order by r.role)
                         from public.user_roles r, me
                        where r.user_id = me.uid and r.role in ('admin', 'super_admin')), '[]'::jsonb),
    'staff', public.my_staff_access(),
    'is_host', exists (select 1 from public.businesses b, me
                        where b.owner_id = me.uid
                          and b.kind <> 'agency'
                          and b.is_demo is not true)
  )
$$;

comment on function public.shell_context() is
  'PERF-DB 4. The app shell''s identity, unread count, roles, staff scopes and workspaces in one SECURITY INVOKER read under the caller''s RLS. Replaces nine PostgREST calls per navigation.';

revoke all on function public.shell_context() from public, anon;
grant execute on function public.shell_context() to authenticated;

do $check$
declare
  f regprocedure := to_regprocedure('public.shell_context()');
  empty jsonb;
begin
  if f is null then raise exception 'PERF-DB 4: shell_context() is missing'; end if;
  if (select prosecdef from pg_proc where oid = f) then
    raise exception 'PERF-DB 4: shell_context() must be SECURITY INVOKER';
  end if;
  if (select provolatile from pg_proc where oid = f) <> 's' then
    raise exception 'PERF-DB 4: shell_context() must be STABLE';
  end if;
  if has_function_privilege('anon', f, 'execute') then
    raise exception 'PERF-DB 4: anon can execute shell_context()';
  end if;
  if not has_function_privilege('authenticated', f, 'execute') then
    raise exception 'PERF-DB 4: authenticated cannot execute shell_context()';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  empty := public.shell_context();
  if empty->'profile' <> 'null'::jsonb or empty->'agent' <> 'null'::jsonb
     or empty->'businesses' <> '[]'::jsonb or empty->'roles' <> '[]'::jsonb
     or (empty->>'is_host')::boolean then
    raise exception 'PERF-DB 4: a call with no caller returned someone: %', empty;
  end if;
end
$check$;
