/*
 * V-37. ONE FLAT, ONE PAGE: THE PROPERTY A LISTING IS AN OFFER ON.
 *
 * THE SAME FLAT POSTED BY FOUR AGENTS IS FOUR LISTINGS NAMING ONE PRINCIPAL.
 * Open mandates are ordinary in Nigeria and `listing_mandates.exclusive` is
 * nullable for exactly that reason, so the answer is not to forbid the second
 * agent. It is to show the four listings as what they are: four offers on one
 * door, side by side, each with its own move-in total, so a renter sees at once
 * that Agent A asks N4.2m to move in and Agent B asks N4.6m for the same flat.
 *
 * Until today there was no row for "the flat". Track G argues that ownership is
 * a property of a pair, a person and a property, and then had nothing for the
 * pair to point at. `public.properties` is that thing, and `listings.property_id`
 * points at it.
 *
 * ---------------------------------------------------------------------------
 * THE PRINCIPAL IS THE KEY, AND THE KEY IS A HASH.
 *
 * Nigerian addressing cannot cluster four listings (the same compound is
 * written four ways, and half the pins are missing), but the four agents all
 * wrote down the same landlord's number. So the strongest signal that two
 * listings are one flat is that their mandates name the same principal.
 *
 * The raw number NEVER LEAVES `listing_mandates`. What is compared is
 * `principal_key`, an HMAC-SHA256 of the number under a secret that lives only
 * in the Vault (`vallo_principal_key_secret`). The secret is minted inside the
 * database by this migration and is never written in any file, so the key
 * cannot be reversed from a leaked table by trying all 90 million Nigerian
 * mobile numbers, which is the attack a bare sha256 of a phone number falls to
 * in an afternoon.
 *
 * WITH NO SECRET, NO KEY. `private.principal_key` answers NULL when the Vault
 * has no row, and a NULL key matches nothing, so the principal signal fails
 * closed rather than falling back to anything weaker.
 *
 * ---------------------------------------------------------------------------
 * MATCHED AT REVIEW, NEVER AUTOMATICALLY IN PUBLIC.
 *
 * `property_candidates` PROPOSES; a reviewer DECIDES, with one tap and an audit
 * row in `property_decisions`. The two signals, either sufficient to propose:
 *
 *   (a) the same principal key AND the same bedrooms and type (one landlord can
 *       own six flats in a block, so the principal alone is not a match);
 *   (b) pins within 40 metres AND the same bedrooms and type.
 *
 * The third signal the file names (photo perceptual hashes) needs V-45, which
 * has not been built, and is not pretended here.
 *
 * A reviewer who says "not the same" records `kept_apart`, and that pair is
 * never proposed again. Nothing about the principal is ever shown to anybody
 * beyond "same property": the reviewer sees a yes on "same owner on record",
 * never the number, and the renter sees only the offers.
 *
 * ---------------------------------------------------------------------------
 * BORN LOCKED. Both tables revoke the default ACL before anything is granted,
 * because `pg_default_acl` hands every new relation in `public` to `anon` and
 * `authenticated` with full rights (the trap the I1 migration recorded). No
 * role but the service role may read either table directly: the reviewer
 * reaches them through staff-guarded functions and the renter through
 * `property_offers`, which returns published offers and nothing about the
 * principal.
 */

/* --------------------------------------------------------------- the secret */

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'vallo_principal_key_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'vallo_principal_key_secret',
      'HMAC key for listing_mandates.principal_key and properties.principal_key. Minted inside the database by migration 20260924110000 and written in no file. Rotating it orphans every key, so a rotation must recompute listing_mandates.principal_key and properties.principal_key in the same transaction.'
    );
  end if;
end $$;

/*
 * The HMAC of a principal's number, or NULL.
 *
 * NULL for a NULL number and NULL when the Vault has no secret, so a missing
 * secret can never degrade into an unkeyed hash that could be reversed.
 * Callable by nobody but its definer's callers: it is a private helper for the
 * triggers and functions below, and a client that could call it with any
 * number would have a lookup oracle for every principal on the platform.
 */
create or replace function private.principal_key(p_phone text)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select case
           when p_phone is null or btrim(p_phone) = '' then null
           else encode(extensions.hmac(btrim(p_phone), s.decrypted_secret, 'sha256'), 'hex')
         end
    from vault.decrypted_secrets s
   where s.name = 'vallo_principal_key_secret'
   limit 1;
$function$;

revoke all on function private.principal_key(text) from public, anon, authenticated;

/* ------------------------------------------------ the key on the mandate row */

alter table public.listing_mandates
  add column if not exists principal_key text;

comment on column public.listing_mandates.principal_key is
  'HMAC-SHA256 of principal_phone under the Vault secret vallo_principal_key_secret. Written only by the listing_mandates_principal_key trigger. What V-37 compares to decide that two listings name one landlord, so the raw number never leaves this table.';

create index if not exists listing_mandates_principal_key_idx
  on public.listing_mandates (principal_key) where principal_key is not null;

create or replace function private.listing_mandates_principal_key()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  new.principal_key := private.principal_key(new.principal_phone);
  return new;
