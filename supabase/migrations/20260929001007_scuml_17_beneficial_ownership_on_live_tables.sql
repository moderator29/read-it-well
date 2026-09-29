-- SCUML item 17: BENEFICIAL OWNERSHIP, ON THE LIVE TABLES. Who is the lister
-- acting for?
--
-- WHY THIS MIGRATION. 20260924171000, 171100 and 171200 were committed and
-- never applied: they sat in a chain with files that attach triggers to the
-- retired custody tables, and 171200's acting_for read public.escrows. Since
-- 25 September 2026 Vallo holds no customer money (docs/MONEY_ARCHITECTURE.md,
-- ADR 0002), so this file is those three, as their final (171200) state, with
-- the escrow branch of acting_for dropped. Nothing here names or reads a
-- custody object. The three originals move to supabase/migrations/superseded/.
--
-- WHAT IT DOES.
--  1. The principal's identity, dated, on public.listing_mandates:
--     relationship, how staff verified them, by whom, when, and an ID document
--     kind and reference. NEVER A NIN: a reference with any run of eleven or
--     more digits (after stripping punctuation), or anything not plain ASCII,
--     is refused, and the national ID card is not an allowed kind.
--  2. file_listing_mandate (the lister files, or corrects a waiting one, or
--     renews from 30 days before the current one ends); decide_listing_mandate
--     (staff approve with the check recorded, or refuse with a reason). An
--     approval supersedes the previous mandate, which is kept.
--  3. A decided mandate is a record: frozen for every role, changed only inside
--     the mandate functions (vallo.mandate_write). A member cannot write a
--     decision by inserting or editing a row.
--  4. The publish gate: an agent or firm listing does not go PUBLISHED without
--     an approved, unexpired, current mandate (examples and owner listings are
--     exempt). A lifted suspension puts such a listing back as "needs a
--     mandate" and tells the agent.
--  5. Grace until 24 October 2026; a daily sweep then takes down intermediary
--     listings without a current mandate (not those whose mandate was filed in
--     time and is still waiting for us). Reminders 30 and 7 days before a
--     mandate ends.
--  6. Retention: five years from the later of the listing's close and the
--     mandate's refusal. A listing never published with no approved mandate
--     may be deleted with its mandates; stale waiting or refused mandates of
--     such listings are purged after five years.
--  7. acting_for(kind, id): staff only, audited; for a listing, booking,
--     transaction or rent payment, who the lister was acting for AS OF the
--     record's own date.
--  8. The landlord line messages only the current mandate's principal; a STOP
--     on a number stops every mandate for it, under one advisory lock shared
--     with decisions and consent carry-over.
--
-- Nothing here is public. RLS on the one new table, no grants to anon or
-- authenticated; staff and listers reach everything through definer functions
-- that check their caller.

set local lock_timeout = '5s';

/* ------------------------------------------------ 1. the principal, dated */

alter table public.listing_mandates
  add column if not exists principal_relationship     text,
  add column if not exists principal_verified_how     text,
  add column if not exists principal_verified_by      uuid,
  add column if not exists principal_verified_at      timestamptz,
  add column if not exists principal_id_document_kind text,
  add column if not exists principal_id_document_ref  text,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid references public.listing_mandates(id) on delete restrict;

alter table public.listing_mandates drop constraint if exists listing_mandates_relationship_known;
alter table public.listing_mandates
  add constraint listing_mandates_relationship_known
    check (principal_relationship is null or principal_relationship in
           ('owner', 'joint_owner', 'family_of_owner', 'company_director',
            'executor_or_trustee', 'attorney', 'other'));
alter table public.listing_mandates drop constraint if exists listing_mandates_verified_how_known;
alter table public.listing_mandates
  add constraint listing_mandates_verified_how_known
    check (principal_verified_how is null or principal_verified_how in
           ('call_back', 'in_person', 'video_call', 'document'));
alter table public.listing_mandates drop constraint if exists listing_mandates_id_document_kind_known;
alter table public.listing_mandates
  add constraint listing_mandates_id_document_kind_known
    check (principal_id_document_kind is null or principal_id_document_kind in
           ('international_passport', 'drivers_licence', 'voters_card', 'cac_certificate', 'other'));
alter table public.listing_mandates drop constraint if exists listing_mandates_id_document_is_a_pair;
alter table public.listing_mandates
  add constraint listing_mandates_id_document_is_a_pair
    check ((principal_id_document_kind is null) = (principal_id_document_ref is null));
alter table public.listing_mandates drop constraint if exists listing_mandates_id_ref_is_never_a_nin;
alter table public.listing_mandates
  add constraint listing_mandates_id_ref_is_never_a_nin
    check (principal_id_document_ref is null
           or (length(btrim(principal_id_document_ref)) between 3 and 80
               and principal_id_document_ref ~ '^[ -~]+$'
               and regexp_replace(principal_id_document_ref, '[^[:alnum:]]', '', 'g') !~ '[0-9]{11}'));
alter table public.listing_mandates drop constraint if exists listing_mandates_approval_is_dated;
alter table public.listing_mandates
  add constraint listing_mandates_approval_is_dated
    check (review_status <> 'approved'
           or (principal_relationship is not null and principal_verified_how is not null
               and principal_verified_by is not null and principal_verified_at is not null))
    not valid;
alter table public.listing_mandates drop constraint if exists listing_mandates_superseded_is_a_pair;
alter table public.listing_mandates
  add constraint listing_mandates_superseded_is_a_pair
    check ((superseded_at is null) = (superseded_by is null)
           and (superseded_at is null or review_status = 'approved'));

comment on column public.listing_mandates.principal_relationship is
  'SCUML item 17. How the principal stands to the property: owner, joint_owner, family_of_owner, company_director, executor_or_trustee, attorney, other. Given by the lister, confirmed by staff on approval.';
comment on column public.listing_mandates.principal_verified_how is
  'SCUML item 17. How staff confirmed the principal: call_back to principal_phone, in_person, video_call, or document.';
comment on column public.listing_mandates.principal_verified_by is
  'SCUML item 17. The member of staff who confirmed the principal. A plain uuid, not a foreign key, so the record survives that account.';
comment on column public.listing_mandates.principal_verified_at is
  'SCUML item 17. When the principal was confirmed.';
comment on column public.listing_mandates.principal_id_document_ref is
  'SCUML item 17. The reference on the principal''s ID document, when one was seen (passport, licence, voter''s card or CAC number). NEVER A NIN: plain ASCII only, and no run of eleven or more digits once punctuation is stripped. The national ID card is not a kind here because it carries the NIN.';
comment on column public.listing_mandates.superseded_at is
  'SCUML item 17. When an approved replacement took over from this mandate. The row is kept: it is the record of who the lister acted for until then.';
comment on column public.listing_mandates.superseded_by is
  'SCUML item 17. The mandate that replaced this one.';

create index if not exists listing_mandates_superseded_by_idx
  on public.listing_mandates (superseded_by) where superseded_by is not null;

-- One waiting mandate per listing, one current approved one; a renewal waits
-- beside the approved mandate it will replace.
drop index if exists public.listing_mandates_one_live;
create unique index if not exists listing_mandates_one_waiting
  on public.listing_mandates (listing_id) where review_status = 'pending';
