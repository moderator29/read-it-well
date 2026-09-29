-- SCUML item 17: A MANDATE CAN BE RENEWED BEFORE IT RUNS OUT.
--
-- 20260924171000 turned the publish gate on and swept listings whose mandate
-- is not current. It left a hole: an approved mandate that runs out takes the
-- listing down, and the one-live-mandate index stopped the agent filing a
-- replacement beside it. This closes it.
--
-- 1. The index splits in two: at most ONE WAITING mandate per listing, and at
--    most ONE CURRENT approved mandate. A replacement can wait beside the
--    approved one it will replace.
-- 2. The lister may file a replacement once the current mandate is within 30
--    days of its end, or has ended. Before that it is "on file".
-- 3. Approving a replacement SUPERSEDES the old mandate: `superseded_at` and
--    `superseded_by` are set on it, and the row is kept (the retention guards
--    of 171000 still hold every row for five years after the listing closes).
-- 4. The agent is told 30 days before a mandate runs out, and again 7 days
--    before, once each (`mandate_expiry_notices`), unless a replacement is
--    already waiting.
-- 5. The landlord line (V-31) messages only the CURRENT mandate's principal,
--    so a renewal never doubles a question; the principal's recorded consent
--    carries to the renewal when the number is the same.

/* ----------------------------------------------- 1. superseded, and kept */

alter table public.listing_mandates
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid references public.listing_mandates(id) on delete restrict;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.listing_mandates'::regclass
                  and conname = 'listing_mandates_superseded_is_a_pair') then
    alter table public.listing_mandates
      add constraint listing_mandates_superseded_is_a_pair
        check ((superseded_at is null) = (superseded_by is null)
               and (superseded_at is null or review_status = 'approved'));
  end if;
end $$;

comment on column public.listing_mandates.superseded_at is
  'SCUML item 17. When an approved replacement took over from this mandate. The row is kept: it is the record of who the lister acted for until then.';
comment on column public.listing_mandates.superseded_by is
  'SCUML item 17. The mandate that replaced this one.';

drop index if exists public.listing_mandates_one_live;
create unique index if not exists listing_mandates_one_waiting
  on public.listing_mandates (listing_id) where review_status = 'pending';
create unique index if not exists listing_mandates_one_current
  on public.listing_mandates (listing_id) where review_status = 'approved' and superseded_at is null;

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

revoke all on function private.mandate_renewal_open(date) from public, anon, authenticated;

/* ------------------------------------------- 2. filing a replacement */

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

  -- The current approved mandate. While it has more than 30 days to run it
  -- is simply on file; from then, a replacement may wait beside it.
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

