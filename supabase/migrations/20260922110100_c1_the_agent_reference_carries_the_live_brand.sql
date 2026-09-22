-- THE AGENT REFERENCE CARRIES THE LIVE BRAND.
--
-- `public.agent_applications.reference` has defaulted to `NF-AGT-#####` since
-- `20260728152104_agents_core.sql:36`. `NF` is the dead brand prefix. The
-- brand is Vallo and has been for weeks, so an applicant filing today would be
-- handed a code naming a company that no longer exists, and would then read it
-- out to a support agent who has never seen those two letters.
--
-- Renamed in the same pass as the listing code, because the two are the same
-- decision and splitting them leaves the product speaking two brands.
--
-- NOTHING IS REWRITTEN. `public.agent_applications` holds zero rows on this
-- estate, so no reference anybody has been shown changes meaning. Had there
-- been rows they would have been left alone: a code a person is holding is a
-- promise, and a rename would break it. Only the default moves.
--
-- The sequence is not reset. Its numbers are internal and continuous
-- numbering across a rename is the honest record of how many applications
-- have ever been started.

alter table public.agent_applications
  alter column reference
  set default ('VL-AGT-' || lpad(nextval('public.agent_ref_seq')::text, 5, '0'));

comment on column public.agent_applications.reference is
  'The code an applicant reads out to support. VL-AGT-##### from a sequence, which is correct here and wrong for a listing: this reference is never public, so counting it leaks nothing.';
