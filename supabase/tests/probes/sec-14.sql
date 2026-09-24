-- SEC-14: a member cannot edit their consent record or take a name that
-- speaks for Vallo; a sign-up's metadata cannot claim terms or such a name;
-- ordinary edits, and an admin's own, still work.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin_id constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  fresh constant uuid := gen_random_uuid();
  refused text;
  p record;
begin
  -- A sign-up assembled by hand: a staff name and a terms version nobody showed.
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (fresh, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'probe-sec14-' || fresh || '@example.invalid',
          jsonb_build_object('display_name', 'Vallo Support', 'nickname', 'Vallo Support', 'terms_version', 'made-up'),
          now(), now());
  select display_name, nickname, terms_accepted_at, terms_version into p from public.profiles where id = fresh;
  if p.display_name is distinct from 'Member' or p.nickname is not null then
    raise exception 'PROBE_FAIL sec-14: a sign-up took the name % / %', p.display_name, p.nickname;
  end if;
  if p.terms_accepted_at is not null or p.terms_version is not null then
    raise exception 'PROBE_FAIL sec-14: sign-up metadata recorded terms % at %', p.terms_version, p.terms_accepted_at;
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- CONTROL: an ordinary edit of the member's own name and settings.
  update public.profiles set first_name = 'Ada', settings = settings where id = member;
  if not found then raise exception 'PROBE_FAIL sec-14: control failed, the member could not edit their name'; end if;

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

  -- REFUSAL: names that speak for Vallo, spaced or not.
  refused := null;
  begin
    update public.profiles set nickname = 'Vallo Support' where id = member;
  exception when others then refused := sqlstate; end;
  if refused is distinct from 'RM004' then raise exception 'PROBE_FAIL sec-14: the member took the nickname Vallo Support (%)', coalesce(refused, 'updated'); end if;

  refused := null;
  begin
    update public.profiles set nickname = 'V a l l o' where id = member;
  exception when others then refused := sqlstate; end;
  if refused is distinct from 'RM004' then raise exception 'PROBE_FAIL sec-14: the member took a spaced-out Vallo (%)', coalesce(refused, 'updated'); end if;

  refused := null;
  begin
    update public.profiles set surname = 'Admin' where id = member;
  exception when others then refused := sqlstate; end;
  if refused is distinct from 'RM004' then raise exception 'PROBE_FAIL sec-14: the member took the surname Admin (%)', coalesce(refused, 'updated'); end if;

  -- CONTROL: an admin's own token may (staff accounts are named for what they are).
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  update public.profiles set nickname = 'Vallo Support' where id = admin_id;
  if not found then raise exception 'PROBE_FAIL sec-14: an admin could not name their own account'; end if;

  raise exception 'PROBE_OK sec-14: consent record fixed for members, staff names refused to members and at sign-up, ordinary and admin edits pass';
end;
$$;
