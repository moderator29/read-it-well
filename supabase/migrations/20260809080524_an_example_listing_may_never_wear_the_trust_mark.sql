-- An illustrative listing, and the rule that makes it safe to have one.
--
-- THE HISTORY THIS IS ANSWERING. This repository once shipped twenty-three
-- invented places, twenty-two of which carried the verified mark, with
-- fabricated ratings, on addresses that do not exist. The cleanup deleted them
-- and banned the words "demo", "sample", "preview" and "not live" from user
-- facing copy, because the owner ruled that labelling your way out of it does
-- not work. The rule that came out of it is exact: illustrative listings yes,
-- verified badge never.
--
-- A convention cannot carry that rule. The last failure was not a missing
-- policy, it was a policy nobody enforced at the only layer that cannot be
-- forgotten. So the contradiction is made unrepresentable here: a row that is
-- illustrative AND carries a trust signal fails to insert. Postgres refuses
-- it, not a code reviewer.

alter table public.listings
  add column is_demo boolean not null default false;

comment on column public.listings.is_demo is
  'True when this listing illustrates what the catalogue will look like and no '
  'such property is available. Published by the platform itself, never by an '
  'agent, never verified, never transactable. Every surface that renders trust, '
  'money or a booking control must branch on it.';

-- The whole point of the column, in one constraint.
--
-- Three columns carry a checked claim about a property: somebody compared the
-- stated address to the pin (address_verified_at), somebody stood in the
-- building (physically_inspected_at), and a named member of staff signed for it
-- (verified_by). An illustrative row may hold none of them, because there is no
-- property to have checked and no honest way to have checked it.
--
-- Written as "not demo, or no trust columns" rather than as a NOT NULL pattern
-- so it reads as the sentence it is: an example listing carries no trust mark.
alter table public.listings
  add constraint listings_demo_carries_no_trust_mark check (
    is_demo = false
    or (
      address_verified_at is null
      and physically_inspected_at is null
      and verified_by is null
    )
  );

-- Merchandising is a trust signal too, quietly.
--
-- `featured` is what puts a listing on the home rail above everything else.
-- Promoting an invented property over a real one is the same category of
-- mistake as badging it, and it is the mistake somebody makes while trying to
-- make an empty platform look busy, which is exactly the pressure this whole
-- exercise is under.
alter table public.listings
  add constraint listings_demo_is_never_featured check (
    is_demo = false or featured = false
  );

-- Discovery reads will filter on this constantly, and there will be few of
-- these rows against many real ones once supply lands, so the index is partial
-- on the small side.
create index listings_demo_idx
  on public.listings (is_demo, published_at desc)
  where is_demo = true;

-- The cross-table half, which a CHECK cannot express.
--
-- The listing's own columns are only half of what renders as trust. The other
-- half is the lister: `agents.verified` and `agents.verification_tier` draw a
-- badge beside the name on the listing page. An illustrative listing attached
-- to a verified agency would put a real agency's credibility behind a property
-- that does not exist, which is worse than badging the listing itself.
create or replace function public.enforce_demo_listing_has_unverified_lister()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  lister_is_verified boolean;
begin
  if new.is_demo is not true then
    return new;
  end if;

  select a.verified or a.verification_tier > 0
    into lister_is_verified
    from public.agents a
   where a.id = new.agent_id;

  if coalesce(lister_is_verified, false) then
    raise exception
      'An example listing may not be attributed to a verified lister (agent %).', new.agent_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger listings_demo_lister_is_unverified
  before insert or update of is_demo, agent_id on public.listings
  for each row execute function public.enforce_demo_listing_has_unverified_lister();