create unique index if not exists listing_mandates_one_current
  on public.listing_mandates (listing_id) where review_status = 'approved' and superseded_at is null;

/* -------------------------------------------------------- small helpers */

create or replace function private.listing_has_live_mandate(p_listing uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.listing_mandates m
     where m.listing_id = p_listing
       and m.review_status = 'approved'
       and m.superseded_at is null
       and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
  );
$function$;
revoke all on function private.listing_has_live_mandate(uuid) from public, anon, authenticated;

-- Within 30 days of its end, or past it (Lagos calendar).
create or replace function private.mandate_renewal_open(p_expires date)
returns boolean
language sql
stable
set search_path to ''
as $function$
  select p_expires is not null
     and p_expires <= (now() at time zone 'Africa/Lagos')::date + 30;
$function$;
revoke all on function private.mandate_renewal_open(date) from public, anon;
-- Read by the member's own insert guard through mandate_listing_facts.
grant execute on function private.mandate_renewal_open(date) to authenticated;

-- The plain-words note a lister reads on their listing card (review_notes).
create or replace function private.mandate_needed_note()
returns text
language sql
immutable
set search_path to ''
as $function$
  select 'This listing is off the market until we have confirmed who you are letting it for. '
      || 'Renters trust a listing more when the owner has confirmed it. Open the listing''s mandate page, '
      || 'add the owner''s details, and we will confirm them. Once they are confirmed, the listing can go live again.';
$function$;
-- Plain text, read by the invoker trigger below on a member's own write.
revoke all on function private.mandate_needed_note() from public;
grant execute on function private.mandate_needed_note() to anon, authenticated;

-- THE GRACE WINDOW IS A DATE, not a duration, so every agent is told the same day.
create or replace function private.mandate_grace_ends()
returns timestamptz
language sql
immutable
set search_path to ''
as $function$
  select '2026-10-24 00:00:00+01'::timestamptz;
$function$;
revoke all on function private.mandate_grace_ends() from public, anon, authenticated;

create or replace function private.principal_number_lock(p_phone text)
returns void
language sql
volatile
set search_path to ''
as $function$
  select pg_advisory_xact_lock(hashtext('principal_number:' || p_phone))
   where p_phone is not null;
$function$;
revoke all on function private.principal_number_lock(text) from public, anon, authenticated;

