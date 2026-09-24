/*
 * THE THIRD REVIEW OF THE LANDLORD LINE AND THE TWO DOORS, ANSWERED.
 *
 * 1. THE AGENT CHECK'S PLATFORM-WIDE MISS BUDGET IS RESERVED BEFORE THE LOOKUP
 *    and given back on a hit (`refund_agent_check_slot`), so "limited" never
 *    reveals whether a number or a code would have matched, and while the
 *    budget is spent every lookup of that kind is refused. The function only
 *    gives back a slot in the two agent-check miss buckets, and only to the
 *    service role; it never touches another bucket in `rate_limits`.
 *
 * 2. THE TRUSTED CONTACT'S PAGE CANNOT BE QUIETENED BY THE LISTER. It says
 *    "cancelled" only for DECLINED or WITHDRAWN; a COMPLETED inspection is
 *    still live, because a lister marking it done says nothing about whether
 *    the renter got home. A cancelled or moved page still returns whether the
 *    renter checked in and whether they are overdue, so the page can keep its
 *    112 line up. Existing shares get their `slot_at` from the inspection.
 *
 * 3. A STUCK QUESTION NEVER SILENCES A LANDLORD'S NUMBER. `landlord_line_issue`
 *    deletes unsent vacancy questions about a closed or example listing before
 *    it issues; the inspection-confirmed enqueue skips example listings; and
 *    the weekly cap counts an unsent question only while it is under seven
 *    days old.
 *
 * 4. RULE 10: THE LISTER'S NAME IS TEXT THEY TYPED. The agent's display name
 *    and the firm's name no longer reach the landlord's reply page, the SMS or
 *    the trusted contact's page; those keys are returned as null and every
 *    surface already has its no-name wording.
 */

/* ------------------------------------------- 1. the reserved miss budget */

create or replace function public.refund_agent_check_slot(p_bucket text, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_window timestamptz;
begin
  if p_bucket not in ('agent_check_phone_miss', 'agent_check_code_miss')
     or p_window_seconds is null or p_window_seconds < 1 then
    return;
  end if;
  current_window := to_timestamp(
    (floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)::double precision);
  update public.rate_limits
     set count = count - 1
   where bucket = p_bucket
     and subject = 'platform'
     and window_start = current_window
     and count > 0;
end;
$function$;

revoke all on function public.refund_agent_check_slot(text, integer) from public, anon, authenticated;
grant execute on function public.refund_agent_check_slot(text, integer) to service_role;

/* --------------------------------------- 2. the page that stays awake */

update public.inspection_safety_shares s
   set slot_at = r.slot_at
  from public.inspection_requests r
 where r.id = s.inspection_id
   and s.slot_at is null;

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
  first text;
  overdue boolean;
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
  overdue := s.checked_in_at is null and s.expected_back_at + interval '30 minutes' <= now();
  select * into r from public.inspection_requests where id = s.inspection_id;
  if r.id is null or r.state in ('DECLINED'::public.inspection_state, 'WITHDRAWN'::public.inspection_state) then
    return jsonb_build_object('state', 'cancelled', 'checked_in_at', s.checked_in_at, 'overdue', overdue);
  end if;
  if r.slot_at is distinct from s.slot_at then
    return jsonb_build_object('state', 'moved', 'checked_in_at', s.checked_in_at, 'overdue', overdue);
  end if;

  select * into l from public.listings where id = r.listing_id;
  select coalesce(nullif(btrim(p.first_name), ''), split_part(nullif(btrim(p.display_name), ''), ' ', 1))
    into first from public.profiles p where p.id = s.created_by;

  return jsonb_build_object(
    'state', 'live',
    'first_name', first,
    'area', private.listing_place_name(l.id),
    'agent_name', null,
    'identity_checked_at', null,
    'slot_at', r.slot_at,
    'expected_back_at', s.expected_back_at,
    'checked_in_at', s.checked_in_at,
    'overdue', overdue);
end;
$function$;

revoke all on function public.safety_share_read(text) from public;
grant execute on function public.safety_share_read(text) to anon, authenticated;

/* The reminder follows the same rule: a lister's COMPLETED does not stop it. */
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
       and r.state in ('CONFIRMED'::public.inspection_state, 'COMPLETED'::public.inspection_state)
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

/* ------------------------------ 3. a stuck question and the weekly cap */

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
       and ((q.sent_at is null and q.created_at > now() - interval '7 days')
            or q.sent_at > now() - interval '7 days'
            or exists (select 1 from public.principal_messages pm
                        where pm.ask_id = q.id and pm.created_at > now() - interval '7 days')));
$function$;

revoke all on function private.principal_number_asked_recently(uuid) from public, anon, authenticated;

create or replace function public.landlord_line_enqueue()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n_fortnight integer := 0;
  n_inspection integer := 0;
  n_rent integer := 0;
