-- `min(uuid)` does not exist, so the evidence for a first stay is the date it
-- ended rather than the id of the booking. Caught by RUNNING the sweep, not by
-- applying it: the migration went in green and the function raised 42883 on its
-- first call, which is the same shape of failure this project has now hit five
-- times. Create a function and you have proved nothing. Run it.
create or replace function private.sweep_badges()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  before_count integer;
  after_count  integer;
begin
  select count(*) into before_count from public.user_badges;

  /* A stay is over when a CONFIRMED booking's checkout has passed. There is no
     COMPLETED status, so this date arithmetic stands in for one. */
  perform private.award_badge(b.guest_id, 'first_stay',
            'Their first completed booking.',
            jsonb_build_object('first_checkout', min(b.check_out)))
     from public.bookings b
    where b.status = 'CONFIRMED'
      and b.check_out <= (now() at time zone 'Africa/Lagos')::date
    group by b.guest_id;

  perform private.award_badge(a.user_id, 'ten_stays',
            'Ten bookings confirmed and completed.',
            jsonb_build_object('count', count(*)))
     from public.bookings b
     join public.listings l on l.id = b.listing_id
     join public.agents   a on a.id = l.agent_id
    where b.status = 'CONFIRMED'
      and b.check_out <= (now() at time zone 'Africa/Lagos')::date
    group by a.user_id
   having count(*) >= 10;

  perform private.award_badge(p.id, 'year_one',
            'One year since joining RentMe.',
            jsonb_build_object('joined', p.created_at))
     from public.profiles p
    where p.created_at <= now() - interval '1 year';

  /* Median first reply under an hour, across twenty conversations or more. The
     twenty is the point: a median over three answered messages is not a habit. */
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

  /*
   * Elite is every other agent badge plus ninety days with no open trust flag.
   * Computed last on purpose: the six above may have just been awarded in this
   * same sweep, and somebody who qualified for all of them tonight should not
   * have to wait until tomorrow night to be told.
   */
  perform private.award_badge(ub.user_id, 'rentme_elite',
            'Every agent badge, and no open trust flag for ninety days.',
            jsonb_build_object('agent_badges', count(*)))
     from public.user_badges ub
     join public.badges b on b.code = ub.badge_code
    where b.audience = 'AGENT' and b.code <> 'rentme_elite' and ub.revoked_at is null
      and not exists (
        select 1 from public.risk_alerts r
         where r.entity_type = 'agent' and r.entity_id = ub.user_id::text
           and r.created_at >= now() - interval '90 days'
      )
    group by ub.user_id
   having count(*) = (select count(*) from public.badges
                       where audience = 'AGENT' and code <> 'rentme_elite');

  select count(*) into after_count from public.user_badges;
  return after_count - before_count;
end;
$fn$;

comment on function private.sweep_badges() is
  'Awards the seven badges that are not events: they are dates passing and medians moving. Idempotent, safe to run by hand, returns how many it granted.';

revoke execute on function private.sweep_badges() from public, anon, authenticated;
