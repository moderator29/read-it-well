-- Around: the content layer. Posts, replies, likes, reposts, views, media.
--
-- ONE TABLE, not two. docs/SOCIAL_DESIGN.md section 5.1 argues this at length
-- and it is the single most consequential call in the whole layer: a separate
-- `replies` table would force a polymorphic (target_type, target_id) pair into
-- reactions, reposts, reports, moderation and notifications, which is five
-- foreign keys the database cannot enforce and five places to get wrong.
--
-- With one table and a self-referencing parent_id, the owner's headline
-- requirement (a user can like, repost and reply to the AI's replies) needs no
-- code at all. The AI's reply is a row in `posts`. The like path never learns
-- it is special. A quote repost is also a row, so a quote can itself be liked
-- and replied to, which a separate `echoes` table could never do.

create type public.post_kind as enum ('GIST', 'ASK', 'REPLY', 'SHOWCASE', 'SYSTEM');
create type public.post_author_kind as enum ('USER', 'BOT', 'SYSTEM');
create type public.post_mark as enum ('LIKE', 'SAVE');

create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  area_id        uuid references public.areas (id) on delete cascade,
  root_id        uuid references public.posts (id) on delete cascade,
  parent_id      uuid references public.posts (id) on delete cascade,
  depth          smallint not null default 0 check (depth between 0 and 3),
  author_id      uuid references auth.users (id) on delete set null,
  author_kind    public.post_author_kind not null default 'USER',
  kind           public.post_kind not null default 'GIST',
  body           text,
  listing_id     uuid references public.listings (id) on delete set null,
  quoted_post_id uuid references public.posts (id) on delete set null,
  payload        jsonb,
  reply_count    integer not null default 0 check (reply_count  >= 0),
  like_count     integer not null default 0 check (like_count   >= 0),
  repost_count   integer not null default 0 check (repost_count >= 0),
  view_count     integer not null default 0 check (view_count   >= 0),
  status         public.social_status not null default 'LIVE',
  hold_reason    text,
  hidden_by      uuid references auth.users (id) on delete set null,
  allow_quotes   boolean not null default true,
  created_at     timestamptz not null default now(),
  edited_at      timestamptz,
  removed_at     timestamptz,
  constraint posts_author_kind_chk check (
    (author_kind = 'USER' and author_id is not null)
    or (author_kind in ('BOT', 'SYSTEM') and author_id is null)
  ),
  constraint posts_root_chk check (
    (parent_id is null and depth = 0 and root_id is null)
    or (parent_id is not null and depth > 0 and root_id is not null)
  ),
  constraint posts_reply_kind_chk check (
    (parent_id is null and kind <> 'REPLY') or (parent_id is not null and kind = 'REPLY')
  ),
  constraint posts_showcase_chk check (kind <> 'SHOWCASE' or listing_id is not null),
  constraint posts_listing_chk check (listing_id is null or kind in ('SHOWCASE', 'SYSTEM')),
  constraint posts_content_chk check (
    coalesce(btrim(body), '') <> '' or listing_id is not null
    or quoted_post_id is not null or payload is not null
  ),
  constraint posts_body_len_chk check (body is null or length(body) <= 2000),
  constraint posts_not_self_parent_chk check (parent_id is distinct from id),
  constraint posts_not_self_quote_chk  check (quoted_post_id is distinct from id)
);

comment on table public.posts is
  'Every post and every reply, in one table. A bot reply is just a row with author_kind BOT, which is what lets it be liked, reposted and replied to by the same code paths as a person.';

create index posts_area_feed_idx on public.posts (area_id, created_at desc) where parent_id is null and status = 'LIVE';
create index posts_author_idx    on public.posts (author_id, created_at desc);
create index posts_root_idx      on public.posts (root_id, created_at);
create index posts_parent_idx    on public.posts (parent_id);
create index posts_listing_idx   on public.posts (listing_id);
create index posts_quoted_idx    on public.posts (quoted_post_id);
create index posts_hidden_by_idx on public.posts (hidden_by);
create index posts_held_idx      on public.posts (status, created_at desc) where status = 'HELD';

create table public.post_media (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts (id) on delete cascade,
  storage_path text not null,
  width        integer check (width  is null or width  > 0),
  height       integer check (height is null or height > 0),
  position     smallint not null default 0 check (position between 0 and 3),
  created_at   timestamptz not null default now(),
  unique (post_id, position)
);
create index post_media_post_idx on public.post_media (post_id);

