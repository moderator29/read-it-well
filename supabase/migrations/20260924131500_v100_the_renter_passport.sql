-- V-100, THE RENTER PASSPORT: OPT IN, NEVER REQUIRED, SHOWN ONE THREAD AT A
-- TIME.
--
-- A landlord who today demands a guarantor letter, an employer letter and a
-- passport photograph could instead see what Vallo itself recorded about the
-- renter: "Phone confirmed. Identity matched with NIMC. 4 inspections
-- attended, confirmed by the code at the gate. 1 tenancy paid through Vallo." Every line is derived from
-- rows Vallo writes; nothing is typed by the renter and nothing is uploaded.
--
-- IT SITS AGAINST A FOUNDER RULE ("Member: never asked to verify their
-- identity"), which is why it is shaped the way it is:
--
--   off by default     `renter_passports.enabled` is false until the renter
--                      turns it on in settings. Vallo never asks.
--   one thread at a time
--                      even when on, a lister sees it only in a conversation
--                      the renter chose to show it in (`passport_shares`), and
--                      the renter can take it back at any time.
--   the lister side only
--                      the reader must be the lister in that conversation.
--   derived, dated, counted
--                      phone confirmed (V-50), identity matched with NIMC and
--                      when (V-49), inspections attended (the renter's phone
--                      recorded the lister's code matching at the gate, V-35),
--                      tenancies paid through Vallo. Every line is null or zero-free: a line
--                      with nothing behind it is not printed.
--
-- NOT HERE: "inspections missed" (the handshake records who came, not who did
-- not, and a lister saying so would be one side's word), "the previous landlord would let to them again" (needs a question
-- asked of the lister at the end of a tenancy, which no table holds yet), and
-- the optional employer email. The passport is honest about what it lacks by
-- not printing those lines.

create table if not exists public.renter_passports (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.renter_passports is
  'V-100. Whether a renter has turned their passport on. Off by default; never required, never asked for.';

revoke all on public.renter_passports from public, anon, authenticated;
alter table public.renter_passports enable row level security;
grant all on public.renter_passports to service_role;

create table if not exists public.passport_shares (
  user_id         uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  shared_at       timestamptz not null default now(),
  revoked_at      timestamptz,
  primary key (user_id, conversation_id)
);

comment on table public.passport_shares is
  'V-100. The conversations a renter chose to show their passport in. Revoked shares keep their row with a date.';

revoke all on public.passport_shares from public, anon, authenticated;
alter table public.passport_shares enable row level security;
grant all on public.passport_shares to service_role;

/* The facts, for one person. Private: only the three doors below call it. */
create or replace function private.passport_facts(p_user uuid)
returns table (
  phone_confirmed boolean,
  nimc_matched_at timestamptz,
  inspections_attended integer,
  tenancies integer,
  member_since timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  /* plpgsql, not sql: `inspection_checkins` is V-35's (20260924160100), after
     this file in timestamp order, and a plpgsql body resolves it when it runs. */
  return query
  select
    exists (select 1 from public.confirmed_phones cp where cp.user_id = p_user),
    (select max(iv.decided_at) from public.identity_verifications iv
      where iv.subject_id = p_user and iv.outcome = 'matched' and iv.method = 'vnin'),
    (select count(distinct k.inspection_id)::integer from public.inspection_checkins k
      where k.recorded_by = p_user and k.role = 'checker' and k.result = 'match'),
    (select count(*)::integer from public.rent_payments rp
       join public.bookings b on b.id = rp.booking_id
      where rp.tenant_id = p_user
        and b.status in ('CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status)),
    (select u.created_at from auth.users u where u.id = p_user);
end;
$$;

revoke all on function private.passport_facts(uuid) from public, anon, authenticated;

/* The renter's own view: the switch, the facts as a lister would see them,
   and which threads they are shown in. */
create or replace function public.my_renter_passport()
returns table (
  enabled boolean,
  phone_confirmed boolean,
  nimc_matched_at timestamptz,
  inspections_attended integer,
  tenancies integer,
  member_since timestamptz,
  shared_in integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.enabled from public.renter_passports p where p.user_id = (select auth.uid())), false),
         f.phone_confirmed, f.nimc_matched_at, f.inspections_attended, f.tenancies, f.member_since,
         (select count(*)::integer from public.passport_shares s
           where s.user_id = (select auth.uid()) and s.revoked_at is null)
    from private.passport_facts((select auth.uid())) f
   where (select auth.uid()) is not null;
$$;

revoke all on function public.my_renter_passport() from public, anon;
grant execute on function public.my_renter_passport() to authenticated;

/* Turn it on or off. Off also withdraws every share, so turning it back on
   later shows it nowhere until the renter chooses a thread again. */
create or replace function public.set_renter_passport(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then return false; end if;
  insert into public.renter_passports (user_id, enabled, updated_at) values (me, coalesce(p_enabled, false), now())
  on conflict (user_id) do update set enabled = excluded.enabled, updated_at = now();
  if not coalesce(p_enabled, false) then
    update public.passport_shares set revoked_at = now() where user_id = me and revoked_at is null;
  end if;
  return coalesce(p_enabled, false);
end;
$$;

revoke all on function public.set_renter_passport(boolean) from public, anon;
grant execute on function public.set_renter_passport(boolean) to authenticated;

/* Show it in this thread, or take it back. Only the guest of a conversation,
   and only with the passport on. */
create or replace function public.share_renter_passport(p_conversation uuid, p_share boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then return 'signed_out'; end if;
  if not exists (select 1 from public.conversations c where c.id = p_conversation and c.guest_id = me) then
    return 'not_yours';
  end if;
  if p_share then
    if not coalesce((select p.enabled from public.renter_passports p where p.user_id = me), false) then
      return 'off';
    end if;
    insert into public.passport_shares (user_id, conversation_id) values (me, p_conversation)
    on conflict (user_id, conversation_id) do update set shared_at = now(), revoked_at = null;
    return 'shared';
  end if;
  update public.passport_shares set revoked_at = now()
   where user_id = me and conversation_id = p_conversation and revoked_at is null;
  return 'withdrawn';
end;
$$;

revoke all on function public.share_renter_passport(uuid, boolean) from public, anon;
grant execute on function public.share_renter_passport(uuid, boolean) to authenticated;

/* Is it shown in this thread? For the guest's own control. */
create or replace function public.passport_shared_here(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.passport_shares s
                  where s.user_id = (select auth.uid()) and s.conversation_id = p_conversation and s.revoked_at is null);
$$;

revoke all on function public.passport_shared_here(uuid) from public, anon;
grant execute on function public.passport_shared_here(uuid) to authenticated;

/* The lister's view, in the thread the renter chose, and nowhere else. */
create or replace function public.renter_passport_for_thread(p_conversation uuid)
returns table (
  phone_confirmed boolean,
  nimc_matched_at timestamptz,
  inspections_attended integer,
  tenancies integer,
  member_since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.*
    from public.conversations c
    join public.renter_passports p on p.user_id = c.guest_id and p.enabled
    join public.passport_shares s on s.user_id = c.guest_id and s.conversation_id = c.id and s.revoked_at is null
    cross join lateral private.passport_facts(c.guest_id) f
   where c.id = p_conversation
     and c.agent_id = (select auth.uid());
$$;

comment on function public.renter_passport_for_thread(uuid) is
  'V-100. The renter''s passport, for the lister in a conversation the renter chose to show it in, while it is on. No row otherwise.';

revoke all on function public.renter_passport_for_thread(uuid) from public, anon;
grant execute on function public.renter_passport_for_thread(uuid) to authenticated;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('authenticated', 'public.passport_shares', 'select') then bad := bad || ' [shares are readable]'; end if;
  if has_function_privilege('authenticated', 'private.passport_facts(uuid)', 'execute') then bad := bad || ' [facts for any person]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
