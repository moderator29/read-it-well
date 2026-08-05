-- An admin can approve an agent and could not stop one.
--
-- public.agents has carried an admin write policy since the first RLS pass and
-- there was no surface behind it, so the console had exactly one direction of
-- travel: applications went in, agents came out, and nothing could ever bring
-- one back. `agent_application_status` has carried a SUSPENDED label the whole
-- time and no code path ever wrote it.
--
-- A suspension has to answer two questions out loud, and this migration is
-- where both answers live rather than in a paragraph on a screen:
--
--   What happens to their listings?  Everything of theirs that is live or in a
--   queue comes down to SUSPENDED, and the status each one held is recorded, so
--   a reinstatement puts every listing back exactly where it was rather than
--   publishing a draft the agent never submitted. A listing they had already
--   left as a draft is untouched.
--
--   What happens to their confirmed bookings?  Nothing. A guest who has paid
--   for a stay keeps it. Suspension stops an agent taking NEW business; it does
--   not cancel somebody's holiday, and it does not touch the calendar, the
--   money or the agent role, because the agent still has stays to service. The
--   count of stays still ahead is written onto the suspension record, so the
--   person deciding sees the exposure before they decide and it is on the file
--   afterwards.
--
-- Reversible, and reversible honestly: lifting is a second decision by a named
-- person on the same row, never an undo that erases the first one.
--
-- Three triggers already do the right thing on agents.status and are left to do
-- it: retire_agent_announcements deletes the agent's unanswered "verified"
-- posts, sync_social_agent_flag drops is_agent on their social profile, and
-- announce_published_listing refuses to write a second announcement for a
-- listing that already has one, so a reinstatement does not re-announce.

/* --------------------------------------------------- 1. the record of a stop */

create table if not exists public.agent_suspensions (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid not null references public.agents(id) on delete cascade,
  -- Why, in the words the agent is shown. Never optional.
  reason        text not null check (length(btrim(reason)) between 1 and 2000),
  -- [{ "id": "<listing uuid>", "from": "PUBLISHED" }, ...]. The status each
  -- listing held at the moment it was taken down, so reinstating restores the
  -- exact prior state rather than a guess at it.
  withdrawn     jsonb not null default '[]'::jsonb,
  -- Confirmed stays whose last night had not passed when the stop was taken.
  -- Recorded, never cancelled.
  stays_ahead   integer not null default 0 check (stays_ahead >= 0),
  suspended_by  uuid references auth.users(id) on delete set null,
  suspended_at  timestamptz not null default now(),
  lifted_by     uuid references auth.users(id) on delete set null,
  lifted_at     timestamptz,
  lift_note     text check (lift_note is null or length(lift_note) <= 2000),
  restored      jsonb not null default '[]'::jsonb,
  constraint agent_suspensions_lift_chk check (
    lifted_at is not null
    or (lifted_by is null and lift_note is null and restored = '[]'::jsonb)
  ),
  constraint agent_suspensions_withdrawn_chk check (jsonb_typeof(withdrawn) = 'array'),
  constraint agent_suspensions_restored_chk  check (jsonb_typeof(restored) = 'array')
);

comment on table public.agent_suspensions is
  'One row per time RentMe stopped an agent trading: why, what came down with them, how many confirmed stays were still ahead, who decided it, and who later lifted it. A lift is an update of the four lift columns on the same row; nothing else on it may ever change.';

-- One live stop per agent. A second suspension of somebody already suspended
-- is a mistake, not a second record.
create unique index if not exists agent_suspensions_one_live
  on public.agent_suspensions (agent_id) where lifted_at is null;

create index if not exists agent_suspensions_agent_idx
  on public.agent_suspensions (agent_id, suspended_at desc);
create index if not exists agent_suspensions_by_idx      on public.agent_suspensions (suspended_by);
create index if not exists agent_suspensions_lifted_idx  on public.agent_suspensions (lifted_by);

alter table public.agent_suspensions enable row level security;

