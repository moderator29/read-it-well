-- B5. The purge runs in one transaction, and the ledger survives it.
--
-- WHAT THIS IS. The second half of the F-17 fix. The first migration made a
-- deletion request a row with a thirty day clock on it. This one is what
-- happens when the clock runs out.
--
-- THE SHAPE OF THE ANSWER, AND WHY IT IS NOT A DELETE.
--
-- `auth.users` cannot be deleted for anybody who has transacted, and that is
-- correct rather than a bug: six foreign keys onto it are `on delete restrict`
-- (`bookings_guest_id_fkey`, `wallets_user_id_fkey`, `escrows_payer_id_fkey`,
-- `escrows_payee_id_fkey`, `rent_payments_tenant_id_fkey`,
-- `rent_payments_lister_id_fkey`) and three more are `no action`, which aborts
-- a delete just as surely. Vallo is SCUML registered; Nigerian anti-money-
-- laundering obligations require transaction records to be retained, so
-- destroying the financial spine would be unlawful rather than thorough.
--
-- The usual answer is a tombstone account, and the question is WHICH tombstone.
-- A SINGLE SHARED TOMBSTONE IS ARITHMETICALLY IMPOSSIBLE HERE:
-- `wallets.user_id` is UNIQUE, so one shared row could hold exactly one
-- deleted person's wallet and the second deletion would fail. It is also wrong
-- in principle: merging every departed person into one identity destroys the
-- per-subject attribution that the retention obligation exists to preserve,
-- and it would make one thread show two different people as the same sender.
--
-- So the tombstone is PER PERSON, and it is their own `auth.users` row,
-- stripped. After this function runs, that row is a uuid and nothing else: no
-- address, no telephone number, no name, no password, no identity provider,
-- no session, and banned until `infinity` so it can never be signed into
-- again. Every foreign key still resolves, so nothing is altered and nothing
-- is dropped; every retained financial row still points at a distinct subject,
-- so the ledger is still auditable; and
-- `messages.sender_id`, which is NOT NULL and which the stop list forbids
-- relaxing, still points at a real row, so THE COUNTERPARTY'S THREAD STAYS
-- READABLE with an anonymous sender instead of a hole where a sender was.
--
-- Deleting the `auth.users` row would have done the opposite of what is
-- wanted: `messages_sender_id_fkey` is ON DELETE CASCADE, so it would have
-- destroyed the other person's conversation.
--
-- WHAT IS DESTROYED, WHAT IS KEPT. The full ledger is in
-- `apps/web/src/lib/account-deletion/plan.ts` and the two lists agree line for
-- line, deliberately, so the privacy document, the screen and this function
-- can be checked against one another.
--
-- ONE THING IS NOT A DELETE AND NOT A KEEP. A post or a story comment of
-- theirs that carries a REPLY WRITTEN BY SOMEBODY ELSE is emptied rather than
-- deleted, because `posts_parent_id_fkey`, `posts_root_id_fkey` and
-- `story_comments_parent_id_fkey` are ON DELETE CASCADE and deleting the
-- parent would take a stranger's words with it. Both tables have a nullable
-- `author_id` and `posts` has `removed_at`, so the schema already anticipated
-- an author-less tombstone. Nothing of theirs survives either way: the body
-- goes, the media rows go, the objects are purged.
--
-- STORAGE IS NOT PURGED HERE, AND CANNOT BE. Deleting a `storage.objects` row
-- from SQL orphans the file in the object store, which is the exact mistake
-- the brief names: a row pointing at an object is not the object. So this
-- function COLLECTS every path and hands it back, and
-- `apps/web/src/lib/account-deletion/storage.ts` removes them through the
-- Storage API, which deletes the bytes. The request is not marked PURGED until
-- that has been attempted for every bucket.
--
-- IDEMPOTENT, because a scheduled job is retried. Every delete is keyed on the
-- user and finds nothing the second time; every update is a scrub to a fixed
-- value and is its own fixed point; the request row is claimed under
-- `for update` and a request already PURGED returns `{"already": true}` and
-- changes nothing.
--
-- ADDITIVE. No table, column, policy, grant, index or constraint that existed
-- before this file is altered or dropped. No foreign key is changed, and in
-- particular the two `on delete restrict` keys F-17 names are left exactly as
-- they are. The only `revoke` lines are against functions created in this same
-- file, removing the default `PUBLIC` execute grant Postgres adds at create
-- time, the same shape `20260918151000_b4_booking_lifecycle_sweeps.sql` uses.
-- The auth-schema scrub is wrapped in its own exception block: if this
-- database does not grant `postgres` write access to `auth`, the public-schema
-- work still completes and the function reports `auth_scrubbed: false`, which
-- the job turns into a critical alert rather than a green run.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the LEAD to run. One transaction, rolled back, so nothing
-- persists and no test row is ever written to a live product table. It raises
-- 'ALL PASS' at the end and fails loudly on the first assertion that does not
-- hold. It is not run from the sandbox, which has no database credentials.
--
-- WHAT IT PROVES
--   1. All five functions exist, are SECURITY DEFINER, and none of them is
--      executable by `anon` or `authenticated` except
--      `public.open_account_deletion`, which a person needs in order to see
--      their own countdown.
--   2. `public.due_account_purges` returns only requests whose clock has
--      actually run out. A request with `purge_after` in the future is NOT in
--      the list, which is the whole grace window.
--   3. `public.purge_account_rows` run TWICE over the same request produces
--      the same end state, and the second run returns `{"already": true}`
--      having changed nothing. This is the idempotence the scheduler needs.
--   4. After the purge the subject's `auth.users` row still EXISTS, carries no
--      address that routes anywhere, and is banned; their `profiles` row still
--      exists and carries no name or telephone number; and a message they sent
--      is STILL THERE with its body intact and its sender still pointing at
--      them. That last assertion is the counterparty's thread staying
--      readable, which is the requirement the whole design turns on.
--   5. THE RLS CROSS-USER READ THAT MUST FAIL. As `authenticated`, wearing the
--      JWT of an unrelated user, `public.open_account_deletion` returns NULL
--      for somebody else's open request, and a direct select over
--      `public.account_deletion_requests` returns ZERO rows although the table
--      has one in this transaction. A non-zero count is a leak and the probe
--      raises. It is a READ: it writes nothing, in a transaction that is
--      rolled back anyway.
--
--   begin;
--
--   do $probe$
--   declare
--     subject  uuid;
--     other    uuid;
--     req      uuid;
--     conv     uuid;
--     msg      uuid;
--     result   jsonb;
--     again    jsonb;
--     n        integer;
--     fn       text;
--   begin
--     -- 1. the five functions, their definer flag and their grants
--     foreach fn in array array[
--       'open_account_deletion', 'due_account_purges', 'purge_account_rows',
--       'finish_account_purge', 'fail_account_purge'
--     ] loop
--       if not exists (
--         select 1 from pg_proc p join pg_namespace n2 on n2.oid = p.pronamespace
--          where n2.nspname = 'public' and p.proname = fn and p.prosecdef
--       ) then
--         raise exception 'FAIL 1: public.% is missing or not SECURITY DEFINER', fn;
--       end if;
--     end loop;
--     foreach fn in array array[
--       'due_account_purges', 'purge_account_rows', 'finish_account_purge', 'fail_account_purge'
--     ] loop
--       if exists (
--         select 1 from pg_proc p join pg_namespace n2 on n2.oid = p.pronamespace
--          where n2.nspname = 'public' and p.proname = fn
--            and (has_function_privilege('authenticated', p.oid, 'execute')
--                 or has_function_privilege('anon', p.oid, 'execute'))
--       ) then
--         raise exception 'FAIL 1: public.% is executable by a signed-in caller', fn;
--       end if;
--     end loop;
--
--     select id into subject from auth.users order by created_at limit 1;
--     select id into other   from auth.users where id <> subject order by created_at limit 1;
--     if subject is null or other is null then
--       raise exception 'PROBE NEEDS TWO AUTH USERS';
--     end if;
--
--     -- a thread between the two of them, so assertion 4 has something to read
--     insert into public.conversations (guest_id, agent_id)
--     values (subject, other) returning id into conv;
--     insert into public.messages (conversation_id, sender_id, body)
--     values (conv, subject, 'probe body, rolled back') returning id into msg;
--
--     -- 2. the clock
--     insert into public.account_deletion_requests (user_id, purge_after)
--     values (subject, now() + interval '30 days') returning id into req;
--     if (public.due_account_purges(10) -> 'requests') @> jsonb_build_array(
--          jsonb_build_object('request_id', req)) then
--       raise exception 'FAIL 2: a request inside its grace window came back as due';
--     end if;
--     update public.account_deletion_requests set purge_after = now() - interval '1 minute'
--      where id = req;
--     select jsonb_array_length(public.due_account_purges(10) -> 'requests') into n;
--     if n < 1 then
--       raise exception 'FAIL 2: an expired request did not come back as due';
--     end if;
--
--     -- 3. idempotence
--     result := public.purge_account_rows(req);
--     if (result ->> 'purged')::boolean is not true then
--       raise exception 'FAIL 3: the first purge did not run: %', result;
--     end if;
--     perform public.finish_account_purge(req, '{}'::jsonb);
--     again := public.purge_account_rows(req);
--     if (again ->> 'already')::boolean is not true then
--       raise exception 'FAIL 3: the second purge did not report already, it said %', again;
--     end if;
--
--     -- 4. the tombstone, and the thread that survived it
--     if not exists (select 1 from auth.users where id = subject) then
--       raise exception 'FAIL 4: the auth row was deleted, which the restrict keys forbid';
--     end if;
--     if exists (select 1 from auth.users
--                 where id = subject and (email not like '%@deleted.invalid' or phone is not null)) then
--       raise exception 'FAIL 4: an address or a telephone number survived on auth.users';
--     end if;
--     if exists (select 1 from auth.users
--                 where id = subject and (banned_until is null or banned_until <= now())) then
--       raise exception 'FAIL 4: the tombstone is not banned';
--     end if;
--     if exists (select 1 from public.profiles
--                 where id = subject
--                   and (first_name is not null or surname is not null or phone is not null)) then
--       raise exception 'FAIL 4: a name or a telephone number survived on profiles';
--     end if;
--     if not exists (select 1 from public.messages
--                     where id = msg and sender_id = subject and body = 'probe body, rolled back') then
--       raise exception 'FAIL 4: the counterparty lost the thread';
--     end if;
--
--     raise notice 'PASS 1-4';
--   end;
--   $probe$;
--
--   -- 5. THE RLS CROSS-USER READ THAT MUST FAIL.
--   do $rls$
--   declare
--     stranger uuid;
--     owner_id uuid;
--     leaked   integer;
--     answer   jsonb;
--   begin
--     select user_id into owner_id from public.account_deletion_requests
--      order by requested_at desc limit 1;
--     select id into stranger from auth.users where id <> owner_id order by created_at limit 1;
--
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--
--     select count(*) into leaked from public.account_deletion_requests;
--     answer := public.open_account_deletion(owner_id);
--
--     perform set_config('role', 'postgres', true);
--
--     if leaked <> 0 then
--       raise exception 'FAIL 5: a stranger read % deletion requests', leaked;
--     end if;
--     if answer is not null then
--       raise exception 'FAIL 5: a stranger read somebody else''s countdown: %', answer;
--     end if;
--
--     raise notice 'ALL PASS';
--   end;
--   $rls$;
--
--   rollback;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- What the person sees: their own open request, or nothing.
--
-- SECURITY DEFINER and self-only, the same guard
-- `public.account_deletion_blockers` carries. It exists rather than a plain
-- select because the screen wants the countdown and the blockers in one round
-- trip on a Nigerian mobile connection.
-- ---------------------------------------------------------------------------
create or replace function public.open_account_deletion(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.account_deletion_requests;
begin
  if p_user is null then
    return null;
  end if;

  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', current_user)
       is distinct from 'service_role'
     and (select auth.uid()) is distinct from p_user then
    return null;
  end if;

  select * into v_row
    from public.account_deletion_requests
   where user_id = p_user and status in ('SCHEDULED', 'PURGING')
   order by requested_at desc
   limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'request_id', v_row.id,
    'status', v_row.status,
    'requested_at', v_row.requested_at,
    'purge_after', v_row.purge_after
  );
