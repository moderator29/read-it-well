-- Nobody should ever be "@someone" on their own post.
--
-- A handle was claimable and only claimable: `social_profiles` got a row when
-- somebody walked to /u/me/edit and typed one. Almost nobody does that before
-- they write their first post, so the ordinary path was: sign up, post, and
-- read your own words under "@someone" with a grey circle where your face
-- should be. The feed reader resolves an author by joining `social_profiles`
-- on `author_id`, so with no row there is no name, no avatar and no page to
-- tap through to. The database was not broken; the identity simply had never
-- been created.
--
-- So a handle is now made AT SIGNUP, from what the person already told us, and
-- claiming one becomes CHANGING one, which is a much smaller ask. The rules do
-- not move: the same validator trigger runs on this insert as on any other, so
-- a generated handle is checked against the charset, the reserved list, the
-- lookalike ban and the 90 day release lock exactly like a typed one.
--
-- Three properties this had to have, and the reason for each:
--
--   IT CAN NEVER FAIL A SIGNUP. It runs inside the auth transaction, so an
--   exception here does not mean "no handle", it means "your email was
--   rejected" for a person who did nothing wrong. Every path is wrapped, and a
--   failure leaves the account without a handle rather than without an account.
--
--   IT MUST NOT LEAK THE EMAIL. Falling back to the address local part is the
--   obvious seed and it is a disclosure: "kemi.adeyemi" published as a handle
--   tells a stranger most of an email address. The local part is used only when
--   it carries no dot, no plus and no digits run that looks like an identifier,
--   and otherwise the seed is the name the person typed.
--
--   IT MUST TERMINATE. Uniqueness is resolved by suffixing, and the suffix
--   space is bounded, so the loop ends in a fixed number of tries and then
--   falls back to a random tail that is not going to collide.

-- ---------------------------------------------------------------------------
-- Turning what somebody typed into something the handle rules accept
-- ---------------------------------------------------------------------------

