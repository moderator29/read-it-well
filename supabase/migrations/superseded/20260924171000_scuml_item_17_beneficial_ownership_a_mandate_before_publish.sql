-- SCUML item 17: BENEFICIAL OWNERSHIP. Who is the lister acting for?
--
-- An agent or a firm lists a property somebody else owns. The law asks us to
-- know that somebody: their name, their number, how they relate to the
-- property, how we checked, who checked and when. `listing_mandates` has held
-- the principal's name and number since track G; what it lacked was the
-- dated check, and a publish gate that used it. The positive arm in
-- `private.listing_supply_proof_gate` was written and commented out "until a
-- wizard collects a mandate". This migration writes the filing path and turns
-- the arm on.
--
-- 1. The principal's identity, dated: relationship, how verified, by whom,
--    when, and the ID document's kind and reference if one was taken. NEVER A
--    RAW NIN: the reference column refuses an eleven-digit number outright.
-- 2. `file_listing_mandate`: the lister files (or amends a waiting) mandate.
--    `decide_listing_mandate`: staff approve with the check recorded, or
--    refuse with a reason. The lister can no longer write a decision by
--    inserting one: the insert policy let them, and a guard now stops it.
-- 3. The gate: an agent or firm listing does not go PUBLISHED without an
--    approved, unexpired mandate. Examples (`is_demo`) and owner-direct
--    listings are exempt. Every publish path passes through the trigger:
--    reviewListing, reopen_listing and reinstate_agent (which is diverted to
--    "needs a mandate" rather than failing the whole reinstatement).
-- 4. Grace: listings already live keep running until 24 October 2026; a
--    daily sweep then takes down any intermediary listing without a current
--    mandate, marks it `needs_mandate_since`, and tells the agent why.
-- 5. Retention: a mandate is kept five years after its listing closes. No
--    delete reaches it before that, directly or by cascade from a listing or
--    an agent. Account deletion already keeps agents and listings and strips
--    the agent's name (see lib/account-deletion/plan.ts), so the mandate and
--    its principal record survive an agent's deletion untouched.
-- 6. `acting_for(kind, id)`: given a transaction, booking, rent payment or
--    listing, who the lister was acting for, the mandate and its dates.
--    Staff only, and every lookup is audited.
--
-- Nothing here is public. The reader still learns only
-- `listings.mandate_verified_at`, as before.

/* ------------------------------------------------ 1. the principal, dated */

