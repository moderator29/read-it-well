-- V-56 AND V-92: TWO MONEY HOLDS, BUILT TO THE BOUNDARY AND SWITCHED OFF.
--
-- Both change how money moves at payment, and both wait on the founder:
--
--   V-56 (FOUNDER question 9, and the `held_payments` gate): the agency fee of
--   an on-platform move-in is carved out of the charge into a held payment,
--   released on keys received or at move-in plus 14 days. Built so far: the
--   split arithmetic and the two pay-screen lines (lib/after-gate/money-holds.ts),
--   drawn only when BOTH `rent_agency_hold` and `held_payments` are on. NOT
--   built: the replacement of `private.open_rent_charge` that calls
--   `escrow_propose_as` and funds it inside the payment. That is a money
--   function the audit session owns, and it depends on G-3.
--
--   V-92 (FOUNDER question 8): a shortlet caution as a PENDING hold on the
--   guest's own wallet, released at check-out plus 48 hours unless the host
--   claims. Built so far: the release arithmetic and the checkout sentence.
--   NOT built: `rate_plans.caution_minor`, the `caution_hold` and
--   `caution_release` ledger kinds, and writing the hold inside the stay
--   payment: existing schema and `pay_booking_from_wallet`, the audit's.
--
-- This file only writes the two switches, OFF. The flag readers fail closed:
-- a missing row, a false row and a failed read all mean off. Turning either on
-- is one statement, and it should wait until the pieces above exist:
--
--   update public.feature_flags set enabled = true where key = 'rent_agency_hold';
--   update public.feature_flags set enabled = true where key = 'stay_caution_hold';

insert into public.feature_flags (key, enabled, note) values
  ('rent_agency_hold', false,
   'V-56. Hold the agency fee of an on-platform move-in until the keys are received. Also needs held_payments on. OFF until FOUNDER question 9 is answered and the open_rent_charge carve-out ships.'),
  ('stay_caution_hold', false,
   'V-92. A shortlet caution as a hold on the guest''s own wallet, released at check-out plus 48 hours. OFF until FOUNDER question 8 is answered and the caution hold kinds ship.')
on conflict (key) do nothing;
