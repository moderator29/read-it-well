-- SCUML item 17: THE REVIEW. A decided mandate is a record, a restore asks
-- why the listing came down, and the five years are counted properly.
--
-- Review of 20260924171000 and 20260924171100:
--  1. An end date already past is refused on filing. The lister's read says
--     when the current mandate has ended, and an ended mandate can always be
--     followed by a new filing (171100 opened that window). Staff cannot
--     approve a mandate that has already ended.
--  2. Approving a mandate restores a swept listing ONLY while the listing still
--     carries the mandate note: a listing staff returned for another reason
--     (blurred photos) stays returned. `needs_mandate_since` clears whenever
--     the listing moves off that state for any other reason.
--  3. Once decided, a mandate is frozen for every role: listing, kind, the
--     principal, dates and exclusivity. The decision, the check and the
--     supersession change only inside the mandate functions, which raise
--     `vallo.mandate_write` for the length of their own write. `listing_id`
--     never changes at all.
--  4. The ID reference refuses any run of eleven or more digits once
--     punctuation and spaces are stripped, refuses anything that is not plain
--     ASCII (so no digits from another script slip past), and the
--     national_id_card kind is gone: the card carries the NIN.
--  5. A listing that was never published and whose mandates were never
--     approved may be deleted, mandates and all.
--  6. The sweep leaves alone a listing whose mandate was filed before the
--     grace date and is still waiting for us; the lane counts them.
--  7. A listing held back at reinstatement tells its agent why.
--  8. acting_for answers as of the record's own date, covers escrows, and
--     says "not found" for an id that matches nothing.
--  9. The gate also fires when a live listing stops being an example or
--     changes its lister role.
-- 10. Copy: nobody is promised a phone call, or a listing that goes back live
--     by itself. `mandate_verified_at` clears when a mandate lapses.
-- 11. Retention runs five years from the later of the listing's close and the
--     mandate's refusal. Waiting or refused mandates of a listing that never
--     went live are purged five years after they were last touched.
--
-- Review of 20260924171100 (renewal):
-- N1. A withdrawal recorded on ANY mandate for the same number, later than
--     this mandate's consent, stops messages to this one. Consent cannot be
--     given on a superseded mandate.
-- N2. Stopping a number, deciding a mandate and carrying consent over all
--     take the same advisory lock on the number, so a STOP cannot race an
--     approval.
-- N4. The lister reads the refusal reason of a refused renewal.
-- N5. A lister inserting a mandate directly (the insert policy) meets the
--     same rules as the filing function: not an example, not an owner
--     listing, not closed, no end date in the past, and no second mandate
--     while the current one has more than 30 days to run.
-- N6. Expiry reminders go only for live listings.
-- N7. Consent carries over only when both the number and the principal's
--     name match, after normalising.

/* ---------------------------------------------------- 4. never a NIN */

alter table public.listing_mandates drop constraint if exists listing_mandates_id_ref_is_never_a_nin;
alter table public.listing_mandates
  add constraint listing_mandates_id_ref_is_never_a_nin
    check (principal_id_document_ref is null
           or (length(btrim(principal_id_document_ref)) between 3 and 80
               and principal_id_document_ref ~ '^[ -~]+$'
               and regexp_replace(principal_id_document_ref, '[^[:alnum:]]', '', 'g') !~ '[0-9]{11}'));

alter table public.listing_mandates drop constraint if exists listing_mandates_id_document_kind_known;
alter table public.listing_mandates
  add constraint listing_mandates_id_document_kind_known
    check (principal_id_document_kind is null or principal_id_document_kind in
           ('international_passport', 'drivers_licence', 'voters_card', 'cac_certificate', 'other'));

comment on column public.listing_mandates.principal_id_document_ref is
  'SCUML item 17. The reference on the principal''s ID document, when one was seen (passport, licence, voter''s card or CAC number). NEVER A NIN: plain ASCII only, and no run of eleven or more digits once punctuation is stripped. The national ID card is not a kind here because it carries the NIN.';

/* ---------------------------------------- 3. a decided mandate is a record */

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

/* ------------------------------------------------- 11. five years, counted */

-- The later of the listing's close and this mandate's refusal, plus five
-- years. A listing still open keeps every mandate it has ever had.
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

-- A listing that never went live and never had a mandate approved holds no
-- record of anyone acting for anyone: it may be deleted, mandates and all.
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

-- Waiting or refused mandates of a listing that never went live, five years
-- after they were last touched.
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

/* ------------------------------------------------------- 10. the words */

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

/* ------------------------------------------ 2. the note is the reason */

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
  -- Held for a mandate means: returned, with the mandate note. The moment it
  -- is anything else, for any reason, it is not held for a mandate.
  if new.needs_mandate_since is not null
     and (new.status is distinct from 'MORE_INFO_REQUIRED'
          or new.review_notes is distinct from private.mandate_needed_note()) then
    new.needs_mandate_since := null;
  end if;
  return new;
end;
$function$;

revoke all on function private.listings_needs_mandate_fact() from public, anon, authenticated;

/* ------------------------------------------------------ 7 and 9. the gate */

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

/* ---------------------------------------------- 1. filing, never in the past */

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
  -- N4: a refusal since the current mandate (a refused renewal), newest first.
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

/* ----------------------------------- 1, 2 and 3. deciding, inside the flag */

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

    -- N2: the same lock a STOP takes, on both numbers involved.
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

    update public.listings set mandate_verified_at = now(), supply_verified_by = me where id = m.listing_id;

    -- Back live ONLY while the listing is held for this and nothing else:
    -- returned, with the mandate note still the note. A listing staff sent
    -- back for another reason stays where staff put it.
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

/* ------------------------------------------- 6 and 10. the sweep waits for us */

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

-- The daily reminder run also lapses the published mark of any listing whose
-- mandate has ended, so a reader never sees a confirmation date that is no
-- longer true.
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

/* ------------------------------------------------- 8. acting for, as of then */

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
  elsif p_kind = 'escrow' then
    select e.listing_id, e.created_at, true into v_listing, v_at, v_found from public.escrows e where e.id = p_id;
  else
    raise exception 'listing, booking, transaction, rent_payment or escrow' using errcode = 'check_violation';
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

/* ------------------------------------------------ 6. the lane's count */

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

/* ------------------------------------------------ N2. one lock per number */

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

/* ------------------------------------ N1. a stop on the number is a stop */

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

/* ------------------------------------------ N2 and N7. carrying consent over */

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

/* ------------------------------------ N5. the insert policy meets the rules */

create or replace function private.listing_mandates_scuml17_guard()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  l record;
  cur record;
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

-- What the member's insert guard needs to know about the listing, read as the
-- definer because the member cannot read every column it needs.
-- current_expires_open: null when there is no current mandate, else whether a
-- renewal may be filed beside it.
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

/* Outside the transaction's concerns: cron.schedule commits its own row. */
select cron.schedule('vallo_scuml17_purge_stale_mandates', '35 5 * * *', 'select private.purge_stale_mandates();');
