-- DRAFT, NOT APPLIED. The profile's "Ask me first" rule, held by the database.
--
-- social_profiles.contact_policy is OPEN ("Anyone can message me") or REQUEST
-- ("Ask me first", the default). Only the app enforced it
-- (apps/web/src/lib/social/message-door.ts, lib/messages/direct.ts): a NEW
-- direct chat with a REQUEST person needs the caller to follow them; a chat
-- that already exists opens whatever the policy says. A caller going straight
-- to this function with the API skipped the rule. This adds the same rule
-- inside the function, in the same place the app applies it: after an existing
-- chat is returned, before a new one is made.
--
-- Based on the LIVE definition read 13 October 2026 (start_direct_conversation(uuid),
-- security definer, search_path ''); everything else is unchanged. The new
-- refusal is 'direct:follow_first' with errcode P0001, kept apart from 42501
-- (which the app reads as a block). Grants as live: execute for authenticated
-- and service_role only (create or replace keeps them; restated here).
set lock_timeout = '5s';

create or replace function public.start_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  me uuid := (select auth.uid());
  cid uuid;
begin
  if me is null then
    raise exception 'direct:signed_out' using errcode = '42501';
  end if;
  if p_other is null or p_other = me then
    raise exception 'direct:invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from public.social_profiles sp where sp.user_id = p_other) then
    raise exception 'direct:not_found' using errcode = 'P0002';
  end if;
  if private.blocked_between(me, p_other) then
    raise exception 'direct:blocked' using errcode = '42501';
  end if;

  select c.id into cid
    from public.conversations c
   where c.context_kind = 'direct'
     and least(c.guest_id, c.agent_id) = least(me, p_other)
     and greatest(c.guest_id, c.agent_id) = greatest(me, p_other);
  if cid is not null then
    return cid;
  end if;

  /* A new chat follows the profile's own rule: a person who asks first
     (REQUEST, the default) takes new chats only from people who follow them. */
  if exists (
    select 1 from public.social_profiles sp
     where sp.user_id = p_other
       and sp.contact_policy <> 'OPEN'
  ) and not exists (
    select 1 from public.follows f
     where f.follower_id = me
       and f.followee_id = p_other
  ) then
    raise exception 'direct:follow_first' using errcode = 'P0001';
  end if;

  begin
    insert into public.conversations (guest_id, agent_id, context_kind)
    values (me, p_other, 'direct')
    returning id into cid;
  exception when unique_violation then
    select c.id into cid
      from public.conversations c
     where c.context_kind = 'direct'
       and least(c.guest_id, c.agent_id) = least(me, p_other)
       and greatest(c.guest_id, c.agent_id) = greatest(me, p_other);
  end;
  return cid;
end;
$fn$;

revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated, service_role;
