/*
 * EVERY NEW LISTING FROM THE AGENT CONSOLE WAS REFUSED, AND NOTHING SAID SO.
 *
 * `20260922230200_track_g_3` added `listings.listing_role`, backfilled every
 * existing row to 'agent', and made the column NOT NULL. It gave it no default
 * and no trigger. `lib/agent/listings-actions.ts` inserts
 * `{ ...columns, agent_id, status: 'DRAFT' }` and `columns` has never carried
 * a role, so every creation since that migration has failed on 23502
 * not_null_violation.
 *
 * A migration that fixes the rows it can see and leaves the next one to fail
 * is the shape of this fault. The backfill made it invisible: all 64 rows had
 * a role, so every read, every probe and every screen looked correct.
 *
 * WHY THIS BLOCKS THE ONLY THING THAT MATTERS. This platform has 64 published
 * listings and all 64 are examples. Real supply is zero. The single action
 * that moves that number off zero is an agent creating a listing, and it has
 * been impossible since 22 September.
 *
 * THE DERIVATION IS THE ONE TRACK G ALREADY USES, NOT A NEW ONE. A listing's
 * role is a fact about who listed it, so it is read from the lister rather
 * than typed by them: the agent's application declares `supply_role`, and that
 * is the same source `lib/supply/workspaces-queries.ts` reads. An explicit
 * value passed by a caller is left alone, so this fills a gap and never
 * overrules an intention.
 *
 * 'firm' IS DELIBERATELY NEVER DERIVED. `listings_firm_role_needs_a_firm`
 * constrains `(listing_role = 'firm') = (firm_id is not null)`, so deriving
 * 'firm' without also knowing the firm would swap one refusal for another. A
 * firm listing states both or neither, explicitly, through the firm door.
 *
 * NOTE, and read it before trusting this file: the body written here did not
 * work. Under `search_path = ''` a TYPE NAME IN A CAST must be qualified too,
 * and `'owner'::listing_role` raised 42704 at insert time. The read-back below
 * passed anyway, because it checks the grants and the trigger's presence and
 * neither of those can see that the body does not run. It is corrected in
 * `20260923134623`, and the thing that caught it was a probe that actually
 * inserted a row the way the application does.
 */

create or replace function private.listing_role_from_its_lister()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  declared text;
begin
  if new.listing_role is not null then
    return new;
  end if;

  select a.supply_role
    into declared
    from public.agents ag
    left join public.agent_applications a on a.id = ag.application_id
   where ag.id = new.agent_id;

  /* Owner or agent only. See the head for why 'firm' is not derived. */
  new.listing_role := case
    when declared = 'owner' then 'owner'::listing_role
    else 'agent'::listing_role
  end;

  return new;
end;
$function$;

drop trigger if exists listings_fill_listing_role on public.listings;
create trigger listings_fill_listing_role
  before insert on public.listings
  for each row execute function private.listing_role_from_its_lister();

/* RULE 21. `create or replace` PRESERVES GRANTS, so the revoke is restated and
   read back here. A trigger function needs no EXECUTE grant to fire, which was
   measured today rather than taken from the manual, so nothing legitimate
   loses anything. */
revoke all on function private.listing_role_from_its_lister() from public, anon, authenticated;

do $$
declare
  n integer;
begin
  if has_function_privilege('anon', 'private.listing_role_from_its_lister()', 'EXECUTE') then
    raise exception 'listing_role_from_its_lister is reachable by anon';
  end if;
  if has_function_privilege('authenticated', 'private.listing_role_from_its_lister()', 'EXECUTE') then
    raise exception 'listing_role_from_its_lister is reachable by authenticated';
  end if;

  select count(*) into n
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where c.relname = 'listings' and t.tgname = 'listings_fill_listing_role'
     and not t.tgisinternal and t.tgenabled = 'O';
  if n <> 1 then
    raise exception 'the trigger is not installed and enabled, found %', n;
  end if;
end $$;

comment on function private.listing_role_from_its_lister() is
  'Fills listings.listing_role on insert from the lister''s declared supply '
  'role, because track_g_3 made the column NOT NULL with no default and every '
  'creation from the agent console failed 23502 from 22 September. Never '
  'derives firm: that role requires firm_id by check constraint.';