create table public.post_reactions (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  mark       public.post_mark not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, mark)
);
comment on table public.post_reactions is
  'One row per person per post per mark. LIKE is public and counted; SAVE is private to its owner and never counted.';
create index post_reactions_user_idx on public.post_reactions (user_id, mark, created_at desc);

create table public.post_reposts (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  area_id    uuid references public.areas (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
comment on table public.post_reposts is
  'A plain repost, once per person. A quote repost is a posts row with quoted_post_id, so it can itself be liked and replied to.';
create index post_reposts_user_idx on public.post_reposts (user_id, created_at desc);
create index post_reposts_area_idx on public.post_reposts (area_id);

-- A daily rotating salt, held in private and never exposed. Yesterday's salt is
-- deleted, which is what makes yesterday's buckets permanently unlinkable to a
-- person. That is how "1,204 views" is honest without building a record of who
-- read what.
create table private.view_salts (
  day  date primary key,
  salt text not null default encode(gen_random_bytes(32), 'hex')
);

create function private.view_bucket(p_subject text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  s     text;
begin
  insert into private.view_salts (day) values (today) on conflict (day) do nothing;
  select salt into s from private.view_salts where day = today;
  delete from private.view_salts where day < today - 1;
  return encode(extensions.digest(s || ':' || p_subject, 'sha256'), 'hex');
end;
$$;

create table public.post_views (
  post_id       uuid not null references public.posts (id) on delete cascade,
  viewer_bucket text not null,
  seen_on       date not null default (now() at time zone 'Africa/Lagos')::date,
  primary key (post_id, viewer_bucket, seen_on)
);
comment on table public.post_views is
  'A view is a salted daily hash of the viewer, never a user id. The salt rotates at midnight Lagos and the previous day is deleted, so the record cannot be walked back to a person.';

create function private.bump_post_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'post_reactions' then
    if tg_op = 'INSERT' and new.mark = 'LIKE' then
      update public.posts set like_count = like_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' and old.mark = 'LIKE' then
      update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    end if;
  elsif tg_table_name = 'post_reposts' then
    if tg_op = 'INSERT' then
      update public.posts set repost_count = repost_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set repost_count = greatest(repost_count - 1, 0) where id = old.post_id;
    end if;
  elsif tg_table_name = 'post_views' then
    if tg_op = 'INSERT' then
      update public.posts set view_count = view_count + 1 where id = new.post_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger post_reactions_count after insert or delete on public.post_reactions
  for each row execute function private.bump_post_counters();
create trigger post_reposts_count   after insert or delete on public.post_reposts
  for each row execute function private.bump_post_counters();
create trigger post_views_count     after insert on public.post_views
  for each row execute function private.bump_post_counters();

create function private.bump_post_tree_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      update public.posts set reply_count = reply_count + 1 where id = new.parent_id;
    else
      if new.area_id is not null then
        update public.areas set post_count = post_count + 1 where id = new.area_id;
      end if;
    end if;
    if new.author_id is not null then
      update public.social_profiles set post_count = post_count + 1 where user_id = new.author_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.parent_id is not null then
      update public.posts set reply_count = greatest(reply_count - 1, 0) where id = old.parent_id;
    elsif old.area_id is not null then
      update public.areas set post_count = greatest(post_count - 1, 0) where id = old.area_id;
    end if;
    if old.author_id is not null then
      update public.social_profiles set post_count = greatest(post_count - 1, 0) where user_id = old.author_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger posts_tree_counters after insert or delete on public.posts
  for each row execute function private.bump_post_tree_counters();

-- Works out root_id and depth from the parent, so a client cannot claim to be
-- at depth 0 while hanging off somebody else's reply. Also enforces the depth
-- cap, because a thread deeper than three is unreadable at 390px.
create function private.place_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent record;
begin
  if new.parent_id is null then
    new.root_id := null;
    new.depth   := 0;
    return new;
  end if;

  select id, root_id, depth, area_id, status, allow_quotes into parent
    from public.posts where id = new.parent_id;

  if not found then
    raise exception 'That post is no longer there.' using errcode = 'RM010';
  end if;
  if parent.status <> 'LIVE' then
    raise exception 'You cannot reply to a post that has been removed or held.' using errcode = 'RM011';
  end if;

  new.root_id := coalesce(parent.root_id, parent.id);
  new.depth   := parent.depth + 1;
  new.area_id := coalesce(new.area_id, parent.area_id);

  if new.depth > 3 then
    raise exception 'This thread is as deep as it goes. Reply higher up so people can follow it.'
      using errcode = 'RM012';
  end if;
  return new;
end;
$$;

create trigger posts_place before insert on public.posts
  for each row execute function private.place_post();

-- A showcase must reference a PUBLISHED listing the author actually owns, so
-- unvetted inventory can never reach the social surface. Enforced here rather
-- than in an action, because an action is one code path and this is a promise.
create function private.enforce_showcase_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind <> 'SHOWCASE' then return new; end if;
  if not exists (
    select 1 from public.listings l join public.agents a on a.id = l.agent_id
     where l.id = new.listing_id and l.status = 'PUBLISHED' and a.user_id = new.author_id
  ) then
    raise exception 'You can only showcase a listing of your own that is live.' using errcode = 'RM013';
  end if;
  return new;
end;
$$;

create trigger posts_showcase before insert or update on public.posts
  for each row execute function private.enforce_showcase_listing();

-- The same classifier the message scanner uses, on posts and replies. Unlike a
-- message, a caught post is HELD before it is ever visible: the damage from a
-- public account number is done at first read, so review-after-publication is
-- the wrong default for exactly this one class of harm.
--
-- Runs on insert AND on update, because an edit window that skips the scanner
-- is a hole straight through moderation. That lesson cost a real defect in the
-- reviews table earlier today.
create function private.scan_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  reason text;
  sev    public.alert_severity;
begin
  if tg_op = 'UPDATE' then
    if new.body is not distinct from old.body then return new; end if;
  end if;
  if new.author_kind <> 'USER' then return new; end if;
  if coalesce(btrim(new.body), '') = '' then return new; end if;

  if new.body ~ '\d{10}' then
    reason := 'an account number';
    sev    := 'high';
  elsif new.body ~* keyword_pattern then
    reason := 'payment language';
    sev    := 'medium';
  end if;

  if reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (sev, 'Post held for review',
      'A post contained ' || reason || ' and was held before it became public.',
      'post', new.id::text);
  end if;
  return new;
end;
$$;

create trigger posts_scan before insert or update on public.posts
  for each row execute function private.scan_post();

create function private.can_see_post(p_post uuid)
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
  );
$$;

revoke execute on function private.can_see_post(uuid) from public;
grant  execute on function private.can_see_post(uuid) to anon, authenticated;

alter table public.posts          enable row level security;
alter table public.post_media     enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_reposts   enable row level security;
alter table public.post_views     enable row level security;

-- A live post in an open place is public. A held post is visible to its author
-- only: showing it to anyone else would make "hidden" a teaser, which is itself
-- a harassment surface.
create policy posts_select on public.posts for select
  using (
    (status = 'LIVE' and (area_id is null or exists (
        select 1 from public.areas a where a.id = posts.area_id and a.status in ('ACTIVE', 'PAUSED'))))
    or author_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

-- You post as yourself, as a person, LIVE. HELD comes from the scanner and
-- REMOVED comes from moderation; a client may set neither.
create policy posts_insert_self on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and author_kind = 'USER' and status = 'LIVE'
    and hidden_by is null and removed_at is null and edited_at is null
    and reply_count = 0 and like_count = 0 and repost_count = 0 and view_count = 0
    and (area_id is null or exists (select 1 from public.areas a where a.id = area_id and a.status = 'ACTIVE'))
  );

create policy posts_update_own on public.posts for update to authenticated
  using (author_id = (select auth.uid()) and status = 'LIVE' and created_at > now() - interval '15 minutes')
  with check (author_id = (select auth.uid()));

create policy posts_admin_write on public.posts for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

create policy post_media_select on public.post_media for select using (private.can_see_post(post_id));
create policy post_media_insert_own on public.post_media for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));
create policy post_media_delete_own on public.post_media for delete
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

-- LIKE is public so a count can be verified. SAVE is nobody's business but its
-- owner's, so the select policy hides other people's saves entirely.
create policy post_reactions_select on public.post_reactions for select
  using (mark = 'LIKE' or user_id = (select auth.uid()));
create policy post_reactions_insert_self on public.post_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_see_post(post_id));
create policy post_reactions_delete_self on public.post_reactions for delete
  using (user_id = (select auth.uid()));

create policy post_reposts_select on public.post_reposts for select using (true);
create policy post_reposts_insert_self on public.post_reposts for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_see_post(post_id));
create policy post_reposts_delete_self on public.post_reposts for delete
  using (user_id = (select auth.uid()));

-- Views are write-only from a client's point of view: you may record that a
-- post was seen and you may never read the buckets back.
create policy post_views_insert on public.post_views for insert to anon, authenticated
  with check (private.can_see_post(post_id));
create policy post_views_admin_select on public.post_views for select
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));
