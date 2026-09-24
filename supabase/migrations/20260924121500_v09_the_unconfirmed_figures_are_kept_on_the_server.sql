-- V-09, REVIEW FIX: WHICH FIGURES CAME FROM A PASTED MESSAGE, AND HAVE NOT
-- BEEN CONFIRMED, IS KEPT ON THE SERVER.
--
-- The wizard remembered the unconfirmed set only in the browser's own
-- storage, so another device, a cleared browser or a private window quietly
-- treated every figure read from a WhatsApp message as confirmed, and the
-- submit gate lived only on the screen. Now the set is a row beside the
-- draft, and `submitListing` refuses while any money key is still in it.
--
-- One row per listing, the lister's own: readable and writable only by the
-- agent who owns the listing (the same ownership `listings` uses:
-- `listings.agent_id` is the caller's `agents.id`). Keys are wizard field
-- names, validated here as plain identifiers and bounded in number. The row
-- goes with its listing.

create table if not exists public.listing_broadcast_marks (
  listing_id   uuid primary key references public.listings(id) on delete cascade,
  unconfirmed  text[] not null default '{}'
               check (coalesce(array_length(unconfirmed, 1), 0) <= 40
                      and array_to_string(unconfirmed, ',') ~ '^[A-Za-z]*(,[A-Za-z]+)*$'),
  updated_at   timestamptz not null default now()
);

comment on table public.listing_broadcast_marks is
  'V-09. The wizard fields a pasted broadcast filled that the lister has not yet confirmed, per draft. submitListing refuses while a money field is still here. Owner only.';

alter table public.listing_broadcast_marks enable row level security;
revoke all on public.listing_broadcast_marks from public, anon, authenticated;
grant select, insert, update, delete on public.listing_broadcast_marks to authenticated;
grant all on public.listing_broadcast_marks to service_role;

drop policy if exists listing_broadcast_marks_owner on public.listing_broadcast_marks;
create policy listing_broadcast_marks_owner on public.listing_broadcast_marks
  for all to authenticated
  using (exists (
    select 1 from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.id = listing_broadcast_marks.listing_id
       and a.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.id = listing_broadcast_marks.listing_id
       and a.user_id = (select auth.uid())
  ));
