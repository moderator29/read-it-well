-- Assistant threads: durable homes for AI conversations.
--
-- The assistant UI keeps threads in localStorage until a user signs in; once
-- authenticated, threads persist here so a conversation survives the browser.
-- Strictly owner-private: no admin read policy, because assistant chats are
-- personal search intent, not moderation surface. The service layer appends
-- assistant turns with the service role after streaming completes.

create table public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_conversations is
  'An assistant thread owned by one user. Owner-private.';

create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

comment on table public.ai_messages is 'One turn in an assistant thread.';

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

-- Row Level Security.
alter table public.ai_conversations enable row level security;
alter table public.ai_messages      enable row level security;

create policy ai_conversations_own
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy ai_messages_own
  on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations c
                 where c.id = ai_messages.conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c
                      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()));
