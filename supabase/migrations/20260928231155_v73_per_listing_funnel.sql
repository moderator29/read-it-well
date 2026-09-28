/*
 * V-73. PER-LISTING FUNNEL: SEEN, OPENED, SAVED, ENQUIRED, VIEWING BOOKED, VIEWED.
 *
 * `/agent/analytics` says on screen that views and saves are not counted, so
 * an agent cannot tell a good listing from an unseen one, blames the platform
 * and goes back to WhatsApp, where at least the blue ticks show. The lower
 * funnel is already on the platform (`saved_items`, `conversations`,
 * `inspection_requests`); what was missing is the top: how often a listing was
 * shown in results and how often it was opened.
 *
 * WHAT IS STORED, AND WHAT IS NOT.
 *
 *   listing_daily_stats   one row per listing per Lagos day: unique viewers who
 *                         SAW it in results (the first twenty cards the page
 *                         drew) and unique viewers who OPENED it. Counts only.
 *   listing_view_marks    the one-day memory that makes "unique" true: an
 *                         HMAC of the viewer under a random salt that exists
 *                         for one Lagos day (private.listing_view_salts). The
 *                         salt and the marks are deleted when the day ends (an hourly
 *                         purge, not only on the next call), after which no
 *                         mark can be tied to anybody. Nothing here can answer
 *                         "who looked at my flat".
 *
 * REVIEW FIXES (batch 4). Recording is SERVER ONLY: `record_listing_views`
 * is executable by service_role alone and is called from the server render
 * with the ids that render actually drew, so nobody can inflate a listing by
 * calling it with ids of their choosing; it is also capped at 300 calls per
 * person per day. `listing_funnel` works over a fixed seven days, compares
 * only with OTHER listers' listings, and returns no median unless at least
 * five such listings exist, so no lister can read one rival's counts.
 *
 * Example listings are never counted (they must never feed a real aggregate),
 * and a lister opening their own listing is not a view.
 *
 * ITS OWN SALT TABLE. The salt table is private.listing_view_salts, not
 * private.view_salts: that name already belongs to the social post counter
 * (private.view_bucket, salt text, which keeps yesterday's salt). Sharing it
 * would have made `create table if not exists` skip silently, left this code
 * reading a text salt as bytea, and let the purge below delete the salt the
 * social counter still needs for today-1.
 *
 * BORN LOCKED. Both tables have RLS on and no grants to anon or authenticated.
 * Writes happen only through `record_listing_views`, a security definer
 * function only the server (service role) may call; reads only through
 * `listing_funnel`, which answers only the listing's own lister or staff.
 */

create table if not exists public.listing_daily_stats (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day date not null,
  impressions integer not null default 0 check (impressions >= 0),
  opens integer not null default 0 check (opens >= 0),
  primary key (listing_id, day)
);

comment on table public.listing_daily_stats is
  'V-73: unique viewers per listing per Lagos day who saw it in results (impressions) and who opened it (opens). Counts only; written by record_listing_views, read by listing_funnel.';

create table if not exists public.listing_view_marks (
  listing_id uuid not null references public.listings(id) on delete cascade,
  day date not null,
  kind "char" not null check (kind in ('i', 'o')),
  viewer_hash text not null,
  primary key (listing_id, day, kind, viewer_hash)
);

comment on table public.listing_view_marks is
  'V-73: one day of memory so a count is of unique viewers. Holds an HMAC of the viewer under a salt that lives one Lagos day, never an id; private.purge_view_marks deletes every row from before today, hourly, with the salt.';

/* One random salt per Lagos day, and a per-person daily call count. */
create table if not exists private.listing_view_salts (
  day date primary key,
  salt bytea not null
);
create table if not exists private.view_calls (
  user_id uuid not null,
  day date not null,
  calls integer not null default 0,
  primary key (user_id, day)
);
revoke all on private.listing_view_salts from public, anon, authenticated;
revoke all on private.view_calls from public, anon, authenticated;

alter table public.listing_daily_stats enable row level security;
alter table public.listing_view_marks enable row level security;
revoke all on public.listing_daily_stats from public, anon, authenticated;
revoke all on public.listing_view_marks from public, anon, authenticated;

/*
 * Record what one signed-in person saw and opened, called by the SERVER with
 * the ids its render drew (at most twenty seen, one opened). Service role
 * only; the viewer is passed in because the server makes the call.
 */
