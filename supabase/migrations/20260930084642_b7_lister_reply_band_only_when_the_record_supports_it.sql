-- B7: AN HONEST REPLY-TIME LINE FOR LISTERS (30 September 2026).
-- Applied 30 September 2026 with the founder's approval. Idempotent and
-- additive: one read-only function. No table, no row, no policy is changed.
--
-- WHAT IT ANSWERS. For one lister, over the last 90 days: in each
-- conversation where the renter wrote first, how long until the lister (or
-- anybody on the lister's side, i.e. anybody who is not the renter) first
-- replied. It returns ONE of three bands, or NULL:
--
--   'hour'   the median reply came within an hour
--   'hours'  within six hours ("within a few hours")
--   'day'    within 24 hours
--   NULL     fewer than 8 such conversations (the founder's minimum sample,
--            B7 default), or a median slower than a day (the founder's
--            default: a slow band is absent, not shown), or no lister.
--
-- HONESTY RULES.
--   - A conversation is counted only once its first renter message is at
--     least 24 hours old, so a question asked an hour ago is not yet a
--     "no reply".
--   - A conversation with NO reply counts as slower than any band (it sits
--     at the far end of the median), so ignoring renters cannot improve the
--     line.
--   - Example listings (is_demo) are excluded, as everywhere else.
--   - Only the band leaves the function: no count, no timestamps, no ids.
--
-- WHY A FUNCTION AND NOT A NIGHTLY TABLE. The recommendation suggested a
-- nightly job. The read is one indexed pass over a lister's own
-- conversations for 90 days (messages_conversation_idx covers the inner
-- reads), cheap enough per listing view, and it cannot go stale. If it ever
-- shows in the advisors, the lead can wrap it in a cache table and a pg_cron
-- job without changing its signature.
--
-- ACCESS. SECURITY DEFINER because a reader cannot (and must not) read
-- another person's messages; it returns only the band. Granted to anon and
-- authenticated because the listing page is public, and a band is no more
-- than the listing already implies.

create or replace function public.lister_reply_band(p_lister uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  with convo as (
    select c.id, c.guest_id
      from public.conversations c
      left join public.listings l on l.id = c.listing_id
     where p_lister is not null
       and c.agent_id = p_lister
       and c.created_at > now() - interval '90 days'
       and coalesce(l.is_demo, false) = false
  ), firsts as (
    select v.id,
           v.guest_id,
           (select min(m.created_at) from public.messages m
             where m.conversation_id = v.id and m.sender_id = v.guest_id) as asked_at,
           (select min(m.created_at) from public.messages m
             where m.conversation_id = v.id) as opened_at
      from convo v
  ), timed as (
    select f.id,
           extract(epoch from (
             (select min(m.created_at) from public.messages m
               where m.conversation_id = f.id and m.sender_id <> f.guest_id and m.created_at > f.asked_at)
             - f.asked_at)) as seconds
      from firsts f
     where f.asked_at is not null
       and f.asked_at = f.opened_at               -- the renter wrote first
       and f.asked_at < now() - interval '24 hours'
  ), stat as (
    select count(*) as n,
           percentile_disc(0.5) within group (order by coalesce(seconds, 'infinity'::float8)) as median
      from timed
  )
  select case
           when n < 8 then null
           when median <= 3600 then 'hour'
           when median <= 21600 then 'hours'
           when median <= 86400 then 'day'
           else null
         end
    from stat;
$function$;

comment on function public.lister_reply_band(uuid) is
  'B7: the lister''s usual reply band (hour, hours, day) over 90 days, or null below 8 conversations or slower than a day. Returns the band only.';

revoke all on function public.lister_reply_band(uuid) from public;
grant execute on function public.lister_reply_band(uuid) to anon, authenticated;

-- Read-back: the function exists, is definer with an empty search_path, and
-- answers null for nobody.
do $$
declare
  answer text;
begin
  if to_regprocedure('public.lister_reply_band(uuid)') is null then
    raise exception 'B7: lister_reply_band was not created';
  end if;
  if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = to_regprocedure('public.lister_reply_band(uuid)')) then
    raise exception 'B7: lister_reply_band is not security definer';
  end if;
  select public.lister_reply_band(null) into answer;
  if answer is not null then
    raise exception 'B7: lister_reply_band(null) answered %', answer;
  end if;
  select public.lister_reply_band('00000000-0000-0000-0000-000000000000'::uuid) into answer;
  if answer is not null then
    raise exception 'B7: an unknown lister got a band';
  end if;
end;
$$;
