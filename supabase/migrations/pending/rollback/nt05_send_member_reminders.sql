-- ROLLBACK for nt05: the live private.send_member_reminders(), as read from
-- the database on 13 October 2026 (md5 of pg_get_functiondef
-- bc7265a04a5ca7972807bdc29b406438): viewing reminders and rent-due reminders
-- only. nt05 is the one migration in the notice set that replaces a live
-- function; the other five add new functions and triggers and replace nothing.
--
-- After this runs the cron job vallo_send_member_reminders (unchanged by nt05)
-- no longer calls the stay sweep or the unread message sweep. Those two
-- functions stay in place, unused, and so do the notice keys already told.
set lock_timeout = '5s';

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
  return sent;
end;
$fn$;

revoke all on function private.send_member_reminders() from public, anon, authenticated, service_role;
