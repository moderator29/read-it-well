-- V-70: THE SHOT LIST. PHOTOS THAT PROVE THE CLAIMS.
--
-- Ten free photos tend to be ten angles of the living room. This labels each
-- listing photo with what it shows: the gate or front, the access road, the
-- living room, the kitchen, a bedroom, a bathroom, and the three utility
-- slots that prove a claim: the PREPAID METER, the WATER SOURCE (tank,
-- borehole head or treatment unit) and the GENERATOR OR INVERTER BAY. A
-- utility slot can be used only when the listing claims that utility.
--
-- A SIDE TABLE, not a column. `listing_photos` is existing schema and its
-- writer (`addPhoto`) is audit-named, so the label lives beside the photo row,
-- keyed by it and deleted with it. An example listing's labels are never
-- public: the read policy excludes examples, so no card or page says an
-- example was photographed.
--
-- THE SUBMIT GATE IS NOT CHANGED HERE. The entry asks for "the four required
-- slots" (front, living room, kitchen, a bedroom) in place of "four photos";
-- that gate is `submitRequirements` in the audit-named listings writer, so the
-- wizard shows which required slots are still missing as advice and the gate
-- change is reported as blocked.
--
-- Written only through `set_listing_photo_slot`, by the listing's owner,
-- while the listing is editable. Readable by anybody for a PUBLISHED listing
-- (a label says what a public photo shows), and by the owner and staff always.

create table if not exists public.listing_photo_slots (
  photo_id   uuid primary key references public.listing_photos(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  slot       text not null check (slot in ('front', 'road', 'living', 'kitchen', 'bedroom', 'bathroom', 'meter', 'water', 'power')),
  set_by     uuid not null,
  set_at     timestamptz not null default now()
);

comment on table public.listing_photo_slots is
  'V-70. What a listing photo shows, from a closed list. Utility slots (meter, water, power) only where the listing claims that utility. Written through set_listing_photo_slot by the owner while the listing is editable.';

create index if not exists listing_photo_slots_listing_idx on public.listing_photo_slots (listing_id);

alter table public.listing_photo_slots enable row level security;
revoke all on public.listing_photo_slots from public, anon, authenticated;
grant select on public.listing_photo_slots to anon, authenticated;
grant all on public.listing_photo_slots to service_role;

create policy listing_photo_slots_public_read on public.listing_photo_slots for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.status = 'PUBLISHED' and not l.is_demo));
create policy listing_photo_slots_owner_read on public.listing_photo_slots for select to authenticated
  using (private.owns_listing(listing_id)
         or private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

/* Label a photo, relabel it, or clear it (p_slot null). */
create or replace function public.set_listing_photo_slot(p_photo uuid, p_slot text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  ph  public.listing_photos%rowtype;
  lst public.listings%rowtype;
begin
  select * into ph from public.listing_photos where id = p_photo;
  if ph.id is null or not private.owns_listing(ph.listing_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into lst from public.listings where id = ph.listing_id;
  if lst.status not in ('DRAFT', 'MORE_INFO_REQUIRED', 'REJECTED') then
    return jsonb_build_object('status', 'locked');
  end if;
  if p_slot is null then
    delete from public.listing_photo_slots where photo_id = ph.id;
    return jsonb_build_object('status', 'ok');
  end if;
  if p_slot not in ('front', 'road', 'living', 'kitchen', 'bedroom', 'bathroom', 'meter', 'water', 'power') then
    return jsonb_build_object('status', 'bad_slot');
  end if;
  if (p_slot = 'meter' and lst.prepaid_meter is not true)
     or (p_slot = 'water' and (lst.water_supply is null or lst.water_supply::text = 'NONE'))
     or (p_slot = 'power' and (lst.power_backup is null or lst.power_backup::text = 'NONE')) then
    return jsonb_build_object('status', 'not_claimed');
  end if;
  insert into public.listing_photo_slots (photo_id, listing_id, slot, set_by)
  values (ph.id, ph.listing_id, p_slot, (select auth.uid()))
  on conflict (photo_id) do update set slot = excluded.slot, set_by = excluded.set_by, set_at = now();
  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.set_listing_photo_slot(uuid, text) from public, anon;
grant execute on function public.set_listing_photo_slot(uuid, text) to authenticated;
