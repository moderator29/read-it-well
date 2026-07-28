-- Engagement: reviews, messaging, saved items and searches.
--
-- Reviews are one per booking, rated 1 to 5, and readable by anyone once the
-- listing is published so the rating distribution the references show can be
-- built. A guest may only review a booking that is actually theirs. Messaging is
-- a two-party conversation between a guest and an agent, optionally about a
-- listing; only the two participants (and admins, for moderation) can see it.
-- Saved items and saved searches are strictly private to their owner.

create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  author_id  uuid not null references auth.users (id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reviews is 'One review per booking, rating 1 to 5.';

create index reviews_listing_idx on public.reviews (listing_id);

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  guest_id        uuid not null references auth.users (id) on delete cascade,
  agent_id        uuid not null references auth.users (id) on delete cascade,
  listing_id      uuid references public.listings (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (guest_id, agent_id, listing_id)
);

comment on table public.conversations is 'A two-party thread between a guest and an agent.';

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references auth.users (id) on delete cascade,
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.messages is 'A message within a conversation.';

create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.saved_items (
  user_id    uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

comment on table public.saved_items is 'A user''s saved listings.';

create table public.saved_searches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  label         text,
  query         jsonb not null default '{}'::jsonb,
  alert_enabled boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table public.saved_searches is 'A user''s saved search with an optional email alert.';

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Helper: is the current user a participant in this conversation?
create function private.in_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = target_conversation_id
      and (c.guest_id = auth.uid() or c.agent_id = auth.uid())
  );
$$;

revoke execute on function private.in_conversation(uuid) from public, anon;
grant  execute on function private.in_conversation(uuid) to authenticated;

-- Row Level Security.
alter table public.reviews        enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.saved_items    enable row level security;
alter table public.saved_searches enable row level security;

-- Reviews: readable for published listings, by the author, or by admins. A guest
-- may write a review only for a booking that is their own.
create policy reviews_select
  on public.reviews for select
  using (
    exists (select 1 from public.listings l where l.id = reviews.listing_id and l.status = 'PUBLISHED')
    or auth.uid() = author_id
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin')
  );

create policy reviews_insert_own
  on public.reviews for insert
  with check (
    auth.uid() = author_id
    and exists (select 1 from public.bookings b where b.id = reviews.booking_id and b.guest_id = auth.uid())
  );

create policy reviews_update_own
  on public.reviews for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Conversations: only the two participants, plus admins.
create policy conversations_select
  on public.conversations for select
  using (auth.uid() = guest_id or auth.uid() = agent_id
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

create policy conversations_insert
  on public.conversations for insert
  with check (auth.uid() = guest_id or auth.uid() = agent_id);

-- Messages: participants read; the sender inserts their own into a conversation
-- they belong to.
create policy messages_select
  on public.messages for select
  using (private.in_conversation(messages.conversation_id)
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

create policy messages_insert
  on public.messages for insert
  with check (auth.uid() = sender_id and private.in_conversation(messages.conversation_id));

-- Saved items and searches: strictly the owner.
create policy saved_items_own
  on public.saved_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy saved_searches_own
  on public.saved_searches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
