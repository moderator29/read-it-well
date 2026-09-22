-- PRICE CHECK, STAGE ONE: the instrumentation, and the column list IS the
-- privacy position.
--
-- docs/research/VALUATION_ENGINE_RESEARCH.md 6.4 and
-- docs/HANDOFF_09_THE_DIRECT_PLATFORM.md 5.6.
--
-- ---------------------------------------------------------------------------
-- WHY A TABLE AND NOT A PIXEL.
--
-- Nothing in this product counts a view. `lib/agent/analytics-queries.ts`
-- records that and refuses to publish a conversion rate for want of a
-- numerator, and `lib/observability/` is crash reporting with a scrubber
-- rather than product analytics. So every funnel number this feature needs has
-- to be built, and it is built here rather than bought, because a third-party
-- analytics pixel on a screen that processes an address and a financial
-- inference is a data protection problem in its own right. It stays on our own
-- rails.
--
-- ---------------------------------------------------------------------------
-- DELIBERATELY NOT A POINT, AND DELIBERATELY NOT AN ADDRESS.
--
-- There is no `lat`, no `lng`, no `address`, no free-text hint and no
-- `location` column in this table, and there never may be. What there is
-- instead is `geohash5`: a five character geohash cell, roughly 5 km by 5 km
-- at Nigerian latitudes, which answers every question this table exists to
-- answer (where are people asking, where is demand outrunning supply, which
-- areas should we recruit in) and cannot be walked back to a building.
--
-- Against 7,825 Nigerians kidnapped between July 2025 and June 2026, an
-- address beside a naira figure is a target selection document. Section 4.2 of
-- the research file is not a paragraph in a policy; it is this column list.
--
-- The constraint below refuses anything that is not exactly five characters
-- from the geohash alphabet, so a caller that "temporarily" writes a longer,
-- finer cell is refused by the database rather than reviewed by a person.
--
-- ---------------------------------------------------------------------------
-- RULE 21, BORN LOCKED. `public.record_price_check_event` is SECURITY DEFINER
-- and EXECUTE is revoked from `public`, `anon` and `authenticated` in this
-- same migration, restated below the `create or replace` rather than inherited
-- from a previous one. The web app records a stage through a server action
-- holding the service-role client. A browser can never reach this function and
-- can never read anybody's row, including its own.

-- ---------------------------------------------------------------------------
-- 1. The table.
-- ---------------------------------------------------------------------------

create table if not exists public.price_check_events (
  id             uuid primary key default extensions.gen_random_uuid(),
  -- Null for a signed-out check. Never backfilled from a later sign-in: a row
  -- written by a stranger stays a row written by a stranger.
  user_id        uuid references auth.users (id) on delete set null,
  -- One row per stage of one check, so the stages of one check join to each
  -- other without any of them joining to a person.
  check_id       uuid not null,
  stage          text not null check (stage in (
                   'reach','start','submit','outcome','intent','convert','supply')),
  entry_point    text check (entry_point is null or char_length(entry_point) <= 40),
  state_code     text references public.states (code),
  lga_code       text references public.local_governments (code),
  -- DELIBERATELY NOT lat/lng. See the header.
  geohash5       text check (geohash5 is null or geohash5 ~ '^[0-9bcdefghjkmnpqrstuvwxyz]{5}$'),
  property_type  public.property_type,
  listing_intent public.listing_intent,
  bedrooms       integer check (bedrooms is null or (bedrooms >= 0 and bedrooms <= 30)),
  size_stated    boolean,
  outcome        text check (outcome is null or outcome in ('answered','refused')),
  refusal_code   text check (refusal_code is null or char_length(refusal_code) <= 40),
  comparable_count integer,
  radius_m       integer,
  dispersion     numeric,
  confidence     text check (confidence is null or confidence in ('low','medium','high')),
  intent_chosen  text check (intent_chosen is null or char_length(intent_chosen) <= 40),
  listing_id     uuid references public.listings (id) on delete set null,
  created_at     timestamptz not null default now()
);

comment on table public.price_check_events is
  'One row per stage of one price check. Location is a five character geohash
   and never a point, because every question this table exists to answer is
   answerable at roughly five kilometres and none of them is worth holding a
   building for. NO ADDRESS, NO FREE TEXT HINT AND NO COORDINATE IS EVER
   WRITTEN HERE, and the absence of those columns is the enforcement rather
   than a rule somebody has to remember. Admin read only. Swept at 24 months
   by private.sweep_price_check_events.';

comment on column public.price_check_events.geohash5 is
  'A five character geohash cell, roughly 5 km across at Nigerian latitudes.
   The check refuses anything that is not exactly five characters of the
   geohash alphabet, so a finer cell cannot be written by a caller that means
   well.';

comment on column public.price_check_events.check_id is
  'Groups the stages of one check. Minted by the client per check and never
   persisted anywhere a person is identified, so a funnel can be counted
   without a funnel being attributed.';

create index if not exists price_check_events_check_idx
  on public.price_check_events (check_id, created_at);
create index if not exists price_check_events_place_idx
  on public.price_check_events (state_code, lga_code, created_at desc);
create index if not exists price_check_events_stage_idx
  on public.price_check_events (stage, created_at desc);
-- The retention sweep reads by age alone and nothing else does.
create index if not exists price_check_events_created_idx
  on public.price_check_events (created_at);

