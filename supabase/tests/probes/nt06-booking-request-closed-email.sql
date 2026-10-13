-- NT06 (pending migration nt06_booking_request_closed_email): a booking request
-- closed by anybody but the guest queues exactly one email to the guest.
--   * the helper queues one booking.request_closed row, once per booking;
--   * the trigger exists on public.bookings for status updates and is closed to
--     every API role;
--   * the trigger's rule is read back from its own source: it names PENDING to
--     CANCELLED, excludes the guest as the actor (auth.uid()), and excludes a
--     rent charge and a paid booking.
-- (A full booking fixture needs the whole stay stack; the first live decline
-- is the end-to-end proof.) Rolled back by the final raise.
do $$
declare
  guest uuid;
  bk constant uuid := gen_random_uuid();
  first_call boolean;
  second_call boolean;
  n integer;
  src text;
begin
  select id into guest from public.profiles order by created_at limit 1;
  if guest is null then
    raise exception 'PROBE_FAIL nt06: no profile';
  end if;

  first_call := private.tell_booking_request_closed(bk, guest, 'Probe Flat', current_date + 5, current_date + 7);
  second_call := private.tell_booking_request_closed(bk, guest, 'Probe Flat', current_date + 5, current_date + 7);
  if first_call is not true or second_call is not false then
    raise exception 'PROBE_FAIL nt06: queued % then % (expected true then false)', first_call, second_call;
  end if;
  select count(*) into n from public.email_outbox
   where user_id = guest and template = 'booking.request_closed' and dedupe_key = 'booking:' || bk::text || ':request_closed';
  if n <> 1 then raise exception 'PROBE_FAIL nt06: % rows queued', n; end if;

  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.bookings'::regclass and t.tgname = 'bookings_zz_notify_request_closed'
                  and not t.tgisinternal and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt06: the trigger is missing or not on update';
  end if;

  select prosrc into src from pg_proc where oid = 'private.notify_booking_request_closed()'::regprocedure;
  if src not like '%PENDING%' or src not like '%CANCELLED%' or src not like '%auth.uid()%'
     or src not like '%rent_payments%' or src not like '%SUCCESSFUL%' then
    raise exception 'PROBE_FAIL nt06: the trigger source lost one of its guards';
  end if;

  if has_function_privilege('authenticated', 'private.tell_booking_request_closed(uuid, uuid, text, date, date)', 'execute')
     or has_function_privilege('anon', 'private.notify_booking_request_closed()', 'execute')
     or has_function_privilege('service_role', 'private.notify_booking_request_closed()', 'execute') then
    raise exception 'PROBE_FAIL nt06: an API role can run a notice function';
  end if;

  raise exception 'PROBE_OK nt06-booking-request-closed-email';
end
$$;