alter table public.listing_mandates
  add column if not exists principal_relationship     text,
  add column if not exists principal_verified_how     text,
  add column if not exists principal_verified_by      uuid,
  add column if not exists principal_verified_at      timestamptz,
  add column if not exists principal_id_document_kind text,
  add column if not exists principal_id_document_ref  text;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.listing_mandates'::regclass
                  and conname = 'listing_mandates_relationship_known') then
    alter table public.listing_mandates
      add constraint listing_mandates_relationship_known
        check (principal_relationship is null or principal_relationship in
               ('owner', 'joint_owner', 'family_of_owner', 'company_director',
                'executor_or_trustee', 'attorney', 'other'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.listing_mandates'::regclass
                  and conname = 'listing_mandates_verified_how_known') then
    alter table public.listing_mandates
      add constraint listing_mandates_verified_how_known
        check (principal_verified_how is null or principal_verified_how in
               ('call_back', 'in_person', 'video_call', 'document'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.listing_mandates'::regclass
                  and conname = 'listing_mandates_id_document_kind_known') then
    alter table public.listing_mandates
      add constraint listing_mandates_id_document_kind_known
        check (principal_id_document_kind is null or principal_id_document_kind in
               ('international_passport', 'drivers_licence', 'voters_card',
                'national_id_card', 'cac_certificate', 'other'));
  end if;
  -- A reference without its kind, or a kind without its reference, is not a
  -- record of anything.
  if not exists (select 1 from pg_constraint where conrelid = 'public.listing_mandates'::regclass
                  and conname = 'listing_mandates_id_document_is_a_pair') then
    alter table public.listing_mandates
      add constraint listing_mandates_id_document_is_a_pair
        check ((principal_id_document_kind is null) = (principal_id_document_ref is null));
  end if;
  -- NEVER A RAW NIN (or BVN): both are eleven digits. Spaces and dashes are
  -- stripped first so "123-4567-8901" is refused as well.
  if not exists (select 1 from pg_constraint where conrelid = 'public.listing_mandates'::regclass
                  and conname = 'listing_mandates_id_ref_is_never_a_nin') then
    alter table public.listing_mandates
      add constraint listing_mandates_id_ref_is_never_a_nin
        check (principal_id_document_ref is null
               or (length(btrim(principal_id_document_ref)) between 3 and 80
                   and regexp_replace(principal_id_document_ref, '[\s\-./]', '', 'g') !~ '^[0-9]{11}$'));
  end if;
  -- An approval carries its check. NOT VALID so no historic row is judged by a
  -- rule it predates; every new approval is.
  if not exists (select 1 from pg_constraint where conrelid = 'public.listing_mandates'::regclass
                  and conname = 'listing_mandates_approval_is_dated') then
    alter table public.listing_mandates
      add constraint listing_mandates_approval_is_dated
        check (review_status <> 'approved'
               or (principal_relationship is not null and principal_verified_how is not null
                   and principal_verified_by is not null and principal_verified_at is not null))
        not valid;
  end if;
end $$;

comment on column public.listing_mandates.principal_relationship is
  'SCUML item 17. How the principal stands to the property: owner, joint_owner, family_of_owner, company_director, executor_or_trustee, attorney, other. Given by the lister, confirmed by staff on approval.';
comment on column public.listing_mandates.principal_verified_how is
  'SCUML item 17. How staff confirmed the principal: call_back to principal_phone, in_person, video_call, or document.';
comment on column public.listing_mandates.principal_verified_by is
  'SCUML item 17. The member of staff who confirmed the principal. A plain uuid, not a foreign key, so the record survives that account.';
comment on column public.listing_mandates.principal_verified_at is
  'SCUML item 17. When the principal was confirmed.';
comment on column public.listing_mandates.principal_id_document_ref is
  'SCUML item 17. The reference on the principal''s ID document, when one was seen (passport number, licence number, CAC number). NEVER A RAW NIN: an eleven-digit value is refused by listing_mandates_id_ref_is_never_a_nin.';

/* ---------------------------------- 2a. nobody decides their own mandate */

-- The insert policy (`listing_mandates_insert_own`) checks only that the lister
-- owns the listing, so until now a lister could insert a row already
-- `approved`. Every decision and every identity-check column is forced empty
-- on a member's insert and frozen on a member's update. Staff decide through
-- `decide_listing_mandate`, which runs as the definer and is not stopped here.
create or replace function private.listing_mandates_scuml17_guard()
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
    new.review_status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    new.principal_verified_how := null;
    new.principal_verified_by := null;
    new.principal_verified_at := null;
    new.principal_id_document_kind := null;
    new.principal_id_document_ref := null;
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

/* ---------------------------------------------- 5. kept for five years */

create or replace function private.mandate_retention_ends(p_listing uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $function$
  -- Five years after the listing closes. A listing that never closed has no
  -- end, and a listing that is gone has already passed its own guard.
  select case when l.closed_at is null then 'infinity'::timestamptz
              else l.closed_at + interval '5 years' end
    from public.listings l where l.id = p_listing;
$function$;

revoke all on function private.mandate_retention_ends(uuid) from public, anon, authenticated;

create or replace function private.listing_mandates_kept_five_years()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ends timestamptz;
begin
  ends := private.mandate_retention_ends(old.listing_id);
  -- No listing row: this is the cascade of a listing delete that its own
  -- guard (below) already allowed.
  if ends is not null and now() < ends then
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

-- A listing with a mandate on it cannot be deleted inside the period either,
-- because the mandate would go with it (on delete cascade), and an agent's
-- row cannot take its listings with it for the same reason.
create or replace function private.listings_keep_their_mandates()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if exists (select 1 from public.listing_mandates m where m.listing_id = old.id)
     and (old.closed_at is null or now() < old.closed_at + interval '5 years') then
    raise exception 'SCUML item 17: this listing holds a mandate, which is kept for five years after the listing closes. Close the listing instead of deleting it'
      using errcode = 'insufficient_privilege';
  end if;
  return old;
end;
$function$;

revoke all on function private.listings_keep_their_mandates() from public, anon, authenticated;

drop trigger if exists listings_keep_their_mandates on public.listings;
create trigger listings_keep_their_mandates
  before delete on public.listings
  for each row execute function private.listings_keep_their_mandates();

/* -------------------------------------------- 3. the gate, switched on */

alter table public.listings
  add column if not exists needs_mandate_since timestamptz;

comment on column public.listings.needs_mandate_since is
  'SCUML item 17. When this agent or firm listing was taken down, or held back, for want of an approved mandate naming its principal. Written only by the platform; cleared when the listing goes live again.';

create index if not exists listings_needs_mandate_idx
  on public.listings (needs_mandate_since) where needs_mandate_since is not null;

-- The one predicate every part of item 17 asks: does this listing have an
-- approved mandate that has not run out (Lagos calendar)?
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
       and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
  );
$function$;

revoke all on function private.listing_has_live_mandate(uuid) from public, anon, authenticated;

-- The plain-words note a lister reads on their listing card (review_notes).
create or replace function private.mandate_needed_note()
returns text
language sql
immutable
set search_path to ''
as $function$
  select 'This listing is off the market until we have confirmed who you are letting it for. '
      || 'Renters trust a listing more when we have spoken to the owner. Open the listing''s mandate page, '
      || 'add the owner''s name and number, and we will ring them to confirm. It goes live again once they do.';
$function$;

revoke all on function private.mandate_needed_note() from public, anon, authenticated;

create or replace function private.listing_supply_proof_gate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'PUBLISHED' or new.is_demo then return new; end if;

  if new.listing_role = 'owner' then
    -- A REFUSED OWNERSHIP DOCUMENT STOPS A PUBLISH. A MISSING ONE DOES NOT.
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

    -- THE POSITIVE ARM, ON (SCUML item 17). Only on the way IN to PUBLISHED:
    -- a listing already live is the grace sweep's business, not every edit's.
    if (tg_op = 'INSERT' or old.status is distinct from 'PUBLISHED')
       and not private.listing_has_live_mandate(new.id) then
      -- A lifted suspension puts listings back as it found them. One without
      -- a mandate comes back as "needs a mandate" rather than failing the
      -- whole reinstatement.
      if coalesce(current_setting('vallo.reinstating', true), '') = 'on' then
        new.status := 'MORE_INFO_REQUIRED';
        new.needs_mandate_since := coalesce(new.needs_mandate_since, now());
        new.review_notes := private.mandate_needed_note();
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

-- `needs_mandate_since` is a platform fact. A member cannot set or clear it;
-- going live clears it, for every writer (the gate above has already said yes
-- by then: trigger order is by name, and listing_supply_proof_gate sorts
-- before listings_needs_mandate_fact).
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
  if new.status = 'PUBLISHED' then
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

/* ------------------------------------------ 2b. the lister files a mandate */

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
  m public.listing_mandates%rowtype;
  me uuid := (select auth.uid());
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

  select * into m from public.listing_mandates
   where listing_id = p_listing and review_status <> 'rejected'
   for update;

  if m.id is not null and m.review_status = 'approved' then
    return jsonb_build_object('state', 'on_file', 'mandate_id', m.id);
  end if;

  if m.id is not null then
    -- Still waiting: the lister may correct what they sent. No decision has
    -- been made on it, so nothing decided is rewritten.
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
  values (me, 'mandate.file', 'listing', p_listing::text,
          jsonb_build_object('scuml_item', 17, 'mandate_id', m.id, 'kind', p_kind,
                             'relationship', p_relationship));

  return jsonb_build_object('state', 'waiting', 'mandate_id', m.id);
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
  m public.listing_mandates%rowtype;
begin
  select id, listing_role, is_demo, status, needs_mandate_since into l
    from public.listings where id = p_listing;
  if l.id is null or not private.owns_listing(p_listing) then
    return jsonb_build_object('state', 'not_yours');
  end if;
  select * into m from public.listing_mandates
   where listing_id = p_listing
   order by (review_status <> 'rejected') desc, created_at desc
   limit 1;
  return jsonb_build_object(
    'state', 'ok',
    'role', l.listing_role,
    'is_demo', l.is_demo,
    'status', l.status,
    'needs_mandate_since', l.needs_mandate_since,
    'grace_ends', '2026-10-24',
    'mandate', case when m.id is null then null else jsonb_build_object(
      'id', m.id,
      'kind', m.kind,
      'principal_name', m.principal_name,
      'principal_phone', m.principal_phone,
      'relationship', m.principal_relationship,
      'exclusive', m.exclusive,
      'signed_on', m.signed_on,
      'expires_on', m.expires_on,
      'review_status', m.review_status,
      'rejection_reason', m.rejection_reason,
      'reviewed_at', m.reviewed_at,
      'created_at', m.created_at) end);
end;
$function$;

revoke all on function public.my_listing_mandate(uuid) from public, anon;
grant execute on function public.my_listing_mandate(uuid) to authenticated;

/* ------------------------------------------------ 2c. staff decide it */

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
  l record;
  me uuid := (select auth.uid());
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
    if coalesce(p_relationship, m.principal_relationship) is null or p_verified_how is null then
      raise exception 'SCUML item 17: say how the principal stands to the property and how you confirmed them'
        using errcode = 'check_violation';
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

    -- listings_supply_proof_has_a_decider_chk: the date carries who decided it.
    update public.listings set mandate_verified_at = now(), supply_verified_by = me where id = m.listing_id;

    -- A listing the sweep took down comes straight back once its principal is
    -- confirmed: it was live, and the one missing thing is now on file.
    select id, status, needs_mandate_since, closed_at into l from public.listings where id = m.listing_id;
    if l.needs_mandate_since is not null and l.closed_at is null
       and l.status = 'MORE_INFO_REQUIRED'
       and private.listing_has_live_mandate(l.id) then
      update public.listings set status = 'PUBLISHED', review_notes = null where id = l.id;
    end if;
  else
    if p_reason is null or length(btrim(p_reason)) < 8 then
      raise exception 'write the reason the lister will read' using errcode = 'check_violation';
    end if;
    update public.listing_mandates
       set review_status = 'rejected',
           reviewed_by = me,
           reviewed_at = now(),
           rejection_reason = btrim(p_reason)
     where id = m.id;
    update public.listings
       set mandate_verified_at = null,
           supply_verified_by = case when ownership_verified_at is null then null else supply_verified_by end
     where id = m.listing_id and not private.listing_has_live_mandate(m.listing_id);
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, 'mandate.decide', 'listing', m.listing_id::text,
          jsonb_build_object('scuml_item', 17, 'mandate_id', m.id, 'decision', p_decision,
                             'verified_how', p_verified_how,
                             'id_document_kind', nullif(btrim(coalesce(p_id_document_kind, '')), '')));

  return jsonb_build_object('state', case when p_decision = 'approve' then 'approved' else 'rejected' end);
end;
$function$;

revoke all on function public.decide_listing_mandate(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.decide_listing_mandate(uuid, text, text, text, text, text, text) to authenticated;

/* ------------------------------------------------- 4. grace, then sweep */

-- THE GRACE WINDOW IS A DATE, not a duration, so every agent is told the same
-- day. Until then listings already live stay live; from then a daily sweep
-- takes down any agent or firm listing without a current mandate.
create or replace function private.mandate_grace_ends()
returns timestamptz
language sql
immutable
set search_path to ''
as $function$
  select '2026-10-24 00:00:00+01'::timestamptz;
$function$;

revoke all on function private.mandate_grace_ends() from public, anon, authenticated;

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
     for update of l skip locked
  loop
    update public.listings
       set status = 'MORE_INFO_REQUIRED',
           needs_mandate_since = now(),
           review_notes = private.mandate_needed_note()
     where id = r.id;
    perform private.notify(r.user_id, 'listing', 'Confirm who you are letting for',
      r.title || ' is off the market until we have confirmed the owner you are letting it for. '
      || 'Add their name and number on the listing''s mandate page and we will ring them. It goes live again once they confirm.',
      '/agent/listings/' || r.id || '/mandate');
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'mandate.sweep', 'listing', r.id::text, jsonb_build_object('scuml_item', 17));
    n := n + 1;
  end loop;
  return n;
end;
$function$;

revoke all on function private.mandate_grace_sweep() from public, anon, authenticated;

-- Tell every agent with a listing that will be swept, now, so the date is
-- never a surprise. Examples and owner listings are not told anything.
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
      'From 24 October, a listing you let for someone else stays live only once we have spoken to the owner. '
      || 'It is the check that makes your listing worth trusting. Open each listing''s mandate page and add the owner''s name and number.',
      '/agent/listings');
  end loop;
