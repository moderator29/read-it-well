-- P1. A business is never left ownerless, and the way out is a transfer
-- somebody agreed to.
--
-- WHAT WAS OPEN. Section 11.10 of the ledger, third of the three items that
-- needed the founder's word: "A business keeps trading after its owner
-- deletes, with only the representative's personal columns scrubbed and no
-- precondition requiring a transfer, where a published listing has one."
--
-- The founder's ruling, and it decides every judgement in this file: nothing a
-- stranger can still transact against may be left ownerless. Past records
-- anonymise and stay, because they are history. Future commitments must be
-- resolved before the account can go.
--
-- `public.businesses` today carries `owner_id references auth.users on delete
-- cascade`, and the purge deliberately does not delete the auth row, so the
-- key still resolves after a deletion: it resolves onto a tombstone. A hotel
-- with published rooms, a restaurant taking tables tonight and a payout in
-- flight would keep selling, with a row behind it that no living person can
-- sign into. That is the exact shape of the harm the founder's principle
-- names, and it is worse than the published-listing case that already blocks,
-- because a business takes MONEY from a stranger rather than an enquiry.
--
-- WHAT THIS FILE ADDS.
--
--   1. `public.business_transfers`: an offer of ownership, with an accept
--      step, an expiry and no client write path at all.
--   2. Five functions that drive it, four of them service role only,
--      including the one address lookup this flow needs.
--   3. One read the owner's own screen is drawn from.
--   4. `public.account_deletion_blockers` gains a seventh number,
--      `owned_businesses`, so the deletion screen and the scheduled job
--      cannot disagree about whether a business is still trading.
--
-- WHY THERE IS AN ACCEPT STEP, AND IT IS NOT A NICETY.
--
-- Ownership of a business here is not a label. It carries the published
-- inventory a stranger books, the reservations a guest turns up for, the
-- settlement route the money takes and the papers a reviewer reads. Moving
-- that onto somebody without asking would make a person a merchant while they
-- slept, and it would hand anybody a way to dump a failing business, an open
-- dispute or a suspended row onto an account that never asked for it. An
-- ownership transfer nobody consented to is its own kind of fault, and it is
-- the kind that is discovered by the person who inherits the complaint.
--
-- So an offer is PENDING until the receiver accepts it, the acceptance IS the
-- consent record (it carries the instant, on the row, for ever), and an offer
-- nobody answers EXPIRES rather than sitting open: a business in limbo behind
-- an unanswered offer is the orphan again, wearing a different hat.
--
-- WHO MAY RECEIVE ONE, AND WHY IT IS NOT "A STAFF MEMBER".
--
-- THERE IS NO STAFF TABLE IN THIS ESTATE, and this migration does not invent
-- one. `public.businesses` has exactly one human column, `owner_id`, plus
-- `agent_id` pointing at the verified individual; nothing anywhere models a
-- second person who works at a business. Inventing a staff roster to satisfy
-- the phrase would have been a new permission system, written blind, in the
-- middle of a deletion fix. Named here rather than done.
--
-- So the eligible receiver is an EXISTING VALLO ACCOUNT, and the rules are the
-- ones that keep the business accountable rather than the ones that sound
-- tidy:
--
--   * not the person offering it, which the CHECK enforces rather than the
--     code;
--   * an account that exists. We never create one, because an account made to
--     receive a business is a person who has agreed to nothing;
--   * an account that has confirmed an email address or a telephone number, so
--     the notice reaches somebody real and a throwaway made that morning
--     cannot be used as a dumping ground;
--   * an account that is not itself banned;
--   * AND AN ACCOUNT THAT IS NOT ITSELF LEAVING. This is the rule the whole
--     precondition turns on. Handing a business to somebody whose own thirty
--     day clock is already running does not resolve the commitment, it moves
--     the orphan one account along and hides it behind a date. It is checked
--     when the offer is made AND again when it is accepted, because thirty
--     days is long enough for the receiver to change their mind about their
--     own account in between.
--
-- WHAT HAPPENS TO EVERYTHING KEYED TO THE OLD OWNER, ON ACCEPT.
--
-- This is the half of a transfer that is easy to forget and impossible to
-- forgive. Four things on `public.businesses` name the PERSON rather than the
-- business, and every one of them is wrong the moment the person changes:
--
--   `agent_id`      the verified human the badge hangs off. Rule 12: the
--                   verified badge only ever means a human was checked. The
--                   human who was checked has gone, so the pointer goes to
--                   null. A badge that outlives the person it vouched for is
--                   a lie with a tick next to it.
--   `representative_name`, `representative_phone`
--                   a named human being, and after the purge a name that
--                   belongs to somebody who asked us to forget it.
--   `consents`      three separate decisions, each stamped with the instant
--                   the OLD owner made it: accuracy, terms, processing. The
--                   new owner has made none of them. The schema's own rule is
--                   that an absent key is a consent not given, so the document
--                   is emptied rather than inherited.
--   `hygiene_attested_at`, `licence_attested_at`
--                   personal undertakings about a health permit and a state
--                   licence, rendered in the product as dated facts. A dated
--                   fact attested by a person who has left is not a fact.
--
-- AND THE IDENTITY RUNG IS SENT BACK TO PENDING. `public.businesses.verified`
-- is derived by trigger from `business_verification_checks`, and the identity
-- rung is a check against the REPRESENTATIVE'S papers, which
-- `business_documents` holds under the old owner's uploader id and which the
-- account purge deletes outright. So the rung is set back to `pending` with a
-- note saying why, the existing `business_verification_checks_sync` trigger
-- recomputes the tier, `private.derive_business_badge` clears
-- `verified`, and the business keeps trading without claiming a check that no
-- longer applies to anybody. The three rungs about the BUSINESS rather than
-- the person (registration, payout, on_site) are left exactly as they are,
-- because the CAC certificate and the site visit did not change hands.
--
-- That one write is the only place this file changes a row it did not create.
-- It is an UPDATE to a state the column already allows, not a drop and not a
-- delete: the rung row survives, its history survives, and what changes is a
-- status from 'passed' to 'pending'. It is the write that keeps rule 12 true,
-- and leaving it out would have shipped a verified badge for a person who is
-- not there.
--
-- WHAT THE BLOCKER COUNTS, AND THE ONE ARM THAT CANNOT BE COUNTED YET.
--
-- `owned_businesses` counts first-party businesses of theirs that a stranger
-- can still transact against or that still have money in flight:
--
--   a. the business row itself is PUBLISHED, so it is findable;
--   b. any accommodation under it is PUBLISHED, so its rooms are bookable;
--   c. it holds a PENDING or CONFIRMED reservation whose moment is still
--      ahead, so somebody is going to turn up;
--   d. it has traded (it has inventory or a reservation history) while money
--      is still in flight to its owner.
--
-- ARM (d) IS HONEST RATHER THAN NEAT, and the reason is worth writing down.
-- The founder named "pending payouts" as an arm, and there is today NO
-- business-level payout account in this schema: `public.payout_accounts` is
-- keyed to `public.agents.id`, which is keyed to a PERSON, and a host's
-- settlement lands in their own wallet. So a business's pending payout is, at
-- this date, the owner's pending withdrawal, which `pending_payouts` already
-- blocks in its own right. Arm (d) is written as "a business that has traded,
-- while its owner's money is still moving", which is the truthful reading of
-- the same sentence against the schema that exists. When a business-level
-- payout account is built, this arm narrows to it, and that is one line.
--
-- A DRAFT BUSINESS WITH NO INVENTORY AND NO HISTORY DOES NOT BLOCK, and that
-- is deliberate. Nobody can find it, nobody can book it and nobody is owed
-- anything by it. Blocking on it would be holding a data protection right
-- hostage to an abandoned form, which is the mistake the negative-balance
-- fault of 11.10 already cost this build once.
--
-- ADDITIVE. One new table, two indexes, one partial unique index, one SELECT
-- policy on that new table, four new functions and one `create or replace` of
-- an existing function that adds a key to its answer and changes no other
-- behaviour. No column, constraint, policy, grant or foreign key that existed
-- before this file is altered or dropped. The only `drop` line is the
-- `drop policy if exists` before its own `create policy`, which is the
-- idempotent shape every migration in this repository uses.
--
-- RULE 21, BORN LOCKED. Every function created here is `SECURITY DEFINER`, and
-- Supabase's default privileges would have made every one of them reachable at
-- `/rest/v1/rpc/<name>` the moment it existed. So each one revokes EXECUTE
-- from `public`, `anon` and `authenticated` in this same file and is granted
-- back only to the role that genuinely needs it, and the probe PROVES the
-- revoke instead of assuming it. Three of the four are service role only; the
-- fourth is a self-guarded read a signed-in person needs in order to see their
-- own offers.
--
-- NO PERSONAL DATA IS STORED BY THIS FILE. The transfer row is two user ids, a
-- business id, a status, two clocks and an optional note the offering owner
-- types. The board read answers with a business name and a public social
-- handle and never with an address or a telephone number.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the LEAD to run through `apply_migration`. One transaction, ended
-- by a deliberate `raise exception` so the whole thing rolls back and nothing
-- persists: no test row is ever left in a live product table. It fails loudly
-- on the first assertion that does not hold.
--
-- WHAT IT PROVES
--   1. RULE 21. None of the five new functions is executable by `anon`. The
--      four service-role functions are not executable by `authenticated`
--      either, and `public.business_transfer_board` is, because a signed-in
--      person needs to read their own offers. Proved off
--      `has_function_privilege`, not asserted in a comment. The address
--      lookup matters most here: reachable by a signed-in caller it would be
--      an account enumeration oracle for the whole estate.
--   2. `public.business_transfers` has RLS on and exactly one policy, a SELECT
--      policy, so the only writer is the service role. And the address lookup
--      answers null for an address nobody holds, so it cannot be read as a
--      yes for a miss.
--   3. AN OFFER ALONE MOVES NOTHING. After `offer_business_transfer` the
--      business still has its original owner. Consent is the only thing that
--      moves it.
--   4. A receiver who is themselves leaving is REFUSED, which is the rule that
--      stops the orphan being passed along.
--   5. On accept the owner changes AND every column keyed to the old owner is
--      cleared: `agent_id`, both representative columns, `consents`, both
--      attestations. The identity rung is back to `pending` and the badge is
--      off.
--   6. `account_deletion_blockers` answers with `owned_businesses`, counts a
--      PUBLISHED business, and stops counting it once the business has moved.
--   7. THE RLS CROSS-USER READ THAT MUST FAIL, and it is NOT vacuous: a
--      transfer row EXISTS in this transaction, and a stranger wearing an
--      `authenticated` JWT still reads ZERO. The Supabase MCP `execute_sql`
--      tool cannot show this, because the role it runs as carries
--      `rolbypassrls`; this probe sets the role itself. The board is asked
--      about somebody else and answers with BOTH lists empty.
--   8. THE SELF-ONLY GUARD IN THE BODY, which is worth more than the
--      privilege bit. The two readers here are DELIBERATELY executable by
--      `authenticated`, because the deletion screen and the transfer screen
--      call them as the signed-in person, so the privilege bit alone proves
--      nothing about safety. What stops a stranger reading somebody's wallet
--      balance, held escrow and future bookings is the guard inside
--      `account_deletion_blockers`, so the probe wears a stranger's JWT and
--      asserts it is REFUSED with `insufficient_privilege` rather than
--      answered with zeroes, which would be indistinguishable from an
--      account that genuinely has nothing.
--
--   begin;
--   --
--   do $probe$
--   declare
--     seller    uuid;
--     buyer     uuid;
--     leaver    uuid;
--     biz       uuid;
--     agent_row uuid;
--     transfer  uuid;
--     answer    jsonb;
--     verdict   jsonb;
--     n         integer;
--     fn        text;
--   begin
--     -- 1. RULE 21: born locked.
--     foreach fn in array array[
--       'offer_business_transfer', 'respond_to_business_transfer',
--       'withdraw_business_transfer', 'business_transfer_board',
--       'user_id_by_email_for_transfer'
--     ] loop
--       if not exists (
--         select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
--          where ns.nspname = 'public' and p.proname = fn and p.prosecdef
--       ) then
--         raise exception 'FAIL 1: public.% is missing or not SECURITY DEFINER', fn;
--       end if;
--       if exists (
--         select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
--          where ns.nspname = 'public' and p.proname = fn
--            and has_function_privilege('anon', p.oid, 'execute')
--       ) then
--         raise exception 'FAIL 1: public.% is executable by anon', fn;
--       end if;
--     end loop;
--     foreach fn in array array[
--       'offer_business_transfer', 'respond_to_business_transfer',
--       'withdraw_business_transfer', 'user_id_by_email_for_transfer'
--     ] loop
--       if exists (
--         select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
--          where ns.nspname = 'public' and p.proname = fn
--            and has_function_privilege('authenticated', p.oid, 'execute')
--       ) then
--         raise exception 'FAIL 1: public.% is executable by a signed-in caller', fn;
--       end if;
--     end loop;
--     if not has_function_privilege('authenticated', 'public.business_transfer_board(uuid)', 'execute') then
--       raise exception 'FAIL 1: a signed-in person cannot read their own offers';
--     end if;
--     if not has_function_privilege('authenticated', 'public.account_deletion_blockers(uuid)', 'execute') then
--       raise exception 'FAIL 1: the replaced blockers function lost its grant';
--     end if;
--     if has_function_privilege('anon', 'public.account_deletion_blockers(uuid)', 'execute') then
--       raise exception 'FAIL 1: the replaced blockers function is reachable by anon';
--     end if;
--   --
--     -- 2. the table, its RLS and its one policy
--     if not exists (
--       select 1 from pg_class where oid = 'public.business_transfers'::regclass and relrowsecurity
--     ) then
--       raise exception 'FAIL 2: RLS is not enabled on business_transfers';
--     end if;
--     select count(*) into n from pg_policy where polrelid = 'public.business_transfers'::regclass;
--     if n <> 1 then
--       raise exception 'FAIL 2: expected exactly one policy, found %', n;
--     end if;
--     if not exists (
--       select 1 from pg_policy
--        where polrelid = 'public.business_transfers'::regclass and polcmd = 'r'
--     ) then
--       raise exception 'FAIL 2: the one policy is not a SELECT policy';
--     end if;
--     if public.user_id_by_email_for_transfer('nobody@example.invalid') is not null then
--       raise exception 'FAIL 2: the address lookup answered for an address nobody holds';
--     end if;
--   --
--     /*
--      * THE FIXTURE IS CHOSEN BY THE ELIGIBILITY PREDICATE, NOT BY POSITION.
--      *
--      * Taking the first rows of `auth.users` by `created_at` is what the first
--      * draft of this probe did, and on the live estate the second such row is
--      * BANNED and has neither a confirmed email nor a confirmed telephone
--      * number. `offer_business_transfer` refused it with `receiver_unavailable`,
--      * correctly, and the probe read its own bad fixture as a fault in the
--      * migration. The eligibility rules are the thing under test, so the fixture
--      * has to satisfy them up front and the probe has to fail loudly if the
--      * estate cannot supply three accounts that do.
--      *
--      * The seller additionally owns no business and has no agent row of their
--      * own, because assertion 6b asserts the seller's `owned_businesses` falls
--      * to ZERO once the probe's business has moved. A seller who already owned a
--      * published business would make that assertion fail on a business the probe
--      * never created, which is a false red.
--      */
--     select u.id into seller
--       from auth.users u
--      where coalesce(u.banned_until, '-infinity'::timestamptz) <= now()
--        and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
--        and not exists (select 1 from public.account_deletion_requests r
--                         where r.user_id = u.id and r.status in ('SCHEDULED', 'PURGING'))
--        and not exists (select 1 from public.businesses b where b.owner_id = u.id)
--        and not exists (select 1 from public.agents a where a.user_id = u.id)
--      order by u.created_at
--      limit 1;
--   --
--     select u.id into buyer
--       from auth.users u
--      where u.id is distinct from seller
--        and coalesce(u.banned_until, '-infinity'::timestamptz) <= now()
--        and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
--        and not exists (select 1 from public.account_deletion_requests r
--                         where r.user_id = u.id and r.status in ('SCHEDULED', 'PURGING'))
--        and not exists (select 1 from public.businesses b where b.owner_id = u.id)
--      order by u.created_at
--      limit 1;
--   --
--     -- The leaver must pass the banned and contactable checks too, because those
--     -- are tested BEFORE the leaving check inside the function. A banned leaver
--     -- would be refused with `receiver_unavailable` and assertion 4 would pass
--     -- for entirely the wrong reason.
--     select u.id into leaver
--       from auth.users u
--      where u.id is distinct from seller
--        and u.id is distinct from buyer
--        and coalesce(u.banned_until, '-infinity'::timestamptz) <= now()
--        and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
--        and not exists (select 1 from public.account_deletion_requests r
--                         where r.user_id = u.id and r.status in ('SCHEDULED', 'PURGING'))
--      order by u.created_at
--      limit 1;
--   --
--     if seller is null or buyer is null or leaver is null then
--       raise exception 'PROBE NEEDS THREE ELIGIBLE AUTH USERS: not banned, contactable, not already leaving';
--     end if;
--   --
--     insert into public.agents (user_id, display_name)
--     values (seller, 'Probe agency, rolled back')
--     on conflict (user_id) do update set display_name = excluded.display_name
--     returning id into agent_row;
--   --
--     insert into public.businesses
--       (owner_id, agent_id, kind, name, slug, status,
--        representative_name, representative_phone, consents,
--        hygiene_attested_at, licence_attested_at)
--     values
--       (seller, agent_row, 'hotel', 'Probe house, rolled back',
--        'probe-house-rolled-back-' || left(replace(gen_random_uuid()::text, '-', ''), 8),
--        'PUBLISHED', 'Probe Representative', '+2348000000000',
--        jsonb_build_object('accuracy', now(), 'terms', now(), 'processing', now()),
--        now(), now())
--     returning id into biz;
--   --
--     insert into public.business_verification_checks (business_id, rung, status)
--     values (biz, 'identity', 'passed')
--     on conflict (business_id, rung) do update set status = 'passed';
--   --
--     if (select verified from public.businesses where id = biz) is not true then
--       raise exception 'FAIL 5 setup: the badge did not light, so its going out proves nothing';
--     end if;
--   --
--     -- 6a. the blocker sees it. The guard on this function is SELF ONLY, so the
--     -- probe has to wear the subject's own JWT to ask about the subject: asked
--     -- as postgres with no claims at all the function correctly refuses with
--     -- insufficient_privilege, and reading that refusal as a migration fault
--     -- would be reading the guard doing its job as a defect.
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', seller, 'role', 'authenticated')::text, true);
--     verdict := public.account_deletion_blockers(seller);
--     perform set_config('request.jwt.claims', '', true);
--     if not (verdict ? 'owned_businesses') then
--       raise exception 'FAIL 6: blockers does not answer with owned_businesses: %', verdict;
--     end if;
--     if (verdict ->> 'owned_businesses')::integer < 1 then
--       raise exception 'FAIL 6: a published business did not count as a blocker: %', verdict;
--     end if;
--     if (verdict ->> 'blocked')::boolean is not true then
--       raise exception 'FAIL 6: a published business did not block the deletion';
--     end if;
--   --
--     -- 4. a receiver who is leaving is refused
--     insert into public.account_deletion_requests (user_id, purge_after)
--     values (leaver, now() + interval '30 days');
--     answer := public.offer_business_transfer(biz, seller, leaver, null);
--     if (answer ->> 'offered')::boolean is not false
--        or answer ->> 'reason' <> 'receiver_leaving' then
--       raise exception 'FAIL 4: an offer to somebody who is leaving was accepted: %', answer;
--     end if;
--   --
--     -- 3. an offer alone moves nothing
--     answer := public.offer_business_transfer(biz, seller, buyer, 'Probe note, rolled back');
--     if (answer ->> 'offered')::boolean is not true then
--       raise exception 'FAIL 3: the offer was refused: %', answer;
--     end if;
--     transfer := (answer ->> 'transfer_id')::uuid;
--     if (select owner_id from public.businesses where id = biz) <> seller then
--       raise exception 'FAIL 3: an unaccepted offer moved the business';
--     end if;
--   --
--     -- 5. accepting moves it, and everything keyed to the old owner goes
--     answer := public.respond_to_business_transfer(transfer, buyer, true);
--     if (answer ->> 'accepted')::boolean is not true then
--       raise exception 'FAIL 5: the acceptance was refused: %', answer;
--     end if;
--     if (select owner_id from public.businesses where id = biz) <> buyer then
--       raise exception 'FAIL 5: the business did not move';
--     end if;
--     if exists (
--       select 1 from public.businesses
--        where id = biz
--          and (agent_id is not null
--               or representative_name is not null
--               or representative_phone is not null
--               or consents <> '{}'::jsonb
--               or hygiene_attested_at is not null
--               or licence_attested_at is not null)
--     ) then
--       raise exception 'FAIL 5: something keyed to the old owner survived the transfer';
--     end if;
--     if (select status from public.business_verification_checks
--          where business_id = biz and rung = 'identity') <> 'pending' then
--       raise exception 'FAIL 5: the identity rung still claims the old owner was checked';
--     end if;
--     if (select verified from public.businesses where id = biz) is not false then
--       raise exception 'FAIL 5: the badge outlived the person it vouched for';
--     end if;
--     if (select verification_tier from public.businesses where id = biz) <> 0 then
--       raise exception 'FAIL 5: the tier did not fall with the identity rung';
--     end if;
--   --
--     -- 6b. and the blocker stops counting it
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', seller, 'role', 'authenticated')::text, true);
--     verdict := public.account_deletion_blockers(seller);
--     perform set_config('request.jwt.claims', '', true);
--     if (verdict ->> 'owned_businesses')::integer <> 0 then
--       raise exception 'FAIL 6: the business still counts against the person who gave it away: %', verdict;
--     end if;
--   --
--     raise notice 'PASS 1-6';
--   end;
--   $probe$;
--   --
--   -- 7. THE RLS CROSS-USER READ THAT MUST FAIL, and it is not vacuous.
--   do $rls$
--   declare
--     stranger uuid;
--     party    uuid;
--     rows_now integer;
--     leaked   integer;
--   begin
--     select from_user_id into party from public.business_transfers limit 1;
--     select count(*) into rows_now from public.business_transfers;
--     if rows_now < 1 then
--       raise exception 'FAIL 7: the read would be vacuous, there is no transfer row to leak';
--     end if;
--     select id into stranger from auth.users
--      where id not in (select from_user_id from public.business_transfers
--                        union select to_user_id from public.business_transfers)
--      order by created_at limit 1;
--     if stranger is null then
--       raise exception 'PROBE NEEDS A FOURTH AUTH USER WHO IS PARTY TO NOTHING';
--     end if;
--   --
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--   --
--     select count(*) into leaked from public.business_transfers;
--   --
--     perform set_config('role', 'postgres', true);
--   --
--     if leaked <> 0 then
--       raise exception 'FAIL 7: a stranger read % transfer rows of the % that exist', leaked, rows_now;
--     end if;
--   --
--     -- and the board refuses to answer about somebody else, on BOTH lists
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--     if jsonb_array_length(public.business_transfer_board(party) -> 'outgoing') <> 0
--        or jsonb_array_length(public.business_transfer_board(party) -> 'incoming') <> 0 then
--       perform set_config('role', 'postgres', true);
--       raise exception 'FAIL 7: a stranger read somebody else''s offers';
--     end if;
--   --
--     /*
--      * 8. THE GUARD INSIDE THE BODY, WHICH IS WORTH MORE THAN THE PRIVILEGE BIT.
--      *
--      * `account_deletion_blockers` and `business_transfer_board` are DELIBERATELY
--      * executable by `authenticated`, because the deletion screen and the
--      * transfer screen call them as the signed-in person. So the privilege bit
--      * alone proves nothing about safety here. What actually stops a stranger
--      * reading somebody's wallet balance, held escrow and future bookings is the
--      * self-only guard in the body, and that is what gets proved: a stranger
--      * wearing an authenticated JWT must be REFUSED outright, not merely answered
--      * with zeroes, because zeroes would be indistinguishable from an account
--      * that genuinely has nothing.
--      */
--     begin
--       perform public.account_deletion_blockers(party);
--       perform set_config('role', 'postgres', true);
--       raise exception 'FAIL 8: a stranger read somebody else''s deletion blockers';
--     exception
--       when insufficient_privilege then
--         null;
--     end;
--     perform set_config('role', 'postgres', true);
--   --
--     raise exception 'PROBE ALL PASS p1 business transfer, rolling back';
--   end;
--   $rls$;
--   --
--   rollback;
-- ---------------------------------------------------------------------------

