-- Verification, wired all the way through, and pointed at the right people.
--
-- WHO HAS TO VERIFY, AND WHO MUST NEVER BE ASKED.
--
-- The owner's rule: sellers and agents. Never buyers, never renters, and
-- browsing and renting are never gated behind it. The reason is a
-- marketplace's oldest arithmetic. Demand is elastic and supply is not: a
-- renter asked to photograph a driving licence before they can see what a flat
-- costs simply closes the tab and the platform never learns why. The person who
-- must be identifiable is the person RECEIVING money and standing between
-- somebody and a building.
--
-- private.verification_is_required below therefore answers yes for the roles
-- that list property or take money, which is seller, landlord and agent, and no
-- for renter and buyer. Landlord is on that list and it deserves saying out
-- loud, because the owner named sellers and agents: a landlord is neither a
-- buyer nor a renter, they collect a caution deposit and hand over keys, and
-- exempting them would leave the single largest category of money-receiving
-- user unverified. Renter and buyer, the two the rule protects, are untouched.
--
-- WHAT WAS ALREADY HERE AND IS EXTENDED RATHER THAN REPLACED.
--
--   public.agent_documents          had a bucket, an insert policy and no
--                                   review workflow at all. A reviewer could
--                                   see a document and had nowhere to record a
--                                   decision, so approving somebody meant
--                                   approving the whole application on a hunch.
--   public.agent_verification_checks is genuinely good work: a four rung ladder
--                                   (identity, address, payout, in_person) with
--                                   a trigger that recomputes agents.verification_tier.
--                                   Nothing here changes its shape. Two things
--                                   are added: a function that records a rung
--                                   with an audit entry, and the payout rung
--                                   finally being reachable.
--
-- THE PAYOUT RUNG WAS FREE AND UNUSED. lib/payments/paystack.ts has exported
-- resolveAccountNumber since the payments work: it hands Paystack an account
-- number and a bank code and gets back the name the bank actually holds for
-- that account. Nothing called it. That is a fully automated identity check,
-- already paid for, sitting idle, and it is the strongest evidence available
-- short of meeting somebody: a Nigerian bank has already done KYC on that
-- account and will tell you whose it is. payout_accounts could not use it
-- because it stored a bank NAME and Paystack needs a bank CODE, so the column
-- is added here and the comparison lives in private.verify_payout_account.

begin;

/* ------------------------------------------------------- document review */

create type public.document_review_status as enum ('pending', 'approved', 'rejected');

/*
 * The specific document, under the category.
 *
 * `kind` stays 'identity' or 'address' or 'business' because that is what the
 * uploader in components/verification speaks and the categories are what the
 * ladder rungs key off. What was missing is WHICH document: a reviewer looking
 * at a blurred photograph needs to know whether they are being shown a NIN
 * card or a utility bill before they can judge it, and "under three months
 * old" is a rule that can only be checked against a stated issue date.
 */
create type public.document_subtype as enum (
  'passport',
  'drivers_licence',
  'nin_card',
  'voters_card',
  'utility_bill',
  'bank_statement',
  'tenancy_agreement',
  'cac_certificate',
  'tax_certificate',
  'business_address_proof'
);

alter table public.agent_documents
  /* An application is no longer required. A seller who lists a property they
     own is not applying to be an agent and has no agent_applications row, and
     the old NOT NULL made it literally impossible for them to file a document.
     Zero rows exist, so this widens nothing that was already written. */
  alter column application_id drop not null,

  /* Who uploaded it. Previously derivable only by joining through the
     application, which stops working the moment application_id is null. */
  add column uploader_id uuid references auth.users(id) on delete cascade,

  add column subtype public.document_subtype,
  /* When the document itself was issued. The three month rule on a proof of
     address has no meaning without it, and uploaded_at is not it: somebody can
     upload a two year old bill today. */
  add column issued_on date,

  add column review_status public.document_review_status not null default 'pending',
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz,
  add column rejection_reason text,

  /* Re-submission. A rejected document is never edited or deleted: a new row
     points at the one it replaces, so the reviewer can see that this is the
     third attempt and what was wrong with the first two. */
  add column supersedes_id uuid references public.agent_documents(id) on delete set null;

alter table public.agent_documents
  add constraint agent_documents_kind_known
    check (kind in ('identity', 'address', 'business')),
  /*
   * A REJECTION WITHOUT A REASON IS THE WHOLE FAILURE THIS CONSTRAINT PREVENTS.
   *
   * Somebody who is told "rejected" and nothing else cannot fix anything. They
   * re-upload the same photograph, it is rejected again, and they conclude the
   * platform is refusing them personally. The reason is required by the
   * database so that no future code path, however hurried, can skip it.
   */
  add constraint agent_documents_rejection_has_a_reason
    check (
      review_status <> 'rejected'
      or (rejection_reason is not null and char_length(btrim(rejection_reason)) >= 8)
    ),
  add constraint agent_documents_decision_has_a_decider
    check (review_status = 'pending' or (reviewed_by is not null and reviewed_at is not null)),
  add constraint agent_documents_belongs_to_somebody
    check (application_id is not null or uploader_id is not null);

