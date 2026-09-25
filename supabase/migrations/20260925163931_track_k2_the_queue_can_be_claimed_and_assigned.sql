-- THE UNIFIED QUEUE CAN BE CLAIMED AND ASSIGNED (founder follow-up, 25 September 2026).
--
-- Only the claim machinery from the backlog migration
-- `20260924160400_v89_the_queue_becomes_a_desk.sql`: the queue_claims table
-- and the queue_take / queue_release / queue_assign / queue_operators doors.
-- Saved views, report withdrawal and report signals from that file are NOT
-- applied here.
--
-- Two adaptations, because V-89 was written before the Track K staff model:
--   * Who may claim a row is decided per kind by private.staff_can, so an
--     admin may work every kind and a staff member only the kinds their scope
--     covers (listing -> listing_approval, application -> kyc_review,
--     report / flag -> moderation, ticket -> support), after the handbook.
--   * queue_operators names people from profiles.display_name directly;
--     V-89 used private.person_name, which lives in a backlog migration that
--     is not applied.
-- Every door decides on auth.uid() and writes its own audit row.

create table if not exists public.queue_claims (
  kind text not null check (kind in ('listing', 'application', 'report', 'ticket', 'flag')),
  item_id uuid not null,
  claimed_by uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  touched_at timestamptz not null default now(),
  primary key (kind, item_id)
);
create index if not exists queue_claims_by_idx on public.queue_claims (claimed_by);

comment on table public.queue_claims is
  'Who has taken a queue row. Live for 30 minutes after touched_at; written only by queue_take / queue_release / queue_assign.';

create or replace function private.queue_scope(p_kind text)
returns text
language sql
immutable
set search_path to ''
as $$
  select case p_kind
    when 'listing' then 'listing_approval'
    when 'application' then 'kyc_review'
    when 'report' then 'moderation'
    when 'flag' then 'moderation'
    when 'ticket' then 'support'
  end;
$$;

-- An operator of the queue at all: an admin, or staff holding any queue scope.
create or replace function private.is_operator(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_user is not null
     and (private.staff_can(p_user, 'moderation')
       or private.staff_can(p_user, 'listing_approval')
       or private.staff_can(p_user, 'kyc_review')
       or private.staff_can(p_user, 'support'));
$$;

alter table public.queue_claims enable row level security;
revoke all on table public.queue_claims from public, anon, authenticated;
grant select on table public.queue_claims to authenticated;

drop policy if exists queue_claims_operator_read on public.queue_claims;
create policy queue_claims_operator_read on public.queue_claims
  for select to authenticated
  using (private.is_operator((select auth.uid())));

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
  if p_kind not in ('listing', 'application', 'report', 'ticket', 'flag') or p_item is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  if actor is null or not private.staff_can(actor, private.queue_scope(p_kind)) then
    return jsonb_build_object('status', 'forbidden');
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
  if actor is null or not private.is_operator(actor) then
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

-- Hand a row to another operator, who must be able to work that kind of row.
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
  if p_kind not in ('listing', 'application', 'report', 'ticket', 'flag') or p_item is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  if actor is null or not private.staff_can(actor, private.queue_scope(p_kind)) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_to is null or not private.staff_can(p_to, private.queue_scope(p_kind)) then
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

-- The people a row can be handed to, by name, for the assign menu.
create or replace function public.queue_operators()
returns table (user_id uuid, name text)
language sql
stable
security definer
set search_path to ''
as $$
  with people as (
    select r.user_id from public.user_roles r
     where r.role in ('admin'::public.app_role, 'super_admin'::public.app_role)
    union
    select g.user_id from public.staff_grants g where g.revoked_at is null
  )
  select p.user_id, nullif(btrim(pr.display_name), '')
    from people p
    left join public.profiles pr on pr.id = p.user_id
   where private.is_operator(p.user_id)
     and private.is_operator((select auth.uid()));
$$;

revoke all on function private.queue_scope(text) from public, anon, authenticated;
revoke all on function private.is_operator(uuid) from public, anon, authenticated;
revoke all on function public.queue_take(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_release(text, uuid) from public, anon, authenticated;
revoke all on function public.queue_assign(text, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.queue_operators() from public, anon, authenticated;
grant execute on function public.queue_take(text, uuid, uuid) to authenticated;
grant execute on function public.queue_release(text, uuid) to authenticated;
grant execute on function public.queue_assign(text, uuid, uuid, uuid) to authenticated;
grant execute on function public.queue_operators() to authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.queue_claims', 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.queue_claims', 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'queue_claims is writable by an API role';
  end if;
  if has_function_privilege('anon', 'public.queue_take(text, uuid, uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.is_operator(uuid)', 'EXECUTE') then
    raise exception 'a queue door is open to the wrong role';
  end if;
end
$$;
