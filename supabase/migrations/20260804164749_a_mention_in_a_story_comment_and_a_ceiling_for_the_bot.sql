-- Two halves of the assistant story, and one correction.
--
-- THE CORRECTION FIRST. Agent 2 reported that a mention notifies nobody. That
-- is true of a story comment and NOT true of a post: `private.fan_out_post` has
-- scanned post bodies for `@handle` and notified since the notifications
-- migration, capped at five, block aware and mute aware, and it was probed. So
-- the gap was narrower than reported and real: mention somebody under a story
-- and they were never told, while mentioning them in a post told them at once.
-- One layer answering the same question two different ways is worse than either
-- answer, because nobody can learn the rule.
--
-- THE CEILING. The AI summon cannot be built safely without one. `@rentme` in a
-- body is an open surface pointed at a metered API: anybody who can post can
-- spend our money, and the only thing between a bored afternoon and a bill is a
-- number nobody had written down. `bot_invocations` already records `cost_minor`
-- per call; what was missing was something to compare it against and a switch
-- that closes when it is passed. The ceiling is not a nicety attached to the
-- feature. It is the gate.

create table if not exists public.bot_settings (
  id                    boolean primary key default true check (id),
  enabled               boolean not null default false,
  monthly_ceiling_minor bigint  not null default 5000000 check (monthly_ceiling_minor >= 0),
  daily_ceiling_minor   bigint  not null default 500000  check (daily_ceiling_minor >= 0),
  per_person_daily      integer not null default 10 check (per_person_daily >= 0),
  model                 text    not null default 'claude-haiku-4-5-20251001',
  updated_at            timestamptz not null default now()
);

comment on table public.bot_settings is
  'One row, enforced by the primary key. What the assistant is allowed to cost. Integer kobo like every other amount on this platform.';
comment on column public.bot_settings.monthly_ceiling_minor is
  'Kobo. Default is fifty thousand naira a month. When month to date passes this, private.bot_may_run() answers false and the summon says so out loud rather than failing quietly.';

insert into public.bot_settings (id) values (true) on conflict (id) do nothing;

alter table public.bot_settings enable row level security;

drop policy if exists bot_settings_admin on public.bot_settings;
create policy bot_settings_admin on public.bot_settings for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

/*
 * Three gates, and the order is the point: the cheapest question first, so a
 * disabled bot costs one boolean read rather than two aggregates.
 *
 * Returns a reason rather than a bare false, because "the assistant is quiet
 * right now" and "you have asked it ten times today" are different sentences to
 * the person who tapped, and a single false would make the surface guess.
 */
create or replace function private.bot_may_run(p_user uuid)
returns text language plpgsql stable security definer set search_path = public, pg_temp as $fn$
declare
  s public.bot_settings;
  month_to_date bigint;
  day_to_date   bigint;
  mine integer;
begin
  select * into s from public.bot_settings where id;
  if s is null or not s.enabled then return 'off'; end if;

  select coalesce(sum(cost_minor), 0) into month_to_date
    from public.bot_invocations
   where created_at >= date_trunc('month', now() at time zone 'Africa/Lagos');
  if month_to_date >= s.monthly_ceiling_minor then return 'month'; end if;

  select coalesce(sum(cost_minor), 0) into day_to_date
    from public.bot_invocations
   where created_at >= (now() at time zone 'Africa/Lagos')::date;
  if day_to_date >= s.daily_ceiling_minor then return 'day'; end if;

  select count(*) into mine
    from public.bot_invocations
   where user_id = p_user
     and created_at >= (now() at time zone 'Africa/Lagos')::date;
  if mine >= s.per_person_daily then return 'person'; end if;

  return 'ok';
end;
$fn$;

comment on function private.bot_may_run(uuid) is
  'Answers ok, off, month, day or person. A reason rather than a boolean, because those are four different sentences to somebody who just tapped.';

revoke execute on function private.bot_may_run(uuid) from public, anon, authenticated;

-- A mention under a story now behaves exactly like a mention in a post.
create or replace function private.notify_story_event()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  s public.stories; who text; parent uuid; named text; named_id uuid; sent integer := 0;
begin
  if tg_table_name = 'story_reactions' then
    if new.mark <> 'LIKE' then return new; end if;
    select * into s from public.stories where id = new.story_id;
    if s.author_id is null or s.status <> 'LIVE' then return new; end if;
    who := private.social_handle(new.user_id);
    perform private.notify_social(s.author_id, new.user_id, 'Somebody liked your story',
      coalesce('@' || who, 'Somebody') || ' liked ' || left(s.headline, 100),
      '/stories/' || s.id);
    return new;
  end if;

  if new.status <> 'LIVE' then return new; end if;

  select * into s from public.stories where id = new.story_id;
  who := private.social_handle(new.author_id);

  perform private.notify_social(s.author_id, new.author_id, 'New comment on your story',
    coalesce('@' || who, 'Somebody') || ' said: ' || left(new.body, 120),
    '/stories/' || s.id);

  if new.parent_id is not null then
    select author_id into parent from public.story_comments where id = new.parent_id;
    if parent is distinct from s.author_id then
      perform private.notify_social(parent, new.author_id, 'New reply',
        coalesce('@' || who, 'Somebody') || ' replied: ' || left(new.body, 120),
        '/stories/' || s.id);
    end if;
  end if;

  /* The same handle pattern and the same cap of five, for the same reason: a
     body naming twenty people is a broadcast, not a conversation. */
  for named in
    select distinct lower(tok[1])
      from regexp_matches(coalesce(new.body, ''), '@([a-z][a-z0-9_]{2,19})', 'gi') as m(tok)
  loop
    exit when sent >= 5;
    select user_id into named_id from public.social_profiles where handle = named;
    if named_id is null or named_id = parent or named_id = s.author_id then continue; end if;

    perform private.notify_social(named_id, new.author_id, 'You were mentioned',
      coalesce('@' || who, 'Somebody') || ' mentioned you: ' || left(new.body, 120),
      '/stories/' || s.id);
    sent := sent + 1;
  end loop;

  return new;
end;
$fn$;

revoke execute on function private.notify_story_event() from public, anon, authenticated;
