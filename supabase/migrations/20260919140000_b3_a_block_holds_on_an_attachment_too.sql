-- B3. A block holds on an ATTACHMENT too, which is the half b5 did not cover.
--
-- WHAT WAS OPEN. `20260918150200_b5_a_block_holds_in_messaging.sql` put a
-- restrictive insert policy on `public.messages` and another on
-- `public.conversations`, so after a block neither a new message nor a new
-- thread can cross it. `public.message_attachments` was never in that file,
-- and its own insert policy (from `20260728222112_messaging_trust.sql`) asks
-- only two questions: is this MY message, and am I in that conversation.
-- Both stay true after a block, because the message is one the sender wrote
-- BEFORE the block and the membership row is untouched. So a blocked person
-- could hang a photograph off one of their own older messages and have it
-- appear, full width, in the thread of the person who blocked them. A picture
-- is the thing a block exists to stop.
--
-- The action layer refuses it in words from this commit
-- (apps/web/src/lib/messages/actions.ts, `attachImage`, both branches now ask
-- `guardConversation`); this file is the wall behind the sentence, on the
-- same footing b5 set: the action explains, the database enforces.
--
-- ADDITIVE, AND `message_attachments_insert` IS NOT TOUCHED. The new policy
-- is RESTRICTIVE, so Postgres ANDs it with the permissive one and the
-- existing rule stands word for word with one further condition. Nothing here
-- relaxes `messages.sender_id`, nothing drops, nothing revokes, no row
-- changes. A rollback is `drop policy`, not a data change. Idempotent:
-- `create or replace` and `drop policy if exists` before create.
--
-- The helper is SECURITY DEFINER for the same reason b5's two are:
-- `blocks_select_own` shows a caller only the rows they wrote, and the half
-- that decides safety is the half they cannot see. It answers one boolean
-- about one message and reveals nothing else.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the LEAD to run. One transaction, rolled back, so nothing
-- persists and no test row is ever written to a live product table. It raises
-- 'ALL PASS' at the end and fails loudly on the first assertion that does not
-- hold. It is not run from the sandbox, which has no database credentials.
--
-- WHAT IT PROVES
--   1. `private.blocked_for_message(uuid)` exists and is SECURITY DEFINER,
--      so it can see the half of a block the caller cannot.
--   2. `message_attachments_insert_not_across_block` exists on
--      `public.message_attachments`, is RESTRICTIVE (polpermissive = false)
--      and is an INSERT policy, so it can only ever NARROW the permissive
--      rule that was already there.
--   3. The permissive `message_attachments_insert` is still present and its
--      WITH CHECK expression is unchanged: this migration added a condition,
--      it did not rewrite one.
--   4. The helper answers FALSE for a message id that does not exist, so a
--      missing row can never be read as "blocked" and break a live thread.
--   5. THE RLS CROSS-USER READ THAT MUST FAIL. As `authenticated`, wearing
--      the JWT of a user who is in no conversation at all, a select over
--      `public.message_attachments` returns ZERO rows even though the table
--      has rows. A non-zero count here is a leak and the probe raises.
--      It is a READ: it writes nothing, in a transaction that is rolled back
--      anyway.
--
--   begin;
--
--   do $probe$
--   declare
--     secdef      boolean;
--     restrictive boolean;
--     cmd         "char";
--     permissive_check text;
--     stranger    uuid := '00000000-0000-0000-0000-0000000000ff';
--     leaked      integer;
--     total       integer;
--   begin
--     -- 1. the helper
--     select p.prosecdef into secdef
--       from pg_proc p
--      where p.pronamespace = 'private'::regnamespace
--        and p.proname = 'blocked_for_message';
--     if secdef is null then raise exception 'FAIL 1: helper missing'; end if;
--     if secdef is not true then raise exception 'FAIL 1: helper not security definer'; end if;
--
--     -- 2. the wall, and that it is restrictive
--     select pol.polpermissive, pol.polcmd into restrictive, cmd
--       from pg_policy pol
--      where pol.polrelid = 'public.message_attachments'::regclass
--        and pol.polname = 'message_attachments_insert_not_across_block';
--     if restrictive is null then raise exception 'FAIL 2: policy missing'; end if;
--     if restrictive is not false then raise exception 'FAIL 2: policy is permissive, it must be restrictive'; end if;
--     if cmd <> 'a' then raise exception 'FAIL 2: policy is not an INSERT policy'; end if;
--
--     -- 3. the old policy is untouched
--     select pg_get_expr(pol.polwithcheck, pol.polrelid) into permissive_check
--       from pg_policy pol
--      where pol.polrelid = 'public.message_attachments'::regclass
--        and pol.polname = 'message_attachments_insert';
--     if permissive_check is null then raise exception 'FAIL 3: message_attachments_insert is gone'; end if;
--     if permissive_check not like '%sender_id = auth.uid()%' then
--       raise exception 'FAIL 3: the permissive rule was rewritten: %', permissive_check;
--     end if;
--
--     -- 4. a message that does not exist is not "blocked"
--     if private.blocked_for_message('00000000-0000-0000-0000-000000000001'::uuid) then
--       raise exception 'FAIL 4: a missing message answered blocked';
--     end if;
--
--     -- 5. the cross-user read that must come back empty
--     select count(*) into total from public.message_attachments;
--     set local role authenticated;
--     perform set_config(
--       'request.jwt.claims',
--       json_build_object('sub', stranger, 'role', 'authenticated')::text,
--       true);
--     select count(*) into leaked from public.message_attachments;
--     reset role;
--     perform set_config('request.jwt.claims', null, true);
--     if leaked <> 0 then
--       raise exception 'FAIL 5: a stranger read % of % attachment rows', leaked, total;
--     end if;
--
--     raise notice 'ALL PASS (% attachment rows in the table, 0 readable by a stranger)', total;
--   end
--   $probe$;
--
--   rollback;
--
-- AND THE ONE THING THE PROBE CANNOT DO FROM HERE, said plainly rather than
-- claimed: it does not insert an attachment across a real block, because
-- doing so needs two real accounts with a real thread between them and this
-- build's stop list forbids writing test rows into live product tables. The
-- live proof belongs beside the b5 probe, on the seeded logins, once they
-- land: block B as A, then as B insert into message_attachments a row whose
-- message_id is one of B's own older messages in the shared thread, and
-- expect SQLSTATE 42501.
-- ---------------------------------------------------------------------------

create or replace function private.blocked_for_message(target_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
     where m.id = target_message_id
       and private.blocked_between(c.guest_id, c.agent_id)
  );
$$;

comment on function private.blocked_for_message(uuid) is
  'True when the two parties of the conversation this message belongs to have a block between them, in either direction. Security definer so a caller can be refused by a block they cannot see.';

revoke execute on function private.blocked_for_message(uuid) from public;
grant execute on function private.blocked_for_message(uuid) to authenticated, anon;

-- The wall. Restrictive, so it can only ever narrow message_attachments_insert.
drop policy if exists message_attachments_insert_not_across_block on public.message_attachments;
create policy message_attachments_insert_not_across_block
  on public.message_attachments
  as restrictive
  for insert
  to authenticated
  with check (not private.blocked_for_message(message_attachments.message_id));
