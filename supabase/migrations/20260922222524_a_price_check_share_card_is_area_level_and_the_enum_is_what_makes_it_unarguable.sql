-- PRICE CHECK, STAGE ONE: the share rule, made unarguable in the schema, and
-- the notify me that turns a refusal into the only useful thing a refusal can
-- be.
--
-- docs/HANDOFF_09_THE_DIRECT_PLATFORM.md 5.3 and 5.4, and
-- docs/research/VALUATION_ENGINE_RESEARCH.md 4.2.3 and 5.8.
--
-- ===========================================================================
-- 1. THE SHARE RULE, WHICH IS ABSOLUTE.
-- ===========================================================================
--
-- NO SHARE ARTEFACT EVER CARRIES A SPECIFIC ADDRESS. Not for anybody. Not for
-- a person who has claimed and proven the property.
--
-- The earlier draft allowed a proven owner to share their own address. That
-- was wrong three times over. Ownership is not occupancy, so the person
-- actually at risk is the tenant, who consented to nothing. Proof of ownership
-- is either slow or weak. And cards are forwarded far past the circle they
-- were shared into. Against 7,825 Nigerians kidnapped between July 2025 and
-- June 2026, up sixty six per cent, an address beside a naira figure is a
-- target selection document.
--
-- A SPECIFIC PROPERTY IS SHARED IN EXACTLY ONE WAY: BY PUBLISHING IT AS A
-- LISTING. That door already exists, it is consented to, and it is somebody's
-- own decision about their own property.
--
-- ENFORCED THE WAY THIS CODEBASE ALREADY ENFORCED THE NEIGHBOURING RULE.
-- `public.event_venue_kind` has no value for a private residence, and its
-- comment says the enum is what makes it unarguable rather than a policy
-- somebody has to remember. So: `public.price_check_share_scope` HAS NO VALUE
-- FOR A PROPERTY. There are two labels and both of them describe a
-- neighbourhood. A future commit that wants to share one building has to add
-- an enum label and write down why, in a migration, with its name on it.
--
-- The table then carries no address column, no coordinate and no listing id,
-- and a check constraint refuses an `area` string that opens with a house
-- number, because the one way an address can still arrive is inside the free
-- text of a neighbourhood name.
--
-- ===========================================================================
-- 2. RULE 21, BORN LOCKED. Both SECURITY DEFINER functions below revoke
-- EXECUTE from `public`, `anon` and `authenticated` in this same migration,
-- restated under each `create or replace` rather than inherited.

-- ---------------------------------------------------------------------------
-- 1. The enum with no property in it.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typname = 'price_check_share_scope'
  ) then
    create type public.price_check_share_scope as enum ('area', 'area_and_type');
  end if;
end $$;

