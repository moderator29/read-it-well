/*
 * THE FOURTH REVIEW, ANSWERED.
 *
 * 1. V-62. The renter's own WITHDRAWN is quiet on the trusted contact's page:
 *    no overdue and no 112 line, because the renter chose not to go. A
 *    lister's DECLINED still keeps the page awake until the renter checks in.
 *    A MOVED page no longer claims "overdue": the expected-back time belonged
 *    to the old slot, so it proves nothing about the new one.
 *
 * 2. THE WEEKLY LIMIT AT SEND TIME. `landlord_line_issue` deletes unsent
 *    vacancy questions more than seven days old, and sends at most one
 *    vacancy question per principal number per seven days: a question whose
 *    number was already sent one in that time (including earlier in the same
 *    run) is left unsent, and is deleted once it is a week old.
 *
 * 3. The agent check gives back the slot in the window it was RESERVED in,
 *    named by the caller, not whatever window is current when it returns.
 *
 * 4. V-91. A photo can be uploaded only before the arrival window closes, and
 *    at most six per booking. The answer de-duplicates its photo paths,
 *    accepts only photos taken since the window opened, and a racing second
 *    answer reads "already". A report is closed by a desk decision made after
 *    it, not one made before.
 */

/* ------------------------------------------------ 1. the quiet page */

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
  if r.id is not null and r.state = 'WITHDRAWN'::public.inspection_state then
    /* The renter's own decision not to go: nothing to worry the contact with. */
    return jsonb_build_object('state', 'cancelled', 'quiet', true, 'checked_in_at', s.checked_in_at, 'overdue', false);
  end if;
  if r.id is null or r.state = 'DECLINED'::public.inspection_state then
    return jsonb_build_object('state', 'cancelled', 'quiet', false, 'checked_in_at', s.checked_in_at, 'overdue', overdue);
  end if;
  if r.slot_at is distinct from s.slot_at then
    /* The expected-back time was for the old slot: no overdue claim. */
    return jsonb_build_object('state', 'moved', 'quiet', false, 'checked_in_at', s.checked_in_at, 'overdue', false);
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

/* ------------------------------------ 2. the weekly limit at send time */

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
  /* A vacancy question that has waited a week is stale: the next fortnightly
     run asks again if the listing still needs it. */
  delete from public.principal_asks q
   where q.sent_at is null
     and q.purpose = 'vacancy'
     and q.created_at < now() - interval '7 days';

  for a in
    select q.*
      from public.principal_asks q
     where q.sent_at is null
     order by q.created_at
     limit greatest(1, least(coalesce(p_limit, 50), 200))
     for update skip locked
  loop
    /* THE WEEKLY LIMIT, AT SEND TIME: one vacancy question per principal
       number per seven days, counting any sent earlier in this same run. */
    if a.purpose = 'vacancy' and exists (
         select 1
           from public.principal_asks o
           join public.listing_mandates om on om.id = o.mandate_id
           join public.listing_mandates am on am.id = a.mandate_id
          where o.id <> a.id
            and o.purpose = 'vacancy'
            and om.principal_phone = am.principal_phone
            and (o.sent_at > now() - interval '7 days'
                 or exists (select 1 from public.principal_messages pm
                             where pm.ask_id = o.id and pm.created_at > now() - interval '7 days'))) then
      continue;
    end if;
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

/* ----------------------------------------- 3. the reserved window */

drop function if exists public.refund_agent_check_slot(text, integer);

create or replace function public.refund_agent_check_slot(p_bucket text, p_window_start timestamptz)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_bucket not in ('agent_check_phone_miss', 'agent_check_code_miss') or p_window_start is null then
    return;
  end if;
  update public.rate_limits
     set count = count - 1
   where bucket = p_bucket
     and subject = 'platform'
     and window_start = p_window_start
     and count > 0;
end;
$function$;

revoke all on function public.refund_agent_check_slot(text, timestamptz) from public, anon, authenticated;
grant execute on function public.refund_agent_check_slot(text, timestamptz) to service_role;

/* ------------------------------------------------------- 4. V-91 */