-- Staff read every one. An agent reads their own, because the reason they were
-- stopped is theirs before it is ours. Nobody holds insert, update or delete:
-- the service role writes it inside the two functions below and nowhere else.
drop policy if exists agent_suspensions_select_admin on public.agent_suspensions;
create policy agent_suspensions_select_admin on public.agent_suspensions
  for select using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

drop policy if exists agent_suspensions_select_own on public.agent_suspensions;
create policy agent_suspensions_select_own on public.agent_suspensions
  for select using (
    exists (
      select 1 from public.agents a
       where a.id = agent_suspensions.agent_id
         and a.user_id = (select auth.uid())
    )
  );

-- A suspension can be lifted. It can never be unwritten, and the facts of it
-- can never be edited: the reason an agent was stopped is the thing an appeal
-- argues with, and a reason somebody can rewrite afterwards proves nothing.
--
-- The one delete this allows is the cascade. agents.user_id is ON DELETE
-- CASCADE from auth.users, so a person closing their account takes their agent
-- row and everything hanging off it with them, and a flat refusal here would
-- have made account deletion fail with 42501 for any agent who had ever been
-- stopped. Referential cascade removes the parent first, so the parent being
-- already gone is exactly the test that tells the two cases apart.
create or replace function private.agent_suspensions_history_is_fixed()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if tg_op = 'TRUNCATE' then
    raise exception
      using errcode = '42501',
            message = 'public.agent_suspensions cannot be truncated';
  end if;

  if tg_op = 'DELETE' then
    if exists (select 1 from public.agents a where a.id = old.agent_id) then
      raise exception
        using errcode = '42501',
              message = 'public.agent_suspensions cannot be deleted',
              hint    = 'Lift the suspension. A stop that happened stays on the file.';
    end if;
    -- The agent themselves is being removed. There is nothing left for this
    -- record to be about, so it goes with them.
    return old;
  end if;

  if new.id <> old.id
     or new.agent_id <> old.agent_id
     or new.reason <> old.reason
     or new.withdrawn is distinct from old.withdrawn
     or new.stays_ahead <> old.stays_ahead
     or new.suspended_by is distinct from old.suspended_by
     or new.suspended_at <> old.suspended_at then
    raise exception
      using errcode = '42501',
            message = 'the facts of a suspension cannot be edited',
            hint    = 'Only lifted_at, lifted_by, lift_note and restored may be written after the fact.';
  end if;

  if old.lifted_at is not null and new.lifted_at is distinct from old.lifted_at then
    raise exception
      using errcode = '42501',
            message = 'this suspension has already been lifted',
            hint    = 'A new stop is a new row.';
  end if;

  return new;
end;
$fn$;

revoke execute on function private.agent_suspensions_history_is_fixed() from public, anon, authenticated;

drop trigger if exists agent_suspensions_no_rewrite on public.agent_suspensions;
create trigger agent_suspensions_no_rewrite
  before update on public.agent_suspensions
  for each row execute function private.agent_suspensions_history_is_fixed();

drop trigger if exists agent_suspensions_no_delete on public.agent_suspensions;
create trigger agent_suspensions_no_delete
  before delete on public.agent_suspensions
  for each row execute function private.agent_suspensions_history_is_fixed();

drop trigger if exists agent_suspensions_no_truncate on public.agent_suspensions;
create trigger agent_suspensions_no_truncate
  before truncate on public.agent_suspensions
  for each statement execute function private.agent_suspensions_history_is_fixed();

/* ------------------------------- 2. the gate, in the database and not the app */

-- The hard stop. A suspended agent's listing may only move to DRAFT, SUSPENDED
-- or REJECTED, and may otherwise only stay where it is. Put here rather than in
-- a server action because a suspension enforced by application code is a
-- suspension one forgotten code path undoes, and this platform has three
-- separate write paths onto listings already.
create or replace function private.suspended_agent_cannot_go_live()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  agent_status public.agent_application_status;
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;

  if new.status in ('DRAFT'::public.listing_status,
                    'SUSPENDED'::public.listing_status,
                    'REJECTED'::public.listing_status) then
    return new;
  end if;

  select a.status into agent_status from public.agents a where a.id = new.agent_id;

  if agent_status = 'SUSPENDED'::public.agent_application_status then
    raise exception
      using errcode = '42501',
            message = 'this agent is suspended and cannot put a listing in front of anybody',
            detail  = format('listing %s was refused the move to %s.', new.id, new.status),
            hint    = 'Lift the suspension first. Their listings return to where they were on their own.';
  end if;

  return new;