create or replace function private.principal_name_key(p_name text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select lower(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'));
$function$;
revoke all on function private.principal_name_key(text) from public, anon, authenticated;

-- What the member's insert guard needs to know about the listing, read as the
-- definer. current_expires_open: null when there is no current mandate, else
-- whether a renewal may be filed beside it.
create or replace function private.mandate_listing_facts(p_listing uuid)
returns table (is_demo boolean, listing_role text, closed_at timestamptz, current_expires_open boolean)
language sql
stable
security definer
set search_path to ''
as $function$
  select l.is_demo, l.listing_role::text, l.closed_at,
         (select private.mandate_renewal_open(m.expires_on)
            from public.listing_mandates m
           where m.listing_id = l.id and m.review_status = 'approved' and m.superseded_at is null)
    from public.listings l
   where l.id = p_listing;
$function$;
revoke all on function private.mandate_listing_facts(uuid) from public, anon;
grant execute on function private.mandate_listing_facts(uuid) to authenticated;

/* ---------------------------------- 3. nobody decides their own mandate */

create or replace function private.listing_mandates_scuml17_guard()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  l record;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.review_status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    new.principal_verified_how := null;
    new.principal_verified_by := null;
    new.principal_verified_at := null;
    new.principal_id_document_kind := null;
    new.principal_id_document_ref := null;
    -- The same rules as file_listing_mandate, for a direct insert.
    select * into l from private.mandate_listing_facts(new.listing_id);
    if l.is_demo or l.listing_role = 'owner' or l.closed_at is not null then
      raise exception 'SCUML item 17: this listing takes no mandate' using errcode = 'check_violation';
    end if;
    if new.expires_on is not null and new.expires_on < (now() at time zone 'Africa/Lagos')::date then
      raise exception 'SCUML item 17: a mandate cannot end in the past' using errcode = 'check_violation';
    end if;
    if l.current_expires_open is false then
      raise exception 'SCUML item 17: the current mandate has more than 30 days to run' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  if new.review_status is distinct from old.review_status
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason
     or new.principal_verified_how is distinct from old.principal_verified_how
     or new.principal_verified_by is distinct from old.principal_verified_by
     or new.principal_verified_at is distinct from old.principal_verified_at
     or new.principal_id_document_kind is distinct from old.principal_id_document_kind
     or new.principal_id_document_ref is distinct from old.principal_id_document_ref then
    raise exception 'SCUML item 17: a mandate is decided through the mandate decision, never by editing it'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;
revoke all on function private.listing_mandates_scuml17_guard() from public, anon, authenticated;

drop trigger if exists listing_mandates_scuml17_guard on public.listing_mandates;
create trigger listing_mandates_scuml17_guard
  before insert or update on public.listing_mandates
  for each row execute function private.listing_mandates_scuml17_guard();

-- A member can no more write the supersession than the decision.
create or replace function private.listing_mandates_superseded_guard()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.superseded_at := null;
    new.superseded_by := null;
  elsif new.superseded_at is distinct from old.superseded_at
        or new.superseded_by is distinct from old.superseded_by then
    raise exception 'SCUML item 17: a mandate is replaced through the mandate decision, never by editing it'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;
revoke all on function private.listing_mandates_superseded_guard() from public, anon, authenticated;

drop trigger if exists listing_mandates_superseded_guard on public.listing_mandates;
create trigger listing_mandates_superseded_guard
  before insert or update on public.listing_mandates
  for each row execute function private.listing_mandates_superseded_guard();

-- Once decided, a mandate is frozen for EVERY role. The decision, the check
-- and the supersession change only inside the mandate functions.
create or replace function private.listing_mandates_frozen_once_decided()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if new.listing_id is distinct from old.listing_id then
    raise exception 'SCUML item 17: a mandate never moves to another listing'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(current_setting('vallo.mandate_write', true), '') = 'on' then
    return new;
  end if;
  if new.review_status is distinct from old.review_status
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason
     or new.principal_verified_how is distinct from old.principal_verified_how
     or new.principal_verified_by is distinct from old.principal_verified_by
     or new.principal_verified_at is distinct from old.principal_verified_at
     or new.principal_id_document_kind is distinct from old.principal_id_document_kind
     or new.principal_id_document_ref is distinct from old.principal_id_document_ref
     or new.superseded_at is distinct from old.superseded_at
     or new.superseded_by is distinct from old.superseded_by then
    raise exception 'SCUML item 17: a mandate is decided through the mandate decision, never by editing it'
      using errcode = 'insufficient_privilege';
  end if;
  if old.review_status <> 'pending'
     and (new.kind is distinct from old.kind
          or new.principal_name is distinct from old.principal_name
          or new.principal_phone is distinct from old.principal_phone
          or new.principal_relationship is distinct from old.principal_relationship
          or new.signed_on is distinct from old.signed_on
          or new.expires_on is distinct from old.expires_on
          or new.exclusive is distinct from old.exclusive) then
    raise exception 'SCUML item 17: a decided mandate is a record and is not edited. File a new one instead'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$;
revoke all on function private.listing_mandates_frozen_once_decided() from public, anon, authenticated;

drop trigger if exists listing_mandates_frozen_once_decided on public.listing_mandates;
create trigger listing_mandates_frozen_once_decided
  before update on public.listing_mandates
  for each row execute function private.listing_mandates_frozen_once_decided();

-- A superseded mandate is history: nobody records a fresh consent on it.
create or replace function private.listing_mandates_no_consent_on_history()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if old.superseded_at is not null
     and new.principal_consented_at is distinct from old.principal_consented_at then
    raise exception 'SCUML item 17: this mandate has been replaced by a renewal. Record consent on the current mandate'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;
revoke all on function private.listing_mandates_no_consent_on_history() from public, anon, authenticated;

drop trigger if exists listing_mandates_no_consent_on_history on public.listing_mandates;
create trigger listing_mandates_no_consent_on_history
  before update of principal_consented_at on public.listing_mandates
  for each row execute function private.listing_mandates_no_consent_on_history();

-- The principal said yes to being asked on this number. A renewal naming the
-- same number and the same name keeps that answer.
create or replace function private.mandate_consent_carries_forward()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if old.superseded_at is null and new.superseded_at is not null
     and new.principal_consented_at is not null
     and (new.principal_consent_withdrawn_at is null
          or new.principal_consent_withdrawn_at < new.principal_consented_at) then
    perform private.principal_number_lock(new.principal_phone);
    update public.listing_mandates r
       set principal_consented_at = new.principal_consented_at,
           principal_consent_read_by = new.principal_consent_read_by,
           principal_consent_sentence = new.principal_consent_sentence,
           principal_consent_withdrawn_at = null
     where r.id = new.superseded_by
       and r.principal_phone is not distinct from new.principal_phone
       and private.principal_name_key(r.principal_name) = private.principal_name_key(new.principal_name)
       and r.principal_consented_at is null
       -- Re-read under the lock: a STOP that landed first wins.
       and not exists (select 1 from public.listing_mandates o
                        where o.principal_phone = new.principal_phone
                          and o.principal_consent_withdrawn_at is not null
                          and o.principal_consent_withdrawn_at > new.principal_consented_at);
  end if;
  return new;
end;
$function$;
revoke all on function private.mandate_consent_carries_forward() from public, anon, authenticated;

drop trigger if exists listing_mandates_consent_carries_forward on public.listing_mandates;
create trigger listing_mandates_consent_carries_forward
  after update of superseded_at on public.listing_mandates
  for each row execute function private.mandate_consent_carries_forward();

/* ------------------------------------------------- 6. five years, counted */

create or replace function private.mandate_retained_until(p_mandate uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $function$
  select case when l.closed_at is null then 'infinity'::timestamptz
              else greatest(l.closed_at,
                            case when m.review_status = 'rejected' then m.reviewed_at end)
                   + interval '5 years' end
    from public.listing_mandates m
    join public.listings l on l.id = m.listing_id
   where m.id = p_mandate;
$function$;
revoke all on function private.mandate_retained_until(uuid) from public, anon, authenticated;

create or replace function private.listing_never_acted_on(p_listing uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.listings l
     where l.id = p_listing and l.published_at is null and l.status <> 'PUBLISHED'
  ) and not exists (
    select 1 from public.listing_mandates m
     where m.listing_id = p_listing and m.review_status = 'approved'
  );
$function$;
revoke all on function private.listing_never_acted_on(uuid) from public, anon, authenticated;

create or replace function private.listings_keep_their_mandates()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not exists (select 1 from public.listing_mandates m where m.listing_id = old.id) then
    return old;
  end if;
  if not private.listing_never_acted_on(old.id)
     and exists (select 1 from public.listing_mandates m
                  where m.listing_id = old.id and now() < private.mandate_retained_until(m.id)) then
    raise exception 'SCUML item 17: this listing holds a mandate record, kept for five years after the listing closes. Take it down or close it instead of deleting it'
      using errcode = 'insufficient_privilege';
  end if;
  -- The cascade that follows is this delete's, and has been judged here.
  perform set_config('vallo.mandate_listing_delete', old.id::text, true);
  return old;
end;
$function$;
revoke all on function private.listings_keep_their_mandates() from public, anon, authenticated;

drop trigger if exists listings_keep_their_mandates on public.listings;
create trigger listings_keep_their_mandates
  before delete on public.listings
  for each row execute function private.listings_keep_their_mandates();

create or replace function private.listing_mandates_kept_five_years()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if coalesce(current_setting('vallo.mandate_purge', true), '') = 'on'
     or coalesce(current_setting('vallo.mandate_listing_delete', true), '') = old.listing_id::text then
    return old;
  end if;
  if not exists (select 1 from public.listings l where l.id = old.listing_id) then
    return old;
  end if;
  if now() < private.mandate_retained_until(old.id) then
    raise exception 'SCUML item 17: a mandate is kept for five years after its listing closes, and this one is still inside that period'
      using errcode = 'insufficient_privilege';
  end if;
  return old;
end;
$function$;
revoke all on function private.listing_mandates_kept_five_years() from public, anon, authenticated;

drop trigger if exists listing_mandates_kept_five_years on public.listing_mandates;
create trigger listing_mandates_kept_five_years
  before delete on public.listing_mandates
  for each row execute function private.listing_mandates_kept_five_years();

create or replace function private.purge_stale_mandates()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer;
begin
  perform set_config('vallo.mandate_purge', 'on', true);
  delete from public.listing_mandates m
   where m.review_status in ('pending', 'rejected')
     and greatest(m.created_at, coalesce(m.reviewed_at, m.created_at)) < now() - interval '5 years'
     and private.listing_never_acted_on(m.listing_id);
  get diagnostics n = row_count;
  perform set_config('vallo.mandate_purge', '', true);
  return n;
end;
$function$;
revoke all on function private.purge_stale_mandates() from public, anon, authenticated;

/* -------------------------------------------- 4. the gate, switched on */

alter table public.listings
  add column if not exists needs_mandate_since timestamptz;

comment on column public.listings.needs_mandate_since is
  'SCUML item 17. When this agent or firm listing was taken down, or held back, for want of an approved mandate naming its principal. Written only by the platform; cleared when the listing is anything but returned with the mandate note.';

create index if not exists listings_needs_mandate_idx
  on public.listings (needs_mandate_since) where needs_mandate_since is not null;

create or replace function private.listing_supply_proof_gate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'PUBLISHED' or new.is_demo then return new; end if;

  if new.listing_role = 'owner' then
    if exists (select 1 from public.agent_documents d
                where d.listing_id = new.id and d.kind = 'ownership'
                  and d.review_status = 'rejected')
       and not exists (select 1 from public.agent_documents d
                        where d.listing_id = new.id and d.kind = 'ownership'
                          and d.review_status <> 'rejected') then
      raise exception 'The ownership document for this listing was refused. It cannot be published on a refused document.'
        using errcode = 'check_violation';
    end if;
  else
    if exists (select 1 from public.listing_mandates m
                where m.listing_id = new.id and m.review_status = 'rejected')
       and not exists (select 1 from public.listing_mandates m
                        where m.listing_id = new.id and m.review_status <> 'rejected') then
      raise exception 'The mandate for this listing was refused. It cannot be published on a refused mandate.'
        using errcode = 'check_violation';
    end if;

    -- On the way in to a live agent listing: going PUBLISHED, stopping being
    -- an example, or becoming an agent or firm listing while live.
    if (tg_op = 'INSERT'
        or old.status is distinct from 'PUBLISHED'
        or old.is_demo is distinct from new.is_demo
        or old.listing_role is distinct from new.listing_role)
       and not private.listing_has_live_mandate(new.id) then
      if coalesce(current_setting('vallo.reinstating', true), '') = 'on' then
        new.status := 'MORE_INFO_REQUIRED';
        new.needs_mandate_since := coalesce(new.needs_mandate_since, now());
        new.review_notes := private.mandate_needed_note();
        perform private.notify(
          (select a.user_id from public.agents a where a.id = new.agent_id),
          'listing', 'Confirm who you are letting for',
          new.title || ' did not go back live with your account, because we have not confirmed the owner you are letting it for. '
          || 'Add their details on the listing''s mandate page and we will confirm them.',
          '/agent/listings/' || new.id || '/mandate');
        return new;
      end if;
      raise exception 'SCUML item 17: an agent or firm listing needs an approved mandate naming its principal before it can be published.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function private.listing_supply_proof_gate() from public;
revoke execute on function private.listing_supply_proof_gate() from anon;
revoke execute on function private.listing_supply_proof_gate() from authenticated;

drop trigger if exists listing_supply_proof_gate on public.listings;
create trigger listing_supply_proof_gate
  before insert or update of status, is_demo, listing_role on public.listings
  for each row execute function private.listing_supply_proof_gate();

-- `needs_mandate_since` is a platform fact. Held for a mandate means:
-- returned, with the mandate note. The moment it is anything else, it is not.
create or replace function private.listings_needs_mandate_fact()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.needs_mandate_since := null;
    elsif new.needs_mandate_since is distinct from old.needs_mandate_since then
      raise exception 'SCUML item 17: whether a listing needs a mandate is written by the platform, never by editing a listing'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  if new.needs_mandate_since is not null
     and (new.status is distinct from 'MORE_INFO_REQUIRED'
          or new.review_notes is distinct from private.mandate_needed_note()) then
    new.needs_mandate_since := null;
  end if;
  return new;
end;
$function$;
revoke all on function private.listings_needs_mandate_fact() from public, anon, authenticated;

drop trigger if exists listings_needs_mandate_fact on public.listings;
create trigger listings_needs_mandate_fact
  before insert or update on public.listings
  for each row execute function private.listings_needs_mandate_fact();

/* ------------------------------------------ 2. the lister files a mandate */

create or replace function public.file_listing_mandate(
  p_listing uuid,
  p_kind text,
  p_principal_name text,
  p_principal_phone text,
  p_relationship text,
  p_exclusive boolean,
  p_signed_on date,
  p_expires_on date
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l record;
  cur public.listing_mandates%rowtype;
  m public.listing_mandates%rowtype;
  me uuid := (select auth.uid());
  renewing boolean := false;
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if me is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  select id, listing_role, is_demo, closed_at into l from public.listings where id = p_listing;
  if l.id is null or not private.owns_listing(p_listing) then
    return jsonb_build_object('state', 'not_yours');
  end if;
  if l.is_demo then
    return jsonb_build_object('state', 'example');
  end if;
  if l.listing_role = 'owner' then
    return jsonb_build_object('state', 'owner');
  end if;
  if l.closed_at is not null then
    return jsonb_build_object('state', 'closed');
  end if;
  if p_expires_on is not null and p_expires_on < today then
    return jsonb_build_object('state', 'ends_in_the_past');
  end if;

  -- The current approved mandate: on file while it has more than 30 days to
  -- run; from then, and always once it has ended, a new one may be filed.
  select * into cur from public.listing_mandates
   where listing_id = p_listing and review_status = 'approved' and superseded_at is null
   for update;
  if cur.id is not null then
    if not private.mandate_renewal_open(cur.expires_on) then
      return jsonb_build_object('state', 'on_file', 'mandate_id', cur.id);
    end if;
    renewing := true;
  end if;

  select * into m from public.listing_mandates
   where listing_id = p_listing and review_status = 'pending'
   for update;

  if m.id is not null then
    update public.listing_mandates
       set kind = p_kind,
           principal_name = btrim(p_principal_name),
           principal_phone = p_principal_phone,
           principal_relationship = p_relationship,
           exclusive = p_exclusive,
           signed_on = p_signed_on,
           expires_on = p_expires_on
     where id = m.id;
  else
    insert into public.listing_mandates
      (listing_id, kind, principal_name, principal_phone, principal_relationship,
       exclusive, signed_on, expires_on)
    values
      (p_listing, p_kind, btrim(p_principal_name), p_principal_phone, p_relationship,
       p_exclusive, p_signed_on, p_expires_on)
    returning * into m;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, case when renewing then 'mandate.renew' else 'mandate.file' end, 'listing', p_listing::text,
          jsonb_build_object('scuml_item', 17, 'mandate_id', m.id, 'kind', p_kind,
                             'relationship', p_relationship, 'replaces', cur.id));

  return jsonb_build_object('state', 'waiting', 'mandate_id', m.id, 'renewing', renewing);
end;
$function$;
revoke all on function public.file_listing_mandate(uuid, text, text, text, text, boolean, date, date) from public, anon;
grant execute on function public.file_listing_mandate(uuid, text, text, text, text, boolean, date, date) to authenticated;

-- What the lister sees of their own mandate: its state and the refusal
-- reason, never who checked it.
create or replace function public.my_listing_mandate(p_listing uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  l record;
  shown public.listing_mandates%rowtype;
  cur public.listing_mandates%rowtype;
  refused public.listing_mandates%rowtype;
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  select id, listing_role, is_demo, status, needs_mandate_since into l
    from public.listings where id = p_listing;
  if l.id is null or not private.owns_listing(p_listing) then
    return jsonb_build_object('state', 'not_yours');
  end if;
  select * into cur from public.listing_mandates
   where listing_id = p_listing and review_status = 'approved' and superseded_at is null;
  select * into shown from public.listing_mandates
   where listing_id = p_listing and superseded_at is null
   order by case review_status when 'pending' then 0 when 'approved' then 1 else 2 end, created_at desc
   limit 1;
  -- A refusal since the current mandate (a refused renewal), newest first.
  select * into refused from public.listing_mandates
   where listing_id = p_listing and review_status = 'rejected'
     and created_at >= coalesce(cur.created_at, '-infinity'::timestamptz)
   order by reviewed_at desc nulls last
   limit 1;
  return jsonb_build_object(
    'state', 'ok',
    'last_refusal', case when refused.id is null then null else jsonb_build_object(
      'id', refused.id, 'reason', refused.rejection_reason, 'reviewed_at', refused.reviewed_at) end,
    'role', l.listing_role,
    'is_demo', l.is_demo,
    'status', l.status,
    'needs_mandate_since', l.needs_mandate_since,
    'grace_ends', '2026-10-24',
    'today', today,
    'renewal_open', cur.id is not null and private.mandate_renewal_open(cur.expires_on),
    'current_expired', cur.id is not null and cur.expires_on is not null and cur.expires_on < today,
    'current', case when cur.id is null then null else jsonb_build_object(
      'id', cur.id,
      'kind', cur.kind,
      'principal_name', cur.principal_name,
      'principal_phone', cur.principal_phone,
      'relationship', cur.principal_relationship,
      'exclusive', cur.exclusive,
      'signed_on', cur.signed_on,
      'expires_on', cur.expires_on,
      'review_status', cur.review_status,
      'reviewed_at', cur.reviewed_at,
      'created_at', cur.created_at) end,
    'mandate', case when shown.id is null then null else jsonb_build_object(
      'id', shown.id,
      'kind', shown.kind,
      'principal_name', shown.principal_name,
      'principal_phone', shown.principal_phone,
      'relationship', shown.principal_relationship,
      'exclusive', shown.exclusive,
      'signed_on', shown.signed_on,
      'expires_on', shown.expires_on,
      'review_status', shown.review_status,
      'rejection_reason', shown.rejection_reason,
      'reviewed_at', shown.reviewed_at,
      'created_at', shown.created_at) end);
end;
$function$;
revoke all on function public.my_listing_mandate(uuid) from public, anon;
grant execute on function public.my_listing_mandate(uuid) to authenticated;

/* ------------------------------------------------ 2. staff decide it */

create or replace function public.decide_listing_mandate(
  p_mandate uuid,
  p_decision text,
  p_relationship text,
  p_verified_how text,
  p_id_document_kind text,
  p_id_document_ref text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  m public.listing_mandates%rowtype;
  old_id uuid;
  l record;
  me uuid := (select auth.uid());
  restored boolean := false;
begin
  if not private.is_staff() then
    raise exception 'only staff decide a mandate' using errcode = 'insufficient_privilege';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'approve or reject' using errcode = 'check_violation';
  end if;

  select * into m from public.listing_mandates where id = p_mandate for update;
  if m.id is null then
    return jsonb_build_object('state', 'gone');
  end if;
  if m.review_status <> 'pending' then
    return jsonb_build_object('state', 'already', 'review_status', m.review_status);
  end if;

  if p_decision = 'approve' then
    if m.expires_on is not null and m.expires_on < (now() at time zone 'Africa/Lagos')::date then
      return jsonb_build_object('state', 'ended');
    end if;
    if coalesce(p_relationship, m.principal_relationship) is null or p_verified_how is null then
      raise exception 'SCUML item 17: say how the principal stands to the property and how you confirmed them'
        using errcode = 'check_violation';
    end if;

    -- The same lock a STOP takes, on both numbers involved.
    perform private.principal_number_lock(m.principal_phone);
    perform private.principal_number_lock(p.principal_phone)
       from public.listing_mandates p
      where p.listing_id = m.listing_id and p.review_status = 'approved' and p.superseded_at is null
        and p.principal_phone is distinct from m.principal_phone;

    perform set_config('vallo.mandate_write', 'on', true);
    select id into old_id from public.listing_mandates
     where listing_id = m.listing_id and review_status = 'approved' and superseded_at is null
     for update;
    if old_id is not null then
      update public.listing_mandates
         set superseded_at = now(), superseded_by = m.id
       where id = old_id;
    end if;
    update public.listing_mandates
       set review_status = 'approved',
           reviewed_by = me,
           reviewed_at = now(),
           principal_relationship = coalesce(p_relationship, m.principal_relationship),
           principal_verified_how = p_verified_how,
           principal_verified_by = me,
           principal_verified_at = now(),
           principal_id_document_kind = nullif(btrim(coalesce(p_id_document_kind, '')), ''),
           principal_id_document_ref = nullif(btrim(coalesce(p_id_document_ref, '')), '')
     where id = m.id;
    perform set_config('vallo.mandate_write', '', true);

    -- listings_supply_proof_has_a_decider_chk: the date carries who decided it.
    update public.listings set mandate_verified_at = now(), supply_verified_by = me where id = m.listing_id;

    -- Back live ONLY while the listing is held for this and nothing else.
    select id, status, needs_mandate_since, closed_at, review_notes into l
      from public.listings where id = m.listing_id;
    if l.needs_mandate_since is not null and l.closed_at is null
       and l.status = 'MORE_INFO_REQUIRED'
       and l.review_notes is not distinct from private.mandate_needed_note()
       and private.listing_has_live_mandate(l.id) then
      update public.listings set status = 'PUBLISHED', review_notes = null where id = l.id;
      restored := true;
    end if;
  else
    if p_reason is null or length(btrim(p_reason)) < 8 then
      raise exception 'write the reason the lister will read' using errcode = 'check_violation';
    end if;
    perform set_config('vallo.mandate_write', 'on', true);
    update public.listing_mandates
       set review_status = 'rejected',
           reviewed_by = me,
           reviewed_at = now(),
           rejection_reason = btrim(p_reason)
     where id = m.id;
    perform set_config('vallo.mandate_write', '', true);
    update public.listings
       set mandate_verified_at = null,
           supply_verified_by = case when ownership_verified_at is null then null else supply_verified_by end
     where id = m.listing_id and not private.listing_has_live_mandate(m.listing_id);
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, 'mandate.decide', 'listing', m.listing_id::text,
          jsonb_build_object('scuml_item', 17, 'mandate_id', m.id, 'decision', p_decision,
                             'verified_how', p_verified_how, 'supersedes', old_id, 'restored', restored,
                             'id_document_kind', nullif(btrim(coalesce(p_id_document_kind, '')), '')));

  return jsonb_build_object('state', case when p_decision = 'approve' then 'approved' else 'rejected' end,
                            'superseded', old_id, 'restored', restored);
end;
$function$;
revoke all on function public.decide_listing_mandate(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.decide_listing_mandate(uuid, text, text, text, text, text, text) to authenticated;

/* -------------------------------------- 5. told at 30 days and at 7 */

create table if not exists public.mandate_expiry_notices (
  mandate_id uuid not null references public.listing_mandates(id) on delete cascade,
  days_before integer not null check (days_before in (30, 7)),
  sent_at timestamptz not null default now(),
  primary key (mandate_id, days_before)
);

comment on table public.mandate_expiry_notices is
  'SCUML item 17. Which expiry reminders an agent has been sent for a mandate, so each goes once. Written only by private.mandate_expiry_reminders; no API role reads it.';

alter table public.mandate_expiry_notices enable row level security;
revoke all on table public.mandate_expiry_notices from public, anon, authenticated, service_role;
grant select on table public.mandate_expiry_notices to service_role;

create or replace function private.mandate_grace_sweep()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
begin
  if now() < private.mandate_grace_ends() then
    return 0;
  end if;
  for r in
    select l.id, l.title, a.user_id
      from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.status = 'PUBLISHED'
       and not l.is_demo
       and l.listing_role is distinct from 'owner'
       and l.closed_at is null
       and not private.listing_has_live_mandate(l.id)
       -- Filed in time and still waiting for us: our delay, not theirs.
       and not exists (select 1 from public.listing_mandates p
                        where p.listing_id = l.id and p.review_status = 'pending'
                          and p.created_at < private.mandate_grace_ends())
     for update of l skip locked
  loop
    update public.listings
       set status = 'MORE_INFO_REQUIRED',
           needs_mandate_since = now(),
           review_notes = private.mandate_needed_note(),
           mandate_verified_at = null,
           supply_verified_by = case when ownership_verified_at is null then null else supply_verified_by end
     where id = r.id;
    perform private.notify(r.user_id, 'listing', 'Confirm who you are letting for',
      r.title || ' is off the market until we have confirmed the owner you are letting it for. '
      || 'Add their details on the listing''s mandate page and we will confirm them. Once they are confirmed, it can go live again.',
      '/agent/listings/' || r.id || '/mandate');
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'mandate.sweep', 'listing', r.id::text, jsonb_build_object('scuml_item', 17));
    n := n + 1;
  end loop;
  return n;
end;
$function$;
revoke all on function private.mandate_grace_sweep() from public, anon, authenticated;

create or replace function private.mandate_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
  today date := (now() at time zone 'Africa/Lagos')::date;
  due integer;
begin
  -- A lapsed mandate lapses the listing's published confirmation date.
  update public.listings l
     set mandate_verified_at = null,
         supply_verified_by = case when l.ownership_verified_at is null then null else l.supply_verified_by end
   where l.mandate_verified_at is not null
     and l.listing_role is distinct from 'owner'
     and not private.listing_has_live_mandate(l.id);

  for r in
    select m.id, m.expires_on, m.principal_name, l.id as listing_id, l.title, a.user_id
      from public.listing_mandates m
      join public.listings l on l.id = m.listing_id
      join public.agents a on a.id = l.agent_id
     where m.review_status = 'approved'
       and m.superseded_at is null
       and m.expires_on is not null
       and m.expires_on >= today
       and m.expires_on <= today + 30
       and not l.is_demo
       and l.status = 'PUBLISHED'
       and l.closed_at is null
       and not exists (select 1 from public.listing_mandates p
                        where p.listing_id = m.listing_id and p.review_status = 'pending')
  loop
    due := case when r.expires_on <= today + 7 then 7 else 30 end;
    if exists (select 1 from public.mandate_expiry_notices x
                where x.mandate_id = r.id and x.days_before = due) then
      continue;
    end if;
    insert into public.mandate_expiry_notices (mandate_id, days_before)
    select r.id, d from unnest(case when due = 7 then array[30, 7] else array[30] end) d
    on conflict do nothing;
    perform private.notify(r.user_id, 'listing', 'Your mandate is running out',
      'The mandate from ' || r.principal_name || ' for ' || r.title || ' ends on '
      || to_char(r.expires_on, 'FMDD Month YYYY') || '. File the renewal before then so we can confirm it with them '
      || 'and the listing stays live without a break.',
      '/agent/listings/' || r.listing_id || '/mandate');
    n := n + 1;
  end loop;
  return n;
end;
$function$;
revoke all on function private.mandate_expiry_reminders() from public, anon, authenticated;

/* ------------------------------------------------- 7. acting for, as of then */

-- The live money records only: a listing, a booking, a transaction (a split
-- settlement charge) or a rent payment. The retired custody kinds are gone.
create or replace function public.acting_for(p_kind text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_listing uuid;
  v_at timestamptz;
  v_found boolean := false;
  l record;
  mandates jsonb;
  in_force boolean;
begin
  if not private.is_staff() then
    raise exception 'only staff read who a lister acts for' using errcode = 'insufficient_privilege';
  end if;

  if p_kind = 'listing' then
    select l2.id, now(), true into v_listing, v_at, v_found from public.listings l2 where l2.id = p_id;
  elsif p_kind = 'booking' then
    select b.listing_id, b.created_at, true into v_listing, v_at, v_found from public.bookings b where b.id = p_id;
  elsif p_kind = 'transaction' then
    select b.listing_id, t.created_at, true into v_listing, v_at, v_found
      from public.transactions t left join public.bookings b on b.id = t.booking_id
     where t.id = p_id;
  elsif p_kind = 'rent_payment' then
    select rp.listing_id, rp.created_at, true into v_listing, v_at, v_found from public.rent_payments rp where rp.id = p_id;
  else
    raise exception 'listing, booking, transaction or rent_payment' using errcode = 'check_violation';
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'acting_for.read', p_kind, p_id::text,
          jsonb_build_object('scuml_item', 17, 'listing_id', v_listing, 'as_of', v_at));

  if not coalesce(v_found, false) then
    return jsonb_build_object('state', 'not_found');
  end if;
  if v_listing is null then
    return jsonb_build_object('state', 'no_listing');
  end if;

  select l2.id, l2.reference, l2.title, l2.listing_role, l2.is_demo, l2.status, l2.closed_at,
         l2.needs_mandate_since, l2.mandate_verified_at, l2.firm_id,
         a.id as agent_id, a.user_id as agent_user_id, a.display_name as agent_name
    into l
    from public.listings l2 left join public.agents a on a.id = l2.agent_id
   where l2.id = v_listing;
  if l.id is null then
    return jsonb_build_object('state', 'no_listing');
  end if;

  -- In force at the record's own moment: approved by then, not yet replaced,
  -- not yet ended (Lagos calendar).
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id,
           'kind', m.kind,
           'review_status', m.review_status,
           'principal_name', m.principal_name,
           'principal_phone_last4', right(m.principal_phone, 4),
           'relationship', m.principal_relationship,
           'exclusive', m.exclusive,
           'signed_on', m.signed_on,
           'expires_on', m.expires_on,
           'filed_at', m.created_at,
           'reviewed_at', m.reviewed_at,
           'rejection_reason', m.rejection_reason,
           'verified_how', m.principal_verified_how,
           'verified_at', m.principal_verified_at,
           'verified_by', m.principal_verified_by,
           'verified_by_name', nullif(btrim(concat_ws(' ', p.first_name, p.surname)), ''),
           'id_document_kind', m.principal_id_document_kind,
           'id_document_ref', m.principal_id_document_ref,
           'has_document', m.document_id is not null,
           'superseded_at', m.superseded_at,
           'in_force', m.review_status = 'approved'
                       and coalesce(m.principal_verified_at, m.reviewed_at) <= v_at
                       and (m.superseded_at is null or m.superseded_at > v_at)
                       and (m.expires_on is null or m.expires_on >= (v_at at time zone 'Africa/Lagos')::date),
           'retained_until', private.mandate_retained_until(m.id)
         ) order by m.created_at desc), '[]'::jsonb)
    into mandates
    from public.listing_mandates m
    left join public.profiles p on p.id = m.principal_verified_by
   where m.listing_id = l.id;

  in_force := exists (select 1 from jsonb_array_elements(mandates) e where (e->>'in_force')::boolean);

  return jsonb_build_object(
    'state', 'ok',
    'as_of', v_at,
    'acting', case when l.listing_role = 'owner' then 'themselves'
                   when l.is_demo then 'example'
                   when in_force then 'principal'
                   else 'unconfirmed' end,
    'listing', jsonb_build_object(
      'id', l.id, 'reference', l.reference, 'title', l.title, 'role', l.listing_role,
      'is_demo', l.is_demo, 'status', l.status, 'closed_at', l.closed_at,
      'needs_mandate_since', l.needs_mandate_since, 'mandate_verified_at', l.mandate_verified_at,
      'firm_id', l.firm_id),
    'lister', jsonb_build_object('agent_id', l.agent_id, 'user_id', l.agent_user_id, 'name', l.agent_name),
    'mandates', mandates);
end;
$function$;
revoke all on function public.acting_for(text, uuid) from public, anon;
grant execute on function public.acting_for(text, uuid) to authenticated;

/* ------------------------------------------------ the desk's lane read */

create or replace function public.beneficial_ownership_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  counts jsonb;
  needs jsonb;
begin
  if not private.is_staff() then
    raise exception 'staff only' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
      'live_intermediary', count(*) filter (where l.status = 'PUBLISHED'),
      'live_with_mandate', count(*) filter (where l.status = 'PUBLISHED' and private.listing_has_live_mandate(l.id)),
      'live_without_mandate', count(*) filter (where l.status = 'PUBLISHED' and not private.listing_has_live_mandate(l.id)),
      'awaiting_decision', count(*) filter (where l.status = 'PUBLISHED' and not private.listing_has_live_mandate(l.id)
                                              and exists (select 1 from public.listing_mandates p
                                                           where p.listing_id = l.id and p.review_status = 'pending')),
      'taken_down', count(*) filter (where l.needs_mandate_since is not null and l.status <> 'PUBLISHED'),
      'mandates_waiting', (select count(*) from public.listing_mandates m
                             join public.listings x on x.id = m.listing_id
                            where m.review_status = 'pending' and not x.is_demo))
    into counts
    from public.listings l
   where not l.is_demo and l.listing_role is distinct from 'owner' and l.closed_at is null;

  select coalesce(jsonb_agg(row_to_json(q)::jsonb order by q.since nulls last, q.title), '[]'::jsonb)
    into needs
    from (
      select l.id, l.reference, l.title, l.status, l.needs_mandate_since as since,
             a.display_name as agent_name,
             (select m.review_status from public.listing_mandates m
               where m.listing_id = l.id and m.superseded_at is null
               order by m.created_at desc limit 1) as last_mandate
        from public.listings l
        left join public.agents a on a.id = l.agent_id
       where not l.is_demo and l.listing_role is distinct from 'owner' and l.closed_at is null
         and (l.status = 'PUBLISHED' or l.needs_mandate_since is not null)
         and not private.listing_has_live_mandate(l.id)
       order by l.needs_mandate_since nulls last, l.title
       limit 50
    ) q;

  return jsonb_build_object('counts', counts, 'needs', needs,
                            'grace_ends', private.mandate_grace_ends());
