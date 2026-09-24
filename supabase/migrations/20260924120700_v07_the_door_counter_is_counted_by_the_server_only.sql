-- V-07, REVIEW FIX: THE DOOR'S OPEN COUNTER IS COUNTED BY THE SERVER ONLY.
--
-- `note_share_door_open` was executable by `anon`, so anybody could call it in
-- a loop and make a door look busier than it is. The number is never shown to
-- anybody as a claim, and it is only ever meant to count a page render, so the
-- right holder of the call is the server that renders the page: the service
-- role, from `lib/share/queries.ts`. No client role may call it now.

revoke all on function public.note_share_door_open(text) from public, anon, authenticated;
grant execute on function public.note_share_door_open(text) to service_role;
