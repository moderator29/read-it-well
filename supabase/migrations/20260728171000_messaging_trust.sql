-- Messaging trust: attachments, fraud flags and inspection confirmations.
--
-- Extends the engagement messaging tables. Attachments let agents reply with
-- images as well as text. Every new message passes through a safety scan that
-- records risky payment talk (a 10-digit run that looks like a bank account
-- number, or payment keywords) for admin review; the flag table is invisible
-- to clients, so a bad actor cannot probe what trips the scanner. Inspection
-- confirmations record, inside the conversation, that a guest has inspected
-- the property, backing the platform rule that payment should only happen
-- after inspection and verification.

create type public.message_flag_reason as enum ('account_number', 'payment_keyword');
create type public.message_flag_status as enum ('open', 'reviewed');

create table public.message_attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references public.messages (id) on delete cascade,
  storage_path text not null,
  width        integer,
  height       integer,
  created_at   timestamptz not null default now()
);

comment on table public.message_attachments is 'An image attached to a message.';

create index message_attachments_message_idx on public.message_attachments (message_id);

create table public.message_flags (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  reason     public.message_flag_reason not null,
  matched    text not null,
  status     public.message_flag_status not null default 'open',
  created_at timestamptz not null default now()
);

comment on table public.message_flags is 'Messages the safety scan flagged for admin review.';

create index message_flags_status_idx on public.message_flags (status);

create table public.inspection_confirmations (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  listing_id      uuid not null references public.listings (id) on delete cascade,
  confirmed_at    timestamptz not null default now(),
  unique (conversation_id, user_id)
);

comment on table public.inspection_confirmations is 'A guest''s in-chat confirmation that they have inspected the property.';

-- Safety scan. Runs after every message insert and records a flag when the
-- body contains a 10-digit run or payment talk. The function lives in private
-- and runs as definer: clients have no policy on message_flags at all, so the
-- write can only ever come from this trigger. EXECUTE is revoked from every
-- client role so nobody can call it directly (matching the hardening applied
-- to the other definer functions).
create function private.scan_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
begin
  if new.body ~ '\d{10}' then
    insert into public.message_flags (message_id, reason, matched)
    values (new.id, 'account_number', substring(new.body from '\d{10}'));
  end if;

  if new.body ~* keyword_pattern then
    insert into public.message_flags (message_id, reason, matched)
    values (new.id, 'payment_keyword', substring(lower(new.body) from keyword_pattern));
  end if;

  return new;
end;
$$;

revoke execute on function private.scan_message() from public, anon, authenticated;

create trigger messages_scan_after_insert
  after insert on public.messages
  for each row execute function private.scan_message();

-- Row Level Security.
alter table public.message_attachments      enable row level security;
alter table public.message_flags            enable row level security;
alter table public.inspection_confirmations enable row level security;

-- Attachments: conversation participants read; the sender attaches only to
-- their own message in a conversation they belong to.
create policy message_attachments_select
  on public.message_attachments for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_attachments.message_id
        and private.in_conversation(m.conversation_id)
    )
  );

create policy message_attachments_insert
  on public.message_attachments for insert
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
        and private.in_conversation(m.conversation_id)
    )
  );

-- Flags: admin eyes only. No insert, update or delete policy for clients;
-- rows come solely from the scan trigger and admins move status to reviewed.
create policy message_flags_admin_select
  on public.message_flags for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

create policy message_flags_admin_update
  on public.message_flags for update
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Inspection confirmations: a participant records their own; both
-- participants and admins can read.
create policy inspection_confirmations_insert_own
  on public.inspection_confirmations for insert
  with check (
    auth.uid() = user_id
    and private.in_conversation(inspection_confirmations.conversation_id)
  );

create policy inspection_confirmations_select
  on public.inspection_confirmations for select
  using (private.in_conversation(inspection_confirmations.conversation_id)
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));
