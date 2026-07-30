-- Notifications: one table, database-side fan-out, realtime delivery.
--
-- Every meaningful event lands here as one row per recipient: bookings tell
-- the host and the guest, messages tell the other participant, wallet
-- movements tell the wallet owner. Fan-out happens in AFTER triggers through a
-- single private.notify writer, so a notification can never be forgotten by an
-- application code path. Clients read their own rows, may mark them read and
-- delete them, and never insert: rows come only from triggers and the service
-- role. The table joins the supabase_realtime publication so unread badges
-- update live.

create type public.notification_kind as enum (
  'booking',
  'message',
  'wallet',
  'listing',
  'agent',
  'support',
  'system'
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       public.notification_kind not null,
  title      text not null,
  body       text,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  'One row per recipient per event. Written by triggers and the service role only.';

create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- The single writer. security definer so triggers on any table can insert
-- regardless of the acting user's own policies.
create function private.notify(
  target_user uuid,
  n_kind      public.notification_kind,
  n_title     text,
  n_body      text,
  n_href      text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, kind, title, body, href)
  select target_user, n_kind, n_title, n_body, n_href
  where target_user is not null;
$$;

revoke execute on function private.notify(uuid, public.notification_kind, text, text, text)
  from public, anon, authenticated;

-- Bookings fan-out. On insert both sides learn a request exists; on a status
-- change the guest always hears, and the host hears about cancellations.
create function private.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host_user     uuid;
  listing_title text;
begin
  select a.user_id, l.title into host_user, listing_title
  from public.listings l
  join public.agents   a on a.id = l.agent_id
  where l.id = new.listing_id;

  if tg_op = 'INSERT' then
    perform private.notify(host_user, 'booking', 'New booking request',
      coalesce(listing_title, 'A listing') || ': ' || to_char(new.check_in, 'DD Mon') || ' to ' || to_char(new.check_out, 'DD Mon') || '.',
      '/agent/bookings');
    perform private.notify(new.guest_id, 'booking', 'Booking request sent',
      'Your request for ' || coalesce(listing_title, 'this stay') || ' is with the host.',
      '/bookings');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      perform private.notify(new.guest_id, 'booking', 'Booking confirmed',
        coalesce(listing_title, 'Your stay') || ' is confirmed for ' || to_char(new.check_in, 'DD Mon') || '.',
        '/bookings');
    elsif new.status = 'CANCELLED' then
      perform private.notify(new.guest_id, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'Your stay') || ' has been cancelled.',
        '/bookings');
      perform private.notify(host_user, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'A booking') || ' for ' || to_char(new.check_in, 'DD Mon') || ' was cancelled.',
        '/agent/bookings');
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_booking_change() from public, anon, authenticated;

create trigger bookings_notify_after_change
  after insert or update on public.bookings
  for each row execute function private.notify_booking_change();

-- Messages fan-out: the other participant hears, and the conversation surfaces
-- to the top of both inboxes via last_message_at.
create function private.notify_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  select case when c.guest_id = new.sender_id then c.agent_id else c.guest_id end
  into recipient
  from public.conversations c
  where c.id = new.conversation_id;

  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  perform private.notify(recipient, 'message', 'New message',
    left(new.body, 120),
    '/messages/' || new.conversation_id);

  return new;
end;
$$;

revoke execute on function private.notify_message() from public, anon, authenticated;

create trigger messages_notify_after_insert
  after insert on public.messages
  for each row execute function private.notify_message();

-- Wallet fan-out: the owner hears when money completes, whether the entry is
-- born COMPLETED or transitions to it.
create function private.notify_wallet_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_user uuid;
  amount_txt text;
begin
  if not (
    (tg_op = 'INSERT' and new.status = 'COMPLETED') or
    (tg_op = 'UPDATE' and new.status = 'COMPLETED' and old.status is distinct from new.status)
  ) then
    return new;
  end if;

  select w.user_id into owner_user from public.wallets w where w.id = new.wallet_id;
  amount_txt := 'NGN ' || to_char((new.amount_minor::numeric) / 100, 'FM999,999,999,990.00');

  if new.direction = 'credit' then
    perform private.notify(owner_user, 'wallet', 'Wallet credited',
      amount_txt || ' has landed in your wallet.', '/wallet');
  else
    perform private.notify(owner_user, 'wallet', 'Wallet debited',
      amount_txt || ' has left your wallet.', '/wallet');
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_wallet_entry() from public, anon, authenticated;

create trigger wallet_entries_notify_after_change
  after insert or update on public.wallet_entries
  for each row execute function private.notify_wallet_entry();

-- Row Level Security. Owners read, mark read and clear their own rows. No
-- client insert: triggers and the service role are the only writers. The
-- update grant is column-scoped to read_at so a client cannot rewrite history.
alter table public.notifications enable row level security;

create policy notifications_select_own
  on public.notifications for select
  using (auth.uid() = user_id);

create policy notifications_update_own
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy notifications_delete_own
  on public.notifications for delete
  using (auth.uid() = user_id);

revoke update on public.notifications from authenticated;
grant  update (read_at) on public.notifications to authenticated;

-- Live delivery for unread badges and the notifications page.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
