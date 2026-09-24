-- Write privileges on public tables match what a policy can actually allow.
--
-- anon: no write privilege on any public table, view or sequence. Every write
-- policy that admits anon (or PUBLIC) requires a signed-in uid or a staff
-- role, and the only two that do not (post_views, story_views: "can the
-- reader see it") are reached by the app only for a signed-in session. So
-- anon's grants opened nothing today and would open whatever a future
-- permissive policy forgot to scope. New tables and sequences created by
-- postgres start with no anon write either.
--
-- authenticated: the INSERT, UPDATE and DELETE grants that no permissive
-- policy backs are withdrawn. Each of these writes is refused by RLS today;
-- after this they are refused by privilege, so a policy added later for one
-- command does not quietly open it. Every write the app makes through a
-- user's client is on a (table, command) that keeps its grant; the tables
-- here are written by the service role or by SECURITY DEFINER functions.
-- The remaining grants are pinned by tests/probes/db-06.sql.

do $$
declare
  r record;
begin
  for r in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
  loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', r.relname);
  end loop;
end
$$;

revoke usage, update on all sequences in schema public from anon;

alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public
  revoke usage, update on sequences from anon;

-- Relations created by supabase_admin take that role's own default
-- privileges, which grant anon every privilege. postgres can change them only
-- where it is allowed to; where it is not, the check at the end of this
-- migration (and tests/probes/db-06.sql) is the backstop.
do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public '
       || 'revoke insert, update, delete, truncate, references, trigger on tables from anon';
  execute 'alter default privileges for role supabase_admin in schema public '
       || 'revoke usage, update on sequences from anon';
exception when insufficient_privilege then
  raise notice 'supabase_admin default privileges left as they are: %', sqlerrm;
end
$$;

revoke insert, update, delete on public.account_deletion_requests from authenticated;
revoke delete on public.agent_applications from authenticated;
revoke insert, update, delete on public.agent_badges from authenticated;
revoke delete on public.agent_documents from authenticated;
revoke insert, update, delete on public.agent_suspensions from authenticated;
revoke insert, update, delete on public.amenities from authenticated;
revoke delete on public.areas from authenticated;
revoke update on public.blocks from authenticated;
revoke insert, update, delete on public.booking_state_events from authenticated;
revoke insert, update, delete on public.bot_invocations from authenticated;
revoke insert, update, delete on public.business_transfers from authenticated;
revoke insert, update, delete on public.catalogue_entries from authenticated;
revoke update, delete on public.conversations from authenticated;
revoke insert, update, delete on public.escrow_evidence from authenticated;
revoke insert, update, delete on public.escrow_float_snapshots from authenticated;
revoke update on public.follows from authenticated;
revoke update, delete on public.inspection_confirmations from authenticated;
revoke update, delete on public.message_attachments from authenticated;
revoke insert, delete on public.message_flags from authenticated;
revoke update, delete on public.messages from authenticated;
revoke update on public.mutes from authenticated;
revoke insert on public.notifications from authenticated;
revoke update on public.post_media from authenticated;
revoke update on public.post_reactions from authenticated;
revoke update on public.post_reposts from authenticated;
revoke update, delete on public.post_views from authenticated;
revoke insert, delete on public.profiles from authenticated;
revoke delete on public.reservations from authenticated;
revoke update, delete on public.reviews from authenticated;
revoke insert, update, delete on public.states from authenticated;
revoke update on public.story_comment_reactions from authenticated;
revoke update on public.story_reactions from authenticated;
revoke update, delete on public.story_views from authenticated;
revoke update, delete on public.support_ticket_messages from authenticated;
revoke insert, update, delete on public.terms_acceptances from authenticated;
revoke insert, update, delete on public.wallet_balances from authenticated;

-- anon holds no write on any public relation or sequence, whoever owns it;
-- and nothing granted to authenticated is left without a policy behind it.
do $$
declare
  dead text;
  anon_writes text;
begin
  select string_agg(format('%s.%s', t.relname, cmds.cmd), ', ') into anon_writes
    from pg_class t join pg_namespace n on n.oid = t.relnamespace
   cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) cmds(cmd)
   where n.nspname = 'public' and t.relkind in ('r', 'p', 'v', 'm', 'f')
     and (has_table_privilege('anon', t.oid, cmds.cmd)
          or (cmds.cmd in ('INSERT', 'UPDATE') and exists (
                select 1 from pg_attribute a
                 where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
                   and has_column_privilege('anon', t.oid, a.attnum, cmds.cmd))));
  if anon_writes is not null then
    raise exception 'anon still holds writes: %', anon_writes;
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'S'
                and (has_sequence_privilege('anon', c.oid, 'USAGE') or has_sequence_privilege('anon', c.oid, 'UPDATE'))) then
    raise exception 'anon can still advance a public sequence';
  end if;

  select string_agg(format('%s.%s', t.relname, cmds.cmd), ', ') into dead
    from pg_class t join pg_namespace n on n.oid = t.relnamespace
   cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) cmds(cmd)
   where n.nspname = 'public' and t.relkind in ('r', 'p', 'v', 'm', 'f')
     and (has_table_privilege('authenticated', t.oid, cmds.cmd)
          or (cmds.cmd <> 'DELETE' and exists (
                select 1 from pg_attribute a
                 where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
                   and has_column_privilege('authenticated', t.oid, a.attnum, cmds.cmd))))
     and not exists (
           select 1 from pg_policies p
            where p.schemaname = 'public' and p.tablename = t.relname and p.permissive = 'PERMISSIVE'
              and p.cmd in (cmds.cmd, 'ALL') and p.roles && array['public', 'authenticated']::name[]);
  if dead is not null then
    raise exception 'authenticated still holds writes no policy backs: %', dead;
  end if;
end
$$;
