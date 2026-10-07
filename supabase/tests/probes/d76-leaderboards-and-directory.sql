-- D76-LEADERBOARDS-AND-DIRECTORY: the boards rank by counts of real activity,
-- carry no private field, respect the opt-out, and the directory lists only
-- live, non-demo supply. Needs supabase/migrations/pending/d76_leaderboards_and_directory.sql.
-- The fixture is two QA members (the room-bookings probe's host and guest).
--
--  1. the public row types carry no email, phone, amount, member id or owner id
--  2. every read is security definer with a pinned search_path; anon may read
--     the boards and the directory, never the opt-out
--  3. referrals: qualified and onward count, pending and reversed do not;
--     the month board holds only this month, all time holds both members,
--     and ties share a rank
--  4. movement: on all time the guest was ranked before this month; the host
--     is new (no previous rank); next_score is the nearest higher count
--  5. City: the host's own state keeps them, another state is empty
--  6. is_me marks the caller's own row, and the caller's row comes back even
--     past the limit
--  7. the opt-out takes the host off, and back on
--  8. nobody can hide a business they do not own; an owner can
--  9. an unverified or demo business never reaches a board, and the
--     directory never lists a demo business
-- Everything is rolled back by the final raise.
do $$
declare
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host_state text; other_state text;
  biz uuid; demo_biz uuid; camp uuid;
  n int; cols text;
  r record;
  last_month timestamptz := ((date_trunc('month', now() at time zone 'Africa/Lagos') - interval '10 days') at time zone 'Africa/Lagos');
begin
  -- 1. No private field in any public row type.
  select string_agg(a, ',') into cols
    from (select unnest(p.proargnames) a from pg_proc p join pg_namespace s on s.oid = p.pronamespace
           where s.nspname = 'public' and p.proname in ('leaderboard', 'directory', 'my_leaderboard_visibility')) x;
  if cols ~* '(email|phone|minor|amount|owner_id|subject_id|user_id|referrer|address)' then
    raise exception 'PROBE_FAIL d76 1: a public row type carries a private field: %', cols;
  end if;

  -- 2. Definer, pinned path, grants.
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname in ('leaderboard', 'directory', 'my_leaderboard_visibility', 'leaderboard_set_hidden')
     and p.prosecdef and array_to_string(p.proconfig, ',') like '%search_path=%';
  if n <> 4 then raise exception 'PROBE_FAIL d76 2: % of 4 reads are definer with a pinned path', n; end if;
  if not has_function_privilege('anon', 'public.leaderboard(text,text,text,integer)', 'execute')
     or not has_function_privilege('anon', 'public.directory(text,text,text,integer)', 'execute') then
    raise exception 'PROBE_FAIL d76 2: anon cannot read the boards or the directory';
  end if;
  if has_function_privilege('anon', 'public.leaderboard_set_hidden(boolean,uuid)', 'execute')
     or has_table_privilege('authenticated', 'public.leaderboard_opt_outs', 'select') then
    raise exception 'PROBE_FAIL d76 2: the opt-out is reachable outside its function';
  end if;

  -- The fixture: two referrals for the host this month, one for the guest last
  -- month, and a pending and a reversed one for the host that must not count.
  delete from public.leaderboard_opt_outs where subject_id in (host, guest);
  -- A referral that has qualified carries its terms (referrals_qualified_has_terms:
  -- reward, campaign, period and review window), and every status but
  -- attributed and reversed has qualified (referrals_live_was_qualified), so
  -- the pending one is qualified this month too: its status alone keeps it off.
  select id into camp from public.referral_campaigns order by created_at limit 1;
  if camp is null then raise exception 'PROBE_FAIL d76 3: fixture needs a referral campaign row'; end if;
  insert into public.referrals (referrer_id, referred_id, code, status, qualified_at, month,
                                reward_minor, campaign_id, period_month, review_until)
  values (host, gen_random_uuid(), 'PROBE76', 'qualified', now(), private.lagos_month(now()),
          1, camp, private.lagos_month(now()), now() + interval '7 days'),
         (host, gen_random_uuid(), 'PROBE76', 'paid', now(), private.lagos_month(now()),
          1, camp, private.lagos_month(now()), now() + interval '7 days'),
         (guest, gen_random_uuid(), 'PROBE76', 'approved', last_month, private.lagos_month(last_month),
          1, camp, private.lagos_month(last_month), last_month + interval '7 days'),
         (host, gen_random_uuid(), 'PROBE76', 'pending', now(), private.lagos_month(now()),
          1, camp, private.lagos_month(now()), now() + interval '7 days'),
         (host, gen_random_uuid(), 'PROBE76', 'reversed', now(), private.lagos_month(now()),
          1, camp, private.lagos_month(now()), now() + interval '7 days');

  perform set_config('request.jwt.claims', json_build_object('sub', host::text, 'role', 'authenticated')::text, true);

  -- 3. Month and all time. Written relative to whatever else is live.
  select * into r from public.leaderboard('referrals', null, 'month', 100) where is_me;
  if r is null or r.score <> 2 then
    raise exception 'PROBE_FAIL d76 3: the host''s month row is wrong: %', r;
  end if;
  if exists (select 1 from public.leaderboard('referrals', null, 'month', 100) l where l.score = r.score and l.rank <> r.rank) then
    raise exception 'PROBE_FAIL d76 3: a tie does not share a rank';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', guest::text, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.leaderboard('referrals', null, 'month', 100) where is_me) then
    raise exception 'PROBE_FAIL d76 3: last month''s referral counts this month';
  end if;
  select * into r from public.leaderboard('referrals', null, 'all', 100) where is_me;
  if r is null or r.score < 1 then
    raise exception 'PROBE_FAIL d76 3: all time does not hold the guest';
  end if;

  -- 4. Movement on all time: the guest was ranked before this month, and
  --    next_score is the nearest higher count.
  if r.previous_rank is null then
    raise exception 'PROBE_FAIL d76 4: the guest has no previous rank';
  end if;
  if r.rank > 1 and (r.next_score is null or r.next_score <= r.score) then
    raise exception 'PROBE_FAIL d76 4: next_score is not a higher count: %', r;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', host::text, 'role', 'authenticated')::text, true);
  if (select previous_rank from public.leaderboard('referrals', null, 'all', 100) where is_me) is not null
     and not exists (select 1 from public.referrals x where x.referrer_id = host and x.code <> 'PROBE76'
                      and x.status in ('qualified','approved','available','processing','paid')
                      and x.qualified_at < (date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')) then
    raise exception 'PROBE_FAIL d76 4: the host has a previous rank before any activity';
  end if;

  -- 5. City.
  select coalesce(sp.state_code, p.state_code) into host_state
    from public.profiles p left join public.social_profiles sp on sp.user_id = p.id where p.id = host;
  if host_state is not null then
    if not exists (select 1 from public.leaderboard('referrals', host_state, 'month', 50) where is_me) then
      raise exception 'PROBE_FAIL d76 5: the host is not on their own state''s board';
    end if;
  end if;
  select code into other_state from public.states where code is distinct from host_state limit 1;
  if exists (select 1 from public.leaderboard('referrals', other_state, 'month', 50) where is_me) then
    raise exception 'PROBE_FAIL d76 5: the host is on another state''s board';
  end if;

  -- 6. The caller's row past the limit.
  if not exists (select 1 from public.leaderboard('referrals', null, 'all', 1) where is_me) then
    raise exception 'PROBE_FAIL d76 6: the caller''s own row is missing';
  end if;

  -- 7. The opt-out.
  perform public.leaderboard_set_hidden(true);
  if exists (select 1 from public.leaderboard('referrals', null, 'all', 50) where is_me) then
    raise exception 'PROBE_FAIL d76 7: an opted-out member is still ranked';
  end if;
  if not (select hidden from public.my_leaderboard_visibility() where subject_kind = 'member') then
    raise exception 'PROBE_FAIL d76 7: the visibility read does not say hidden';
  end if;
  perform public.leaderboard_set_hidden(false);
  if not exists (select 1 from public.leaderboard('referrals', null, 'all', 50) where is_me) then
    raise exception 'PROBE_FAIL d76 7: showing again did not put the host back';
  end if;

  -- 8. Hiding a business.
  insert into public.businesses (owner_id, kind, name, slug, status, source, verified)
  values (host, 'restaurant', 'Probe 76 Kitchen', 'probe-76-' || gen_random_uuid(), 'PUBLISHED', 'first_party', false)
  returning id into biz;
  perform set_config('request.jwt.claims', json_build_object('sub', guest::text, 'role', 'authenticated')::text, true);
  begin
    perform public.leaderboard_set_hidden(true, biz);
    raise exception 'PROBE_FAIL d76 8: a stranger hid a business';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', host::text, 'role', 'authenticated')::text, true);
  perform public.leaderboard_set_hidden(true, biz);
  if not exists (select 1 from public.leaderboard_opt_outs where subject_kind = 'business' and subject_id = biz) then
    raise exception 'PROBE_FAIL d76 8: the owner could not hide their business';
  end if;
  perform public.leaderboard_set_hidden(false, biz);

  -- 9. Unverified and demo never reach a board; demo never reaches the directory.
  insert into public.businesses (owner_id, kind, name, slug, status, source, verified, is_demo)
  values (host, 'hotel', 'Probe 76 Demo Hotel', 'probe-76-demo-' || gen_random_uuid(), 'PUBLISHED', 'first_party', true, true)
  returning id into demo_biz;
  if exists (select 1 from public.leaderboard('restaurants', null, 'all', 100) where display_name = 'Probe 76 Kitchen')
     or exists (select 1 from public.directory('stays', null, 'Probe 76 Demo', 60)) then
    raise exception 'PROBE_FAIL d76 9: an unverified or demo business was shown';
  end if;

  raise exception 'PROBE_OK d76-leaderboards-and-directory';
end
$$;
