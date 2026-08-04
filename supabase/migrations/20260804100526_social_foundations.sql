-- Around: the social layer's foundations.
--
-- Places, who is in them, who looks after them, and who people are.
-- Argued in docs/SOCIAL_DESIGN.md, sequenced in docs/SOCIAL_BUILD.md.
--
-- Three things this file deliberately does NOT use, each verified absent on this
-- project before a line of it was written:
--   citext  is not installed, so a handle is text stored lowercase with a unique
--           index and a charset check, not a case-insensitive type.
--   postgis is not installed, so a centre is numeric lat and lng, exactly as
--           public.listings already stores a coordinate.
--   pg_cron is not installed, so nothing here is scheduled. Everything that has
--           to happen happens in a trigger or at read time.
--
-- An area starts life PROPOSED by an ordinary person. Somebody who cannot find a
-- conversation about Gwagwalada creates one, an admin approves it, and only then
-- is it public. Moderators are applied for, approved, and can hide a post but can
-- never delete one: removal stays with admins and is always audited. Both of
-- those are owner rulings, and both are enforced here rather than in a form.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.area_kind as enum ('CITY', 'AREA', 'ESTATE', 'CAMPUS');

create type public.area_status as enum (
  'PROPOSED',  -- a person asked for it, waiting on us
  'ACTIVE',    -- approved and public
  'PAUSED',    -- temporarily closed, honestly explained
  'ARCHIVED',
  'REJECTED'
);

create type public.area_role as enum (
  'MEMBER',    -- joined
  'RESIDENT',  -- earned: a completed stay, an invite from a resident, or presence over time
  'MODERATOR'  -- applied for and approved. May hide, may never remove.
);

create type public.area_residency_source as enum ('STAY', 'INVITE', 'PRESENCE', 'ADMIN');

create type public.moderator_application_status as enum
  ('PENDING', 'APPROVED', 'DECLINED', 'WITHDRAWN');

-- One status for every piece of social content, profiles included. HELD means the
-- scanner caught it on the way in and only its author can see it.
create type public.social_status as enum ('LIVE', 'HELD', 'REMOVED');

-- ---------------------------------------------------------------------------
-- areas
-- ---------------------------------------------------------------------------

create table public.areas (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind          public.area_kind not null default 'AREA',
  name          text not null check (length(btrim(name)) between 2 and 60),
  state_code    text not null references public.states (code),
  city          text not null check (length(btrim(city)) between 2 and 60),
  area          text check (area is null or length(btrim(area)) between 2 and 60),
  blurb         text check (blurb is null or length(blurb) <= 200),
  centre_lat    numeric check (centre_lat is null or centre_lat between -90 and 90),
  centre_lng    numeric check (centre_lng is null or centre_lng between -180 and 180),
  status        public.area_status not null default 'PROPOSED',
  -- A new area asks for a verified phone and holds a brand new account's first
  -- post. One moderator being enough should not be a matter of luck.
  slow_mode     boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null,
  decided_by    uuid references auth.users (id) on delete set null,
  decided_at    timestamptz,
  decision_note text,
  member_count  integer not null default 0 check (member_count >= 0),
  post_count    integer not null default 0 check (post_count >= 0),
  opened_at     timestamptz,
  created_at    timestamptz not null default now(),
  constraint areas_decided_chk check (
    (status in ('PROPOSED') and decided_at is null)
    or (status <> 'PROPOSED')
  ),
  constraint areas_opened_chk check (status <> 'ACTIVE' or opened_at is not null)
);

comment on table public.areas is
  'A place people talk about. Proposed by anyone, made public only by an admin.';

create index areas_status_idx     on public.areas (status);
create index areas_state_idx      on public.areas (state_code);
create index areas_created_by_idx on public.areas (created_by);
create index areas_decided_by_idx on public.areas (decided_by);
create index areas_city_idx       on public.areas (lower(city));

-- ---------------------------------------------------------------------------
-- area_members
-- ---------------------------------------------------------------------------

