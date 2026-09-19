-- B4, from R3's open list. A flag stops keeping the account number.
--
-- THE FINDING. private.scan_message() runs after every message insert and, on
-- a ten digit run, writes that run verbatim into public.message_flags.matched:
--
--   insert into public.message_flags (message_id, reason, matched)
--   values (new.id, 'account_number', substring(new.body from '\d{10}'));
--
-- A Nigerian NUBAN account number is exactly ten digits, which is what that
-- pattern is for. So the single most sensitive string a person types into this
-- product is copied out of the message and into a second table, with its own
-- retention, its own index and its own admin read policy, in plain text. Rule
-- 16 says a bank account number is never written into a log, a report or a
-- document; a moderation table is all three.
--
-- WHAT THE FLAG IS ACTUALLY FOR. A moderator decides whether somebody is being
-- talked off the platform and asked to pay a stranger directly. The decision
-- needs the reason ('account_number'), the message and the thread around it,
-- all of which the admin flags screen already loads from public.messages. It
-- has never needed a second copy of the digits, and the tail is enough to read
-- the row on its own ("the one ending 4821") without the screen fetching the
-- message.
--
-- WHAT CHANGES. The account_number branch stores six bullets and the last four
-- digits, which is exactly the shape lib/admin/payments-queries.ts
-- maskAccountNumber prints for a saved bank account, so the console reads one
-- masking everywhere. The string keeps its length, so nothing about the row
-- changes shape. The payment_keyword branch is untouched: it stores a word out
-- of a fixed list ('bank', 'transfer', 'acct'), which is not personal data.
--
-- WHAT DOES NOT CHANGE, AND WHY IT IS A SEPARATE FILE. Rows already written
-- still hold the digits. Masking them is an UPDATE of existing data, which is
-- a data-losing change and sits on the stop list, so it is drafted in
-- supabase/migrations/pending/ and waits for the founder's word. This file
-- stops the next one being written and is safe to apply on its own: it is
-- forward looking only and touches no row.
--
-- ADDITIVE. One CREATE OR REPLACE of a trigger function. The trigger, the
-- table, its columns, its policies and its grants are all untouched, and no
-- existing row is read or written.
--
-- ONE CONSEQUENCE FOR THE MODERATION DESK, WHICH IS NOT MINE TO EDIT.
-- lib/admin/queries.ts filters the flags queue with
-- `.ilike("matched", "%term%")`. After this file a search for a whole account
-- number matches nothing and a search for its last four digits matches. That
-- is the correct direction (an operator should not be able to sweep the
-- platform by typing somebody's account number into a search box) but the
-- field's hint should say "the last four digits" rather than leaving an
-- operator to wonder. Reported to the lead rather than changed here, because
-- that file belongs to another scope.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the lead, through the Supabase MCP, as ONE statement batch that
-- ends in ROLLBACK. NOT RUN FROM THE SANDBOX, which holds no database
-- credentials, so nothing below has been executed by its author.
--
-- It proves that a message carrying a ten digit run is still flagged, that the
-- digits are no longer in the flag row, that the keyword branch is unchanged,
-- and that THE CROSS-USER READ FAILS: message_flags carries no select policy
-- for anybody but staff, so a party to the conversation reads none of it, and
-- a stranger reads neither the flag nor the message.
--
--   begin;
--
--   insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
--   values
--     ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mf-probe-guest@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
--     ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mf-probe-agent@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
--     ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mf-probe-third@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');
--
--   insert into public.agents (id, user_id, display_name)
--   values ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000a2', 'MF probe agent');
--
--   insert into public.listings (id, agent_id, title, property_type, is_demo, status)
--   values ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-0000000000a4', 'MF probe flat', 'apartment', false, 'PUBLISHED');
--
--   insert into public.conversations (id, listing_id, guest_id, agent_id)
--   values ('00000000-0000-4000-8000-0000000000a6', '00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2');
--
--   do $probe$
--   declare
--     guest uuid := '00000000-0000-4000-8000-0000000000a1';
--     third uuid := '00000000-0000-4000-8000-0000000000a3';
--     convo uuid := '00000000-0000-4000-8000-0000000000a6';
--     kept  text;
--     n     integer;
--   begin
--     -- A message that names an account number and asks for a transfer, which
--     -- is the exact case the scanner exists for. The digits are invented.
--     insert into public.messages (id, conversation_id, sender_id, body)
--     values ('00000000-0000-4000-8000-0000000000a7', convo, guest, 'Please transfer to 0123456789 at the bank.');
--
--     select count(*) into n from public.message_flags
--      where message_id = '00000000-0000-4000-8000-0000000000a7' and reason = 'account_number';
--     if n <> 1 then raise exception 'FAIL 1: % account_number flags, expected 1', n; end if;
--
--     select matched into kept from public.message_flags
--      where message_id = '00000000-0000-4000-8000-0000000000a7' and reason = 'account_number';
--     if kept like '%0123456789%' then raise exception 'FAIL 1: THE FLAG STILL HOLDS THE WHOLE NUMBER: %', kept; end if;
--     if kept <> '••••••6789' then raise exception 'FAIL 1: matched is %, expected six bullets and 6789', kept; end if;
--     raise notice 'PASS 1: still flagged, and the flag holds only the tail';
--
--     select count(*) into n from public.message_flags
--      where message_id = '00000000-0000-4000-8000-0000000000a7' and reason = 'payment_keyword';
--     if n <> 1 then raise exception 'FAIL 2: % payment_keyword flags, expected 1', n; end if;
--     raise notice 'PASS 2: the keyword branch is unchanged';
--
--     -- 3. THE CROSS-USER READ, WHICH MUST FAIL. message_flags publishes to
--     --    staff only, so even the person who wrote the message reads nothing.
--     perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
--     set local role authenticated;
--     select count(*) into n from public.message_flags;
--     if n <> 0 then raise exception 'FAIL 3: the message''s own author read % flag rows', n; end if;
--     select count(*) into n from public.messages where conversation_id = convo;
--     if n <> 1 then raise exception 'FAIL 3: a party to the thread reads % of its messages, expected 1', n; end if;
--     reset role;
--
--     perform set_config('request.jwt.claims', json_build_object('sub', third, 'role', 'authenticated')::text, true);
--     set local role authenticated;
--     select count(*) into n from public.message_flags;
--     if n <> 0 then raise exception 'FAIL 3: A STRANGER READ % FLAG ROWS', n; end if;
--     select count(*) into n from public.messages where conversation_id = convo;
--     if n <> 0 then raise exception 'FAIL 3: A STRANGER READ % MESSAGES IN SOMEBODY ELSE''S THREAD', n; end if;
--     reset role;
--     perform set_config('request.jwt.claims', '', true);
--     raise notice 'PASS 3: author 0 flags and 1 message; a third account 0 flags and 0 messages';
--
--     raise notice 'ALL PASS. Rolling back.';
--   end $probe$;
--
--   rollback;
-- ---------------------------------------------------------------------------

create or replace function private.scan_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  digits          text;
begin
  digits := substring(new.body from '\d{10}');
  if digits is not null then
    -- The tail only. Six bullets and four digits, the same shape
    -- maskAccountNumber prints in the payments console, so one masking is read
    -- everywhere and the moderator can still say "the one ending 6789" without
    -- this table holding a number anybody could pay into.
    insert into public.message_flags (message_id, reason, matched)
    values (new.id, 'account_number', repeat('•', 6) || right(digits, 4));
  end if;

  if new.body ~* keyword_pattern then
    insert into public.message_flags (message_id, reason, matched)
    values (new.id, 'payment_keyword', substring(lower(new.body) from keyword_pattern));
  end if;

  return new;
end;
$$;

comment on function private.scan_message() is
  'Flags a message that carries a ten digit run or payment talk. The run is stored masked to its last four digits: a moderator needs the reason and the thread, never a second plain-text copy of somebody''s account number in a second table.';
