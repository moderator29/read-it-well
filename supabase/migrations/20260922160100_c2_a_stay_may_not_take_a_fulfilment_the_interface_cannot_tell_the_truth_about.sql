-- C2: a stay may not take a fulfilment the interface cannot tell the truth about.
--
-- WHAT THIS REFUSES, AND WHY IT IS A ROW RULE AND NOT A TYPE RULE.
-- `public.fulfilment_mode` carries three values, `vallo`,
-- `external_completion` and `partner_handoff`
-- (`20260918080804_m01_stays_enums_and_cancellation_policies.sql:70`), and it
-- should keep carrying all three: the type is honest about what the platform
-- will one day permit, and `lib/stays/types.ts` and `database.types.ts` are
-- right to carry them too. It is the ROW that must be refused, not the type.
--
-- THE STOP LIST IS EXPLICIT: nothing renders a partner row before the partner
-- label and the fulfilment-honest CTA exist. Neither exists. So the first
-- accommodation that took `external_completion` or `partner_handoff` would be
-- drawn by an interface that says, in every word and every button on it, that
-- Vallo completes the booking. That is not a bug somebody would notice in
-- review; it is a lie shipped quietly, to the one person who had already
-- decided to pay.
--
-- WHAT WAS ALREADY GUARDED, AND WHAT WAS NOT.
-- `accommodations_first_party_is_vallo_chk` already says a first-party row is
-- always `vallo`. That rule is permanent and is LEFT ALONE: it stays true
-- after partner support ships, because a stay we supply ourselves is always
-- one we complete ourselves. What it does not cover is the row that is NOT
-- first party, which is exactly the partner row, and exactly the one the stop
-- list is about. This closes that.
--
-- MEASURED BEFORE IT WAS WRITTEN, not assumed: all five accommodations on the
-- estate are `source = 'first_party'` and `fulfilment = 'vallo'`, so this
-- constraint changes nothing that exists and refuses only what has never yet
-- been written. The gun is unloaded; the chamber is real.
--
-- TO WHOEVER BUILDS THE PARTNER LABEL: this constraint is the one thing to
-- drop, and its name says so. Drop it in the same migration that lands the
-- label and the fulfilment-honest CTA, and not before, so that the two can
-- never be separated by a release.
--
--   alter table public.accommodations
--     drop constraint accommodations_fulfilment_is_vallo_until_partner_ui_chk;
--
-- No function is created here, so rule 21 has nothing to revoke. The probe for
-- this migration inserts a refused row inside a transaction it then aborts on
-- purpose, so no test row reaches a live table.

alter table public.accommodations
  add constraint accommodations_fulfilment_is_vallo_until_partner_ui_chk
  check (fulfilment = 'vallo');

comment on constraint accommodations_fulfilment_is_vallo_until_partner_ui_chk
  on public.accommodations is
  'Refuses any fulfilment but vallo while no partner label and no fulfilment-honest CTA exist. '
  'The enum keeps all three values on purpose: the type is honest about what is permitted one day, '
  'and it is the row that is refused today. Drop this constraint in the same migration that lands '
  'the partner label and the honest CTA, and not before.';
