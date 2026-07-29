-- Rental market pricing and profile settings.
--
-- The RENT market lists real homes at real annual rent: first party only,
-- message-inspect-pay, never a Reserve button. At the schema level a rental is
-- an ordinary listing whose property_type is 'rental' and whose price_period
-- is 'year'. The unit price stays in price_per_night_minor, reinterpreted as
-- the price in kobo per price_period unit, so every existing money constraint
-- and index keeps working unchanged.
--
-- profiles.settings carries per-user preference JSON (notification channels,
-- locale overrides, privacy toggles) so the settings screen has one durable
-- home instead of localStorage.

alter type public.property_type add value if not exists 'rental';

create type public.price_period as enum ('night', 'year');

alter table public.listings
  add column price_period public.price_period not null default 'night';

comment on column public.listings.price_per_night_minor is
  'Unit price in kobo per price_period unit: per night for stays, per year for rentals.';

comment on column public.listings.price_period is
  'Billing period for the unit price. Stays price per night; rentals price per year.';

alter table public.profiles
  add column settings jsonb not null default '{}'::jsonb;

comment on column public.profiles.settings is
  'Per-user preference JSON maintained by the settings screen.';
