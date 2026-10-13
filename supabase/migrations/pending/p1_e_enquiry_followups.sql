-- DRAFT, not applied. Batch 1, AGENT-01.
-- A lister sets "follow up on <date>" on an enquiry thread, beside the stage
-- they already set (public.set_enquiry_stage, V-72). On that morning, from
-- 08:00 Lagos, they get one notification that opens the thread. Clearing sets
-- due_on to null (no DELETE, so the connector does not freeze).
-- Ownership check copied from the live public.set_enquiry_stage.
-- After applying: add the job to PG_CRON_JOBS and docs/ADMIN_CONSOLE.md (lead).
set lock_timeout = '5s';

create table if not exists public.enquiry_followups (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  due_on          date,
  note            text check (note is null or char_length(note) <= 200),
  set_by          uuid references auth.users (id) on delete set null,
  set_at          timestamptz not null default now(),
  reminded_on     date
);
alter table public.enquiry_followups enable row level security;
revoke all on public.enquiry_followups from public, anon, authenticated;
grant select on public.enquiry_followups to authenticated;
grant all on public.enquiry_followups to service_role;

create policy enquiry_followups_lister_reads on public.enquiry_followups
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
     where c.id = enquiry_followups.conversation_id
       and c.agent_id = (select auth.uid())
  ));

create or replace function public.set_enquiry_followup(p_conversation uuid, p_due date, p_note text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  caller uuid := (select auth.uid());
  today  date := (now() at time zone 'Africa/Lagos')::date;
begin
  if caller is null then
    raise exception 'sign in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.conversations c
     where c.id = p_conversation and c.agent_id = caller and c.context_kind = 'listing'::public.thread_context
  ) then
    raise exception 'not your enquiry' using errcode = '42501';
  end if;
  if p_due is not null and (p_due < today or p_due > today + 365) then
    raise exception 'a follow-up date is from today to a year ahead' using errcode = '22023';
  end if;
  if p_note is not null and char_length(btrim(p_note)) > 200 then
    raise exception 'a follow-up note is at most 200 characters' using errcode = '22023';
  end if;

  insert into public.enquiry_followups (conversation_id, due_on, note, set_by, set_at, reminded_on)
  values (p_conversation, p_due, nullif(btrim(p_note), ''), caller, now(), null)
  on conflict (conversation_id) do update
    set due_on = excluded.due_on,
        note = excluded.note,
        set_by = excluded.set_by,
        set_at = excluded.set_at,
        reminded_on = null;
end;
$fn$;

revoke all on function public.set_enquiry_followup(uuid, date, text) from public, anon;
grant execute on function public.set_enquiry_followup(uuid, date, text) to authenticated;

create or replace function private.send_followup_reminders()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  r     record;
  sent  integer := 0;
  lagos timestamp := now() at time zone 'Africa/Lagos';
begin
  if lagos::time < time '08:00' then
    return 0;
  end if;
  for r in
    select f.conversation_id, f.due_on, c.agent_id,
           coalesce(nullif(l.area, ''), l.city, 'your listing') as place
      from public.enquiry_followups f
      join public.conversations c on c.id = f.conversation_id
      left join public.listings l on l.id = c.listing_id
      left join public.enquiry_stages s on s.conversation_id = f.conversation_id
     where f.due_on is not null
       and f.due_on <= lagos::date
       and f.reminded_on is distinct from f.due_on
       and coalesce(s.stage, 'new') not in ('let', 'lost')
     limit 1000
  loop
    update public.enquiry_followups
       set reminded_on = r.due_on
     where conversation_id = r.conversation_id
       and reminded_on is distinct from r.due_on;
    if found then
      perform private.notify(r.agent_id, 'agent'::public.notification_kind,
        'Follow up today',
        'You planned to follow up today on an enquiry about ' || r.place || '.',
        '/agent/messages/' || r.conversation_id::text);
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$fn$;

revoke all on function private.send_followup_reminders() from public, anon, authenticated;

select cron.schedule(
  'vallo_send_followup_reminders',
  '13 7,8,9,10,11,12 * * *',
  $cron$select private.send_followup_reminders();$cron$
);