end $$;

/* ---------------------------------------------- 6. acting for whom? */

create or replace function public.acting_for(p_kind text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_listing uuid;
  l record;
  mandates jsonb;
begin
  if not private.is_staff() then
    raise exception 'only staff read who a lister acts for' using errcode = 'insufficient_privilege';
  end if;

  if p_kind = 'listing' then
    v_listing := p_id;
  elsif p_kind = 'booking' then
    select b.listing_id into v_listing from public.bookings b where b.id = p_id;
  elsif p_kind = 'transaction' then
    select b.listing_id into v_listing
      from public.transactions t join public.bookings b on b.id = t.booking_id
     where t.id = p_id;
  elsif p_kind = 'rent_payment' then
    select rp.listing_id into v_listing from public.rent_payments rp where rp.id = p_id;
  else
    raise exception 'listing, booking, transaction or rent_payment' using errcode = 'check_violation';
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'acting_for.read', p_kind, p_id::text,
          jsonb_build_object('scuml_item', 17, 'listing_id', v_listing));

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

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id,
           'kind', m.kind,
           'review_status', m.review_status,
           'principal_name', m.principal_name,
           -- The last four digits only: enough to match a call log, not
           -- enough to go round the lister from a console page.
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
           'retained_until', case when l.closed_at is null then null
                                  else (l.closed_at + interval '5 years') end
         ) order by m.created_at desc), '[]'::jsonb)
    into mandates
    from public.listing_mandates m
    left join public.profiles p on p.id = m.principal_verified_by
   where m.listing_id = l.id;

  return jsonb_build_object(
    'state', 'ok',
    'acting', case when l.listing_role = 'owner' then 'themselves'
                   when l.is_demo then 'example'
                   when private.listing_has_live_mandate(l.id) then 'principal'
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

/* ------------------------------------------ the desk's lane read */

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
               where m.listing_id = l.id order by m.created_at desc limit 1) as last_mandate
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

/* Outside the transaction's concerns: cron.schedule commits its own row. */
select cron.schedule('vallo_scuml17_mandate_grace_sweep', '25 5 * * *', 'select private.mandate_grace_sweep();');
