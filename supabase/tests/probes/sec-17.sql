-- SEC-17: a member can no longer ask whether another person is a seller,
-- landlord or agent; the service role still can; the public agent-trust
-- read a profile page needs still answers.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  other constant uuid := 'e0000000-0000-4000-8000-000000000001';
  refused text;
  answer boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  refused := null;
  begin
    perform public.verification_is_required(other);
  exception when others then refused := sqlstate; end;
  if refused is distinct from '42501' then
    raise exception 'PROBE_FAIL sec-17: a member asked verification_is_required about another account (%)', coalesce(refused, 'answered');
  end if;

  -- CONTROL: the profile page's read of another agent's trust still works.
  perform * from public.agent_trust(other);

  reset role;
  set local role service_role;
  select public.verification_is_required(other) into answer;
  if answer is null then raise exception 'PROBE_FAIL sec-17: the service role lost the rule'; end if;

  raise exception 'PROBE_OK sec-17: verification_is_required is server-side only; agent_trust still answers';
end;
$$;
