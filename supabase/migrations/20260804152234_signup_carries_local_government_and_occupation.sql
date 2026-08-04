-- A person answers where they live and what they do once, at signup.
--
-- `handle_new_user` already read a state out of the auth metadata and resolved
-- it against `public.states` by code or by name, which is why the sign-up form
-- could post "Lagos" and still land 'LA' on the row. The sign-up form now also
-- asks for a local government and an occupation, and both need the same
-- treatment: read them, check them, and drop anything that does not resolve.
--
-- Dropping rather than raising is deliberate here and only here. Everywhere
-- else in this schema a contradiction is refused loudly, because somebody is
-- watching the answer. This function runs inside the auth signup transaction,
-- so raising would not correct a bad local government, it would refuse to
-- create the account at all, and the person would be told their email was
-- rejected. The form validates first, the foreign keys hold the line, and a
-- value that still slips through is simply not written; the person can set it
-- in settings, where a refusal has somewhere to be shown.
--
-- A local government also has to sit inside the state on the same row, which
-- is the RM020 rule enforced by `private.guard_profile_place`. That trigger
-- fires on this insert too, so the check below is a courtesy that keeps the
-- signup path from ever reaching it, not the boundary itself.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  meta         jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  first_name   text := nullif(trim(meta ->> 'first_name'), '');
  surname      text := nullif(trim(meta ->> 'surname'), '');
  nickname     text := nullif(trim(meta ->> 'nickname'), '');
  state_in     text := nullif(trim(meta ->> 'state_code'), '');
  lga_in       text := nullif(lower(trim(meta ->> 'lga_code')), '');
  occupation_in text := nullif(lower(trim(meta ->> 'occupation_code')), '');
  state_ok     text;
  lga_ok       text;
  occupation_ok text;
  fallback     text;
  seeded       public.app_role;
begin
  select s.code into state_ok
  from public.states s
  where s.code = state_in or lower(s.name) = lower(state_in)
  limit 1;

  -- The local government is kept only when it exists and belongs to the state
  -- we just resolved. With no state on the row, the local government supplies
  -- one, exactly as the place guard does.
  if lga_in is not null then
    select l.code, l.state_code into lga_ok, state_ok
    from public.local_governments l
    where l.code = lga_in
      and (state_ok is null or l.state_code = state_ok)
    limit 1;

    if lga_ok is null then
      -- Put the state back: a bad local government must not clear a good state.
      select s.code into state_ok
      from public.states s
      where s.code = state_in or lower(s.name) = lower(state_in)
      limit 1;
    end if;
  end if;

  if occupation_in is not null then
    select o.code into occupation_ok
    from public.occupations o
    where o.code = occupation_in
    limit 1;
  end if;

  fallback := coalesce(
    nullif(trim(meta ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', first_name, surname)), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles
    (id, display_name, first_name, surname, nickname, state_code, lga_code, occupation_code, phone)
  values
    (new.id, fallback, first_name, surname, nickname, state_ok, lga_ok, occupation_ok,
     nullif(trim(meta ->> 'phone'), ''));

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  -- An allow-listed address arrives elevated.
  select b.role into seeded
  from public.admin_bootstrap b
  where lower(b.email) = lower(trim(coalesce(new.email, '')))
  limit 1;

  if seeded is not null then
    insert into public.user_roles (user_id, role)
    values (new.id, seeded)
    on conflict do nothing;

    update public.admin_bootstrap
    set claimed_at = now()
    where lower(email) = lower(trim(coalesce(new.email, '')));
  end if;

  return new;
end;
$function$;
