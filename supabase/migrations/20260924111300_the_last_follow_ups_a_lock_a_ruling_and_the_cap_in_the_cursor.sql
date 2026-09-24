/*
 * THE LAST FOLLOW-UPS FROM THE FOURTH REVIEW.
 *
 * 1. `answer_arrival_check` takes a transaction advisory lock on the booking
 *    before it files anything, so two answers racing each other queue up and
 *    the loser reads "already" without having filed a ticket.
 * 2. The desk's ruling is recorded on the arrival check itself (`ruled_at`,
 *    `ruled_by`, `ruling`), through the staff-only `rule_arrival_check`, so an
 *    arrival report can be declined even when an older refund request on the
 *    booking was already decided. `arrival_report_open` reads it first.
 * 3. A photo can be uploaded only inside the arrival window.
 * 4. The weekly cap is applied inside the cursor query, so questions that
 *    would be skipped do not use up the run's limit.
 */

/* ------------------------------------------------ 2. the ruling */

alter table public.booking_arrival_checks
  add column if not exists ruled_at timestamptz,
  add column if not exists ruled_by uuid references auth.users(id) on delete set null,
  add column if not exists ruling text check (ruling is null or ruling in ('upheld', 'declined'));

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.booking_arrival_checks'::regclass
                  and conname = 'booking_arrival_checks_ruling_is_whole') then
    alter table public.booking_arrival_checks
      add constraint booking_arrival_checks_ruling_is_whole
      check ((ruled_at is null) = (ruling is null) and (ruled_at is null) = (ruled_by is null));
  end if;
end $$;

/* Append-only, except that a report may be ruled on once. */
create or replace function private.booking_arrival_checks_append_only()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.bookings b where b.id = old.booking_id) then
      return old;
    end if;
  elsif old.ruled_at is null and new.ruled_at is not null
        and old.answer <> 'as_listed'
        and (new.id, new.booking_id, new.guest_id, new.answer, new.note, new.photo_paths, new.ticket_ref, new.answered_at)
            is not distinct from
            (old.id, old.booking_id, old.guest_id, old.answer, old.note, old.photo_paths, old.ticket_ref, old.answered_at) then
    return new;
  end if;
  raise exception 'public.booking_arrival_checks is append-only; a report is ruled on once' using errcode = '42501';
end;
$function$;

revoke all on function private.booking_arrival_checks_append_only() from public, anon, authenticated;

create or replace function public.rule_arrival_check(p_booking uuid, p_ruling text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n integer;
begin
  if not private.is_staff() then
    raise exception 'only staff rule on an arrival report' using errcode = 'insufficient_privilege';
  end if;
  if p_ruling not in ('upheld', 'declined') then
    raise exception 'uphold or decline' using errcode = 'check_violation';
  end if;
  update public.booking_arrival_checks
     set ruled_at = now(), ruled_by = (select auth.uid()), ruling = p_ruling
   where booking_id = p_booking and answer <> 'as_listed' and ruled_at is null;
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('state', 'none');
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'arrival_check.rule', 'booking', p_booking::text, jsonb_build_object('ruling', p_ruling));
  return jsonb_build_object('state', 'ruled', 'ruling', p_ruling);
end;
$function$;

revoke all on function public.rule_arrival_check(uuid, text) from public, anon;
grant execute on function public.rule_arrival_check(uuid, text) to authenticated;

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
   where c.booking_id = p_booking and c.answer <> 'as_listed' and c.ruled_at is null;
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

/* ------------------------------------------------ 1. the lock */

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
  /* One answer at a time per booking: a racing second answer waits here,
     then reads "already" below, before it has filed anything. */
  perform pg_advisory_xact_lock(hashtext('arrival_check:' || b.id::text));
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

/* ------------------------------------------ 3. inside the window */

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
     and now() <@ private.arrival_window(b.id)
     and not exists (select 1 from public.booking_arrival_checks c where c.booking_id = b.id)
     and (select count(*) from storage.objects o
           where o.bucket_id = 'arrival-evidence'
             and split_part(o.name, '/', 1) = b.id::text) < 6;
end;
$function$;

revoke all on function private.arrival_evidence_upload_access(text) from public, anon;
grant execute on function private.arrival_evidence_upload_access(text) to authenticated;

/* ------------------------------- 4. the weekly limit in the cursor */

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
       /* THE WEEKLY LIMIT, IN THE CURSOR: a vacancy question whose number was
          already asked this week is not selected, so it cannot use up the
          run's limit ahead of questions that can go. */
       and not (q.purpose = 'vacancy' and exists (
             select 1
               from public.principal_asks o
               join public.listing_mandates om on om.id = o.mandate_id
               join public.listing_mandates qm on qm.id = q.mandate_id
              where o.id <> q.id
                and o.purpose = 'vacancy'
                and om.principal_phone = qm.principal_phone
                and (o.sent_at > now() - interval '7 days'
                     or exists (select 1 from public.principal_messages pm
                                 where pm.ask_id = o.id and pm.created_at > now() - interval '7 days'))))
     order by q.created_at
     limit greatest(1, least(coalesce(p_limit, 50), 200))
     for update skip locked
  loop
    /* THE WEEKLY LIMIT, AT SEND TIME: one vacancy question per principal
       number per seven days, counting any sent earlier in this same run. */
    /* Re-checked per row: an earlier row in this same run may have just
       been sent to the same number. */
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
