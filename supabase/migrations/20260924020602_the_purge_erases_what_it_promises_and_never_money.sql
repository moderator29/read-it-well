-- SEC-13 / STORE-P2-02 / ESC-06 / MON-09 / STORE-12 / SEC-10 (amendment):
-- the account purge erases everything it promised and never erases money.
--
-- REQUIRES MON-08 stage A (private.pot_balance_minor) to be applied first.
--
-- 1. The money a deletion must never strand is read in ONE place,
--    private.deletion_money_blockers: wallet balance, held escrow, savings
--    pots, pending payouts, rent refunds this person owes as a lister and rent
--    refunds owed TO them as a guest, and open bookings and table reservations.
-- 2. public.account_deletion_blockers answers from it (pots and rent refunds
--    are new), keeping its self-only guard, its keys and its grant.
-- 3. public.purge_account_rows RE-CHECKS it at purge time, thirty days after
--    the request. Money received during the grace window (a transfer in, a
--    refund) used to be purged over on a banned account. Now the purge is
--    PARKED: nothing is erased, the request stays SCHEDULED with purge_after
--    pushed a week out (the job re-checks weekly, and the restore code still
--    works), and one high risk alert tells a person to settle it.
-- 4. The purge now also deletes push tokens, known devices, the person's
--    queued and sent email rows, price-check events and saved price-check
--    points; and replaces the canonical mailbox in account_identities with a
--    keyed hash, never
--    plaintext after erasure. The auth trigger no longer overwrites an erased
--    identity. public.admin_erased_identity_matches lets staff see a live
--    account whose mailbox is the same as an erased one's; that comparison
--    is the only use of the hash.
-- 5. An agent whose application was approved (a customer under the AML
--    regime, docs/RETENTION_SCHEDULE.md 3.1) keeps the identification record
--    for five years after the account closes: the agent documents and their
--    files, the payout accounts, and on the APPROVED or SUSPENDED application
--    the name, residential address, ID type and number, business registration
--    and payout details. Every other application row of theirs (an earlier
--    rejection) is redacted as before. The kept row is stamped
--    kyc_retain_until; only staff can read it (the owner is banned and signed
--    out). A rejected or never-approved applicant keeps nothing.
-- 6. The retained record is destroyed when kyc_retain_until passes:
--    public.due_kyc_destructions lists who is due with their document paths,
--    the daily account-purge job removes the files through the Storage API,
--    and public.destroy_expired_kyc then deletes the rows, redacts the
--    application and writes an audit row. Service role only.

-- ------------------------------------------------ an erased identity row
alter table public.account_identities
  drop constraint if exists account_identities_canonical_rule_check;
alter table public.account_identities
  add constraint account_identities_canonical_rule_check
  check (canonical_rule = any (array['gmail', 'plus_strip', 'lowercase_only', 'unparseable', 'erased']));

-- ------------------------------------------ the AML identification record
alter table public.agent_applications
  add column if not exists kyc_retain_until timestamptz;
comment on column public.agent_applications.kyc_retain_until is
  'Set by the account purge for an approved agent: the identification record (documents, ID number, payout details) is kept until this date, then destroyed (docs/RETENTION_SCHEDULE.md 3.1).';

