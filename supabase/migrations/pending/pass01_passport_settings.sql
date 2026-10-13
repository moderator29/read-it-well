-- DRAFT, not applied. VALLO PASSPORT 1 of 2. Apply BEFORE the app on
-- track/passport is deployed: the owner's page and the chat menu read and write
-- this table. Apply pass02 straight after (it reads this table).
--
-- Founder ruling, 13 October 2026: every member has a Vallo passport, whatever
-- their side. It is ON BY DEFAULT with every line shown; the owner can switch
-- off any line and can turn the whole passport off. This replaces V-100's rule
-- (off until turned on, shown only in chosen conversations).
--
-- ONE ROW PER MEMBER WHO HAS CHANGED SOMETHING. No row means the defaults: on,
-- nothing hidden. So nobody has to be backfilled, and a member created tomorrow
-- has a passport today.
--
--   enabled        the whole passport. False: nobody can open it.
--   hidden_lines   the lines switched off. A check constraint holds the list to
--                  the nine the passport has, so a crafted write cannot invent
--                  one, and a line added later is a deliberate change here.
--
-- ROW LEVEL SECURITY. A member reads, inserts and updates their own row and
-- nothing else; there is no grant to remove a row (it goes with the account, by
-- the foreign key). Another member's settings are never readable: they are applied
-- inside the read function of pass02, which returns only the lines left on.
--
-- MIGRATING V-100. A `renter_passports` row exists only because the member
-- called set_renter_passport, so every row is an explicit choice and is carried
-- over as it stands: people who turned it off stay off, people who turned it on
-- stay on. Everybody without a row gets the new default (on). The old tables and
-- functions are left alone (additive); the app no longer calls them. Existing
-- `passport_shares` rows are not carried: a passport is no longer shown one
-- conversation at a time.
-- Probe: supabase/tests/probes-pending/pass01-passport-settings.sql
set lock_timeout = '5s';

create table if not exists public.passport_settings (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  enabled      boolean not null default true,
  hidden_lines text[] not null default '{}'::text[],
  updated_at   timestamptz not null default now(),
  constraint passport_settings_lines_known check (
    hidden_lines <@ array['photo','role','joined','verification','rentals','stays','reviews','response','languages']::text[]
  )
);

comment on table public.passport_settings is
  'Vallo passport (13 Oct 2026). A member''s switches: the whole passport and each line. No row means on, every line shown.';
comment on column public.passport_settings.hidden_lines is
  'Lines the owner switched off: photo, role, joined, verification, rentals, stays, reviews, response, languages.';

alter table public.passport_settings enable row level security;

revoke all on public.passport_settings from public, anon, authenticated;
grant select, insert, update on public.passport_settings to authenticated;
grant all on public.passport_settings to service_role;

do $do$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'passport_settings' and policyname = 'passport_settings_select_own') then
    create policy passport_settings_select_own on public.passport_settings
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'passport_settings' and policyname = 'passport_settings_insert_own') then
    create policy passport_settings_insert_own on public.passport_settings
      for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'passport_settings' and policyname = 'passport_settings_update_own') then
    create policy passport_settings_update_own on public.passport_settings
      for update to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end
$do$;

/* V-100's explicit choices, carried over as they stand. */
insert into public.passport_settings (user_id, enabled, hidden_lines, updated_at)
select rp.user_id, rp.enabled, '{}'::text[], rp.updated_at
  from public.renter_passports rp
on conflict (user_id) do nothing;

do $readback$
declare bad text := '';
begin
  if not (select relrowsecurity from pg_class where oid = 'public.passport_settings'::regclass) then bad := bad || ' [RLS is off]'; end if;
  if has_table_privilege('anon', 'public.passport_settings', 'select') then bad := bad || ' [anon can read]'; end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'passport_settings') <> 3 then bad := bad || ' [policies are not the three]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
