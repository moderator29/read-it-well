-- WHAT A BUYER ACTUALLY PAYS.
--
-- The tenancy side of this platform has had an honest cost model since
-- `20260809044514_what_it_actually_costs_to_move_in.sql`: caution, agency,
-- legal, agreement, service charge and the one total people shop on. The sale
-- side has had an asking price, a tenure and a sale status, and nothing else.
--
-- THAT ASYMMETRY IS NOT A GAP IN A FORM, IT IS THE SAME LIE IN A BIGGER
-- CURRENCY. A hundred and eighty million naira asking price in Lagos is
-- routinely two hundred million and more by the time the deed is signed, and
-- the difference is not small print: agency and legal are conventionally five
-- per cent each, and Governor's consent, stamp duty and registration together
-- run to several per cent more of the value of the land. A buyer who plans
-- around the asking price discovers twenty million naira they had not
-- budgeted for AFTER they are committed. The whole argument for publishing the
-- move-in cost applies here with a larger number attached.
--
-- FIVE PARTS AND A TOTAL, AND THEY ARE SEPARATE COLUMNS FOR THE SAME REASON
-- THE TENANCY ONES ARE. Sellers and agents fold these into each other in
-- different combinations, so a derived sum would invent a breakdown nobody
-- quoted, and a seller charging no agency fee should be able to show a zero
-- rather than a blank. Zero is a real answer here and it is a selling point.
--
-- NOTHING IS REQUIRED. Every column is nullable and an unstated cost renders
-- as unstated and never as zero, which is the rule the tenancy model already
-- holds to: "no agency fee" is a promise and "we did not say" is not the same
-- promise.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO. It does not compute any of
-- these from the asking price, although four of the five have a conventional
-- percentage. A rate that is usually five per cent is not five per cent, the
-- Lagos consent charge depends on the property and on who is assessing it,
-- and a number this platform calculated and printed as a fact would be an
-- invented number under rule 15. The lister states what they charge.

alter table public.listings
  -- The two the seller's side charges, conventionally five per cent each and
  -- routinely folded into one another, which is why they are two columns.
  add column if not exists sale_agency_fee_minor bigint,
  add column if not exists sale_legal_fee_minor bigint,

  -- The three that go to the state. A buyer cannot negotiate any of them and
  -- almost nobody is told about them before they are committed.
  add column if not exists governors_consent_fee_minor bigint,
  add column if not exists stamp_duty_minor bigint,
  add column if not exists survey_registration_fee_minor bigint,

  -- The number this file exists for: the sale side's twin of
  -- total_move_in_cost_minor.
  add column if not exists total_purchase_cost_minor bigint;

comment on column public.listings.sale_agency_fee_minor is
  'The agent''s commission on a sale, in kobo, paid by the buyer. Conventionally five per cent of the asking price and frequently folded together with the legal fee, which is why the two are separate columns and why the total is not derived from them. Zero is a meaningful answer.';
comment on column public.listings.sale_legal_fee_minor is
  'Fee in kobo for preparing and executing the deed of assignment, conventionally five per cent of the price. Separate from sale_agency_fee_minor because some sellers charge one and not the other.';
comment on column public.listings.governors_consent_fee_minor is
  'The charge in kobo for the Governor''s consent to the transfer, which a Nigerian land sale is not valid without. It depends on the property and on the assessment, so it is stated by the lister and never calculated here.';
comment on column public.listings.stamp_duty_minor is
  'Stamp duty in kobo on the instrument of transfer. Payable to the state, not negotiable, and almost never mentioned in an asking price.';
comment on column public.listings.survey_registration_fee_minor is
  'Survey and registration charges in kobo: registering the deed, and a survey where one is required. Grouped because sellers quote them together.';
comment on column public.listings.total_purchase_cost_minor is
  'Everything in kobo a buyer has to find to own it: the asking price plus agency, legal, consent, stamp duty and registration. The sale side twin of total_move_in_cost_minor, and stored for the same three reasons: the parts are often unknown while the total is known, a sum would invent a breakdown nobody quoted, and a filter and a sort need it indexed. A check constraint holds it at or above the price plus whichever parts were stated.';

/* -------------------------------------------------------------- constraints

   Money may be zero and may not be negative, exactly as on the tenancy side.
   -------------------------------------------------------------------------- */
alter table public.listings
  add constraint listings_sale_agency_fee_nonneg
    check (sale_agency_fee_minor is null or sale_agency_fee_minor >= 0),
  add constraint listings_sale_legal_fee_nonneg
    check (sale_legal_fee_minor is null or sale_legal_fee_minor >= 0),
  add constraint listings_governors_consent_nonneg
    check (governors_consent_fee_minor is null or governors_consent_fee_minor >= 0),
  add constraint listings_stamp_duty_nonneg
    check (stamp_duty_minor is null or stamp_duty_minor >= 0),
  add constraint listings_survey_registration_nonneg
    check (survey_registration_fee_minor is null or survey_registration_fee_minor >= 0),
  add constraint listings_total_purchase_nonneg
    check (total_purchase_cost_minor is null or total_purchase_cost_minor >= 0);

/*
 * The total may never undercut its own parts, and the price is one of them.
 *
 * One direction only, the same argument as `listings_total_move_in_covers_its_parts`:
 * a total ABOVE the itemised parts is honest, because the parts that were
 * itemised are not all the parts. A total BELOW them is arithmetic that cannot
 * be true, and it is the shape a listing takes when somebody is advertising an
 * attractive all-in figure while the fees underneath say otherwise.
 */
alter table public.listings
  add constraint listings_total_purchase_covers_its_parts
    check (
      total_purchase_cost_minor is null
      or total_purchase_cost_minor >=
           coalesce(sale_price_minor, 0)
         + coalesce(sale_agency_fee_minor, 0)
         + coalesce(sale_legal_fee_minor, 0)
         + coalesce(governors_consent_fee_minor, 0)
         + coalesce(stamp_duty_minor, 0)
         + coalesce(survey_registration_fee_minor, 0)
    );

/* --------------------------------------------------------------- the index

   The twin of `listings_move_in_cost_idx`, and partial for the same reason: a
   null total cannot satisfy a range query, and indexing the nulls would carry
   every draft and every tenancy listing for no reader.
   -------------------------------------------------------------------------- */
create index if not exists listings_purchase_cost_idx
  on public.listings (total_purchase_cost_minor)
  where status = 'PUBLISHED'
    and listing_intent = 'sale'
    and total_purchase_cost_minor is not null;

/* ------------------------------------------------------------- the grant

   SEC-6 (`20260809100105`) replaced the table wide SELECT grant to `anon` with
   a grant naming every readable column, and wrote down that the next column
   somebody adds is private until it is granted here on purpose. These six are
   that decision made out loud: what a buyer will actually pay is the whole
   point of collecting it, and a cost model a signed-out visitor cannot read is
   a cost model nobody reads.
   -------------------------------------------------------------------------- */
grant select (
  sale_agency_fee_minor,
  sale_legal_fee_minor,
  governors_consent_fee_minor,
  stamp_duty_minor,
  survey_registration_fee_minor,
  total_purchase_cost_minor
) on table public.listings to anon;