create or replace function public.record_listing_views(p_viewer uuid, p_seen uuid[], p_opened uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  today_salt bytea;
  who text;
  target uuid;
  inserted integer;
  used integer;
begin
  if p_viewer is null then
    return;
  end if;
  /* Staff reading the catalogue are not renters looking (review). */
  if private.has_role(p_viewer, 'admin'::public.app_role)
     or private.has_role(p_viewer, 'super_admin'::public.app_role) then
    return;
  end if;

  insert into private.view_calls (user_id, day, calls) values (p_viewer, today, 1)
  on conflict (user_id, day) do update set calls = private.view_calls.calls + 1
  returning calls into used;
  if used > 300 then
    return;
  end if;

  insert into private.listing_view_salts (day, salt) values (today, extensions.gen_random_bytes(32))
  on conflict (day) do nothing;
  select vs.salt into today_salt from private.listing_view_salts vs where vs.day = today;
  who := encode(extensions.hmac(convert_to(p_viewer::text, 'UTF8'), today_salt, 'sha256'), 'hex');

  for target in
    select distinct l.id
      from unnest(coalesce(p_seen[1:20], array[]::uuid[])) as s(id)
      join public.listings l on l.id = s.id
      join public.agents a on a.id = l.agent_id
     where l.status = 'PUBLISHED' and not l.is_demo and a.user_id <> p_viewer
  loop
    insert into public.listing_view_marks (listing_id, day, kind, viewer_hash)
    values (target, today, 'i', who)
    on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 then
      insert into public.listing_daily_stats (listing_id, day, impressions)
      values (target, today, 1)
      on conflict (listing_id, day) do update
        set impressions = public.listing_daily_stats.impressions + 1;
    end if;
  end loop;

  if p_opened is not null then
    select l.id into target
      from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.id = p_opened and l.status = 'PUBLISHED' and not l.is_demo and a.user_id <> p_viewer;
    if target is not null then
      insert into public.listing_view_marks (listing_id, day, kind, viewer_hash)
      values (target, today, 'o', who)
      on conflict do nothing;
      get diagnostics inserted = row_count;
      if inserted > 0 then
        insert into public.listing_daily_stats (listing_id, day, opens)
        values (target, today, 1)
        on conflict (listing_id, day) do update
          set opens = public.listing_daily_stats.opens + 1;
      end if;
    end if;
  end if;
end;
$$;

comment on function public.record_listing_views(uuid, uuid[], uuid) is
  'V-73: counts unique signed-in viewers who saw (first twenty ids the server rendered) or opened a published, non-example listing today, under a salt that lives one day. Service role only; 300 calls per person per day. The lister''s own views do not count.';

/* The end of the day, on a schedule: marks, salts and call counts from
   before today are deleted, so nothing links a count to a person. */
create or replace function private.purge_view_marks()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.listing_view_marks where day < (now() at time zone 'Africa/Lagos')::date;
  delete from private.listing_view_salts where day < (now() at time zone 'Africa/Lagos')::date;
  delete from private.view_calls where day < (now() at time zone 'Africa/Lagos')::date;
$$;
revoke all on function private.purge_view_marks() from public, anon, authenticated;

/*
 * One listing's last seven days, and the median of similar listings (same
 * property type and city, published, not examples, and NOT the same lister's)
 * beside each stage, only when at least five such listings exist. Answers
 * only the listing's own lister or staff, and nothing for anybody else.
 */
create or replace function public.listing_funnel(p_listing uuid)
returns table (
  stage text,
  mine bigint,
  area_median numeric,
  compared integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  since timestamptz;
  since_day date;
  kind text;
  town text;
  owner_agent uuid;
begin
  if caller is null then
    return;
  end if;
  if not exists (
    select 1 from public.listings l join public.agents a on a.id = l.agent_id
     where l.id = p_listing and a.user_id = caller
  ) and not (private.has_role(caller, 'admin'::public.app_role) or private.has_role(caller, 'super_admin'::public.app_role)) then
    return;
  end if;

  since := now() - interval '7 days';
  since_day := (since at time zone 'Africa/Lagos')::date;
  select l.property_type::text, l.city, l.agent_id into kind, town, owner_agent
    from public.listings l where l.id = p_listing;

  return query
  with peers as (
    select l.id
      from public.listings l
     where l.status = 'PUBLISHED' and not l.is_demo
       and l.property_type::text = kind and l.city is not distinct from town
       and l.agent_id is distinct from owner_agent
  ),
  per as (
    select p.id,
      coalesce((select sum(s.impressions) from public.listing_daily_stats s where s.listing_id = p.id and s.day >= since_day), 0) as seen,
      coalesce((select sum(s.opens) from public.listing_daily_stats s where s.listing_id = p.id and s.day >= since_day), 0) as opened,
      (select count(*) from public.saved_items si where si.listing_id = p.id and si.created_at >= since) as saved,
      (select count(*) from public.conversations c where c.listing_id = p.id and c.created_at >= since) as enquired,
      (select count(*) from public.inspection_requests r where r.listing_id = p.id and r.created_at >= since) as booked,
      (select count(*) from public.inspection_requests r where r.listing_id = p.id and r.state::text = 'COMPLETED' and r.updated_at >= since) as viewed
    from peers p
  ),
  me as (
    select
      coalesce((select sum(s.impressions) from public.listing_daily_stats s where s.listing_id = p_listing and s.day >= since_day), 0) as seen,
      coalesce((select sum(s.opens) from public.listing_daily_stats s where s.listing_id = p_listing and s.day >= since_day), 0) as opened,
      (select count(*) from public.saved_items si where si.listing_id = p_listing and si.created_at >= since) as saved,
      (select count(*) from public.conversations c where c.listing_id = p_listing and c.created_at >= since) as enquired,
      (select count(*) from public.inspection_requests r where r.listing_id = p_listing and r.created_at >= since) as booked,
      (select count(*) from public.inspection_requests r where r.listing_id = p_listing and r.state::text = 'COMPLETED' and r.updated_at >= since) as viewed
  ),
  others as (select * from per where id <> p_listing),
  enough as (select count(*)::integer as n from others)
  select v.stage, v.mine::bigint,
         case when (select n from enough) >= 5 then v.med else null end,
         (select n from enough)
    from (
      select 'seen' as stage, (select seen from me) as mine, (select percentile_cont(0.5) within group (order by seen) from others)::numeric as med, 1 as ord
      union all select 'opened', (select opened from me), (select percentile_cont(0.5) within group (order by opened) from others)::numeric, 2
      union all select 'saved', (select saved from me), (select percentile_cont(0.5) within group (order by saved) from others)::numeric, 3
      union all select 'enquired', (select enquired from me), (select percentile_cont(0.5) within group (order by enquired) from others)::numeric, 4
      union all select 'booked', (select booked from me), (select percentile_cont(0.5) within group (order by booked) from others)::numeric, 5
      union all select 'viewed', (select viewed from me), (select percentile_cont(0.5) within group (order by viewed) from others)::numeric, 6
    ) v
   order by v.ord;
end;
$$;

comment on function public.listing_funnel(uuid) is
  'V-73: one listing''s last seven days (seen, opened, saved, enquired, viewing booked, viewed) beside the median of other listers'' published, non-example listings of the same type in the same city, null unless at least five exist. Answers only the listing''s lister or staff.';

revoke execute on function public.record_listing_views(uuid, uuid[], uuid) from public, anon, authenticated;
grant execute on function public.record_listing_views(uuid, uuid[], uuid) to service_role;
revoke execute on function public.listing_funnel(uuid) from public, anon;
grant execute on function public.listing_funnel(uuid) to authenticated;

/* The hourly purge. Minute 41, clear of the other hourly sweeps. The whole
   file runs as one transaction, so the job row lands with the tables. */
select cron.unschedule('vallo_purge_view_marks')
 where exists (select 1 from cron.job where jobname = 'vallo_purge_view_marks');
select cron.schedule('vallo_purge_view_marks', '41 * * * *', 'select private.purge_view_marks();');

/*
 * Read-back. The objects are as described, the social counter's
 * private.view_salts is exactly as it was, and one render is counted once,
 * read by its lister and refused to everybody else. The behaviour probe runs
 * in a subtransaction that is always rolled back.
 */
do $readback$
declare
  v_social_before text;
  v_social_after  text;
  v_vb_before     text;
  v_l      uuid;
  v_lister uuid;
  v_viewer uuid;
  v_today  date := (now() at time zone 'Africa/Lagos')::date;
  v_imp    integer;
  v_opn    integer;
  v_seen   bigint;
  v_opened bigint;
  v_rows   integer;
  v_state  text;
begin
  select coalesce(string_agg(day::text || ':' || md5(salt), ',' order by day), '') into v_social_before from private.view_salts;
  select md5(pg_get_functiondef('private.view_bucket(text)'::regprocedure)) into v_vb_before;

  if format_type((select atttypid from pg_attribute where attrelid = 'private.listing_view_salts'::regclass and attname = 'salt'), null) <> 'bytea' then
    raise exception 'V-73 read-back: private.listing_view_salts.salt is not bytea';
  end if;
  if format_type((select atttypid from pg_attribute where attrelid = 'private.view_salts'::regclass and attname = 'salt'), null) <> 'text' then
    raise exception 'V-73 read-back: private.view_salts (social) changed shape';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.listing_daily_stats'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.listing_view_marks'::regclass) then
    raise exception 'V-73 read-back: RLS is off on a V-73 table';
  end if;
  if has_table_privilege('anon', 'public.listing_daily_stats', 'select')
     or has_table_privilege('authenticated', 'public.listing_daily_stats', 'select')
     or has_table_privilege('anon', 'public.listing_view_marks', 'select')
     or has_table_privilege('authenticated', 'public.listing_view_marks', 'select')
     or has_table_privilege('authenticated', 'public.listing_daily_stats', 'insert')
     or has_table_privilege('authenticated', 'public.listing_view_marks', 'insert') then
    raise exception 'V-73 read-back: a V-73 table is granted to anon or authenticated';
  end if;
  if has_function_privilege('anon', 'public.record_listing_views(uuid,uuid[],uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.record_listing_views(uuid,uuid[],uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.record_listing_views(uuid,uuid[],uuid)', 'execute')
     or has_function_privilege('anon', 'public.listing_funnel(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.listing_funnel(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.purge_view_marks()', 'execute') then
    raise exception 'V-73 read-back: function grants are not as designed';
  end if;
  if position('private.view_salts' in pg_get_functiondef('private.purge_view_marks()'::regprocedure)) > 0
     or position('private.view_salts' in pg_get_functiondef('public.record_listing_views(uuid,uuid[],uuid)'::regprocedure)) > 0 then
    raise exception 'V-73 read-back: a V-73 function still touches the social salt table';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_purge_view_marks' and schedule = '41 * * * *') then
    raise exception 'V-73 read-back: the purge job is not scheduled';
  end if;

  begin
    select l.id, a.user_id into v_l, v_lister
      from public.listings l join public.agents a on a.id = l.agent_id
     where l.status = 'PUBLISHED' order by l.id limit 1;
    select u.id into v_viewer from auth.users u
     where u.id <> v_lister
       and not private.has_role(u.id, 'admin'::public.app_role)
       and not private.has_role(u.id, 'super_admin'::public.app_role)
     order by u.created_at limit 1;
    if v_l is null or v_viewer is null then
      raise exception 'probe_fixture_missing';
    end if;
    -- Fixture: only a real (non-example) listing is counted.
    update public.listings set is_demo = false where id = v_l;

    perform public.record_listing_views(v_viewer, array[v_l], v_l);
    perform public.record_listing_views(v_viewer, array[v_l], v_l);
    select impressions, opens into v_imp, v_opn from public.listing_daily_stats where listing_id = v_l and day = v_today;
    if v_imp is distinct from 1 or v_opn is distinct from 1 then
      raise exception 'probe: one viewer twice should count once (impressions %, opens %)', v_imp, v_opn;
    end if;
    if not exists (select 1 from private.listing_view_salts where day = v_today and octet_length(salt) = 32) then
      raise exception 'probe: no 32-byte salt for today in private.listing_view_salts';
    end if;
    if exists (select 1 from public.listing_view_marks where listing_id = v_l and viewer_hash = v_viewer::text) then
      raise exception 'probe: a view mark holds the raw viewer id';
    end if;

    -- The lister reads their funnel.
    perform set_config('request.jwt.claim.sub', v_lister::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_lister, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select sum(mine) filter (where stage = 'seen'), sum(mine) filter (where stage = 'opened'), count(*)
      into v_seen, v_opened, v_rows
      from public.listing_funnel(v_l);
    reset role;
    if v_rows <> 6 or v_seen <> 1 or v_opened <> 1 then
      raise exception 'probe: lister funnel wrong (rows %, seen %, opened %)', v_rows, v_seen, v_opened;
    end if;

    -- Somebody else gets nothing.
    perform set_config('request.jwt.claim.sub', v_viewer::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_viewer, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into v_rows from public.listing_funnel(v_l);
    reset role;
    if v_rows <> 0 then
      raise exception 'probe: a stranger read another lister''s funnel (% rows)', v_rows;
    end if;

    -- A signed-in member cannot record views directly.
    v_state := null;
    begin
      set local role authenticated;
      perform public.record_listing_views(v_viewer, array[v_l], v_l);
    exception when others then
      v_state := sqlstate;
    end;
    reset role;
    if v_state is distinct from '42501' then
      raise exception 'probe: authenticated could call record_listing_views (sqlstate %)', v_state;
    end if;

    -- The purge keeps today's rows and never touches the social salts.
    perform private.purge_view_marks();
    if not exists (select 1 from public.listing_view_marks where listing_id = v_l and day = v_today) then
      raise exception 'probe: the purge deleted today''s marks';
    end if;
    select coalesce(string_agg(day::text || ':' || md5(salt), ',' order by day), '') into v_social_after from private.view_salts;
    if v_social_after <> v_social_before then
      raise exception 'probe: private.view_salts (social) changed';
    end if;

    raise exception 'probe_passed';
  exception when others then
    if sqlerrm = 'probe_passed' then
      raise notice 'V-73 probe passed (rolled back)';
    else
      raise exception 'V-73 probe failed: %', sqlerrm;
    end if;
  end;

  select coalesce(string_agg(day::text || ':' || md5(salt), ',' order by day), '') into v_social_after from private.view_salts;
  if v_social_after <> v_social_before
     or md5(pg_get_functiondef('private.view_bucket(text)'::regprocedure)) <> v_vb_before then
    raise exception 'V-73 read-back: the social view counter changed';
  end if;
end
$readback$;
