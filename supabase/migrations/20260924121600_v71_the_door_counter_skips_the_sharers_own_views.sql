-- V-71, REVIEW FIX: THE DOOR COUNTER DOES NOT COUNT THE SHARER THEMSELVES.
--
-- "Your link has been opened 12 times" overclaimed: the sharer checking their
-- own card, and link unfurlers fetching it, were all counted. The server now
-- skips known link-preview fetchers before it calls this (lib/share/queries),
-- and this function skips a view by the door's own sharer. What remains is
-- page views by other people, and the Status kit says exactly that. Still
-- nothing is recorded about who opened a door: the viewer id is compared and
-- dropped. Service role only, like the one-argument version it replaces.

create or replace function public.note_share_door_open(p_token text, p_viewer uuid)
returns void
language sql
security definer
set search_path to ''
as $function$
  update public.share_links sl
     set opens = sl.opens + 1
   where sl.token = btrim(coalesce(p_token, ''))
     and sl.revoked_at is null
     and (p_viewer is null or sl.created_by is distinct from p_viewer);
$function$;

comment on function public.note_share_door_open(text, uuid) is
  'V-07 and V-71. A bare counter on the door: one page view, not counted when the viewer is the sharer. The viewer is compared and never stored. Service role only.';

drop function if exists public.note_share_door_open(text);

revoke all on function public.note_share_door_open(text, uuid) from public, anon, authenticated;
grant execute on function public.note_share_door_open(text, uuid) to service_role;
