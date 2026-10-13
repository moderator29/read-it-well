-- DRAFT, not applied. Batch 1, defect D-01 (docs/SESSION-1-RESPONSE.md).
-- Live on 13 October 2026: feature_flags.restaurant_deposits = true, while
-- HANDOFF section 2 says booking a table is free and DECISIONS_2026-10-13
-- lists deposits as "flag off". No rule rows exist yet, but any restaurant
-- owner can insert one through RLS (restaurant_deposit_rules_owner_insert),
-- and reservation_deposit_before_confirm then blocks the venue from
-- confirming until the diner pays. Turn it off until the founder rules.
set lock_timeout = '5s';

update public.feature_flags
   set enabled = false,
       note = 'Off: booking a table is free (HANDOFF section 2). Turn on only on a founder ruling that settles DECISIONS open conflict 2.',
       updated_at = now()
 where key = 'restaurant_deposits'
   and enabled;
