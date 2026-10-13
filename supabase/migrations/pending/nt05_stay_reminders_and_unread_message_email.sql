-- DRAFT, not applied. NOTIFICATIONS 5 of 6. Needs nt01. Apply BEFORE the app of
-- track/notifications is deployed: it writes two email templates
-- (stay.review_request, message.unread) that the new code builds.
--
-- GAPS CLOSED, with NO new cron job and no change to PG_CRON_JOBS:
--
--   1. STAY DAYS. A confirmed, paid stay was reminded nowhere: not the evening
--      before, not on the day, not on check-out day, and the host was never
--      told a guest arrives today. Viewings and tables had reminders; stays,
--      the most expensive thing on the platform, had none.
--   2. REVIEW REQUESTS. A finished stay told the guest "Thank you for staying"
--      and never asked how it was; a seated restaurant table was never asked
--      about either, though the review form exists for both. Asked once, the day
--      after check-out (stays) or two hours after being seated (tables), only
--      while no review exists, and only for the last 14 or 7 days so switching
--      this on does not mail history.
--   3. UNREAD MESSAGES BY EMAIL. A message to someone who is away reached the
--      bell and the lock screen only; only the FIRST message of an enquiry ever
--      had an email. A person whose message sat unread for two hours now gets
--      one email per unread run (not per message, not per day), never for the
--      first message of a conversation (that has its own email), never for a
--      call marker or a withdrawn message, and it answers to the Messages switch.
--
-- ONE SWEEP, ALREADY SCHEDULED. private.send_member_reminders() is what the
-- pg_cron job vallo_send_member_reminders (every 15 minutes) already runs for
-- viewings and rent. It now also calls the two new sweeps, each inside its own
-- exception block so a fault in one can never stop the viewing and rent
-- reminders that worked before. The cron count stays at the same number.
--
-- QUIET RULE. A stay reminder or review request is held back before 08:00 and
-- from 21:00 Lagos time, and the evening reminder only starts at 17:00, so
-- nothing is sent in the night. Every notice goes through private.notify_once
-- (nt01), so a sweep that runs every 15 minutes tells each event once.
--
-- Additive: new functions, one CREATE OR REPLACE of the existing sweep (the
-- previous body is kept as its first two lines). Additive only: nothing is removed.
-- Probe: supabase/tests/probes-pending/nt05-stay-reminders-and-unread-message-email.sql
set lock_timeout = '5s';

/* ---- one stay event, told once ------------------------------------------ */

create or replace function private.tell_stay_event(
  p_event text,
  p_booking uuid,
  p_guest uuid,
  p_host uuid,
  p_place text,
  p_guest_name text,
  p_day date,
  p_via_agent boolean
)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  told boolean := false;
  guest_href text := '/bookings/' || p_booking::text;
begin
  if p_event = 'in_eve' then
    told := private.notify_once('stay:' || p_booking::text || ':in_eve', p_guest, 'booking',
      'Check-in tomorrow',
      p_place || ': you check in on ' || to_char(p_day, 'FMDay DD FMMon') || '. Open your booking for the arrival details.',
      guest_href);
  elsif p_event = 'in_day' then
    told := private.notify_once('stay:' || p_booking::text || ':in_day', p_guest, 'booking',
      'Check-in today',
      p_place || ': check-in is today. Open your booking for the arrival details.',
      guest_href);
  elsif p_event = 'host_day' then
    told := private.notify_once('stay:' || p_booking::text || ':host_day', p_host, 'booking',
      'A guest arrives today',
      coalesce(nullif(btrim(p_guest_name), ''), 'Your guest') || ' arrives today at ' || p_place || '.',
      case when p_via_agent then '/agent/bookings' else '/host/bookings' end);
  elsif p_event = 'out_day' then
    told := private.notify_once('stay:' || p_booking::text || ':out_day', p_guest, 'booking',
      'Check-out today',
      p_place || ': today is your check-out day. Open your booking if you need to message the host.',
      guest_href);
  elsif p_event = 'review' then
    told := private.notify_once('stay:' || p_booking::text || ':review', p_guest, 'booking',
      'How was your stay?',
      'Tell other guests what it was like at ' || p_place || '. It takes a minute.',
      guest_href || '/review');
    if told then
      perform private.email_outbox_enqueue(p_guest, 'stay.review_request', 'stay:review:' || p_booking::text,
        jsonb_build_object('booking_id', p_booking, 'place', p_place));
    end if;
  end if;
  return told;
end;
$fn$;

/* ---- the stay and table sweep ------------------------------------------- */

create or replace function private.send_stay_reminders()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  r record;
  sent integer := 0;
  today date := (now() at time zone 'Africa/Lagos')::date;
  hr integer := extract(hour from (now() at time zone 'Africa/Lagos'))::integer;
