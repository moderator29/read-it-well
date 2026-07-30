-- Real identity columns on profiles.
--
-- Sign-up collects a first name, surname, optional nickname and state, and
-- until now the profile row had nowhere to put them: only display_name. The
-- settings jsonb was standing in, which works for preferences and fails for
-- identity, because admin support will need to find a person by surname, the
-- agent verification queue needs their legal name beside their documents, and
-- emails want a first name to greet. Those are column jobs, not blob jobs.
--
-- display_name stays as the single rendered form and is kept coherent by a
-- trigger, so no caller can leave it disagreeing with the parts. state_code
-- references the seeded states table, so a profile can never claim a state
-- that does not exist.

alter table public.profiles
  add column first_name text,
  add column surname    text,
  add column nickname   text,
  add column state_code text references public.states (code);

comment on column public.profiles.first_name is 'Given name, as collected at sign-up.';
comment on column public.profiles.surname    is 'Family name, as collected at sign-up.';
comment on column public.profiles.nickname   is 'Optional preferred name, shown in greetings when set.';
comment on column public.profiles.state_code is 'The user''s state of residence, referencing the seeded states table.';

create index profiles_surname_idx    on public.profiles (surname);
create index profiles_state_code_idx on public.profiles (state_code);

-- display_name is derived, never independently edited: nickname when set,
-- otherwise the full name, otherwise whatever was already there (so rows
-- created by the signup trigger before these columns existed keep their name).
create function private.sync_profile_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name text;
begin
  full_name := trim(both ' ' from concat_ws(' ', nullif(trim(new.first_name), ''), nullif(trim(new.surname), '')));

  if nullif(trim(new.nickname), '') is not null then
    new.display_name := trim(new.nickname);
  elsif full_name <> '' then
    new.display_name := full_name;
  end if;

  return new;
end;
$$;

revoke execute on function private.sync_profile_display_name() from public, anon, authenticated;

create trigger profiles_sync_display_name
  before insert or update of first_name, surname, nickname on public.profiles
  for each row execute function private.sync_profile_display_name();

-- Backfill: split any existing display_name into parts so the new columns are
-- not empty for users who signed up before this migration.
update public.profiles
set first_name = split_part(display_name, ' ', 1),
    surname    = nullif(trim(substr(display_name, strpos(display_name, ' ') + 1)), split_part(display_name, ' ', 1))
where display_name is not null
  and trim(display_name) <> ''
  and first_name is null;