comment on type public.price_check_share_scope is
  'What a Price Check share card may be about. THERE IS NO VALUE FOR A SINGLE
   PROPERTY AND THERE MAY NOT BE ONE. "area" is a neighbourhood; "area_and_type"
   is a neighbourhood plus a property type and bedroom count ("three bed flats
   in Lekki Phase 1"). The enum is what makes the rule unarguable rather than a
   policy somebody has to remember, in the manner of public.event_venue_kind,
   which has no value for a private residence for the same reason. A specific
   property is shared by publishing it as a listing, and in no other way.';

-- ---------------------------------------------------------------------------
-- 2. The share artefact.
-- ---------------------------------------------------------------------------

create table if not exists public.price_check_shares (
  id            uuid primary key default extensions.gen_random_uuid(),
  -- Null for a share made by somebody signed out. The card is about a
  -- neighbourhood, so it belongs to nobody in particular.
  created_by    uuid references auth.users (id) on delete set null,
  scope         public.price_check_share_scope not null,

  -- WHERE. A state, a local government and a neighbourhood NAME. Nothing
  -- finer exists on this table and nothing finer may be added to it: there is
  -- no address column, no latitude, no longitude, no geography and no
  -- listing_id, and the absence is the enforcement.
  state_code    text not null references public.states (code),
  lga_code      text references public.local_governments (code),
  area          text check (area is null or char_length(btrim(area)) between 2 and 80),

  -- WHAT. Only set on an 'area_and_type' card.
  property_type  public.property_type,
  listing_intent public.listing_intent not null,
  bedrooms       integer check (bedrooms is null or (bedrooms >= 0 and bedrooms <= 30)),

  -- THE FIGURES, in integer kobo, and they are ASKING prices. A card is a
  -- claim, so a refused check produces no card at all: the three figures are
  -- NOT NULL and there is no way to write a row without them.
  low_minor     bigint not null check (low_minor > 0),
  mid_minor     bigint not null check (mid_minor > 0),
  high_minor    bigint not null check (high_minor > 0),
  listing_count integer not null check (listing_count >= 3),
  oldest_at     timestamptz,
  newest_at     timestamptz,

  created_at    timestamptz not null default now(),

  -- The range has to be a range.
  constraint price_check_shares_range_ordered
    check (low_minor <= mid_minor and mid_minor <= high_minor),
  -- A typed card names a type and an untyped one does not.
  constraint price_check_shares_type_matches_scope
    check (
      (scope = 'area' and property_type is null and bedrooms is null)
      or (scope = 'area_and_type' and property_type is not null)
    ),
  /*
   * THE LAST DOOR AN ADDRESS COULD COME THROUGH. `area` is free text, and the
   * one way a street address still reaches a card is somebody typing "14
   * Bourdillon Road" into a neighbourhood field. A leading house number, with
   * or without "No.", is refused. It is a narrow rule on purpose: it catches
   * the shape an address actually has in Nigeria and it does not refuse
   * "1004 Estate" or "Phase 2", which are neighbourhoods whose names contain
   * digits, because those digits are not followed by a street.
   */
  constraint price_check_shares_area_is_not_an_address
    check (
      area is null
      or btrim(area) !~* '^(no\.?|number)?\s*[0-9]+[a-z]?[\s,/-]+\S'
    )
);

comment on table public.price_check_shares is
  'A Price Check share card. AREA LEVEL AND TYPE LEVEL, NEVER A PROPERTY: the
   scope enum has no label for one, there is no address, coordinate or
   listing_id column, and a check refuses an area string that opens like a
   street address. "Three bed apartments in this area are asking N82m to N95m."
   The figures are ASKING prices from live Vallo listings and are never sold
   prices, because nobody publishes sold prices in Nigeria. NOT NULL on all
   three figures, so a refused check cannot produce a card: an image is a claim
   and a refusal has nothing to claim.';

comment on column public.price_check_shares.area is
  'A neighbourhood NAME, as an agent typed it on a listing. Not an address and
   never an address: price_check_shares_area_is_not_an_address refuses a
   leading house number, which is the one shape that could still arrive here.';

create index if not exists price_check_shares_place_idx
  on public.price_check_shares (state_code, lga_code, created_at desc);

alter table public.price_check_shares enable row level security;

/*
 * A card is meant to be opened by whoever it was sent to, including somebody
 * with no account, so the read is open. It discloses a neighbourhood, a
 * property type and three asking figures, every one of which a reader could
 * already assemble from the search page one listing at a time.
 *
 * The WRITE is not open. There is no insert, update or delete policy for any
 * role, so the only writer is the definer function below and the only shape a
 * row can take is the shape that function gives it.
 */
drop policy if exists price_check_shares_read on public.price_check_shares;
create policy price_check_shares_read
  on public.price_check_shares
  for select
  using (true);

revoke all on table public.price_check_shares from anon, authenticated;
grant select on table public.price_check_shares to anon, authenticated;
grant all on table public.price_check_shares to service_role;

-- ---------------------------------------------------------------------------
-- 3. The only way a card is made.
-- ---------------------------------------------------------------------------

create or replace function public.create_price_check_share(
  p_scope          public.price_check_share_scope,
  p_state_code     text,
  p_lga_code       text,
  p_area           text,
  p_property_type  public.property_type,
  p_listing_intent public.listing_intent,
  p_bedrooms       integer,
  p_low_minor      bigint,
  p_mid_minor      bigint,
  p_high_minor     bigint,
  p_listing_count  integer,
  p_oldest_at      timestamptz default null,
  p_newest_at      timestamptz default null,
  p_created_by     uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_id uuid;
begin
  /*
   * The figures are not trusted from the caller's memory of a screen. They are
   * only ever the caller's copy of what `area_asking_summary` returned, and
   * the constraints on the table are what stop a card being minted from
   * nothing: three positive figures in order and at least three listings
   * behind them, which is the area report's own floor.
   */
  insert into public.price_check_shares (
    created_by, scope, state_code, lga_code, area,
    property_type, listing_intent, bedrooms,
    low_minor, mid_minor, high_minor, listing_count, oldest_at, newest_at
  )
  values (
    p_created_by, p_scope, p_state_code, nullif(btrim(coalesce(p_lga_code, '')), ''),
    nullif(btrim(coalesce(p_area, '')), ''),
    p_property_type, p_listing_intent, p_bedrooms,
    p_low_minor, p_mid_minor, p_high_minor, p_listing_count, p_oldest_at, p_newest_at
  )
  returning id into new_id;

  return new_id;
end;
$function$;

comment on function public.create_price_check_share(public.price_check_share_scope, text, text, text, public.property_type, public.listing_intent, integer, bigint, bigint, bigint, integer, timestamptz, timestamptz, uuid) is
  'Mints one area level share card. It has no parameter for an address, a
   coordinate or a listing id, so the rule is kept by the signature as well as
   by the table. BORN LOCKED per rule 21: service_role only, reached through a
   server action that has already read area_asking_summary itself.';

revoke execute on function public.create_price_check_share(public.price_check_share_scope, text, text, text, public.property_type, public.listing_intent, integer, bigint, bigint, bigint, integer, timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.create_price_check_share(public.price_check_share_scope, text, text, text, public.property_type, public.listing_intent, integer, bigint, bigint, bigint, integer, timestamptz, timestamptz, uuid) to service_role;

-- ===========================================================================
-- 4. NOTIFY ME, which is what a refusal is actually for.
-- ===========================================================================

/*
 * Price Check is the only feature on this platform that is useful in an area
 * where we have nothing, and a refusal plus a notify me is a complete honest
 * experience that also hands us a geocoded demand signal telling us where to
 * go and recruit supply.
 *
 * THE POINT IS ROUNDED TO THREE DECIMAL PLACES AND THAT IS THE PRIVACY
 * POSITION, not a rounding for tidiness. Three decimals is about 110 metres at
 * Nigerian latitudes: fine enough that the 750 / 1500 / 3000 metre ladder
 * behaves identically, coarse enough that the row does not name a building.
 * `numeric(9,3)` enforces the scale in the column type, so a caller that
 * passes full precision is stored coarse rather than reviewed by a person.
 *
 * This is a different decision from `price_check_events`, which holds no point
 * at all. The difference is the purpose: an analytics row exists to be counted
 * in aggregate and needs nothing finer than a 5 km cell, while a watch exists
 * to be re-evaluated against the same gate the person ran and has to be able
 * to run it.
 */
create table if not exists public.price_check_watches (
  id            uuid primary key default extensions.gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,

  lat           numeric(9,3) not null check (lat between -90 and 90),
  lng           numeric(9,3) not null check (lng between -180 and 180),
  state_code    text references public.states (code),
  lga_code      text references public.local_governments (code),
  area          text check (area is null or char_length(btrim(area)) between 2 and 80),

  property_type  public.property_type not null,
  listing_intent public.listing_intent not null,
  bedrooms       integer check (bedrooms is null or (bedrooms >= 0 and bedrooms <= 30)),

  -- Set the moment the gate first opens at this point. Nulled by nothing: a
  -- watch is answered once and then stops being checked.
  answered_at   timestamptz,
  notified_at   timestamptz,
  checked_at    timestamptz,
  created_at    timestamptz not null default now(),

  -- One watch per person per place and shape. A second tap on the same
  -- refusal is the same watch, not a second notification.
  constraint price_check_watches_unique
    unique (user_id, lat, lng, property_type, listing_intent, bedrooms)
);

comment on table public.price_check_watches is
  'Tell me when you can answer. One row per person per point, property type,
   intent and bedroom count. The point is held at three decimal places, about
   110 metres, which runs the same gate and names no building. NO ADDRESS AND
   NO FREE TEXT HINT is stored here: the hint a person types on the address
   ladder is theirs and is never parsed, never matched on and never persisted.
   Owner only, plus the sweep.';

create index if not exists price_check_watches_pending_idx
  on public.price_check_watches (checked_at nulls first)
  where answered_at is null;

alter table public.price_check_watches enable row level security;

drop policy if exists price_check_watches_own on public.price_check_watches;
create policy price_check_watches_own
  on public.price_check_watches
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.price_check_watches from anon, authenticated;
grant select, insert, delete on table public.price_check_watches to authenticated;
grant all on table public.price_check_watches to service_role;

/*
 * THE SWEEP, AND WHY IT ONLY EVER WRITES AN IN-PRODUCT NOTIFICATION.
 *
 * `private.notify` writes a row the notifications screen already reads, so a
 * signed-in watcher is told through machinery that exists and works today. An
 * email to a signed-out watcher would need an outbox this database does not
 * have, so a signed-out reader is NOT offered a promise: the refusal screen
 * asks them to sign in first, and the copy never says an email is coming.
 * That is why this table's `user_id` is NOT NULL and carries no email column.
 */
create or replace function private.sweep_price_check_watches()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  w       record;
  verdict record;
  told    integer := 0;
begin
  for w in
    select * from public.price_check_watches
     where answered_at is null
     order by checked_at nulls first
     limit 500
  loop
    select * into verdict
      from public.estimate_value(
             w.lat::double precision, w.lng::double precision,
             w.property_type, w.listing_intent, w.bedrooms, null, null);

    update public.price_check_watches
       set checked_at = now()
     where id = w.id;

    if verdict.outcome = 'answered' then
      update public.price_check_watches
         set answered_at = now(), notified_at = now()
       where id = w.id;

      perform private.notify(
        w.user_id, 'system',
        'We can answer your price check now',
        'There are enough listings near the place you asked about for us to say what properties there are asking.',
        '/price'
      );
      told := told + 1;
    end if;
  end loop;

  return told;
end;
$function$;

comment on function private.sweep_price_check_watches() is
  'Re-runs the gate at each pending watch point and tells the watcher the first
   time it opens. One notification per watch, ever: answered_at is set in the
   same statement, so a watch cannot be announced twice. It never writes a
   figure into the notification, because the figure belongs on the screen with
   its basis line and its disclaimer beside it.';

revoke execute on function private.sweep_price_check_watches() from public, anon, authenticated;
grant execute on function private.sweep_price_check_watches() to service_role;

/*
 * 05:50 UTC, 06:50 in Lagos, on a minute no other job on this estate uses.
 * Daily rather than hourly: supply arrives in days, and a person who asked
 * about an empty neighbourhood is not waiting by the phone.
 */
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
      from cron.job where jobname = 'vallo_sweep_price_check_watches';
    perform cron.schedule(
      'vallo_sweep_price_check_watches',
      '50 5 * * *',
      $job$select private.sweep_price_check_watches();$job$
    );
  end if;
end $$;
