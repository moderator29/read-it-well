-- Applied 13 October 2026. PAY ON VALLO 7 of 8. Apply BEFORE the app on
-- track/pay-on-vallo is deployed: its registration actions write this column.
-- Ruling 6: every workspace application and setup records, before submit,
-- that the person read and accepts the Terms of Service and the Privacy
-- Policy, and that every payment for a deal they make on Vallo happens inside
-- Vallo, each with its version and moment.
--
-- The record follows the host publish step's own pattern: a `consents` jsonb
-- whose `agreements` array holds {document, version, at} (businesses.consents,
-- appended by saveHostDraft). Hosts already have it; owner, agent and firm
-- registrations and the professional application (all one table,
-- agent_applications) get the same column. An applicant writes their own row
-- under the existing RLS and guard, as they write every other column.
--
-- private.consents_accepted(consents, document) is the one reader; pov08's
-- submit gates use it.
-- Probe: supabase/tests/probes-pending/pov07-workspace-acceptance-record.sql
set lock_timeout = '5s';

alter table public.agent_applications
  add column if not exists consents jsonb not null default '{}'::jsonb;

comment on column public.agent_applications.consents is
  'Ruling 6 (13 Oct 2026): {agreements: [{document, version, at}]}, as businesses.consents. Documents: terms, privacy, pay_on_vallo.';

create or replace function private.consents_accepted(p_consents jsonb, p_document text)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $fn$
  select case
    when jsonb_typeof(p_consents -> 'agreements') is distinct from 'array' then false
    else exists (
      select 1 from jsonb_array_elements(p_consents -> 'agreements') e
       where e ->> 'document' = p_document
         and jsonb_typeof(e -> 'version') = 'string' and length(e ->> 'version') between 1 and 40
         and jsonb_typeof(e -> 'at') = 'string')
  end;
$fn$;

revoke all on function private.consents_accepted(jsonb, text) from public, anon, authenticated;
