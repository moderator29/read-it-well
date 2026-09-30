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
