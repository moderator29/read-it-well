-- SEC-5. A person could not see where they were signed in and could not end a
-- session they did not recognise. On an account that holds a wallet that is not
-- a convenience: a lost phone is recoverable by its owner or by a support
-- ticket, and a support ticket is a stranger deciding whether to believe you.
--
-- Supabase already keeps the list. auth.sessions has one row per signed-in
-- device with created_at, refreshed_at and the user agent and IP of whoever
-- last refreshed it. There is no client API that reads it: supabase-js can sign
-- out with scope 'others' or 'global' and cannot enumerate, so the list has to
-- come from the database. auth is not on PostgREST's search path and must not
-- be, so these three functions are the whole door.
--
-- WHY SECURITY DEFINER, AND WHY THIS IS NOT THE SHAPE THAT WENT WRONG BEFORE.
-- This project shipped grant_staff_role once: a definer function that took a
-- uuid, authorised off ITS OWN ARGUMENT, and was granted to authenticated, so
-- any signed-in user could name a super admin and become one. The dangerous
-- part was never the definer rights, it was authorising off the argument.
--
-- These three authorise off auth.uid() and nothing else. my_sessions and
-- end_other_sessions take no argument at all. end_session takes one, and that
-- argument can only NARROW what auth.uid() already permits: the delete carries
-- `and user_id = auth.uid()` in the same statement, so naming somebody else's
-- session deletes zero rows and is reported as not_found. There is no argument
-- that widens the caller's authority, which is the property to check before
-- writing another one of these.
--
-- ANON GETS NOTHING. Execute is revoked from public and granted to
-- authenticated only. auth.uid() is null for anon so the answers would be empty
-- anyway, but a function on the REST surface is a name an attacker enumerates
-- and a reviewer has to account for, which is the lesson from
-- 20260809082855_a_trigger_function_is_not_an_api_endpoint.
--
-- READ THE NEXT MIGRATION BEFORE COPYING THE GRANT BLOCK AT THE BOTTOM OF THIS
-- ONE. `revoke all from public` did NOT close these to anon, and
-- 20260809094339 says why.

-- ---------------------------------------------------------------- the list

create or replace function public.my_sessions()
returns table (
  session_id uuid,
  is_current boolean,
  signed_in_at timestamptz,
  last_seen_at timestamptz,
  user_agent text,
  aal text
)
language sql
stable
security definer
set search_path to ''
as $function$
  select
    s.id,
    -- The access token carries the session it was minted for, so "this device"
    -- is a fact rather than a guess about which row is nearest in time. Without
    -- it, end-everything-else has to be told which one to keep by the browser,
    -- and a browser is not a source of authority about that.
    s.id is not distinct from nullif(((select auth.jwt()) ->> 'session_id'), '')::uuid,
    s.created_at,
    -- refreshed_at is `timestamp without time zone` holding UTC, and updated_at
    -- is timestamptz. Comparing them without the conversion silently reads the
    -- naive one in the server's zone, which on a Lagos-facing product is an
    -- hour of drift in the one number the screen is for.
    greatest(s.updated_at, s.refreshed_at at time zone 'UTC'),
    s.user_agent,
    s.aal::text
  from auth.sessions s
  where s.user_id = (select auth.uid())
  order by 2 desc, 4 desc nulls last;
$function$;

comment on function public.my_sessions() is
  'The caller''s own auth.sessions rows. No argument, authorises off auth.uid(). Deliberately does NOT return auth.sessions.ip: the token is refreshed by our own middleware, so the recorded address is the server''s and any location drawn from it would be a lie about where the reader is.';

-- ------------------------------------------------------------ end one device

create or replace function public.end_session(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  current_session uuid := nullif(((select auth.jwt()) ->> 'session_id'), '')::uuid;
  removed integer;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- The ownership check is IN the delete, not before it. A check that reads the
  -- row first and deletes second is a race, and the racing window is exactly
  -- the moment somebody is trying to throw an attacker off their account.
  delete from auth.sessions s
   where s.id = p_session
     and s.user_id = actor;
  get diagnostics removed = row_count;

  -- A session that is not the caller's and a session that does not exist give
  -- the same answer on purpose. Distinguishing them turns this into an oracle
  -- for whether a given session id is live.
  if removed = 0 then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'was_current', p_session is not distinct from current_session
  );
end;
$function$;

comment on function public.end_session(uuid) is
  'Delete one of the caller''s own sessions. The argument narrows, it never widens: the delete carries user_id = auth.uid(). refresh_tokens cascade, so the device cannot mint another access token; the one it already holds stays valid until it expires.';

-- --------------------------------------------------------- end every other

create or replace function public.end_other_sessions()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  current_session uuid := nullif(((select auth.jwt()) ->> 'session_id'), '')::uuid;
  removed integer;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- `is distinct from` rather than `<>`, because a null current_session must
  -- not make the predicate null and quietly spare every row. A caller whose
  -- token carries no session claim wants everything gone, and gets it.
  delete from auth.sessions s
   where s.user_id = actor
     and s.id is distinct from current_session;
  get diagnostics removed = row_count;

  return jsonb_build_object('status', 'ok', 'ended', removed);
end;
$function$;

comment on function public.end_other_sessions() is
  'Delete every session the caller holds except the one the calling token was minted for. No argument. Same cascade and the same access-token caveat as end_session.';

-- ------------------------------------------------------------------ grants

revoke all on function public.my_sessions() from public;
revoke all on function public.end_session(uuid) from public;
revoke all on function public.end_other_sessions() from public;

grant execute on function public.my_sessions() to authenticated;
grant execute on function public.end_session(uuid) to authenticated;
grant execute on function public.end_other_sessions() to authenticated;
