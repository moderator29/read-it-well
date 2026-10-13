set lock_timeout = '5s';

create or replace function public.shell_context()
 returns jsonb
 language sql
 stable
 set search_path to ''
as $fn$
  with me as (select (select auth.uid()) as uid)
  select jsonb_build_object(
    'profile', (select jsonb_build_object(
                         'first_name', p.first_name, 'nickname', p.nickname,
                         'display_name', p.display_name, 'avatar_url', p.avatar_url)
                  from public.profiles p, me where p.id = me.uid),
    'handle', (select s.handle from public.social_profiles s, me where s.user_id = me.uid),
    'unread', (select count(*) from public.notifications n where n.read_at is null),
    'agent', (select jsonb_build_object('id', a.id, 'display_name', a.display_name,
                                        'type', a.type, 'role', a.role, 'status', a.status)
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
$fn$;
