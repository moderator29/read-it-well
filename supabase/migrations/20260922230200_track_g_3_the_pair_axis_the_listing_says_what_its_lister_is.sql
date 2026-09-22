-- TRACK G, MIGRATION 3 OF 6: THE PAIR AXIS.
--
-- THIS IS THE MIGRATION THAT MAKES THE FOUNDER'S OWN EXAMPLE REPRESENTABLE.
-- A man who owns one flat and agents another has ONE supply account and TWO
-- listings, and each listing says what he is to THAT address. Ownership is a
-- property of a pair, a person and a property, and never of a person. This
-- codebase had already reached the same conclusion about a neighbouring
-- problem and wrote it into a migration comment: the verified badge has always
-- meant the AGENT passed checks and has said nothing about the PROPERTY.
--
-- AND IT IS THE MIGRATION THAT MAKES ONE SENTENCE IN THE PRODUCT TRUE.
-- `supplyPrimer()` in `lib/supply/roles.ts` tells every user of the assistant
-- and of support that "a listing says which of the three it came from, so a
-- person searching can tell them apart". Until this column existed that
-- sentence was FALSE, and it was being said to real users by two AI system
-- prompts. A claim in product copy that the schema cannot support is the same
-- class of fault as a badge that lies.
--
-- `firm_id` IS DENORMALISED FROM `agents.firm_id` ON PURPOSE. An agent who
-- leaves a firm next year must not silently restate who listed a property last
-- year. The listing records who it was published under; the person record
-- records who they work for now; the two are allowed to diverge and that
-- divergence is the history.
--
-- THE THREE PROPERTY FACTS ARE TIMESTAMPS AND NOT BOOLEANS, for the reason
-- `20260809044629:86` gives about the two that were already here: an
-- inspection from two years ago is not the same statement as one from last
-- week. `address_verified_at` and `physically_inspected_at` are the two
-- existing ones and these sit beside them, on the same subject, in the same
-- shape.
--
-- NONE OF THE THREE IS A RUNG. `private.agent_tier` counts over a fixed four
-- element array that five surfaces read, so inserting a rung would renumber
-- everybody silently and change what "Fully verified" means for people who
-- earned it under the old numbering. The verified badge means a checked human
-- and nothing else, and no new verification rung is created here or anywhere
-- in this set. These are DATED FACTS ABOUT A PROPERTY, a third subject beside
-- the person and the business, and they are drawn as their own thing.
--
-- NO SECURITY DEFINER FUNCTION IS CREATED HERE, so rule 21 has nothing to
-- revoke, and the probe asserts that vacuum rather than assuming it.

alter table public.listings
  add column if not exists listing_role public.listing_role,
  add column if not exists firm_id uuid references public.businesses(id) on delete set null,
  add column if not exists ownership_verified_at timestamptz,
  add column if not exists mandate_verified_at   timestamptz,
  add column if not exists supply_verified_by    uuid references auth.users(id) on delete set null;

-- All 64 rows are is_demo, verified against the live database rather than
-- assumed, so this backfill is cosmetic and re-runnable. Every one of them was
-- published by the single example agent row, so `agent` is what they were.
update public.listings set listing_role = 'agent' where listing_role is null;
alter table public.listings alter column listing_role set not null;

create index if not exists listings_role_published_idx
  on public.listings (listing_role, listing_intent, state_code, city)
  where status = 'PUBLISHED';
create index if not exists listings_firm_idx on public.listings (firm_id) where firm_id is not null;
create index if not exists listings_supply_verified_by_idx
  on public.listings (supply_verified_by) where supply_verified_by is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.listings'::regclass
                  and conname = 'listings_firm_only_on_a_firm_row_chk') then
    alter table public.listings
      add constraint listings_firm_only_on_a_firm_row_chk
        check ((listing_role = 'firm') = (firm_id is not null));
  end if;

  -- An owner proves OWNERSHIP; an intermediary proves a MANDATE. Both set
  -- would be a listing claiming to be two things at once to the same reader.
  if not exists (select 1 from pg_constraint where conrelid = 'public.listings'::regclass
                  and conname = 'listings_one_supply_proof_chk') then
    alter table public.listings
      add constraint listings_one_supply_proof_chk
        check (ownership_verified_at is null or mandate_verified_at is null);
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.listings'::regclass
                  and conname = 'listings_owner_proves_ownership_chk') then
    alter table public.listings
      add constraint listings_owner_proves_ownership_chk
        check (listing_role = 'owner' or ownership_verified_at is null);
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.listings'::regclass
                  and conname = 'listings_agent_proves_mandate_chk') then
    alter table public.listings
      add constraint listings_agent_proves_mandate_chk
        check (listing_role <> 'owner' or mandate_verified_at is null);
  end if;

  -- A dated fact somebody set must name the member of staff who set it, the
  -- same law `agent_documents_decision_has_a_decider` already carries. A stamp
  -- with nobody behind it is exactly the anonymous claim rule 12 forbids.
  if not exists (select 1 from pg_constraint where conrelid = 'public.listings'::regclass
                  and conname = 'listings_supply_proof_has_a_decider_chk') then
    alter table public.listings
      add constraint listings_supply_proof_has_a_decider_chk
        check ((ownership_verified_at is null and mandate_verified_at is null)
               or supply_verified_by is not null);
  end if;
end$$;

comment on column public.listings.listing_role is
  'What the lister is to THIS property: owner, agent or firm. The pair axis. This is what a searcher filters on and what the listing card, the listing page and the filter drawer print through LISTING_ROLE_SENTENCE and LISTING_ROLE_FILTER_LABEL in lib/supply/roles.ts. It is a claim until one of the two dated stamps beside it is set.';

comment on column public.listings.firm_id is
  'The firm this listing was published under, denormalised from agents.firm_id on purpose so that an agent leaving a firm next year does not silently restate who listed a property last year.';

comment on column public.listings.ownership_verified_at is
  'When a member of staff looked at a document in the lister''s name for THIS address. NOT A VERIFICATION RUNG and not the verified badge, which means a checked human and nothing else. A dated fact about a property, the third subject, beside address_verified_at and physically_inspected_at. The reader is told what was seen and when, never that the title is good: we are not a land registry.';

comment on column public.listings.mandate_verified_at is
  'When a member of staff saw a written instruction from the owner AND spoke to the named principal. The call back is the check; the document itself is a photograph. Never a rung, never the badge.';

comment on column public.listings.supply_verified_by is
  'The member of staff behind whichever of the two stamps above is set. Held by listings_supply_proof_has_a_decider_chk, because a dated claim with nobody behind it is an anonymous claim.';
