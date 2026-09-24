-- SEC-13 / STORE-P2-02 / ESC-06 / MON-09 / STORE-12: the account purge erases
-- what it promises and never erases money. Two throwaway accounts, created and
-- purged inside this transaction; always rolls back.
do $$
declare
  rich   constant uuid := 'a5ec1300-0000-4000-8000-00000000000a';
  clean  constant uuid := 'b5ec1300-0000-4000-8000-00000000000b';
  req_r  uuid;
  req_c  uuid;
  res    jsonb;
  st     text;
  due    timestamptz;
  n      int;
  canon  text;
  rule   text;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    (rich,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'probe.rich.sec13@gmail.com', '', now(), now(), now(), '{}'::jsonb, '{"first_name":"Probe","surname":"Rich"}'::jsonb),
    (clean, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'Probe.Clean.SEC13+x@gmail.com', '', now(), now(), now(), '{}'::jsonb, '{"first_name":"Probe","surname":"Clean"}'::jsonb);

  -- The rich account has money in a savings pot.
  insert into public.wallet_pots (user_id, name, balance_minor) values (rich, 'Rent pot', 250000);

  -- The clean account has device and behavioural rows the purge used to leave.
  insert into public.push_tokens (user_id, platform, token, p256dh, auth)
  values (clean, 'web', 'https://web.push.apple.com/PROBE-sec13-' || gen_random_uuid(), 'k', 'a');
  insert into public.known_devices (user_id, fingerprint, device_words) values (clean, 'probe-fp', 'probe words');
  insert into public.email_outbox (dedupe_key, template, user_id) values ('probe-sec13-' || gen_random_uuid(), 'probe', clean);
  insert into public.price_check_events (user_id, check_id, stage) values (clean, gen_random_uuid(), 'start');
  insert into public.price_check_watches (user_id, lat, lng, property_type, listing_intent)
  values (clean, 6.5, 3.4,
          (select enum_range(null::public.property_type))[1],
          (select enum_range(null::public.listing_intent))[1]);

  select email_canonical into canon from public.account_identities where user_id = clean;
  if canon is distinct from 'probecleansec13@gmail.com' then
    raise exception 'PROBE_FAIL sec-13: setup canonical was %', canon;
  end if;

  -- The screen's question now sees the pot (the service role asks it).
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  res := public.account_deletion_blockers(rich);
  if not (res ->> 'blocked')::boolean or (res ->> 'pot_balance_minor')::bigint <> 250000 then
    raise exception 'PROBE_FAIL sec-13: blockers did not see the pot: %', res;
  end if;
  res := public.account_deletion_blockers(clean);
  if (res ->> 'blocked')::boolean then
    raise exception 'PROBE_FAIL sec-13: a clean account reads blocked: %', res;
  end if;
  perform set_config('request.jwt.claims', '', true);

  -- A member may still only ask about themself.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', clean, 'role', 'authenticated')::text, true);
  begin
    perform public.account_deletion_blockers(rich);
    raise exception 'PROBE_FAIL sec-13: a member read somebody else''s blockers';
  exception when insufficient_privilege then null;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- Both deletions are due (the grace window is over).
  insert into public.account_deletion_requests (user_id, purge_after) values (rich, now() - interval '1 minute') returning id into req_r;
  insert into public.account_deletion_requests (user_id, purge_after) values (clean, now() - interval '1 minute') returning id into req_c;

  -- 1. Money on the account: parked, nothing erased, alert opened.
  res := public.purge_account_rows(req_r);
  if (res ->> 'purged')::boolean is true or res ->> 'reason' <> 'held_money' then
    raise exception 'PROBE_FAIL sec-13: the account with a pot was purged: %', res;
  end if;
  select status, purge_after into st, due from public.account_deletion_requests where id = req_r;
  if st <> 'SCHEDULED' or due <= now() + interval '6 days' then
    raise exception 'PROBE_FAIL sec-13: parked request is % due %', st, due;
  end if;
  if (select display_name from public.profiles where id = rich) = 'Deleted account' then
    raise exception 'PROBE_FAIL sec-13: the parked account was scrubbed';
  end if;
  if (select balance_minor from public.wallet_pots where user_id = rich) <> 250000 then
    raise exception 'PROBE_FAIL sec-13: the pot changed';
  end if;
  select count(*) into n from public.risk_alerts
   where entity_type = 'account_deletion_request' and entity_id = req_r::text and status = 'open' and severity = 'high';
  if n <> 1 then raise exception 'PROBE_FAIL sec-13: % alerts for the parked deletion', n; end if;
  -- Not due any more, so the job does not pick it up again tomorrow.
  if exists (select 1 from jsonb_array_elements((public.due_account_purges(100)) -> 'requests') e
              where e ->> 'request_id' = req_r::text) then
    raise exception 'PROBE_FAIL sec-13: the parked request is still due';
  end if;

  -- 2. The clean account: purged, and the rows the purge used to leave are gone.
  res := public.purge_account_rows(req_c);
  if (res ->> 'purged')::boolean is not true then
    raise exception 'PROBE_FAIL sec-13: the clean account was not purged: %', res;
  end if;
  if exists (select 1 from public.push_tokens where user_id = clean)
     or exists (select 1 from public.known_devices where user_id = clean)
     or exists (select 1 from public.email_outbox where user_id = clean)
     or exists (select 1 from public.price_check_events where user_id = clean)
     or exists (select 1 from public.price_check_watches where user_id = clean) then
    raise exception 'PROBE_FAIL sec-13: device or behavioural rows survived the purge';
  end if;
  select email_canonical, canonical_rule into canon, rule from public.account_identities where user_id = clean;
  if canon is null or canon not like 'erased:%' or rule <> 'erased' or canon like '%probe%' then
    raise exception 'PROBE_FAIL sec-13: identity after purge is % / %', canon, rule;
  end if;
  if canon <> private.erased_identity_hash('probecleansec13@gmail.com') then
    raise exception 'PROBE_FAIL sec-13: the kept hash is not the keyed hash of the mailbox';
  end if;
  -- A later write to the address (the API scrub) does not put plaintext back.
  update auth.users set email = 'deleted+again@deleted.invalid' where id = clean;
  select email_canonical into canon from public.account_identities where user_id = clean;
  if canon not like 'erased:%' then
    raise exception 'PROBE_FAIL sec-13: the auth trigger overwrote the erased identity with %', canon;
  end if;

  raise exception 'PROBE_OK sec-13';
end $$;
