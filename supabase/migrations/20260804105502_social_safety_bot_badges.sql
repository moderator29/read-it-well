-- Around: safety, the AI, and standing.
--
-- Safety ships with the content rather than after it. A social layer without
-- blocking is an unbounded liability from the first post, and retrofitting
-- bidirectional invisibility into a feed query that was written without it is
-- how a block ends up leaking through a reply count.

create table public.blocks (
  user_id    uuid not null references auth.users (id) on delete cascade,
  other_id   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_id),
  constraint blocks_not_self_chk check (user_id <> other_id)
);
comment on table public.blocks is
  'Bidirectional invisibility. If either side has blocked the other, neither sees the other anywhere.';
create index blocks_other_idx on public.blocks (other_id);

create table public.mutes (
  user_id     uuid not null references auth.users (id) on delete cascade,
  target_kind text not null check (target_kind in ('USER', 'POST', 'AREA')),
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_kind, target_id)
);
comment on table public.mutes is
  'One way silence. A mute hides their words from you; it tells them nothing and does not hide you from them.';

create or replace function private.blocked_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_other is not null and exists (
    select 1 from public.blocks b
     where (b.user_id = (select auth.uid()) and b.other_id = p_other)
        or (b.other_id = (select auth.uid()) and b.user_id = p_other)
  );
$$;

revoke execute on function private.blocked_with(uuid) from public;
grant  execute on function private.blocked_with(uuid) to anon, authenticated;

create or replace function private.can_see_post(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.posts p left join public.areas a on a.id = p.area_id
     where p.id = p_post
       and (p.status = 'LIVE' or p.author_id = (select auth.uid()))
       and (p.area_id is null or a.status in ('ACTIVE', 'PAUSED'))
       and not private.blocked_with(p.author_id)
  );
$$;

-- The feed policy has to carry the block too, or a blocked author's posts stay
-- visible in every list read and only vanish on a single post page.
drop policy posts_select on public.posts;

create policy posts_select on public.posts for select
  using (
    (
      (status = 'LIVE'
        and (area_id is null or exists (
          select 1 from public.areas a where a.id = posts.area_id and a.status in ('ACTIVE', 'PAUSED')))
        and not private.blocked_with(author_id))
      or author_id = (select auth.uid())
    )
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

alter table public.blocks enable row level security;
alter table public.mutes  enable row level security;

-- Your own block list is yours. Nobody may read who blocked them, because that
-- turns a quiet safety tool into a notification.
create policy blocks_select_own on public.blocks for select using (user_id = (select auth.uid()));
create policy blocks_insert_own on public.blocks for insert to authenticated with check (user_id = (select auth.uid()));
create policy blocks_delete_own on public.blocks for delete using (user_id = (select auth.uid()));

create policy mutes_select_own on public.mutes for select using (user_id = (select auth.uid()));
create policy mutes_insert_own on public.mutes for insert to authenticated with check (user_id = (select auth.uid()));
create policy mutes_delete_own on public.mutes for delete using (user_id = (select auth.uid()));

create table public.bot_invocations (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid references public.posts (id) on delete set null,
  reply_post_id  uuid references public.posts (id) on delete set null,
  area_id        uuid references public.areas (id) on delete set null,
  user_id        uuid references auth.users (id) on delete set null,
  prompt         text not null,
  answer         text,
  input_tokens   integer not null default 0 check (input_tokens  >= 0),
  output_tokens  integer not null default 0 check (output_tokens >= 0),
  -- Integer kobo, like every other amount in this platform. Never a float.
  cost_minor     bigint  not null default 0 check (cost_minor >= 0),
  refused_reason text,
  created_at     timestamptz not null default now()
);
comment on table public.bot_invocations is
  'Every summon of the AI, answered or refused, with its token count and its cost in kobo. An open summon surface is an open spending surface, and this table is what the monthly ceiling reads.';

create index bot_invocations_user_idx  on public.bot_invocations (user_id, created_at desc);
create index bot_invocations_area_idx  on public.bot_invocations (area_id, created_at desc);
create index bot_invocations_post_idx  on public.bot_invocations (post_id);
create index bot_invocations_reply_idx on public.bot_invocations (reply_post_id);
create index bot_invocations_month_idx on public.bot_invocations (created_at);

alter table public.bot_invocations enable row level security;

create policy bot_invocations_select_own on public.bot_invocations for select
  using (
    user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

-- The month's spend so far, in kobo. One place, so the action and the console
-- can never disagree about whether the ceiling has been reached.
create function private.bot_spend_this_month()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_minor), 0)::bigint from public.bot_invocations
   where created_at >= date_trunc('month', now() at time zone 'Africa/Lagos');
