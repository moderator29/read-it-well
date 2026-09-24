-- SEC-09: the server actions rate-limit messages, posts, comments, reports
-- and the rest, but every one of those writes is also a direct PostgREST
-- insert under RLS, which skips the action and its limit. The limit now
-- lives where the write happens as well.
--
-- A BEFORE INSERT trigger counts a member's own inserts per table in two
-- windows (short and daily) through private.consume_rate_limit, and refuses
-- the one over either limit with 54000. Only member tokens are counted
-- (content_writer_is_member): the service role, database jobs and admins are
-- not. Every limit sits well above what the app's own limits and a busy
-- honest person reach, so no flow the app offers can hit it; it stops a
-- script, not a person.
--
--   messages        60 per 10 minutes, 1000 a day (an agent answering many
--                   guests sends a lot, and sending is never limited in the app)
--   posts           60 per 10 minutes, 500 a day (app: 5 posts an hour, 20 a
--                   day, 10 replies per 5 minutes)
--   story_comments  60 per 10 minutes, 500 a day (app: 10 per 5 minutes)
--   reports         30 an hour, 100 a day (app: 10 an hour, 20 a day)
--   reviews         20 an hour, 50 a day (one per finished booking)
--   listings        30 an hour, 100 a day (a draft row per new listing)
--
-- Conversations already carry their own daily limit (SEC-P2-02). Posts a
-- trigger writes for a member (a listing's announcement on publish) count
-- against that member; 60 publishes in ten minutes would be needed to notice.

create or replace function private.limit_member_inserts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who uuid := auth.uid();
  short_limit int := tg_argv[0]::int;
  short_window int := tg_argv[1]::int;
  day_limit int := tg_argv[2]::int;
  within boolean;
begin
  if who is null or not private.content_writer_is_member() then
    return new;
  end if;
  -- A fault in the counter itself lets the write through: this is a backstop
  -- behind the app's own limits, and a limiter outage must not stop people
  -- messaging. Only an answered "over the limit" refuses.
  begin
    within := private.consume_rate_limit('db:' || tg_table_name, who::text, short_limit, short_window);
    if within then
      within := private.consume_rate_limit('db:' || tg_table_name || ':day', who::text, day_limit, 86400);
    end if;
  exception when others then
    return new;
  end;
  if not within then
    raise exception 'That is more than we accept in this time. Please wait a little and try again.'
      using errcode = 'program_limit_exceeded';
  end if;
  return new;
end;
$$;

revoke all on function private.limit_member_inserts() from public, anon, authenticated;

drop trigger if exists messages_limit_member_inserts on public.messages;
create trigger messages_limit_member_inserts before insert on public.messages
  for each row execute function private.limit_member_inserts('60', '600', '1000');

drop trigger if exists posts_limit_member_inserts on public.posts;
create trigger posts_limit_member_inserts before insert on public.posts
  for each row execute function private.limit_member_inserts('60', '600', '500');

drop trigger if exists story_comments_limit_member_inserts on public.story_comments;
create trigger story_comments_limit_member_inserts before insert on public.story_comments
  for each row execute function private.limit_member_inserts('60', '600', '500');

drop trigger if exists reports_limit_member_inserts on public.reports;
create trigger reports_limit_member_inserts before insert on public.reports
  for each row execute function private.limit_member_inserts('30', '3600', '100');

drop trigger if exists reviews_limit_member_inserts on public.reviews;
create trigger reviews_limit_member_inserts before insert on public.reviews
  for each row execute function private.limit_member_inserts('20', '3600', '50');

drop trigger if exists listings_limit_member_inserts on public.listings;
create trigger listings_limit_member_inserts before insert on public.listings
  for each row execute function private.limit_member_inserts('30', '3600', '100');