end;
$function$;
revoke all on function public.beneficial_ownership_desk() from public, anon;
grant execute on function public.beneficial_ownership_desk() to authenticated;

/* ---------------------------------- 8. the landlord line and the STOP */

create or replace function private.principal_stop_number(p_phone text, p_via text)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer := 0;
begin
  if p_phone is null then
    return 0;
  end if;
  perform private.principal_number_lock(p_phone);
  update public.listing_mandates
     set principal_consent_withdrawn_at = now()
   where principal_phone = p_phone
     and principal_consented_at is not null
     and (principal_consent_withdrawn_at is null or principal_consent_withdrawn_at < principal_consented_at);
  get diagnostics n = row_count;

  delete from public.principal_asks q
   using public.listing_mandates m
   where m.id = q.mandate_id and m.principal_phone = p_phone and q.sent_at is null;
  update public.principal_asks q
     set expires_at = now()
    from public.listing_mandates m
   where m.id = q.mandate_id and m.principal_phone = p_phone
     and q.sent_at is not null and q.answered_at is null;
  update public.listings l
     set not_reconfirmed_since = null
    from public.listing_mandates m
   where m.listing_id = l.id and m.principal_phone = p_phone and l.not_reconfirmed_since is not null;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'mandate.consent.stopped', 'principal', null,
          jsonb_build_object('mandates', n, 'via', p_via));
  return n;