end;
$fn$;

revoke execute on function private.suspended_agent_cannot_go_live() from public, anon, authenticated;

drop trigger if exists listings_block_suspended_agent on public.listings;
create trigger listings_block_suspended_agent
  before insert or update of status on public.listings
  for each row execute function private.suspended_agent_cannot_go_live();

/* ------------------------------------------ 3. stopping, in one transaction */

create or replace function private.suspend_agent(
  acting_admin uuid,
  target_agent uuid,
  stop_reason  text
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  agent_row     public.agents;
  withdrawable  public.listing_status[] := array[
                  'PUBLISHED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'MORE_INFO_REQUIRED'
                ]::public.listing_status[];
  taken         jsonb;
  ahead         integer;
  record_id     uuid;
begin
  if acting_admin is null or target_agent is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  if stop_reason is null or length(btrim(stop_reason)) = 0 then
    return jsonb_build_object('status', 'no_reason');
  end if;
  if length(btrim(stop_reason)) > 2000 then
    return jsonb_build_object('status', 'reason_too_long');
  end if;

  -- SECURITY DEFINER means this function is the last gate, so it proves the
  -- role here rather than trusting a caller that says it already did.
  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into agent_row from public.agents where id = target_agent for update;

  if agent_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if agent_row.status = 'SUSPENDED'::public.agent_application_status then
    return jsonb_build_object('status', 'already_suspended');
  end if;
  if agent_row.status <> 'APPROVED'::public.agent_application_status then
    return jsonb_build_object('status', 'not_trading', 'agent_status', agent_row.status);
  end if;

  -- Confirmed stays whose last night is still ahead. Counted, told to the
  -- operator, never cancelled: the guest paid and the guest keeps it.
  select count(*) into ahead
    from public.bookings b
    join public.listings l on l.id = b.listing_id
   where l.agent_id = agent_row.id
     and b.status = 'CONFIRMED'::public.booking_status
     and b.check_out >= (now() at time zone 'Africa/Lagos')::date;

  -- Lock every listing of theirs before reading it, so nothing publishes in the
  -- gap between working out what is live and taking it down.
  perform 1 from public.listings where agent_id = agent_row.id for update;

  select coalesce(
           jsonb_agg(jsonb_build_object('id', l.id, 'from', l.status::text) order by l.created_at),
           '[]'::jsonb
         )
    into taken
    from public.listings l
   where l.agent_id = agent_row.id
     and l.status = any(withdrawable);

  -- The agent goes down FIRST. The listings trigger reads agents.status, and
  -- SUSPENDED is one of the three statuses it always allows, so the order is
  -- safe in this direction and wrong in the other.
  update public.agents
     set status = 'SUSPENDED'::public.agent_application_status
   where id = agent_row.id
     and status = 'APPROVED'::public.agent_application_status;

  if not found then
    raise exception 'agent % could not be suspended from %', agent_row.id, agent_row.status;
  end if;

  update public.listings
     set status = 'SUSPENDED'::public.listing_status
   where agent_id = agent_row.id
     and status = any(withdrawable);

  insert into public.agent_suspensions
    (agent_id, reason, withdrawn, stays_ahead, suspended_by)
  values
    (agent_row.id, btrim(stop_reason), taken, ahead, acting_admin)
  returning id into record_id;

  return jsonb_build_object(
    'status', 'ok',
    'agent_id', agent_row.id,
    'user_id', agent_row.user_id,
    'display_name', agent_row.display_name,
    'suspension_id', record_id,
    'withdrawn', taken,
    'withdrawn_count', jsonb_array_length(taken),
    'stays_ahead', ahead
  );
end;
$fn$;

comment on function private.suspend_agent(uuid, uuid, text) is
  'Stop an agent trading: their live and queued listings come down with the status each one held recorded, their confirmed stays are counted and left alone, and the whole decision lands on public.agent_suspensions. One transaction.';

/* ---------------------------------------- 4. letting them back, the same way */

create or replace function private.reinstate_agent(
  acting_admin uuid,
  target_agent uuid,
  note         text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  agent_row  public.agents;
  stop_row   public.agent_suspensions;
  item       jsonb;
  back       jsonb := '[]'::jsonb;
begin
  if acting_admin is null or target_agent is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if note is not null and length(btrim(note)) > 2000 then
    return jsonb_build_object('status', 'note_too_long');
  end if;

  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into agent_row from public.agents where id = target_agent for update;

  if agent_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if agent_row.status <> 'SUSPENDED'::public.agent_application_status then
    return jsonb_build_object('status', 'not_suspended', 'agent_status', agent_row.status);
  end if;

  select * into stop_row
    from public.agent_suspensions
   where agent_id = agent_row.id and lifted_at is null
   for update;

  -- The agent comes back FIRST, or the listings trigger refuses every restore.
  update public.agents
     set status = 'APPROVED'::public.agent_application_status
   where id = agent_row.id
     and status = 'SUSPENDED'::public.agent_application_status;

  if not found then
    raise exception 'agent % could not be reinstated', agent_row.id;
  end if;

  -- Put back exactly what this suspension took down, and only where it is still
  -- where the suspension left it. A listing the agent has since edited into a
  -- draft, or one an admin has rejected in the meantime, stays as it is.
  if stop_row.id is not null then
    for item in select value from jsonb_array_elements(stop_row.withdrawn) loop
      update public.listings
         set status = (item ->> 'from')::public.listing_status
       where id = (item ->> 'id')::uuid
         and agent_id = agent_row.id
         and status = 'SUSPENDED'::public.listing_status;

      if found then
        back := back || jsonb_build_array(item);
      end if;
    end loop;

    update public.agent_suspensions
       set lifted_at = now(),
           lifted_by = acting_admin,
           lift_note = nullif(btrim(coalesce(note, '')), ''),
           restored  = back
     where id = stop_row.id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'agent_id', agent_row.id,
    'user_id', agent_row.user_id,
    'display_name', agent_row.display_name,
    'suspension_id', stop_row.id,
    'restored', back,
    'restored_count', jsonb_array_length(back),
    'withdrawn_count', coalesce(jsonb_array_length(stop_row.withdrawn), 0)
  );
end;
$fn$;

comment on function private.reinstate_agent(uuid, uuid, text) is
  'Lift a suspension: the agent trades again and every listing the stop took down returns to the status it held, unless somebody has moved it since. The suspension row is closed, never removed.';

/* -------------------------------------------------------- 5. the public door */

create or replace function public.suspend_agent(
  acting_admin uuid,
  target_agent uuid,
  stop_reason  text
) returns jsonb
language sql
security definer
set search_path to 'public'
as $fn$
  select private.suspend_agent(acting_admin, target_agent, stop_reason);
$fn$;

revoke all on function public.suspend_agent(uuid, uuid, text) from public;
revoke all on function public.suspend_agent(uuid, uuid, text) from anon;
revoke all on function public.suspend_agent(uuid, uuid, text) from authenticated;
grant execute on function public.suspend_agent(uuid, uuid, text) to service_role;

create or replace function public.reinstate_agent(
  acting_admin uuid,
  target_agent uuid,
  note         text default null
) returns jsonb
language sql
security definer
set search_path to 'public'
as $fn$
  select private.reinstate_agent(acting_admin, target_agent, note);
$fn$;

revoke all on function public.reinstate_agent(uuid, uuid, text) from public;
revoke all on function public.reinstate_agent(uuid, uuid, text) from anon;
revoke all on function public.reinstate_agent(uuid, uuid, text) from authenticated;
grant execute on function public.reinstate_agent(uuid, uuid, text) to service_role;