$$;

create type public.badge_audience as enum ('AGENT', 'MEMBER');

create table public.badges (
  code        text primary key,
  name        text not null,
  description text not null,
  audience    public.badge_audience not null,
  object_name text not null,
  tier        smallint not null default 1 check (tier between 1 and 5),
  manual_only boolean not null default false,
  created_at  timestamptz not null default now()
);
comment on table public.badges is
  'Badge definitions. object_name is a BrandIcon from the commissioned pack, so a new badge needs no new artwork.';

create table public.user_badges (
  user_id     uuid not null references auth.users (id) on delete cascade,
  badge_code  text not null references public.badges (code) on delete cascade,
  granted_at  timestamptz not null default now(),
  granted_by  uuid references auth.users (id) on delete set null,
  reason      text,
  evidence    jsonb,
  revoked_at  timestamptz,
  revoked_by  uuid references auth.users (id) on delete set null,
  primary key (user_id, badge_code)
);
comment on table public.user_badges is
  'granted_by null means earned from an event we recorded. Non-null means an admin granted it by hand, and the UI shows that difference rather than hiding it.';

create index user_badges_badge_idx      on public.user_badges (badge_code);
create index user_badges_granted_by_idx on public.user_badges (granted_by);
create index user_badges_revoked_by_idx on public.user_badges (revoked_by);
create index user_badges_live_idx       on public.user_badges (user_id) where revoked_at is null;

alter table public.badges      enable row level security;
alter table public.user_badges enable row level security;

create policy badges_select on public.badges for select using (true);
create policy badges_admin_write on public.badges for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

-- A live badge is public, because a badge nobody can see makes no claim. A
-- revoked one is visible only to its holder and to staff: leaving a revocation
-- on public display would be a punishment we never agreed to hand out.
create policy user_badges_select on public.user_badges for select
  using (
    revoked_at is null
    or user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );
create policy user_badges_admin_write on public.user_badges for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

insert into public.badges (code, name, description, audience, object_name, tier, manual_only) values
  ('verified_agent',    'Verified Agent',    'Identity and payout account verified, application approved.', 'AGENT',  'shield-check',   1, false),
  ('first_listing',     'First Listing Live','Their first listing reached published.',                      'AGENT',  'keys-home',      1, false),
  ('fast_responder',    'Fast Responder',    'Median first reply under an hour across twenty conversations.','AGENT', 'clock-check',    2, false),
  ('ten_stays',         'Ten Stays Hosted',  'Ten bookings confirmed and completed.',                       'AGENT',  'calendar-check', 2, false),
  ('estate_specialist', 'Estate Specialist', 'Five or more published listings in one area.',                'AGENT',  'map-spot',       3, false),
  ('photo_pro',         'Photo Pro',         'Ten listings through the quality gate with no rejections.',   'AGENT',  'camera',         3, false),
  ('rentme_elite',      'RentMe Elite',      'Every agent badge, and no open trust flag for ninety days.',  'AGENT',  'house-sparkle',  5, false),
  ('verified_member',   'Verified Member',   'Email and phone confirmed.',                                  'MEMBER', 'user-verified',  1, false),
  ('first_stay',        'First Stay',        'Their first completed booking.',                              'MEMBER', 'luggage-check',  1, false),
  ('neighbour',         'Neighbour',         'Joined a place and became a recognised part of it.',          'MEMBER', 'home-search',    2, false),
  ('local_guide',       'Local Guide',       'Known for knowing one place well.',                           'MEMBER', 'map-route',      3, false),
  ('honest_reviewer',   'Honest Reviewer',   'Five reviews written after real completed stays.',            'MEMBER', 'reviews',        2, false),
  ('guardian',          'Guardian',          'Three reports upheld by a moderator.',                        'MEMBER', 'shield-home',    3, false),
  ('year_one',          'Year One',          'One year since joining RentMe.',                              'MEMBER', 'gift-star',      1, false)
on conflict (code) do nothing;
