/*
 * V-91, THE ARRIVAL CHECK HALF: "IS IT AS LISTED?"
 *
 * From check-in time until three hours after it, the guest of a paid stay is
 * asked one question on their booking. "Yes" closes it. "No" is a report with
 * a reason (`not_as_listed` or `no_access`) and at least one photo taken on
 * the spot, because "the flat was not the flat" is argued with photos.
 *
 * A "No":
 *   - files the refund ask on the refund desk (`refund_requests`, reasons
 *     `not_as_listed` and `no_access`, V-24) with its five-business-day clock,
 *     unless the guest had already asked;
 *   - raises a high risk alert against the booking, so it is at the top of
 *     the desk, and files a support ticket with the reason as its topic.
 *
 * THE HOST-PAYOUT HALF IS NOT HERE. Settlement timing belongs to the audit
 * session (MK-63, V-33). `private.arrival_report_open(booking)` is the one
 * question that settlement will need to ask ("is there an arrival report the
 * desk has not ruled on?"), written now so the audit's sweep can call it; this
 * file moves no money and pauses nothing by itself.
 *
 * ORDER. The refund tables are created by a later file (20260924140100), so
 * every function that touches them is PL/pgSQL, resolved when it runs.
 *
 * THE WINDOW. Check-in is the Lagos hour frozen with the stay's cancellation
 * terms (V-20) on the check-in date, else 15:00, the platform schedule's hour.
 * The window is that moment until three hours after it. The database decides;
 * the page only decides what to draw.
 */

/* ------------------------------------------------------------- the window */

create or replace function private.arrival_window(p_booking uuid)
returns tstzrange
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  b public.bookings%rowtype;
  hour integer := 15;
  starts timestamptz;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null then
    return null;
  end if;
  begin
    execute 'select (terms ->> ''check_in_hour'')::integer from public.booking_cancellation_terms where booking_id = $1'
      into hour using p_booking;
  exception when others then
    hour := null;
  end;
  hour := coalesce(hour, 15);
  starts := (b.check_in::timestamp + make_interval(hours => hour)) at time zone 'Africa/Lagos';
  return tstzrange(starts, starts + interval '3 hours', '[)');
end;
$function$;

revoke all on function private.arrival_window(uuid) from public, anon, authenticated;

/* --------------------------------------------------------------- the answer */

create table if not exists public.booking_arrival_checks (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null unique references public.bookings(id) on delete cascade,
  guest_id     uuid not null references auth.users(id) on delete cascade,
  answer       text not null check (answer in ('as_listed', 'not_as_listed', 'no_access')),
  note         text check (note is null or char_length(note) <= 1000),
  photo_paths  text[] not null default '{}' check (cardinality(photo_paths) <= 6),
  ticket_ref   text,
  answered_at  timestamptz not null default now(),
  constraint booking_arrival_checks_report_has_a_photo
    check (answer = 'as_listed' or cardinality(photo_paths) >= 1)
);

comment on table public.booking_arrival_checks is
  'V-91. The guest''s answer to "Is it as listed?" inside the arrival window: as_listed, or a report (not_as_listed, no_access) with at least one photo from the arrival-evidence bucket. One per booking, append-only, written only by answer_arrival_check.';

alter table public.booking_arrival_checks enable row level security;
revoke all on public.booking_arrival_checks from public, anon, authenticated;
grant select on public.booking_arrival_checks to authenticated;
grant all on public.booking_arrival_checks to service_role;

drop policy if exists booking_arrival_checks_read on public.booking_arrival_checks;
create policy booking_arrival_checks_read on public.booking_arrival_checks for select to authenticated
  using (guest_id = (select auth.uid()) or private.is_staff());

create or replace function private.booking_arrival_checks_append_only()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from public.bookings b where b.id = old.booking_id) then
    return old;
  end if;
  raise exception 'public.booking_arrival_checks is append-only' using errcode = '42501';
end;
$function$;

revoke all on function private.booking_arrival_checks_append_only() from public, anon, authenticated;

drop trigger if exists booking_arrival_checks_append_only on public.booking_arrival_checks;
create trigger booking_arrival_checks_append_only
  before update or delete on public.booking_arrival_checks
  for each row execute function private.booking_arrival_checks_append_only();

/* A paid stay (not a rent charge), not cancelled, whose guest is the caller. */
create or replace function private.arrival_check_booking(p_booking uuid)
returns public.bookings
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null or b.guest_id is distinct from (select auth.uid()) then
    return null;
  end if;
  if b.status = 'CANCELLED'::public.booking_status
     or exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
     or not exists (select 1 from public.transactions t
                     where t.booking_id = b.id and t.status = 'SUCCESSFUL'::public.transaction_status) then
    return null;
  end if;
  return b;
end;
$function$;

revoke all on function private.arrival_check_booking(uuid) from public, anon, authenticated;

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
    if cardinality(photos) < 1 or cardinality(photos) > 6 then
      raise exception 'add at least one photo, and no more than six' using errcode = 'check_violation';
    end if;
    /* Every photo is an object this guest uploaded for this booking. */
    if exists (
      select 1 from unnest(photos) p(path)
       where split_part(p.path, '/', 1) <> b.id::text
          or not exists (select 1 from storage.objects o
                          where o.bucket_id = 'arrival-evidence' and o.name = p.path
                            and o.owner = me)) then
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

  insert into public.booking_arrival_checks (booking_id, guest_id, answer, note, photo_paths, ticket_ref)
  values (b.id, me, p_answer, clean_note, photos, ref);

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

/* The guest's page: is the window open, and what did they answer. */
create or replace function public.arrival_check_state(p_booking uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  b public.bookings%rowtype;
  win tstzrange;
  c public.booking_arrival_checks%rowtype;
begin
  b := private.arrival_check_booking(p_booking);
  if b.id is null then
    return jsonb_build_object('state', 'none');
  end if;
  select * into c from public.booking_arrival_checks where booking_id = b.id;
  win := private.arrival_window(b.id);
  if c.id is not null then
    return jsonb_build_object('state', 'answered', 'answer', c.answer, 'answered_at', c.answered_at,
                              'reference', c.ticket_ref);
  end if;
  return jsonb_build_object(
    'state', case when now() <@ win then 'open' when now() < lower(win) then 'before' else 'closed' end,
    'opens_at', lower(win), 'closes_at', upper(win));
end;
$function$;

revoke all on function public.arrival_check_state(uuid) from public, anon;
grant execute on function public.arrival_check_state(uuid) to authenticated;

/* For the audit's settlement sweep: a report the desk has not ruled on. */
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
    execute 'select exists (select 1 from public.refund_requests r join public.refund_request_decisions d on d.request_id = r.id where r.booking_id = $1)
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

/* --------------------------------------------------------------- the photos */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arrival-evidence', 'arrival-evidence', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/* <booking_id>/<file>: the guest of that paid stay, while it is unanswered. */
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
     and not exists (select 1 from public.booking_arrival_checks c where c.booking_id = b.id);
end;
$function$;

revoke all on function private.arrival_evidence_upload_access(text) from public, anon;
grant execute on function private.arrival_evidence_upload_access(text) to authenticated;

drop policy if exists arrival_evidence_insert on storage.objects;
create policy arrival_evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'arrival-evidence' and private.arrival_evidence_upload_access(name));

drop policy if exists arrival_evidence_read on storage.objects;
create policy arrival_evidence_read on storage.objects for select to authenticated
  using (bucket_id = 'arrival-evidence' and (owner = (select auth.uid()) or private.is_staff()));