comment on column public.agent_documents.issued_on is
  'When the document was issued, as stated by the uploader. A proof of address must be under three months old and uploaded_at cannot answer that: somebody can upload a two year old bill today.';

comment on column public.agent_documents.supersedes_id is
  'The document this one replaces. Re-submission is a new row, never an edit, so a reviewer sees the history of attempts and what was wrong with each.';

-- The reviewer's queue, and the uploader's own list.
create index agent_documents_pending_idx
  on public.agent_documents (uploaded_at)
  where review_status = 'pending';
create index agent_documents_uploader_idx
  on public.agent_documents (uploader_id, uploaded_at desc)
  where uploader_id is not null;
create index agent_documents_supersedes_idx
  on public.agent_documents (supersedes_id)
  where supersedes_id is not null;
create index agent_documents_reviewed_by_idx
  on public.agent_documents (reviewed_by)
  where reviewed_by is not null;

/* ------------------------------------------------------- business details */

/*
 * What a property business is, beyond a name and an RC number.
 *
 * agent_applications already carried business_name and business_rc. The other
 * five are what actually lets a reviewer establish that a company exists: a tax
 * identification number is issued by the FIRS against a real registration, a
 * business email on a domain is worth more than a gmail address, and a date of
 * establishment that predates the CAC certificate is a document that has been
 * altered.
 */
alter table public.agent_applications
  add column if not exists business_tax_id text,
  add column if not exists business_email text,
  add column if not exists business_phone text,
  add column if not exists business_established_on date,
  add column if not exists business_address text;

alter table public.agent_applications
  add constraint agent_applications_business_established_plausible
    check (
      business_established_on is null
      or (business_established_on >= date '1900-01-01' and business_established_on <= current_date)
    );

/* ------------------------------------------------------ the payout rung */

/*
 * The bank code, without which the free verification could not be called.
 *
 * Nullable because every payout account written before this file has a bank
 * name and no code, and refusing to load them would break the payout screen for
 * a verification improvement. An account with no code simply cannot climb this
 * rung until somebody re-picks their bank from the list.
 */
alter table public.payout_accounts
  add column if not exists bank_code text,
  /* What the BANK says the account is called, as opposed to what the person
     typed. These two disagreeing is the signal. */
  add column if not exists resolved_account_name text,
  add column if not exists resolved_at timestamptz;

comment on column public.payout_accounts.resolved_account_name is
  'The name Paystack reports the bank holds for this account number. Not the name the person typed into account_name, which is the point: the two disagreeing is what this column exists to reveal.';

/*
 * Two names, one question: are these the same person?
 *
 * Nigerian bank records and identity documents disagree constantly in ways that
 * mean nothing: order (ADEBAYO OLUWASEUN JOHN against John Oluwaseun Adebayo),
 * punctuation, double spaces, a middle name present in one and absent in the
 * other. A string equality test would reject almost every genuine account and
 * teach reviewers to override it, which is worse than not having it.
 *
 * So: casefold, strip everything that is not a letter or a space, split into
 * words, and require that every word of the SHORTER name appears in the longer.
 * That accepts a missing middle name and any ordering, and rejects a different
 * person. It is deliberately not fuzzy: no edit distance, no soundex. A near
 * miss on a name is exactly the case a human should look at.
 */
create or replace function private.name_matches(a text, b text)
returns boolean
language plpgsql
immutable
as $$
declare
  wa text[];
  wb text[];
  shorter text[];
  longer text[];
  w text;
begin
  if a is null or b is null then
    return false;
  end if;
  wa := regexp_split_to_array(
          btrim(regexp_replace(lower(a), '[^a-z ]+', ' ', 'g')), '\s+');
  wb := regexp_split_to_array(
          btrim(regexp_replace(lower(b), '[^a-z ]+', ' ', 'g')), '\s+');
  wa := array_remove(wa, '');
  wb := array_remove(wb, '');
  if coalesce(array_length(wa, 1), 0) = 0 or coalesce(array_length(wb, 1), 0) = 0 then
    return false;
  end if;
  -- A single word matching a single word is a coincidence waiting to happen.
  if array_length(wa, 1) < 2 and array_length(wb, 1) < 2 then
    return wa[1] = wb[1];
  end if;

  if array_length(wa, 1) <= array_length(wb, 1) then
    shorter := wa; longer := wb;
  else
    shorter := wb; longer := wa;
  end if;

  foreach w in array shorter loop
    if not (w = any (longer)) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

