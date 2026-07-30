-- Somebody has to be able to become an admin.
--
-- The audit in docs/DEAD_ENDS.md found the root cause of the empty catalogue,
-- and it is not the catalogue. Both signup triggers hardcode the 'user' role,
-- and the only role write in application code grants 'agent'. So no code path
-- anywhere ever produced an admin or a super_admin. The admin console is the
-- only writer of PUBLISHED, and public search reads only PUBLISHED, which
-- means: no admin, therefore no approved agent, therefore no published
-- listing, therefore an empty catalogue forever. One missing insert held the
-- whole supply side shut.
--
-- The fix has to survive the fact that the owner's account does not exist yet,
-- so it cannot simply grant a role to a user id. Instead an allow list of
-- email addresses is consulted by the signup trigger: put an address here, and
-- when that person signs up they arrive elevated. No manual SQL at the moment
-- of launch, and no permanent back door either, because the list is
-- admin-readable only and every entry is a deliberate row somebody added.
--
-- Matching is case-insensitive and trimmed, because an address typed into a
-- dashboard rarely matches the casing Supabase stores.

create table public.admin_bootstrap (
  email      text primary key,
  role       public.app_role not null default 'admin',
  note       text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint admin_bootstrap_role_chk check (role in ('admin', 'super_admin'))
);

comment on table public.admin_bootstrap is
  'Email addresses that receive an elevated role on signup. Consulted by the signup trigger, then stamped as claimed. Admin readable only.';

alter table public.admin_bootstrap enable row level security;
revoke all on table public.admin_bootstrap from anon, authenticated;

create policy admin_bootstrap_admin_all
  on public.admin_bootstrap for all
  using (private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin'));

insert into public.admin_bootstrap (email, role, note)
values ('phantomfcalls@gmail.com', 'super_admin', 'Platform owner, seeded at bootstrap.')
on conflict (email) do nothing;

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
  seeded     public.app_role;
begin
  select s.code into state_ok
  from public.states s
  where s.code = state_in or lower(s.name) = lower(state_in)
  limit 1;

  fallback := coalesce(
    nullif(trim(meta ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', first_name, surname)), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, display_name, first_name, surname, nickname, state_code, phone)
  values (new.id, fallback, first_name, surname, nickname, state_ok,
          nullif(trim(meta ->> 'phone'), ''));

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  -- The one new behaviour: an allow-listed address arrives elevated.
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
$$;
