-- DRAFT, not applied. NOTIFICATIONS 1 of 6 (track/notifications, 13 Oct 2026).
-- Apply FIRST: nt02 to nt05 call private.notify_once.
--
-- The one helper every new notice goes through, so a notice is told once.
-- private.notify_once(key, user, kind, title, body, href) claims the key and
-- only then calls the EXISTING private.notify, which still applies the
-- person's Bookings and Messages switches and writes the one row that the push
-- trigger and the WhatsApp trigger already hang off. There is no second
-- notification path: this is a gate in front of the first one.
--
-- WHY A KEY TABLE AND NOT "AN IDENTICAL ROW IN THE LAST DAY". Two bookings for
-- the same place and the same amount on one day have identical words and a
-- different meaning; matching on text would swallow the second. A key such as
-- 'payment:<transaction id>:host' names the event, so the same event is never
-- told twice and two events never collapse into one.
--
-- A muted person still consumes the key: the event was handled, and turning a
-- switch back on must not replay the past.
--
-- ALSO HERE: private.notice_failed(what, entity type, entity id, sqlstate,
-- message), the one place a swallowed notice failure is REPORTED. A trigger on
-- a table that moves money (nt02) may never be the reason a payment fails to
-- record, so it catches its own error; this is what it then does with it: a
-- warning in the database log with the message, and one open medium risk alert
-- per entity so staff see a notice that never went out. It never raises (its
-- own write is caught too), so reporting a failure cannot become the failure.
--
-- Additive only, nothing is removed: one table, two functions.
-- Probe: supabase/tests/probes-pending/nt01-notice-helpers.sql
set lock_timeout = '5s';

create table if not exists private.notice_keys (
  dedupe_key text primary key,
  created_at timestamptz not null default now()
);

comment on table private.notice_keys is
  'NT01: one row per notice already told, by event key (private.notify_once). Not exposed through the API: the private schema is not.';

revoke all on table private.notice_keys from public, anon, authenticated, service_role;

create or replace function private.notify_once(
  p_key text,
  p_user uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_href text
)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  v_new boolean;
begin
  if p_user is null or coalesce(btrim(p_key), '') = '' then
    return false;
  end if;

  insert into private.notice_keys (dedupe_key)
  values (btrim(p_key))
  on conflict (dedupe_key) do nothing
  returning true into v_new;

  /* No row came back: the key was already there, so this event was told. */
  if v_new is not true then
    return false;
  end if;

  perform private.notify(p_user, p_kind, p_title, p_body, p_href);
  return true;
end;
$fn$;

create or replace function private.notice_failed(
  p_what text,
  p_entity_type text,
  p_entity_id text,
  p_state text,
  p_message text
)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  raise warning '[notify] % failed (sqlstate %): %', p_what, coalesce(p_state, '?'), left(coalesce(p_message, ''), 300);
  begin
    if not exists (
      select 1 from public.risk_alerts a
       where a.status = 'open'
         and a.title = 'A notice could not be sent'
         and a.entity_type is not distinct from p_entity_type
         and a.entity_id is not distinct from p_entity_id
    ) then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('medium', 'open', 'A notice could not be sent',
              format('The %s failed (sqlstate %s) and was skipped. The payment or change that caused it was recorded as normal; only the notice is missing. Detail: %s',
                     coalesce(p_what, 'notice'), coalesce(p_state, '?'), left(coalesce(p_message, ''), 300)),
              p_entity_type, p_entity_id);
    end if;
  exception when others then
    raise warning '[notify] could not record the failed notice alert: %', sqlstate;
  end;
end;
$fn$;

revoke all on function
  private.notify_once(text, uuid, public.notification_kind, text, text, text),
  private.notice_failed(text, text, text, text, text)
  from public, anon, authenticated, service_role;