comment on function private.name_matches is
  'Are these two names the same person? Order independent, punctuation blind, tolerant of a missing middle name, and deliberately not fuzzy: a near miss is exactly the case a human should look at.';

/* --------------------------------------------------------- the ladder */

/*
 * Record a rung, with an audit entry, in one place.
 *
 * agent_verification_checks already has a trigger that recomputes
 * agents.verification_tier from its rows, so writing a row IS climbing the
 * ladder and nothing here recomputes a tier. What was missing was the audit
 * entry: somebody's verification level could change and the only record was the
 * row itself, with no actor and no reason.
 */
create or replace function private.record_verification_check(
  p_agent uuid,
  p_kind text,
  p_status text,
  p_note text,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  check_id uuid;
begin
  if p_kind not in ('identity', 'address', 'payout', 'in_person') then
    return jsonb_build_object('status', 'unknown_rung');
  end if;
  if p_status not in ('passed', 'failed', 'pending') then
    return jsonb_build_object('status', 'unknown_result');
  end if;

  -- One row per agent per rung. Climbing a rung twice is the same fact stated
  -- twice, and two rows would make the tier arithmetic depend on which one the
  -- planner saw first.
  insert into public.agent_verification_checks (agent_id, kind, status, note, decided_by, decided_at)
  values (p_agent, p_kind, p_status, p_note, p_actor, now())
  on conflict (agent_id, kind) do update
    set status = excluded.status,
        note = excluded.note,
        decided_by = excluded.decided_by,
        decided_at = excluded.decided_at
  returning id into check_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    p_actor, 'verification.' || p_kind || '.' || p_status, 'agent', p_agent::text,
    jsonb_build_object('kind', p_kind, 'status', p_status, 'note', p_note, 'check_id', check_id)
  );

  return jsonb_build_object('status', 'ok', 'check_id', check_id);
end;
$$;

/*
 * The free rung, finally reachable.
 *
 * The caller has already asked Paystack what the bank calls this account and
 * passes the answer in. The comparison and the decision happen here, in one
 * transaction, so a resolved name can never be stored without the rung being
 * recorded from it.
 *
 * A match passes the rung with no human involved. A mismatch does NOT fail it:
 * it records the resolved name and leaves the rung pending with the two names
 * in the note, because "the bank says Adebayo Musa and the ID says Adebayo
 * Musa-Bello" is a question for a person, not a refusal. Failing it
 * automatically would lock somebody out over a hyphen.
 */
