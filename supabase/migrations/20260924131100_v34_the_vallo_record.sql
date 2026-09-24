-- V-34, THE VALLO RECORD: PROOF A LISTER IS GOOD AT THE JOB, COUNTED, DATED
-- AND PORTABLE.
--
-- A short set of counted facts about a lister, each with its denominator and
-- its window, NEVER COMBINED INTO A SCORE (V-21 deleted the one there was):
--
--   replies        the median time from a renter's first message in a thread
--                  the renter started to the lister's first reply, last 90
--                  days, published as a band by the app, never as minutes
--   answered       enquiries answered within a day, "47 of 51", last 90 days.
--                  An enquiry younger than a day is not yet in either number:
--                  counting it as unanswered would punish the lister for the
--                  clock, not for silence.
--   described      "Found as described at inspection: 27 of 29", from the
--                  renters' own truth answers (V-05): the latest answer of each
--                  renter per listing, 'yes' against 'yes' plus 'no' ("not
--                  sure" is neither), last 12 months, withheld answers (V-58)
--                  never counted
--   lets           "Let through Vallo: 9 in the last 12 months", rent charges
--                  whose booking was paid
--   since          when the lister joined, the month is enough
--
--   kept           "Inspections kept: 29 of 31", counted ONLY from the gate
--                  handshake (V-35): a confirmed inspection whose slot passed
--                  more than a day ago in the last 12 months is kept when the
--                  renter's phone recorded that the lister's code matched. The
--                  lister cannot mark themselves present.
--
-- THE CORE IS PL/pgSQL, NOT SQL, because it reads `inspection_checkins`,
-- which V-35 (20260924160100) creates after this file in timestamp order: a
-- plpgsql body is resolved when it runs, so this file applies first and the
-- Record works once both are in. Nothing calls it in between.
--
-- FIVE OR NOTHING. Every counted fact is returned only when its denominator
-- reaches five; below that the columns are null and the screen prints nothing
-- (the claims rule). Five also keeps a single renter's answer or a single
-- tenancy from being read off a public page.
--
-- A STOPPED LISTER'S RECORD IS THE STOP. When the agent is suspended the row
-- carries the date of the stop and every counted column is null.
--
-- EXAMPLE LISTERS HAVE NO RECORD. An `is_demo` agent returns no row: example
-- listings never carry a trust signal.
--
-- THE RECORD CODE. `agents.record_code`, `VR-` and six characters from the
-- listing-code alphabet (`private.listing_reference`), minted once and never
-- changed, so it can go on a WhatsApp bio, a business card or a TO LET board.
-- It is a lookup, not a credential: anybody signed in who types it sees the
-- live Record, which is the point, and the lookup is rate limited so the space
-- cannot be walked.
--
-- LIVE, NOT MATERIALISED. The entry suggests a nightly table. At today's volume
-- the counts are cheap over indexed columns, and a live read cannot go stale
-- or disagree with the thread the reader is looking at. The nightly job is the
-- step to take when a lister has thousands of threads, and it changes nothing
-- above the function signatures.
--
--   public.lister_record(agent)           signed in, any lister
--   public.lister_record_for_user(user)   signed in, the supplier page
--   public.lister_record_by_code(code)    signed in, rate limited
--   public.thread_counterpart_record(c)   a party to the thread only

alter table public.agents add column if not exists record_code text;

create unique index if not exists agents_record_code_key on public.agents (record_code);

comment on column public.agents.record_code is
  'V-34. The Record code: VR- and six characters from the listing-code alphabet. A lookup for the live Record, not a credential. Minted once, never changed, never on an example agent.';

create or replace function private.record_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  candidate text;
  attempt   integer := 0;
begin
  loop
    candidate := 'VR-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.agents a where a.record_code = candidate);
    attempt := attempt + 1;
    if attempt > 40 then
      raise exception 'could not allocate a record code';
    end if;
  end loop;
  return candidate;
end;
$$;

revoke all on function private.record_code() from public, anon, authenticated;

create or replace function private.assign_record_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.record_code is not null then
    new.record_code := old.record_code;
  elsif tg_op = 'INSERT' then
    new.record_code := null;
  end if;
  if new.record_code is null and not new.is_demo then
    new.record_code := private.record_code();
  end if;
  if new.is_demo then
    new.record_code := null;
  end if;
  return new;
end;
$$;

revoke all on function private.assign_record_code() from public, anon, authenticated;

drop trigger if exists agents_assign_record_code on public.agents;
create trigger agents_assign_record_code
  before insert or update of record_code, is_demo on public.agents
  for each row execute function private.assign_record_code();

/* Every real lister gets a code now; an example agent never does. */
update public.agents set record_code = private.record_code()
 where record_code is null and not is_demo;

/* ------------------------------------------------------------ the counts */

create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);

