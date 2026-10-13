-- DRAFT, not applied. Batch 1, SECURITY-03 (defect D-03, HANDOFF section 6 item 5).
-- "Ask me first" (social_profiles.contact_policy, default REQUEST) is enforced
-- only in the app (lib/messages/direct.ts, lib/social/message-door.ts). The
-- live public.start_direct_conversation checks profile and block only, and
-- the conversations INSERT policy lets a member insert a direct row where
-- they are guest_id. Either path opens a chat with somebody who asked to be
-- messaged only by people who follow them.
-- This trigger holds the same rule as messageDoor(): a NEW direct chat to a
-- person whose policy is not OPEN needs the starter to follow them. An
-- existing chat is untouched. Service-role writes are not affected.
set lock_timeout = '5s';

create or replace function private.direct_chat_respects_contact_policy()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  me    uuid := (select auth.uid());
  other uuid;
  pol   text;
begin
  if new.context_kind is distinct from 'direct'::public.thread_context then
    return new;
  end if;
  if me is null or coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon') then
    return new;
  end if;
  other := case when new.guest_id = me then new.agent_id else new.guest_id end;
  select sp.contact_policy into pol from public.social_profiles sp where sp.user_id = other;
  if coalesce(pol, 'REQUEST') <> 'OPEN'
     and not exists (select 1 from public.follows f
                      where f.follower_id = me and f.followee_id = other) then
    raise exception 'direct:follow_first' using errcode = '42501';
  end if;
  return new;
end;
$fn$;

revoke all on function private.direct_chat_respects_contact_policy() from public, anon, authenticated;

create trigger conversations_direct_contact_policy
  before insert on public.conversations
  for each row execute function private.direct_chat_respects_contact_policy();