begin
  /* Nothing in the night. */
  if hr < 8 or hr >= 21 then
    return 0;
  end if;

  /* Paid, confirmed stays arriving tomorrow or today, or leaving today.
     A tenancy move-in is not a stay and is left to its own reminders. */
  for r in
    select b.id, b.guest_id, b.check_in, b.check_out,
           (b.listing_id is not null) as via_agent,
           private.booking_host(b.id) as host,
           private.person_name(b.guest_id) as guest_name,
           coalesce(
             (select l.title from public.listings l where l.id = b.listing_id),
             (select ac.name from public.accommodations ac where ac.id = b.accommodation_id),
             'your stay') as place
      from public.bookings b
     where b.status = 'CONFIRMED'
       and ((b.check_in >= today and b.check_in <= today + 1) or b.check_out = today)
       and exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL')
       and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
  loop
    if r.check_in = today + 1 and hr >= 17 then
      if private.tell_stay_event('in_eve', r.id, r.guest_id, r.host, r.place, r.guest_name, r.check_in, r.via_agent) then
        sent := sent + 1;
      end if;
    end if;
    if r.check_in = today then
      if private.tell_stay_event('in_day', r.id, r.guest_id, r.host, r.place, r.guest_name, r.check_in, r.via_agent) then
        sent := sent + 1;
      end if;
      if private.tell_stay_event('host_day', r.id, r.guest_id, r.host, r.place, r.guest_name, r.check_in, r.via_agent) then
        sent := sent + 1;
      end if;
    end if;
    if r.check_out = today then
      if private.tell_stay_event('out_day', r.id, r.guest_id, r.host, r.place, r.guest_name, r.check_out, r.via_agent) then
        sent := sent + 1;
      end if;
    end if;
  end loop;

  /* Finished stays with no review, from the day after check-out, for 14 days. */
  if hr >= 9 then
    for r in
      select b.id, b.guest_id,
             coalesce(
               (select l.title from public.listings l where l.id = b.listing_id),
               (select ac.name from public.accommodations ac where ac.id = b.accommodation_id),
               'your stay') as place
        from public.bookings b
       where b.status = 'COMPLETED'
         and b.check_out < today and b.check_out >= today - 14
         and not exists (select 1 from public.reviews rv where rv.booking_id = b.id)
         and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
    loop
      if private.tell_stay_event('review', r.id, r.guest_id, null, r.place, null, null, true) then
        sent := sent + 1;
      end if;
    end loop;

    /* Tables the restaurant (or the diner's own code) marked seated, two hours
       on, for 7 days, while no review exists and no dispute is open. */
    for r in
      select rs.reservation_id, rv.guest_id,
             coalesce(
               (select l.title from public.listings l where l.id = rv.listing_id),
               (select bu.name from public.businesses bu where bu.id = rv.business_id),
               'the restaurant') as venue
        from public.reservation_seatings rs
        join public.reservations rv on rv.id = rs.reservation_id
       where rs.outcome = 'SEATED'
         and rs.outcome_at <= now() - interval '2 hours'
         and rs.outcome_at > now() - interval '7 days'
         and not (rs.disputed_at is not null and rs.dispute_resolved_at is null)
         and not exists (select 1 from public.reservation_reviews x where x.reservation_id = rs.reservation_id)
    loop
      if private.notify_once('table:' || r.reservation_id::text || ':review', r.guest_id, 'booking',
           'How was your meal?',
           'Rate your table at ' || r.venue || '. It takes a minute and helps other diners choose.',
           '/bookings?side=stays') then
        sent := sent + 1;
      end if;
    end loop;
  end if;

  return sent;
end;
$fn$;

/* ---- unread messages by email ------------------------------------------- */

create or replace function private.send_unread_message_emails()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  r record;
  sent integer := 0;
  hr integer := extract(hour from (now() at time zone 'Africa/Lagos'))::integer;
begin
  if hr < 8 or hr >= 21 then
    return 0;
  end if;

  for r in
    select u.conversation_id, u.recipient, u.to_agent_side,
           count(*) as unread,
           (array_agg(u.id order by u.created_at))[1] as first_unread,
           (array_agg(u.sender_id order by u.created_at))[1] as sender
      from (
        select m.id, m.conversation_id, m.sender_id, m.created_at,
               case when c.guest_id = m.sender_id then c.agent_id else c.guest_id end as recipient,
               (c.guest_id = m.sender_id and c.context_kind::text <> 'direct') as to_agent_side
          from public.messages m
          join public.conversations c on c.id = m.conversation_id
         where m.read_at is null
           and m.call_id is null
           and m.deleted_for_everyone_at is null
           and m.created_at < now() - interval '2 hours'
           and m.created_at > now() - interval '3 days'
           /* Not the first message of the thread: that one has its own email. */
           and exists (
             select 1 from public.messages p
              where p.conversation_id = m.conversation_id and p.created_at < m.created_at)
      ) u
     group by u.conversation_id, u.recipient, u.to_agent_side
  loop
    if private.email_outbox_enqueue(
         r.recipient, 'message.unread',
         'unread:' || r.conversation_id::text || ':' || r.recipient::text || ':' || r.first_unread::text,
         jsonb_build_object(
           'conversation_id', r.conversation_id, 'count', r.unread, 'sender_id', r.sender,
           'side', case when r.to_agent_side then 'agent' else 'guest' end)) is not null then
      sent := sent + 1;
    end if;
  end loop;

  return sent;
end;
$fn$;

/* ---- the sweep the existing job already runs ----------------------------- */

create or replace function private.send_member_reminders()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  sent integer := 0;
begin
  sent := private.send_viewing_reminders();
  sent := sent + private.send_rent_due_reminders();
  begin
    sent := sent + private.send_stay_reminders();
  exception when others then
    raise warning '[reminders] stay reminders failed: %', sqlstate;
  end;
  begin
    sent := sent + private.send_unread_message_emails();
  exception when others then
    raise warning '[reminders] unread message emails failed: %', sqlstate;
  end;
  return sent;
end;
$fn$;

revoke all on function
  private.tell_stay_event(text, uuid, uuid, uuid, text, text, date, boolean),
  private.send_stay_reminders(),
  private.send_unread_message_emails(),
  private.send_member_reminders()
  from public, anon, authenticated, service_role;
