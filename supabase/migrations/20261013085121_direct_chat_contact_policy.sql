set lock_timeout = '5s';

-- SECURITY-03. "Ask me first" (social_profiles.contact_policy = 'REQUEST') was
-- enforced only in the app (lib/social/message-door.ts). A new direct chat to
-- such a person now needs the starter to follow them, in the database too.
-- Writes with no signed-in member (service role, jobs) are not affected, and
-- an existing chat is untouched.
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
  if new.context_kind is distinct from 'direct'::public.thread_context or me is null then
    return new;
  end if;
  other := case when new.guest_id = me then new.agent_id else new.guest_id end;
  select sp.contact_policy into pol from public.social_profiles sp where sp.user_id = other;
  if coalesce(pol, 'REQUEST') = 'REQUEST'
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
