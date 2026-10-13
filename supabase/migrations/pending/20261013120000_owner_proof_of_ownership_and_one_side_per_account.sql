-- DRAFT, NOT APPLIED. The owner's proof of ownership, the "Ownership seen"
-- mark it earns, and one supply side per account. Founder decisions of
-- 13 October 2026.
--
-- NOTE FOR WHOEVER APPLIES IT: two CHECK constraints are widened, which in
-- Postgres means ALTER TABLE ... DROP CONSTRAINT and ADD CONSTRAINT in one
-- transaction. Apply it with psql (or the dashboard SQL editor), not through
-- the MCP connector, which hangs on DROP.
--
-- 1. AN OWNERSHIP DOCUMENT MAY NAME ITS REGISTRATION.
--    `agent_documents_property_kinds_name_a_listing` (20260922230400) refuses
--    an `ownership` or `mandate` row without a listing. An owner registers
--    before any listing exists, so the owner form's proof of ownership could
--    never be filed. An `ownership` row may now name the application it was
--    filed with instead; a `mandate` still needs its listing.
--
-- 2. "LETTER OF AUTHORITY" IS AN ANSWER. Somebody letting a place on the
--    owner's written authority holds no title. The owner form offers it, so
--    `agent_applications_ownership_document_known` accepts it.
--
-- 3. "OWNERSHIP SEEN". `public.ownership_seen_at(user)` is the date a
--    reviewer approved the person's current registration ownership document,
--    for an account whose agents row is an owner, or null. Read by the
--    profile and the listing page to draw the mark. It is derived from the
--    reviewers' own decisions (`review_kyc_document` already approves and
--    refuses any document kind, with a reason, an audit row and a
--    notification), so nothing can write the mark directly.
--
-- 4. ONE ACCOUNT, ONE SIDE. An owner's account cannot file to become an
--    agent and an agent's cannot file to become an owner (the professional
--    and firm forms make agents). Held while the other application is
--    submitted, under review, sent back or approved, or while the account's
--    agents row is the other role. API roles only; staff and the service role
--    pass, as in `guard_application_write`. The app refuses the same
--    (apps/web/src/lib/agent/role-lock.ts) with a message saying how to
--    proceed.
--
-- PROBE AFTER APPLYING, as the real roles: (a) as an applicant, insert an
-- owner application and an `ownership` document naming it, with no listing:
-- must succeed; a `mandate` row with no listing must still fail. (b) approve
-- the document as a different reviewer and expect ownership_seen_at(owner) to
-- return its reviewed_at; refuse a replacement and expect null. (c) as an
-- owner with an APPROVED owner application, insert an agent application:
-- expect 42501; the same insert on a fresh account succeeds.

begin;

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

create or replace function public.ownership_seen_at(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $$
  select max(d.reviewed_at)
    from public.agent_documents d
   where d.uploader_id = p_user
     and d.kind = 'ownership'
     and d.listing_id is null
     and d.review_status = 'approved'
     and not exists (select 1 from public.agent_documents s where s.supersedes_id = d.id)
     and exists (select 1 from public.agents a where a.user_id = p_user and a.role::text = 'owner');
$$;

comment on function public.ownership_seen_at(uuid) is
  'When a reviewer approved this owner''s current proof of ownership filed with their registration, or null. Draws the "Ownership seen" mark. Leaks no document, only a date.';

revoke all on function public.ownership_seen_at(uuid) from public;
grant execute on function public.ownership_seen_at(uuid) to anon, authenticated;

/* The same date for a listing's lister, so the listing page need not know
   the lister's account id, which no public read carries. A listing listed by
   an agent never shows it: the mark is the owner's own. */
create or replace function public.listing_ownership_seen_at(p_listing uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $$
  select public.ownership_seen_at(a.user_id)
    from public.listings l
    join public.agents a on a.id = l.agent_id
   where l.id = p_listing
     and l.status::text = 'PUBLISHED'
     and a.role::text = 'owner';
$$;

revoke all on function public.listing_ownership_seen_at(uuid) from public;
grant execute on function public.listing_ownership_seen_at(uuid) to anon, authenticated;

create or replace function private.one_side_per_account()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  wanted text := case when new.supply_role = 'owner' then 'owner' else 'agent' end;
  held text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if uid is not null
     and (private.has_role(uid, 'admin'::public.app_role)
          or private.has_role(uid, 'super_admin'::public.app_role)) then
    return new;
  end if;

  select case when a.role::text = 'owner' then 'owner' else 'agent' end
    into held
    from public.agents a
   where a.user_id = new.user_id;

  if held is null then
    select case when x.supply_role = 'owner' then 'owner' else 'agent' end
      into held
      from public.agent_applications x
     where x.user_id = new.user_id
       and x.id <> new.id
       and x.status in ('SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'APPROVED')
       and (case when x.supply_role = 'owner' then 'owner' else 'agent' end) <> wanted
     limit 1;
  end if;

  if held is not null and held <> wanted then
    raise exception 'This account is already % account. One account holds one side; apply from a separate account.',
      case when held = 'owner' then 'an owner''s' else 'an agent''s' end
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.one_side_per_account() from public, anon, authenticated;

create or replace trigger agent_applications_02_one_side_per_account
  before insert on public.agent_applications
  for each row execute function private.one_side_per_account();

commit;
