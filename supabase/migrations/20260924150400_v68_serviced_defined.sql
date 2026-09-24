/*
 * V-68. SERVICED, DEFINED: WHAT THE SERVICE CHARGE BUYS, AND WHO PAYS FOR DIESEL.
 *
 * "Serviced 3 bed, Lekki, service charge 2.5m" is the most common Lagos
 * listing and the most misleading: one landlord's "serviced" is 24-hour
 * diesel, another's is a gateman and a sweep. `service_charge_minor` says how
 * much and nothing about what for (LISTING_PIPELINE_AUDIT.md 3.4: "600,000
 * service charge is not a fact a tenant can compare").
 *
 *   service_charge_covers      what the charge pays for, from a closed list:
 *                              diesel (generator diesel and maintenance),
 *                              water (water treatment), security (guards),
 *                              estate_dues, waste (collection), cleaning (of
 *                              common areas), lift
 *   service_charge_reconciled  false: a fixed sum. true: estimated, then
 *                              balanced against what was spent at year end
 *   estate_type                gated_estate (controlled entry), gated_compound
 *                              (a gateman), open_street
 *   is_serviced                GENERATED, never typed: true only when power,
 *                              water and security are all covered. The word
 *                              "Serviced" is shown and filtered on from this
 *                              column and from nothing a lister can type.
 *
 * All nullable apart from the generated one; null is unanswered and renders as
 * nothing. `has_estate_access` stays: it says a gate exists, this says which
 * kind, and the estate's name stays private in `listing_access`.
 *
 * No grant or policy changes: columns on `listings`, written through the
 * agent's own update and read by a separate read so the catalogue never
 * depends on this migration having been applied.
 */

begin;

alter table public.listings
  add column if not exists service_charge_covers text[],
  add column if not exists service_charge_reconciled boolean,
  add column if not exists estate_type text;

alter table public.listings
  add constraint listings_service_charge_covers_known
    check (
      service_charge_covers is null
      or service_charge_covers <@ array['diesel', 'water', 'security', 'estate_dues', 'waste', 'cleaning', 'lift']::text[]
    ),
  add constraint listings_estate_type_known
    check (estate_type is null or estate_type in ('gated_estate', 'gated_compound', 'open_street'));

alter table public.listings
  add column if not exists is_serviced boolean
    generated always as (
      coalesce(service_charge_covers @> array['diesel', 'water', 'security']::text[], false)
    ) stored;

comment on column public.listings.service_charge_covers is
  'What the service charge pays for (V-68): diesel, water, security, estate_dues, waste, cleaning, lift. Null is unanswered.';
comment on column public.listings.service_charge_reconciled is
  'False: the service charge is a fixed sum. True: it is estimated and balanced against spending at year end. Null is unanswered (V-68).';
comment on column public.listings.estate_type is
  'gated_estate (controlled entry), gated_compound (a gateman) or open_street. The estate name stays private in listing_access (V-68).';
comment on column public.listings.is_serviced is
  'Generated: true only when the service charge covers diesel, water and security. The only source of the word Serviced on Vallo (V-68).';

commit;
