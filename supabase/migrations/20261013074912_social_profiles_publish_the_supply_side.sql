set lock_timeout = '5s';

alter table public.social_profiles add column if not exists supply_role public.supply_role;

comment on column public.social_profiles.supply_role is
  'The side of an approved supply account (agents.role): owner or agent. NULL for everyone else. Projected by private.fill_social_identity and private.sync_social_identity_from_agent, never written by the person, so a profile can say Landlord or Agent without strangers reading public.agents.';

create or replace function private.fill_social_identity()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
declare proj record;
begin
  select * into proj from private.project_social_identity(new.user_id);
  new.display_label   := proj.display_label;
  new.avatar_path     := proj.avatar_path;
  new.is_agent        := coalesce(proj.is_agent, false);
  new.occupation_code := proj.occupation_code;
  new.lga_code        := proj.lga_code;
  new.state_code      := proj.state_code;
  new.agent_id        := proj.agent_id;
  new.supply_role     := (select a.role from public.agents a
                           where a.user_id = new.user_id and a.status = 'APPROVED');
  return new;
end;
$fn$;

create or replace function private.sync_social_identity_from_agent()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
declare who uuid;
begin
  who := coalesce(new.user_id, old.user_id);
  update public.social_profiles s
     set is_agent    = proj.is_agent,
         agent_id    = proj.agent_id,
         supply_role = (select a.role from public.agents a
                         where a.user_id = who and a.status = 'APPROVED')
    from private.project_social_identity(who) proj
   where s.user_id = who;
  return null;
end;
$fn$;

grant select (supply_role) on public.social_profiles to anon;

update public.social_profiles s
   set supply_role = a.role
  from public.agents a
 where a.user_id = s.user_id and a.status = 'APPROVED'
   and s.supply_role is distinct from a.role;
