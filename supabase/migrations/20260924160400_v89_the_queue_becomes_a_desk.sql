/*
 * V-89. THE QUEUE BECOMES A DESK: CLAIM IT, CLOCK IT, WEIGHT IT, SAVE THE
 * VIEW, DECIDE IN BULK. AND THE REPORTER GETS THEIR SIDE.
 *
 * No source table gains a column. What is added:
 *
 *   queue_claims            who has taken a row, keyed by (kind, item_id), so
 *                           listings, applications, reports, tickets and flags
 *                           share one owner slot. A claim is LIVE for thirty
 *                           minutes after its last touch; after that it is
 *                           shown as free and anybody may take it. Nothing
 *                           deletes it on a timer: idleness is read, not swept.
 *   admin_saved_views       a filter set an operator named, private or shared
 *                           by link with the rest of the desk.
 *   report_status           gains `withdrawn`: the reporter may take back a
 *                           report that is still open or being reviewed,
 *                           through `withdraw_my_report`, and nothing else.
 *   my_reports()            the reporter's own reports with status and the
 *                           one line a moderator chose to send them
 *                           (`reporter_note` on the review's audit row), never
 *                           the staff notes.
 *   admin_report_signals()  the facts the queue weights a report by, read at
 *                           request time and never stored on the reporter: a
 *                           confirmed phone, an inspection of that listing the
 *                           reporter asked for, and how many of their past
 *                           reports were upheld.
 *
 * `private.person_name` comes from the V-35 migration (`20260924160100`),
 * which runs first.
 *
 * Every door authorises off auth.uid(); the admin doors check
 * `private.has_role` for admin or super_admin, the same test the reports
 * policy uses. Claims are written only through the doors, which write the
 * audit row themselves.
 */

-- ----------------------------------------------------------------------------
-- CLAIMS.

create table if not exists public.queue_claims (
  kind text not null check (kind in ('listing', 'application', 'report', 'ticket', 'flag')),
  item_id uuid not null,
  claimed_by uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  touched_at timestamptz not null default now(),
  primary key (kind, item_id)
);

create index if not exists queue_claims_by_idx on public.queue_claims (claimed_by);

alter table public.queue_claims enable row level security;
revoke all on table public.queue_claims from public, anon, authenticated;
grant select on table public.queue_claims to authenticated;

drop policy if exists queue_claims_admin_read on public.queue_claims;
create policy queue_claims_admin_read on public.queue_claims
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

comment on table public.queue_claims is
  'V-89. Who has taken a queue row. Live for 30 minutes after touched_at; written only by queue_take / queue_release / queue_assign.';

