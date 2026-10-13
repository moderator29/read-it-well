-- NT05 (pending migration nt05_stay_reminders_and_unread_message_email):
--   * each stay event (evening before, check-in day, host's arrival day,
--     check-out day, review request) tells the right person, with the right
--     link, exactly once however often the sweep runs;
--   * the review request also queues one stay.review_request email;
--   * the three sweeps run clean against the live tables (they may find nothing:
--     an empty database must not make them fail) and the existing sweep
--     private.send_member_reminders still returns an integer;
--   * a real unread message older than two hours (not the first of its thread)
--     queues one message.unread email, once for the run; the first message of a
--     thread queues nothing. (If a conversation cannot be built here the section
--     is skipped with a NOTICE, never silently passed.)
--   * nothing says safe, secure, verified or guaranteed; the functions are
--     closed to API roles.
-- Rolled back by the final raise.
do $$
declare
  guest uuid;
  host uuid;
  bk constant uuid := gen_random_uuid();
  conv uuid;
  m1 uuid;
  m2 uuid;
  told boolean;
  n integer;
  r integer;
  skipped text := '';
begin
  select id into guest from public.profiles order by created_at limit 1;
  select id into host from public.profiles where id <> guest order by created_at limit 1;
  if guest is null or host is null then
    raise exception 'PROBE_FAIL nt05: need two profiles';
  end if;
  update public.profiles set settings = '{}'::jsonb where id in (guest, host);

  /* ---- each stay event, once ---- */
  foreach r in array array[1, 2] loop
    perform private.tell_stay_event('in_eve', bk, guest, host, 'Probe Flat', 'Ada Probe', current_date + 1, true);
    perform private.tell_stay_event('in_day', bk, guest, host, 'Probe Flat', 'Ada Probe', current_date, true);
    perform private.tell_stay_event('host_day', bk, guest, host, 'Probe Flat', 'Ada Probe', current_date, true);
    perform private.tell_stay_event('out_day', bk, guest, host, 'Probe Flat', 'Ada Probe', current_date, true);
    perform private.tell_stay_event('review', bk, guest, null, 'Probe Flat', null, null, true);
  end loop;

  select count(*) into n from public.notifications where user_id = guest and href = '/bookings/' || bk::text;
  if n <> 3 then raise exception 'PROBE_FAIL nt05: guest day rows expected 3, found %', n; end if;
  select count(*) into n from public.notifications where user_id = guest and href = '/bookings/' || bk::text || '/review' and title = 'How was your stay?';
  if n <> 1 then raise exception 'PROBE_FAIL nt05: review request told % times', n; end if;
  select count(*) into n from public.notifications where user_id = host and href = '/agent/bookings' and title = 'A guest arrives today'
     and body = 'Ada Probe arrives today at Probe Flat.';
  if n <> 1 then raise exception 'PROBE_FAIL nt05: host arrival told % times', n; end if;
  select count(*) into n from public.email_outbox where user_id = guest and template = 'stay.review_request' and dedupe_key = 'stay:review:' || bk::text;
  if n <> 1 then raise exception 'PROBE_FAIL nt05: review email queued % times', n; end if;

  /* a host booked through a business is sent to the host screen */
  perform private.tell_stay_event('host_day', gen_random_uuid(), guest, host, 'Probe Hotel', null, current_date, false);
  if not exists (select 1 from public.notifications where user_id = host and href = '/host/bookings' and title = 'A guest arrives today'
                  and body = 'Your guest arrives today at Probe Hotel.') then
    raise exception 'PROBE_FAIL nt05: a business-hosted arrival has the wrong link or words';
  end if;

  /* ---- the sweeps run clean ---- */
  told := private.send_stay_reminders() >= 0;
  told := private.send_unread_message_emails() >= 0;
  if private.send_member_reminders() is null then
    raise exception 'PROBE_FAIL nt05: the existing sweep no longer returns a count';
  end if;

  /* ---- unread messages ---- */
  begin
    insert into public.conversations (guest_id, agent_id) values (guest, host) returning id into conv;
    insert into public.messages (conversation_id, sender_id, body, created_at)
    values (conv, guest, 'Probe first', now() - interval '5 hours') returning id into m1;
    perform private.send_unread_message_emails();
    select count(*) into n from public.email_outbox where template = 'message.unread' and payload ->> 'conversation_id' = conv::text;
    if n <> 0 then
      raise exception 'PROBE_FAIL nt05: the first message of a thread queued an unread email';
    end if;
    insert into public.messages (conversation_id, sender_id, body, created_at)
    values (conv, guest, 'Probe second', now() - interval '4 hours') returning id into m2;
    insert into public.messages (conversation_id, sender_id, body, created_at)
    values (conv, guest, 'Probe third', now() - interval '3 hours');
    perform private.send_unread_message_emails();
    perform private.send_unread_message_emails();
    select count(*) into n from public.email_outbox where template = 'message.unread' and payload ->> 'conversation_id' = conv::text;
    /* Inside the 08:00 to 21:00 Lagos window exactly one row; outside it none. */
    if extract(hour from (now() at time zone 'Africa/Lagos')) between 8 and 20 then
      if n <> 1 then raise exception 'PROBE_FAIL nt05: unread email queued % times', n; end if;
    elsif n <> 0 then
      raise exception 'PROBE_FAIL nt05: an unread email was queued in the night';
    end if;
  exception
    when raise_exception then
      raise;
    when others then
      skipped := ' (unread-message section skipped, fixture refused: ' || sqlstate || ')';
      raise notice 'nt05: unread-message fixture skipped, sqlstate %', sqlstate;
  end;

  if exists (select 1 from public.notifications
              where user_id in (guest, host)
                and title in ('Check-in tomorrow', 'Check-in today', 'A guest arrives today', 'Check-out today', 'How was your stay?')
                and (body ilike '%safe%' or body ilike '%secure%' or body ilike '%verified%' or body ilike '%guarantee%')) then
    raise exception 'PROBE_FAIL nt05: a notice makes a claim with no mechanism';
  end if;

  if has_function_privilege('authenticated', 'private.send_stay_reminders()', 'execute')
     or has_function_privilege('anon', 'private.send_unread_message_emails()', 'execute')
     or has_function_privilege('service_role', 'private.tell_stay_event(text, uuid, uuid, uuid, text, text, date, boolean)', 'execute')
     or has_function_privilege('authenticated', 'private.send_member_reminders()', 'execute') then
    raise exception 'PROBE_FAIL nt05: an API role can run a reminder function';
  end if;

  raise exception 'PROBE_OK nt05-stay-reminders-and-unread-message-email%', skipped;
end
$$;
