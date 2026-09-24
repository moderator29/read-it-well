-- V-23, THE THREAD HEADER NAMES THE PERSON, NOT ONLY THE PROPERTY.
--
-- Every decision in a thread is a decision about a person, and a property
-- thread's header named only the flat. This function returns the dated facts
-- the platform holds about THE OTHER PARTY to a conversation, for a caller who
-- is a party to it, and nothing about anybody else:
--
--   identity_seen_at    when that person's identity rung passed (the date the
--                       published badge turned true), or null
--   identity_nimc       true when that identity was matched with NIMC (V-49)
--   member_since        when the account was created
--   phone_confirmed     true when they confirmed a mobile number (V-50). The
--                       number itself never leaves `confirmed_phones`.
--   viewings_arranged   inspections they requested that a lister accepted.
--                       "Arranged", not "attended": acceptance is what the
--                       platform can prove until V-35 proves attendance.
--
-- A null is not a line: the screen prints only the facts that are there.
-- SECURITY DEFINER because every source is locked to its owner; the guard
-- below is the whole authorisation, and it returns NO ROW to a non-party.

create or replace function public.thread_counterpart_facts(p_conversation uuid)
returns table (
  identity_seen_at timestamptz,
  identity_nimc boolean,
  member_since timestamptz,
  phone_confirmed boolean,
  viewings_arranged integer
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
  select
    (select ab.verified_at from public.agents a join public.agent_badges ab on ab.agent_id = a.id
      where a.user_id = party.other and ab.verified and not a.is_demo limit 1),
    exists (select 1 from public.identity_verifications iv
             where iv.subject_id = party.other and iv.outcome = 'matched' and iv.method = 'vnin'),
    (select u.created_at from auth.users u where u.id = party.other),
    exists (select 1 from public.confirmed_phones cp where cp.user_id = party.other),
    (select count(*)::integer from public.inspection_requests r
      where r.requester_id = party.other
        and r.state in ('CONFIRMED'::public.inspection_state, 'COMPLETED'::public.inspection_state))
  from party;
$$;

comment on function public.thread_counterpart_facts(uuid) is
  'V-23. The dated facts about the other party to a conversation, for a caller who is a party: identity date and method, member since, phone confirmed, viewings arranged. No row for anybody else.';

revoke all on function public.thread_counterpart_facts(uuid) from public, anon;
grant execute on function public.thread_counterpart_facts(uuid) to authenticated;
