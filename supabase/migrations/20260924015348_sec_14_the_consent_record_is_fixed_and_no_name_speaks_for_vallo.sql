-- SEC-14: sign-up metadata is written by whoever calls GoTrue, and a member
-- can edit their own consent record.
--
-- 1. The consent record on a profile is not the member's to write. A new
--    profile takes no terms claim from sign-up metadata (anyone can put any
--    terms_version there with the public key); the receipt is
--    public.terms_acceptances, written only by the server after it checked
--    the version the form carried. After creation a member cannot change
--    terms_accepted_at, terms_version, welcomed_at, created_at or id.
--    Admins and the service role are not members (content_writer_is_member)
--    and are unaffected, so admin tools keep working through their own token.
-- 2. A member's name cannot claim to speak for Vallo. Each name field is
--    judged on its own (never joined to its neighbours): look-alike letters
--    and digits read as Latin ("Ｖａｌｌｏ", "Vаllo" in Cyrillic, "Va11o"),
--    split into words, runs of single letters joined ("V a l l o" becomes "vallo"),
--    and refused when a word is "vallo", "vallo" with digits, or "vallo" run
--    into a staff word ("vallosupport", "valloteam", "vallohq"), or is admin,
--    administrator or moderator. Real names that merely contain the letters
--    (Eva Lloyd, Cavallo, Vallory) and "Official" or "Staff" on their own
--    pass. A member's own edit of a field is refused (RM004, which the
--    profile form already shows as written); only fields that changed are
--    judged, so an existing name never locks its owner out. At sign-up, where
--    there is no one to answer, a matching field is cleared and the public
--    name becomes "Member", as the content scanner does.
-- 3. The handle "member" is reserved, so nobody owns the generic word.
-- Existing rows are not rewritten.

create or replace function private.name_claims_to_be_vallo(field text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  plain text;
  word text;
  run text := '';
  words text[] := '{}';
begin
  if field is null or btrim(field) = '' then
    return false;
  end if;
  -- Look-alikes read as the Latin letter they imitate: NFKC folds full-width
  -- and styled forms ("Ｖａｌｌｏ"), and Cyrillic and Greek letters that
  -- render as Latin ones ("Vаllo" with a Cyrillic a) are mapped across.
  plain := lower(translate(normalize(field, NFKC),
    'АВЕКМНОРСТХУІЈавекмнорстхуіјӏΑΒΕΖΗΙΚΜΝΟΡΤΥΧαονικτυρ',
    'avekmhopctxyijavekmhopctxyijlabezhikmnoptyxaoviktup'));
  foreach word in array regexp_split_to_array(plain, '[^a-z0-9]+') loop
    if word = '' then
      continue;
    elsif length(word) = 1 then
      run := run || word;
    else
      if run <> '' then words := words || run; run := ''; end if;
      words := words || word;
    end if;
  end loop;
  if run <> '' then words := words || run; end if;

  foreach word in array words loop
    if word ~ '^(admin|administrator|moderator)$'
       or word ~ '^vallo[0-9]*$'
       or word ~ '^vallo(support|team|official|staff|admin|hq|ng|care|help|app)[0-9]*$'
       -- Digits standing in for letters: "Vall0", "Va11o".
       or translate(word, '01', 'ol') ~ '^vallo(support|team|official|staff|admin|hq|ng|care|help|app)?$' then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

revoke all on function private.name_claims_to_be_vallo(text) from public, anon, authenticated;

create or replace function private.guard_profile_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.terms_accepted_at := null;
    new.terms_version := null;
    if not private.content_writer_is_member()
       and (private.name_claims_to_be_vallo(new.display_name)
            or private.name_claims_to_be_vallo(new.nickname)
            or private.name_claims_to_be_vallo(new.first_name)
            or private.name_claims_to_be_vallo(new.surname)) then
      if private.name_claims_to_be_vallo(new.first_name) then new.first_name := null; end if;
      if private.name_claims_to_be_vallo(new.surname) then new.surname := null; end if;
      new.nickname := null;
      new.display_name := 'Member';
    end if;
    return new;
  end if;

  if not private.content_writer_is_member() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
     or new.terms_accepted_at is distinct from old.terms_accepted_at
     or new.terms_version is distinct from old.terms_version
     or new.welcomed_at is distinct from old.welcomed_at then
    raise exception 'That part of your profile is a record and does not change.'
      using errcode = 'insufficient_privilege';
  end if;

  if (new.display_name is distinct from old.display_name and private.name_claims_to_be_vallo(new.display_name))
     or (new.first_name is distinct from old.first_name and private.name_claims_to_be_vallo(new.first_name))
     or (new.surname is distinct from old.surname and private.name_claims_to_be_vallo(new.surname))
     or (new.nickname is distinct from old.nickname and private.name_claims_to_be_vallo(new.nickname)) then
    raise exception 'That name reads as if it speaks for Vallo. Please use your own name.'
      using errcode = 'RM004';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_record() from public, anon, authenticated;

-- Last of the BEFORE triggers (after the display-name sync and the content
-- scanner), so it judges the name that will be stored.
drop trigger if exists profiles_zzz_guard_record on public.profiles;
create trigger profiles_zzz_guard_record
  before insert or update on public.profiles
  for each row execute function private.guard_profile_record();

insert into private.reserved_handles (handle)
select 'member'
where not exists (select 1 from private.reserved_handles where handle = 'member');
