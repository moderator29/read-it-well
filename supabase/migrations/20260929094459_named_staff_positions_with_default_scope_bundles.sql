-- NAMED STAFF POSITIONS (29 September 2026).
--
-- Access was granted scope by scope, with no sense of the job. A super admin
-- now grants a POSITION (Moderator, Support Agent, CFO, ...), which sets a
-- sensible default bundle of scopes in one step; the super admin may still
-- adjust individual scopes on top. The position is stored on the grant, shown
-- to the staff member in the console with its job description, and named in
-- the email that tells them they have access.
--
-- The list here and `apps/web/src/lib/admin/staff-positions.ts` are one list;
-- `staff-positions.test.ts` reads this file and fails if they drift.

alter table public.staff_grants add column if not exists position text;
alter table public.staff_grants drop constraint if exists staff_grants_position_known;
alter table public.staff_grants add constraint staff_grants_position_known check (
  position is null or position in (
    'moderator', 'support_agent', 'kyc_reviewer', 'listings_reviewer', 'agreements_officer',
    'trust_safety_lead', 'compliance_officer', 'finance_officer', 'operations_manager',
    'cfo', 'coo', 'ceo'));

create or replace function private.staff_position_title(p_position text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select case p_position
    when 'moderator' then 'Moderator'
    when 'support_agent' then 'Support Agent'
    when 'kyc_reviewer' then 'KYC Reviewer'
    when 'listings_reviewer' then 'Listings Reviewer'
    when 'agreements_officer' then 'Agreements Officer'
    when 'trust_safety_lead' then 'Head of Trust and Safety'
    when 'compliance_officer' then 'Compliance Officer'
    when 'finance_officer' then 'Finance Officer'
    when 'operations_manager' then 'Operations Manager'
    when 'cfo' then 'Chief Financial Officer'
    when 'coo' then 'Chief Operating Officer'
    when 'ceo' then 'Chief Executive Officer'
  end;
$function$;

create or replace function private.staff_position_scopes(p_position text)
returns public.staff_scope[]
language sql
immutable
set search_path to ''
as $function$
  select case p_position
    when 'moderator' then array['moderation']::public.staff_scope[]
    when 'support_agent' then array['support']::public.staff_scope[]
    when 'kyc_reviewer' then array['kyc_review']::public.staff_scope[]
    when 'listings_reviewer' then array['listing_approval']::public.staff_scope[]
    when 'agreements_officer' then array['agreements', 'guarantee']::public.staff_scope[]
    when 'trust_safety_lead' then array['listing_approval', 'kyc_review', 'moderation', 'support']::public.staff_scope[]
    when 'compliance_officer' then array['kyc_review', 'compliance']::public.staff_scope[]
    when 'finance_officer' then array['guarantee', 'finance']::public.staff_scope[]
    when 'operations_manager' then array['support', 'agreements', 'operations']::public.staff_scope[]
    when 'cfo' then array['agreements', 'guarantee', 'finance', 'compliance']::public.staff_scope[]
    when 'coo' then array['listing_approval', 'moderation', 'support', 'agreements', 'operations']::public.staff_scope[]
    when 'ceo' then array['listing_approval', 'kyc_review', 'moderation', 'support', 'agreements', 'guarantee',
                          'finance', 'compliance', 'operations']::public.staff_scope[]
  end;
$function$;

create or replace function private.staff_scope_words(p_scopes public.staff_scope[])
returns text
language sql
immutable
set search_path to ''
as $function$
  select string_agg(case s
      when 'listing_approval' then 'Listing approval'
      when 'kyc_review' then 'KYC review'
      when 'moderation' then 'Reports and moderation'
      when 'support' then 'Support'
      when 'agreements' then 'Agreement approval'
      when 'guarantee' then 'Guarantee claims'
      when 'finance' then 'Finance'
      when 'compliance' then 'Compliance'
      when 'operations' then 'Operations'
    end, ', ' order by s)
  from unnest(p_scopes) s;
$function$;

create or replace function public.my_staff_access()
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  select jsonb_build_object(
    'is_admin', private.has_role(auth.uid(), 'admin'::public.app_role),
    'is_super_admin', private.has_role(auth.uid(), 'super_admin'::public.app_role),
    'scopes', coalesce((select to_jsonb(g.scopes::text[]) from public.staff_grants g
                         where g.user_id = auth.uid() and g.revoked_at is null), '[]'::jsonb),
    'position', (select g.position from public.staff_grants g
                  where g.user_id = auth.uid() and g.revoked_at is null),
    'handbook_version', private.staff_handbook_version(),
    'handbook_acknowledged', exists (select 1 from public.staff_handbook_acks a
                                      where a.user_id = auth.uid()
                                        and a.version = private.staff_handbook_version()));
$function$;

-- The grant takes a position. With no scopes given, the position's bundle is
-- used; with scopes given, those are used exactly (the super admin adjusted
-- them). A grant with neither is refused.
drop function if exists public.admin_grant_staff(uuid, text[], text);
create or replace function public.admin_grant_staff(
  p_user uuid, p_scopes text[] default null, p_note text default null, p_position text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor  uuid := auth.uid();
  scopes public.staff_scope[];
  prior  public.staff_grants;
  words  text;
  pos    text := nullif(btrim(coalesce(p_position, '')), '');
  title  text;
begin
  if actor is null or not private.has_role(actor, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_user is null or p_user = actor then
    return jsonb_build_object('status', 'invalid_target');
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    return jsonb_build_object('status', 'no_such_user');
  end if;
  if private.has_role(p_user, 'admin'::public.app_role) or private.has_role(p_user, 'super_admin'::public.app_role) then
    return jsonb_build_object('status', 'already_admin');
  end if;
  if pos is not null then
    title := private.staff_position_title(pos);
    if title is null then
      return jsonb_build_object('status', 'invalid_position');
    end if;
  end if;
  if p_scopes is null or cardinality(p_scopes) = 0 then
    scopes := private.staff_position_scopes(pos);
  else
    begin
      select array_agg(distinct s::public.staff_scope order by s::public.staff_scope)
        into scopes from unnest(p_scopes) s;
    exception when invalid_text_representation then
      return jsonb_build_object('status', 'invalid_scope');
    end;
  end if;
  if scopes is null or cardinality(scopes) = 0 then
    return jsonb_build_object('status', 'no_scopes');
  end if;

  select * into prior from public.staff_grants where user_id = p_user;
  insert into public.staff_grants (user_id, scopes, note, position, granted_by, granted_at, revoked_at, revoked_by, revoke_reason)
  values (p_user, scopes, nullif(btrim(p_note), ''), pos, actor, now(), null, null, null)
  on conflict (user_id) do update
    set scopes = excluded.scopes, note = excluded.note, position = excluded.position,
        granted_by = excluded.granted_by, granted_at = excluded.granted_at,
        revoked_at = null, revoked_by = null, revoke_reason = null;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, case when prior.user_id is null or prior.revoked_at is not null then 'staff.grant' else 'staff.change' end,
          'staff_grant', p_user,
          jsonb_build_object('scopes', to_jsonb(scopes::text[]),
                             'previous_scopes', case when prior.user_id is null then null else to_jsonb(prior.scopes::text[]) end,
                             'position', pos,
                             'previous_position', prior.position,
                             'note', nullif(btrim(p_note), '')));

  words := private.staff_scope_words(scopes);
  perform private.notify(p_user, 'system'::public.notification_kind,
    'You have Vallo staff access',
    coalesce('Your position: ' || title || '. ', '') || 'Access given: ' || words
      || '. Read and acknowledge the staff handbook before anything unlocks.',
    '/admin/handbook');
  perform private.email_outbox_enqueue(p_user, 'staff.access_granted',
    'staff.access_granted:' || p_user::text || ':' || extract(epoch from now())::bigint::text,
    jsonb_build_object('scopes', to_jsonb(scopes::text[]), 'scope_words', words,
                       'position', pos, 'position_title', title));

  return jsonb_build_object('status', 'ok', 'scopes', to_jsonb(scopes::text[]), 'position', pos);
end;
$function$;

revoke all on function private.staff_position_title(text) from public, anon, authenticated;
revoke all on function private.staff_position_scopes(text) from public, anon, authenticated;
revoke all on function private.staff_scope_words(public.staff_scope[]) from public, anon, authenticated;
revoke all on function public.my_staff_access() from public, anon;
revoke all on function public.admin_grant_staff(uuid, text[], text, text) from public, anon;
grant execute on function public.my_staff_access() to authenticated;
grant execute on function public.admin_grant_staff(uuid, text[], text, text) to authenticated;

-- Read back.
do $$
begin
  if private.staff_position_scopes('ceo') is null or cardinality(private.staff_position_scopes('ceo')) <> 9 then
    raise exception 'ceo bundle wrong';
  end if;
  if private.staff_position_scopes('nonsense') is not null then
    raise exception 'unknown position must have no bundle';
  end if;
  if private.staff_scope_words(array['finance','compliance','operations']::public.staff_scope[]) is distinct from 'Finance, Compliance, Operations' then
    raise exception 'scope words wrong: %', private.staff_scope_words(array['finance','compliance','operations']::public.staff_scope[]);
  end if;
  if not (public.my_staff_access() ? 'position') then
    raise exception 'my_staff_access has no position';
  end if;
end $$;

notify pgrst, 'reload schema';
