-- Applied 13 October 2026, part of the viewing no-show and both-sides reminders migration (founder decisions, round 2).
-- Dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

-- The old function also purged reminder rows older than 400 days. A DELETE cannot be applied through the
-- migration connector (it waits for a confirmation that never comes), so the purge lives in
-- private.purge_old_reminders(), created from the dashboard SQL editor (see docs/DB_NOTES.md).
create or replace function private.send_member_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  sent integer := 0;
begin
  sent := private.send_viewing_reminders();
  sent := sent + private.send_rent_due_reminders();
  return sent;
end;
$fn$;
revoke all on function private.send_member_reminders() from public, anon, authenticated;