-- Only the purge writes kyc_retain_until. A member has table INSERT and
-- UPDATE on agent_applications (the application form), and a date they could
-- set would schedule the destruction of their own live identification and
-- payout accounts; the applicant guard therefore forces it: null on insert,
-- unchanged on update. (A column-level revoke is not possible under the
-- table-level grant the form relies on.) The rest of the guard is unchanged.
create or replace function private.guard_application_write()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  issued bigint;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if uid is not null
     and (private.has_role(uid, 'admin'::public.app_role)
          or private.has_role(uid, 'super_admin'::public.app_role)) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- The reference is the sequence's, never the caller's. When the column
    -- default ran in this statement, currval is the number it issued and the
    -- reference matches it; anything else was supplied, and is replaced.
    begin
      issued := currval('public.agent_ref_seq');
    exception when others then
      issued := null;
    end;
    if issued is null or new.reference is distinct from 'VL-AGT-' || lpad(issued::text, 5, '0') then
      new.reference := 'VL-AGT-' || lpad(nextval('public.agent_ref_seq')::text, 5, '0');
    end if;
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'an application is filed as a draft or a submission'
        using errcode = '42501';
    end if;
    new.reviewer_id := null;
    new.reviewed_at := null;
    new.review_notes := null;
    new.kyc_retain_until := null;
    new.submitted_at := case when new.status = 'SUBMITTED' then now() else null end;
    return new;
  end if;

  new.kyc_retain_until := old.kyc_retain_until;

  if new.user_id is distinct from old.user_id
     or new.reference is distinct from old.reference
     or new.reviewer_id is distinct from old.reviewer_id
     or new.reviewed_at is distinct from old.reviewed_at
     or new.review_notes is distinct from old.review_notes then
    raise exception 'the review of an application is written by Vallo staff'
      using errcode = '42501';
  end if;

  if old.status <> 'DRAFT'
     and (new.agency_fee_bps is distinct from old.agency_fee_bps
          or new.legal_fee_bps is distinct from old.legal_fee_bps
          or new.supply_role is distinct from old.supply_role) then
    raise exception 'the fee terms and the role are fixed once an application is sent'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (old.status in ('DRAFT', 'MORE_INFO_REQUIRED') and new.status = 'SUBMITTED') then
      raise exception 'an applicant cannot move an application from % to %', old.status, new.status
        using errcode = '42501';
    end if;
    new.submitted_at := now();
  else
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end;
$function$;

-- ---------------------------------------------------------------- the key
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'account_identity_pepper') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'account_identity_pepper',
      'Keys the hash an erased account keeps of its mailbox (SEC-10). Never rotate without re-hashing.');
  end if;
end $$;

