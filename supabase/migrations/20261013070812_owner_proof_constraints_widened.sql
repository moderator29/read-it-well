-- Applied 13 October 2026. The ownership document may name its registration, and 'Letter of authority' is an accepted answer.
set lock_timeout = '5s';
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