-- The lister's view: the waiting mandate if there is one, the current one,
-- and whether a renewal may be filed. Never who checked it.
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
begin
  select id, listing_role, is_demo, status, needs_mandate_since into l
    from public.listings where id = p_listing;
  if l.id is null or not private.owns_listing(p_listing) then
    return jsonb_build_object('state', 'not_yours');
  end if;
  select * into cur from public.listing_mandates
   where listing_id = p_listing and review_status = 'approved' and superseded_at is null;
  -- Shown: the waiting one first, then the current one, then the latest refusal.
  select * into shown from public.listing_mandates
   where listing_id = p_listing and superseded_at is null
   order by case review_status when 'pending' then 0 when 'approved' then 1 else 2 end, created_at desc
   limit 1;
  return jsonb_build_object(
    'state', 'ok',
    'role', l.listing_role,
    'is_demo', l.is_demo,
    'status', l.status,
    'needs_mandate_since', l.needs_mandate_since,
    'grace_ends', '2026-10-24',
    'renewal_open', cur.id is not null and private.mandate_renewal_open(cur.expires_on),
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

/* ------------------------------------------- 3. approval supersedes */

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

    -- The old mandate steps aside first (one current per listing), and is kept.
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

    -- listings_supply_proof_has_a_decider_chk: the date carries who decided it.
    update public.listings set mandate_verified_at = now(), supply_verified_by = me where id = m.listing_id;

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
    -- A refused replacement leaves the current mandate exactly as it was.
    update public.listings
       set mandate_verified_at = null,
           supply_verified_by = case when ownership_verified_at is null then null else supply_verified_by end
     where id = m.listing_id and not private.listing_has_live_mandate(m.listing_id);
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (me, 'mandate.decide', 'listing', m.listing_id::text,
          jsonb_build_object('scuml_item', 17, 'mandate_id', m.id, 'decision', p_decision,
                             'verified_how', p_verified_how, 'supersedes', old_id,
                             'id_document_kind', nullif(btrim(coalesce(p_id_document_kind, '')), '')));

  return jsonb_build_object('state', case when p_decision = 'approve' then 'approved' else 'rejected' end,
                            'superseded', old_id);
end;
$function$;

revoke all on function public.decide_listing_mandate(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.decide_listing_mandate(uuid, text, text, text, text, text, text) to authenticated;

/* -------------------------------------- 4. told at 30 days and at 7 */

create table if not exists public.mandate_expiry_notices (
  mandate_id uuid not null references public.listing_mandates(id) on delete cascade,
  days_before integer not null check (days_before in (30, 7)),
  sent_at timestamptz not null default now(),
  primary key (mandate_id, days_before)
);

comment on table public.mandate_expiry_notices is
  'SCUML item 17. Which expiry reminders an agent has been sent for a mandate, so each goes once. Staff and platform only.';

alter table public.mandate_expiry_notices enable row level security;
revoke all on table public.mandate_expiry_notices from anon, authenticated;

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
       and l.closed_at is null
       -- A replacement already waiting needs no reminder.
       and not exists (select 1 from public.listing_mandates p
                        where p.listing_id = m.listing_id and p.review_status = 'pending')
  loop
    due := case when r.expires_on <= today + 7 then 7 else 30 end;
    if exists (select 1 from public.mandate_expiry_notices x
                where x.mandate_id = r.id and x.days_before = due) then
      continue;
    end if;
    -- Inside 7 days the 30-day reminder is not sent late as well.
    insert into public.mandate_expiry_notices (mandate_id, days_before)
    select r.id, d from unnest(case when due = 7 then array[30, 7] else array[30] end) d
    on conflict do nothing;
    perform private.notify(r.user_id, 'listing', 'Your mandate is running out',
      'The mandate from ' || r.principal_name || ' for ' || r.title || ' ends on '
      || to_char(r.expires_on, 'FMDD Month YYYY') || '. File the renewal before then and we will ring them to confirm, '
      || 'so the listing stays live without a break.',
      '/agent/listings/' || r.listing_id || '/mandate');
    n := n + 1;
  end loop;
  return n;
end;
$function$;

revoke all on function private.mandate_expiry_reminders() from public, anon, authenticated;

/* ---------------------------------- acting_for shows the replacement */

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

/* ------------------------------ 5. the landlord line follows the renewal */

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
  );
$function$;

revoke all on function private.principal_may_be_messaged(uuid) from public, anon, authenticated;

-- The principal said yes to being asked on this number. A renewal naming the
-- same number keeps that answer (and who read the sentence, and when) rather
-- than silently switching the line off until someone rings again.
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
    update public.listing_mandates r
       set principal_consented_at = new.principal_consented_at,
           principal_consent_read_by = new.principal_consent_read_by,
           principal_consent_sentence = new.principal_consent_sentence,
           principal_consent_withdrawn_at = null
     where r.id = new.superseded_by
       and r.principal_phone is not distinct from new.principal_phone
       and r.principal_consented_at is null;
  end if;
  return new;
end;
$function$;

revoke all on function private.mandate_consent_carries_forward() from public, anon, authenticated;

drop trigger if exists listing_mandates_consent_carries_forward on public.listing_mandates;
create trigger listing_mandates_consent_carries_forward
  after update of superseded_at on public.listing_mandates
  for each row execute function private.mandate_consent_carries_forward();

/* Outside the transaction's concerns: cron.schedule commits its own row. */
select cron.schedule('vallo_scuml17_mandate_expiry_reminders', '30 5 * * *', 'select private.mandate_expiry_reminders();');
