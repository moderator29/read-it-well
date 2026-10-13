alter table public.messages add column if not exists reply_to_id uuid references public.messages (id) on delete set null;
alter table public.messages add column if not exists forwarded boolean not null default false;
alter table public.messages add column if not exists deleted_for_everyone_at timestamptz;
create index if not exists messages_reply_to_idx on public.messages (reply_to_id);
