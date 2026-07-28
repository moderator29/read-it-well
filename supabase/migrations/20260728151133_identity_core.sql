-- Identity core: profiles and role-based access.
--
-- The foundation every other subsystem builds on. A profile is created
-- automatically for each auth user; roles are separate rows so a user can hold
-- several (a person can be both a normal user and an agent). RLS is on from
-- creation (Master Rules 10 and 11): a user sees and edits only their own
-- profile, reads only their own roles, and can never grant themselves a role.
-- Role changes are a privileged operation performed by the service layer or an
-- admin, never by the end user.

-- Roles a user can hold. 'user' is the default everyone gets on signup.
create type public.app_role as enum ('user', 'agent', 'admin', 'super_admin');

-- Supported product locales, matching packages/i18n.
create type public.locale as enum ('en', 'yo', 'ha', 'ig');

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  phone        text,
  locale       public.locale not null default 'en',
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

comment on table public.profiles is 'One row per auth user. Public-facing identity and preferences.';

create table public.user_roles (
  user_id    uuid          not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  granted_at timestamptz   not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is 'Roles held by a user. A user may hold several.';

-- Authoritative role check for use inside RLS policies. security definer so it
-- can read user_roles regardless of the caller's own policies, avoiding the
-- recursive-policy trap. search_path is pinned for safety.
create or replace function public.has_role(check_user_id uuid, check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role = check_role
  );
$$;

-- Keep updated_at honest.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile and default 'user' role the moment an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security.
alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;

-- Profiles: a user reads and updates only their own. No client-side insert or
-- delete; creation is the signup trigger, deletion cascades from auth.users.
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins may read any profile for moderation and support.
create policy profiles_select_admin
  on public.profiles for select
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- Roles: a user may read their own set. Granting and revoking is done by the
-- service layer (service role bypasses RLS) or by an admin, never by the user
-- on themselves, so there is no self-insert policy.
create policy user_roles_select_own
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy user_roles_select_admin
  on public.user_roles for select
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create policy user_roles_admin_manage
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));
