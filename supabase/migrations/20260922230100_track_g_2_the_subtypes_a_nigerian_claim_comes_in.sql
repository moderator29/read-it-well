-- TRACK G, MIGRATION 2 OF 6: THE SUBTYPES A NIGERIAN OWNERSHIP CLAIM COMES IN.
--
-- THIS IS ITS OWN MIGRATION AND IT HAS TO BE, for the reason
-- `20260805095946:16` already records in this tree: a new enum value cannot be
-- used in the transaction that adds it. Migration 4 writes documents whose
-- subtype is one of these, so the values must be committed before it runs.
-- Folding the two together would fail on the first insert and would fail
-- confusingly, naming the value rather than the transaction.
--
-- NINE VALUES, AND THE LIST IS WHAT NIGERIAN TITLE ACTUALLY LOOKS LIKE rather
-- than what a form designer would like it to look like. A Certificate of
-- Occupancy is ONE of nine and it is deliberately not first: most land here
-- sits outside the formal register and a form whose first option is a C of O
-- teaches a landlord that he is in the wrong place. `lib/supply/roles.ts`
-- carries the same list in the same order for the owner form, and
-- `NO_DOCUMENT_ANSWER` is the tenth answer, which is not a subtype because
-- there is no document.
--
-- NO FIGURE, NO PENALTY AND NO LEGAL CLAIM IS ENCODED HERE. `lasrera_certificate`
-- and `esvarbon_certificate` are the names of documents a person may hold and
-- upload. What the law requires and what it costs to ignore rests on a search
-- summary rather than a primary source, so it is in `docs/BUILD_07_LEDGER.md`
-- section 5 for a lawyer and it is in no column, no constraint and no string
-- this product prints.
--
-- NO SECURITY DEFINER FUNCTION IS CREATED HERE, so rule 21 has nothing to
-- revoke, and the probe asserts that vacuum rather than assuming it.

alter type public.document_subtype add value if not exists 'certificate_of_occupancy';
alter type public.document_subtype add value if not exists 'deed_of_assignment';
alter type public.document_subtype add value if not exists 'governors_consent';
alter type public.document_subtype add value if not exists 'survey_plan';
alter type public.document_subtype add value if not exists 'land_use_charge_receipt';
alter type public.document_subtype add value if not exists 'gazette';
alter type public.document_subtype add value if not exists 'mandate_letter';
alter type public.document_subtype add value if not exists 'lasrera_certificate';
alter type public.document_subtype add value if not exists 'esvarbon_certificate';
