/*
 * THE SECOND REVIEW OF THE LANDLORD LINE AND THE TWO DOORS, ANSWERED.
 *
 * 1. A PLACE IS A NEIGHBOURHOOD FROM THE CLOSED LIST, ELSE THE STATE. Never the
 *    city: `listings.city` is free text a lister types too ("Plot 5 Bourdillon
 *    Road"). The reply page and the trusted contact's page no longer return a
 *    city at all.
 *
 * 2. A MESSAGE IS LOGGED BEFORE IT IS SENT. `landlord_line_begin` re-checks the
 *    question can still go out and writes the log row as `sending` in the same
 *    statement; `landlord_line_finish` marks it `sent` or `failed` after the
 *    transport answers. A question is returned to the queue only when nothing
 *    was ever attempted. A send left `sending` for an hour is marked `unknown`
 *    and raises an alert; it is never resent, because the landlord may already
 *    hold the link and a resend would kill it. `landlord_line_record`, which
 *    logged after the fact, is dropped.
 *
 * 3. THE WEEKLY LIMIT COUNTS WHAT WAS SENT AND WHAT IS WAITING TO BE: a
 *    question sent in the last seven days, a message logged in the last seven
 *    days, or a question queued and not yet sent.
 *
 * 4. A CLOSED LISTING REFUSES A STATUS CHANGE FROM EVERY ROLE, and is skipped
 *    silently only while a stop is being lifted (the agent's move from
 *    SUSPENDED to APPROVED marks the transaction), so a lift cannot bring a
 *    closed listing back and nothing else can move one without being told.
 *
 * 5. AN AGENT'S CODE IS ALWAYS MINTED BY THE PLATFORM, from a definer trigger;
 *    the client role loses its grant on the minting function.
 *
 * 6. THE AGENT CHECK: a code answer carries the last three digits of the
 *    agent's registered number, so a renter can compare it with the number
 *    they were given.
 *
 * 7. THE TRUSTED CONTACT'S PAGE follows the inspection: it says the inspection
 *    was cancelled unless it is still confirmed, says it was moved if the time
 *    changed, and says sharing stopped when the renter stops it. A link can be
 *    made only from 24 hours before the slot.
 *
 * 8. ONE CARD PER PROPERTY, ACROSS EVERY PAGE: the facts read names the one
 *    copy of each property search should show (lowest move-in total, then a
 *    verified lister, then a reconfirmed one), so a cheaper copy on another
 *    page is never hidden behind a dearer one on this page.
 */

/* ---------------------------------------------------------- 1. the place */

