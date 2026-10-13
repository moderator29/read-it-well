-- PENDING (constraints only; the functions and the trigger are applied). The owner's proof of ownership, the "Ownership seen"
-- mark it earns, and one supply side per account. Founder decisions of
-- 13 October 2026.
--
-- NOTE FOR WHOEVER APPLIES IT: two CHECK constraints are widened, which in
-- Postgres means ALTER TABLE ... DROP CONSTRAINT and ADD CONSTRAINT in one
-- transaction. Apply it with psql (or the dashboard SQL editor), not through
-- the MCP connector, which hangs on DROP.
--
-- 1. AN OWNERSHIP DOCUMENT MAY NAME ITS REGISTRATION.
--    `agent_documents_property_kinds_name_a_listing` (20260922230400) refuses
--    an `ownership` or `mandate` row without a listing. An owner registers
--    before any listing exists, so the owner form's proof of ownership could
--    never be filed. An `ownership` row may now name the application it was
--    filed with instead; a `mandate` still needs its listing.
--
-- 2. "LETTER OF AUTHORITY" IS AN ANSWER. Somebody letting a place on the
--    owner's written authority holds no title. The owner form offers it, so
--    `agent_applications_ownership_document_known` accepts it.
--
-- 3. "OWNERSHIP SEEN". `public.ownership_seen_at(user)` is the date a
--    reviewer approved the person's current registration ownership document,
--    for an account whose agents row is an owner, or null. Read by the
--    profile and the listing page to draw the mark. It is derived from the
--    reviewers' own decisions (`review_kyc_document` already approves and
--    refuses any document kind, with a reason, an audit row and a
--    notification), so nothing can write the mark directly.
--
-- 4. ONE ACCOUNT, ONE SIDE. An owner's account cannot file to become an
--    agent and an agent's cannot file to become an owner (the professional
--    and firm forms make agents). Held while the other application is
--    submitted, under review, sent back or approved, or while the account's
--    agents row is the other role. API roles only; staff and the service role
--    pass, as in `guard_application_write`. The app refuses the same
--    (apps/web/src/lib/agent/role-lock.ts) with a message saying how to
--    proceed.
--
-- PROBE AFTER APPLYING, as the real roles: (a) as an applicant, insert an
-- owner application and an `ownership` document naming it, with no listing:
-- must succeed; a `mandate` row with no listing must still fail. (b) approve
-- the document as a different reviewer and expect ownership_seen_at(owner) to
-- return its reviewed_at; refuse a replacement and expect null. (c) as an
-- owner with an APPROVED owner application, insert an agent application:
-- expect 42501; the same insert on a fresh account succeeds.

-- THE TWO CONSTRAINTS BELOW ARE THE ONLY PART NOT YET APPLIED. Run them in the dashboard SQL editor.

begin;

alter table public.agent_documents
  drop constraint if exists agent_documents_property_kinds_name_a_listing;
alter table public.agent_documents
  add constraint agent_documents_property_kinds_name_a_listing
    check (
      kind not in ('ownership', 'mandate')
      or listing_id is not null
      or (kind = 'ownership' and application_id is not null)
    );

alter table public.agent_applications
  drop constraint if exists agent_applications_ownership_document_known;
alter table public.agent_applications
  add constraint agent_applications_ownership_document_known
    check (
      ownership_document is null
      or ownership_document in (
        'certificate_of_occupancy',
        'deed_of_assignment',
        'governors_consent',
        'survey_plan',
        'utility_bill',
        'letter_of_authority',
        'none'
      )
    );

commit;
