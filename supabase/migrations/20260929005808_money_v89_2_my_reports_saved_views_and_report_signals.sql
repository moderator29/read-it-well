-- MONEY 11b / V-89 (part 2 of 2): MY REPORTS, WITHDRAW MY REPORT, SAVED
-- VIEWS AND REPORT SIGNALS, WITHOUT TOUCHING TRACK K'S QUEUE.
--
-- From the unapplied 20260924160400_v89 (moved to superseded/). The claim
-- machinery that file also carried is LIVE from Track K
-- (`20260925163931_track_k2_...`, `20260925164219_track_k2_...`), scoped by
-- `private.staff_can`, and nothing here creates, replaces or drops
-- queue_claims, queue_take, queue_release, queue_assign, queue_operators or
-- private.is_operator (the read-back below proves they are unchanged). Built
-- here, fitted to the Track K staff model:
--
--   withdraw_my_report(uuid)  the reporter takes back their own report while
--                             it is open or being reviewed; nothing else.
--   my_reports()              the reporter's own reports with the one line a
--                             moderator chose to send them (`reporter_note`
--                             on the review's audit row), never staff notes.
--   admin_saved_views         a named queue filter set, private or shared.
--                             Admins read and write it on their own session
--                             (policies on has_role, like every admin policy:
--                             `private.is_operator` is not executable by
--                             authenticated, which is why Track K's own read
--                             policy uses has_role). A scoped staff member
--                             reaches it through the service client after
--                             requireAdmin('moderation'), and the app filters
--                             to their own and the shared views.
--   admin_report_signals()    the facts the queue weights a report by, read
--                             at request time: a confirmed phone, an
--                             inspection of that listing the reporter
--                             completed, and how many of their past reports
--                             were upheld. Answers only to someone who may
--                             work reports (`staff_can(uid, 'moderation')`).

/* ------------------------------------------------------------ the reporter's side */
create or replace function public.withdraw_my_report(p_report uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  v_status text;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select r.status::text into v_status from public.reports r where r.id = p_report and r.reporter_id = actor for update;
  if v_status is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_status not in ('open', 'reviewing') then
    return jsonb_build_object('status', 'closed');
  end if;
  update public.reports set status = 'withdrawn'::public.report_status, resolved_at = now() where id = p_report;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'report.withdrawn', 'report', p_report::text, jsonb_build_object('before_status', v_status));
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.withdraw_my_report(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_my_report(uuid) to authenticated;

create or replace function public.my_reports()
returns table (id uuid, target_type text, category text, status text, created_at timestamptz,
               resolved_at timestamptz, reporter_note text)
language sql
stable
security definer
set search_path to ''
as $function$
  select r.id, r.target_type, r.category, r.status::text, r.created_at, r.resolved_at,
         (select a.metadata ->> 'reporter_note'
            from public.audit_log a
           where a.entity_type = 'report' and a.entity_id = r.id::text
             and a.action = 'report.review'
             and nullif(btrim(a.metadata ->> 'reporter_note'), '') is not null
           order by a.created_at desc
           limit 1)
    from public.reports r
   where r.reporter_id = (select auth.uid())
   order by r.created_at desc
   limit 50;
$function$;
revoke all on function public.my_reports() from public, anon, authenticated;
grant execute on function public.my_reports() to authenticated;

/* ------------------------------------------------------------ saved views */
create table if not exists public.admin_saved_views (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  filters    jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object' and pg_column_size(filters) < 2048),
  shared     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists admin_saved_views_owner_idx on public.admin_saved_views (owner, created_at desc);
alter table public.admin_saved_views enable row level security;
revoke all on table public.admin_saved_views from public, anon, authenticated;
grant select, insert, delete on table public.admin_saved_views to authenticated;
grant select, insert, delete on table public.admin_saved_views to service_role;

drop policy if exists admin_saved_views_read on public.admin_saved_views;
create policy admin_saved_views_read on public.admin_saved_views for select to authenticated
  using ((private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role))
         and (owner = (select auth.uid()) or shared));
drop policy if exists admin_saved_views_insert on public.admin_saved_views;
create policy admin_saved_views_insert on public.admin_saved_views for insert to authenticated
  with check ((private.has_role((select auth.uid()), 'admin'::public.app_role)
               or private.has_role((select auth.uid()), 'super_admin'::public.app_role))
              and owner = (select auth.uid()));
drop policy if exists admin_saved_views_delete on public.admin_saved_views;
create policy admin_saved_views_delete on public.admin_saved_views for delete to authenticated
  using (owner = (select auth.uid()));
comment on table public.admin_saved_views is
  'V-89. A named queue filter set. Admins read their own and the shared ones; only the owner deletes. Scoped staff reach it through the service client, filtered to their own and shared.';

/* ------------------------------------------------------------ weight, read at request time */
create or replace function public.admin_report_signals(p_reports uuid[])
returns table (report_id uuid, phone_confirmed boolean, attended_at timestamptz, past_closed integer, past_upheld integer)
language sql
stable
security definer
set search_path to ''
as $function$
  select r.id,
         (u.phone_confirmed_at is not null),
         (select max(coalesce(i.slot_at, i.updated_at))
            from public.inspection_requests i
           where i.requester_id = r.reporter_id
             and r.target_type = 'listing'
             and i.listing_id::text = r.target_id
             and i.state = 'COMPLETED'::public.inspection_state),
         (select count(*)::int from public.reports p
           where p.reporter_id = r.reporter_id and p.id <> r.id and p.status::text in ('resolved', 'dismissed')),
         (select count(*)::int from public.reports p
           where p.reporter_id = r.reporter_id and p.id <> r.id and p.status::text = 'resolved')
    from public.reports r
    left join auth.users u on u.id = r.reporter_id
   where r.id = any(p_reports)
     and private.staff_can((select auth.uid()), 'moderation');
$function$;
revoke all on function public.admin_report_signals(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_report_signals(uuid[]) to authenticated;

/* ------------------------------------------------------------------ read back */
do $$
begin
  if not exists (select 1 from pg_class where oid = 'public.admin_saved_views'::regclass and relrowsecurity) then
    raise exception 'admin_saved_views has no RLS';
  end if;
  if has_table_privilege('anon', 'public.admin_saved_views', 'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.admin_saved_views', 'UPDATE, TRUNCATE') then
    raise exception 'admin_saved_views is open to the wrong role';
  end if;
  if has_function_privilege('anon', 'public.withdraw_my_report(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.my_reports()', 'EXECUTE')
     or has_function_privilege('anon', 'public.admin_report_signals(uuid[])', 'EXECUTE') then
    raise exception 'a V-89 door is open to anon';
  end if;
  -- Track K's queue is untouched: still scoped by staff_can, still not
  -- executable by members, and its read policy still on has_role.
  if position('private.staff_can' in pg_get_functiondef('public.queue_take(text,uuid,uuid)'::regprocedure)) = 0
     or position('private.staff_can' in pg_get_functiondef('public.queue_assign(text,uuid,uuid,uuid)'::regprocedure)) = 0
     or position('private.staff_can' in pg_get_functiondef('private.is_operator(uuid)'::regprocedure)) = 0
     or has_function_privilege('authenticated', 'private.is_operator(uuid)', 'EXECUTE')
     or not exists (select 1 from pg_policy where polname = 'queue_claims_operator_read'
                     and pg_get_expr(polqual, polrelid) like '%has_role%') then
    raise exception 'Track K''s queue changed';
  end if;
end $$;