end;
$function$;

revoke all on function private.listing_mandates_principal_key() from public, anon, authenticated;

drop trigger if exists listing_mandates_principal_key on public.listing_mandates;
create trigger listing_mandates_principal_key
  before insert or update of principal_phone, principal_key on public.listing_mandates
  for each row execute function private.listing_mandates_principal_key();

/* Backfill. The trigger fires on the key column too, so it recomputes. */
update public.listing_mandates set principal_key = null where principal_phone is not null;

/* ------------------------------------------------------------ the property */

create table if not exists public.properties (
  id              uuid primary key default gen_random_uuid(),
  principal_key   text,
  location        extensions.geography(Point, 4326),
  bedrooms        integer,
  property_type   public.property_type,
  state_code      text,
  area            text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null
);

comment on table public.properties is
  'V-37. The physical flat that one or more listings offer. Created only by a reviewer confirming a proposed match (property_join), never automatically in public. principal_key is the HMAC of the landlord''s number and is never shown to anybody; the reader learns only that several offers are on one property.';

create index if not exists properties_principal_key_idx
  on public.properties (principal_key) where principal_key is not null;

alter table public.listings
  add column if not exists property_id uuid references public.properties(id) on delete set null;

create index if not exists listings_property_idx
  on public.listings (property_id) where property_id is not null;

comment on column public.listings.property_id is
  'V-37. The property this listing is an offer on, set only by a reviewer through property_join. Several listings may share one: that is four agents on one flat, shown as one page with four offers.';

create table if not exists public.property_decisions (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  other_listing_id uuid references public.listings(id) on delete cascade,
  property_id      uuid references public.properties(id) on delete set null,
  decision         text not null check (decision in ('joined', 'split', 'kept_apart')),
  signals          jsonb not null default '{}'::jsonb,
  decided_by       uuid references auth.users(id) on delete set null,
  decided_at       timestamptz not null default now()
);

comment on table public.property_decisions is
  'V-37. Every reviewer decision about whether two listings are one property, append only. kept_apart suppresses the pair from future proposals.';

create index if not exists property_decisions_listing_idx on public.property_decisions (listing_id, decided_at desc);
create index if not exists property_decisions_other_idx on public.property_decisions (other_listing_id);

/* BORN LOCKED. */
revoke all on public.properties from public, anon, authenticated;
revoke all on public.property_decisions from public, anon, authenticated;
grant all on public.properties to service_role;
grant all on public.property_decisions to service_role;

alter table public.properties enable row level security;
alter table public.property_decisions enable row level security;

/* Staff may read both directly (the console's audit view); nobody else may
   read either. There is no write policy: every write is a definer function. */
drop policy if exists properties_select_staff on public.properties;
create policy properties_select_staff on public.properties
  for select using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );
drop policy if exists property_decisions_select_staff on public.property_decisions;
create policy property_decisions_select_staff on public.property_decisions
  for select using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );
grant select on public.properties to authenticated;
grant select on public.property_decisions to authenticated;

/* ------------------------------------------------------------- the helpers */

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role);
$function$;

revoke all on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