-- ---------------------------------------------------------------------------
-- 2. Nobody reads this but an admin, and nobody writes it but the server.
-- ---------------------------------------------------------------------------

alter table public.price_check_events enable row level security;

/*
 * No policy for insert, update or delete at all, for any role. The only writer
 * is `record_price_check_event`, which is SECURITY DEFINER and therefore runs
 * as its owner, and the only deleter is the retention sweep. A table whose
 * write path is one function is a table whose write path can be read in one
 * place.
 */
drop policy if exists price_check_events_admin_read on public.price_check_events;
create policy price_check_events_admin_read
  on public.price_check_events
  for select
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

-- Not even a column-list grant. A signed-out or signed-in reader has no read
-- on this table at any width, so the policy above is the only door and it
-- opens for two roles.
revoke all on table public.price_check_events from anon, authenticated;
grant select on table public.price_check_events to authenticated;
grant all on table public.price_check_events to service_role;

-- ---------------------------------------------------------------------------
-- 3. The one writer.
-- ---------------------------------------------------------------------------

create or replace function public.record_price_check_event(
  p_check_id       uuid,
  p_stage          text,
  p_user_id        uuid default null,
  p_entry_point    text default null,
  p_state_code     text default null,
  p_lga_code       text default null,
  p_geohash5       text default null,
  p_property_type  public.property_type default null,
  p_listing_intent public.listing_intent default null,
  p_bedrooms       integer default null,
  p_size_stated    boolean default null,
  p_outcome        text default null,
  p_refusal_code   text default null,
  p_comparable_count integer default null,
  p_radius_m       integer default null,
  p_dispersion     numeric default null,
  p_confidence     text default null,
  p_intent_chosen  text default null,
  p_listing_id     uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_check_id is null or p_stage is null then
    return;
  end if;

  /*
   * THE GEOHASH IS TRUNCATED HERE AS WELL AS CHECKED, and the two are not the
   * same guard. The check constraint refuses a six character cell, which is
   * the right answer for a caller that has been changed carelessly. This
   * truncation is for the caller that computes a finer cell correctly and
   * passes it by mistake: the row is still written, at the coarseness this
   * table promises, rather than the whole stage being lost. Lower case,
   * because the geohash alphabet is lower case and a case difference would
   * split one cell into two in every count.
   */
  insert into public.price_check_events (
    user_id, check_id, stage, entry_point, state_code, lga_code, geohash5,
    property_type, listing_intent, bedrooms, size_stated, outcome,
    refusal_code, comparable_count, radius_m, dispersion, confidence,
    intent_chosen, listing_id
  )
  values (
    p_user_id, p_check_id, p_stage, p_entry_point, p_state_code, p_lga_code,
    nullif(lower(left(btrim(coalesce(p_geohash5, '')), 5)), ''),
    p_property_type, p_listing_intent, p_bedrooms, p_size_stated, p_outcome,
    p_refusal_code, p_comparable_count, p_radius_m, p_dispersion, p_confidence,
    p_intent_chosen, p_listing_id
  );
end;
$function$;

comment on function public.record_price_check_event(uuid, text, uuid, text, text, text, text, public.property_type, public.listing_intent, integer, boolean, text, text, integer, integer, numeric, text, text, uuid) is
  'Writes one stage of one price check and returns nothing, so a caller can
   record and can never read. It takes a five character geohash and has no
   parameter for a coordinate, an address or a free text hint. SECURITY
   DEFINER because the table has no insert policy for anybody; BORN LOCKED per
   rule 21, so only service_role may call it and the web app reaches it through
   a server action holding the service-role client.';

-- RULE 21, restated on this `create or replace` rather than inherited.
revoke execute on function public.record_price_check_event(uuid, text, uuid, text, text, text, text, public.property_type, public.listing_intent, integer, boolean, text, text, integer, integer, numeric, text, text, uuid) from public, anon, authenticated;
grant execute on function public.record_price_check_event(uuid, text, uuid, text, text, text, text, public.property_type, public.listing_intent, integer, boolean, text, text, integer, integer, numeric, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Twenty four months, swept by the machinery that already exists.
-- ---------------------------------------------------------------------------

create or replace function private.sweep_price_check_events()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  removed integer;
begin
  delete from public.price_check_events
   where created_at < now() - interval '24 months';
  get diagnostics removed = row_count;
  return removed;
end;
$function$;

comment on function private.sweep_price_check_events() is
  'The 24 month retention named in docs/RETENTION_SCHEDULE.md, run rather than
   written down. A retention period nothing enforces is a sentence in a policy.';

-- RULE 21. `private` is not in any client role's search path, and that is not
-- a grant: the revoke is stated.
revoke execute on function private.sweep_price_check_events() from public, anon, authenticated;
grant execute on function private.sweep_price_check_events() to service_role;

/*
 * 03:40 UTC, which is 04:40 in Lagos, and on a minute nothing else in
 * `cron.job` is using: the four daily jobs on this estate sit at 02:10, 02:20,
 * 05:20 and 06:00. Idempotent, so re-running this migration leaves one job
 * rather than two.
 */
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname)
      from cron.job where jobname = 'vallo_sweep_price_check_events';
    perform cron.schedule(
      'vallo_sweep_price_check_events',
      '40 3 * * *',
      $job$select private.sweep_price_check_events();$job$
    );
  end if;
end $$;