end;
$function$;
revoke all on function private.principal_stop_number(text, text) from public, anon, authenticated;

create or replace function private.principal_may_be_messaged(p_mandate uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.listing_mandates m
      join public.listings l on l.id = m.listing_id
     where m.id = p_mandate
       and m.review_status = 'approved'::public.document_review_status
       and m.superseded_at is null
       and m.principal_phone is not null
       and m.principal_consented_at is not null
       and (m.principal_consent_withdrawn_at is null
            or m.principal_consent_withdrawn_at < m.principal_consented_at)
       and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
       and l.is_demo = false
       -- Any withdrawal for this number after this consent, on any mandate.
       and not exists (select 1 from public.listing_mandates o
                        where o.principal_phone = m.principal_phone
                          and o.principal_consent_withdrawn_at is not null
                          and o.principal_consent_withdrawn_at > m.principal_consented_at)
  );
$function$;
revoke all on function private.principal_may_be_messaged(uuid) from public, anon, authenticated;

/* ---------------------------------- the agents told now, before the date */

do $$
declare
  r record;
begin
  for r in
    select distinct a.user_id
      from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.status = 'PUBLISHED' and not l.is_demo
       and l.listing_role is distinct from 'owner' and l.closed_at is null
       and not private.listing_has_live_mandate(l.id)
  loop
    perform private.notify(r.user_id, 'listing', 'Confirm who you are letting for',
      'From 24 October, a listing you let for someone else stays live only once the owner has confirmed it. '
      || 'It is the check that makes your listing worth trusting. Open each listing''s mandate page and add the owner''s details.',
      '/agent/listings');
  end loop;
