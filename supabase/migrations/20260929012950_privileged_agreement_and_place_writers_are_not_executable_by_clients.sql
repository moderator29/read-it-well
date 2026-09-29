-- Found 29 September 2026 by the native release audit, confirmed as a bug by
-- the founder the same day.
--
-- FOUR PRIVILEGED WRITERS WERE EXECUTABLE BY EVERY ROLE. They were created
-- without an explicit grant, so PostgreSQL's default (EXECUTE to PUBLIC)
-- applied, and `authenticated` holds USAGE on the private schema:
--   private.agreement_log(deal_agreements, uuid, text, agreement_status, text)
--     writes a deal_agreement_events row with any actor and any action
--   private.agreement_tell_both(deal_agreements, text)
--     sends an in-app notification and queues an email to both parties
--   private.open_place_entries(areas)
--     posts SYSTEM-authored entries into an area
--   private.agreement_open_for_stay()
--     the trigger that opens a stay agreement (a trigger function cannot be
--     called directly; revoked so it follows the same rule)
-- Nothing is known to have abused them: private is not exposed through the
-- API. They now follow the rule every other privileged function follows: no
-- EXECUTE for public, anon or authenticated.
--
-- Every legitimate caller is SECURITY DEFINER and owned by postgres
-- (admin_decide_agreement, agreement_confirm_as, agreement_amend_as,
-- agreement_cancel_as, agreement_open_rent_as, private.settle_booking_charge,
-- private.rent_split_cancel, and the triggers agreement_open_for_stay and
-- open_place_entries_trg), so it runs these as their owner and is unaffected.
-- Trigger functions are not EXECUTE-checked when they fire. Probe
-- sec-agreement-helpers.sql proves both halves.
revoke all on function private.agreement_log(public.deal_agreements, uuid, text, public.agreement_status, text) from public, anon, authenticated;
revoke all on function private.agreement_tell_both(public.deal_agreements, text) from public, anon, authenticated;
revoke all on function private.open_place_entries(public.areas) from public, anon, authenticated;
revoke all on function private.agreement_open_for_stay() from public, anon, authenticated;