/* ------------------------------------------------------------ the offer */

create table if not exists public.business_transfers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id   uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'PENDING'
                 check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED')),
  -- What the owner wants to say to the person receiving it. Bounded, because
  -- it is free text one person writes into another person's inbox.
  note         text check (note is null or length(note) <= 400),
  offered_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  responded_at timestamptz,
  -- Enforced by the database rather than remembered by the code.
  constraint business_transfers_not_to_self_chk check (to_user_id <> from_user_id),
  constraint business_transfers_settled_has_instant_chk
    check (status = 'PENDING' or responded_at is not null)
);

comment on table public.business_transfers is
  'An offer of business ownership, PENDING until the receiver accepts it. The accepted row is the consent record: an ownership transfer nobody agreed to is its own kind of fault. Never carries an address or a telephone number.';

-- One live offer per business. A business with two open offers is a business
-- whose next owner depends on who reads their notifications first.
create unique index if not exists business_transfers_one_open
  on public.business_transfers (business_id)
  where status = 'PENDING';

create index if not exists business_transfers_to_idx
  on public.business_transfers (to_user_id, offered_at desc);
create index if not exists business_transfers_from_idx
  on public.business_transfers (from_user_id, offered_at desc);

alter table public.business_transfers enable row level security;

-- Both parties may READ the offer between them, which is what the transfer
-- screen and the receiver's inbox are drawn from. Nobody may write through
-- RLS at all: the only writer is the service role, through the functions
-- below. This is the shape `public.account_deletion_requests` carries.
drop policy if exists business_transfers_select_party on public.business_transfers;
create policy business_transfers_select_party
  on public.business_transfers
  for select
  to authenticated
  using (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
  );