end;
$$;

revoke all on function public.open_account_deletion(uuid) from public, anon;
grant execute on function public.open_account_deletion(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Which clocks have run out. Read by the scheduled job and nobody else.
-- PURGING is included on purpose: a run that died halfway is picked up again
-- by the next one, which is safe because the purge is idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.due_account_purges(p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'requests',
    coalesce(jsonb_agg(jsonb_build_object(
      'request_id', r.id,
      'user_id', r.user_id,
      'status', r.status,
      'attempts', r.attempts,
      'purge_after', r.purge_after
    ) order by r.purge_after), '[]'::jsonb)
  )
  from (
    select *
      from public.account_deletion_requests
     where status in ('SCHEDULED', 'PURGING')
       and purge_after <= now()
     order by purge_after
     limit greatest(coalesce(p_limit, 25), 1)
  ) r;
$$;

revoke all on function public.due_account_purges(integer) from public, anon, authenticated;
grant execute on function public.due_account_purges(integer) to service_role;

-- ---------------------------------------------------------------------------
-- The purge itself. One transaction, service role only.
--
-- Returns the storage paths the caller must now remove through the Storage
-- API, grouped by bucket, plus a count per table so the audit line and the
-- admin console can say what happened without saying to whom.
-- ---------------------------------------------------------------------------
create or replace function public.purge_account_rows(p_request uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req        public.account_deletion_requests;
  v_user       uuid;
  v_counts     jsonb := '{}'::jsonb;
  v_storage    jsonb := '{}'::jsonb;
  v_auth       boolean := false;
  v_tombstoned uuid[] := '{}';
  v_paths      text[];
  v_bucket     text;
  n            integer;
begin
  select * into v_req
    from public.account_deletion_requests
   where id = p_request
   for update;

  if not found then
    return jsonb_build_object('purged', false, 'reason', 'not_found');
  end if;
  if v_req.status in ('PURGED', 'CANCELLED') then
    return jsonb_build_object('already', true, 'status', v_req.status);
  end if;
  if v_req.purge_after > now() then
    return jsonb_build_object('purged', false, 'reason', 'not_due',
                              'purge_after', v_req.purge_after);
  end if;

  v_user := v_req.user_id;

  update public.account_deletion_requests
     set status = 'PURGING',
         started_at = coalesce(started_at, now()),
         attempts = attempts + 1
   where id = p_request;

  -- -------------------------------------------------------------- storage
  -- Collected BEFORE any row is deleted, because several of these paths are
  -- only reachable through rows this function is about to remove.
  --
  -- Eight of the nine buckets are foldered by user id, which every upload
  -- path in the app agrees on and every storage policy enforces
  -- (`(storage.foldername(name))[1] = auth.uid()`). `message-attachments` is
  -- foldered by CONVERSATION id instead, so its paths are joined out of the
  -- attachment rows. `accommodation-photos` is asked the same prefix question
  -- as the rest: nothing in the app writes a person-foldered object into it,
  -- so it is expected to come back empty, and asking is how we would find out
  -- if that ever stopped being true.
  begin
    foreach v_bucket in array array[
      'avatars', 'social-covers', 'social-media', 'listing-photos',
      'listing-videos', 'agent-documents', 'host-documents', 'accommodation-photos'
    ] loop
      select coalesce(array_agg(o.name), '{}'::text[])
        into v_paths
        from storage.objects o
       where o.bucket_id = v_bucket
         and o.name like v_user::text || '/%';
      v_storage := v_storage || jsonb_build_object(v_bucket, to_jsonb(v_paths));
    end loop;

    select coalesce(array_agg(ma.storage_path), '{}'::text[])
      into v_paths
      from public.message_attachments ma
      join public.messages m on m.id = ma.message_id
     where m.sender_id = v_user;
    v_storage := v_storage || jsonb_build_object('message-attachments', to_jsonb(v_paths));
  exception when others then
    -- storage.objects is owned by the storage role. If this database does not
    -- let us read it, the caller still has the eight prefixes to sweep by
    -- listing, so say so rather than pretending there was nothing there.
    v_storage := v_storage || jsonb_build_object('_read_failed', true);
  end;

  -- --------------------------------------------- destroyed: their own content
  -- Posts and story comments that carry somebody else's reply are EMPTIED, not
  -- deleted, because the parent keys cascade and a stranger's words are not
  -- ours to destroy. Everything of theirs still goes.
  select coalesce(array_agg(p.id), '{}'::uuid[]) into v_tombstoned
    from public.posts p
   where p.author_id = v_user
     and exists (
       select 1 from public.posts c
        where (c.parent_id = p.id or c.root_id = p.id)
          and c.id <> p.id
          and c.author_id is distinct from v_user
     );

  update public.posts
     set author_id = null,
         body = null,
         payload = null,
         listing_id = null,
         quoted_post_id = null,
         removed_at = coalesce(removed_at, now())
   where id = any(v_tombstoned);

  delete from public.post_media where post_id = any(v_tombstoned);

  update public.story_comments as sc
     set author_id = null, body = '', edited_at = now()
   where sc.author_id = v_user
     and exists (
       select 1 from public.story_comments c
        where c.parent_id = sc.id and c.author_id is distinct from v_user
     );

  delete from public.posts where author_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('posts', n);

  delete from public.story_comments where author_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('story_comments', n);

  delete from public.stories where author_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('stories', n);

  delete from public.post_reactions where user_id = v_user;
  delete from public.post_reposts  where user_id = v_user;
  delete from public.story_reactions where user_id = v_user;
  delete from public.story_comment_reactions where user_id = v_user;

  delete from public.saved_items   where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('saved_items', n);
  delete from public.saved_places  where user_id = v_user;
  delete from public.saved_searches where user_id = v_user;

  delete from public.follows where follower_id = v_user or followee_id = v_user;
  delete from public.blocks  where user_id = v_user or other_id = v_user;
  delete from public.mutes   where user_id = v_user;

  delete from public.notifications where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('notifications', n);

  delete from public.ai_conversations where user_id = v_user;
  delete from public.bot_invocations  where user_id = v_user;

  delete from public.area_members where user_id = v_user;
  delete from public.area_moderator_applications where user_id = v_user;
  delete from public.event_attendees where user_id = v_user;

  delete from public.support_tickets where user_id = v_user;

  delete from public.user_badges where user_id = v_user;
  delete from public.user_roles  where user_id = v_user;

  -- --------------------------------------------- destroyed: money instruments
  -- The saved card and the saved bank account are theirs and are not records
  -- of a transaction. The transactions themselves are kept below.
  delete from public.payment_methods where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('payment_methods', n);
  delete from public.bank_accounts where user_id = v_user;
  delete from public.payout_accounts
   where agent_id in (select id from public.agents where user_id = v_user);

  -- ------------------------------------------------- destroyed: the documents
  -- KYC and host papers. The rows go here; the objects go through the Storage
  -- API in lib/account-deletion/storage.ts, and the request is not marked
  -- PURGED until that has been attempted.
  delete from public.agent_documents where uploader_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('agent_documents', n);
  delete from public.business_documents where uploaded_by = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('business_documents', n);

  -- The photographs and films they uploaded, wherever they were attached. The
  -- listing record itself is kept: bookings point at it and the foreign key is
  -- restrict. A listing they did not transfer keeps its record and loses its
  -- pictures, and the copy on the deletion screen says exactly that.
  delete from public.listing_photos where storage_path like v_user::text || '/%';
  delete from public.listing_videos where storage_path like v_user::text || '/%';
  delete from public.message_attachments ma
   using public.messages m
   where ma.message_id = m.id and m.sender_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('message_attachments', n);

  -- ------------------------------------------- destroyed: the identity itself
  update public.profiles
     set first_name = null,
         surname = null,
         nickname = null,
         phone = null,
         avatar_url = null,
         state_code = null,
         lga_code = null,
         occupation_code = null,
         signup_role = null,
         interests = '{}',
         settings = '{}'::jsonb,
         display_name = 'Deleted account'
   where id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('profiles', n);

  update public.social_profiles
     /*
      * THE HANDLE IS 20 CHARACTERS, AND THE OLD ONE WAS 40, WHICH WOULD HAVE
      * ABORTED EVERY PURGE.
      *
      * `social_profiles_handle_check` is `^[a-z][a-z0-9_]{2,19}$`, read off
      * the live database: a leading letter and at most nineteen more. This
      * line built `'deleted_'` plus a whole undashed uuid, forty characters,
      * so the update raised a check violation, the transaction rolled back,
      * and the deletion would have failed for every account that has ever
      * opened a social profile. Nothing in the unit tests could see it,
      * because the constraint lives in Postgres.
      *
      * `'d'` plus the first nineteen hex characters of the uuid is exactly
      * twenty, starts with a letter, and carries seventy-six bits of the id,
      * so it is unique in practice and readable as a released handle.
      *
      * Corrected by the lead on apply day.
      */
     set handle = 'd' || left(replace(v_user::text, '-', ''), 19),
         display_label = 'Deleted account',
         bio = null,
         pronouns = null,
         link = null,
         banner_path = null,
         cover_path = null,
         avatar_path = null,
         occupation_code = null,
         lga_code = null,
         state_code = null,
         home_area_id = null,
         follower_count = 0,
         following_count = 0,
         post_count = 0
   where user_id = v_user;

  -- The verification file. The row stays as the record that a check happened;
  -- every column that says who it happened to goes, including the identity
  -- document number, which rule 16 forbids us to keep anywhere it is not
  -- needed and which is not needed once the person has gone.
  update public.agent_applications
     set full_name = null, phone = null, email = null,
         residential_address = null, city = null,
         id_type = null, id_number = null,
         bank_name = null, account_number = null, account_name = null,
         business_email = null, business_phone = null, business_address = null,
         business_rc = null, business_tax_id = null,
         review_notes = null
   where user_id = v_user;

  update public.agents
     set display_name = 'Deleted account'
   where user_id = v_user;

  -- A business keeps trading under its own name; the PERSON behind it goes.
  update public.businesses
     set representative_name = null,
         representative_phone = null,
         cac_number = null,
         registered_name = null,
         tin = null
   where owner_id = v_user;

  -- ------------------------------------- kept, pseudonymised: the money spine
  -- Every row below outlives the person because the law requires it to. What
  -- is removed from each is the part that names them; what is left is an
  -- amount, a date and an opaque uuid.
  update public.bookings
     set guest_name = null, guest_phone = null, guest_email = null
   where guest_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('bookings_kept', n);

  update public.reservations
     set note = null
   where guest_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('reservations_kept', n);

  update public.wallet_entries we
     set metadata = we.metadata - 'email' - 'name' - 'phone' - 'customer_email'
                    - 'account_name' - 'account_number' - 'guest_name'
                    - 'guest_email' - 'guest_phone'
    from public.wallets w
   where w.id = we.wallet_id and w.user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('wallet_entries_kept', n);

  update public.reviews
     set author_label = 'Deleted account'
   where author_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('reviews_kept', n);

  update public.inspection_requests
     set note = null
   where requester_id = v_user;

  select count(*) into n from public.messages where sender_id = v_user;
  v_counts := v_counts || jsonb_build_object('messages_kept', n);

  -- ------------------------------------------------------- the auth tombstone
  -- Guarded on purpose: see the header. A failure here is reported, not
  -- swallowed, and leaves the request in PURGING so the next run retries it.
  begin
    update auth.users
       set email = 'deleted+' || replace(v_user::text, '-', '') || '@deleted.invalid',
           phone = null,
           email_confirmed_at = null,
           phone_confirmed_at = null,
           encrypted_password = null,
           raw_user_meta_data = '{}'::jsonb,
           raw_app_meta_data = '{}'::jsonb,
           banned_until = 'infinity'::timestamptz,
           updated_at = now()
     where id = v_user;

    delete from auth.identities  where user_id = v_user;
    delete from auth.sessions    where user_id = v_user;
    delete from auth.mfa_factors where user_id = v_user;
    delete from auth.one_time_tokens where user_id = v_user;
    v_auth := true;
  exception when others then
    v_auth := false;
  end;

  update public.account_deletion_requests
     set counts = v_counts, restore_code_hash = null
   where id = p_request;

  return jsonb_build_object(
    'purged', true,
    'request_id', p_request,
    'user_id', v_user,
    'auth_scrubbed', v_auth,
    'counts', v_counts,
    'storage', v_storage
  );
end;
$$;

revoke all on function public.purge_account_rows(uuid) from public, anon, authenticated;
grant execute on function public.purge_account_rows(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- The run finished and the objects are gone. Marks the request PURGED and
-- folds the per-bucket object counts into the same `counts` document, so one
-- row answers what was destroyed without ever saying whose it was.
-- ---------------------------------------------------------------------------
create or replace function public.finish_account_purge(p_request uuid, p_storage jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.account_deletion_requests;
begin
  update public.account_deletion_requests
     set status = 'PURGED',
         completed_at = now(),
         last_error = null,
         restore_code_hash = null,
         counts = counts || coalesce(p_storage, '{}'::jsonb)
   where id = p_request
     and status in ('SCHEDULED', 'PURGING')
  returning * into v_row;

  if not found then
    return jsonb_build_object('finished', false, 'reason', 'not_open');
  end if;
  return jsonb_build_object('finished', true, 'request_id', v_row.id);
end;
$$;

revoke all on function public.finish_account_purge(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.finish_account_purge(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- The run did not finish. Records the reason on the request and LEAVES IT
-- OPEN, so the next scheduled run picks it up again. A deletion that half
-- happened and reported success would be the worst outcome available.
-- ---------------------------------------------------------------------------
create or replace function public.fail_account_purge(p_request uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_deletion_requests
     set last_error = left(coalesce(p_reason, 'unknown'), 200)
   where id = p_request
     and status in ('SCHEDULED', 'PURGING');
  return jsonb_build_object('recorded', found);
end;
$$;

revoke all on function public.fail_account_purge(uuid, text) from public, anon, authenticated;
grant execute on function public.fail_account_purge(uuid, text) to service_role;
