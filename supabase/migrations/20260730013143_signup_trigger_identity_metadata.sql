-- Carry the sign-up form's identity into the profile row.
--
-- Sign-up collects a first name, surname, optional nickname and state, and the
-- trigger only ever kept a display_name, so every one of those answers was
-- discarded the moment the account existed and the person had to type them
-- again on the profile screen. The identity columns exist now, so the trigger
-- maps the metadata the sign-up call passes into them, and display_name falls
-- out of the sync trigger rather than being guessed here.
--
-- state_code is only accepted when it actually matches a seeded state, because
-- a foreign key violation inside a signup trigger would fail the whole account
-- creation, and losing an account over a stray state string would be absurd.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta       jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  first_name text := nullif(trim(meta ->> 'first_name'), '');
  surname    text := nullif(trim(meta ->> 'surname'), '');
  nickname   text := nullif(trim(meta ->> 'nickname'), '');
  state_in   text := nullif(trim(meta ->> 'state_code'), '');
  state_ok   text;
  fallback   text;
begin
  -- Only a real state code survives. Match on code first, then on name, since
  -- the sign-up form presents names.
  select s.code into state_ok
  from public.states s
  where s.code = state_in or lower(s.name) = lower(state_in)
  limit 1;

  -- Something is always better than nothing in the name column: the metadata
  -- display_name, then the two parts, then the local part of the email.
  fallback := coalesce(
    nullif(trim(meta ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', first_name, surname)), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, display_name, first_name, surname, nickname, state_code, phone)
  values (
    new.id,
    fallback,
    first_name,
    surname,
    nickname,
    state_ok,
    nullif(trim(meta ->> 'phone'), '')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;
