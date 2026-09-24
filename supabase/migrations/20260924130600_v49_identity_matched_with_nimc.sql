-- V-49, THE IDENTITY RUNG BECOMES A vNIN CHECK, AND THE RAW NIN IS NEVER STORED.
--
-- Today the identity rung means "a member of staff looked at a photograph of
-- an ID card", and a printer beats that. With a NIMC-licensed aggregator
-- (founder question 4) it can mean: NIMC confirmed this NIN through a
-- merchant-specific virtual NIN the applicant generated on the NIN-linked
-- phone, and the name matches the application. This file is the database half,
-- built to the boundary and switched off:
--
--   public.identity_verifications   one row per check, whichever way it went:
--                                   the verified legal name, an HMAC of the NIN
--                                   (never the NIN), the aggregator's
--                                   reference, the liveness score, the outcome.
--                                   A NIN matched to one account cannot be
--                                   matched to another (unique HMAC among
--                                   matched rows): the ban that follows the
--                                   person needs exactly this.
--   public.record_vnin_check        service role only. Writes the row and moves
--                                   the identity rung through the existing
--                                   `private.record_verification_check` (which
--                                   writes the audit row): a clean match PASSES
--                                   with the vNIN service named as the decider
--                                   in the note; anything else leaves the rung
--                                   PENDING with both names side by side, for
--                                   the human desk.
--   private.lister_verified_names   re-created (from V-04) to include the
--                                   NIMC-matched legal name, so the account
--                                   check compares with it too.
--
-- THE PHOTO ROUTE STAYS, as the labelled fallback for broken NIMC records. The
-- supplier's own ladder can tell "identity seen" from "identity matched with
-- NIMC" by the `method` column; the public badge keeps one meaning.
--
-- THE FLAG. `feature_flags.vnin_identity`, false, until the founder signs an
-- aggregator. The payout rung's name matcher (the other half of V-49) ships on:
-- it is a suggestion on the staff desk, not a decision, and needs no vendor.

create table if not exists public.identity_verifications (
  id             uuid primary key default gen_random_uuid(),
  subject_id     uuid not null references auth.users(id) on delete cascade,
  method         text not null check (method in ('vnin', 'photo')),
  outcome        text not null check (outcome in ('matched', 'mismatch')),
  legal_name     text check (legal_name is null or length(btrim(legal_name)) between 2 and 200),
  nin_hmac       text check (nin_hmac is null or nin_hmac ~ '^[0-9a-f]{64}$'),
  provider_ref   text check (provider_ref is null or length(provider_ref) <= 200),
  liveness_score numeric(5, 4) check (liveness_score is null or (liveness_score >= 0 and liveness_score <= 1)),
  note           text check (note is null or length(note) <= 1000),
  decided_at     timestamptz not null default now(),
  constraint identity_verifications_vnin_has_its_proof check (
    method <> 'vnin' or (nin_hmac is not null and provider_ref is not null)
  )
);

comment on table public.identity_verifications is
  'V-49. Each identity check: method, outcome, the legal name NIMC holds, an HMAC of the NIN (never the NIN), the aggregator reference and the liveness score. Written by the service role only.';
comment on column public.identity_verifications.nin_hmac is
  'HMAC-SHA256 of the NIN under a server-held key, hex. It lets one NIN be recognised on a second account without the NIN ever being stored.';

create unique index if not exists identity_verifications_one_account_per_nin
  on public.identity_verifications (nin_hmac) where outcome = 'matched' and nin_hmac is not null;
create index if not exists identity_verifications_subject_idx
  on public.identity_verifications (subject_id, decided_at desc);

revoke all on public.identity_verifications from public, anon, authenticated;
alter table public.identity_verifications enable row level security;

drop policy if exists identity_verifications_select_own on public.identity_verifications;
create policy identity_verifications_select_own on public.identity_verifications
  for select to authenticated
  using (subject_id = (select auth.uid()));

drop policy if exists identity_verifications_select_staff on public.identity_verifications;
create policy identity_verifications_select_staff on public.identity_verifications
  for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

/* The subject and staff read the row, but never the HMAC: a column grant. */
grant select (id, subject_id, method, outcome, legal_name, provider_ref, liveness_score, note, decided_at)
  on public.identity_verifications to authenticated;
grant all on public.identity_verifications to service_role;

/* ------------------------------------------------------ recording a check */

