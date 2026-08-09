-- Nothing may be committed, booked, paid, held or reviewed against an example
-- listing.
--
-- WHY THIS IS ONE TRIGGER ON FOUR TABLES RATHER THAN FOUR CHECKS IN FOUR SERVER
-- ACTIONS. A CHECK constraint cannot see another table, and the application
-- layer is precisely where the previous failure happened: the rule existed, it
-- was written down, and the code that was supposed to honour it did not. One
-- function, applied at every table that can point a commitment at a listing, is
-- a rule that a new server action cannot forget to call because it never had to
-- call it.
--
-- THE MONEY PATH IS COVERED TRANSITIVELY, AND THAT IS DELIBERATE. Payment,
-- escrow and settlement in this codebase all hang off a booking:
-- `pay_booking_from_wallet` takes a booking id, the escrow legs take a booking,
-- and `wallet_entries` records against one. So refusing the booking refuses
-- every one of them at the single chokepoint, rather than trying to enumerate
-- the money surfaces and inevitably missing the next one somebody adds.
--
-- REVIEWS ARE COVERED TWICE, ON PURPOSE. `reviews.booking_id` is NOT NULL and
-- unique, so a review already cannot exist without a booking and the booking
-- rule alone makes a fabricated rating impossible. The direct guard is here
-- anyway because "no invented ratings" is the single rule this whole exercise
-- exists to keep, and a rule that important should not depend on a foreign key
-- somebody could later make nullable.

create or replace function public.refuse_transaction_on_demo_listing()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  target uuid;
  demo boolean;
begin
  target := new.listing_id;
  if target is null then
    return new;
  end if;

  select l.is_demo into demo from public.listings l where l.id = target;

  if coalesce(demo, false) then
    raise exception
      'This listing is an example of what the catalogue will hold. No such property is available, so nothing can be arranged against it.'
      using errcode = 'check_violation',
            hint = 'Only listings with is_demo = false can carry a booking, an inspection or a review.';
  end if;

  return new;
end;
$$;

comment on function public.refuse_transaction_on_demo_listing() is
  'Refuses any row that points a booking, inspection or review at an example '
  'listing. Payment and escrow are covered transitively, because both hang off '
  'a booking.';

create trigger bookings_never_against_a_demo_listing
  before insert or update of listing_id on public.bookings
  for each row execute function public.refuse_transaction_on_demo_listing();

create trigger reviews_never_against_a_demo_listing
  before insert or update of listing_id on public.reviews
  for each row execute function public.refuse_transaction_on_demo_listing();

create trigger inspection_requests_never_against_a_demo_listing
  before insert or update of listing_id on public.inspection_requests
  for each row execute function public.refuse_transaction_on_demo_listing();

create trigger inspection_confirmations_never_against_a_demo_listing
  before insert or update of listing_id on public.inspection_confirmations
  for each row execute function public.refuse_transaction_on_demo_listing();

-- The other direction, which is the one that gets forgotten.
--
-- Everything above stops a commitment being created against a listing that is
-- already an example. This stops a listing being TURNED INTO an example after
-- somebody has already committed to it, which would silently strand a real
-- booking against a property the platform has just declared imaginary.
create or replace function public.refuse_demo_flag_on_committed_listing()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.is_demo is not true or old.is_demo is true then
    return new;
  end if;

  if exists (select 1 from public.bookings b where b.listing_id = new.id)
     or exists (select 1 from public.reviews r where r.listing_id = new.id)
     or exists (select 1 from public.inspection_requests i where i.listing_id = new.id)
  then
    raise exception
      'Listing % has real bookings, reviews or inspections against it and cannot be marked as an example.', new.id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger listings_demo_flag_needs_a_clean_history
  before update of is_demo on public.listings
  for each row execute function public.refuse_demo_flag_on_committed_listing();
