-- V-07: THE SHARE DOOR. A PUBLIC CARD FOR A GATED LISTING, AND IT CANNOT CARRY
-- AN ADDRESS.
--
-- WHY THIS EXISTS. Under the 23 September ruling nothing inside the platform is
-- visible signed out, so every listing anybody shares unfurls on WhatsApp as
-- "Sign in | Vallo". The listing is correctly gated; the share is dead. A door
-- is the answer the ruling already allows: `sign-in` and `welcome` are doors,
-- public pages whose only purpose is to lead somebody inside with a `next`.
-- `/s/<token>` is one more of them. It shows ONE card and one button, and the
-- same card to a person and to a link unfurler, because serving machines
-- something humans are refused is cloaking.
--
-- WHAT THE CARD MAY SAY IS DECIDED HERE, BY CONSTRUCTION, NOT BY A CALLER'S
-- MANNERS. `public.share_door` is the only reader and it returns a fixed row
-- type whose columns are the card: title, area, city, state name, the move-in
-- lines, the first photo's storage path, the listing code and the example
-- flag. There is no address, landmark, latitude, longitude, location, estate
-- name, lister id or lister contact column in that type, so no caller of this
-- function can receive one however it is called. `share_links` itself is
-- unreadable to every client role (RLS on, no select policy, no select grant),
-- so the token table cannot be walked either. The probe for this migration
-- inserts a listing WITH an address and a landmark, opens its door and fails
-- unless neither string appears anywhere in what came back.
--
-- AN EXAMPLE LISTING GETS A DOOR AND NO FIGURES. `lib/listings/syndication.ts`
-- is the rule: an example is never handed to anything that republishes it
-- with a title, a place or a price. The function blanks all three for an
-- example row HERE rather than trusting the page to, so the image route and
-- the page cannot disagree about it.
--
-- NO SHARER NAME, AND NO RECORD OF WHO OPENED IT. `created_by` exists so the
-- sharer can revoke their own door and so a flood can be traced by an
-- operator; it is never returned. `opens` is a bare counter: no viewer id, no
-- IP, no user agent.
--
-- THE LISTING CODE AT THE DOOR (V-08) IS FLAGGED OFF. `/s/VL-7K4MQP` resolves a
-- painted TO LET board to the same card, which makes every published
-- listing's card reachable by code rather than only the ones a member chose to
-- share. That is a founder decision (question 12), so the code branch below
-- answers nothing unless `feature_flags.listing_board` exists and says true.
-- A missing row is off.

create table if not exists public.share_links (
  token       text primary key
              check (token ~ '^[23456789abcdefghjkmnpqrstvwxyz]{10}$'),
  kind        text not null check (kind in ('listing', 'price_area')),
  target_id   uuid not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  opens       integer not null default 0 check (opens >= 0)
);

comment on table public.share_links is
  'V-07 share doors. One opaque ten character token per (sharer, kind, target). Unreadable to clients: the door reads through public.share_door, which returns only the card projection and can never return an address, coordinates or a lister contact. opens is a bare counter; nothing records who opened a door.';
comment on column public.share_links.created_by is
  'The sharer, so they can revoke their own door. NEVER returned by the door and never shown on the card.';

create unique index if not exists share_links_one_live_per_sharer
  on public.share_links (created_by, kind, target_id) where revoked_at is null;
create index if not exists share_links_target_idx on public.share_links (kind, target_id);

alter table public.share_links enable row level security;
revoke all on public.share_links from public, anon, authenticated;
grant all on public.share_links to service_role;
-- No policy for anon or authenticated, deliberately: every read and write goes
-- through the three functions below.

insert into public.feature_flags (key, enabled, note)
values ('listing_board', false,
        'V-08 the code on the gate. Off until the founder rules on TO LET boards (question 12). When on, /s/VL-XXXXXX resolves a listing code to its share door and the workspace offers the board.')
on conflict (key) do nothing;

/* ------------------------------------------------------------ the minting */