create or replace function public.record_vnin_check(
  p_user uuid,
  p_legal_name text,
  p_nin_hmac text,
  p_provider_ref text,
  p_liveness numeric,
  p_matched boolean,
  p_note text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  agent uuid;
  elsewhere boolean;
begin
  select a.id into agent from public.agents a where a.user_id = p_user and not a.is_demo;
  if agent is null then return 'no_agent'; end if;
  if p_nin_hmac !~ '^[0-9a-f]{64}$' or p_provider_ref is null then return 'invalid'; end if;

  select exists (
    select 1 from public.identity_verifications v
     where v.nin_hmac = p_nin_hmac and v.outcome = 'matched' and v.subject_id <> p_user
  ) into elsewhere;

  if elsewhere then
    insert into public.identity_verifications (subject_id, method, outcome, legal_name, nin_hmac, provider_ref, liveness_score, note)
    /* The hash is kept on the refused attempt too: it is how the desk sees
       which account already holds this NIN. Only MATCHED rows are unique. */
    values (p_user, 'vnin', 'mismatch', p_legal_name, p_nin_hmac, p_provider_ref, p_liveness,
            'This NIN is already matched to another Vallo account.');
    perform private.record_verification_check(agent, 'identity', 'pending',
      'The vNIN check returned a NIN already matched to another Vallo account. Somebody should look at this.', null);
    return 'nin_elsewhere';
  end if;

  insert into public.identity_verifications (subject_id, method, outcome, legal_name, nin_hmac, provider_ref, liveness_score, note)
  values (p_user, 'vnin', case when p_matched then 'matched' else 'mismatch' end,
          p_legal_name, p_nin_hmac, p_provider_ref, p_liveness, left(p_note, 1000));

  perform private.record_verification_check(
    agent,
    'identity',
    case when p_matched then 'passed' else 'pending' end,
    case when p_matched
      then 'Identity matched with NIMC by the vNIN service (reference ' || p_provider_ref || '). ' || coalesce(p_note, '')
      else 'The vNIN check did not match the application. ' || coalesce(p_note, '') || ' Somebody should look at this.'
    end,
    null
  );
  return case when p_matched then 'passed' else 'pending' end;
end;
$$;

comment on function public.record_vnin_check(uuid, text, text, text, numeric, boolean, text) is
  'V-49. Service role only. Records a vNIN check and moves the identity rung: passed on a clean match with the service named in the note, pending with both names for anything else, and pending when the NIN is already matched to another account.';

revoke all on function public.record_vnin_check(uuid, text, text, text, numeric, boolean, text) from public, anon, authenticated;
grant execute on function public.record_vnin_check(uuid, text, text, text, numeric, boolean, text) to service_role;

/* ------------------------- V-04's names now include the NIMC-matched name */

create or replace function private.lister_verified_names(p_user uuid)
returns table (kind text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'person'::text, btrim(app.full_name)
    from public.agents a
    join public.agent_applications app on app.id = a.application_id
   where a.user_id = p_user
     and app.full_name is not null and btrim(app.full_name) <> ''
     and exists (select 1 from public.agent_verification_checks v
                  where v.agent_id = a.id and v.kind = 'identity' and v.status = 'passed')
  union
  select 'business'::text, btrim(app.business_name)
    from public.agents a
    join public.agent_applications app on app.id = a.application_id
   where a.user_id = p_user
     and app.business_name is not null and btrim(app.business_name) <> ''
     and exists (select 1 from public.agent_verification_checks v
                  where v.agent_id = a.id and v.kind = 'identity' and v.status = 'passed')
  union
  select 'person'::text, btrim(p.resolved_account_name)
    from public.agents a
    join public.payout_accounts p on p.agent_id = a.id
   where a.user_id = p_user
     and p.resolved_account_name is not null and btrim(p.resolved_account_name) <> ''
     and exists (select 1 from public.agent_verification_checks v
                  where v.agent_id = a.id and v.kind = 'payout' and v.status = 'passed')
  union
  select 'person'::text, btrim(iv.legal_name)
    from public.identity_verifications iv
   where iv.subject_id = p_user and iv.outcome = 'matched' and iv.legal_name is not null;
$$;

revoke all on function private.lister_verified_names(uuid) from public, anon, authenticated;
grant execute on function private.lister_verified_names(uuid) to service_role;

insert into public.feature_flags (key, enabled, note)
values ('vnin_identity', false,
        'V-49. When true, an applicant can pass the identity rung with a NIMC virtual NIN through the identity aggregator. Needs the aggregator contract (founder question 4).')
on conflict (key) do nothing;

do $readback$
declare bad text := '';
begin
  if has_column_privilege('authenticated', 'public.identity_verifications', 'nin_hmac', 'select') then
    bad := bad || ' [the NIN hash is readable]';
  end if;
  if has_table_privilege('authenticated', 'public.identity_verifications', 'insert')
     or has_table_privilege('authenticated', 'public.identity_verifications', 'update') then
    bad := bad || ' [a member can write a verification]';
  end if;
  if has_function_privilege('authenticated', 'public.record_vnin_check(uuid,text,text,text,numeric,boolean,text)', 'execute') then
    bad := bad || ' [a member can record their own check]';
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'identity_verifications' and column_name in ('nin', 'vnin')) then
    bad := bad || ' [a column holds the NIN]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
