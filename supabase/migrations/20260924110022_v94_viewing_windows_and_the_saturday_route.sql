-- V-94: VIEWING WINDOWS AND THE SATURDAY ROUTE.
--
-- An inspection request asks for one time, and a decline restarts the whole
-- exchange. A lister now publishes viewing windows ("Saturdays 10:00 to
-- 14:00, these three flats in Yaba"); a renter picks a free slot inside one
-- and the viewing is booked, CONFIRMED, with no negotiation. The lister's
-- day then reads as a route (in the app; nothing here stores a route).
--
-- SLOTS ARE COMPUTED, NOT STORED. `viewing_slots` walks the windows that
-- cover a listing over the next days, in Lagos time, cuts them into slots of
-- the window's length, and leaves out every slot the lister is already
-- committed to (a requested, proposed or confirmed viewing that overlaps it,
-- on any of their listings) and every slot less than an hour away.
--
-- BOOKING IS ONE INSERT, GUARDED TWICE. `book_viewing_slot` accepts only a
-- slot `viewing_slots` would offer at that moment, and writes an
-- `inspection_requests` row already CONFIRMED at that time, with the window
-- it came from. A partial unique index on (lister_id, slot_at) for confirmed
-- viewings makes two renters taking the same slot at the same instant a
-- refusal for the second, not a double booking. The existing triggers still
-- run: the lister is resolved from the listing, an example listing is
-- refused, and the usual notifications go out.
--
-- WINDOWS BELONG TO THE LISTER. A window names only the lister's own
-- listings (checked on every write), up to twenty of them; the renter-facing
-- read is the slot list, never the window table.

create table if not exists public.viewing_windows (
  id            uuid primary key default gen_random_uuid(),
  lister_id     uuid not null references auth.users(id) on delete cascade,
  listing_ids   uuid[] not null check (coalesce(array_length(listing_ids, 1), 0) between 1 and 20),
  weekday       smallint not null check (weekday between 0 and 6),
  starts        time not null,
  ends          time not null,
  slot_minutes  smallint not null default 20 check (slot_minutes in (15, 20, 30, 45, 60)),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint viewing_windows_order check (ends > starts),
  constraint viewing_windows_length check (ends - starts <= interval '10 hours')
);

comment on table public.viewing_windows is
  'V-94. A lister''s weekly viewing window for some of their own listings: weekday (0 Sunday, Lagos time), start, end and slot length. Slots are computed by viewing_slots and booked by book_viewing_slot. Owner only.';

create index if not exists viewing_windows_lister_idx on public.viewing_windows (lister_id) where active;
create index if not exists viewing_windows_listings_idx on public.viewing_windows using gin (listing_ids);

create or replace function private.owns_all_listings(p_user uuid, p_listing_ids uuid[])
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select p_user is not null
     and coalesce(array_length(p_listing_ids, 1), 0) > 0
     and not exists (
       select 1 from unnest(p_listing_ids) as wanted(id)
        where not exists (
          select 1 from public.listings l join public.agents a on a.id = l.agent_id
           where l.id = wanted.id and a.user_id = p_user));
$function$;

revoke all on function private.owns_all_listings(uuid, uuid[]) from public, anon;
grant execute on function private.owns_all_listings(uuid, uuid[]) to authenticated;

alter table public.viewing_windows enable row level security;
revoke all on public.viewing_windows from public, anon, authenticated;
grant select, insert, update, delete on public.viewing_windows to authenticated;
grant all on public.viewing_windows to service_role;

drop policy if exists viewing_windows_owner_reads on public.viewing_windows;
create policy viewing_windows_owner_reads on public.viewing_windows
  for select to authenticated using (lister_id = (select auth.uid()));
drop policy if exists viewing_windows_owner_writes on public.viewing_windows;
create policy viewing_windows_owner_writes on public.viewing_windows
  for insert to authenticated
  with check (lister_id = (select auth.uid()) and private.owns_all_listings((select auth.uid()), listing_ids));
drop policy if exists viewing_windows_owner_updates on public.viewing_windows;
create policy viewing_windows_owner_updates on public.viewing_windows
  for update to authenticated
  using (lister_id = (select auth.uid()))
  with check (lister_id = (select auth.uid()) and private.owns_all_listings((select auth.uid()), listing_ids));
drop policy if exists viewing_windows_owner_deletes on public.viewing_windows;
create policy viewing_windows_owner_deletes on public.viewing_windows
  for delete to authenticated using (lister_id = (select auth.uid()));

alter table public.inspection_requests
  add column if not exists window_id uuid references public.viewing_windows(id) on delete set null;

comment on column public.inspection_requests.window_id is
  'V-94. The viewing window a booked slot came from; null for a viewing arranged by request.';

create unique index if not exists inspection_requests_one_confirmed_per_slot
  on public.inspection_requests (lister_id, slot_at) where state = 'CONFIRMED';

create or replace function public.viewing_slots(p_listing uuid, p_days integer default 14)
returns table (slot_at timestamptz, slot_minutes smallint, window_id uuid)
language sql
stable
security definer
set search_path to ''
as $function$
  with target as (
    select l.id, a.user_id as lister_id
      from public.listings l join public.agents a on a.id = l.agent_id
     where l.id = p_listing
       and l.status = 'PUBLISHED'::public.listing_status
       and l.is_demo = false
       and (select auth.uid()) is not null
  ),
  days as (
    select ((now() at time zone 'Africa/Lagos')::date + g) as day
      from generate_series(0, greatest(least(coalesce(p_days, 14), 30), 1) - 1) as g
  ),
  candidate as (
    select w.id as window_id, w.slot_minutes, t.lister_id,
           gs as slot_at
      from target t
      join public.viewing_windows w on w.lister_id = t.lister_id and w.active and t.id = any (w.listing_ids)
      join days d on extract(dow from d.day)::smallint = w.weekday
      cross join lateral generate_series(
        (d.day + w.starts) at time zone 'Africa/Lagos',
        (d.day + w.ends) at time zone 'Africa/Lagos' - make_interval(mins => w.slot_minutes),
        make_interval(mins => w.slot_minutes)) as gs
  )
  select c.slot_at, c.slot_minutes, c.window_id
    from candidate c
   where c.slot_at > now() + interval '1 hour'
     and not exists (
       select 1 from public.inspection_requests ir
        where ir.lister_id = c.lister_id
          and ir.state in ('REQUESTED', 'PROPOSED', 'CONFIRMED')
          and coalesce(ir.slot_at, ir.requested_at) < c.slot_at + make_interval(mins => c.slot_minutes)
          and coalesce(ir.slot_at, ir.requested_at) + make_interval(mins => c.slot_minutes) > c.slot_at)
   order by c.slot_at
   limit 200;
$function$;

comment on function public.viewing_slots(uuid, integer) is
  'V-94. The free viewing slots for one published, real listing over the next N days (1 to 30), from its lister''s windows, less every slot the lister is already committed to and every slot within the hour. Signed in only. Times only; nothing about other viewers.';

create or replace function public.book_viewing_slot(p_listing uuid, p_slot timestamptz, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  chosen record;
  booked uuid;
begin
  if caller is null then
    raise exception 'sign in to book' using errcode = '42501';
  end if;
  if p_note is not null and length(p_note) > 400 then
    raise exception 'keep the note under 400 characters' using errcode = '22023';
  end if;

  select s.slot_at, s.window_id into chosen
    from public.viewing_slots(p_listing, 30) s
   where s.slot_at = p_slot;
  if not found then
    raise exception 'that slot is not free' using errcode = 'P0001', hint = 'viewing_slot_taken';
  end if;

  if exists (
    select 1 from public.inspection_requests ir
     where ir.listing_id = p_listing and ir.requester_id = caller
       and ir.state in ('REQUESTED', 'PROPOSED', 'CONFIRMED')
  ) then
    raise exception 'you already have a viewing for this home' using errcode = 'P0001', hint = 'viewing_already_booked';
  end if;

  begin
    insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at, responded_at, window_id, note)
    values (p_listing, caller, caller, 'CONFIRMED', chosen.slot_at, chosen.slot_at, now(), chosen.window_id, nullif(btrim(p_note), ''))
    returning id into booked;
  exception when unique_violation then
    raise exception 'that slot was just taken' using errcode = 'P0001', hint = 'viewing_slot_taken';
  end;
  return booked;
end;
$function$;

comment on function public.book_viewing_slot(uuid, timestamptz, text) is
  'V-94. Books a free slot from viewing_slots as a CONFIRMED inspection for the caller. Refuses a slot that is not free (or was just taken) and a second open viewing of the same home. The lister is resolved from the listing by the existing trigger.';

revoke all on function public.viewing_slots(uuid, integer) from public, anon;
revoke all on function public.book_viewing_slot(uuid, timestamptz, text) from public, anon;
grant execute on function public.viewing_slots(uuid, integer) to authenticated;
grant execute on function public.book_viewing_slot(uuid, timestamptz, text) to authenticated;
