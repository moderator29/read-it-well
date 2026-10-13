-- Applied 13 October 2026 (owner proof of ownership and one side per account, founder decisions).
set lock_timeout = '5s';

create or replace function private.one_side_per_account()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  uid uuid := auth.uid();
  wanted text := case when new.supply_role = 'owner' then 'owner' else 'agent' end;
  held text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if uid is not null
     and (private.has_role(uid, 'admin'::public.app_role)
          or private.has_role(uid, 'super_admin'::public.app_role)) then
    return new;
  end if;

  select case when a.role::text = 'owner' then 'owner' else 'agent' end
    into held
    from public.agents a
   where a.user_id = new.user_id;

  if held is null then
    select case when x.supply_role = 'owner' then 'owner' else 'agent' end
      into held
      from public.agent_applications x
     where x.user_id = new.user_id
       and x.id <> new.id
       and x.status in ('SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'APPROVED')
       and (case when x.supply_role = 'owner' then 'owner' else 'agent' end) <> wanted
     limit 1;
  end if;

  if held is not null and held <> wanted then
    raise exception 'This account is already % account. One account holds one side; apply from a separate account.',
      case when held = 'owner' then 'an owner''s' else 'an agent''s' end
      using errcode = '42501';
  end if;
  return new;
end;
$fn$;

revoke all on function private.one_side_per_account() from public, anon, authenticated;

create or replace trigger agent_applications_02_one_side_per_account
  before insert on public.agent_applications
  for each row execute function private.one_side_per_account();

