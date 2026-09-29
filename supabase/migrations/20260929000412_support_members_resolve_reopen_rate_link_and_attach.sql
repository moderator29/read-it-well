-- Support tickets: members can resolve, reopen, rate and read their own tickets,
-- link a ticket to one of their own records, and attach screenshots.
--
-- Until now a member could file a ticket and reply on it and nothing else:
-- the only UPDATE policy on support_tickets is staff-only, so "mark resolved",
-- "reopen" and "rate the answer" had no path. They get one here as narrow
-- SECURITY DEFINER functions that each change a fixed set of columns on a
-- ticket the caller owns. No member UPDATE policy is added, because the
-- authenticated role holds a table-wide UPDATE grant and a policy would open
-- every column.
--
-- What this adds:
--   support_tickets: kind (question or problem), related_kind/related_id/
--     related_label (a booking, agreement, listing, payment or inspection the
--     member is a party to), resolved_at, member_read_at (drives the unread
--     badge), rating, rating_comment, rated_at.
--   The member insert policy now also requires a clean ticket (no rating, not
--     resolved) and a related record the member really is a party to, checked
--     by private.support_related_is_mine. This only narrows the policy.
--   support_ticket_messages.staff_name: the replying staff member's first name,
--     written by a trigger from their profile, so the member sees "Ada, Vallo
--     support" without being able to read staff profiles. A member cannot set
--     it: the trigger clears it on every non-staff row.
--   resolved_at is kept by a trigger whoever changes the status, staff included.
--   A member who files while signed in gets an in-app notification carrying
--     the reference and linking to the ticket.
--   support_ticket_attachments plus a private support-attachments bucket.
--     Objects live under <owner uid>/<ticket id>/, the owner can write and read
--     their own folder for a ticket they own, staff can read. No member update
--     or delete.

-- 1. Columns ---------------------------------------------------------------

alter table public.support_tickets
  add column kind text not null default 'question',
  add column related_kind text,
  add column related_id uuid,
  add column related_label text,
  add column resolved_at timestamptz,
  add column member_read_at timestamptz,
  add column rating smallint,
  add column rating_comment text,
  add column rated_at timestamptz,
  add constraint support_tickets_kind_check check (kind in ('question', 'problem')),
  add constraint support_tickets_related_kind_check
    check (related_kind in ('booking', 'agreement', 'listing', 'payment', 'inspection')),
  add constraint support_tickets_related_pair_check check ((related_kind is null) = (related_id is null)),
  add constraint support_tickets_related_label_check check (char_length(related_label) <= 200),
  add constraint support_tickets_rating_check check (rating between 1 and 5),
  add constraint support_tickets_rating_comment_check check (char_length(rating_comment) <= 1000);

update public.support_tickets
   set resolved_at = updated_at
 where status in ('resolved', 'closed') and resolved_at is null;

alter table public.support_ticket_messages
  add column staff_name text;

-- 2. Is the linked record the caller's own? ----------------------------------

