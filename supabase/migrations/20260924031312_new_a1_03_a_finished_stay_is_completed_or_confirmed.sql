-- A finished stay is COMPLETED or CONFIRMED, and a tenancy is not a stay.
--
-- The nightly complete-stays job moves a paid stay to COMPLETED the morning
-- after check-out. Three readers written before COMPLETED existed still took
-- "CONFIRMED with a check-out that has passed" to mean a finished stay, so
-- that morning the stay stopped counting:
--   * reviews_insert_own refused the guest's review, leaving about 27 hours
--     from check-out day to write one;
--   * public.agent_trust dropped it from the agent's completed deals;
--   * private.sweep_badges stopped counting it towards first_stay and
--     ten_stays, so ten stays at one time was never reached.
-- Each now reads CONFIRMED or COMPLETED with a check-out on or before today in
-- Lagos. A booking carrying a rent charge (rent_payments) is a tenancy: it is
-- not reviewed as a stay and earns no stay badge. It still counts as one of
-- the agent's completed deals, because a let is a deal.

alter policy reviews_insert_own on public.reviews
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
        from public.bookings b
       where b.id = reviews.booking_id
         and b.guest_id = (select auth.uid())
         and b.listing_id = reviews.listing_id
         and b.status in ('CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status)
         and b.check_out <= (now() at time zone 'Africa/Lagos')::date
         and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
    )
  );

CREATE OR REPLACE FUNCTION public.agent_trust(p_user uuid)
 RETURNS TABLE(trust_score integer, completed_deals integer, response_minutes integer, review_count integer, average_rating numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with me as (
    select a.id, a.verified, a.status from public.agents a where a.user_id = p_user
  ),
  deals as (
    select count(*)::int as n
      from public.bookings b
      join public.listings l on l.id = b.listing_id
      join me on me.id = l.agent_id
     where b.status in ('CONFIRMED', 'COMPLETED')
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
    least(100, greatest(0,
        (case when (select verified from me) and (select status from me) = 'APPROVED' then 30 else 0 end)
      + least(30, (select n from deals) * 1.5)::int
      + (case
           when (select minutes from replies) is null then 0
           when (select minutes from replies) <= 60   then 20
           when (select minutes from replies) <= 360  then 14
           when (select minutes from replies) <= 1440 then 8
           else 3
         end)
      + coalesce(round(((select avg from stars) / 5.0) * 20)::int, 0)
    ))::integer,
    (select n from deals),
    round((select minutes from replies))::integer,
    (select n from stars),
    round((select avg from stars), 2)
  where exists (select 1 from me);
$function$;

CREATE OR REPLACE FUNCTION private.sweep_badges()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  before_count integer;
  after_count  integer;
begin
  select count(*) into before_count from public.user_badges;

  perform private.award_badge(b.guest_id, 'first_stay',
            'Their first completed booking.',
            jsonb_build_object('first_checkout', min(b.check_out)))
     from public.bookings b
    where b.status in ('CONFIRMED', 'COMPLETED')
      and b.check_out <= (now() at time zone 'Africa/Lagos')::date
      and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
    group by b.guest_id;

  perform private.award_badge(a.user_id, 'ten_stays',
            'Ten bookings confirmed and completed.',
            jsonb_build_object('count', count(*)))
     from public.bookings b
     join public.listings l on l.id = b.listing_id
     join public.agents   a on a.id = l.agent_id
    where b.status in ('CONFIRMED', 'COMPLETED')
      and b.check_out <= (now() at time zone 'Africa/Lagos')::date
      and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
    group by a.user_id
   having count(*) >= 10;

  perform private.award_badge(p.id, 'year_one',
            'One year since joining Vallo.',
            jsonb_build_object('joined', p.created_at))
     from public.profiles p
    where p.created_at <= now() - interval '1 year';

  perform private.award_badge(c.agent_id, 'fast_responder',
            'Median first reply under an hour across twenty conversations.',
            jsonb_build_object('conversations', count(*),
                               'median_minutes', round(percentile_cont(0.5) within group (
                                 order by extract(epoch from (m.first_reply - c.created_at)) / 60))))
     from public.conversations c
     join lateral (
       select min(created_at) as first_reply
         from public.messages
        where conversation_id = c.id and sender_id = c.agent_id
     ) m on m.first_reply is not null
    group by c.agent_id
   having count(*) >= 20
      and percentile_cont(0.5) within group (
            order by extract(epoch from (m.first_reply - c.created_at)) / 60) <= 60;

  perform private.award_badge(p.author_id, 'local_guide',
            'Twenty or more posts in one place.',
            jsonb_build_object('area_id', p.area_id, 'posts', count(*)))
     from public.posts p
    where p.status = 'LIVE' and p.author_id is not null and p.area_id is not null
    group by p.author_id, p.area_id
   having count(*) >= 20;

  perform private.award_badge(a.user_id, 'photo_pro',
            'Ten listings through the quality gate with no rejections.',
            jsonb_build_object('published', count(*) filter (where l.status = 'PUBLISHED')))
     from public.listings l
     join public.agents a on a.id = l.agent_id
    group by a.user_id
   having count(*) filter (where l.status = 'PUBLISHED') >= 10
      and count(*) filter (where l.status = 'REJECTED') = 0;

  perform private.award_badge(ub.user_id, 'vallo_elite',
            'Every agent badge, and no open trust flag for ninety days.',
            jsonb_build_object('agent_badges', count(*)))
     from public.user_badges ub
     join public.badges b on b.code = ub.badge_code
    where b.audience = 'AGENT' and b.code <> 'vallo_elite' and ub.revoked_at is null
      and not exists (
        select 1 from public.risk_alerts r
         where r.entity_type = 'agent' and r.entity_id = ub.user_id::text
           and r.created_at >= now() - interval '90 days'
      )
    group by ub.user_id
   having count(*) = (select count(*) from public.badges
                       where audience = 'AGENT' and code <> 'vallo_elite');

  select count(*) into after_count from public.user_badges;
  return after_count - before_count;
end;
$function$;