create or replace function private.erased_identity_hash(p_canonical text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'erased:' || encode(
    extensions.hmac(
      p_canonical,
      (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'account_identity_pepper' limit 1),
      'sha256'),
    'hex');
$$;

revoke all on function private.erased_identity_hash(text) from public, anon, authenticated;

-- ------------------------------------------------- the money, in one place
create or replace function private.deletion_money_blockers(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_balance  bigint  := 0;
  v_held     bigint  := 0;
  v_pots     bigint  := 0;
  v_payouts  integer := 0;
  v_owes     bigint  := 0;
  v_owed     bigint  := 0;
  v_bookings integer := 0;
  v_reserves integer := 0;
begin
  select coalesce(sum(b.balance_minor), 0) into v_balance
    from public.wallet_balances b
   where b.user_id = p_user;

  select coalesce(sum(e.amount_minor), 0) into v_held
    from public.escrows e
   where (e.payer_id = p_user or e.payee_id = p_user)
     and e.state in ('FUNDED', 'HELD', 'RELEASE_REQUESTED', 'DISPUTED');

  /* The ledger's balance of each pot (MON-08, private.pot_balance_minor),
     never the stored column, which is being retired. */
  select coalesce(sum(private.pot_balance_minor(p.id)), 0) into v_pots
    from public.wallet_pots p
   where p.user_id = p_user;

  select count(*) into v_payouts
    from public.wallet_entries we
    join public.wallets w on w.id = we.wallet_id
   where w.user_id = p_user
     and we.kind = 'withdrawal'
     and we.status = 'PENDING';

  select coalesce(sum(r.amount_minor), 0) into v_owes
    from public.rent_refunds_owed r
   where r.lister_id = p_user
     and r.cleared_at is null
     and r.amount_minor > 0;

  select coalesce(sum(r.amount_minor), 0) into v_owed
    from public.rent_refunds_owed r
    join public.bookings b on b.id = r.booking_id
   where b.guest_id = p_user
     and r.cleared_at is null
     and r.amount_minor > 0;

  select count(*) into v_bookings
    from public.bookings b
   where b.guest_id = p_user
     and b.status in ('PENDING', 'CONFIRMED')
     and b.check_out >= current_date;

  select count(*) into v_reserves
    from public.reservations r
   where r.guest_id = p_user
     and r.status in ('PENDING', 'CONFIRMED')
     and r.reserved_for >= now();

  return jsonb_build_object(
    'blocked', (v_balance > 0 or v_held <> 0 or v_pots > 0 or v_payouts > 0
                or v_owes > 0 or v_owed > 0 or v_bookings > 0 or v_reserves > 0),
    'wallet_balance_minor', v_balance,
    'wallet_held_minor', v_held,
    'pot_balance_minor', v_pots,
    'pending_payouts', v_payouts,
    'rent_refunds_owed_minor', v_owes,
    'rent_refunds_due_minor', v_owed,
    'active_bookings', v_bookings,
    'active_reservations', v_reserves
  );
end;
$$;

revoke all on function private.deletion_money_blockers(uuid) from public, anon, authenticated;

-- ------------------------------------------ what the settings screen asks
create or replace function public.account_deletion_blockers(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_money     jsonb;
  v_listings  integer := 0;
  v_business  integer := 0;
  v_payouts   integer;
  v_held      bigint;
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

  v_money   := private.deletion_money_blockers(p_user);
  v_payouts := (v_money ->> 'pending_payouts')::integer;
  v_held    := (v_money ->> 'wallet_held_minor')::bigint;

  select count(*) into v_listings
    from public.listings l
    join public.agents a on a.id = l.agent_id
   where a.user_id = p_user
     and l.status = 'PUBLISHED';

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

  return v_money || jsonb_build_object(
    'blocked', ((v_money ->> 'blocked')::boolean or v_listings > 0 or v_business > 0),
    'published_listings', v_listings,
    'owned_businesses', v_business
  );
end;
$$;

-- --------------------------------------- the auth trigger keeps an erasure
create or replace function private.record_account_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parts text[];
begin
  if new.email is null or btrim(new.email, E' \t\r\n') = '' then
    return null;
  end if;

  parts := private.canonical_email_parts(new.email);

  insert into public.account_identities (user_id, email_canonical, canonical_rule)
  values (new.id, parts[1], parts[2])
  on conflict (user_id) do update
    set email_canonical = excluded.email_canonical,
        canonical_rule  = excluded.canonical_rule,
        recorded_at     = now()
    /* An erased account keeps only its keyed hash; the purge's own rewrite
       of the address must not put a plaintext row back. */
    where public.account_identities.canonical_rule is distinct from 'erased';

  return null;
end;
$$;

-- ------------------------------------------------------------- the purge
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
  v_money      jsonb;
  v_canon      text;
  v_rule       text;
  v_kyc_keep   boolean;
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

  /* ESC-06 / MON-09 / STORE-12: MONEY IS NEVER PURGED OVER. Asked again
     now, not only when the person pressed the button thirty days ago. */
  v_money := private.deletion_money_blockers(v_user);
  if (v_money ->> 'blocked')::boolean then
    update public.account_deletion_requests
       set status = 'SCHEDULED',
           purge_after = now() + interval '7 days',
           last_error = 'held: money or an open commitment on the account'
     where id = p_request;
    if not exists (
      select 1 from public.risk_alerts a
       where a.status = 'open'
         and a.title = 'Account deletion held: money on the account'
         and a.entity_type = 'account_deletion_request'
         and a.entity_id = p_request::text
    ) then
      insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
      values ('high',
              'Account deletion held: money on the account',
              'A scheduled deletion was not run because the account still holds or is owed money, or has an open booking: '
                || v_money::text
                || '. Settle it (refund to the original card or a named account), then the weekly re-check purges it. The restore code still works.',
              'account_deletion_request', p_request::text);
    end if;
    return jsonb_build_object('purged', false, 'reason', 'held_money', 'blockers', v_money);
  end if;

  /* An approved agent is a customer whose identification must be kept
     (5 years, docs/RETENTION_SCHEDULE.md 3.1). */
  v_kyc_keep := exists (select 1 from public.agent_applications aa
                         where aa.user_id = v_user
                           and aa.status in ('APPROVED', 'SUSPENDED'));

  select ai.email_canonical, ai.canonical_rule into v_canon, v_rule
    from public.account_identities ai
   where ai.user_id = v_user;

  update public.account_deletion_requests
     set status = 'PURGING',
         started_at = coalesce(started_at, now()),
         attempts = attempts + 1
   where id = p_request;
  begin
    foreach v_bucket in array array[
      'avatars', 'social-covers', 'social-media', 'listing-photos',
      'listing-videos', 'agent-documents', 'host-documents', 'accommodation-photos'
    ] loop
      /* The retained identification files stay in storage. */
      continue when v_bucket = 'agent-documents' and v_kyc_keep;
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
    v_storage := v_storage || jsonb_build_object('_read_failed', true);
  end;
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
  delete from public.payment_methods where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('payment_methods', n);
  delete from public.bank_accounts where user_id = v_user;
  if v_kyc_keep then
    select count(*) into n from public.agent_documents where uploader_id = v_user;
    v_counts := v_counts || jsonb_build_object('agent_documents_retained', n);
  else
    delete from public.payout_accounts
     where agent_id in (select id from public.agents where user_id = v_user);
    delete from public.agent_documents where uploader_id = v_user;
    get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('agent_documents', n);
  end if;
  delete from public.business_documents where uploaded_by = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('business_documents', n);
  delete from public.listing_photos where storage_path like v_user::text || '/%';
  delete from public.listing_videos where storage_path like v_user::text || '/%';
  delete from public.message_attachments ma
   using public.messages m
   where ma.message_id = m.id and m.sender_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('message_attachments', n);

  /* SEC-13 / STORE-P2-02: device and behavioural data. */
  delete from public.push_tokens where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('push_tokens', n);
  delete from public.known_devices where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('known_devices', n);
  delete from public.email_outbox where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('email_outbox', n);
  delete from public.price_check_events where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('price_check_events', n);
  delete from public.price_check_watches where user_id = v_user;
  get diagnostics n = row_count; v_counts := v_counts || jsonb_build_object('price_check_watches', n);

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
  /* The approved (or suspended) application is the customer record the law
     keeps; every other application row of theirs is redacted in full. */
  update public.agent_applications
     set phone = null, email = null,
         business_email = null, business_phone = null, business_address = null,
         principal_email = null, review_notes = null,
         kyc_retain_until = now() + interval '5 years'
   where user_id = v_user
     and status in ('APPROVED', 'SUSPENDED');
  update public.agent_applications
     set full_name = null, phone = null, email = null,
         residential_address = null, city = null,
         id_type = null, id_number = null,
         bank_name = null, account_number = null, account_name = null,
         business_email = null, business_phone = null, business_address = null,
         business_rc = null, business_tax_id = null,
         principal_email = null, review_notes = null
   where user_id = v_user
     and status not in ('APPROVED', 'SUSPENDED');
  v_counts := v_counts || jsonb_build_object('kyc_retained', v_kyc_keep);
  update public.agents
     set display_name = 'Deleted account'
   where user_id = v_user;
  update public.businesses
     set representative_name = null,
         representative_phone = null,
         cac_number = null,
         registered_name = null,
         tin = null
   where owner_id = v_user;
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

  /* SEC-10 amendment: the mailbox survives only as a keyed hash, which
     admin_erased_identity_matches compares against live accounts. If the key
     cannot be read, the row goes entirely: never plaintext after erasure. */
  begin
    if v_canon is not null and v_rule is distinct from 'erased' then
      update public.account_identities
         set email_canonical = private.erased_identity_hash(v_canon),
             canonical_rule  = 'erased',
             recorded_at     = now()
       where user_id = v_user;
    end if;
    if exists (select 1 from public.account_identities
                where user_id = v_user and email_canonical not like 'erased:%') then
      delete from public.account_identities where user_id = v_user;
    end if;
  exception when others then
    delete from public.account_identities where user_id = v_user;
  end;
  v_counts := v_counts || jsonb_build_object('identity_hashed', v_canon is not null);

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

-- ------------------------------ the one reader of the hash: staff matching
create or replace function public.admin_erased_identity_matches()
returns table (user_id uuid, erased_user_id uuid, canonical_rule text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  pepper text;
  found  integer;
begin
  if caller is null or not (private.has_role(caller, 'admin'::public.app_role)
                            or private.has_role(caller, 'super_admin'::public.app_role)) then
    raise exception 'Only the operations team can read this.' using errcode = '42501';
  end if;
  select s.decrypted_secret into pepper
    from vault.decrypted_secrets s where s.name = 'account_identity_pepper' limit 1;
  if pepper is null then
    return;
  end if;
  /* One HMAC per live account, computed once, whatever join the planner
     picks. */
  return query
    with live as materialized (
      select ai.user_id, ai.canonical_rule,
             'erased:' || encode(extensions.hmac(ai.email_canonical, pepper, 'sha256'), 'hex') as hashed
        from public.account_identities ai
       where ai.canonical_rule is distinct from 'erased'
    )
    select live.user_id, gone.user_id, live.canonical_rule
      from live
      join public.account_identities gone
        on gone.canonical_rule = 'erased'
       and gone.email_canonical = live.hashed
     order by live.user_id;
  /* Linking a deleted person to a live account is a sensitive read, so every
     call is on the record: who asked and how many links came back. */
  get diagnostics found = row_count;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (caller, 'account.erased_identity.matched', 'account_identities', null,
          jsonb_build_object('matches', found));
end;
$$;

revoke all on function public.admin_erased_identity_matches() from public, anon;
grant execute on function public.admin_erased_identity_matches() to authenticated;

-- ------------------------------- the retained AML record, destroyed on time
create or replace function public.due_kyc_destructions(p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('users', coalesce(jsonb_agg(jsonb_build_object(
           'user_id', due.user_id,
           'paths', (select coalesce(jsonb_agg(d.storage_path), '[]'::jsonb)
                       from public.agent_documents d
                      where d.uploader_id = due.user_id))), '[]'::jsonb))
    from (select distinct a.user_id
            from public.agent_applications a
           where a.kyc_retain_until is not null
             and a.kyc_retain_until <= now()
             and a.status in ('APPROVED', 'SUSPENDED')
             /* Only a deleted account's record ever ends here. */
             and exists (select 1 from public.account_deletion_requests r
                          where r.user_id = a.user_id and r.status = 'PURGED')
           order by a.user_id
           limit greatest(1, least(coalesce(p_limit, 50), 500))) due;
$$;

create or replace function public.destroy_expired_kyc(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_docs   integer;
  n_payout integer;
  n_apps   integer;
begin
  if not exists (select 1 from public.agent_applications a
                  where a.user_id = p_user
                    and a.kyc_retain_until is not null
                    and a.kyc_retain_until <= now()
                    and a.status in ('APPROVED', 'SUSPENDED'))
     or not exists (select 1 from public.account_deletion_requests r
                     where r.user_id = p_user and r.status = 'PURGED') then
    return jsonb_build_object('destroyed', false, 'reason', 'not_due');
  end if;

  delete from public.agent_documents where uploader_id = p_user;
  get diagnostics n_docs = row_count;
  delete from public.payout_accounts
   where agent_id in (select ag.id from public.agents ag where ag.user_id = p_user);
  get diagnostics n_payout = row_count;
  update public.agent_applications
     set full_name = null, phone = null, email = null,
         residential_address = null, city = null,
         id_type = null, id_number = null,
         bank_name = null, account_number = null, account_name = null,
         business_email = null, business_phone = null, business_address = null,
         business_rc = null, business_tax_id = null,
         principal_email = null, review_notes = null,
         kyc_retain_until = null
   where user_id = p_user;
  get diagnostics n_apps = row_count;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'account.kyc.destroyed', 'user', p_user::text,
          jsonb_build_object('agent_documents', n_docs, 'payout_accounts', n_payout,
                             'applications_redacted', n_apps));

  return jsonb_build_object('destroyed', true, 'agent_documents', n_docs,
                            'payout_accounts', n_payout, 'applications_redacted', n_apps);
end;
$$;

revoke all on function public.due_kyc_destructions(integer) from public, anon, authenticated;
revoke all on function public.destroy_expired_kyc(uuid) from public, anon, authenticated;
grant execute on function public.due_kyc_destructions(integer) to service_role;
grant execute on function public.destroy_expired_kyc(uuid) to service_role;