create or replace function private.handle_seed(p_text text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  if p_text is null then return null; end if;

  -- Fold to the charset the check constraint allows. Accented letters are
  -- transliterated by unaccent where it exists; it does not on this project, so
  -- anything outside a-z0-9 simply goes, which is the same answer a person
  -- would get typing the handle themselves.
  s := lower(btrim(p_text));
  s := regexp_replace(s, '[^a-z0-9]+', '_', 'g');
  s := regexp_replace(s, '_+', '_', 'g');
  s := btrim(s, '_');

  -- Must start with a letter.
  s := regexp_replace(s, '^[^a-z]+', '');

  if s is null or length(s) < 3 then return null; end if;

  -- Anything resembling us is refused by the validator, so it is not offered
  -- here either: the seed is dropped and the next candidate is tried.
  if s like '%rentme%' or s like '%naijafinds%' then return null; end if;

  -- Leave room for a suffix inside the 20 character ceiling.
  return substr(s, 1, 15);
end;
$$;

comment on function private.handle_seed(text) is
  'Folds arbitrary text into a handle stem, or null when nothing usable remains.';

-- ---------------------------------------------------------------------------
-- Claiming one on somebody's behalf
-- ---------------------------------------------------------------------------

create or replace function private.claim_default_handle(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  prof      record;
  local     text;
  seeds     text[];
  seed      text;
  candidate text;
  n         integer;
begin
  if p_user is null then return null; end if;

  -- Already has one. Nothing to do, and nothing to overwrite: a handle is the
  -- person's, and this function only ever fills an absence.
  if exists (select 1 from public.social_profiles s where s.user_id = p_user) then
    return null;
  end if;

  select p.display_name, p.first_name, p.surname, p.nickname, u.email
    into prof
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.id = p_user;

  if not found then return null; end if;

  -- The email local part, but only when it is not itself identifying. A dot or
  -- a plus is the shape of a real address, and publishing that shape as a
  -- handle hands a stranger the address.
  local := split_part(coalesce(prof.email, ''), '@', 1);
  if local like '%.%' or local like '%+%' or length(local) < 3 then
    local := null;
  end if;

  seeds := array_remove(array[
    private.handle_seed(prof.nickname),
    private.handle_seed(nullif(btrim(concat_ws('_', prof.first_name, prof.surname)), '')),
    private.handle_seed(prof.first_name),
    private.handle_seed(prof.display_name),
    private.handle_seed(local)
  ], null);

  -- Somebody whose name folds to nothing at all still gets a handle. "user" is
  -- on the reserved list on purpose, so the stem here is one nobody would type
  -- and the number is what makes it theirs.
  if array_length(seeds, 1) is null then
    seeds := array['neighbour'];
  end if;

  foreach seed in array seeds loop
    -- The bare seed first, then seed2 .. seed40. Bounded, so this ends.
    for n in 0 .. 40 loop
      candidate := case when n = 0 then seed else seed || n::text end;

      if length(candidate) between 3 and 20
         and not exists (select 1 from public.social_profiles s where s.handle = candidate)
         and not exists (select 1 from private.reserved_handles r where r.handle = candidate)
         and not exists (
           select 1 from private.released_handles rh
           where rh.handle = candidate and rh.released_at > now() - interval '90 days'
         )
      then
        begin
          insert into public.social_profiles (user_id, handle) values (p_user, candidate);
          return candidate;
        exception when unique_violation then
          -- Two signups racing for one stem. Keep going rather than raising:
          -- the next number is free.
          null;
        end;
      end if;
    end loop;
  end loop;

  -- Everything sensible was taken. A random tail is not pretty and it is not
  -- meant to be: it is the difference between a name and no name, and the
  -- person can change it in one tap.
  candidate := 'neighbour' || substr(md5(p_user::text || clock_timestamp()::text), 1, 8);
  begin
    insert into public.social_profiles (user_id, handle) values (p_user, candidate);
    return candidate;
  exception when others then
    return null;
  end;
end;
$$;

comment on function private.claim_default_handle(uuid) is
  'Gives a user a handle derived from their own answers. Never overwrites one, never raises.';

revoke all on function private.claim_default_handle(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Signup calls it, and cannot be broken by it
-- ---------------------------------------------------------------------------

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
  full_in      text;
begin
  select s.code into state_ok
  from public.states s
  where s.code = state_in or lower(s.name) = lower(state_in)
  limit 1;

  if lga_in is not null then
    select l.code, l.state_code into lga_ok, state_ok
    from public.local_governments l
    where l.code = lga_in
      and (state_ok is null or l.state_code = state_ok)
    limit 1;

    if lga_ok is null then
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

  -- Google hands us `full_name` and `name` rather than a first name and a
  -- surname, and neither was read, so a Google signup landed with the email
  -- local part as its display name and nothing to build a handle from. Both
  -- are read now, and split, because "Kemi Adeyemi" is a first name and a
  -- surname everywhere else in this product.
  if first_name is null and surname is null then
    full_in := nullif(trim(coalesce(meta ->> 'full_name', meta ->> 'name')), '');
    if full_in is not null then
      first_name := nullif(split_part(full_in, ' ', 1), '');
      surname    := nullif(btrim(substr(full_in, length(split_part(full_in, ' ', 1)) + 1)), '');
    end if;
  end if;

  fallback := coalesce(
    nullif(trim(meta ->> 'display_name'), ''),
    nullif(trim(meta ->> 'full_name'), ''),
    nullif(trim(meta ->> 'name'), ''),
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

  -- The identity, last and swallowed. Everything above is what an account IS;
  -- a handle is what it is CALLED, and no naming problem is worth telling
  -- somebody their signup failed. If this leaves nothing behind, /u/me/edit is
  -- still there and the profile page still offers it.
  begin
    perform private.claim_default_handle(new.id);
  exception when others then
    null;
  end;

  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The people who signed up before this existed
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    left join public.social_profiles s on s.user_id = p.id
    where s.user_id is null
  loop
    perform private.claim_default_handle(r.id);
  end loop;
end;
$$;
