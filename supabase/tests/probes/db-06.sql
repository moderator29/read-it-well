-- DB-06: write privileges on public tables match what a policy can allow.
-- anon holds no write on any public table or sequence, and new tables made
-- by postgres start that way. authenticated holds exactly the checked-in
-- allowlist below (i = insert, u = update, d = delete); each pair has a
-- permissive policy behind it. A new write grant, or one left without a
-- policy, fails this probe until it is added here deliberately.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  n int;
  extra text;
  missing text;
  dead text;
begin
  -- The allowlist.
  with allow(tbl, cmds) as (values
      ('accommodation_amenities', 'idu'),
      ('accommodation_photos', 'idu'),
      ('accommodations', 'idu'),
      ('agent_applications', 'iu'),
      ('agent_documents', 'iu'),
      ('agent_verification_checks', 'idu'),
      ('agents', 'idu'),
      ('ai_conversations', 'idu'),
      ('ai_messages', 'idu'),
      ('area_members', 'idu'),
      ('area_moderator_applications', 'idu'),
      ('areas', 'iu'),
      ('availability', 'idu'),
      ('badges', 'idu'),
      ('bank_accounts', 'u'),
      ('blocks', 'id'),
      ('bookings', 'i'),
      ('bot_settings', 'idu'),
      ('business_documents', 'id'),
      ('business_photos', 'idu'),
      ('business_verification_checks', 'idu'),
      ('businesses', 'idu'),
      ('cancellation_policies', 'idu'),
      ('conversations', 'i'),
      ('event_attendees', 'idu'),
      ('events', 'idu'),
      ('feature_flags', 'idu'),
      ('firm_members', 'idu'),
      ('follows', 'id'),
      ('inspection_confirmations', 'i'),
      ('inspection_report_items', 'iu'),
      ('inspection_report_photos', 'i'),
      ('inspection_reports', 'iu'),
      ('inspection_requests', 'idu'),
      ('landmarks', 'idu'),
      ('listing_access', 'idu'),
      ('listing_amenities', 'idu'),
      ('listing_mandates', 'idu'),
      ('listing_photos', 'idu'),
      ('listing_videos', 'idu'),
      ('listings', 'idu'),
      ('local_governments', 'idu'),
      ('message_attachments', 'i'),
      ('message_flags', 'u'),
      ('messages', 'i'),
      ('mutes', 'id'),
      ('notifications', 'du'),
      ('occupations', 'idu'),
      ('payment_methods', 'u'),
      ('payout_accounts', 'du'),
      ('post_media', 'id'),
      ('post_reactions', 'id'),
      ('post_reposts', 'id'),
      ('post_views', 'i'),
      ('posts', 'idu'),
      ('price_check_watches', 'id'),
      ('profiles', 'u'),
      ('rate_calendar', 'idu'),
      ('rate_plans', 'idu'),
      ('reports', 'idu'),
      ('reservations', 'iu'),
      ('restaurant_profiles', 'idu'),
      ('review_responses', 'idu'),
      ('reviews', 'i'),
      ('risk_alerts', 'idu'),
      ('room_inventory', 'idu'),
      ('room_types', 'idu'),
      ('saved_items', 'idu'),
      ('saved_places', 'id'),
      ('saved_searches', 'idu'),
      ('service_windows', 'idu'),
      ('social_profiles', 'idu'),
      ('stories', 'idu'),
      ('story_comment_reactions', 'id'),
      ('story_comments', 'idu'),
      ('story_reactions', 'id'),
      ('story_views', 'i'),
      ('support_ticket_messages', 'i'),
      ('support_tickets', 'idu'),
      ('units', 'idu'),
      ('user_badges', 'idu'),
      ('user_roles', 'idu'),
      ('wallet_pots', 'iu')
  ),
  expected as (
    select tbl, case c when 'i' then 'INSERT' when 'u' then 'UPDATE' else 'DELETE' end cmd
      from allow, regexp_split_to_table(cmds, '') c
  ),
  live as (
    select r.role, t.relname tbl, cmds.cmd
      from pg_class t join pg_namespace ns on ns.oid = t.relnamespace
     cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) cmds(cmd)
     cross join (values ('anon'), ('authenticated')) r(role)
     where ns.nspname = 'public' and t.relkind in ('r', 'p', 'v', 'm', 'f')
       and (has_table_privilege(r.role, t.oid, cmds.cmd)
            or (cmds.cmd <> 'DELETE' and exists (
                  select 1 from pg_attribute a
                   where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
                     and has_column_privilege(r.role, t.oid, a.attnum, cmds.cmd))))
  )
  select (select string_agg(format('%s:%s.%s', l.role, l.tbl, l.cmd), ', ')
            from live l
           where l.role = 'anon' or not exists (select 1 from expected e where e.tbl = l.tbl and e.cmd = l.cmd)),
         (select string_agg(format('%s.%s', e.tbl, e.cmd), ', ')
            from expected e
           where not exists (select 1 from live l where l.role = 'authenticated' and l.tbl = e.tbl and l.cmd = e.cmd))
    into extra, missing;
  if extra is not null then raise exception 'PROBE_FAIL db-06: write grants not on the allowlist: %', extra; end if;
  if missing is not null then raise exception 'PROBE_FAIL db-06: allowlisted grants gone (update the list): %', missing; end if;

  -- Each allowlisted pair has a permissive policy behind it.
  select string_agg(format('%s.%s', l.tbl, l.cmd), ', ') into dead
    from (select t.relname tbl, cmds.cmd
            from pg_class t join pg_namespace ns on ns.oid = t.relnamespace
           cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) cmds(cmd)
           where ns.nspname = 'public' and t.relkind in ('r', 'p', 'v', 'm', 'f')
             and has_table_privilege('authenticated', t.oid, cmds.cmd)) l
   where not exists (select 1 from pg_policies p
                      where p.schemaname = 'public' and p.tablename = l.tbl and p.permissive = 'PERMISSIVE'
                        and p.cmd in (l.cmd, 'ALL') and p.roles && array['public', 'authenticated']::name[]);
  if dead is not null then raise exception 'PROBE_FAIL db-06: grants with no policy: %', dead; end if;

  -- Sequences.
  if exists (select 1 from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
              where ns.nspname = 'public' and c.relkind = 'S'
                and (has_sequence_privilege('anon', c.oid, 'USAGE') or has_sequence_privilege('anon', c.oid, 'UPDATE'))) then
    raise exception 'PROBE_FAIL db-06: anon can advance a public sequence';
  end if;

  -- A table created now starts with no anon write.
  create table public.probe_db06_new (id int);
  if has_table_privilege('anon', 'public.probe_db06_new', 'INSERT, UPDATE, DELETE') then
    raise exception 'PROBE_FAIL db-06: a new table grants anon a write';
  end if;
  drop table public.probe_db06_new;

  -- Control: a member's own writes still go through.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  update public.profiles set updated_at = now() where id = member;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-06: member profile update rows=%', n; end if;
  insert into public.blocks (user_id, other_id) values (member, admin);
  delete from public.blocks where user_id = member and other_id = admin;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-06: member unblock rows=%', n; end if;

  -- authenticated: the writes no policy allowed are refused by privilege.
  begin insert into public.notifications default values;
    raise exception 'PROBE_FAIL db-06: member inserted a notification';
  exception when insufficient_privilege then null; end;
  begin update public.messages set read_at = now() where false;
    raise exception 'PROBE_FAIL db-06: member could update messages';
  exception when insufficient_privilege then null; end;
  begin insert into public.terms_acceptances default values;
    raise exception 'PROBE_FAIL db-06: member inserted a terms acceptance';
  exception when insufficient_privilege then null; end;
  begin delete from public.reviews where false;
    raise exception 'PROBE_FAIL db-06: member could delete reviews';
  exception when insufficient_privilege then null; end;
  begin insert into public.agent_badges default values;
    raise exception 'PROBE_FAIL db-06: member inserted an agent badge';
  exception when insufficient_privilege then null; end;

  -- anon: every write is refused by privilege.
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin insert into public.user_roles default values;
    raise exception 'PROBE_FAIL db-06: anon inserted a role';
  exception when insufficient_privilege then null; end;
  begin insert into public.wallet_entries default values;
    raise exception 'PROBE_FAIL db-06: anon inserted a wallet entry';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set updated_at = now() where false;
    raise exception 'PROBE_FAIL db-06: anon could update profiles';
  exception when insufficient_privilege then null; end;
  begin insert into public.post_views default values;
    raise exception 'PROBE_FAIL db-06: anon inserted a post view';
  exception when insufficient_privilege then null; end;
  begin delete from public.listings where false;
    raise exception 'PROBE_FAIL db-06: anon could delete listings';
  exception when insufficient_privilege then null; end;
  begin perform nextval('public.agent_ref_seq');
    raise exception 'PROBE_FAIL db-06: anon advanced agent_ref_seq';
  exception when insufficient_privilege then null; end;

  raise exception 'PROBE_OK db-06';
end
$$;
