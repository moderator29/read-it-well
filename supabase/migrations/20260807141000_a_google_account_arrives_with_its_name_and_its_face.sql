-- A Google account came in wearing nothing it already owned.
--
-- Google hands Supabase `full_name`, `name`, `avatar_url` and `picture` in the
-- identity metadata. `handle_new_user` read none of them. It read `first_name`
-- and `surname`, which only the email sign-up form ever sends, so a person who
-- tapped Continue with Google landed with the LOCAL PART OF THEIR EMAIL as
-- their display name and no photo, having just handed us both.
--
-- Two consequences, both of which the owner hit within a minute of signing up:
-- their first post said "@someone" over a grey disc, and the name on their own
-- profile was the front half of their address, which is a small privacy leak on
-- top of being wrong.
--
-- The avatar is taken only from Google's own CDN, matched against the host
-- pattern rather than trusted because it arrived in a token. `avatar_url` is
-- rendered directly by `next/image` in the feed, and `next.config.ts` allows
-- exactly this host and exactly the `/a/**` path; anything else would be a
-- render-time throw rather than a missing picture, so a value that would not
-- render is not stored.
--
-- The backfill at the end is narrow on purpose. It touches a row only where the
-- display name is still the email local part or the avatar is still absent, so
-- somebody who has since set either one keeps what they set.

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
  avatar_in    text;
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

  -- Google sends a whole name rather than two halves. Split it, because a first
  -- name and a surname is what every other surface in this product reads.
  if first_name is null and surname is null then
    full_in := nullif(trim(coalesce(meta ->> 'full_name', meta ->> 'name')), '');
    if full_in is not null then
      first_name := nullif(split_part(full_in, ' ', 1), '');
      surname    := nullif(btrim(substr(full_in, length(split_part(full_in, ' ', 1)) + 1)), '');
    end if;
  end if;

  -- Only a URL that will actually render is stored. See the note above.
  avatar_in := nullif(trim(coalesce(meta ->> 'avatar_url', meta ->> 'picture')), '');
  if avatar_in is not null and avatar_in !~ '^https://lh[0-9]\.googleusercontent\.com/' then
    avatar_in := null;
  end if;

  fallback := coalesce(
    nullif(trim(meta ->> 'display_name'), ''),
    nullif(trim(meta ->> 'full_name'), ''),
    nullif(trim(meta ->> 'name'), ''),
    nullif(trim(concat_ws(' ', first_name, surname)), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles
    (id, display_name, first_name, surname, nickname, state_code, lga_code, occupation_code, phone, avatar_url)
  values
    (new.id, fallback, first_name, surname, nickname, state_ok, lga_ok, occupation_ok,
     nullif(trim(meta ->> 'phone'), ''), avatar_in);

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

  begin
    perform private.claim_default_handle(new.id);
  exception when others then
    null;
  end;

  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- The accounts that arrived before this read anything. Narrow by design: a row
-- is only touched where the name is still the email local part or the photo is
-- still missing.
update public.profiles p
set display_name = coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      p.display_name
    ),
    first_name = coalesce(
      p.first_name,
      nullif(split_part(nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name',
                                             u.raw_user_meta_data ->> 'name')), ''), ' ', 1), '')
    ),
    avatar_url = coalesce(
      p.avatar_url,
      case
        when nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url',
                                  u.raw_user_meta_data ->> 'picture')), '')
             ~ '^https://lh[0-9]\.googleusercontent\.com/'
        then trim(coalesce(u.raw_user_meta_data ->> 'avatar_url',
                           u.raw_user_meta_data ->> 'picture'))
      end
    )
from auth.users u
where u.id = p.id
  and (p.display_name is null
       or p.display_name = split_part(coalesce(u.email, ''), '@', 1)
       or p.avatar_url is null);
