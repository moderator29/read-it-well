-- M14. A host applies with papers and consents.
--
-- The businesses row IS the application (docs/research/HOST_ONBOARDING_RESEARCH.md
-- section 3.2): one DRAFT row created at step two, everything after written
-- onto it under owner RLS, status flipped to SUBMITTED by the review step.
-- M2 (BE1) already gave the row its status on listing_status, submitted_at,
-- reviewed_at, reviewer_id and review_notes, so the decision columns this
-- build needs already exist under those names and are not duplicated here.
--
-- What this file adds is the host's half of the ladder: which of the three
-- host shapes they are, the registration facts for the business branch, the
-- representative, the three separate consents with their timestamps, the two
-- attestations that render as dated facts (never as rungs), the private
-- bucket their documents go in, and the row per document that lets a
-- reviewer open it. Additive throughout.

/* ---------------------------------------------------- businesses columns */

alter table public.businesses
  add column if not exists host_type text
    check (host_type is null or host_type in ('individual', 'business', 'restaurant')),
  -- Loose on purpose: RC, BN or IT prefix, optional space or hyphen, four to
  -- ten digits, any case. Verification is a rung, not a regex.
  add column if not exists cac_number text
    check (cac_number is null or cac_number ~* '^(RC|BN|IT)?\s?-?\d{4,10}$'),
  add column if not exists registered_name text
    check (registered_name is null or length(btrim(registered_name)) between 2 and 160),
  add column if not exists tin text
    check (tin is null or tin ~ '^[0-9-]{8,20}$'),
  add column if not exists representative_name text
    check (representative_name is null or length(btrim(representative_name)) between 2 and 120),
  add column if not exists representative_phone text
    check (representative_phone is null or representative_phone ~ '^\+234[7-9][0-9]{9}$'),
  -- Three separate decisions, each carrying the instant it was made:
  -- {"accuracy": "<iso>", "terms": "<iso>", "processing": "<iso>"}. A key that
  -- is absent is a consent not given. Never one bundled tick.
  add column if not exists consents jsonb not null default '{}'::jsonb
    check (jsonb_typeof(consents) = 'object'),
  add column if not exists hygiene_attested_at timestamptz,
  add column if not exists licence_attested_at timestamptz;

comment on column public.businesses.host_type is
  'Which onboarding branch this host walked: individual, business (CAC-registered) or restaurant. Null on partner rows.';
comment on column public.businesses.cac_number is
  'The RC or BN number as typed, format-checked loosely at entry. Verified by a human against the CAC public search as the registration rung.';
comment on column public.businesses.consents is
  'The three separate consents (accuracy, terms, processing) as ISO instants keyed by consent id. An absent key is a consent not given.';
comment on column public.businesses.hygiene_attested_at is
  'When the restaurant attested to a current health permit and food-handler certificates. Rendered as a dated fact, never as a rung or a badge.';
comment on column public.businesses.licence_attested_at is
  'When the host attested to a current state hospitality licence. Rendered as a dated fact, never as a rung or a badge.';

/* --------------------------------------------------------------- documents */

create table if not exists public.business_documents (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  kind         text not null check (kind in ('identity', 'registration', 'association', 'licence', 'hygiene')),
  storage_path text not null check (length(storage_path) between 1 and 400),
  uploaded_by  uuid not null references auth.users(id) on delete cascade,
  uploaded_at  timestamptz not null default now()
);

comment on table public.business_documents is
  'One row per document a host uploaded to the host-documents bucket: the representative''s ID, the CAC certificate, proof of association, licence and hygiene papers. Owner writes under RLS; reviewers read.';

create index if not exists business_documents_business_idx
  on public.business_documents (business_id);
create index if not exists business_documents_uploaded_by_idx
  on public.business_documents (uploaded_by);

alter table public.business_documents enable row level security;

-- The owner files documents while the application is theirs to edit, and
-- only under their own uid prefix, which the storage policy enforces on the
-- upload and this check enforces on the record.
drop policy if exists business_documents_owner_insert on public.business_documents;
create policy business_documents_owner_insert
  on public.business_documents for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (
      select 1 from public.businesses b
      where b.id = business_documents.business_id
        and b.owner_id = (select auth.uid())
        and b.status in ('DRAFT', 'SUBMITTED', 'MORE_INFO_REQUIRED')
    )
  );

drop policy if exists business_documents_owner_select on public.business_documents;
create policy business_documents_owner_select
  on public.business_documents for select to authenticated
  using (private.owns_business(business_id));

drop policy if exists business_documents_owner_delete on public.business_documents;
create policy business_documents_owner_delete
  on public.business_documents for delete to authenticated
  using (
    private.owns_business(business_id)
    and exists (
      select 1 from public.businesses b
      where b.id = business_documents.business_id
        and b.status in ('DRAFT', 'MORE_INFO_REQUIRED')
    )
  );

drop policy if exists business_documents_admin_select on public.business_documents;
create policy business_documents_admin_select
  on public.business_documents for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

revoke all on public.business_documents from anon;
revoke update on public.business_documents from authenticated;

/* ------------------------------------------------------------------ bucket */

-- Private, uid-prefixed, the same limits and the same five policies as
-- agent-documents (20260730122616): these are IDs and certificates.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'host-documents',
  'host-documents',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists host_documents_objects_insert_own on storage.objects;
create policy host_documents_objects_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'host-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists host_documents_objects_select_own on storage.objects;
create policy host_documents_objects_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'host-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists host_documents_objects_update_own on storage.objects;
create policy host_documents_objects_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'host-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'host-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists host_documents_objects_delete_own on storage.objects;
create policy host_documents_objects_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'host-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists host_documents_objects_admin_select on storage.objects;
create policy host_documents_objects_admin_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'host-documents'
    and (
      private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin')
    )
  );
