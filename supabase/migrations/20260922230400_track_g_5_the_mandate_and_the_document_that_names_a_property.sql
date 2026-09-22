-- TRACK G, MIGRATION 5 OF 6: THE MANDATE, AND THE DOCUMENT THAT NAMES A PROPERTY.
--
-- THE MANDATE IS WHAT AN INTERMEDIARY HAS INSTEAD OF OWNERSHIP, and the
-- document is the least important field on this table. Nigerian guidance is to
-- ask for written evidence that the owner instructed the agent AND to confirm
-- it with the owner directly, because the document itself is a photograph and
-- a photograph of a letter proves that somebody owns a printer. The
-- principal's own name and a reachable number are what make it checkable, so
-- they are columns and the file is a nullable reference.
--
-- A PROPERTY MANAGER IS AN AGENT WITH A MANAGEMENT MANDATE, which is why
-- `kind` is a column here and not a fourth person role. A developer is an
-- owner plus `build_condition = 'off_plan'`, which already exists. Neither
-- costs a role and neither will.
--
-- OPEN MANDATES ARE ORDINARY IN NIGERIA and they are also how one property
-- ends up with four agents on it, so `exclusive` is recorded and is nullable,
-- because "we did not ask" and "no" are different answers.
--
-- A PUBLISHED LISTING'S MANDATE IS NOT PUBLIC, and that is a product decision
-- rather than a default. The reader is told a mandate was seen and WHEN, which
-- is `listings.mandate_verified_at` from migration 3. They are never shown the
-- principal's phone number, which is the exact thing that would let a reader
-- go round the agent and the exact thing an agent would refuse to upload if we
-- published it. Publish it and the supply side stops uploading mandates, and
-- the check we built dies of its own success.
--
-- OWNERSHIP AND MANDATE DOCUMENTS REUSE `agent_documents` WHOLESALE, because
-- every hard part of document review is already solved there: the supersedes
-- chain, the rejection-reason constraint, the private bucket with its uid
-- prefix checks, and `private.review_kyc_document`. What it lacked was any way
-- to say WHICH PROPERTY a document is about, because until today no document
-- was about one. That is one nullable column and two constraints.
--
-- THE SUBTYPES THESE DOCUMENTS CARRY were added by migration 2 of this set and
-- are committed before this file runs, because a new enum value cannot be used
-- in the transaction that adds it.
--
-- NO SECURITY DEFINER FUNCTION IS CREATED HERE, so rule 21 has nothing to
-- revoke, and the probe asserts that vacuum rather than assuming it.

create table if not exists public.listing_mandates (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  kind            text not null check (kind in ('letting', 'sale', 'management')),
  principal_name  text not null check (length(btrim(principal_name)) between 2 and 160),
  principal_phone text check (principal_phone is null or principal_phone ~ '^\+234[7-9][0-9]{9}$'),
  exclusive       boolean,
  signed_on       date,
  expires_on      date,
  document_id     uuid references public.agent_documents(id) on delete set null,
  review_status   public.document_review_status not null default 'pending',
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  rejection_reason text,
  created_at      timestamptz not null default now(),
  constraint listing_mandates_dates_chk
    check (expires_on is null or signed_on is null or expires_on >= signed_on),
  -- The same law as `agent_documents_rejection_has_a_reason`. A refusal a
  -- person cannot read is a refusal they cannot answer.
  constraint listing_mandates_rejection_has_a_reason
    check (review_status <> 'rejected'
           or (rejection_reason is not null and length(btrim(rejection_reason)) >= 8)),
  constraint listing_mandates_decision_has_a_decider
    check (review_status = 'pending' or (reviewed_by is not null and reviewed_at is not null))
);

comment on table public.listing_mandates is
  'What an intermediary has instead of ownership: a written instruction from a named principal, and a number to ring. The call back is the check; the document is a photograph. Never public: the reader learns that a mandate was seen and when, from listings.mandate_verified_at, and never the principal''s number.';

comment on column public.listing_mandates.principal_phone is
  'The number a reviewer rings. NEVER SENT TO A READER on any surface. Rule 16 also applies: it is not logged and not pasted.';

comment on column public.listing_mandates.exclusive is
  'Nullable on purpose. "We did not ask" and "no" are different answers, and open mandates are ordinary here.';

create unique index if not exists listing_mandates_one_live
  on public.listing_mandates (listing_id) where review_status <> 'rejected';
create index if not exists listing_mandates_listing_idx  on public.listing_mandates (listing_id);
create index if not exists listing_mandates_reviewer_idx on public.listing_mandates (reviewed_by);
create index if not exists listing_mandates_document_idx on public.listing_mandates (document_id);

alter table public.listing_mandates enable row level security;

drop policy if exists listing_mandates_select_own on public.listing_mandates;
create policy listing_mandates_select_own
  on public.listing_mandates for select
  using (private.owns_listing(listing_mandates.listing_id));

drop policy if exists listing_mandates_insert_own on public.listing_mandates;
create policy listing_mandates_insert_own
  on public.listing_mandates for insert
  with check (private.owns_listing(listing_mandates.listing_id));

-- THE LISTER MAY AMEND THEIR OWN MANDATE AND MAY NOT DECIDE IT. A person who
-- could write `review_status` could approve their own mandate, which would
-- make the whole table decorative. The update policy is deliberately absent
-- for that reason: a correction is a fresh row under
-- `listing_mandates_one_live`, and a decision is staff.
drop policy if exists listing_mandates_staff_all on public.listing_mandates;
create policy listing_mandates_staff_all
  on public.listing_mandates for all
  using (private.has_role((select auth.uid()), 'admin')
         or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin')
              or private.has_role((select auth.uid()), 'super_admin'));

/* ------------------------- the document that knows which property it is about */

alter table public.agent_documents
  add column if not exists listing_id uuid references public.listings(id) on delete cascade;

alter table public.agent_documents drop constraint if exists agent_documents_kind_known;
alter table public.agent_documents
  add constraint agent_documents_kind_known
    check (kind in ('identity', 'address', 'business', 'selfie', 'association',
                    'ownership', 'mandate'));

-- The two new kinds are ABOUT a property by definition, so a row of either
-- kind without a listing is a document filed against nothing.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.agent_documents'::regclass
                  and conname = 'agent_documents_property_kinds_name_a_listing') then
    alter table public.agent_documents
      add constraint agent_documents_property_kinds_name_a_listing
        check (kind not in ('ownership', 'mandate') or listing_id is not null);
  end if;
end$$;

create index if not exists agent_documents_listing_idx
  on public.agent_documents (listing_id) where listing_id is not null;

comment on column public.agent_documents.listing_id is
  'WHICH PROPERTY this document is about, for the two kinds that are about one. Until today no document was about a property: every kind here was about a PERSON, which is why the verified badge has always meant the agent passed checks and has said nothing about the address.';

-- The existing select policy reaches a row by uploader or by application. A
-- property document belongs to whoever holds the listing, so that arm is added
-- as its own policy rather than by rewriting somebody else's.
drop policy if exists agent_documents_select_by_listing on public.agent_documents;
create policy agent_documents_select_by_listing
  on public.agent_documents for select
  using (agent_documents.listing_id is not null
         and private.owns_listing(agent_documents.listing_id));
