-- A booking could begin and be called off, and could never be recorded as having
-- happened. PENDING, CONFIRMED, CANCELLED describes an intent and its withdrawal,
-- not an outcome, so an agent had no way to say the guest arrived and stayed, and
-- nothing downstream (reviews, payouts, repeat-guest signals) had an event to hang on.
--
-- Two terminal outcomes, which is the standard shape: the stay happened, or the
-- guest never arrived. Both are placed in lifecycle order rather than appended,
-- so anything that sorts on the enum reads the journey in the order it happens:
-- PENDING, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED.
--
-- Additive only. No value is renamed or removed, so every existing read keeps working.
alter type public.booking_status add value if not exists 'COMPLETED' after 'CONFIRMED';
alter type public.booking_status add value if not exists 'NO_SHOW' after 'COMPLETED';
