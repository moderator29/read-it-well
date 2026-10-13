-- DRAFT, not applied. NOTIFICATIONS 1 of 5 (track/notifications, 13 Oct 2026).
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
-- Additive: one table, one function. No DROP, no DELETE.
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

revoke all on function private.notify_once(text, uuid, public.notification_kind, text, text, text)
  from public, anon, authenticated, service_role;