create table public.area_members (
  area_id               uuid not null references public.areas (id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  role                  public.area_role not null default 'MEMBER',
  residency_source      public.area_residency_source,
  residency_verified_at timestamptz,
  -- Trust earned by agreeing with reality, decayed by being contradicted.
  -- Never below 0.2: a wrong report is a mistake, not a ban.
  utility_weight        numeric not null default 1.0
                          check (utility_weight between 0.2 and 1.0),
  notify_utility        boolean not null default true,
  joined_at             timestamptz not null default now(),
  primary key (area_id, user_id),
  constraint area_members_residency_chk check (
    (role = 'MEMBER' and residency_verified_at is null)
    or (role in ('RESIDENT', 'MODERATOR') and residency_verified_at is not null
        and residency_source is not null)
  )
);

comment on table public.area_members is
  'Membership of an area. RESIDENT is earned from events we already record, never claimed.';

create index area_members_user_idx on public.area_members (user_id);
create index area_members_mods_idx on public.area_members (area_id) where role = 'MODERATOR';

-- ---------------------------------------------------------------------------
-- area_moderator_applications
-- ---------------------------------------------------------------------------

create table public.area_moderator_applications (
  id            uuid primary key default gen_random_uuid(),
  area_id       uuid not null references public.areas (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  reason        text not null check (length(btrim(reason)) between 40 and 600),
  status        public.moderator_application_status not null default 'PENDING',
  decided_by    uuid references auth.users (id) on delete set null,
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz not null default now()
);

comment on table public.area_moderator_applications is
  'A member asking to look after an area. Approval grants MODERATOR, which may hide a post and may never remove one.';

-- One live application per person per area. A declined one may be re-applied for.
create unique index area_mod_apps_one_open_idx
  on public.area_moderator_applications (area_id, user_id)
  where status = 'PENDING';
create index area_mod_apps_status_idx     on public.area_moderator_applications (status, created_at);
create index area_mod_apps_user_idx       on public.area_moderator_applications (user_id);
create index area_mod_apps_decided_by_idx on public.area_moderator_applications (decided_by);

-- ---------------------------------------------------------------------------
-- social_profiles
-- ---------------------------------------------------------------------------

create table public.social_profiles (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  handle           text not null unique check (handle ~ '^[a-z][a-z0-9_]{2,19}$'),
  bio              text check (bio is null or length(bio) <= 240),
  bio_status       public.social_status not null default 'LIVE',
  pronouns         text check (pronouns is null or length(pronouns) <= 24),
  link             text check (link is null or length(link) <= 120),
  banner_path      text,
  home_area_id     uuid references public.areas (id) on delete set null,
  like_count       integer not null default 0 check (like_count >= 0),
  correct_count    integer not null default 0 check (correct_count >= 0),
  repost_count     integer not null default 0 check (repost_count >= 0),
  contact_policy   text not null default 'REQUEST' check (contact_policy in ('REQUEST', 'OPEN')),
  pidgin_ok        boolean not null default false,
  handle_claimed_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.social_profiles is
  'Public social identity. Extends public.profiles, never replaces it. A bio passes the fraud scanner on write.';

create index social_profiles_home_idx on public.social_profiles (home_area_id);

-- Handles nobody may claim. Anything resembling us is refused in the database,
-- not in a form, because a form is not a security boundary.
create table private.reserved_handles (handle text primary key);

insert into private.reserved_handles (handle) values
  ('admin'), ('administrator'), ('support'), ('help'), ('helpdesk'), ('official'),
  ('staff'), ('team'), ('mod'), ('mods'), ('moderator'), ('root'), ('system'),
  ('api'), ('www'), ('app'), ('about'), ('terms'), ('privacy'), ('security'),
  ('billing'), ('payments'), ('payment'), ('wallet'), ('bot'), ('assistant'),
  ('everyone'), ('here'), ('all'), ('null'), ('undefined'), ('anonymous');

-- A released handle is locked before anyone else may take it, so a known handle
-- cannot be sniped the hour it is dropped.
create table private.released_handles (
  handle      text primary key,
  released_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers. Read helpers are granted to anon deliberately: this codebase has
-- already had one launch-blocking outage from an RLS helper anon could not run.
-- ---------------------------------------------------------------------------

create function private.area_visible(p_area uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.areas a
    where a.id = p_area
      and (
        a.status in ('ACTIVE', 'PAUSED')
        or a.created_by = (select auth.uid())
        or private.has_role((select auth.uid()), 'admin')
        or private.has_role((select auth.uid()), 'super_admin')
      )
  );
$$;

create function private.is_area_member(p_area uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.area_members m
    where m.area_id = p_area and m.user_id = p_user
  );
$$;

create function private.is_area_moderator(p_area uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.area_members m
    where m.area_id = p_area and m.user_id = p_user and m.role = 'MODERATOR'
  );
$$;

-- has_role is authenticated-only by design, so area_visible has to be too. The
-- anonymous read path never needs it: the policy below short-circuits on ACTIVE.
revoke execute on function private.area_visible(uuid) from public;
grant  execute on function private.area_visible(uuid) to authenticated;

revoke execute on function private.is_area_member(uuid, uuid) from public;
grant  execute on function private.is_area_member(uuid, uuid) to anon, authenticated;

revoke execute on function private.is_area_moderator(uuid, uuid) from public;
grant  execute on function private.is_area_moderator(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Handle validation. Custom SQLSTATEs so a server action can answer with the
-- one true sentence rather than a generic failure.
-- ---------------------------------------------------------------------------

create function private.validate_social_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.handle := lower(btrim(new.handle));

  if new.handle !~ '^[a-z][a-z0-9_]{2,19}$' then
    raise exception 'That handle will not work. Use 3 to 20 characters: letters, numbers and underscores, starting with a letter.'
      using errcode = 'RM001';
  end if;

  if exists (select 1 from private.reserved_handles r where r.handle = new.handle) then
    raise exception 'That handle is reserved. Please choose another one.'
      using errcode = 'RM002';
  end if;

  -- Nobody impersonates the platform, and nobody gets close enough to try.
  if new.handle like '%rentme%' or new.handle like '%naijafinds%' then
    raise exception 'That handle is too close to an official RentMe name. Please choose another one.'
      using errcode = 'RM002';
  end if;

  if (tg_op = 'INSERT' or new.handle is distinct from old.handle) then
    if exists (
      select 1 from private.released_handles rh
      where rh.handle = new.handle and rh.released_at > now() - interval '90 days'
    ) then
      raise exception 'That handle was given up recently and is not available yet.'
        using errcode = 'RM003';
    end if;
    new.handle_claimed_at := now();
    if tg_op = 'UPDATE' then
      insert into private.released_handles (handle, released_at)
      values (old.handle, now())
      on conflict (handle) do update set released_at = excluded.released_at;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger social_profiles_validate_handle
  before insert or update on public.social_profiles
  for each row execute function private.validate_social_handle();

-- ---------------------------------------------------------------------------
-- The fraud scanner, extended to bios. Same patterns the message scanner uses,
-- because off-platform payment steering is the scam wherever it is typed. A bio
-- is the oldest place in the world to hide a phone number.
--
-- Unlike messages, a caught bio is HELD rather than flagged-and-published: the
-- damage from a public account number is done at first read.
-- ---------------------------------------------------------------------------

create function private.scan_social_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  haystack        text;
  reason          text;
begin
  haystack := coalesce(new.bio, '') || ' ' || coalesce(new.link, '');

  if haystack ~ '\d{10}' then
    reason := 'account number';
  elsif haystack ~* keyword_pattern then
    reason := 'payment language';
  end if;

  if reason is not null then
    new.bio_status := 'HELD';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      case when reason = 'account number' then 'high' else 'medium' end,
      'Social bio held for review',
      'A profile bio or link contained ' || reason || ' and was held before it became public.',
      'social_profile',
      new.user_id::text
    );
  elsif tg_op = 'UPDATE' and (new.bio is distinct from old.bio or new.link is distinct from old.link) then
    -- An edit that is clean releases the hold. The scanner re-runs on every edit,
    -- because an edit window that skips the scanner is a hole straight through it.
    new.bio_status := 'LIVE';
  end if;

  return new;
end;
$$;

create trigger social_profiles_scan
  before insert or update on public.social_profiles
  for each row execute function private.scan_social_profile();

-- ---------------------------------------------------------------------------
-- Counters. One trigger, so a read is never a fan-out of counts.
-- ---------------------------------------------------------------------------

create function private.bump_area_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.areas set member_count = member_count + 1 where id = new.area_id;
  elsif tg_op = 'DELETE' then
    update public.areas set member_count = greatest(member_count - 1, 0) where id = old.area_id;
  end if;
  return null;
end;
$$;

create trigger area_members_count
  after insert or delete on public.area_members
  for each row execute function private.bump_area_member_count();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.areas                       enable row level security;
alter table public.area_members                enable row level security;
alter table public.area_moderator_applications enable row level security;
alter table public.social_profiles             enable row level security;

-- areas: anyone sees an open place; you see your own proposal; admins see all.
create policy areas_select
  on public.areas for select
  using (
    status in ('ACTIVE', 'PAUSED')
    or created_by = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

-- Anyone signed in may propose a place. They may only ever propose: the status
-- is pinned to PROPOSED here so no client can insert itself an ACTIVE area.
create policy areas_insert_proposal
  on public.areas for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'PROPOSED'
    and decided_by is null
    and decided_at is null
    and opened_at is null
    and member_count = 0
    and post_count = 0
  );

create policy areas_update_admin
  on public.areas for update
  using (private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin')
           or private.has_role((select auth.uid()), 'super_admin'));

-- area_members: visible wherever the area is, so a moderator's tag can render
-- to anyone reading the place.
create policy area_members_select
  on public.area_members for select
  using (
    exists (
      select 1 from public.areas a
      where a.id = area_members.area_id and a.status in ('ACTIVE', 'PAUSED')
    )
    or user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

-- Join yourself, as a plain member, to an open place. Role is pinned so nobody
-- can insert themselves a moderator badge.
create policy area_members_insert_self
  on public.area_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'MEMBER'
    and residency_verified_at is null
    and residency_source is null
    and utility_weight = 1.0
    and exists (select 1 from public.areas a where a.id = area_id and a.status = 'ACTIVE')
  );

-- Leave whenever you like.
create policy area_members_delete_self
  on public.area_members for delete
  using (user_id = (select auth.uid()));

-- Your own notification preference is yours; role and weight are not, so this
-- policy is deliberately narrow and the service role does everything else.
create policy area_members_update_self_prefs
  on public.area_members for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and role = (select m.role from public.area_members m
                where m.area_id = area_members.area_id and m.user_id = (select auth.uid()))
    and utility_weight = (select m.utility_weight from public.area_members m
                where m.area_id = area_members.area_id and m.user_id = (select auth.uid()))
  );

create policy area_members_admin_write
  on public.area_members for all
  using (private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin')
           or private.has_role((select auth.uid()), 'super_admin'));

-- Moderator applications: yours and the admins'.
create policy area_mod_apps_select
  on public.area_moderator_applications for select
  using (
    user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

create policy area_mod_apps_insert_self
  on public.area_moderator_applications for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'PENDING'
    and decided_by is null
    and decided_at is null
    -- You look after a place you are actually in.
    and private.is_area_member(area_id, (select auth.uid()))
  );

-- You may withdraw your own application and nothing else about it.
create policy area_mod_apps_withdraw_self
  on public.area_moderator_applications for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'PENDING')
  with check (user_id = (select auth.uid()) and status = 'WITHDRAWN');

create policy area_mod_apps_admin_write
  on public.area_moderator_applications for all
  using (private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin')
           or private.has_role((select auth.uid()), 'super_admin'));

-- Profiles are public by definition, except a bio the scanner is holding.
create policy social_profiles_select
  on public.social_profiles for select
  using (true);

create policy social_profiles_insert_self
  on public.social_profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy social_profiles_update_self
  on public.social_profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No delete policy. A handle is released through the account deletion path, not
-- by a client dropping the row and freeing the name instantly.
