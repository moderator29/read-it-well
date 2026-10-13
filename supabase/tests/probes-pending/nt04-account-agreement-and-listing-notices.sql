-- NT04 (pending migration nt04_account_agreement_and_listing_notices):
--   * a real password change on auth.users tells the person once in the app,
--     and a no-op update (same hash) tells nobody;
--   * a real confirmed_phones row tells the person, with the last four digits
--     only, once;
--   * both confirmed (in_review) tells both sides once, cancelled tells both
--     once, and any other state tells nobody;
--   * a mandate approved or rejected tells the lister, with the reason (cut to
--     160 characters, or a plain default when blank), once;
--   * ownership seen tells the lister once;
--   * the five triggers exist on the right tables and events, no notice says
--     safe, secure, verified or guaranteed, and the functions are closed to API
--     roles.
-- Rolled back by the final raise.
do $$
declare
  u uuid;
  v uuid;
  tester uuid;
  old_hash text;
  n integer;
  b text;
  ag constant uuid := gen_random_uuid();
  md constant uuid := gen_random_uuid();
  li constant uuid := gen_random_uuid();
begin
  select id into u from public.profiles order by created_at limit 1;
  select pr.id into v from public.profiles pr where pr.id <> u
     and not exists (select 1 from public.confirmed_phones c where c.user_id = pr.id) order by pr.created_at limit 1;
  if u is null or v is null then
    raise exception 'PROBE_FAIL nt04: need two profiles';
  end if;
  update public.profiles set settings = '{}'::jsonb where id in (u, v);

  /* ---- 1. password changed ---- */
  select id, encrypted_password into tester, old_hash
    from auth.users where encrypted_password is not null and encrypted_password <> '' order by created_at limit 1;
  if tester is null then
    raise exception 'PROBE_FAIL nt04: no account with a password to change';
  end if;
  update public.profiles set settings = '{}'::jsonb where id = tester;
  update auth.users set encrypted_password = encrypted_password where id = tester;
  select count(*) into n from public.notifications where user_id = tester and title = 'Your password was changed';
  if n <> 0 then raise exception 'PROBE_FAIL nt04: an unchanged password told the person'; end if;
  update auth.users set encrypted_password = old_hash || 'x' where id = tester;
  select count(*), min(href) into n, b from public.notifications where user_id = tester and title = 'Your password was changed';
  if n <> 1 or b <> '/settings/devices' then
    raise exception 'PROBE_FAIL nt04: password change told % times to %', n, b;
  end if;

  /* ---- 2. phone confirmed ---- */
  insert into public.confirmed_phones (user_id, phone) values (v, '+2348012345678');
  select count(*), min(body) into n, b from public.notifications where user_id = v and title = 'Phone number confirmed';
  if n <> 1 or b is distinct from 'The number ending 5678 is now confirmed on your account.' then
    raise exception 'PROBE_FAIL nt04: phone notice % rows, words: %', n, b;
  end if;

  /* ---- 3. agreement ---- */
  perform private.tell_agreement_change(ag, '3', 'in_review', 'Probe Flat', u, v);
  perform private.tell_agreement_change(ag, '3', 'in_review', 'Probe Flat', u, v);
  perform private.tell_agreement_change(ag, '3', 'cancelled', 'Probe Flat', u, v);
  perform private.tell_agreement_change(ag, '3', 'paid', 'Probe Flat', u, v);
  select count(*) into n from public.notifications where user_id in (u, v) and href = '/agreements/' || ag::text and title = 'Both of you confirmed';
  if n <> 2 then raise exception 'PROBE_FAIL nt04: in_review expected 2 rows (one each), found %', n; end if;
  select count(*) into n from public.notifications where user_id in (u, v) and href = '/agreements/' || ag::text and title = 'Agreement cancelled';
  if n <> 2 then raise exception 'PROBE_FAIL nt04: cancelled expected 2 rows, found %', n; end if;
  select count(*) into n from public.notifications where user_id in (u, v) and href = '/agreements/' || ag::text;
  if n <> 4 then raise exception 'PROBE_FAIL nt04: a third state told somebody (% rows)', n; end if;

  /* ---- 4. mandate ---- */
  perform private.tell_mandate_decided(md, li, 'approved', 'Mr Bello', null, u, 'Probe Flat');
  perform private.tell_mandate_decided(md, li, 'approved', 'Mr Bello', null, u, 'Probe Flat');
  perform private.tell_mandate_decided(gen_random_uuid(), li, 'rejected', 'Mr Bello', repeat('x', 400), u, 'Probe Flat');
  perform private.tell_mandate_decided(gen_random_uuid(), li, 'rejected', 'Mr Bello', '   ', u, 'Probe Flat');
  perform private.tell_mandate_decided(md, li, 'pending', 'Mr Bello', null, u, 'Probe Flat');
  select count(*) into n from public.notifications
   where user_id = u and title = 'We confirmed who you are letting for' and href = '/agent/listings/' || li::text || '/mandate';
  if n <> 1 then raise exception 'PROBE_FAIL nt04: mandate approved told % times', n; end if;
  select count(*), max(length(body)) into n, b from public.notifications
   where user_id = u and title = 'Your mandate was not approved';
  if n <> 2 or b::integer <> length('Probe Flat: ') + 160 then
    raise exception 'PROBE_FAIL nt04: rejected notices % rows, longest %', n, b;
  end if;
  if not exists (select 1 from public.notifications where user_id = u and title = 'Your mandate was not approved'
                  and body = 'Probe Flat: Open the mandate page to see what is needed.') then
    raise exception 'PROBE_FAIL nt04: a blank reason had no plain default';
  end if;

  /* ---- 5. ownership seen ---- */
  perform private.tell_ownership_seen(li, u, 'Probe Flat');
  perform private.tell_ownership_seen(li, u, 'Probe Flat');
  select count(*) into n from public.notifications where user_id = u and title = 'Ownership seen';
  if n <> 1 then raise exception 'PROBE_FAIL nt04: ownership seen told % times', n; end if;

  /* ---- no claims without a mechanism ---- */
  if exists (select 1 from public.notifications
              where user_id in (u, v, tester)
                and title in ('Your password was changed', 'Phone number confirmed', 'Both of you confirmed', 'Agreement cancelled',
                              'We confirmed who you are letting for', 'Your mandate was not approved', 'Ownership seen')
                and (body ilike '%safe%' or body ilike '%secure%' or body ilike '%verified%' or body ilike '%guarantee%')) then
    raise exception 'PROBE_FAIL nt04: a notice makes a claim with no mechanism';
  end if;

  /* ---- the triggers ---- */
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'auth.users'::regclass and t.tgname = 'users_zz_notify_password_changed'
                  and not t.tgisinternal and (t.tgtype & 16) <> 0 and t.tgqual is not null) then
    raise exception 'PROBE_FAIL nt04: the password trigger is missing or has no WHEN guard';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.confirmed_phones'::regclass and t.tgname = 'confirmed_phones_zz_notify_confirmed'
                  and not t.tgisinternal and (t.tgtype & 4) <> 0 and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt04: the phone trigger is missing or not on insert and update';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.deal_agreements'::regclass and t.tgname = 'deal_agreements_zz_notify_change'
                  and not t.tgisinternal and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt04: the agreement trigger is missing';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.listing_mandates'::regclass and t.tgname = 'listing_mandates_zz_notify_decided'
                  and not t.tgisinternal and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt04: the mandate trigger is missing';
  end if;
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.listings'::regclass and t.tgname = 'listings_zz_notify_ownership_seen'
                  and not t.tgisinternal and (t.tgtype & 16) <> 0) then
    raise exception 'PROBE_FAIL nt04: the ownership trigger is missing';
  end if;

  if has_function_privilege('authenticated', 'private.tell_agreement_change(uuid, text, text, text, uuid, uuid)', 'execute')
     or has_function_privilege('anon', 'private.tell_mandate_decided(uuid, uuid, text, text, text, uuid, text)', 'execute')
     or has_function_privilege('service_role', 'private.notify_password_changed()', 'execute') then
    raise exception 'PROBE_FAIL nt04: an API role can run a notice function';
  end if;

  raise exception 'PROBE_OK nt04-account-agreement-and-listing-notices';
end
$$;
