-- Pre-launch performance hardening: RLS init-plan rewrites and one missing
-- foreign key index.
--
-- A policy that calls auth.uid() directly is re-evaluated for every row the
-- query touches. Wrapping the call in a scalar subquery, (select auth.uid()),
-- makes Postgres evaluate it once per statement and reuse the result, which
-- is the difference between a linear and a constant cost on the big reads:
-- a guest's booking history, a wallet statement, an admin queue scan. The
-- rewrite is purely mechanical and changes no authorisation semantics: the
-- same expression, evaluated once instead of per row.
--
-- It is applied by generating the ALTER POLICY statements from the catalogue
-- rather than by hand, so every policy carrying auth.uid() is covered exactly
-- as it exists, with no transcription risk, and the guard makes re-running
-- harmless.

do $$
declare
  p record;
begin
  for p in
    select policyname, tablename, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual like '%auth.uid()%' or coalesce(with_check, '') like '%auth.uid()%')
      and qual not like '%( SELECT auth.uid()%'
      and coalesce(with_check, '') not like '%( SELECT auth.uid()%'
  loop
    execute format(
      'alter policy %I on public.%I%s%s',
      p.policyname,
      p.tablename,
      case when p.qual is not null
        then ' using (' || replace(p.qual, 'auth.uid()', '(select auth.uid())') || ')'
        else '' end,
      case when p.with_check is not null
        then ' with check (' || replace(p.with_check, 'auth.uid()', '(select auth.uid())') || ')'
        else '' end
    );
  end loop;
end $$;

-- support_ticket_messages.sender_id had no covering index, so deleting or
-- updating an auth user forced a sequential scan of the ticket thread table.
create index if not exists support_ticket_messages_sender_idx
  on public.support_ticket_messages (sender_id);
