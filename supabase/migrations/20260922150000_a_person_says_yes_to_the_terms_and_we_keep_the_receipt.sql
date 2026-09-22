-- A person says yes to the terms, and we keep the receipt.
--
-- WHAT WAS MISSING. This platform has terms of service, a privacy notice and a
-- sign-up form that tells a person they accept both, and nothing anywhere
-- recorded THAT a given person accepted, WHICH VERSION they accepted, or WHEN.
-- The acceptance existed as a sentence on a screen and as nothing else.
--
-- WHY IT IS NOT A NICE TO HAVE FOR THIS COMPANY IN PARTICULAR.
--
--   * The NDPA requires a controller to be able to DEMONSTRATE the lawful
--     basis it processes on. "Our sign-up page said so" is not a record of
--     anybody's consent; a dated row naming the version they were shown is.
--   * VALLO SPACES LTD is a registered DNFBP moving money in Nigeria and
--     carries AML record-keeping obligations that run for years after a
--     relationship ends. The terms are where the customer's own obligations
--     live, so the date and version they agreed to is part of that file.
--   * The terms themselves say that continuing to use Vallo after a change
--     means accepting the updated terms. That sentence is only meaningful if
--     the platform knows which version each person last accepted, which is
--     exactly what it could not know.
--
-- IT IS A RECORD YOU NEED BEFORE YOU NEED IT. The day somebody disputes a
-- charge, or a regulator asks, is too late to start keeping it, because the
-- rows would have to be invented and an invented record is worse than none.
--
-- WHAT IS DELIBERATELY NOT STORED. No IP address, no user agent, no device
-- fingerprint. The founder's rule 16 says never log a personal datum that the
-- job does not need, and the job here is the date and the version. An address
-- would make this table a movement log of every person who has ever signed up,
-- which is a far larger disclosure than the fact it exists to hold.

create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  /*
   * Which document. Two today; a check rather than an enum, because a new
   * document is a one line change and an enum value cannot be removed.
   */
  document text not null check (document in ('terms', 'privacy')),
  /*
   * The version string the person was shown, as
   * `apps/web/src/lib/legal/versions.ts` held it at that moment. A date-shaped
   * string so a human reading a row knows what it means without a lookup.
   */
  version text not null check (length(btrim(version)) between 1 and 40),
  accepted_at timestamptz not null default now(),
  /*
   * How the yes was given: `signup_email`, `signup_oauth`, or a re-acceptance
   * after a change. Free text with a ceiling, because the list will grow and
   * the column is evidence rather than a control.
   */
  source text not null default 'signup' check (length(btrim(source)) between 1 and 40)
);

/*
 * ONE ROW PER PERSON PER DOCUMENT PER VERSION. A person who signs in again has
 * not accepted anything new, and a second row for the same version would turn
 * a record into a log of page views. When the version bumps, the next
 * acceptance is a NEW row and the old one stays, which is the whole point: the
 * history is what an auditor asks for.
 */
create unique index if not exists terms_acceptances_once
  on public.terms_acceptances (user_id, document, version);

create index if not exists terms_acceptances_user_idx
  on public.terms_acceptances (user_id, accepted_at desc);

comment on table public.terms_acceptances is
  'Which version of which legal document a person accepted, and when. Written by the server at sign up and on a re-acceptance. No client may write it and no client may delete it: it is evidence, and evidence a party can edit is not evidence.';

alter table public.terms_acceptances enable row level security;

/*
 * A PERSON MAY READ THEIR OWN AND AN ADMIN MAY READ ANYBODY'S, AND THAT IS ALL
 * THE POLICY THERE IS.
 *
 * There is deliberately no insert, update or delete policy for any client
 * role. The only writer is the server holding the service role, at the moment
 * the person actually said yes. A row somebody can write is a row somebody can
 * forge, and a row somebody can delete is a record that disappears exactly
 * when it matters. This is the same posture `audit_log` carries and for the
 * same reason.
 */
drop policy if exists terms_acceptances_select_own on public.terms_acceptances;
create policy terms_acceptances_select_own
  on public.terms_acceptances for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists terms_acceptances_admin_select on public.terms_acceptances;
create policy terms_acceptances_admin_select
  on public.terms_acceptances for select
  to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::app_role)
    or private.has_role((select auth.uid()), 'super_admin'::app_role)
  );

grant select on public.terms_acceptances to authenticated;

-- RULE 21 IS NOT SILENT HERE, IT IS SATISFIED BY SHAPE. This migration creates
-- NO function at all, SECURITY DEFINER or otherwise. The write is an ordinary
-- insert by the service role from `lib/legal/acceptance.ts`, so there is no
-- new callable surface for `anon` or `authenticated` to reach, and the probe
-- proves that by showing the table refuses a write from a signed-in client
-- while the row it cannot write is readable by its owner.