end $$;

/* ---------------------------------------------------------- the jobs */

select cron.unschedule(j.jobname) from cron.job j
 where j.jobname in ('vallo_scuml17_mandate_grace_sweep', 'vallo_scuml17_mandate_expiry_reminders',
                     'vallo_scuml17_purge_stale_mandates');
select cron.schedule('vallo_scuml17_mandate_grace_sweep', '25 5 * * *', 'select private.mandate_grace_sweep();');
select cron.schedule('vallo_scuml17_mandate_expiry_reminders', '30 5 * * *', 'select private.mandate_expiry_reminders();');
select cron.schedule('vallo_scuml17_purge_stale_mandates', '35 5 * * *', 'select private.purge_stale_mandates();');

/* ------------------------------------------------------------ read-back */

do $readback$
declare
  bad text := '';
begin
  if to_regclass('public.mandate_expiry_notices') is null
     or not (select relrowsecurity from pg_class where oid = 'public.mandate_expiry_notices'::regclass) then
    bad := bad || ' [mandate_expiry_notices missing or RLS off]';
  end if;
  if has_table_privilege('authenticated', 'public.mandate_expiry_notices', 'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('anon', 'public.mandate_expiry_notices', 'SELECT') then
    bad := bad || ' [mandate_expiry_notices is reachable by a member]';
  end if;
  if has_function_privilege('anon', 'public.acting_for(text, uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.decide_listing_mandate(uuid, text, text, text, text, text, text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.file_listing_mandate(uuid, text, text, text, text, boolean, date, date)', 'EXECUTE') then
    bad := bad || ' [a mandate function is callable signed out]';
  end if;
  if has_function_privilege('authenticated', 'private.mandate_grace_sweep()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.purge_stale_mandates()', 'EXECUTE') then
    bad := bad || ' [a member can run a mandate job]';
  end if;
  if to_regclass('public.listing_mandates_one_live') is not null then
    bad := bad || ' [the one-live index still blocks a renewal]';
  end if;
  if position('escrow' in pg_get_functiondef('public.acting_for(text, uuid)'::regprocedure)) > 0 then
    bad := bad || ' [acting_for still names a custody record]';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'listing_supply_proof_gate'
                   and tgrelid = 'public.listings'::regclass
                   and pg_get_triggerdef(oid) like '%UPDATE OF status, is_demo, listing_role%') then
    bad := bad || ' [the publish gate does not watch is_demo and listing_role]';
  end if;
  if (select count(*) from cron.job where jobname like 'vallo_scuml17_%') <> 3 then
    bad := bad || ' [the three item 17 jobs are not scheduled]';
  end if;
  if bad <> '' then
    raise exception 'SCUML item 17 READ-BACK FAILED:%', bad;
  end if;
