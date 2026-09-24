-- STORE-19: the Terms require 18 or over, and sign-up now asks. The person's
-- own statement is kept beside the terms receipt as document
-- 'age_18_or_over' (version '18+'), written by the server with the service
-- role exactly as the terms and privacy rows are. Widening the check is all
-- the table needs; its policies (none for insert, update or delete by a
-- member) are unchanged.
alter table public.terms_acceptances
  drop constraint if exists terms_acceptances_document_check;
alter table public.terms_acceptances
  add constraint terms_acceptances_document_check
  check (document = any (array['terms'::text, 'privacy'::text, 'age_18_or_over'::text]));
