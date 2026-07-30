-- Support tickets: honest escalation lands somewhere real.
--
-- When SupportChat cannot answer it files a ticket with a human-readable
-- reference, carrying only the name and email the user offered. Signed-in
-- users see their tickets and the running thread; admins work the queue.
-- Anonymous escalations are filed by the service layer, so tickets have no
-- anon insert policy. An admin reply notifies the ticket owner through the
-- notifications fan-out.

create type public.support_ticket_status as enum ('open', 'pending', 'resolved', 'closed');

create table public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  reference  text not null unique,
  user_id    uuid references auth.users (id) on delete set null,
  name       text not null,
  email      text not null,
  topic      text,
  body       text not null,
  status     public.support_ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.support_tickets is
  'A support escalation. reference is the human-readable NF-SUP code.';

create index support_tickets_user_idx   on public.support_tickets (user_id);
create index support_tickets_status_idx on public.support_tickets (status, created_at desc);

create table public.support_ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets (id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  sender_id   uuid references auth.users (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

comment on table public.support_ticket_messages is
  'The running thread on a support ticket.';

create index support_ticket_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, created_at);

create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- An admin reply tells the ticket owner, on the platform they already use.
create function private.notify_support_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_user uuid;
  ticket_ref text;
begin
  if new.sender_role = 'admin' then
    select t.user_id, t.reference into owner_user, ticket_ref
    from public.support_tickets t
    where t.id = new.ticket_id;

    perform private.notify(owner_user, 'support', 'Support replied',
      'Ticket ' || ticket_ref || ' has a new reply.', '/settings');
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_support_reply() from public, anon, authenticated;

create trigger support_ticket_messages_notify_after_insert
  after insert on public.support_ticket_messages
  for each row execute function private.notify_support_reply();

-- Row Level Security.
alter table public.support_tickets         enable row level security;
alter table public.support_ticket_messages enable row level security;

create policy support_tickets_select_own
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy support_tickets_insert_own
  on public.support_tickets for insert
  with check (auth.uid() = user_id and status = 'open');

create policy support_tickets_admin_all
  on public.support_tickets for all
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

create policy support_ticket_messages_select
  on public.support_ticket_messages for select
  using (
    exists (select 1 from public.support_tickets t
            where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid())
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin')
  );

create policy support_ticket_messages_insert_own
  on public.support_ticket_messages for insert
  with check (
    sender_role = 'user'
    and sender_id = auth.uid()
    and exists (select 1 from public.support_tickets t
                where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid())
  );

create policy support_ticket_messages_insert_admin
  on public.support_ticket_messages for insert
  with check (
    sender_role = 'admin'
    and (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  );
