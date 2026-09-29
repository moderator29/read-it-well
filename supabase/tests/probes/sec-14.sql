-- SEC-14: a member cannot edit their consent record or take a name that
-- speaks for Vallo; a sign-up's metadata cannot claim terms or such a name;
-- real names that only resemble it pass; ordinary edits, edits beside a name
-- that was already there, and an admin's own naming still work.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin_id constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  u uuid;
  refused text;
  p record;
  h text;
  signup record;
begin
  -- 29 September: the console's second factor. An admin or a staff member
  -- holds their role only on a session that proved a security key, so this
  -- probe's session carries one for every admin and for the QA member (who
  -- some probes make staff), rolled back with everything else.
  insert into public.console_step_ups (user_id, session_id, expires_at)
  select u, '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour'
    from (select user_id from public.user_roles where role in ('admin', 'super_admin')
          union select '03f3dd52-ea28-4852-9abe-e5b0a67c2a43'::uuid
          union select '957b3bd2-cce3-425d-bba9-5cd876ca3d62'::uuid) s(u)
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  -- Sign-ups assembled by hand, through the real handle_new_user.
  for signup in
    select * from (values
      ('Vallo', 'Support', null, 'made-up', true),
      (null, null, 'V a l l o', null, true),
      ('Eva', 'Lloyd', null, null, false),
      ('Marco', 'Cavallo', null, null, false),
      ('Tunde', 'Adeyemi', 'Tunde Official', null, false),
      ('Ada', 'Staff', null, null, false)
    ) as t(first_name, surname, nickname, terms, impersonates)
  loop
    u := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'probe-sec14-' || u || '@example.invalid',
            jsonb_strip_nulls(jsonb_build_object('first_name', signup.first_name, 'surname', signup.surname,
                                                 'nickname', signup.nickname, 'terms_version', signup.terms)),
            now(), now());
    select display_name, first_name, surname, nickname, terms_accepted_at, terms_version into p
      from public.profiles where id = u;
    select handle into h from public.social_profiles where user_id = u;
    if p.terms_accepted_at is not null or p.terms_version is not null then
      raise exception 'PROBE_FAIL sec-14: sign-up metadata recorded terms % at %', p.terms_version, p.terms_accepted_at;
    end if;
    if signup.impersonates then
      if p.display_name is distinct from 'Member' or p.nickname is not null
         or private.name_claims_to_be_vallo(p.first_name) or private.name_claims_to_be_vallo(p.surname) then
        raise exception 'PROBE_FAIL sec-14: a sign-up kept a Vallo name: % / % % / %', p.display_name, p.first_name, p.surname, p.nickname;
      end if;
      if h = 'member' then raise exception 'PROBE_FAIL sec-14: a renamed sign-up took the handle @member'; end if;
    elsif p.display_name = 'Member' then
      raise exception 'PROBE_FAIL sec-14: a real name was renamed Member: % % / %', signup.first_name, signup.surname, signup.nickname;
    end if;
  end loop;

  -- A name already on the row (written before this rule) must not lock its owner out.
  update public.profiles set surname = 'Admin' where id = member;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);

  -- CONTROLS: an ordinary edit beside the existing name; real names that only resemble it.
  update public.profiles set first_name = 'Ada', nickname = 'Ada B' where id = member;
  if not found then raise exception 'PROBE_FAIL sec-14: control failed, the member could not edit beside an existing name'; end if;
  update public.profiles set surname = 'Cavallo', nickname = 'Tunde Official', first_name = 'Vallory' where id = member;
  if not found then raise exception 'PROBE_FAIL sec-14: control failed, a real name was refused'; end if;

  -- REFUSAL: the consent record.
  refused := null;
  begin
    update public.profiles set terms_version = 'made-up', terms_accepted_at = now() where id = member;
  exception when others then refused := sqlstate; end;
  if refused is distinct from '42501' then raise exception 'PROBE_FAIL sec-14: the member rewrote their terms record (%)', coalesce(refused, 'updated'); end if;

  refused := null;
  begin
    update public.profiles set created_at = now() - interval '5 years' where id = member;
  exception when others then refused := sqlstate; end;
  if refused is distinct from '42501' then raise exception 'PROBE_FAIL sec-14: the member rewrote created_at (%)', coalesce(refused, 'updated'); end if;

  -- REFUSAL: names that speak for Vallo, however written: spaced, run
  -- together, in Cyrillic or full-width look-alikes, or with digits for letters.
  foreach h in array array['Vallo Support', 'V a l l o', 'V.a.l.l.o', 'ValloSupport', 'vallo_hq', 'Moderator',
                            'Vаllo', 'Ваllo', 'Ｖａｌｌｏ', 'Vall0', 'Va11o'] loop
    refused := null;
    begin
      update public.profiles set nickname = h where id = member;
    exception when others then refused := sqlstate; end;
    if refused is distinct from 'RM004' then raise exception 'PROBE_FAIL sec-14: the member took the nickname "%" (%)', h, coalesce(refused, 'updated'); end if;
  end loop;

  -- CONTROL: an admin's own token may (staff accounts are named for what they are).
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  update public.profiles set nickname = 'Vallo Support' where id = admin_id;
  if not found then raise exception 'PROBE_FAIL sec-14: an admin could not name their own account'; end if;

  raise exception 'PROBE_OK sec-14: consent record fixed for members; Vallo names refused to members and cleared at sign-up; real names, edits beside an existing name and admin naming pass';
end;
$$;
