-- HOST C3: A HOST IS REMINDED BEFORE A REQUEST LAPSES (30 September 2026).
-- Applied 30 September 2026 with the founder's approval. Idempotent,
-- additive: one internal table, one function, one pg_cron job. No booking,
-- reservation, payment or policy is changed.
--
-- WHY. A room request lapses 48 hours after it is made
-- (`private.expire_booking_holds`, HOLD_WINDOW_HOURS in the app), and a
-- table request is moot once its time has passed. The host was told when a
-- request arrived and never again, so a request could lapse in silence.
--
-- WHAT. Every fifteen minutes `private.remind_hosts_to_decide()` finds each
-- PENDING request that has used three quarters of its window and not yet been
-- reminded, and writes ONE in-app notification to its host (push follows from
-- the notifications row, through the existing push queue). A reminder is
-- recorded in `public.decide_reminders` so it is never sent twice.
--
--   room request   window = created_at to created_at + 48 hours;
--                  reminded from created_at + 36 hours.
--   table request  window = created_at to reserved_for; reminded from the
--                  three-quarter mark, and only when the window is at least
--                  two hours (a request made for the next hour needs no
--                  reminder, it needs an answer, and the host was just told).
--
-- The notification opens `/host/decide`, the host's one decide-by list.
-- The host of a room is the business owner (`private.booking_host`); the host
-- of a table is the business owner or the listing's agent.
-- Honours the host's own "bookings" notification preference (private.notify).

create table if not exists public.decide_reminders (
  kind        text not null,
  subject_id  uuid not null,
  sent_at     timestamptz not null default now(),
  primary key (kind, subject_id),
  constraint decide_reminders_kind_chk check (kind in ('room_request', 'table_request'))
);
alter table public.decide_reminders enable row level security;
revoke all on public.decide_reminders from anon, authenticated;
-- No policy: only the definer function below reads or writes it.

create or replace function private.remind_hosts_to_decide()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  r      record;
  sent   integer := 0;
begin
  -- Room requests at three quarters of the 48-hour hold.
  for r in
    select b.id, private.booking_host(b.id) as host, b.created_at + interval '48 hours' as lapses_at,
           coalesce(ac.name, 'your hotel') as place
      from public.bookings b
      left join public.accommodations ac on ac.id = b.accommodation_id
     where b.status = 'PENDING'
       and b.accommodation_id is not null
       and b.created_at <= now() - interval '36 hours'
       and b.created_at > now() - interval '48 hours'
       and not exists (select 1 from public.decide_reminders d where d.kind = 'room_request' and d.subject_id = b.id)
     limit 500
  loop
    insert into public.decide_reminders (kind, subject_id) values ('room_request', r.id) on conflict do nothing;
    continue when not found;
    perform private.notify(r.host, 'booking'::public.notification_kind,
      'A room request lapses soon',
      'A guest''s request for a room at ' || r.place || ' lapses at ' ||
        to_char(r.lapses_at at time zone 'Africa/Lagos', 'HH24:MI "on" Dy DD Mon') ||
        ' if nobody answers. Accept or decline it before then.',
      '/host/decide');
    sent := sent + 1;
  end loop;

  -- Table requests at three quarters of the time until the table.
  for r in
    select rv.id, rv.reserved_for,
           coalesce(bu.owner_id, (select a.user_id from public.listings l join public.agents a on a.id = l.agent_id where l.id = rv.listing_id)) as host,
           coalesce(bu.name, (select l.title from public.listings l where l.id = rv.listing_id), 'your venue') as place
      from public.reservations rv
      left join public.businesses bu on bu.id = rv.business_id
     where rv.status = 'PENDING'
       and rv.reserved_for > now()
       and rv.reserved_for - rv.created_at >= interval '2 hours'
       and now() >= rv.created_at + (rv.reserved_for - rv.created_at) * 0.75
       and not exists (select 1 from public.decide_reminders d where d.kind = 'table_request' and d.subject_id = rv.id)
     limit 500
  loop
    insert into public.decide_reminders (kind, subject_id) values ('table_request', r.id) on conflict do nothing;
    continue when not found;
    perform private.notify(r.host, 'booking'::public.notification_kind,
      'A table request is still waiting',
      'A table at ' || r.place || ' for ' ||
        to_char(r.reserved_for at time zone 'Africa/Lagos', 'HH24:MI "on" Dy DD Mon') ||
        ' is waiting for your answer.',
      '/host/decide');
    sent := sent + 1;
  end loop;

  -- A reminder older than a month is about a request long decided.
  delete from public.decide_reminders where sent_at < now() - interval '35 days';
  return sent;
end;
$function$;
revoke all on function private.remind_hosts_to_decide() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'vallo_remind_hosts_to_decide') then
      perform cron.unschedule('vallo_remind_hosts_to_decide');
    end if;
    perform cron.schedule('vallo_remind_hosts_to_decide', '4,19,34,49 * * * *', 'select private.remind_hosts_to_decide();');
  end if;
end $$;

-- ------------------------------------------------------------ read-back
do $$
begin
  if to_regclass('public.decide_reminders') is null then
    raise exception 'host c3: decide_reminders is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.decide_reminders'::regclass) then
    raise exception 'host c3: row level security is off on decide_reminders';
  end if;
  if to_regprocedure('private.remind_hosts_to_decide()') is null then
    raise exception 'host c3: private.remind_hosts_to_decide is missing';
  end if;
  if has_function_privilege('authenticated', 'private.remind_hosts_to_decide()', 'execute') then
    raise exception 'host c3: the reminder sweep is open to members';
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'vallo_remind_hosts_to_decide') then
      raise exception 'host c3: the reminder job is not scheduled';
    end if;
  end if;
end $$;
