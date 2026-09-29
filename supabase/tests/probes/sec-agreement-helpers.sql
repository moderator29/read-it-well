-- SEC: the privileged writers behind agreements and area openings are not
-- executable by any API role, and the path that legitimately uses them still
-- works after the revoke (20260929 privileged_agreement_and_place_writers...).
-- A signed-in member cannot write an agreement event, send the parties a
-- notification, or post as SYSTEM by calling a private helper directly; an
-- admin deciding an agreement through admin_decide_agreement still logs the
-- event and tells both parties. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';
  stay   constant uuid := 'ed000000-0000-4000-8000-000000000003';
  ag public.deal_agreements%rowtype;
  ar public.areas%rowtype;
  lagos  date := (now() at time zone 'Africa/Lagos')::date;
  bk uuid; rate bigint; r jsonb; n int; fn text;
begin
  -- 29 September: the console's second factor. The QA admin holds their role
  -- only on a session that proved a security key, so this probe's session
  -- carries one (rolled back with everything else).
  insert into public.console_step_ups (user_id, session_id, expires_at)
  values ('03f3dd52-ea28-4852-9abe-e5b0a67c2a43', '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour')
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  -- No API role holds EXECUTE on any of the four.
  foreach fn in array array[
    'private.agreement_log(public.deal_agreements, uuid, text, public.agreement_status, text)',
    'private.agreement_tell_both(public.deal_agreements, text)',
    'private.open_place_entries(public.areas)',
    'private.agreement_open_for_stay()'] loop
    if has_function_privilege('authenticated', fn, 'EXECUTE') or has_function_privilege('anon', fn, 'EXECUTE') then
      raise exception 'PROBE_FAIL sec-agreement-helpers: an API role can execute %', fn;
    end if;
  end loop;

  -- A stay agreement names its booking; the listing is live on a mandate as
  -- SCUML item 17 requires.
  insert into public.listing_mandates (listing_id, kind, principal_name, review_status, reviewed_by, reviewed_at,
         principal_relationship, principal_verified_how, principal_verified_by, principal_verified_at)
  select id, 'letting', 'Probe Principal', 'approved', admin, now(), 'owner', 'call_back', admin, now()
    from public.listings where id = stay and listing_role <> 'owner'
     and not private.listing_has_live_mandate(id);
  update public.listings set is_demo = false, status = 'PUBLISHED' where id = stay;
  select rate_minor into rate from public.listings where id = stay;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 60, lagos + 61, 1, rate, rate, rate, 'PENDING') returning id into bk;
  insert into public.deal_agreements (kind, listing_id, booking_id, renter_id, owner_id, amount_minor, terms, status)
  values ('stay', stay, bk, member, lister, rate, '{}'::jsonb, 'in_review') returning * into ag;
  select * into ar from public.areas limit 1;

  -- A signed-in member calling the helpers directly is refused.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  begin
    perform private.agreement_log(ag, member, 'approved', 'in_review'::public.agreement_status, 'forged');
    raise exception 'PROBE_FAIL sec-agreement-helpers: a member wrote an agreement event';
  exception when insufficient_privilege then null; end;
  begin
    perform private.agreement_tell_both(ag, 'agreement.approved');
    raise exception 'PROBE_FAIL sec-agreement-helpers: a member notified both parties';
  exception when insufficient_privilege then null; end;
  if ar.id is not null then
    begin
      perform private.open_place_entries(ar);
      raise exception 'PROBE_FAIL sec-agreement-helpers: a member posted as SYSTEM';
    exception when insufficient_privilege then null; end;
  end if;
  reset role;

  -- The legitimate path: an admin decides the agreement through the API.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  r := public.admin_decide_agreement(ag.id, 'approve', null);
  reset role;
  if r ->> 'status' <> 'ok' then
    raise exception 'PROBE_FAIL sec-agreement-helpers: admin approval after the revoke returned %', r;
  end if;
  select count(*) into n from public.deal_agreement_events where agreement_id = ag.id and action = 'approved' and actor_id = admin;
  if n <> 1 then raise exception 'PROBE_FAIL sec-agreement-helpers: % approval events logged', n; end if;
  -- Both parties are told (a party may have switched the in-app note off, so
  -- the queued email is the part that always happens).
  select count(distinct user_id) into n from public.email_outbox
   where template = 'agreement.approved' and payload ->> 'agreement_id' = ag.id::text and user_id in (member, lister);
  if n <> 2 then raise exception 'PROBE_FAIL sec-agreement-helpers: % of the two parties were told', n; end if;

  raise exception 'PROBE_OK sec-agreement-helpers';
end
$$;
