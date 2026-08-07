-- RentMe says one useful thing a day, in its own voice, to everybody.
--
-- The owner asked for this by name, and pointed at the posts that already
-- exist as the shape to follow: "let rentme be auto posting 1 posts that helps
-- the platform daily, and also if differs location opens eg the abia those kind
-- of posts, lovely, I love it".
--
-- Those are `private.open_place_entries`, which writes two SYSTEM rows when a
-- place opens. They work because of one property, and everything here inherits
-- it: A POST CARRIES ITS TIMESTAMP FOR EVER, SO IT MUST BE TRUE FOR EVER. "Six
-- flats are listed in Yaba" is a lie by Thursday. "Never send money for a place
-- you have not stood inside" is true in ten years.
--
-- So the rotation below is built from two kinds of entry and nothing else:
--
--   TIMELESS      a fact about renting in Nigeria, or about how this platform
--                 works, that does not decay. Most of the pool.
--   SELF-CHECKING a sentence with a number in it, where the number is read
--                 from the database at the moment of writing AND the sentence
--                 is worded so that it stays true afterwards. "Between Monday
--                 and Sunday last week, 14 places were listed" is still true
--                 next year. "There are 14 places" is not.
--
-- An entry that cannot verify itself does not post. It is skipped and the next
-- one in the rotation is tried, so a quiet week produces a timeless entry
-- rather than a wrong number or a gap.
--
-- WHERE IT LANDS. `area_id` is null, so it is addressed to the whole platform
-- and appears in every feed that is not one place's own. This is the first
-- thing on the platform written that way and it is exactly what public posts
-- are for: one voice, once a day, to everybody, without joining anything.
--
-- WHY THE DATABASE AND NOT A ROUTE. pg_cron is installed on this project. A
-- Vercel cron would mean an HTTP route, a shared secret, a second place for the
-- schedule to live and a way for somebody to reach it from outside. This has
-- none of that: the function is SECURITY DEFINER with EXECUTE revoked from
-- every client role, and the only caller is the scheduler.

-- ---------------------------------------------------------------------------
-- What has already been said, so it is not said again
-- ---------------------------------------------------------------------------

create table if not exists private.daily_notes (
  slug       text primary key,
  last_used  timestamptz,
  used_count integer not null default 0 check (used_count >= 0)
);

comment on table private.daily_notes is
  'One row per daily note. Least recently used wins, so the rotation never repeats before it has to.';

-- The pool. Each row is one note: its slug, whether it needs a number, and the
-- words. Kept as data rather than as a CASE so adding one is an insert.
insert into private.daily_notes (slug) values
  ('inspect_before_paying'),
  ('no_platform_fee'),
  ('agent_fee_is_negotiable'),
  ('get_a_receipt'),
  ('caution_fee_comes_back'),
  ('read_the_meter'),
  ('water_before_light'),
  ('ask_the_neighbours'),
  ('rainy_season_road'),
  ('what_a_place_is_really_worth'),
  ('report_a_number_request'),
  ('new_homes_last_week'),
  ('places_open_now'),
  ('ask_the_platform_light'),
  ('ask_the_platform_rent')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- The words, and the facts behind the ones that carry a number
-- ---------------------------------------------------------------------------

