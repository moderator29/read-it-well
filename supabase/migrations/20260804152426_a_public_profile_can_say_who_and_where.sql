-- Two things a visitor could not see, and one type that disagreed with its own design.
--
-- 1. OCCUPATION AND PLACE WERE INVISIBLE TO EVERYONE BUT THEIR OWNER.
--
--    I put `occupation_code` and `lga_code` on `public.profiles`, whose only
--    select policies are "your own" and "an admin". The profile screen renders
--    an occupation chip and a location meta row, so both were correct for the
--    person looking at their own page and honestly blank for everybody else,
--    which is the entire audience the chip exists for.
--
--    `social_profiles` is the public projection and already solves this for the
--    display name, the avatar and the agent marker: those columns are
--    OVERWRITTEN from `private.project_social_identity` on every write, so they
--    are unspoofable without a column-level grant. The fix is to project three
--    more fields the same way, not to loosen a policy on `profiles`, which
--    holds a phone number.
--
-- 2. `agent_id` WAS NOT PROJECTED EITHER, AND IT GATES A WHOLE TAB SET.
--
--    `is_agent` said whether somebody is an agent; nothing said WHICH agent, so
--    a profile could not read that agent's listings. An agent fell back to the
--    member tabs, because the alternative was a Properties tab that could only
--    ever be empty.
--
--    It also has to stay fresh when somebody BECOMES an agent, which nothing
--    did: the projection was only refreshed when the person next edited their
--    own profile, so a newly approved agent kept the member tabs until they
--    happened to change their bio. The approval is the event, so the approval
--    now does the work.
--
-- 3. `review_responses.agent_id` IS NOT NULL WITH NO DEFAULT, AND A TRIGGER
--    STAMPS IT.
--
--    Right at runtime, wrong in the type. The generated `database.types.ts`
--    marked the column REQUIRED on insert, so the server action that correctly
--    refuses to send it failed to compile and took the production build red.
--    The design said "the client may not claim this"; the type said "the client
--    must supply this".
--
--    A default settles it in the design's favour: the column has one now, so
--    the type is optional, and the BEFORE trigger still overwrites whatever
--    arrives. Two locks on the same door, and the outer one is finally visible
--    to TypeScript.

create or replace function public.current_agent_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $fn$
  select id from public.agents where user_id = (select auth.uid());
$fn$;

comment on function public.current_agent_id() is
  'The caller''s own agents row id, or null. Exists so a column default can name it: a DEFAULT may call a function but may not contain a subquery.';

revoke execute on function public.current_agent_id() from public;
grant  execute on function public.current_agent_id() to authenticated;

alter table public.review_responses
  alter column agent_id set default public.current_agent_id();

alter table public.social_profiles
  add column if not exists occupation_code text,
  add column if not exists lga_code        text,
  add column if not exists state_code      text,
  add column if not exists agent_id        uuid;

comment on column public.social_profiles.occupation_code is
  'Projected from public.profiles by trigger, never client supplied. Join public.occupations for the label.';
comment on column public.social_profiles.lga_code is
  'Projected from public.profiles by trigger. Join public.local_governments for the name.';
comment on column public.social_profiles.agent_id is
  'The agents row id when this person is an approved agent. Projected, never client supplied. What lets a profile read that agent''s listings.';

create index if not exists social_profiles_agent_idx on public.social_profiles (agent_id) where agent_id is not null;

/* The return type grows, and Postgres will not widen one in place, so both
   triggers come off, the function is dropped, and everything goes back
   together. */
drop trigger if exists social_profiles_zz_identity on public.social_profiles;
drop trigger if exists profiles_sync_social_identity on public.profiles;
drop function if exists private.fill_social_identity();
drop function if exists private.sync_social_identity_from_profile();
drop function if exists private.project_social_identity(uuid);

create function private.project_social_identity(p_user uuid)
returns table (
  display_label   text,
  avatar_path     text,
  is_agent        boolean,
  occupation_code text,
  lga_code        text,
  state_code      text,
  agent_id        uuid
)
language sql stable security definer set search_path = public as $fn$
  select
    nullif(btrim(coalesce(
      p.display_name,
      nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.surname, '')), ''),
      p.nickname
    )), ''),
    p.avatar_url,
    exists (select 1 from public.agents a where a.user_id = p_user and a.status = 'APPROVED'),
    p.occupation_code,
    p.lga_code,
    p.state_code,
    (select a.id from public.agents a where a.user_id = p_user and a.status = 'APPROVED')
  from public.profiles p
  where p.id = p_user;
$fn$;

create function private.fill_social_identity()
returns trigger language plpgsql security definer set search_path = public as $fn$
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
  return new;
end;
$fn$;

revoke execute on function private.fill_social_identity() from public, anon, authenticated;

create trigger social_profiles_zz_identity
  before insert or update on public.social_profiles
  for each row execute function private.fill_social_identity();

create function private.sync_social_identity_from_profile()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.display_name       is distinct from old.display_name
     or new.first_name      is distinct from old.first_name
     or new.surname         is distinct from old.surname
     or new.nickname        is distinct from old.nickname
     or new.avatar_url      is distinct from old.avatar_url
     or new.occupation_code is distinct from old.occupation_code
     or new.lga_code        is distinct from old.lga_code
     or new.state_code      is distinct from old.state_code then
    update public.social_profiles s
       set display_label   = proj.display_label,
           avatar_path     = proj.avatar_path,
           occupation_code = proj.occupation_code,
           lga_code        = proj.lga_code,
           state_code      = proj.state_code
      from private.project_social_identity(new.id) proj
     where s.user_id = new.id;
  end if;
  return null;
end;
$fn$;

revoke execute on function private.sync_social_identity_from_profile() from public, anon, authenticated;

create trigger profiles_sync_social_identity
  after update on public.profiles
  for each row execute function private.sync_social_identity_from_profile();

create or replace function private.sync_social_identity_from_agent()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare who uuid;
begin
  who := coalesce(new.user_id, old.user_id);
  update public.social_profiles s
     set is_agent = proj.is_agent,
         agent_id = proj.agent_id
    from private.project_social_identity(who) proj
   where s.user_id = who;
  return null;
end;
$fn$;

revoke execute on function private.sync_social_identity_from_agent() from public, anon, authenticated;

drop trigger if exists agents_sync_social_identity on public.agents;
create trigger agents_sync_social_identity
  after insert or update or delete on public.agents
  for each row execute function private.sync_social_identity_from_agent();

/* Backfill. UPDATE ... FROM cannot reference the target table inside a set
   returning call, which is a mistake I made once here before fixing it, so the
   projection is joined through a subquery keyed on user_id rather than called
   laterally against `s`. */
update public.social_profiles s
   set display_label   = proj.display_label,
       avatar_path     = proj.avatar_path,
       is_agent        = coalesce(proj.is_agent, false),
       occupation_code = proj.occupation_code,
       lga_code        = proj.lga_code,
       state_code      = proj.state_code,
       agent_id        = proj.agent_id
  from (
    select sp.user_id, p.*
      from public.social_profiles sp,
      lateral private.project_social_identity(sp.user_id) p
  ) proj
 where proj.user_id = s.user_id;