create or replace function private.support_related_is_mine(k text, rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when k is null and rid is null then true
    when k is null or rid is null then false
    when k = 'booking' then exists (
      select 1 from public.bookings b
       where b.id = rid
         and (b.guest_id = (select auth.uid())
              or exists (select 1 from public.listings l join public.agents a on a.id = l.agent_id
                          where l.id = b.listing_id and a.user_id = (select auth.uid()))))
    when k = 'agreement' then exists (
      select 1 from public.deal_agreements d
       where d.id = rid and (select auth.uid()) in (d.renter_id, d.owner_id))
    when k = 'listing' then exists (
      select 1 from public.listings l join public.agents a on a.id = l.agent_id
       where l.id = rid and a.user_id = (select auth.uid()))
    when k = 'payment' then exists (
      select 1 from public.transactions t join public.bookings b on b.id = t.booking_id
       where t.id = rid and b.guest_id = (select auth.uid()))
    when k = 'inspection' then exists (
      select 1 from public.inspection_requests i
       where i.id = rid and (select auth.uid()) in (i.requester_id, i.lister_id))
    else false
  end;
$$;

revoke all on function private.support_related_is_mine(text, uuid) from public;
grant execute on function private.support_related_is_mine(text, uuid) to authenticated;

drop policy support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own on public.support_tickets
  for insert
  with check (
    (select auth.uid()) = user_id
    and status = 'open'::support_ticket_status
    and resolved_at is null
    and rating is null
    and rating_comment is null
    and rated_at is null
    and private.support_related_is_mine(related_kind, related_id)
  );

-- 3. Staff first name on staff replies ----------------------------------------

create or replace function private.support_message_staff_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sender_role = 'admin' and new.sender_id is not null then
    select nullif(btrim(coalesce(nullif(btrim(p.first_name), ''), split_part(btrim(p.display_name), ' ', 1))), '')
      into new.staff_name
      from public.profiles p
     where p.id = new.sender_id;
  else
    new.staff_name := null;
  end if;
  return new;
end;
$$;

create trigger support_ticket_messages_staff_name
  before insert on public.support_ticket_messages
  for each row execute function private.support_message_staff_name();

update public.support_ticket_messages m
   set staff_name = nullif(btrim(coalesce(nullif(btrim(p.first_name), ''), split_part(btrim(p.display_name), ' ', 1))), '')
  from public.profiles p
 where m.sender_role = 'admin' and p.id = m.sender_id and m.staff_name is null;

-- 4. resolved_at follows the status, whoever sets it --------------------------

create or replace function private.support_ticket_resolved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('resolved', 'closed') then
      new.resolved_at := coalesce(new.resolved_at, now());
    else
      new.resolved_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger support_tickets_resolved_at
  before update of status on public.support_tickets
  for each row execute function private.support_ticket_resolved_at();

-- 5. Notify the member that the ticket is filed --------------------------------

create or replace function private.notify_support_ticket_filed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    perform private.notify(new.user_id, 'support', 'We have your question',
      'Ticket ' || new.reference || ' is filed. A person will reply in Messages.',
      '/support/messages/' || new.id::text);
  end if;
  return new;
end;
$$;

create trigger support_tickets_notify_filed
  after insert on public.support_tickets
  for each row execute function private.notify_support_ticket_filed();

-- 6. Member actions --------------------------------------------------------------

create or replace function public.support_ticket_member_resolve(p_ticket uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.support_tickets%rowtype;
begin
  select * into t from public.support_tickets
   where id = p_ticket and user_id = (select auth.uid()) for update;
  if t.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if t.status not in ('open', 'pending') then return jsonb_build_object('status', 'not_open'); end if;
  update public.support_tickets set status = 'resolved' where id = t.id;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- A member may reopen a resolved ticket for 14 days. A closed ticket stays closed.
create or replace function public.support_ticket_member_reopen(p_ticket uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.support_tickets%rowtype;
begin
  select * into t from public.support_tickets
   where id = p_ticket and user_id = (select auth.uid()) for update;
  if t.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if t.status <> 'resolved' then return jsonb_build_object('status', 'not_resolved'); end if;
  if coalesce(t.resolved_at, t.updated_at) < now() - interval '14 days' then
    return jsonb_build_object('status', 'too_late');
  end if;
  update public.support_tickets
     set status = 'open', rating = null, rating_comment = null, rated_at = null
   where id = t.id;
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.support_ticket_member_rate(p_ticket uuid, p_rating integer, p_comment text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.support_tickets%rowtype;
  c text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('status', 'bad_rating');
  end if;
  if c is not null and char_length(c) > 1000 then
    return jsonb_build_object('status', 'comment_too_long');
  end if;
  select * into t from public.support_tickets
   where id = p_ticket and user_id = (select auth.uid()) for update;
  if t.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if t.status not in ('resolved', 'closed') then return jsonb_build_object('status', 'not_resolved'); end if;
  update public.support_tickets
     set rating = p_rating, rating_comment = c, rated_at = now()
   where id = t.id;
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.support_ticket_member_mark_read(p_ticket uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets
     set member_read_at = now()
   where id = p_ticket and user_id = (select auth.uid());
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

revoke all on function public.support_ticket_member_resolve(uuid) from public, anon;
revoke all on function public.support_ticket_member_reopen(uuid) from public, anon;
revoke all on function public.support_ticket_member_rate(uuid, integer, text) from public, anon;
revoke all on function public.support_ticket_member_mark_read(uuid) from public, anon;
grant execute on function public.support_ticket_member_resolve(uuid) to authenticated;
grant execute on function public.support_ticket_member_reopen(uuid) to authenticated;
grant execute on function public.support_ticket_member_rate(uuid, integer, text) to authenticated;
grant execute on function public.support_ticket_member_mark_read(uuid) to authenticated;

-- 7. Attachments -------------------------------------------------------------------

create table public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  message_id uuid references public.support_ticket_messages(id) on delete cascade,
  uploader_id uuid references auth.users(id) on delete set null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now()
);

create index support_ticket_attachments_ticket_idx on public.support_ticket_attachments (ticket_id, created_at);
create index support_ticket_attachments_message_idx on public.support_ticket_attachments (message_id);
create index support_ticket_attachments_uploader_idx on public.support_ticket_attachments (uploader_id);

alter table public.support_ticket_attachments enable row level security;

revoke all on public.support_ticket_attachments from anon, authenticated;
grant select, insert on public.support_ticket_attachments to authenticated;

create policy support_ticket_attachments_select on public.support_ticket_attachments
  for select to authenticated
  using (
    exists (select 1 from public.support_tickets t
             where t.id = support_ticket_attachments.ticket_id and t.user_id = (select auth.uid()))
    or (select private.has_role((select auth.uid()), 'admin'::app_role))
    or (select private.has_role((select auth.uid()), 'super_admin'::app_role))
  );

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
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-attachments', 'support-attachments', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "support attachments owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.support_tickets t
                 where t.id::text = (storage.foldername(name))[2]
                   and t.user_id = (select auth.uid())
                   and t.status in ('open', 'pending'))
  );

create policy "support attachments owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "support attachments staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and ((select private.has_role((select auth.uid()), 'admin'::app_role))
         or (select private.has_role((select auth.uid()), 'super_admin'::app_role)))
  );

-- 8. Read back -----------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_class where relname = 'support_ticket_attachments' and relrowsecurity) then
    raise exception 'support_ticket_attachments has no RLS';
  end if;
  if (select count(*) from pg_policies where tablename = 'support_ticket_attachments') <> 2 then
    raise exception 'support_ticket_attachments policies missing';
  end if;
  if not exists (select 1 from storage.buckets where id = 'support-attachments' and public = false) then
    raise exception 'support-attachments bucket missing or public';
  end if;
  if has_table_privilege('anon', 'public.support_ticket_attachments', 'select') then
    raise exception 'anon can read support_ticket_attachments';
  end if;
  if has_function_privilege('anon', 'public.support_ticket_member_rate(uuid, integer, text)', 'execute') then
    raise exception 'anon can execute support_ticket_member_rate';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'support_tickets' and policyname = 'support_tickets_insert_own'
                   and with_check like '%support_related_is_mine%') then
    raise exception 'support_tickets_insert_own was not narrowed';
  end if;
  if exists (select 1 from pg_policies where tablename = 'support_tickets' and cmd = 'UPDATE') then
    raise exception 'a member UPDATE policy appeared on support_tickets';
  end if;
end;
$$;