create or replace function private.arrival_evidence_upload_access(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  b public.bookings%rowtype;
begin
  if p_name is null or split_part(p_name, '/', 2) = ''
     or split_part(p_name, '/', 1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  b := private.arrival_check_booking(split_part(p_name, '/', 1)::uuid);
  return b.id is not null
     and now() < upper(private.arrival_window(b.id))
     and not exists (select 1 from public.booking_arrival_checks c where c.booking_id = b.id)
     and (select count(*) from storage.objects o
           where o.bucket_id = 'arrival-evidence'
             and split_part(o.name, '/', 1) = b.id::text) < 6;
end;
$function$;

revoke all on function private.arrival_evidence_upload_access(text) from public, anon;
grant execute on function private.arrival_evidence_upload_access(text) to authenticated;

create or replace function public.answer_arrival_check(
  p_booking uuid,
  p_answer text,
  p_note text default null,
  p_photos text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me uuid := (select auth.uid());
  b public.bookings%rowtype;
  win tstzrange;
  photos text[] := coalesce(p_photos, '{}');
  clean_note text := nullif(left(btrim(coalesce(p_note, '')), 1000), '');
  ref text;
  who text;
  mail text;
begin
  if me is null then
    raise exception 'sign in to answer' using errcode = 'insufficient_privilege';
  end if;
  b := private.arrival_check_booking(p_booking);
  if b.id is null then
    raise exception 'only the guest of a paid stay can answer this' using errcode = 'insufficient_privilege';
  end if;
  if p_answer not in ('as_listed', 'not_as_listed', 'no_access') then
    raise exception 'answer as listed, not as listed, or could not get in' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.booking_arrival_checks c where c.booking_id = b.id) then
    return jsonb_build_object('state', 'already');
  end if;
  win := private.arrival_window(b.id);
  if win is null or not (now() <@ win) then
    raise exception 'the arrival check is open from check-in time until three hours after it' using errcode = 'check_violation';
  end if;

  if p_answer = 'as_listed' then
    photos := '{}';
  else
    photos := array(select distinct p from unnest(photos) p(p) order by p);
    if cardinality(photos) < 1 or cardinality(photos) > 6 then
      raise exception 'add at least one photo, and no more than six' using errcode = 'check_violation';
    end if;
    /* Every photo is an object this guest uploaded for this booking. */
    if exists (
      select 1 from unnest(photos) p(path)
       where split_part(p.path, '/', 1) <> b.id::text
          or not exists (select 1 from storage.objects o
                          where o.bucket_id = 'arrival-evidence' and o.name = p.path
                            and o.owner = me
                            and o.created_at >= lower(win))) then
      raise exception 'a photo is missing or is not yours' using errcode = 'check_violation';
    end if;
  end if;

  if p_answer <> 'as_listed' then
    select coalesce(nullif(btrim(p.first_name), ''), nullif(btrim(p.display_name), ''), 'Guest')
      into who from public.profiles p where p.id = me;
    select u.email into mail from auth.users u where u.id = me;
    for i in 1..5 loop
      ref := 'VAL-SUP-' || lpad((floor(random() * 100000))::integer::text, 5, '0');
      begin
        insert into public.support_tickets (reference, user_id, name, email, topic, body, status)
        values (ref, me, coalesce(who, 'Guest'), coalesce(mail, 'unknown@vallo.invalid'), p_answer,
                case p_answer when 'no_access' then 'Could not get in on arrival. ' else 'Not as listed on arrival. ' end
                || 'Booking ' || b.id::text || ', ' || cardinality(photos)::text || ' photo(s) attached.'
                || coalesce(' Guest''s note: ' || clean_note, ''),
                'open');
        exit;
      exception when unique_violation then
        ref := null;
      end;
    end loop;
  end if;

  begin
    insert into public.booking_arrival_checks (booking_id, guest_id, answer, note, photo_paths, ticket_ref)
    values (b.id, me, p_answer, clean_note, photos, ref);
  exception when unique_violation then
    /* A second answer racing the first: the first stands. The ticket this
       call filed is closed as a duplicate by the unique answer. */
    if ref is not null then
      update public.support_tickets set status = 'closed' where reference = ref;
    end if;
    return jsonb_build_object('state', 'already');
  end;

  if p_answer <> 'as_listed' then
    /* The refund desk's ask, on its own clock, unless the guest already asked. */
    begin
      execute 'insert into public.refund_requests (booking_id, guest_id, reason, note) values ($1, $2, $3, $4) on conflict (booking_id) do nothing'
        using b.id, me, p_answer, clean_note;
    exception when undefined_table then
      null;
    end;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high'::public.alert_severity, 'open'::public.alert_status,
            case p_answer when 'no_access' then 'A guest could not get into a paid stay'
                          else 'A guest says a paid stay is not as listed' end,
            format('Reported inside the arrival window with %s photo(s). Ticket %s. Rule on it before the host is paid.',
                   cardinality(photos), coalesce(ref, 'not filed')),
            'booking', b.id::text);
  end if;

  return jsonb_build_object('state', 'answered', 'answer', p_answer, 'reference', ref);
end;
$function$;

revoke all on function public.answer_arrival_check(uuid, text, text, text[]) from public, anon;
grant execute on function public.answer_arrival_check(uuid, text, text, text[]) to authenticated;

create or replace function private.arrival_report_open(p_booking uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  reported timestamptz;
  ruled boolean := false;
begin
  select c.answered_at into reported
    from public.booking_arrival_checks c
   where c.booking_id = p_booking and c.answer <> 'as_listed';
  if reported is null then
    return false;
  end if;
  begin
    execute 'select exists (select 1 from public.refund_requests r join public.refund_request_decisions d on d.request_id = r.id where r.booking_id = $1 and d.decided_at >= $2)
                 or exists (select 1 from public.booking_refunds f where f.booking_id = $1 and f.created_at >= $2)'
      into ruled using p_booking, reported;
  exception when others then
    ruled := false;
  end;
  return not coalesce(ruled, false);
end;
$function$;

revoke all on function private.arrival_report_open(uuid) from public, anon, authenticated;
grant execute on function private.arrival_report_open(uuid) to service_role;
