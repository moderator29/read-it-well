-- A5. Invite codes a member can share. Written by the front door build
-- (Recommendations A, 30 September 2026).
-- Applied 30 September 2026 with the founder's approval.
-- Idempotent. Nothing destructive.
--
-- WHY (a) AND NOT (b). Sign-up asks for a referral code and nothing ever
-- gave anybody one: 0 of the 16 accounts at 30 September carry a code, while
-- "Friend or family" is the largest hear-about answer (6 of 14 who answered).
-- Word of mouth is the loop that exists, and it had no way to be recorded.
-- So each member gets one code to share, a `/join/<code>` door carries it
-- into sign-up, and the admin console counts confirmed sign-ups by code. No
-- reward is promised anywhere; the copy says so.
--
-- WHAT IS STORED. One row per member who asked for a code: the member and
-- the code. The sign-up side is unchanged: the code already lands in
-- `auth.users.raw_user_meta_data ->> 'referral_code'` (lib/auth/actions.ts).
--
-- WHAT A STRANGER CAN LEARN FROM A CODE: the first word of the member's
-- display name, through `referral_door`, and nothing else. That is the
-- member's own choice to share, made when they send the link.

create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  code       text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

drop policy if exists referral_codes_select_own on public.referral_codes;
create policy referral_codes_select_own on public.referral_codes
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.referral_codes from anon;
revoke insert, update, delete on public.referral_codes from authenticated;
grant select on public.referral_codes to authenticated;

-- The caller's code, made on first ask. Six characters from an alphabet with
-- no 0/O or 1/I, so it can be read aloud and typed from a flyer.
create or replace function public.my_referral_code()
returns text
language plpgsql
volatile security definer
set search_path to ''
as $function$
declare
  me       uuid := (select auth.uid());
  found    text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
  tries int := 0;
begin
  if me is null then
    return null;
  end if;
  select r.code into found from public.referral_codes r where r.user_id = me;
  if found is not null then
    return found;
  end if;
  loop
    tries := tries + 1;
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.referral_codes (user_id, code) values (me, candidate);
      return candidate;
    exception when unique_violation then
      select r.code into found from public.referral_codes r where r.user_id = me;
      if found is not null then
        return found;
      end if;
      if tries >= 8 then
        raise exception 'could not allot a referral code';
      end if;
    end;
  end loop;
end;
$function$;

revoke all on function public.my_referral_code() from public, anon;
grant execute on function public.my_referral_code() to authenticated;

-- The invite door's one read: does this code exist, and the first word of
-- the inviter's display name. Callable signed out, because the person
-- opening an invite has no account yet.
create or replace function public.referral_door(p_code text)
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  select case
    when p_code is null or upper(p_code) !~ '^[A-HJ-NP-Z2-9]{6}$' then jsonb_build_object('found', false)
    else coalesce(
      (select jsonb_build_object(
                'found', true,
                'first_name', nullif(split_part(btrim(coalesce(p.display_name, '')), ' ', 1), ''))
         from public.referral_codes r
         left join public.profiles p on p.id = r.user_id
        where r.code = upper(p_code)),
      jsonb_build_object('found', false))
  end;
$function$;

revoke all on function public.referral_door(text) from public;
grant execute on function public.referral_door(text) to anon, authenticated;

-- The console's count: confirmed sign-ups carrying each code, over a window.
-- Admins only, the same rule as the analytics desk's price-check read.
create or replace function public.admin_referral_counts(p_days int default 30)
returns table (code text, first_name text, confirmed bigint)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if not (private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role)) then
    return;
  end if;
  return query
    select r.code,
           nullif(split_part(btrim(coalesce(p.display_name, '')), ' ', 1), ''),
           count(u.id)
      from public.referral_codes r
      left join public.profiles p on p.id = r.user_id
      join auth.users u
        on upper(u.raw_user_meta_data ->> 'referral_code') = r.code
       and u.email_confirmed_at is not null
       and u.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 366)))
     group by r.code, p.display_name
     order by count(u.id) desc
     limit 100;
end;
$function$;

revoke all on function public.admin_referral_counts(int) from public, anon;
grant execute on function public.admin_referral_counts(int) to authenticated;

-- Read back: the table is locked down and the functions answer as designed.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.referral_codes'::regclass) then
    raise exception 'referral_codes must have RLS on';
  end if;
  if has_table_privilege('anon', 'public.referral_codes', 'select') then
    raise exception 'anon must not read referral_codes';
  end if;
  if has_function_privilege('anon', 'public.my_referral_code()', 'execute') then
    raise exception 'anon must not mint referral codes';
  end if;
  if not has_function_privilege('anon', 'public.referral_door(text)', 'execute') then
    raise exception 'the invite door must answer a stranger';
  end if;
  if (public.referral_door('0000') ->> 'found')::boolean then
    raise exception 'a malformed code must not be found';
  end if;
  if public.my_referral_code() is not null then
    raise exception 'my_referral_code must answer null with no caller';
  end if;
  if exists (select 1 from public.admin_referral_counts(30)) then
    raise exception 'admin_referral_counts must answer nothing to a non-admin';
  end if;
end $$;

notify pgrst, 'reload schema';