create or replace function public.create_share_link(p_kind text, p_target uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
  existing text;
  minted text;
  alphabet constant text := '23456789abcdefghjkmnpqrstvwxyz';
  bytes bytea;
  i integer;
  attempt integer := 0;
begin
  if caller is null then
    raise exception 'sign in to share' using errcode = '42501';
  end if;
  if p_kind not in ('listing', 'price_area') then
    raise exception 'unknown share kind' using errcode = '22023';
  end if;

  -- A door only for something a stranger may be told about at all: a
  -- published listing, or a price check card that exists.
  if p_kind = 'listing' and not exists (
    select 1 from public.listings l
     where l.id = p_target and l.status = 'PUBLISHED'::public.listing_status
  ) then
    raise exception 'that listing is not published' using errcode = '22023';
  end if;
  if p_kind = 'price_area' and not exists (
    select 1 from public.price_check_shares s where s.id = p_target
  ) then
    raise exception 'that card does not exist' using errcode = '22023';
  end if;

  -- Sharing the same thing twice is the same door, so a counter means
  -- something and a sharer is not minting a new public URL per tap.
  select sl.token into existing
    from public.share_links sl
   where sl.created_by = caller and sl.kind = p_kind and sl.target_id = p_target
     and sl.revoked_at is null;
  if existing is not null then
    return existing;
  end if;

  loop
    attempt := attempt + 1;
    bytes := extensions.gen_random_bytes(10);
    minted := '';
    for i in 0..9 loop
      minted := minted || substr(alphabet, (get_byte(bytes, i) % 30) + 1, 1);
    end loop;
    begin
      insert into public.share_links (token, kind, target_id, created_by)
      values (minted, p_kind, p_target, caller);
      return minted;
    exception when unique_violation then
      -- Either the token collided (30^10, vanishingly rare) or a concurrent
      -- tap by the same sharer won the race; answer with whichever is live.
      select sl.token into existing
        from public.share_links sl
       where sl.created_by = caller and sl.kind = p_kind and sl.target_id = p_target
         and sl.revoked_at is null;
      if existing is not null then
        return existing;
      end if;
      if attempt >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$function$;

comment on function public.create_share_link(text, uuid) is
  'V-07. Mints (or returns the live) share door token for the caller. Signed in only. Listings must be published; price_area targets must be an existing price_check_shares row.';

create or replace function public.revoke_share_link(p_token text)
returns boolean
language sql
security definer
set search_path to ''
as $function$
  with gone as (
    update public.share_links sl
       set revoked_at = now()
     where sl.token = p_token
       and sl.created_by = (select auth.uid())
       and sl.revoked_at is null
    returning 1
  )
  select exists (select 1 from gone);
$function$;

comment on function public.revoke_share_link(text) is
  'V-07. The sharer closes their own door. Returns false for a token that is not theirs or already closed; it never says which.';

/* ------------------------------------------------------------- the reading */

-- THE ROW TYPE IS THE CARD. Read the column list: it is the whole rule.
create or replace function public.share_door(p_token text)
returns table (
  state                    text,     -- 'listing', 'price_area' or 'gone'
  listing_id               uuid,
  reference                text,
  is_demo                  boolean,
  title                    text,
  area                     text,
  city                     text,
  state_name               text,
  property_type            text,
  listing_intent           text,
  bedrooms                 integer,
  rent_amount_minor        bigint,
  rent_period              text,
  caution_deposit_minor    bigint,
  service_charge_minor     bigint,
  service_charge_period    text,
  agency_fee_minor         bigint,
  legal_fee_minor          bigint,
  agreement_fee_minor      bigint,
  total_move_in_cost_minor bigint,
  sale_price_minor         bigint,
  rate_minor               bigint,
  rate_period              text,
  photo_path               text,
  price_share_id           uuid
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  link_kind text;
  link_target uuid;
  wanted text := btrim(coalesce(p_token, ''));
  code text;
  target uuid;
  board_open boolean;
begin
  -- A listing code, at the door, only while the board flag says true.
  if upper(wanted) ~ '^VL-?[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$' then
    select coalesce((select f.enabled from public.feature_flags f where f.key = 'listing_board'), false)
      into board_open;
    if not board_open then
      return;
    end if;
    code := 'VL-' || right(regexp_replace(upper(wanted), '[^A-Z0-9]', '', 'g'), 6);
    select l.id into target from public.listings l where l.reference = code;
    if target is null then
      return;
    end if;
    link_kind := 'listing';
    link_target := target;
  else
    if wanted !~ '^[23456789abcdefghjkmnpqrstvwxyz]{10}$' then
      return;
    end if;
    select sl.kind, sl.target_id into link_kind, link_target
      from public.share_links sl
     where sl.token = wanted and sl.revoked_at is null;
    if not found then
      return;
    end if;
  end if;

  if link_kind = 'price_area' then
    return query
      select 'price_area'::text, null::uuid, null::text, false, null::text,
             null::text, null::text, null::text, null::text, null::text, null::integer,
             null::bigint, null::text, null::bigint, null::bigint, null::text,
             null::bigint, null::bigint, null::bigint, null::bigint, null::bigint,
             null::bigint, null::text, null::text, s.id
        from public.price_check_shares s
       where s.id = link_target;
    return;
  end if;

  -- An unpublished listing (withdrawn, suspended, let) answers "gone" and
  -- nothing else: no title, no place, no figure.
  if not exists (
    select 1 from public.listings l
     where l.id = link_target and l.status = 'PUBLISHED'::public.listing_status
  ) then
    return query
      select 'gone'::text, null::uuid, null::text, false, null::text,
             null::text, null::text, null::text, null::text, null::text, null::integer,
             null::bigint, null::text, null::bigint, null::bigint, null::text,
             null::bigint, null::bigint, null::bigint, null::bigint, null::bigint,
             null::bigint, null::text, null::text, null::uuid;
    return;
  end if;

  -- The only select on public.listings that feeds the card. Every column it
  -- names is on the card; for an example the title, place and every figure
  -- are blanked here, under the syndication rule.
  return query
    select 'listing'::text,
           l.id,
           l.reference,
           l.is_demo,
           case when l.is_demo then null else l.title end,
           case when l.is_demo then null else l.area end,
           case when l.is_demo then null else l.city end,
           case when l.is_demo then null else st.name end,
           l.property_type::text,
           l.listing_intent::text,
           case when l.is_demo then null else l.bedrooms end,
           case when l.is_demo then null else l.rent_amount_minor end,
           case when l.is_demo then null else l.rent_period::text end,
           case when l.is_demo then null else l.caution_deposit_minor end,
           case when l.is_demo then null else l.service_charge_minor end,
           case when l.is_demo then null else l.service_charge_period::text end,
           case when l.is_demo then null else l.agency_fee_minor end,
           case when l.is_demo then null else l.legal_fee_minor end,
           case when l.is_demo then null else l.agreement_fee_minor end,
           case when l.is_demo then null else l.total_move_in_cost_minor end,
           case when l.is_demo then null else l.sale_price_minor end,
           case when l.is_demo then null else l.rate_minor end,
           case when l.is_demo then null else l.rate_period::text end,
           case when l.is_demo then null else (
             select p.storage_path from public.listing_photos p
              where p.listing_id = l.id
              order by p.position asc, p.created_at asc
              limit 1)
           end,
           null::uuid
      from public.listings l
      left join public.states st on st.code = l.state_code
     where l.id = link_target;
end;
$function$;

comment on function public.share_door(text) is
  'V-07. The whole public projection of a share door. Its return type has no address, landmark, coordinate, location, estate, lister or contact column, so it cannot carry one. Examples come back with no title, place, photo or figure. VL- codes answer only while feature_flags.listing_board is true.';

create or replace function public.note_share_door_open(p_token text)
returns void
language sql
security definer
set search_path to ''
as $function$
  update public.share_links sl
     set opens = sl.opens + 1
   where sl.token = btrim(coalesce(p_token, ''))
     and sl.revoked_at is null;
$function$;

comment on function public.note_share_door_open(text) is
  'V-07. A bare counter on the door. Records nothing about who opened it.';

revoke all on function public.create_share_link(text, uuid) from public, anon;
revoke all on function public.revoke_share_link(text) from public, anon;
revoke all on function public.share_door(text) from public;
revoke all on function public.note_share_door_open(text) from public;
grant execute on function public.create_share_link(text, uuid) to authenticated;
grant execute on function public.revoke_share_link(text) to authenticated;
grant execute on function public.share_door(text) to anon, authenticated;
grant execute on function public.note_share_door_open(text) to anon, authenticated;