create or replace function private.lister_record_core(p_agent uuid)
returns table (
  record_code text,
  display_name text,
  since timestamptz,
  stopped_at timestamptz,
  reply_median_minutes integer,
  replied integer,
  answered_in_day integer,
  enquiries integer,
  described integer,
  described_of integer,
  lets integer,
  kept integer,
  kept_of integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  with a as (
    select ag.id, ag.user_id, ag.record_code, ag.display_name, ag.created_at,
           ag.status = 'SUSPENDED'::public.agent_application_status as stopped
      from public.agents ag
     where ag.id = p_agent and not ag.is_demo
  ),
  /* Threads the renter started: the first message is the guest's. */
  enquiry as (
    select c.id,
           first_m.created_at as asked_at,
           (select min(m.created_at) from public.messages m
             where m.conversation_id = c.id and m.sender_id = c.agent_id
               and m.created_at >= first_m.created_at) as replied_at
      from a
      join public.conversations c on c.agent_id = a.user_id
      join lateral (
        select m.sender_id, m.created_at from public.messages m
         where m.conversation_id = c.id order by m.created_at, m.id limit 1
      ) first_m on true
     where first_m.sender_id = c.guest_id
       and c.guest_id <> c.agent_id
       and first_m.created_at > now() - interval '90 days'
       and first_m.created_at <= now() - interval '1 day'
  ),
  reply_stats as (
    select count(*)::integer as n,
           count(*) filter (where replied_at is not null
                              and replied_at - asked_at <= interval '1 day')::integer as in_day,
           count(*) filter (where replied_at is not null)::integer as answered,
           (percentile_cont(0.5) within group (
              order by extract(epoch from (replied_at - asked_at)) / 60
            ) filter (where replied_at is not null))::integer as median_minutes
      from enquiry
  ),
  truth as (
    select distinct on (t.listing_id, t.respondent_id) t.property_matched
      from a
      join public.listings l on l.agent_id = a.id and not l.is_demo
      join public.inspection_truth t on t.listing_id = l.id
     where t.weight_withheld_reason is null
       and t.answered_at > now() - interval '12 months'
     order by t.listing_id, t.respondent_id, t.answered_at desc
  ),
  truth_stats as (
    select count(*) filter (where property_matched = 'yes')::integer as yes,
           count(*) filter (where property_matched in ('yes', 'no'))::integer as of
      from truth
  ),
  let_stats as (
    select count(*)::integer as n
      from a
      join public.rent_payments rp on rp.lister_id = a.user_id
      join public.bookings b on b.id = rp.booking_id
      join public.listings l on l.id = rp.listing_id and not l.is_demo
     where b.status in ('CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status)
       and rp.created_at > now() - interval '12 months'
  ),
  kept_stats as (
    select count(*) filter (where exists (
             select 1 from public.inspection_checkins k
              where k.inspection_id = r.id and k.role = 'checker' and k.result = 'match'))::integer as kept,
           count(*)::integer as of
      from a
      join public.inspection_requests r on r.lister_id = a.user_id
     where r.state in ('CONFIRMED'::public.inspection_state, 'COMPLETED'::public.inspection_state)
       and r.slot_at > now() - interval '12 months'
       and r.slot_at <= now() - interval '1 day'
  )
  select a.record_code,
         a.display_name,
         a.created_at,
         case when a.stopped then
           (select max(s.suspended_at) from public.agent_suspensions s
             where s.agent_id = a.id and s.lifted_at is null)
         end,
         case when not a.stopped and r.answered >= 5 then r.median_minutes end,
         case when not a.stopped and r.answered >= 5 then r.answered end,
         case when not a.stopped and r.n >= 5 then r.in_day end,
         case when not a.stopped and r.n >= 5 then r.n end,
         case when not a.stopped and ts.of >= 5 then ts.yes end,
         case when not a.stopped and ts.of >= 5 then ts.of end,
         case when not a.stopped and ls.n >= 5 then ls.n end,
         case when not a.stopped and ks.of >= 5 then ks.kept end,
         case when not a.stopped and ks.of >= 5 then ks.of end
    from a, reply_stats r, truth_stats ts, let_stats ls, kept_stats ks;
end;
$$;

revoke all on function private.lister_record_core(uuid) from public, anon, authenticated;

comment on function private.lister_record_core(uuid) is
  'V-34. The counted facts of one lister''s Record. Every count only at a denominator of five or more; a stopped lister returns only the date of the stop; an example agent returns no row. Called only by the three public doors below.';

create or replace function public.lister_record(p_agent uuid)
returns table (
  record_code text, display_name text, since timestamptz, stopped_at timestamptz,
  reply_median_minutes integer, replied integer, answered_in_day integer, enquiries integer,
  described integer, described_of integer, lets integer, kept integer, kept_of integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.lister_record_core(p_agent) where (select auth.uid()) is not null;
$$;

comment on function public.lister_record(uuid) is
  'V-34. A lister''s Record for anybody signed in: on the supplier page and the listing''s agent card. Counts only, never a user id.';

revoke all on function public.lister_record(uuid) from public, anon;
grant execute on function public.lister_record(uuid) to authenticated;

/* The supplier page knows a person, not an agent row: `agents` is select own
   plus staff, so a visitor cannot walk from a profile to an agent id. This
   answers by person, and no row for somebody who is not a lister. */
create or replace function public.lister_record_for_user(p_user uuid)
returns table (
  record_code text, display_name text, since timestamptz, stopped_at timestamptz,
  reply_median_minutes integer, replied integer, answered_in_day integer, enquiries integer,
  described integer, described_of integer, lets integer, kept integer, kept_of integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.*
    from public.agents ag
    cross join lateral private.lister_record_core(ag.id) r
   where ag.user_id = p_user and not ag.is_demo and (select auth.uid()) is not null
   limit 1;
$$;

comment on function public.lister_record_for_user(uuid) is
  'V-34. A lister''s Record by person, for the supplier page, for anybody signed in. No row for a member who is not a lister.';

revoke all on function public.lister_record_for_user(uuid) from public, anon;
grant execute on function public.lister_record_for_user(uuid) to authenticated;

create or replace function public.lister_record_by_code(p_code text)
returns table (
  record_code text, display_name text, since timestamptz, stopped_at timestamptz,
  reply_median_minutes integer, replied integer, answered_in_day integer, enquiries integer,
  described integer, described_of integer, lets integer, kept integer, kept_of integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target uuid;
begin
  if caller is null then return; end if;
  if p_code is null or p_code !~ '^VR-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$' then return; end if;
  if not private.consume_rate_limit('record_code_lookup', caller::text, 30, 3600) then
    raise exception 'too many record lookups' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  select ag.id into target from public.agents ag where ag.record_code = p_code and not ag.is_demo;
  if target is null then return; end if;
  return query select * from private.lister_record_core(target);
end;
$$;

comment on function public.lister_record_by_code(text) is
  'V-34. The live Record behind a typed VR- code, for anybody signed in. Thirty lookups an hour per person, so the code space cannot be walked.';

revoke all on function public.lister_record_by_code(text) from public, anon;
grant execute on function public.lister_record_by_code(text) to authenticated;

create or replace function public.thread_counterpart_record(p_conversation uuid)
returns table (
  record_code text, display_name text, since timestamptz, stopped_at timestamptz,
  reply_median_minutes integer, replied integer, answered_in_day integer, enquiries integer,
  described integer, described_of integer, lets integer, kept integer, kept_of integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with party as (
    select case when c.guest_id = (select auth.uid()) then c.agent_id else c.guest_id end as other
      from public.conversations c
     where c.id = p_conversation
       and (select auth.uid()) in (c.guest_id, c.agent_id)
  )
  select r.*
    from party
    join public.agents ag on ag.user_id = party.other and not ag.is_demo
    cross join lateral private.lister_record_core(ag.id) r
   limit 1;
$$;

comment on function public.thread_counterpart_record(uuid) is
  'V-34. The Record of the other party to a conversation, when that party is a lister, for a caller who is a party. No row for anybody else.';

revoke all on function public.thread_counterpart_record(uuid) from public, anon;
grant execute on function public.thread_counterpart_record(uuid) to authenticated;

do $readback$
declare bad text := '';
begin
  if has_function_privilege('anon', 'public.lister_record(uuid)', 'execute') then bad := bad || ' [anon reads a record]'; end if;
  if has_function_privilege('authenticated', 'private.lister_record_core(uuid)', 'execute') then bad := bad || ' [the core is callable]'; end if;
  if exists (select 1 from public.agents where is_demo and record_code is not null) then bad := bad || ' [an example agent has a code]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