create or replace function private.verify_payout_account(
  p_account uuid,
  p_resolved_name text,
  p_identity_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.payout_accounts;
  matched boolean;
begin
  if p_resolved_name is null or char_length(btrim(p_resolved_name)) = 0 then
    return jsonb_build_object('status', 'no_name');
  end if;

  select * into acct from public.payout_accounts where id = p_account for update;
  if acct.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  update public.payout_accounts
     set resolved_account_name = btrim(p_resolved_name),
         resolved_at = now()
   where id = acct.id;

  matched := private.name_matches(p_resolved_name, coalesce(p_identity_name, acct.account_name));

  perform private.record_verification_check(
    acct.agent_id,
    'payout',
    case when matched then 'passed' else 'pending' end,
    case
      when matched then
        'The bank confirms this account belongs to ' || btrim(p_resolved_name) || '.'
      else
        'The bank says this account belongs to ' || btrim(p_resolved_name)
        || ', which does not match ' || coalesce(p_identity_name, acct.account_name)
        || '. Somebody should look at this.'
    end,
    null
  );

  return jsonb_build_object(
    'status', 'ok',
    'matched', matched,
    'resolved_name', btrim(p_resolved_name)
  );
end;
$$;

comment on function private.verify_payout_account is
  'Record what the bank says an account is called and climb the payout rung from it. A match passes with no human involved; a mismatch leaves the rung pending with both names in the note, because a near miss on a Nigerian name is a question for a person rather than a refusal.';

/* --------------------------------------------------- reviewing a document */

/*
 * Approve or reject one document, and move the ladder if it was the last one.
 *
 * Rejecting requires a reason at three separate levels: this function refuses
 * without one, the table's check constraint refuses without one, and the UI
 * cannot submit without one. That is not redundancy for its own sake. It is the
 * single most common way a verification flow becomes cruel, and each of the
 * three layers can be bypassed by a different kind of mistake.
 */
create or replace function private.review_kyc_document(
  acting_admin uuid,
  p_document uuid,
  p_approve boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  doc public.agent_documents;
  owner_user uuid;
  target_agent uuid;
  rung text;
  all_approved boolean;
begin
  if acting_admin is null
     or not (private.has_role(acting_admin, 'admin') or private.has_role(acting_admin, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if not p_approve and (p_reason is null or char_length(btrim(p_reason)) < 8) then
    return jsonb_build_object('status', 'needs_a_reason');
  end if;

  select * into doc from public.agent_documents where id = p_document for update;
  if doc.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  update public.agent_documents
     set review_status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = acting_admin,
         reviewed_at = now(),
         rejection_reason = case when p_approve then null else btrim(p_reason) end
   where id = doc.id;

  owner_user := coalesce(
    doc.uploader_id,
    (select a.user_id from public.agent_applications a where a.id = doc.application_id)
  );

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    acting_admin,
    case when p_approve then 'kyc.document.approved' else 'kyc.document.rejected' end,
    'agent_document', doc.id::text,
    jsonb_build_object(
      'kind', doc.kind,
      'subtype', doc.subtype,
      'subject_user', owner_user,
      'reason', case when p_approve then null else btrim(p_reason) end
    )
  );

  /* The ladder rung this document belongs to, moved only when EVERY document
     of that kind for this person is approved. One approved passport and one
     rejected one is not a passed identity check. */
  rung := case doc.kind when 'identity' then 'identity' when 'address' then 'address' else null end;
  select a.id into target_agent from public.agents a where a.user_id = owner_user;

  if rung is not null and target_agent is not null then
    select bool_and(d.review_status = 'approved')
      into all_approved
      from public.agent_documents d
     where d.kind = doc.kind
       and coalesce(
             d.uploader_id,
             (select a2.user_id from public.agent_applications a2 where a2.id = d.application_id)
           ) = owner_user;

    perform private.record_verification_check(
      target_agent, rung,
      case when coalesce(all_approved, false) then 'passed' else 'pending' end,
      case when coalesce(all_approved, false)
           then 'Documents approved by review.'
           else 'Waiting on a document.' end,
      acting_admin
    );
  end if;

  if owner_user is not null then
    perform private.notify(
      owner_user, 'agent',
      case when p_approve then 'A document was approved' else 'A document needs redoing' end,
      case when p_approve
           then 'One of your verification documents has been accepted.'
           else btrim(p_reason) end,
      '/verify'
    );
  end if;

  return jsonb_build_object('status', 'ok', 'document_id', doc.id, 'approved', p_approve);
end;
$$;

/* ------------------------------------------------- who is asked, and who is not */

/*
 * The gate, as one function, so no screen has to reimplement the rule.
 *
 * Read it as: does this person offer property or receive money. Renter and
 * buyer answer no and must never be asked; browsing and renting are never
 * gated behind this and there is nothing in this schema that could gate them.
 */
create or replace function public.verification_is_required(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.signup_role in ('seller', 'landlord', 'agent')
      from public.profiles p
      where p.id = p_user
    ),
    false
  )
  or exists (select 1 from public.agents a where a.user_id = p_user);
$$;

comment on function public.verification_is_required is
  'Sellers, landlords and agents verify. Renters and buyers never do, and nothing gates browsing or renting on this. The rule is here once so no screen reimplements it into a slightly different one.';

/* -------------------------------------------------------------------- RLS */

/* Uploader reads their own, whether or not there is an application behind it. */
drop policy if exists agent_documents_select_own on public.agent_documents;
create policy agent_documents_select_own
  on public.agent_documents for select
  using (
    uploader_id = (select auth.uid())
    or exists (
      select 1 from public.agent_applications a
      where a.id = agent_documents.application_id
        and a.user_id = (select auth.uid())
    )
  );

/*
 * Uploading. Either against an application in a state that still accepts
 * paperwork, or on the person's own behalf with no application at all, which is
 * the seller case the NOT NULL used to make impossible.
 */
drop policy if exists agent_documents_insert_own on public.agent_documents;
create policy agent_documents_insert_own
  on public.agent_documents for insert
  with check (
    uploader_id = (select auth.uid())
    and (
      application_id is null
      or exists (
        select 1 from public.agent_applications a
        where a.id = agent_documents.application_id
          and a.user_id = (select auth.uid())
          and a.status in ('DRAFT', 'SUBMITTED')
      )
    )
  );

/*
 * There is deliberately no update or delete policy for the uploader.
 *
 * Re-submission is a new row that names the one it replaces. Letting somebody
 * edit a document after a reviewer has looked at it would mean the decision on
 * record was made about a file that no longer exists, which is the exact
 * failure the supersedes chain avoids.
 */
drop policy if exists agent_documents_admin_review on public.agent_documents;
create policy agent_documents_admin_review
  on public.agent_documents for update
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  )
  with check (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

revoke all on function private.record_verification_check(uuid, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function private.verify_payout_account(uuid, text, text)
  from public, anon, authenticated;
revoke all on function private.review_kyc_document(uuid, uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function private.name_matches(text, text) from public, anon, authenticated;
grant execute on function public.verification_is_required(uuid) to authenticated;

commit;
