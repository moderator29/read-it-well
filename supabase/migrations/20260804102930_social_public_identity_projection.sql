-- A public profile page could not show anyone a name or a photo.
--
-- public.profiles is select-own-or-admin, and correctly so: it holds a phone
-- number and a settings blob. public.agents is the same. So a visitor opening
-- /u/tolu got "@tolu" and a blank, while Tolu opening their own page saw a name
-- and an avatar. That is not a profile.
--
-- The house has already solved this exact problem once, in reviews.author_label:
-- a denormalised public column, written only by a security definer trigger,
-- never accepted from a client. Same shape here, for the three facts a stranger
-- legitimately needs and nothing else.
--
--   display_label  the name to show, derived from profiles
--   avatar_path    the photo, from the same source AccountProfile already writes
--   is_agent       a role marker, true only for an APPROVED agent
--
-- Deliberately NOT projected: phone, email, locale, settings, state, agent type,
-- application id. A projection is a disclosure decision, so it lists what it
-- lets out rather than what it holds back.

alter table public.social_profiles
  add column display_label text,
  add column avatar_path   text,
  add column is_agent      boolean not null default false;

comment on column public.social_profiles.display_label is
  'Public name, projected from public.profiles by trigger. Never client supplied.';
comment on column public.social_profiles.avatar_path is
  'Public avatar URL or object path, projected from public.profiles by trigger. Never client supplied.';
comment on column public.social_profiles.is_agent is
  'True when this user holds an APPROVED agents row. A role marker, not an earned badge.';

create function private.project_social_identity(p_user uuid)
returns table (display_label text, avatar_path text, is_agent boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    nullif(btrim(coalesce(
      p.display_name,
      nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.surname, '')), ''),
      p.nickname
    )), ''),
    p.avatar_url,
    exists (select 1 from public.agents a where a.user_id = p_user and a.status = 'APPROVED')
  from public.profiles p
  where p.id = p_user;
$$;

-- On write the three columns are OVERWRITTEN from the projection, whatever the
-- client sent. That is what makes them unspoofable without a column-level grant:
-- the update policy may allow the row, but these values are never the client's.
create function private.fill_social_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj record;
begin
  select * into proj from private.project_social_identity(new.user_id);
  new.display_label := proj.display_label;
  new.avatar_path   := proj.avatar_path;
  new.is_agent      := coalesce(proj.is_agent, false);
  return new;
end;
$$;

-- Runs after the handle validator and the bio scanner so it cannot be tripped by
-- either. Trigger order inside a timing class is alphabetical, and the "zz"
-- sorts it last on purpose.
create trigger social_profiles_zz_identity
  before insert or update on public.social_profiles
  for each row execute function private.fill_social_identity();

create function private.sync_social_identity_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.display_name is distinct from old.display_name
     or new.first_name is distinct from old.first_name
     or new.surname    is distinct from old.surname
     or new.nickname   is distinct from old.nickname
     or new.avatar_url is distinct from old.avatar_url then
    update public.social_profiles s
       set display_label = proj.display_label,
           avatar_path   = proj.avatar_path
      from private.project_social_identity(new.id) proj
     where s.user_id = new.id;
  end if;
  return null;
end;
$$;

create trigger profiles_sync_social_identity
  after update on public.profiles
  for each row execute function private.sync_social_identity_from_profile();

create function private.sync_social_agent_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.social_profiles
     set is_agent = (new.status = 'APPROVED')
   where user_id = new.user_id;
  return null;
end;
$$;

-- Fires on approval and, just as importantly, on suspension: an agent chip that
-- survives a suspension is worse than no chip at all.
create trigger agents_sync_social_flag
  after insert or update of status on public.agents
  for each row execute function private.sync_social_agent_flag();