begin
  if not private.landlord_line_open() then
    return jsonb_build_object('open', false);
  end if;

  insert into public.principal_asks (mandate_id, listing_id, purpose, reason, inspection_id)
  select distinct on (m.principal_phone) m.id, l.id, 'vacancy', 'inspection_confirmed', r.id
    from public.inspection_requests r
    join public.listings l on l.id = r.listing_id
    join public.listing_mandates m on m.listing_id = l.id
   where r.state = 'CONFIRMED'::public.inspection_state
     and coalesce(r.responded_at, r.updated_at) > now() - interval '2 days'
     and l.status = 'PUBLISHED'::public.listing_status
     and l.listing_intent = 'rent'::public.listing_intent
     and l.is_demo = false
     and l.closed_at is null
     and m.kind in ('letting', 'management')
     and private.principal_may_be_messaged(m.id)
     and not private.principal_number_asked_recently(m.id)
     and not exists (select 1 from public.principal_asks a where a.inspection_id = r.id)
   order by m.principal_phone, r.updated_at desc
  on conflict do nothing;
  get diagnostics n_inspection = row_count;

  insert into public.principal_asks (mandate_id, listing_id, purpose, reason)
  select distinct on (m.principal_phone) m.id, l.id, 'vacancy', 'fortnightly'
    from public.listings l
    join public.listing_mandates m on m.listing_id = l.id
   where l.status = 'PUBLISHED'::public.listing_status
     and l.listing_intent = 'rent'::public.listing_intent
     and l.is_demo = false
     and l.closed_at is null
     and m.kind in ('letting', 'management')
     and private.principal_may_be_messaged(m.id)
     and not private.principal_number_asked_recently(m.id)
     and not exists (select 1 from public.principal_asks a
                      where a.listing_id = l.id and a.purpose = 'vacancy'
                        and a.created_at > now() - interval '14 days')
   order by m.principal_phone,
            (select max(a.created_at) from public.principal_asks a where a.listing_id = l.id) nulls first;
  get diagnostics n_fortnight = row_count;

  insert into public.principal_asks (mandate_id, listing_id, purpose, reason, rent_payment_id)
  select distinct on (rp.id) m.id, rp.listing_id, 'rent', 'rent_paid', rp.id
    from public.rent_payments rp
    join public.listing_mandates m on m.listing_id = rp.listing_id
   where rp.created_at > now() - interval '30 days'
     and m.kind in ('letting', 'management')
     and private.principal_may_be_messaged(m.id)
     and exists (select 1 from public.transactions tx
                  where tx.booking_id = rp.booking_id
                    and tx.status = 'SUCCESSFUL'::public.transaction_status)
     and not exists (select 1 from public.principal_asks a
                      where a.rent_payment_id = rp.id and a.purpose = 'rent')
   order by rp.id, m.created_at desc
  on conflict do nothing;
  get diagnostics n_rent = row_count;

  return jsonb_build_object('open', true, 'fortnightly', n_fortnight,
                            'inspection_confirmed', n_inspection, 'rent_paid', n_rent);
end;
$function$;

revoke all on function public.landlord_line_enqueue() from public, anon, authenticated;
grant execute on function public.landlord_line_enqueue() to service_role;

create or replace function public.landlord_line_issue(p_limit integer default 50)
returns table (
  ask_id uuid,
  token text,
  reply_code text,
  principal_phone text,
  purpose text,
  reason text,
  place text,
  lister_name text,
  total_minor bigint,
  rent_period public.rent_period,
  move_in date,
  review_status text,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  expires_on date,
  is_demo boolean
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  a record;
  tok text;
  code text;
  alphabet constant text := 'ACDEFHJKMNPRTUVWXY3479';
begin
  if not private.landlord_line_open() then
    return;
  end if;

  delete from public.principal_asks q
   where q.sent_at is null and not private.principal_may_be_messaged(q.mandate_id);
  /* A vacancy question about a listing that has since closed, or about an
     example, is never sent, and must not sit in the queue counting against
     the landlord's weekly cap. */
  delete from public.principal_asks q
   using public.listings l
   where q.sent_at is null
     and q.purpose = 'vacancy'
     and l.id = q.listing_id
     and (l.closed_at is not null or l.is_demo);

  for a in
    select q.*
      from public.principal_asks q
     where q.sent_at is null
     order by q.created_at
     limit greatest(1, least(coalesce(p_limit, 50), 200))
     for update skip locked
  loop
    tok := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
    loop
      select string_agg(substr(alphabet, 1 + (get_byte(b, i) % length(alphabet)), 1), '' order by i)
        into code
        from (select extensions.gen_random_bytes(4) as b) x, generate_series(0, 3) as i;
      exit when not exists (
        select 1 from public.principal_asks o
          join public.listing_mandates om on om.id = o.mandate_id
          join public.listing_mandates am on am.id = a.mandate_id
         where o.reply_code = code and o.answered_at is null
           and om.principal_phone = am.principal_phone);
    end loop;

    update public.principal_asks
       set token_hash = extensions.digest(tok, 'sha256'),
           reply_code = code,
           sent_at = now(),
           expires_at = now() + case when a.purpose = 'rent' then interval '30 days' else interval '28 days' end
     where id = a.id;

    /* No lister name (rule 10): the message uses its no-agent wording. */
    return query
      select a.id, tok, code, m.principal_phone, a.purpose, a.reason,
             private.listing_place_words(a.listing_id),
             null::text,
             rp.total_minor, rp.rent_period, rp.move_in,
             m.review_status::text, m.principal_consented_at, m.principal_consent_withdrawn_at,
             m.expires_on, l.is_demo
        from public.listing_mandates m
        join public.listings l on l.id = a.listing_id
        left join public.rent_payments rp on rp.id = a.rent_payment_id
       where m.id = a.mandate_id;
  end loop;
end;
$function$;

revoke all on function public.landlord_line_issue(integer) from public, anon, authenticated;
grant execute on function public.landlord_line_issue(integer) to service_role;

/* ------------------------------------------- 4. no lister name on the reply page */

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
    'lister_name', null,
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
