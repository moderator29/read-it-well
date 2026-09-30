-- C10: INTERNAL ACCOUNTS LEFT OUT OF EVERY FIGURE (30 September 2026).
--
-- Applied 30 September 2026 with the founder's approval. Adds one table and one function, seeds the two
-- QA accounts the console already names. Rewrites no existing row, drops
-- nothing, changes no existing table, policy or function; safe to run twice.
--
-- WHY. The console leaves out two hard-coded QA accounts
-- (apps/web/src/lib/admin/reads/shapes.ts, QA_ACCOUNT_IDS) and nobody else.
-- Staff (3 live grants on 30 September) and any later QA or test account
-- still count in the analytics, the overview pulse and the listing view
-- counter. At 16 accounts one QA walk is a large share of the numbers.
--
-- WHAT. `public.internal_accounts` is the one list: a person on it is left
-- out of every figure. A super admin who has proved the console key adds or
-- removes a person with `public.admin_set_internal(p_user, p_internal,
-- p_reason)`, which writes one audit row (`staff.internal_marked` or
-- `staff.internal_cleared`). Anybody holding a staff grant that is not
-- revoked is treated as internal by the app without being listed, so a new
-- hire is excluded from day one.
--
-- The app degrades gracefully: until this is applied it reads the QA list and
-- the staff grants only (apps/web/src/lib/admin/internal-accounts.ts). After
-- it is applied the staff page's "Leave out of figures" switch goes live.
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

create table if not exists public.internal_accounts (
  user_id   uuid        primary key references auth.users (id) on delete cascade,
  reason    text        not null default '' check (length(reason) <= 200),
  marked_by uuid        references auth.users (id) on delete set null,
  marked_at timestamptz not null default now()
);

comment on table public.internal_accounts is
  'C10: people left out of every figure (QA, test and internal accounts). Staff grants count as internal without a row. Written only through public.admin_set_internal.';

alter table public.internal_accounts enable row level security;

drop policy if exists internal_accounts_admin_select on public.internal_accounts;
create policy internal_accounts_admin_select on public.internal_accounts
  for select to authenticated
  using (
    (select private.has_role((select auth.uid()), 'admin'::public.app_role))
    or (select private.has_role((select auth.uid()), 'super_admin'::public.app_role))
  );

revoke all on public.internal_accounts from anon, authenticated;
grant select on public.internal_accounts to authenticated;

-- The two QA accounts the console already leaves out (shapes.ts).
insert into public.internal_accounts (user_id, reason)
select u.id, 'QA account (founder, 23 September 2026)'
  from auth.users u
 where u.id in ('957b3bd2-cce3-425d-bba9-5cd876ca3d62'::uuid, '03f3dd52-ea28-4852-9abe-e5b0a67c2a43'::uuid)
on conflict (user_id) do nothing;

create or replace function public.admin_set_internal(p_user uuid, p_internal boolean, p_reason text default '')
returns jsonb
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor  uuid := (select auth.uid());
  reason text := left(btrim(coalesce(p_reason, '')), 200);
  was    boolean;
begin
  if actor is null or not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then
    return jsonb_build_object('status', 'invalid_target');
  end if;

  select exists (select 1 from public.internal_accounts where user_id = p_user) into was;

  if coalesce(p_internal, false) then
    insert into public.internal_accounts (user_id, reason, marked_by, marked_at)
    values (p_user, reason, actor, now())
    on conflict (user_id) do update set reason = excluded.reason, marked_by = excluded.marked_by, marked_at = excluded.marked_at;
  else
    delete from public.internal_accounts where user_id = p_user;
  end if;

  if was is distinct from coalesce(p_internal, false) then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      case when coalesce(p_internal, false) then 'staff.internal_marked' else 'staff.internal_cleared' end,
      'staff_grant',
      p_user::text,
      jsonb_build_object('reason', reason)
    );
  end if;

  return jsonb_build_object('status', 'ok', 'internal', coalesce(p_internal, false));
end;
$function$;

revoke all on function public.admin_set_internal(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_internal(uuid, boolean, text) to authenticated;

-- READ-BACK: raise if anything above did not land.
do $check$
begin
  if to_regclass('public.internal_accounts') is null then
    raise exception 'internal_accounts missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.internal_accounts'::regclass) then
    raise exception 'internal_accounts has RLS off';
  end if;
  if to_regprocedure('public.admin_set_internal(uuid, boolean, text)') is null then
    raise exception 'admin_set_internal missing';
  end if;
  if has_function_privilege('anon', 'public.admin_set_internal(uuid, boolean, text)', 'execute') then
    raise exception 'admin_set_internal is callable by anon';
  end if;
end;
$check$;