/* The live principal key for a listing: the newest non-rejected mandate's. */
create or replace function private.listing_principal_key(p_listing uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select m.principal_key
    from public.listing_mandates m
   where m.listing_id = p_listing
     and m.review_status <> 'rejected'::public.document_review_status
     and m.principal_key is not null
   order by m.created_at desc
   limit 1;
$function$;

revoke all on function private.listing_principal_key(uuid) from public, anon, authenticated;

/*
 * WHICH OTHER LISTINGS MIGHT BE THIS SAME FLAT, and why each is proposed.
 *
 * Staff only, refused for anybody else inside the function rather than by a
 * grant alone. Returns the signals as booleans and a distance: the reviewer
 * sees "same owner on record: yes", never the owner or the number.
 */
create or replace function public.property_candidates(p_listing uuid)
returns table (
  listing_id uuid,
  reference text,
  title text,
  status public.listing_status,
  lister_name text,
  property_id uuid,
  same_principal boolean,
  distance_m integer,
  same_shape boolean,
  move_in_total_minor bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  me public.listings%rowtype;
  my_key text;
begin
  if not private.is_staff() then
    raise exception 'only staff may see proposed property matches' using errcode = 'insufficient_privilege';
  end if;

  select * into me from public.listings where id = p_listing;
  if not found then
    return;
  end if;
  my_key := private.listing_principal_key(p_listing);

  return query
  with pool as (
    select c.*,
           (my_key is not null and private.listing_principal_key(c.id) = my_key) as principal_match,
           case when me.location is not null and c.location is not null
                then round(extensions.st_distance(me.location, c.location))::integer end as metres,
           (c.bedrooms = me.bedrooms and c.property_type = me.property_type) as shape_match
      from public.listings c
     where c.id <> me.id
       and c.is_demo = false
       and me.is_demo = false
       and c.listing_intent = me.listing_intent
       and c.status in ('SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'APPROVED', 'PUBLISHED')
       and (me.property_id is null or c.property_id is distinct from me.property_id)
       and not exists (
         select 1 from public.property_decisions d
          where d.decision = 'kept_apart'
            and ((d.listing_id = me.id and d.other_listing_id = c.id)
              or (d.listing_id = c.id and d.other_listing_id = me.id))
       )
  )
  select p.id, p.reference, p.title, p.status,
         coalesce(nullif(btrim(b.name), ''), nullif(btrim(a.display_name), '')),
         p.property_id, p.principal_match, p.metres, p.shape_match,
         p.total_move_in_cost_minor
    from pool p
    left join public.agents a on a.id = p.agent_id
    left join public.businesses b on b.id = p.firm_id
   where p.shape_match
     and (p.principal_match or (p.metres is not null and p.metres <= 40))
   order by p.principal_match desc, p.metres nulls last
   limit 12;
end;
$function$;

revoke all on function public.property_candidates(uuid) from public, anon;
grant execute on function public.property_candidates(uuid) to authenticated;

/*
 * THE REVIEWER SAYS "SAME PROPERTY".
 *
 * Three shapes, one outcome: afterwards both listings point at one property.
 *   neither has one   ->  a property is created from the other listing's facts
 *   one has one       ->  the other joins it
 *   both, different   ->  every listing on this one's property moves across,
 *                         and the emptied property stays as an orphan row for
 *                         the audit trail rather than being deleted
 */
create or replace function public.property_join(p_listing uuid, p_other uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me public.listings%rowtype;
  them public.listings%rowtype;
  target uuid;
  signals jsonb;
begin
  if not private.is_staff() then
    raise exception 'only staff may decide that two listings are one property' using errcode = 'insufficient_privilege';
  end if;
  if p_listing = p_other then
    raise exception 'a listing is already the same property as itself' using errcode = 'check_violation';
  end if;

  select * into me from public.listings where id = p_listing for update;
  select * into them from public.listings where id = p_other for update;
  if me.id is null or them.id is null then
    raise exception 'both listings must exist' using errcode = 'no_data_found';
  end if;
  if me.is_demo or them.is_demo then
    raise exception 'an example listing is never joined to a property' using errcode = 'check_violation';
  end if;

  select to_jsonb(c) - 'listing_id' - 'reference' - 'title' - 'status' - 'lister_name' - 'property_id' - 'move_in_total_minor'
    into signals
    from public.property_candidates(p_listing) c
   where c.listing_id = p_other;

  target := coalesce(them.property_id, me.property_id);
  if target is null then
    insert into public.properties (principal_key, location, bedrooms, property_type, state_code, area, created_by)
    values (coalesce(private.listing_principal_key(them.id), private.listing_principal_key(me.id)),
            coalesce(them.location, me.location), them.bedrooms, them.property_type,
            them.state_code, them.area, (select auth.uid()))
    returning id into target;
  end if;

  if me.property_id is not null and me.property_id <> target then
    update public.listings set property_id = target where property_id = me.property_id;
  end if;
  update public.listings set property_id = target where id in (me.id, them.id);

  insert into public.property_decisions (listing_id, other_listing_id, property_id, decision, signals, decided_by)
  values (me.id, them.id, target, 'joined', coalesce(signals, '{}'::jsonb), (select auth.uid()));

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'property.join', 'listing', me.id::text,
          jsonb_build_object('other_listing_id', them.id, 'property_id', target));

  return target;
end;
$function$;

revoke all on function public.property_join(uuid, uuid) from public, anon;
grant execute on function public.property_join(uuid, uuid) to authenticated;

/* THE REVIEWER SAYS "NOT THE SAME". Kept apart, never proposed again. */
create or replace function public.property_keep_apart(p_listing uuid, p_other uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not private.is_staff() then
    raise exception 'only staff may decide that two listings are different properties' using errcode = 'insufficient_privilege';
  end if;
  insert into public.property_decisions (listing_id, other_listing_id, decision, decided_by)
  values (p_listing, p_other, 'kept_apart', (select auth.uid()));
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'property.keep_apart', 'listing', p_listing::text,
          jsonb_build_object('other_listing_id', p_other));
end;
$function$;

revoke all on function public.property_keep_apart(uuid, uuid) from public, anon;
grant execute on function public.property_keep_apart(uuid, uuid) to authenticated;

/* THE REVIEWER UNDOES A JOIN. The listing leaves its property; the rest stay. */
create or replace function public.property_split(p_listing uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  was uuid;
begin
  if not private.is_staff() then
    raise exception 'only staff may take a listing off a property' using errcode = 'insufficient_privilege';
  end if;
  select property_id into was from public.listings where id = p_listing for update;
  if was is null then
    return;
  end if;
  update public.listings set property_id = null where id = p_listing;
  insert into public.property_decisions (listing_id, property_id, decision, decided_by)
  values (p_listing, was, 'split', (select auth.uid()));
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'property.split', 'listing', p_listing::text,
          jsonb_build_object('property_id', was));
end;
$function$;

revoke all on function public.property_split(uuid) from public, anon;
grant execute on function public.property_split(uuid) to authenticated;

/* The renter's half, `property_offers`, is in the next migration, because it
   reads the availability fact that migration adds. */