create or replace function private.listing_place_name(p_listing uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(
           (select n.name
              from (values
                ('Ikeja'), ('Ikeja GRA'), ('Ikoyi'), ('Victoria Island'), ('Lekki'), ('Lekki Phase 1'),
                ('Ajah'), ('Yaba'), ('Surulere'), ('Gbagada'), ('Maryland'), ('Magodo'), ('Ogudu'),
                ('Ojodu'), ('Ogba'), ('Ikorodu'), ('Festac'), ('Apapa'), ('Ebute Metta'), ('Oshodi'),
                ('Isolo'), ('Ilupeju'), ('Anthony'), ('Ketu'), ('Sangotedo'), ('Chevron'), ('Oniru'),
                ('Agungi'), ('Osapa'), ('Ikate'), ('Idado'), ('Opebi'), ('Allen'), ('Oregun'),
                ('Agege'), ('Egbeda'), ('Ipaja'), ('Akoka'), ('Ilasamaja'), ('Ojota'),
                ('Wuse'), ('Wuse 2'), ('Maitama'), ('Asokoro'), ('Garki'), ('Gwarinpa'), ('Jabi'),
                ('Utako'), ('Katampe'), ('Lokogoma'), ('Kubwa'), ('Lugbe'), ('Life Camp'), ('Guzape'),
                ('Old GRA'), ('New GRA'), ('Rumuokoro'), ('Trans Amadi'), ('Bodija'), ('Jericho'),
                ('Independence Layout'), ('GRA')
              ) as n(name)
             where lower(n.name) = lower(regexp_replace(btrim(coalesce(l.area, '')), '\s+', ' ', 'g'))
             limit 1),
           (select s.name from public.states s where s.code = l.state_code),
           'Nigeria')
    from public.listings l
   where l.id = p_listing;
$function$;

revoke all on function private.listing_place_name(uuid) from public, anon, authenticated;

create or replace function public.landlord_line_read(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  a public.principal_asks%rowtype;
  l public.listings%rowtype;
  rp public.rent_payments%rowtype;
  lister text;
  state text;
begin
  a := private.principal_ask_by_token(p_token);
  if a.id is null then
    return jsonb_build_object('state', 'unknown');
  end if;
  if not private.landlord_line_open() then
    return jsonb_build_object('state', 'closed');
  end if;

  select * into l from public.listings where id = a.listing_id;
  select coalesce(nullif(btrim(b.name), ''), nullif(btrim(ag.display_name), '')) into lister
    from public.listings x
    left join public.agents ag on ag.id = x.agent_id
    left join public.businesses b on b.id = x.firm_id
   where x.id = a.listing_id;

  state := case when a.answered_at is not null then 'used'
                when a.expires_at <= now() then 'expired'
                else 'open' end;

  if a.purpose = 'rent' and state = 'open' then
    select * into rp from public.rent_payments where id = a.rent_payment_id;
  end if;

  return jsonb_build_object(
    'state', state,
    'purpose', a.purpose,
    'place', private.listing_place_words(a.listing_id),
    'area', private.listing_place_name(a.listing_id),
    'bedrooms', l.bedrooms,
    'property_type', l.property_type,
    'lister_name', lister,
    'asked_at', a.sent_at,
    'expires_at', a.expires_at,
    'answered_at', a.answered_at,
    'answer', case when state = 'used' then a.answer end,
    'rent', case when a.purpose = 'rent' and state = 'open' then jsonb_build_object(
        'rent_minor', rp.rent_minor,
        'caution_minor', rp.caution_minor,
        'service_minor', rp.service_minor,
        'agency_minor', rp.agency_minor,
        'legal_minor', rp.legal_minor,
        'agreement_minor', rp.agreement_minor,
        'total_minor', rp.total_minor,
        'total_stated', rp.total_stated,
        'currency', rp.currency,
        'move_in', rp.move_in,
        'rent_period', rp.rent_period) end
  );
end;
$function$;

revoke all on function public.landlord_line_read(text) from public;
grant execute on function public.landlord_line_read(text) to anon, authenticated;

/* ------------------------------------------ 2. logged before it is sent */

alter table public.principal_messages
  add column if not exists status text not null default 'sent'
    check (status in ('sending', 'sent', 'failed', 'unknown')),
  add column if not exists finished_at timestamptz;

create index if not exists principal_messages_sending_idx
  on public.principal_messages (created_at) where status = 'sending';

drop function if exists public.landlord_line_record(uuid, text, text, text, boolean);

/* Immediately before the transport call: may this still go out? If so, the
   log row exists before a single byte leaves. Null means do not send. */
create or replace function public.landlord_line_begin(p_ask uuid, p_channel text, p_body text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  q public.principal_asks%rowtype;
  mid uuid;
begin
  select * into q from public.principal_asks where id = p_ask for update;
  if q.id is null or not public.landlord_line_claim(p_ask) then
    return null;
  end if;
  if exists (select 1 from public.principal_messages pm where pm.ask_id = q.id) then
    /* Attempted before: never twice. */
    return null;
  end if;
  insert into public.principal_messages (ask_id, mandate_id, channel, body, status)
  values (q.id, q.mandate_id, p_channel, p_body, 'sending')
  returning id into mid;
  return mid;
end;
$function$;

revoke all on function public.landlord_line_begin(uuid, text, text) from public, anon, authenticated;
grant execute on function public.landlord_line_begin(uuid, text, text) to service_role;

/* After the transport answered. */
create or replace function public.landlord_line_finish(p_message uuid, p_delivered boolean, p_ref text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  update public.principal_messages
     set status = case when p_delivered then 'sent' else 'failed' end,
         transport_ref = left(p_ref, 200),
         finished_at = now()
   where id = p_message and status = 'sending';
end;
$function$;

revoke all on function public.landlord_line_finish(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.landlord_line_finish(uuid, boolean, text) to service_role;

/* A question issued but refused before any attempt goes back to the queue. */
create or replace function public.landlord_line_release(p_ask uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  update public.principal_asks q
     set sent_at = null, token_hash = null, reply_code = null, expires_at = null
   where q.id = p_ask and q.answered_at is null
     and not exists (select 1 from public.principal_messages pm where pm.ask_id = q.id);
end;
$function$;

revoke all on function public.landlord_line_release(uuid) from public, anon, authenticated;
grant execute on function public.landlord_line_release(uuid) to service_role;

/* Only a question never attempted goes back to the queue. A send nobody
   finished is marked unknown and raised, once, and is never resent. */
create or replace function private.unsend_unlogged_asks()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer;
  m record;
begin
  update public.principal_asks q
     set sent_at = null, token_hash = null, reply_code = null, expires_at = null
   where q.sent_at is not null
     and q.sent_at < now() - interval '1 hour'
     and q.answered_at is null
     and not exists (select 1 from public.principal_messages pm where pm.ask_id = q.id);
  get diagnostics n = row_count;

  for m in
    update public.principal_messages
       set status = 'unknown', finished_at = now()
     where status = 'sending' and created_at < now() - interval '1 hour'
    returning id, ask_id
  loop
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high'::public.alert_severity, 'open'::public.alert_status,
            'A landlord message may or may not have been sent',
            'The transport never answered for this message. It will not be resent, because the landlord may already hold the link. Check the transport''s own log for this reference.',
            'principal_message', m.id::text);
  end loop;
  return n;
end;
$function$;

revoke all on function private.unsend_unlogged_asks() from public, anon, authenticated;

/* The tenant is told "we sent the landlord these figures" only for a message
   the transport confirmed on a real channel. */
create or replace function public.rent_landlord_fact(p_inspection uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  rp public.rent_payments%rowtype;
  a public.principal_asks%rowtype;
  who text;
  delivered timestamptz;
begin
  select * into rp from public.rent_payments
   where inspection_id = p_inspection
     and (tenant_id = (select auth.uid()) or lister_id = (select auth.uid()));
  if not found then
    return null;
  end if;
  select * into a from public.principal_asks
   where rent_payment_id = rp.id and purpose = 'rent' and sent_at is not null;
  if not found then
    return null;
  end if;
  select min(pm.created_at) into delivered
    from public.principal_messages pm
   where pm.ask_id = a.id and pm.channel <> 'stub' and pm.status = 'sent';
  if a.answered_at is null and delivered is null then
    return null;
  end if;
  select private.principal_first_name(m.principal_name) into who
    from public.listing_mandates m where m.id = a.mandate_id;
  return jsonb_build_object(
    'state', case a.answer when 'confirmed' then 'confirmed' when 'disputed' then 'disputed' else 'waiting' end,
    'answered_at', a.answered_at,
    'asked_at', coalesce(delivered, a.sent_at),
    'first_name', who);
end;
$function$;

revoke all on function public.rent_landlord_fact(uuid) from public, anon;
grant execute on function public.rent_landlord_fact(uuid) to authenticated;

create or replace function private.sweep_not_reconfirmed()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer := 0;
begin
  if not private.landlord_line_open() then
    update public.listings set not_reconfirmed_since = null where not_reconfirmed_since is not null;
    return 0;
  end if;

  update public.listings l
     set not_reconfirmed_since = null
   where l.not_reconfirmed_since is not null
     and l.listing_role is distinct from 'owner'::public.listing_role
     and not exists (
       select 1 from public.listing_mandates m
        where m.listing_id = l.id and private.principal_may_be_messaged(m.id));

  update public.listings l
     set not_reconfirmed_since = now()
   where l.status = 'PUBLISHED'::public.listing_status
     and l.not_reconfirmed_since is null
     and l.closed_at is null
     and (
       exists (
         select 1 from public.principal_asks a
          where a.listing_id = l.id
            and a.purpose = 'vacancy'
            and a.sent_at is not null
            and a.answered_at is null
            and a.sent_at <= now() - interval '21 days'
            and a.expires_at > now()
            and private.principal_may_be_messaged(a.mandate_id)
            and (l.availability_confirmed_at is null or a.sent_at > l.availability_confirmed_at)
            and exists (select 1 from public.principal_messages pm
                         where pm.ask_id = a.id and pm.channel <> 'stub' and pm.status = 'sent'))
       or (l.listing_role = 'owner'::public.listing_role and exists (
         select 1 from public.owner_heartbeats h
          where h.listing_id = l.id
            and h.answered_at is null
            and h.asked_at <= now() - interval '21 days'
            and not exists (select 1 from public.owner_heartbeats later
                             where later.listing_id = l.id and later.answered_at > h.asked_at)))
     );
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function private.sweep_not_reconfirmed() from public, anon, authenticated;

/* ------------------------------------------------ 3. the weekly limit */

create or replace function private.principal_number_asked_recently(p_mandate uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.principal_asks q
      join public.listing_mandates qm on qm.id = q.mandate_id
      join public.listing_mandates me on me.id = p_mandate
     where q.purpose = 'vacancy'
       and qm.principal_phone = me.principal_phone
       and (q.sent_at is null
            or q.sent_at > now() - interval '7 days'
            or exists (select 1 from public.principal_messages pm
                        where pm.ask_id = q.id and pm.created_at > now() - interval '7 days')));
$function$;

revoke all on function private.principal_number_asked_recently(uuid) from public, anon, authenticated;

/* ------------------------------------------- 4. a closed listing, raised */

create or replace function private.closed_listing_stays_closed()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if old.closed_at is null then
    return new;
  end if;
  if coalesce(current_setting('vallo.listing_reopen', true), '') = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.closed_at is distinct from old.closed_at
     or new.close_reason is distinct from old.close_reason then
    /* A stop being lifted puts back everything it withdrew; a closed listing
       among them simply stays where it is, and is not counted as restored. */
    if coalesce(current_setting('vallo.reinstating', true), '') = 'on' then
      return null;
    end if;
    raise exception 'This listing was closed, and a closed listing stays closed. List the property again as a new listing.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

revoke all on function private.closed_listing_stays_closed() from public, anon, authenticated;

create or replace function private.mark_reinstating()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if old.status = 'SUSPENDED'::public.agent_application_status
     and new.status = 'APPROVED'::public.agent_application_status then
    perform set_config('vallo.reinstating', 'on', true);
  end if;
  return new;
end;
$function$;

revoke all on function private.mark_reinstating() from public, anon, authenticated;

drop trigger if exists agents_reinstating_marks_the_transaction on public.agents;
create trigger agents_reinstating_marks_the_transaction
  before update of status on public.agents
  for each row execute function private.mark_reinstating();

/* ------------------------------------------------- 5. the agent's code */

create or replace function private.agents_assign_public_code()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  new.public_code := private.new_agent_code();
  return new;
end;
$function$;

revoke all on function private.agents_assign_public_code() from public, anon, authenticated;

drop trigger if exists agents_assign_public_code on public.agents;
create trigger agents_assign_public_code
  before insert on public.agents
  for each row execute function private.agents_assign_public_code();

create or replace function private.agents_lookup_guard()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.lookup_phone_hmac := null;
      new.lookup_phone_hint := null;
      new.lookup_opted_in_at := null;
    elsif new.public_code is distinct from old.public_code
       or new.lookup_phone_hmac is distinct from old.lookup_phone_hmac
       or new.lookup_phone_hint is distinct from old.lookup_phone_hint
       or new.lookup_opted_in_at is distinct from old.lookup_opted_in_at then
      raise exception 'the agent code and the checkable number are set by the platform'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function private.agents_lookup_guard() from public, anon, authenticated;
revoke execute on function private.new_agent_code() from authenticated;

/* ------------------------------------------------- 6. the agent check */

create or replace function public.agent_lookup(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  a public.agents%rowtype;
  q text := upper(btrim(coalesce(p_query, '')));
  handle text;
  by_code boolean := q ~ '^VA-[ACDEFHJKMNPRTUVWXY3479]{5}$';
begin
  if by_code then
    select * into a from public.agents where public_code = q;
  elsif q ~ '^\+234[7-9][0-9]{9}$' then
    select * into a from public.agents where lookup_phone_hmac = private.agent_lookup_key(q);
  else
    return jsonb_build_object('found', false, 'kind', 'unreadable');
  end if;
  if a.id is null or a.is_demo or a.status <> 'APPROVED'::public.agent_application_status then
    return jsonb_build_object('found', false, 'kind', case when by_code then 'code' else 'phone' end);
  end if;
  select sp.handle into handle from public.social_profiles sp where sp.user_id = a.user_id;
  return jsonb_build_object(
    'found', true,
    'kind', case when by_code then 'code' else 'phone' end,
    'display_name', nullif(btrim(a.display_name), ''),
    'role', a.role,
    'code', a.public_code,
    'hint', case when by_code then a.lookup_phone_hint end,
    'identity_checked_at', private.identity_checked_at(a.user_id),
    'handle', handle);
end;
$function$;

revoke all on function public.agent_lookup(text) from public, anon, authenticated;
grant execute on function public.agent_lookup(text) to service_role;

/* ------------------------------------- 7. the trusted contact's page */

alter table public.inspection_safety_shares
  add column if not exists slot_at timestamptz,
  add column if not exists stopped_at timestamptz;

grant select (slot_at, stopped_at) on public.inspection_safety_shares to authenticated;

create or replace function public.safety_share_create(p_inspection uuid, p_minutes integer default 60)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r public.inspection_requests%rowtype;
  tok text;
  back timestamptz;
begin
  select * into r from public.inspection_requests where id = p_inspection;
  if r.id is null or r.requester_id is distinct from (select auth.uid()) then
    raise exception 'only the person going to this inspection can share it' using errcode = 'insufficient_privilege';
  end if;
  if r.state <> 'CONFIRMED'::public.inspection_state or r.slot_at is null then
    raise exception 'an inspection can be shared once it is confirmed with a time' using errcode = 'check_violation';
  end if;
  if r.slot_at + interval '4 hours' <= now() then
    raise exception 'this inspection is over' using errcode = 'check_violation';
  end if;
  if r.slot_at > now() + interval '24 hours' then
    raise exception 'a link can be made from 24 hours before the inspection' using errcode = 'check_violation';
  end if;
  back := r.slot_at + make_interval(mins => greatest(30, least(coalesce(p_minutes, 60), 240)));

  update public.inspection_safety_shares set revoked_at = now()
   where inspection_id = p_inspection and revoked_at is null;

  tok := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
  insert into public.inspection_safety_shares (inspection_id, created_by, token_hash, expected_back_at, expires_at, slot_at)
  values (p_inspection, (select auth.uid()), extensions.digest(tok, 'sha256'), back,
          greatest(r.slot_at + interval '4 hours', back + interval '1 hour'), r.slot_at);
  return jsonb_build_object('token', tok, 'expected_back_at', back);
end;
$function$;

revoke all on function public.safety_share_create(uuid, integer) from public, anon;
grant execute on function public.safety_share_create(uuid, integer) to authenticated;

create or replace function public.safety_share_stop(p_inspection uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer;
begin
  update public.inspection_safety_shares
     set stopped_at = now()
   where inspection_id = p_inspection
     and created_by = (select auth.uid())
     and revoked_at is null
     and stopped_at is null;
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function public.safety_share_stop(uuid) from public, anon;
grant execute on function public.safety_share_stop(uuid) to authenticated;

create or replace function public.safety_share_read(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  s public.inspection_safety_shares%rowtype;
  r public.inspection_requests%rowtype;
  l public.listings%rowtype;
  agent_user uuid;
  agent_name text;
  first text;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then
    return jsonb_build_object('state', 'unknown');
  end if;
  select * into s from public.inspection_safety_shares where token_hash = extensions.digest(p_token, 'sha256');
  if s.id is null or s.revoked_at is not null then
    return jsonb_build_object('state', 'unknown');
  end if;
  if s.stopped_at is not null then
    return jsonb_build_object('state', 'stopped');
  end if;
  if s.expires_at <= now() then
    return jsonb_build_object('state', 'expired');
  end if;
  select * into r from public.inspection_requests where id = s.inspection_id;
  if r.id is null or r.state <> 'CONFIRMED'::public.inspection_state then
    return jsonb_build_object('state', 'cancelled');
  end if;
  if r.slot_at is distinct from s.slot_at then
    return jsonb_build_object('state', 'moved');
  end if;

  select * into l from public.listings where id = r.listing_id;
  select a.user_id, coalesce(nullif(btrim(b.name), ''), nullif(btrim(a.display_name), ''))
    into agent_user, agent_name
    from public.agents a left join public.businesses b on b.id = l.firm_id
   where a.id = l.agent_id;
  select coalesce(nullif(btrim(p.first_name), ''), split_part(nullif(btrim(p.display_name), ''), ' ', 1))
    into first from public.profiles p where p.id = s.created_by;

  return jsonb_build_object(
    'state', 'live',
    'first_name', first,
    'area', private.listing_place_name(l.id),
    'agent_name', agent_name,
    'identity_checked_at', private.identity_checked_at(agent_user),
    'slot_at', r.slot_at,
    'expected_back_at', s.expected_back_at,
    'checked_in_at', s.checked_in_at,
    'overdue', s.checked_in_at is null and s.expected_back_at + interval '30 minutes' <= now());
end;
$function$;

revoke all on function public.safety_share_read(text) from public;
grant execute on function public.safety_share_read(text) to anon, authenticated;

/* The reminder only for a share that is still about a confirmed inspection
   at the time it was shared for. */
create or replace function private.safety_share_sweep()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  s record;
  n integer := 0;
begin
  for s in
    select x.id, x.created_by
      from public.inspection_safety_shares x
      join public.inspection_requests r on r.id = x.inspection_id
     where x.checked_in_at is null and x.reminded_at is null and x.revoked_at is null and x.stopped_at is null
       and x.expected_back_at + interval '30 minutes' <= now()
       and x.expires_at > now()
       and r.state = 'CONFIRMED'::public.inspection_state
       and r.slot_at is not distinct from x.slot_at
  loop
    update public.inspection_safety_shares set reminded_at = now() where id = s.id;
    perform private.notify(
      s.created_by, 'booking'::public.notification_kind,
      'Are you back from your inspection?',
      'Tap I''m done so the person you told knows you are safe. Their page says you have not checked in yet.',
      '/inspections');
    n := n + 1;
  end loop;
  return n;
end;
$function$;

revoke all on function private.safety_share_sweep() from public, anon, authenticated;

/* --------------------------------------- 8. one card per property */

drop function if exists public.listing_landlord_facts(uuid[]);
create function public.listing_landlord_facts(p_listings uuid[])
returns table (
  listing_id uuid,
  owner_confirmed_at timestamptz,
  not_reconfirmed boolean,
  offer_count integer,
  property_id uuid,
  is_representative boolean
)
language sql
stable
security definer
set search_path to ''
as $function$
  select l.id,
         case when private.landlord_line_open() then l.availability_confirmed_at end,
         l.not_reconfirmed_since is not null and private.landlord_line_open(),
         case when l.property_id is null then 1
              else (select count(distinct o.agent_id)::integer from public.listings o
                     where o.property_id = l.property_id
                       and o.status = 'PUBLISHED'::public.listing_status
                       and o.is_demo = false) end,
         l.property_id,
         l.property_id is null or l.id = (
           select o.id
             from public.listings o
             join public.agents a on a.id = o.agent_id
            where o.property_id = l.property_id
              and o.status = 'PUBLISHED'::public.listing_status
              and o.is_demo = false
            order by o.total_move_in_cost_minor asc nulls last,
                     (coalesce(a.verification_tier, 0) > 0) desc,
                     (o.availability_confirmed_at is not null and o.not_reconfirmed_since is null) desc,
                     o.published_at asc nulls last,
                     o.id
            limit 1)
    from public.listings l
   where l.id = any(p_listings[1:200])
     and l.status = 'PUBLISHED'::public.listing_status
     and l.is_demo = false
     and (select auth.uid()) is not null;
$function$;

revoke all on function public.listing_landlord_facts(uuid[]) from public, anon;
grant execute on function public.listing_landlord_facts(uuid[]) to authenticated;
