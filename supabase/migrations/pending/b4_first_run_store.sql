-- W7-R1 / W7-R2 (R3-32): the server-side first-run store Session 3 is
-- blocked on. Pending: NOT applied.
--
-- One row per member per feature whose first run they have been shown. The
-- device cookie (`first-run-device.ts`) stays as the fallback; this is the
-- answer that survives a cleared cookie or a new device.
--
-- RLS: a member reads and writes their own rows only. No delete grant: a
-- first run once seen stays seen. Additive and idempotent.

set local lock_timeout = '5s';

create table if not exists public.first_runs_seen (
  user_id  uuid not null references auth.users(id) on delete cascade,
  feature  text not null check (feature ~ '^[a-z][a-z0-9_-]{0,39}$'),
  seen_at  timestamptz not null default now(),
  primary key (user_id, feature)
);

comment on table public.first_runs_seen is
  'W7-R1: which feature first runs a member has been shown. Member reads and writes own rows only; the cookie is the fallback.';

alter table public.first_runs_seen enable row level security;
revoke all on public.first_runs_seen from public, anon, authenticated;
grant select, insert on public.first_runs_seen to authenticated;

do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'first_runs_seen' and policyname = 'first_runs_seen_read_own') then
    create policy first_runs_seen_read_own on public.first_runs_seen
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'first_runs_seen' and policyname = 'first_runs_seen_write_own') then
    create policy first_runs_seen_write_own on public.first_runs_seen
      for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
end $p$;

-- The write, idempotent: marking a seen feature again is a no-op, never an error.
create or replace function public.mark_first_run_seen(p_feature text)
returns boolean language sql security invoker set search_path = '' as $$
  insert into public.first_runs_seen (user_id, feature)
  select (select auth.uid()), p_feature where (select auth.uid()) is not null
  on conflict (user_id, feature) do nothing
  returning true;
$$;
revoke all on function public.mark_first_run_seen(text) from public, anon;
grant execute on function public.mark_first_run_seen(text) to authenticated;

do $check$
begin
  if to_regclass('public.first_runs_seen') is null then
    raise exception 'b4_first_run_store did not land: the table is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.first_runs_seen'::regclass) then
    raise exception 'b4_first_run_store did not land: RLS is off';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'first_runs_seen') <> 2 then
    raise exception 'b4_first_run_store did not land: expected two policies';
  end if;
  if has_table_privilege('anon', 'public.first_runs_seen', 'SELECT')
     or has_table_privilege('authenticated', 'public.first_runs_seen', 'DELETE') then
    raise exception 'b4_first_run_store did not land: grants are wider than read and insert';
  end if;
end $check$;
