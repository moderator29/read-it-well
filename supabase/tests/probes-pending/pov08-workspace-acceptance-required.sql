-- POV08 (pending migrations pov07 and pov08): a member cannot file a
-- workspace application, or send a host setup for review, without the Terms,
-- the Privacy Policy and the pay-on-Vallo statement on record; with them the
-- same write goes through; staff and the service role are not stopped.
-- Everything is rolled back by the final raise.
do $$
declare
  member uuid;
  accepted constant jsonb := jsonb_build_object('agreements', jsonb_build_array(
    jsonb_build_object('document', 'terms', 'version', '2026-10-13', 'at', '2026-10-13T10:00:00Z'),
    jsonb_build_object('document', 'privacy', 'version', '2026-09-25', 'at', '2026-10-13T10:00:00Z'),
    jsonb_build_object('document', 'pay_on_vallo', 'version', '2026-10-13', 'at', '2026-10-13T10:00:00Z')));
  without_pay constant jsonb := jsonb_build_object('agreements', jsonb_build_array(
    jsonb_build_object('document', 'terms', 'version', '2026-10-13', 'at', '2026-10-13T10:00:00Z'),
    jsonb_build_object('document', 'privacy', 'version', '2026-09-25', 'at', '2026-10-13T10:00:00Z')));
  biz uuid;
  refused boolean;
begin
  -- A member with no application and no workspace, so nothing else refuses.
  select u.id into member from auth.users u
   where not exists (select 1 from public.agent_applications a where a.user_id = u.id)
     and not exists (select 1 from public.agents g where g.user_id = u.id)
     and not exists (select 1 from public.businesses b where b.owner_id = u.id)
     and not private.has_role(u.id, 'admin'::public.app_role)
     and not private.has_role(u.id, 'super_admin'::public.app_role)
   order by u.created_at limit 1;
  if member is null then
    raise exception 'PROBE_FAIL pov08-workspace-acceptance-required: fixtures missing (a member with no application)';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- 1. An application without the pay-on-Vallo statement is refused.
  refused := false;
  begin
    insert into public.agent_applications (user_id, type, status, supply_role, full_name, phone, agree_terms, consents)
    values (member, 'individual', 'SUBMITTED', 'owner', 'Probe Owner', '+2348031234567', true, without_pay);
  exception when insufficient_privilege then
    refused := sqlerrm like 'acceptance_required%';
  end;
  if not refused then
    raise exception 'PROBE_FAIL pov08-workspace-acceptance-required: an application was filed without the pay-on-Vallo statement';
  end if;

  -- 2. With all three, it is filed.
  insert into public.agent_applications (user_id, type, status, supply_role, full_name, phone, agree_terms, consents)
  values (member, 'individual', 'SUBMITTED', 'owner', 'Probe Owner', '+2348031234567', true, accepted);

  -- 3. A host setup moved to SUBMITTED without it is refused, and with it goes.
  insert into public.businesses (owner_id, kind, name, slug, status, consents)
  values (member, 'hotel', 'Probe POV08 Hotel', 'probe-pov08-' || gen_random_uuid(), 'DRAFT', without_pay)
  returning id into biz;
  refused := false;
  begin
    update public.businesses set status = 'SUBMITTED' where id = biz;
  exception when insufficient_privilege then
    refused := sqlerrm like 'acceptance_required%';
  end;
  if not refused then
    raise exception 'PROBE_FAIL pov08-workspace-acceptance-required: a host setup was sent without the pay-on-Vallo statement';
  end if;
  update public.businesses set consents = accepted where id = biz;
  update public.businesses set status = 'SUBMITTED' where id = biz;
  reset role;

  -- 4. The service role is not stopped (staff tools, repairs).
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.businesses set status = 'DRAFT', consents = '{}'::jsonb where id = biz;
  update public.businesses set status = 'SUBMITTED' where id = biz;

  if not exists (select 1 from pg_trigger where tgname = 'agent_applications_03_acceptance_required' and tgenabled = 'O')
     or not exists (select 1 from pg_trigger where tgname = 'businesses_02_acceptance_required' and tgenabled = 'O') then
    raise exception 'PROBE_FAIL pov08-workspace-acceptance-required: a trigger is missing or disabled';
  end if;

  raise exception 'PROBE_OK pov08-workspace-acceptance-required';
end
$$;