create or replace function private.daily_note_body(p_slug text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n        integer;
  m        integer;
  since    date := (now() at time zone 'Africa/Lagos')::date - 7;
begin
  case p_slug

    -- ------------------------------------------------------------- timeless

    when 'inspect_before_paying' then
      return 'Stand inside a place before any money moves. Message the agent here, '
        || 'arrange the inspection, walk the rooms, check the taps and the sockets, and '
        || 'pay after that. Anybody who wants a deposit before you have seen the door is '
        || 'not doing business, and RentMe will never ask you for one.';

    when 'no_platform_fee' then
      return 'RentMe charges you nothing. Not to look, not to message an agent, not to '
        || 'book, and not to be listed. If a message anywhere tells you there is a RentMe '
        || 'fee, an activation payment or a verification charge, it is not from us. '
        || 'Report it and a person reads it.';

    when 'agent_fee_is_negotiable' then
      return 'The agency fee is a price, not a law. Ten percent is common in Lagos and '
        || 'five is common in plenty of places, and the number is between you and the '
        || 'agent before you commit to anything. Ask what it covers and ask it early, '
        || 'while you are still free to walk away.';

    when 'get_a_receipt' then
      return 'Every naira you hand over should leave a paper trail with a name on it. '
        || 'A receipt that says who received it, how much, what for and which date is '
        || 'the difference between a disagreement and a dispute you can win. Take a '
        || 'photograph of it the moment you get it.';

    when 'caution_fee_comes_back' then
      return 'A caution fee is your money being held, not spent. Ask in writing what '
        || 'would be deducted from it and when it comes back, and photograph the flat '
        || 'the day you move in: every wall, every fitting, the meter reading. That set '
        || 'of pictures is what settles the question a year later.';

    when 'read_the_meter' then
      return 'Read the meter before you move in and write down the number. A prepaid '
        || 'meter with somebody else''s debt on it becomes your debt the day you start '
        || 'buying units, and the only thing that separates the two is a reading with a '
        || 'date on it.';

    when 'water_before_light' then
      return 'Ask about water before you ask about anything else. Light has a generator '
        || 'and an inverter and a hundred workarounds; water has a borehole or it has a '
        || 'problem. Find out where it comes from, who maintains it, and what happens in '
        || 'the dry season.';

    when 'ask_the_neighbours' then
      return 'Knock on one door before you sign. Five minutes with somebody who already '
        || 'lives on that street will tell you more than an hour with anybody selling '
        || 'you something: how often the light goes, what the landlord is like, and '
        || 'whether the road floods.';

    when 'rainy_season_road' then
      return 'See the road in the rain if you possibly can, and if you cannot, ask '
        || 'somebody who has. A street that is fine in February and impassable in July '
        || 'is the same street, and the rent will not tell you which one you are '
        || 'looking at.';

    when 'what_a_place_is_really_worth' then
      return 'The rent is not the cost. Add the agency fee, the legal fee, the caution '
        || 'fee, what it takes to move, and what a year of running the generator comes '
        || 'to on that street. Two flats with the same rent can be a long way apart once '
        || 'that sum is done, and it is worth doing on paper before you decide.';

    when 'report_a_number_request' then
      return 'If anybody on here asks you to move the conversation off RentMe, or sends '
        || 'you an account number, report the message. It takes one tap, a person reads '
        || 'every one, and it is the single most useful thing you can do for the next '
        || 'person who would have received the same message.';

    -- ------------------------------------------------------- self-checking

    when 'new_homes_last_week' then
      select count(*), count(distinct l.state_code) into n, m
        from public.listings l
       where l.status = 'PUBLISHED'
         and l.published_at >= since;
      -- Nothing to report is not a smaller number, it is no note.
      if coalesce(n, 0) < 3 then return null; end if;
      return 'In the seven days to ' || to_char(since + 7, 'FMDD Month YYYY') || ', '
        || n || ' places went up on RentMe across '
        || m || case when m = 1 then ' state' else ' states' end
        || '. Every one of them was checked by a person before it was published, and '
        || 'none of them cost you anything to look at.';

    when 'places_open_now' then
      select count(*), count(distinct a.state_code) into n, m
        from public.areas a
       where a.status = 'ACTIVE';
      if coalesce(n, 0) < 3 then return null; end if;
      return 'As of ' || to_char((now() at time zone 'Africa/Lagos')::date, 'FMDD Month YYYY')
        || ', ' || n || ' places were open on RentMe across '
        || m || case when m = 1 then ' state' else ' states' end
        || '. If the one you live in is not among them, you can open it yourself: '
        || 'search for it, walk in, and it exists from that moment.';

    -- ---------------------------------------------------------- invitations

    when 'ask_the_platform_light' then
      return 'A question for anybody reading: which street where you live actually has '
        || 'reliable light, and roughly how many hours a day? Say the street and the '
        || 'area. Somebody deciding where to move this month will read it, and there is '
        || 'no website in this country that can tell them.';

    when 'ask_the_platform_rent' then
      return 'A question for anybody reading: what does a one bedroom really go for on '
        || 'your street this year, and what did the agent ask on top of it? Real numbers '
        || 'from people who paid them are worth more than any listing, and they are the '
        || 'thing this platform cannot buy.';

    else
      return null;
  end case;
end;
$$;

comment on function private.daily_note_body(text) is
  'The words for one daily note. Returns null when a note cannot verify its own facts.';

-- ---------------------------------------------------------------------------
-- Once a day, to everybody
-- ---------------------------------------------------------------------------

create or replace function private.post_daily_note()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  body      text;
  new_id    uuid;
begin
  -- Exactly one a day, measured in Lagos, because that is where the reader is.
  -- This is the guard that makes the function safe to call twice: a retry, a
  -- manual run and a scheduler that fires late all land on the same answer.
  if exists (
    select 1 from public.posts
     where author_kind = 'SYSTEM'
       and area_id is null
       and parent_id is null
       and (created_at at time zone 'Africa/Lagos')::date
           = (now() at time zone 'Africa/Lagos')::date
  ) then
    return null;
  end if;

  -- Least recently used, never used first. A note that cannot verify itself
  -- returns null and the loop moves on, so a quiet week reads as a timeless
  -- note rather than as a wrong number or a silent day.
  for candidate in
    select slug from private.daily_notes
     order by last_used asc nulls first, used_count asc, slug asc
  loop
    body := private.daily_note_body(candidate.slug);
    exit when body is not null;
  end loop;

  if body is null then return null; end if;

  insert into public.posts (area_id, author_kind, kind, body, status)
  values (null, 'SYSTEM', 'SYSTEM', body, 'LIVE')
  returning id into new_id;

  update private.daily_notes
     set last_used = now(), used_count = used_count + 1
   where slug = candidate.slug;

  return new_id;
end;
$$;

comment on function private.post_daily_note() is
  'Writes one public SYSTEM post a day. Idempotent within a Lagos day.';

revoke all on function private.post_daily_note() from public, anon, authenticated;
revoke all on function private.daily_note_body(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The schedule
-- ---------------------------------------------------------------------------

-- 07:00 in Lagos, which is 06:00 UTC and does not move: Nigeria has no daylight
-- saving. Morning on purpose. A note about what a flat really costs is worth
-- more before somebody leaves the house than after they have paid a deposit.
select cron.unschedule('rentme-daily-note')
 where exists (select 1 from cron.job where jobname = 'rentme-daily-note');

select cron.schedule(
  'rentme-daily-note',
  '0 6 * * *',
  $cron$select private.post_daily_note();$cron$
);