create or replace function private.is_operator(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_user is not null
     and (private.has_role(p_user, 'admin'::public.app_role)
       or private.has_role(p_user, 'super_admin'::public.app_role));
$$;
revoke all on function private.is_operator(uuid) from public, anon, authenticated;

/* Take a row, or keep it warm. Refused only while another operator's claim
   is live; an idle claim (thirty minutes untouched) is simply taken over. */
create or replace function public.queue_take(p_kind text, p_item uuid, p_batch uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
  c public.queue_claims%rowtype;
  v_had boolean;
begin
  if not private.is_operator(actor) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_kind not in ('listing', 'application', 'report', 'ticket', 'flag') or p_item is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into c from public.queue_claims where kind = p_kind and item_id = p_item for update;
  v_had := found;
  if v_had and c.claimed_by <> actor and c.touched_at > now() - interval '30 minutes' then
    return jsonb_build_object('status', 'taken', 'by', c.claimed_by);
  end if;
  insert into public.queue_claims (kind, item_id, claimed_by, claimed_at, touched_at)
  values (p_kind, p_item, actor, now(), now())
  on conflict (kind, item_id) do update
    set claimed_by = excluded.claimed_by,
        claimed_at = case when public.queue_claims.claimed_by = excluded.claimed_by
                          then public.queue_claims.claimed_at else now() end,
        touched_at = now();
  if not v_had or c.claimed_by <> actor then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'queue.take', p_kind, p_item::text,
            jsonb_build_object('from', c.claimed_by, 'batch_id', p_batch));
  end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.queue_release(p_kind text, p_item uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if not private.is_operator(actor) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  delete from public.queue_claims where kind = p_kind and item_id = p_item and claimed_by = actor;
  if not found then
    return jsonb_build_object('status', 'not_yours');
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'queue.release', p_kind, p_item::text, '{}'::jsonb);
  return jsonb_build_object('status', 'ok');
end;
$$;

/* Hand a row to another operator. The person handed it must be an operator. */
create or replace function public.queue_assign(p_kind text, p_item uuid, p_to uuid, p_batch uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
  c public.queue_claims%rowtype;
begin
  if not private.is_operator(actor) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_kind not in ('listing', 'application', 'report', 'ticket', 'flag') or p_item is null
     or not private.is_operator(p_to) then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into c from public.queue_claims where kind = p_kind and item_id = p_item for update;
  insert into public.queue_claims (kind, item_id, claimed_by, claimed_at, touched_at)
  values (p_kind, p_item, p_to, now(), now())
  on conflict (kind, item_id) do update
    set claimed_by = excluded.claimed_by, claimed_at = now(), touched_at = now();
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'queue.assign', p_kind, p_item::text,
          jsonb_build_object('from', c.claimed_by, 'to', p_to, 'batch_id', p_batch));
  return jsonb_build_object('status', 'ok');
end;
$$;

revoke all on function public.queue_take(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_release(text, uuid) from public, anon, authenticated;
revoke all on function public.queue_assign(text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.queue_take(text, uuid, uuid) to authenticated;
grant execute on function public.queue_release(text, uuid) to authenticated;
grant execute on function public.queue_assign(text, uuid, uuid, uuid) to authenticated;

/* The operators a row can be handed to, by name, for the assign menu. */
create or replace function public.queue_operators()
returns table (user_id uuid, name text)
language sql
stable
security definer
set search_path to ''
as $$
  select distinct r.user_id, private.person_name(r.user_id)
    from public.user_roles r
   where r.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
     and private.is_operator((select auth.uid()));
$$;
revoke all on function public.queue_operators() from public, anon, authenticated;
grant execute on function public.queue_operators() to authenticated;

-- ----------------------------------------------------------------------------
-- SAVED VIEWS.

create table if not exists public.admin_saved_views (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object' and pg_column_size(filters) < 2048),
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_saved_views_owner_idx on public.admin_saved_views (owner, created_at desc);

alter table public.admin_saved_views enable row level security;
revoke all on table public.admin_saved_views from public, anon, authenticated;
grant select, insert, delete on table public.admin_saved_views to authenticated;

drop policy if exists admin_saved_views_read on public.admin_saved_views;
create policy admin_saved_views_read on public.admin_saved_views
  for select to authenticated
  using ((private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role)) and (owner = (select auth.uid()) or shared));

drop policy if exists admin_saved_views_insert on public.admin_saved_views;
create policy admin_saved_views_insert on public.admin_saved_views
  for insert to authenticated
  with check ((private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role)) and owner = (select auth.uid()));

drop policy if exists admin_saved_views_delete on public.admin_saved_views;
create policy admin_saved_views_delete on public.admin_saved_views
  for delete to authenticated
  using (owner = (select auth.uid()));

comment on table public.admin_saved_views is
  'V-89. A named queue filter set. Operators read their own and the shared ones; only the owner deletes.';

-- ----------------------------------------------------------------------------
-- THE REPORTER'S SIDE.

alter type public.report_status add value if not exists 'withdrawn';

/* Take back one's own report while it is still open or being reviewed. */
create or replace function public.withdraw_my_report(p_report uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
  v_status text;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select r.status::text into v_status from public.reports r
   where r.id = p_report and r.reporter_id = actor
   for update;
  if v_status is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_status not in ('open', 'reviewing') then
    return jsonb_build_object('status', 'closed');
  end if;
  update public.reports
     set status = 'withdrawn'::public.report_status, resolved_at = now()
   where id = p_report;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'report.withdrawn', 'report', p_report::text, jsonb_build_object('before_status', v_status));
  return jsonb_build_object('status', 'ok');
end;
$$;
revoke all on function public.withdraw_my_report(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_my_report(uuid) to authenticated;

/* The reporter's own reports, and only the line a moderator wrote for them. */
create or replace function public.my_reports()
returns table (id uuid, target_type text, category text, status text, created_at timestamptz,
               resolved_at timestamptz, reporter_note text)
language sql
stable
security definer
set search_path to ''
as $$
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
$$;
revoke all on function public.my_reports() from public, anon, authenticated;
grant execute on function public.my_reports() to authenticated;

-- ----------------------------------------------------------------------------
-- WEIGHT, READ AT REQUEST TIME.

create or replace function public.admin_report_signals(p_reports uuid[])
returns table (report_id uuid, phone_confirmed boolean, attended_at timestamptz,
               past_closed integer, past_upheld integer)
language sql
stable
security definer
set search_path to ''
as $$
  select r.id,
         (u.phone_confirmed_at is not null),
         (select max(coalesce(i.slot_at, i.updated_at))
            from public.inspection_requests i
           where i.requester_id = r.reporter_id
             and r.target_type = 'listing'
             and i.listing_id::text = r.target_id
             and i.state = 'COMPLETED'::public.inspection_state),
         (select count(*)::int from public.reports p
           where p.reporter_id = r.reporter_id and p.id <> r.id
             and p.status::text in ('resolved', 'dismissed')),
         (select count(*)::int from public.reports p
           where p.reporter_id = r.reporter_id and p.id <> r.id
             and p.status::text = 'resolved')
    from public.reports r
    left join auth.users u on u.id = r.reporter_id
   where r.id = any(p_reports)
     and private.is_operator((select auth.uid()));
$$;
revoke all on function public.admin_report_signals(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_report_signals(uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
-- READ BACK.

do $$
begin
  /* has_table_privilege answers for the named role (a grant to PUBLIC
     included, a column grant not); information_schema's grant views answer
     only for the observer and pass by seeing nothing. */
  if has_table_privilege('anon', 'public.queue_claims', 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.queue_claims', 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'queue_claims is writable by an API role';
  end if;
  if has_function_privilege('anon', 'public.queue_take(text, uuid, uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.withdraw_my_report(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.admin_report_signals(uuid[])', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.is_operator(uuid)', 'EXECUTE') then
    raise exception 'a V-89 door is open to the wrong role';
  end if;
end
$$;
