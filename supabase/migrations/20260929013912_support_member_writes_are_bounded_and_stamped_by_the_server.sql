-- Support: a member's writes are stamped and bounded by the database.
--
-- Found by the independent audit of 20260929000412:
--
-- 1. A member inserts their own ticket through the API, so every column the
--    policy does not pin is theirs to set. The staff queue orders on
--    queue_at = coalesce(last_member_reply_at, created_at), so a member who
--    sent created_at or last_member_reply_at in the future pinned their ticket
--    to the top; member_read_at could hide an unread reply; related_label is
--    shown to staff as the name of the linked record, and was whatever the
--    request said. A BEFORE INSERT trigger now stamps created_at and
--    updated_at with now(), clears last_member_reply_at and member_read_at,
--    and rebuilds related_label from the record itself (or clears it), for
--    every caller who is not staff.
-- 2. Bodies are capped at 4,000 characters on tickets and messages (the app's
--    own limit, now the database's), and a signed-in caller who is not staff
--    can insert at most 10 tickets and 20 messages an hour. The app limiter
--    fails open by design; this one does not.
-- 3. A member can add a message only while the ticket is open or pending,
--    matching the app: a resolved ticket is reopened first.
-- 4. A ticket holds at most 40 attachments from its owner.

-- 1 -------------------------------------------------------------------------

create or replace function private.support_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.has_role((select auth.uid()), 'admin'::public.app_role), false)
      or coalesce(private.has_role((select auth.uid()), 'super_admin'::public.app_role), false);
$$;

revoke all on function private.support_is_staff() from public;
grant execute on function private.support_is_staff() to authenticated;

/* Kobo to "₦1,234" or "₦1,234.50" with integer arithmetic only. */
create or replace function private.support_naira(minor bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select '₦' || to_char(minor / 100, 'FM999,999,999,999,990')
         || case when minor % 100 <> 0 then '.' || lpad((abs(minor) % 100)::text, 2, '0') else '' end;
$$;

create or replace function private.support_related_label(k text, rid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(case k
    when 'booking' then (
      select coalesce(nullif(btrim(l.title), ''), 'A property') || ', '
             || to_char(b.check_in, 'FMDD Mon') || ' to ' || to_char(b.check_out, 'FMDD Mon')
        from public.bookings b left join public.listings l on l.id = b.listing_id where b.id = rid)
    when 'agreement' then (
      select case when d.kind::text = 'stay' then 'Stay' else 'Rent' end || ' agreement, '
             || coalesce(nullif(btrim(l.title), ''), 'A property')
        from public.deal_agreements d left join public.listings l on l.id = d.listing_id where d.id = rid)
    when 'listing' then (
      select coalesce(nullif(btrim(l.title), ''), 'Untitled listing') from public.listings l where l.id = rid)
    when 'payment' then (
      select 'Payment of ' || private.support_naira(t.amount_minor) || ', '
             || to_char(t.created_at at time zone 'Africa/Lagos', 'FMDD Mon')
        from public.transactions t where t.id = rid)
    when 'inspection' then (
      select 'Inspection, ' || coalesce(nullif(btrim(l.title), ''), 'A property')
        from public.inspection_requests i left join public.listings l on l.id = i.listing_id where i.id = rid)
    else null
  end, 200);
$$;

revoke all on function private.support_related_label(text, uuid) from public;

create or replace function private.support_ticket_stamp_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.support_is_staff() then
    return new;
  end if;
  new.created_at := now();
  new.updated_at := now();
  new.last_member_reply_at := null;
  new.member_read_at := null;
  new.related_label := case
    when new.related_kind is null or new.related_id is null then null
    else private.support_related_label(new.related_kind, new.related_id)
  end;
  return new;
end;
$$;

create trigger support_tickets_stamp_insert
  before insert on public.support_tickets
  for each row execute function private.support_ticket_stamp_insert();

-- 2 -------------------------------------------------------------------------

alter table public.support_tickets
  add constraint support_tickets_body_length check (char_length(body) <= 4000);
alter table public.support_ticket_messages
  add constraint support_ticket_messages_body_length check (char_length(body) <= 4000);

create index if not exists support_ticket_messages_sender_created_idx
  on public.support_ticket_messages (sender_id, created_at);
create index if not exists support_tickets_user_created_idx
  on public.support_tickets (user_id, created_at);

create or replace function private.support_ticket_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.support_is_staff() then
    return new;
  end if;
  if (select count(*) from public.support_tickets t
       where t.user_id = me and t.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'support_ticket_rate: at most 10 tickets an hour' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger support_tickets_rate
  before insert on public.support_tickets
  for each row execute function private.support_ticket_rate();

create or replace function private.support_message_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.support_is_staff() then
    return new;
  end if;
  if (select count(*) from public.support_ticket_messages m
       where m.sender_id = me and m.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'support_message_rate: at most 20 messages an hour' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger support_ticket_messages_rate
  before insert on public.support_ticket_messages
  for each row execute function private.support_message_rate();

-- 3 -------------------------------------------------------------------------

drop policy support_ticket_messages_insert_own on public.support_ticket_messages;
create policy support_ticket_messages_insert_own on public.support_ticket_messages
  for insert
  with check (
    sender_role = 'user'
    and sender_id = (select auth.uid())
    and exists (select 1 from public.support_tickets t
                 where t.id = support_ticket_messages.ticket_id
                   and t.user_id = (select auth.uid())
                   and t.status in ('open', 'pending'))
  );

-- 4 -------------------------------------------------------------------------

drop policy support_ticket_attachments_insert_own on public.support_ticket_attachments;
create policy support_ticket_attachments_insert_own on public.support_ticket_attachments
  for insert to authenticated
  with check (
    uploader_id = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and split_part(storage_path, '/', 2) = ticket_id::text
    and exists (select 1 from public.support_tickets t
                 where t.id = support_ticket_attachments.ticket_id
                   and t.user_id = (select auth.uid())
                   and t.status in ('open', 'pending'))
    and (message_id is null or exists (
          select 1 from public.support_ticket_messages m
           where m.id = support_ticket_attachments.message_id
             and m.ticket_id = support_ticket_attachments.ticket_id
             and m.sender_id = (select auth.uid())))
    and (select count(*) from public.support_ticket_attachments a
          where a.ticket_id = support_ticket_attachments.ticket_id) < 40
  );

-- Read back -------------------------------------------------------------------

do $$
begin
  if (select count(*) from pg_trigger where tgname in
      ('support_tickets_stamp_insert', 'support_tickets_rate', 'support_ticket_messages_rate')) <> 3 then
    raise exception 'support write triggers missing';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'support_ticket_messages'
                   and policyname = 'support_ticket_messages_insert_own' and with_check like '%pending%') then
    raise exception 'message insert policy does not check the status';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'support_ticket_attachments'
                   and policyname = 'support_ticket_attachments_insert_own' and with_check like '%< 40%') then
    raise exception 'attachment insert policy has no cap';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'support_ticket_messages_body_length') then
    raise exception 'message body cap missing';
  end if;
end;
$$;
