-- A LISTING CARRIES A CODE A PERSON CAN READ OUT.
--
-- `docs/research/LISTING_PIPELINE_AUDIT.md` section 2.1 established that
-- `public.listings` has no human readable identifier of any kind: no
-- `reference`, no `code`, no `public_id`, no slug. The only listing shaped
-- string in the tree is `shortRef("LST", id)` in the admin queue, which is six
-- hex characters cut from a UUID, is never stored, is never unique, and is
-- never shown to the lister or to a searcher.
--
-- The precedent existed and was never applied. `public.agent_applications`
-- and `public.support_tickets` both carry a unique human reference, and the
-- support desk searches on it precisely because it is what a person reads out
-- over the phone.
--
-- THE FORMAT. `VL-` plus six characters from a thirty character alphabet:
--
--     2 3 4 5 6 7 8 9 A B C D E F G H J K M N P Q R S T V W X Y Z
--
-- `0` and `O` are indistinguishable spoken and handwritten. `1`, `I` and `L`
-- are the same problem three ways. `U` collides with `V` on a poor phone line,
-- and dropping it also removes the commonest accidental rude words from the
-- space. Thirty to the sixth is 729 million codes.
--
-- RANDOM, NEVER SEQUENTIAL. `agent_applications` uses `nextval`, which is
-- right for an internal reference and wrong for a public one: `VL-000412`
-- tells a competitor how many listings this platform holds and how fast it is
-- growing, and it invites somebody to walk the catalogue by counting.
--
-- ISSUED AT PUBLISH, NEVER AT DRAFT. The audit proposed a column default,
-- which would issue a code to every draft at insert. The brief this migration
-- is written under overrides that: a code is a PUBLIC handle, and a draft has
-- no public existence. So the column has no default and a trigger issues the
-- code at the moment the status becomes `PUBLISHED`. Uniqueness is still the
-- database's promise and not the application's, because the promise lives in
-- `listings_reference_key` below; the retry loop only spares a caller an
-- error it would otherwise have to handle.
--
-- ONCE ISSUED, PERMANENT. The trigger restores the old value on any update,
-- so a code that has been read out over the phone, printed in an email or
-- given to support cannot later point at a different property. That matters
-- because `authenticated` holds table wide UPDATE on the columns of a row the
-- owner policy lets through, so without this an agent could rewrite their own
-- code, or take one that has been retired.

-- The allocator. SECURITY DEFINER because it must see EVERY listing to know a
-- candidate is free, and RLS would otherwise show the caller only their own
-- rows plus the published ones, which is not the whole table.
create or replace function private.listing_reference()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  candidate text;
  attempt   integer := 0;
begin
  loop
    candidate := 'VL-';
    for i in 1..6 loop
      candidate := candidate
        || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.listings l where l.reference = candidate
    );
    attempt := attempt + 1;
    -- 729 million codes: forty collisions in a row is a broken RNG, not luck.
    if attempt > 40 then
      raise exception 'could not allocate a listing reference';
    end if;
  end loop;
  return candidate;
end;
$fn$;

-- RULE 21, BORN LOCKED AND NEVER BORN PUBLIC. Supabase ships
-- `alter default privileges ... grant all on functions to anon, authenticated`,
-- so a new function is reachable over `/rest/v1/rpc/` from the moment it
-- exists. `authenticated` holds USAGE on `private`. Neither role has any
-- business minting listing codes, and the trigger below does not need them to,
-- because it is SECURITY DEFINER and calls this as its owner.
revoke all on function private.listing_reference() from public, anon, authenticated;

alter table public.listings
  add column if not exists reference text;

-- THE GUARANTEE. Not the loop above. Postgres refuses the second insert of a
-- duplicate whatever the application believed.
create unique index if not exists listings_reference_key
  on public.listings (reference);

comment on column public.listings.reference is
  'The code a person reads out over the phone. VL- plus six characters from an alphabet with no 0, O, 1, I, L or U. Random rather than sequential so the catalogue cannot be counted or enumerated. Issued by a trigger at the moment the listing is published, never at draft, and never changed afterwards.';

create or replace function private.assign_listing_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  -- A listing is never born with a code. A draft has no public existence and
  -- therefore nothing for a stranger to look up.
  if tg_op = 'INSERT' then
    new.reference := null;
  end if;

  -- A code, once issued, is that property's for good. Silently restoring
  -- rather than raising, because a console that writes the whole row back
  -- should not fail on a column it never meant to touch.
  if tg_op = 'UPDATE' and old.reference is not null then
    new.reference := old.reference;
  end if;

  if new.status = 'PUBLISHED' and new.reference is null then
    new.reference := private.listing_reference();
  end if;

  return new;
end;
$fn$;

revoke all on function private.assign_listing_reference() from public, anon, authenticated;

drop trigger if exists listings_assign_reference on public.listings;
create trigger listings_assign_reference
  before insert or update on public.listings
  for each row execute function private.assign_listing_reference();

-- The rows that are already live get theirs now. A no-op write, because the
-- trigger is the one thing allowed to mint a code.
update public.listings
   set reference = null
 where status = 'PUBLISHED'
   and reference is null;

-- SEC-6 (`20260809100105`) replaced the table wide SELECT grant to `anon` with
-- a grant naming every readable column, and wrote down that the next column
-- somebody adds is private until it is granted here on purpose. This is that
-- decision, made out loud: the code is the one thing about a listing we WANT a
-- stranger to be able to quote back at us.
grant select (reference) on table public.listings to anon;