end;
$readback$;

/* --------------------------------------------------------------- probe */

-- A rolled-back run of the whole path on live tables: an agent listing is
-- refused publish without a mandate; the lister files; the lister cannot
-- decide it themselves; staff approve with the check; the listing publishes;
-- acting_for answers "principal" and refuses a custody kind; a decided
-- mandate cannot be edited; the listing cannot be deleted inside retention;
-- the lister files a renewal near the end, and approving it supersedes the
-- first. Everything is undone by the final raise, caught below.
do $probe$
declare
  v_agent_user uuid := gen_random_uuid();
  v_staff uuid := gen_random_uuid();
  v_agent uuid;
  v_listing uuid;
  v_ans jsonb;
  v_m1 uuid;
  v_m2 uuid;
  v_err text;
  v_before bigint;
begin
  select count(*) into v_before from public.listing_mandates;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values (v_agent_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml17-probe-agent@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
           (v_staff, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml17-probe-staff@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}');
    insert into public.user_roles (user_id, role) values (v_staff, 'admin');
    insert into public.agents (user_id, display_name, role) values (v_agent_user, 'Probe Agent', 'agent') returning id into v_agent;
    insert into public.listings (agent_id, title, property_type, listing_role, status, is_demo)
    values (v_agent, 'SCUML 17 probe flat', 'apartment', 'agent', 'DRAFT', false) returning id into v_listing;

    -- 1. No mandate: publishing is refused.
    begin
      update public.listings set status = 'PUBLISHED' where id = v_listing;
      raise exception 'PROBE FAILED: an agent listing published without a mandate';
    exception when check_violation then
      v_err := sqlerrm;
      if v_err not like 'SCUML item 17: an agent or firm listing needs an approved mandate%' then raise; end if;
    end;

    -- 2. The lister files.
    perform set_config('request.jwt.claims', json_build_object('sub', v_agent_user, 'role', 'authenticated')::text, true);
    v_ans := public.file_listing_mandate(v_listing, 'letting', 'Adaeze Okafor', '+2348031234567', 'owner', true, current_date, null);
    if v_ans->>'state' <> 'waiting' then raise exception 'PROBE FAILED: file answered %', v_ans; end if;
    v_m1 := (v_ans->>'mandate_id')::uuid;

    -- 3. The lister is not staff and cannot decide it.
    begin
      perform public.decide_listing_mandate(v_m1, 'approve', 'owner', 'call_back', null, null, null);
      raise exception 'PROBE FAILED: a lister decided their own mandate';
    exception when insufficient_privilege then null;
    end;

    -- 4. A NIN is refused as an ID reference, then staff approve with the check.
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    begin
      perform public.decide_listing_mandate(v_m1, 'approve', 'owner', 'document', 'other', '123-4567-8901', null);
      raise exception 'PROBE FAILED: a NIN was accepted as an ID reference';
    exception when check_violation then null;
    end;
    v_ans := public.decide_listing_mandate(v_m1, 'approve', 'owner', 'call_back', null, null, null);
    if v_ans->>'state' <> 'approved' then raise exception 'PROBE FAILED: decide answered %', v_ans; end if;

    -- 5. Now it publishes (as the platform would, after review).
    update public.listings set status = 'PUBLISHED', published_at = now() where id = v_listing;

    -- 6. acting_for answers the principal, and refuses a retired custody kind.
    v_ans := public.acting_for('listing', v_listing);
    if v_ans->>'acting' <> 'principal' or jsonb_array_length(v_ans->'mandates') <> 1 then
      raise exception 'PROBE FAILED: acting_for answered %', v_ans;
    end if;
    begin
      perform public.acting_for('escrow', v_listing);
      raise exception 'PROBE FAILED: acting_for accepted a custody kind';
    exception when check_violation then null;
    end;
    if (public.beneficial_ownership_desk()->'counts'->>'live_with_mandate')::int < 1 then
      raise exception 'PROBE FAILED: the desk does not count the live mandate';
    end if;

    -- 7. A decided mandate is a record.
    begin
      update public.listing_mandates set principal_name = 'Somebody Else' where id = v_m1;
      raise exception 'PROBE FAILED: a decided mandate was edited';
    exception when insufficient_privilege then null;
    end;

    -- 8. Retention: the published listing with its mandate cannot be deleted.
    begin
      delete from public.listings where id = v_listing;
      raise exception 'PROBE FAILED: a listing holding a mandate record was deleted';
    exception when insufficient_privilege then null;
    end;

    -- 9. A renewal: only near the end. Move the end date inside 30 days
    --    under the mandate functions' own flag (a fixture shortcut), then the lister files and
    --    staff approve, which supersedes the first.
    perform set_config('request.jwt.claims', json_build_object('sub', v_agent_user, 'role', 'authenticated')::text, true);
    v_ans := public.file_listing_mandate(v_listing, 'letting', 'Adaeze Okafor', '+2348031234567', 'owner', true, current_date, null);
    if v_ans->>'state' <> 'on_file' then raise exception 'PROBE FAILED: a renewal was open too early: %', v_ans; end if;
    perform set_config('request.jwt.claims', '', true);
    perform set_config('vallo.mandate_write', 'on', true);
    update public.listing_mandates set expires_on = current_date + 10 where id = v_m1;
    perform set_config('vallo.mandate_write', '', true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_agent_user, 'role', 'authenticated')::text, true);
    v_ans := public.file_listing_mandate(v_listing, 'letting', 'Adaeze Okafor', '+2348031234567', 'owner', true, current_date, current_date + 365);
    if v_ans->>'state' <> 'waiting' or (v_ans->>'renewing')::boolean is not true then
      raise exception 'PROBE FAILED: renewal answered %', v_ans;
    end if;
    v_m2 := (v_ans->>'mandate_id')::uuid;
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    v_ans := public.decide_listing_mandate(v_m2, 'approve', null, 'in_person', 'international_passport', 'A01234567', null);
    if v_ans->>'state' <> 'approved' or (v_ans->>'superseded')::uuid is distinct from v_m1 then
      raise exception 'PROBE FAILED: renewal approval answered %', v_ans;
    end if;
    if not exists (select 1 from public.listing_mandates where id = v_m1 and superseded_by = v_m2) then
      raise exception 'PROBE FAILED: the first mandate was not kept as superseded';
    end if;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if (select count(*) from public.listing_mandates) <> v_before
     or exists (select 1 from auth.users where id in (v_agent_user, v_staff)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
