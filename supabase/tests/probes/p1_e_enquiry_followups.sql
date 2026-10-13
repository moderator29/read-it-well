-- AGENT-01 (13 October 2026): a lister's follow-up date on an enquiry thread.
-- Needs supabase/migrations/20261013111606_enquiry_followups.sql applied. The
-- whole probe rolls back (PROBE_OK is raised at the end).
--
--  * the thread's lister sets a date and a note, and reads them back;
--  * the other party to the thread cannot read the follow-up or set one;
--  * a past date and a date more than a year ahead are refused (22023);
--  * clearing sets due_on to null and drops the note, without a DELETE;
--  * the reminder job says nothing for a date that is not today, and nothing
--    for a thread marked Lost by hand, whatever the hour.
do $$
declare
  lister constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  guest  constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  conv uuid;
  today date := (now() at time zone 'Africa/Lagos')::date;
  r record; n int;
begin
  insert into public.conversations (guest_id, agent_id, context_kind)
  values (guest, lister, 'listing'::public.thread_context) returning id into conv;

  -- the lister
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);

  perform public.set_enquiry_followup(conv, today + 3, '  Ring about the lease  ');
  select * into r from public.enquiry_followups where conversation_id = conv;
  if r.due_on is distinct from today + 3 or r.note is distinct from 'Ring about the lease' then
    raise exception 'PROBE_FAIL p1_e_enquiry_followups: the lister did not read back what they set (%, %)', r.due_on, r.note;
  end if;

  begin
    perform public.set_enquiry_followup(conv, today - 1, null);
    raise exception 'PROBE_FAIL p1_e_enquiry_followups: a past date was accepted';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.set_enquiry_followup(conv, today + 400, null);
    raise exception 'PROBE_FAIL p1_e_enquiry_followups: a date over a year ahead was accepted';
  exception when sqlstate '22023' then null; end;

  -- the other party to the thread
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  select count(*) into n from public.enquiry_followups where conversation_id = conv;
  if n <> 0 then
    raise exception 'PROBE_FAIL p1_e_enquiry_followups: the renter can read the lister''s follow-up';
  end if;
  begin
    perform public.set_enquiry_followup(conv, today + 1, null);
    raise exception 'PROBE_FAIL p1_e_enquiry_followups: the renter set a follow-up';
  exception when sqlstate '42501' then null; end;

  -- clearing, without a DELETE
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  perform public.set_enquiry_followup(conv, null, 'left over note');
  select * into r from public.enquiry_followups where conversation_id = conv;
  if r.due_on is not null or r.note is not null then
    raise exception 'PROBE_FAIL p1_e_enquiry_followups: clearing left a date or a note (%, %)', r.due_on, r.note;
  end if;

  -- the reminder job, as the function's owner
  reset role;
  perform public.set_enquiry_followup(conv, today + 3, null);
  select private.send_followup_reminders() into n;
  if exists (select 1 from public.notifications where user_id = lister and href = '/agent/messages/' || conv::text) then
    raise exception 'PROBE_FAIL p1_e_enquiry_followups: a reminder went out for a date that is not today';
  end if;

  insert into public.enquiry_stages (conversation_id, stage, lost_reason, set_by)
  values (conv, 'lost', 'price', lister);
  update public.enquiry_followups set due_on = today, reminded_on = null where conversation_id = conv;
  select private.send_followup_reminders() into n;
  if exists (select 1 from public.notifications where user_id = lister and href = '/agent/messages/' || conv::text) then
    raise exception 'PROBE_FAIL p1_e_enquiry_followups: a reminder went out for a thread marked Lost';
  end if;

  raise exception 'PROBE_OK p1_e_enquiry_followups';
end;
$$;
