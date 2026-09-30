-- C5: A LISTER CONFIRMS "STILL AVAILABLE", ONE LISTING OR MANY (30 September 2026).
--
-- WAITS FOR THE LEAD'S REVIEW. Adds one nullable column and one function.
-- Rewrites no row, drops nothing, changes no existing policy or function;
-- safe to run twice.
--
-- WHY. Nothing asks an agent to confirm their stock (RECS_C C5), so a let flat
-- stays in search until a renter finds out. `availability_confirmed_at`
-- already exists but means OWNER CONFIRMED: it is written only by the
-- principal's own answer (lib/landlord/facts.ts), and a renter is told "Owner
-- confirmed available". An agent's tap must never write it, so the lister's
-- confirmation is its own column.
--
-- WHAT.
--   * `public.listings.lister_confirmed_at timestamptz` (null = never).
--   * `public.lister_confirm_available(p_listings uuid[])`: for the CALLER'S
--     OWN live listings only (agents.user_id = auth.uid(), status PUBLISHED),
--     sets lister_confirmed_at = now(). Anything else in the list is ignored,
--     not an error. At most 200 ids a call. Returns how many were confirmed.
--     One audit row per call, `listing.lister_confirmed`, with the count.
--
-- Not decided here (the founder's decision, RECS_C C5): whether an
-- unconfirmed listing is demoted or hidden after N days. This only records.
--
-- The app degrades gracefully: until this is applied the agent's "Confirm
-- still available" says it is not switched on yet and the home card is not
-- drawn (apps/web/src/lib/agent/freshness-actions.ts, freshness-read.ts).
--
-- AFTER APPLYING: move this file up into supabase/migrations/ and record it
-- (`node scripts/check-migrations.mjs --record <file>`).

alter table public.listings add column if not exists lister_confirmed_at timestamptz;

comment on column public.listings.lister_confirmed_at is
  'C5: when the lister (agent, host) last confirmed this live listing is still available. NOT the owner''s confirmation, which is availability_confirmed_at.';

-- Since S1 (20260929123603) members read listings through a column list, so a
-- new column is unreadable until granted, and PostgREST refuses the WHOLE read
-- that names it: the agent dashboard's freshness read (freshness-read.ts, the
-- caller's own client) would fail every time. A confirmation date is not a
-- private fact, so it joins the public columns for signed-in members.
grant select (lister_confirmed_at) on public.listings to authenticated;

-- THE HOLD (review, 30 September): members hold table-wide insert and update
-- on listings, so a lister could write lister_confirmed_at directly (2099, on
-- a draft) and bypass the function below. The column joins the platform facts
-- the existing guard already protects: reset on a member's insert, refused on
-- a member's update. The function below is SECURITY DEFINER, so it runs as
-- its owner, not as `authenticated`, and passes the guard's own test
-- (`current_user not in ('authenticated', 'anon')`), exactly as the landlord
-- line's writer of availability_confirmed_at does. The body is the live
-- definition read on 30 September plus the two lister_confirmed_at lines.
create or replace function private.listing_platform_facts_guard()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.property_id := null;
    new.availability_confirmed_at := null;
    new.not_reconfirmed_since := null;
    new.closed_at := null;
    new.close_reason := null;
    new.closed_rent_payment_id := null;
    new.lister_confirmed_at := null;
    return new;
  end if;
  if new.property_id is distinct from old.property_id
     or new.availability_confirmed_at is distinct from old.availability_confirmed_at
     or new.not_reconfirmed_since is distinct from old.not_reconfirmed_since
     or new.closed_at is distinct from old.closed_at
     or new.close_reason is distinct from old.close_reason
     or new.closed_rent_payment_id is distinct from old.closed_rent_payment_id
     or new.lister_confirmed_at is distinct from old.lister_confirmed_at then
    raise exception 'these facts are written by the platform, never by editing a listing'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;

create or replace function public.lister_confirm_available(p_listings uuid[])
returns integer
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  actor     uuid := (select auth.uid());
  confirmed integer := 0;
begin
  if actor is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  if p_listings is null or cardinality(p_listings) = 0 then
    return 0;
  end if;
  if cardinality(p_listings) > 200 then
    raise exception 'at most 200 listings at a time' using errcode = '22023';
  end if;

  update public.listings l
     set lister_confirmed_at = now()
    from public.agents a
   where l.id = any (p_listings)
     and l.agent_id = a.id
     and a.user_id = actor
     and l.status = 'PUBLISHED';
  get diagnostics confirmed = row_count;

  if confirmed > 0 then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'listing.lister_confirmed', 'listing', null, jsonb_build_object('count', confirmed));
  end if;

  return confirmed;
end;
$function$;

revoke all on function public.lister_confirm_available(uuid[]) from public, anon;
grant execute on function public.lister_confirm_available(uuid[]) to authenticated;

-- READ-BACK: raise if anything above did not land.
do $check$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'listings' and column_name = 'lister_confirmed_at') then
    raise exception 'listings.lister_confirmed_at missing';
  end if;
  if not has_column_privilege('authenticated', 'public.listings', 'lister_confirmed_at', 'select') then
    raise exception 'a member cannot read listings.lister_confirmed_at';
  end if;
  if to_regprocedure('public.lister_confirm_available(uuid[])') is null then
    raise exception 'lister_confirm_available missing';
  end if;
  if has_function_privilege('anon', 'public.lister_confirm_available(uuid[])', 'execute') then
    raise exception 'lister_confirm_available is callable by anon';
  end if;
end;
$check$;

-- READ-BACK, BEHAVIOURAL: a member writing lister_confirmed_at directly on
-- their OWN listing is refused by the guard. Run as `authenticated` with the
-- owner's claims so RLS lets the row through and only the guard can stop it.
-- The write is undone either way (the inner block always ends in an
-- exception). Skipped, with a notice, when no listing has an owner.
do $probe$
declare
  v_listing uuid;
  v_user    uuid;
  refused   boolean := false;
  touched   boolean := false;
begin
  -- Only a listing its owner may still edit proves THIS guard: on a reviewed
  -- listing listings_00_guard_owner_write refuses first with the same errcode,
  -- so the refusal must also carry this guard's own sentence (review fix).
  select l.id, a.user_id into v_listing, v_user
    from public.listings l join public.agents a on a.id = l.agent_id
   where a.user_id is not null
     and l.status in ('DRAFT', 'MORE_INFO_REQUIRED', 'REJECTED')
     and l.closed_at is null
   limit 1;
  if v_listing is null then
    raise notice 'C5 probe skipped: no editable listing with an owner';
    return;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.listings set lister_confirmed_at = '2099-01-01'::timestamptz where id = v_listing;
    touched := found;
    raise exception 'c5_probe_undo';
  exception
    when insufficient_privilege then
      refused := sqlerrm like 'these facts are written by the platform%';
    when raise_exception then refused := false;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  if not refused then
    raise exception 'C5 guard: a member''s direct write of lister_confirmed_at was not refused (row reached: %)', touched;
  end if;
end;
$probe$;