grant select on public.business_transfers to authenticated;
grant select, insert, update on public.business_transfers to service_role;

/* ------------------------------------------- one address, one uuid or null */

/*
 * Turn an email address into the account it belongs to, for the transfer flow
 * and nothing else.
 *
 * WHY THIS EXISTS AT ALL. `public.profiles` carries no address by design and
 * the auth schema is not exposed over PostgREST, so there is nowhere for the
 * server action to resolve the address a host types into the handover form.
 * `public.admin_user_id_by_email` is the same shape for the money desk, but
 * its guard is `private.has_role(auth.uid(), 'admin')` and the service role
 * carries no `auth.uid()`, so it answers null here and cannot be reused.
 *
 * WHY IT IS SERVICE ROLE ONLY, AND THIS IS THE WHOLE POINT. Reachable by a
 * signed-in caller, this is an account enumeration oracle for every address
 * anybody cares to try. It is never called from a client: the server action
 * proves, through the caller's own RLS-bound client, that they own the
 * business they are giving away, paces them per account, and only then asks
 * this question with the service key. It answers with one uuid or null, never
 * with a row of `auth.users` and never with the address back.
 */
create or replace function public.user_id_by_email_for_transfer(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_found uuid;
begin
  if p_email is null or length(btrim(p_email)) = 0 then
    return null;
  end if;

  select u.id
    into v_found
    from auth.users u
   where lower(u.email) = lower(btrim(p_email))
   limit 1;

  return v_found;
end;
$$;

revoke all on function public.user_id_by_email_for_transfer(text)
  from public, anon, authenticated;
grant execute on function public.user_id_by_email_for_transfer(text) to service_role;

comment on function public.user_id_by_email_for_transfer(text) is
  'One address in, one uuid or null out, for the business handover flow. Service role only: reachable by a signed-in caller it would be an account enumeration oracle.';

/* --------------------------------------------------------- offering one */

create or replace function public.offer_business_transfer(
  p_business uuid,
  p_from     uuid,
  p_to       uuid,
  p_note     text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_biz      public.businesses;
  v_to       record;
  v_transfer public.business_transfers;
  v_name     text;
begin
  if p_business is null or p_from is null or p_to is null then
    return jsonb_build_object('offered', false, 'reason', 'incomplete');
  end if;

  -- An offer that has been sitting unanswered past its date is dead, and a
  -- dead offer must not hold the business in limbo. Cleared here, where the
  -- next offer is being made, rather than by a job nobody watches.
  update public.business_transfers
     set status = 'EXPIRED', responded_at = now()
   where business_id = p_business
     and status = 'PENDING'
     and expires_at <= now();

  select * into v_biz from public.businesses where id = p_business;
  if not found then
    return jsonb_build_object('offered', false, 'reason', 'no_business');
  end if;
  if v_biz.owner_id is distinct from p_from then
    return jsonb_build_object('offered', false, 'reason', 'not_owner');
  end if;
  if v_biz.source is distinct from 'first_party' then
    -- A partner row has no owner by construction, so there is nothing to move.
    return jsonb_build_object('offered', false, 'reason', 'not_transferable');
  end if;
  if p_to = p_from then
    return jsonb_build_object('offered', false, 'reason', 'same_person');
  end if;

  select u.id,
         u.banned_until,
         u.email_confirmed_at,
         u.phone_confirmed_at
    into v_to
    from auth.users u
   where u.id = p_to;

  if not found then
    return jsonb_build_object('offered', false, 'reason', 'no_account');
  end if;
  if v_to.banned_until is not null and v_to.banned_until > now() then
    return jsonb_build_object('offered', false, 'reason', 'receiver_unavailable');
  end if;
  if v_to.email_confirmed_at is null and v_to.phone_confirmed_at is null then
    return jsonb_build_object('offered', false, 'reason', 'receiver_unconfirmed');
  end if;

  -- THE RULE THE WHOLE PRECONDITION TURNS ON. Handing a business to somebody
  -- whose own clock is already running moves the orphan one account along and
  -- hides it behind a date.
  if exists (
    select 1 from public.account_deletion_requests r
     where r.user_id = p_to and r.status in ('SCHEDULED', 'PURGING')
  ) then
    return jsonb_build_object('offered', false, 'reason', 'receiver_leaving');
  end if;

  if exists (
    select 1 from public.business_transfers t
     where t.business_id = p_business and t.status = 'PENDING' and t.expires_at > now()
  ) then
    return jsonb_build_object('offered', false, 'reason', 'already_offered');
  end if;

  insert into public.business_transfers
    (business_id, from_user_id, to_user_id, note, expires_at)
  values
    (p_business, p_from, p_to, nullif(btrim(coalesce(p_note, '')), ''), now() + interval '14 days')
  returning * into v_transfer;

  v_name := v_biz.name;
  perform private.notify(
    p_to, 'system',
    'Somebody wants to hand you a business',
    v_name || ' has been offered to you. Nothing changes until you accept it, and it expires in fourteen days.',
    '/host/transfer');

  return jsonb_build_object(
    'offered', true,
    'transfer_id', v_transfer.id,
    'business_id', p_business,
    'expires_at', v_transfer.expires_at);
end;
$$;

revoke all on function public.offer_business_transfer(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.offer_business_transfer(uuid, uuid, uuid, text)
  to service_role;

comment on function public.offer_business_transfer(uuid, uuid, uuid, text) is
  'Offer a business to another account. Service role only: the app resolves the address and proves the caller owns the business before it is called, so no email lookup is ever reachable over PostgREST.';

/* ------------------------------------------------------ answering one */

create or replace function public.respond_to_business_transfer(
  p_transfer uuid,
  p_user     uuid,
  p_accept   boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer public.business_transfers;
  v_biz      public.businesses;
begin
  if p_transfer is null or p_user is null then
    return jsonb_build_object('accepted', false, 'reason', 'incomplete');
  end if;

  select * into v_transfer
    from public.business_transfers
   where id = p_transfer
   for update;

  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'not_found');
  end if;
  -- Only the person it was offered to may answer it. The service role calls
  -- this on their behalf, so the subject is checked here rather than assumed.
  if v_transfer.to_user_id is distinct from p_user then
    return jsonb_build_object('accepted', false, 'reason', 'not_yours');
  end if;
  if v_transfer.status <> 'PENDING' then
    return jsonb_build_object('accepted', false, 'reason', 'not_open',
                              'status', v_transfer.status);
  end if;
  if v_transfer.expires_at <= now() then
    update public.business_transfers
       set status = 'EXPIRED', responded_at = now()
     where id = p_transfer;
    return jsonb_build_object('accepted', false, 'reason', 'expired');
  end if;

  if coalesce(p_accept, false) is false then
    update public.business_transfers
       set status = 'DECLINED', responded_at = now()
     where id = p_transfer;
    perform private.notify(
      v_transfer.from_user_id, 'system',
      'Your transfer was declined',
      'The person you offered the business to said no. It is still yours, and you can offer it to somebody else.',
      '/host/transfer');
    return jsonb_build_object('accepted', false, 'declined', true, 'reason', 'declined');
  end if;

  select * into v_biz from public.businesses where id = v_transfer.business_id for update;
  if not found then
    update public.business_transfers
       set status = 'EXPIRED', responded_at = now()
     where id = p_transfer;
    return jsonb_build_object('accepted', false, 'reason', 'no_business');
  end if;
  -- Fourteen days is long enough for the owner to have changed, and accepting
  -- an offer from somebody who is no longer the owner would take a business
  -- off a person who never agreed to lose it.
  if v_biz.owner_id is distinct from v_transfer.from_user_id then
    update public.business_transfers
       set status = 'EXPIRED', responded_at = now()
     where id = p_transfer;
    return jsonb_build_object('accepted', false, 'reason', 'no_longer_theirs');
  end if;
  -- And long enough for the RECEIVER to have decided to leave. Checked again,
  -- because the offer check was fourteen days ago.
  if exists (
    select 1 from public.account_deletion_requests r
     where r.user_id = p_user and r.status in ('SCHEDULED', 'PURGING')
  ) then
    return jsonb_build_object('accepted', false, 'reason', 'receiver_leaving');
  end if;

  /*
   * THE HANDOVER. Everything on this row that names the OLD PERSON goes with
   * them, and the header says why for each one. The badge goes out because
   * rule 12 says a verified badge only ever means a human was checked, and the
   * human who was checked has left.
   */
  update public.businesses
     set owner_id             = p_user,
         agent_id             = null,
         representative_name  = null,
         representative_phone = null,
         consents             = '{}'::jsonb,
         hygiene_attested_at  = null,
         licence_attested_at  = null
   where id = v_biz.id;

  -- The identity rung was a check against the old owner's papers, and the
  -- account purge deletes those papers outright. Back to pending, with the
  -- reason on the row; the sync trigger recomputes the tier and the badge
  -- trigger puts the tick out. Registration, payout and on_site are left
  -- alone: the CAC certificate and the site visit did not change hands.
  insert into public.business_verification_checks (business_id, rung, status, note, reviewer_id)
  values (v_biz.id, 'identity', 'pending',
          'Ownership changed. The identity rung is re-checked against the new owner.', null)
  on conflict (business_id, rung) do update
     set status      = 'pending',
         note        = excluded.note,
         reviewer_id = null,
         decided_at  = now();

  update public.business_transfers
     set status = 'ACCEPTED', responded_at = now()
   where id = p_transfer;

  -- Any other offer of the same business is dead now.
  update public.business_transfers
     set status = 'EXPIRED', responded_at = now()
   where business_id = v_biz.id and status = 'PENDING' and id <> p_transfer;

  perform private.notify(
    v_transfer.from_user_id, 'system',
    'Your business has a new owner',
    v_biz.name || ' now belongs to the person you offered it to. It is no longer on your account.',
    '/host');
  perform private.notify(
    p_user, 'system',
    'You now own a business on Vallo',
    v_biz.name || ' is yours. The verified badge is off until your own identity check passes, and the consents and attestations are yours to make.',
    '/host');

  return jsonb_build_object(
    'accepted', true,
    'transfer_id', p_transfer,
    'business_id', v_biz.id);
end;
$$;

revoke all on function public.respond_to_business_transfer(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.respond_to_business_transfer(uuid, uuid, boolean)
  to service_role;

/* ------------------------------------------------------ taking one back */

create or replace function public.withdraw_business_transfer(
  p_transfer uuid,
  p_user     uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer public.business_transfers;
begin
  if p_transfer is null or p_user is null then
    return jsonb_build_object('withdrawn', false, 'reason', 'incomplete');
  end if;

  update public.business_transfers
     set status = 'WITHDRAWN', responded_at = now()
   where id = p_transfer
     and from_user_id = p_user
     and status = 'PENDING'
  returning * into v_transfer;

  if not found then
    return jsonb_build_object('withdrawn', false, 'reason', 'not_open');
  end if;

  perform private.notify(
    v_transfer.to_user_id, 'system',
    'A business offer was taken back',
    'The owner withdrew the offer before you answered it. Nothing has changed on your account.',
    '/host/transfer');

  return jsonb_build_object('withdrawn', true, 'transfer_id', p_transfer);
end;
$$;

revoke all on function public.withdraw_business_transfer(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.withdraw_business_transfer(uuid, uuid)
  to service_role;

/* ------------------------------------------------- what the screen reads */

create or replace function public.business_transfer_board(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_out jsonb;
  v_in  jsonb;
begin
  if p_user is null then
    return jsonb_build_object('outgoing', '[]'::jsonb, 'incoming', '[]'::jsonb);
  end if;

  -- Self only, the same guard `public.account_deletion_blockers` carries. A
  -- caller who is neither the subject nor the service role gets empty lists
  -- rather than an error, because this read sits on a screen and a screen that
  -- 500s has told somebody nothing.
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', current_user)
       is distinct from 'service_role'
     and (select auth.uid()) is distinct from p_user then
    return jsonb_build_object('outgoing', '[]'::jsonb, 'incoming', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(entry)::jsonb order by entry.offered_at desc), '[]'::jsonb)
    into v_out
    from (
      select t.id            as transfer_id,
             t.business_id,
             b.name          as business_name,
             t.status,
             t.offered_at,
             t.expires_at,
             -- Public handle only. Never an address, never a telephone number.
             sp.handle       as counterparty_handle
        from public.business_transfers t
        join public.businesses b on b.id = t.business_id
        left join public.social_profiles sp on sp.user_id = t.to_user_id
       where t.from_user_id = p_user
         and (t.status <> 'PENDING' or t.expires_at > now())
       order by t.offered_at desc
       limit 50
    ) entry;

  select coalesce(jsonb_agg(row_to_json(entry)::jsonb order by entry.offered_at desc), '[]'::jsonb)
    into v_in
    from (
      select t.id            as transfer_id,
             t.business_id,
             b.name          as business_name,
             b.kind::text    as business_kind,
             t.status,
             t.note,
             t.offered_at,
             t.expires_at,
             sp.handle       as counterparty_handle
        from public.business_transfers t
        join public.businesses b on b.id = t.business_id
        left join public.social_profiles sp on sp.user_id = t.from_user_id
       where t.to_user_id = p_user
         and (t.status <> 'PENDING' or t.expires_at > now())
       order by t.offered_at desc
       limit 50
    ) entry;

  return jsonb_build_object('outgoing', v_out, 'incoming', v_in);
end;
$$;

revoke all on function public.business_transfer_board(uuid) from public, anon, authenticated;
grant execute on function public.business_transfer_board(uuid) to authenticated, service_role;

/* ------------------------------- the seventh number on the deletion screen */

/*
 * `public.account_deletion_blockers`, replaced so it answers with
 * `owned_businesses` as well as the six it already answered with.
 *
 * EVERY OTHER LINE OF THIS FUNCTION IS UNCHANGED, deliberately, including the
 * `v_balance > 0` that the lead corrected on apply day: a NEGATIVE balance
 * still does not block, because a reconciliation error must never be usable as
 * leverage against a data protection right, and because the on-screen list in
 * `lib/account-deletion/preconditions.ts` computes the same rule. The two
 * disagreeing was the second of the two faults section 11.10 records, and this
 * replacement does not reopen it.
 *
 * The grants are restated below rather than assumed. `create or replace` keeps
 * the existing privileges, but rule 21 says the revoke is proved in the same
 * migration rather than inherited from one applied earlier, and a restated
 * revoke of a grant the function never legitimately had takes nothing from
 * anybody.
 */
create or replace function public.account_deletion_blockers(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_balance   bigint  := 0;
  v_held      bigint  := 0;
  v_bookings  integer := 0;
  v_reserves  integer := 0;
  v_payouts   integer := 0;
  v_listings  integer := 0;
  v_business  integer := 0;
begin
  if p_user is null then
    raise exception 'account_deletion_blockers needs a user'
      using errcode = 'invalid_parameter_value';
  end if;

  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', current_user)
       is distinct from 'service_role'
     and (select auth.uid()) is distinct from p_user then
    raise exception 'account_deletion_blockers may only be asked about yourself'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(sum(b.balance_minor), 0) into v_balance
    from public.wallet_balances b
   where b.user_id = p_user;

  select coalesce(sum(e.amount_minor), 0) into v_held
    from public.escrows e
   where (e.payer_id = p_user or e.payee_id = p_user)
     and e.state in ('FUNDED', 'HELD', 'RELEASE_REQUESTED', 'DISPUTED');

  select count(*) into v_bookings
    from public.bookings b
   where b.guest_id = p_user
     and (b.status in ('PENDING', 'CONFIRMED') and b.check_out >= current_date);

  select count(*) into v_reserves
    from public.reservations r
   where r.guest_id = p_user
     and r.status in ('PENDING', 'CONFIRMED')
     and r.reserved_for >= now();

  select count(*) into v_payouts
    from public.wallet_entries we
    join public.wallets w on w.id = we.wallet_id
   where w.user_id = p_user
     and we.kind = 'withdrawal'
     and we.status = 'PENDING';

  select count(*) into v_listings
    from public.listings l
    join public.agents a on a.id = l.agent_id
   where a.user_id = p_user
     and l.status = 'PUBLISHED';

  /*
   * A BUSINESS A STRANGER CAN STILL TRANSACT AGAINST.
   *
   * Four arms, and the header of this migration argues each one. The short
   * version: findable, bookable, expected, or still owed money. A DRAFT
   * business with no inventory and no history does not count, because nobody
   * can find it, nobody can book it and nobody is owed anything by it.
   */
  select count(*) into v_business
    from public.businesses b
   where b.owner_id = p_user
     and b.source = 'first_party'
     and (
       b.status = 'PUBLISHED'
       or exists (
         select 1 from public.accommodations a
          where a.business_id = b.id and a.status = 'PUBLISHED')
       or exists (
         select 1 from public.reservations r
          where r.business_id = b.id
            and r.status in ('PENDING', 'CONFIRMED')
            and r.reserved_for >= now())
       or (
         (v_payouts > 0 or v_held <> 0)
         and (
           exists (select 1 from public.accommodations a where a.business_id = b.id)
           or exists (select 1 from public.reservations r where r.business_id = b.id)
         )
       )
     );

  return jsonb_build_object(
    'blocked', (v_balance > 0 or v_held <> 0 or v_bookings > 0
                or v_reserves > 0 or v_payouts > 0 or v_listings > 0
                or v_business > 0),
    'wallet_balance_minor', v_balance,
    'wallet_held_minor', v_held,
    'active_bookings', v_bookings,
    'active_reservations', v_reserves,
    'pending_payouts', v_payouts,
    'published_listings', v_listings,
    'owned_businesses', v_business
  );
end;
$$;

revoke all on function public.account_deletion_blockers(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_blockers(uuid) to authenticated, service_role;
