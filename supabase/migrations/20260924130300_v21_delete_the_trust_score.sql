-- V-21, DELETE THE 0 TO 100 TRUST SCORE.
--
-- APPLY AFTER THE CODE THAT STOPS READING `trust_score` IS LIVE. The previous
-- reader did `Number(row.trust_score)`, which is NaN once the column is gone,
-- and it then hides the whole agent band. The new reader never reads it, so
-- code first, then this file, loses nothing.
--
-- `public.agent_trust(uuid)` returned five columns and the first was a number
-- out of 100 printed on every agent's public profile. It collapsed the signals
-- `docs/PRODUCT.md` section 6 says must stay separate into one, and it was
-- wrong on its own terms: 30 of the 100 points were the verified flag, up to
-- 30 more were "completed deals" counted only from CONFIRMED stays past their
-- check-out, so an agent who lets forty flats a year scored the same on that
-- line as one who had done nothing. A reader takes "72" to mean "72 per cent
-- trustworthy", which is a claim no code here can prove.
--
-- This re-creates the function WITHOUT `trust_score`, keeping the four parts
-- that are each a plain fact until V-34's Record replaces them:
--
--   completed_deals   CONFIRMED stays past check-out on this agent's listings.
--                     The name is kept so no reader breaks; the profile now
--                     labels it as what it counts (stays hosted) and prints it
--                     only when it is above zero, so a rental agent is no
--                     longer told their work counts for nothing.
--   response_minutes  the median time to a first reply
--   review_count      how many reviews
--   average_rating    their average
--
-- A changed return type cannot be `create or replace`d, so the function is
-- dropped and created in one transaction. Nothing in the database depends on
-- it (no view, policy or function body names it; read back below). The grants
-- are restated exactly as they stand today: `authenticated` and the service
-- role, never `anon` (revoked on 22 September by
-- 20260922123239_the_escrow_doors_are_locked_and_trust_stops_answering_strangers).

drop function if exists public.agent_trust(uuid);

create function public.agent_trust(p_user uuid)
returns table (completed_deals integer, response_minutes integer, review_count integer, average_rating numeric)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with me as (
    select a.id from public.agents a where a.user_id = p_user
  ),
  deals as (
    select count(*)::int as n
      from public.bookings b
      join public.listings l on l.id = b.listing_id
      join me on me.id = l.agent_id
     where b.status = 'CONFIRMED'
       and b.check_out <= (now() at time zone 'Africa/Lagos')::date
  ),
  replies as (
    select percentile_cont(0.5) within group (
             order by extract(epoch from (m.first_reply - c.created_at)) / 60
           ) as minutes
      from public.conversations c
      join lateral (
        select min(created_at) as first_reply
          from public.messages
         where conversation_id = c.id and sender_id = p_user
      ) m on true
     where c.agent_id = p_user and m.first_reply is not null
  ),
  stars as (
    select count(*)::int as n, avg(r.rating)::numeric as avg
      from public.reviews r
      join public.listings l on l.id = r.listing_id
      join me on me.id = l.agent_id
  )
  select
    (select n from deals),
    round((select minutes from replies))::integer,
    (select n from stars),
    round((select avg from stars), 2)
  where exists (select 1 from me);
$function$;

comment on function public.agent_trust(uuid) is
  'An agent''s plain facts: stays hosted to check-out, median first-reply minutes, review count and average. No row for somebody who is not an agent. There is no score and there must never be one again (V-21, PRODUCT.md section 6).';

revoke all on function public.agent_trust(uuid) from public, anon;
grant execute on function public.agent_trust(uuid) to authenticated, service_role;

do $readback$
declare bad text := '';
begin
  if pg_get_function_result('public.agent_trust(uuid)'::regprocedure) ilike '%score%' then
    bad := bad || ' [a score is still returned]';
  end if;
  if has_function_privilege('anon', 'public.agent_trust(uuid)', 'execute') then
    bad := bad || ' [anon can call agent_trust]';
  end if;
  if not has_function_privilege('authenticated', 'public.agent_trust(uuid)', 'execute') then
    bad := bad || ' [authenticated lost agent_trust]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
