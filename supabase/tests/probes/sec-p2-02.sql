-- SEC-P2-02: a member opens a listing thread only as its guest, only with the
-- lister of a published listing, and at most 20 new listing threads a day.
-- Reservation and booking threads, and service-role writes, are unchanged.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin_id constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  l_id uuid;
  lister uuid;
  other_listing uuid;
  i int;
  refused text;
begin
  -- 29 September: the console's second factor. The QA admin holds their role
  -- only on a session that proved a security key, so this probe's session
  -- carries one (rolled back with everything else).
  insert into public.console_step_ups (user_id, session_id, expires_at)
  values ('03f3dd52-ea28-4852-9abe-e5b0a67c2a43', '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour')
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  -- A published listing the member has no thread on, and a second published
  -- listing by a different lister (or no second lister: the mismatch then
  -- uses the admin as a counterpart who lists nothing).
  select l.id, a.user_id into l_id, lister
    from public.listings l join public.agents a on a.id = l.agent_id
   where l.status = 'PUBLISHED' and a.user_id not in (member, admin_id)
     and not exists (select 1 from public.conversations c where c.guest_id = member and c.listing_id = l.id)
   limit 1;
  if l_id is null then raise exception 'PROBE_FAIL sec-p2-02: no published listing to test against'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);

  -- CONTROL: what startConversation writes still succeeds.
  insert into public.conversations (guest_id, agent_id, listing_id) values (member, lister, l_id);

  -- REFUSAL 1: a thread with an arbitrary user and no listing (the audit's T2).
  refused := null;
  begin
    insert into public.conversations (guest_id, agent_id) values (member, admin_id);
  exception when others then refused := sqlstate; end;
  if refused is distinct from '23514' then raise exception 'PROBE_FAIL sec-p2-02: a thread with an arbitrary user and no listing was created (%)', coalesce(refused, 'created'); end if;

  -- REFUSAL 2: a real listing, but the counterpart is not its lister.
  refused := null;
  begin
    insert into public.conversations (guest_id, agent_id, listing_id) values (member, admin_id, l_id);
  exception when others then refused := sqlstate; end;
  if refused is distinct from '23514' then raise exception 'PROBE_FAIL sec-p2-02: a thread on a listing was opened with someone who does not list it (%)', coalesce(refused, 'created'); end if;

  -- REFUSAL 3: the lister cannot open a listing thread on a guest's behalf.
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  refused := null;
  begin
    insert into public.conversations (guest_id, agent_id, listing_id) values (admin_id, lister, l_id);
  exception when others then refused := sqlstate; end;
  if refused is distinct from '23514' then raise exception 'PROBE_FAIL sec-p2-02: a lister opened a thread in a guest''s name (%)', coalesce(refused, 'created'); end if;

  -- REFUSAL 4: the daily limit. Nineteen more listing threads today (written
  -- as the service would, so they are not themselves checked) make 20; the
  -- 21st, as the member, is refused.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  for i in 1..19 loop
    insert into public.conversations (guest_id, agent_id) values (member, admin_id);
  end loop;
  select l.id into other_listing
    from public.listings l join public.agents a on a.id = l.agent_id
   where l.status = 'PUBLISHED' and a.user_id = lister and l.id <> l_id
     and not exists (select 1 from public.conversations c where c.guest_id = member and c.listing_id = l.id)
   limit 1;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  if other_listing is null then
    raise exception 'PROBE_FAIL sec-p2-02: no second published listing by the same lister, so the daily limit cannot be tested';
  end if;
  refused := null;
  begin
    insert into public.conversations (guest_id, agent_id, listing_id) values (member, lister, other_listing);
  exception when others then refused := sqlstate; end;
  if refused is distinct from '54000' then
    raise exception 'PROBE_FAIL sec-p2-02: the 21st listing thread today was not refused by the daily limit (%)', coalesce(refused, 'created');
  end if;

  raise exception 'PROBE_OK sec-p2-02: listing threads need the published listing''s lister and the caller as guest (23514), and the 21st in a day is refused (54000)';
end;
$$;
