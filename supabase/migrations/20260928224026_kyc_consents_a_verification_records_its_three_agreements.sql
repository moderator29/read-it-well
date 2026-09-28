-- /verification asks three separate agreements before identity documents are
-- sent: that the documents are the person's own and accurate, the terms and
-- privacy policy, and permission to process the details for identity and
-- fraud checks (NDPA: specific and freely given). There was nowhere to keep
-- them: terms_acceptances allows only terms, privacy and age_18_or_over and
-- grants no INSERT, and agent_applications.agree_terms is one boolean, while
-- a verification can be filed with no application at all.
--
-- One row per agreement per submission. Rows are only ever added: a consent
-- is a receipt, so there is no UPDATE or DELETE grant and no policy for them.
-- Deleting the account removes the rows with the user (on delete cascade).

create table public.kyc_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent text not null,
  consented_at timestamptz not null default now(),
  constraint kyc_consents_consent_known check (consent in ('accuracy', 'terms', 'processing'))
);

comment on table public.kyc_consents is
  'The three agreements given on /verification, one row each per submission. Append only.';

create index kyc_consents_user_id_idx on public.kyc_consents (user_id, consented_at desc);

alter table public.kyc_consents enable row level security;

revoke all on table public.kyc_consents from public, anon, authenticated;
grant select, insert on table public.kyc_consents to authenticated;

-- A person records and reads only their own; the time is the database's.
create policy kyc_consents_insert_own on public.kyc_consents
  for insert to authenticated
  with check (user_id = (select auth.uid()) and consented_at >= now() - interval '1 minute');

create policy kyc_consents_select_own on public.kyc_consents
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy kyc_consents_select_admin on public.kyc_consents
  for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

do $readback$
declare bad text := '';
begin
  if not (select relrowsecurity from pg_class where oid = 'public.kyc_consents'::regclass) then
    bad := bad || ' [rls off]';
  end if;
  if has_table_privilege('anon', 'public.kyc_consents', 'select') then
    bad := bad || ' [anon can read]';
  end if;
  if has_table_privilege('authenticated', 'public.kyc_consents', 'update')
     or has_table_privilege('authenticated', 'public.kyc_consents', 'delete') then
    bad := bad || ' [a consent can be changed]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
