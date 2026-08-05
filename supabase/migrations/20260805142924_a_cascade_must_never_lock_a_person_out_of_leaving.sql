-- A cascade must never lock a person out of leaving.
--
-- This is the third and fourth time this project has shipped the same trap, so
-- this migration also writes down how to find it rather than only fixing the
-- two occurrences.
--
-- The shape of it:
--
--   1. A column names who did something: `suspended_by`, `granted_by`,
--      `actor_id`, `decided_by`. It references auth.users.
--   2. Its foreign key is `on delete set null`, because the record must outlive
--      the person. That is correct and stays.
--   3. A trigger on the same table refuses UPDATE, because the record is
--      history and history is not edited. That is also correct.
--
-- Put together they mean the record is unreachable and the person is trapped.
-- Deleting the account fires the foreign key's own UPDATE, the trigger refuses
-- it, and the delete aborts. Nobody wrote that rule. It falls out of two rules
-- that are each right on their own.
--
-- Deleting an account is a right under the NDPA, not a feature. A refusal
-- trigger that swallows it is a compliance bug, not a strictness setting.
--
-- Measured before this migration, on real rows, as the service role, which is
-- how the account-deletion path actually runs:
--
--   1 user_badges:       BLOCKED RM021 That badge is granted by hand and must
--                        name who granted it.
--   2 posts:             a person who posted CAN delete their account
--   3 agent_suspensions: BLOCKED 42501 the facts of a suspension cannot be
--                        edited
--
-- Line 2 is why the social tables are not in this migration. Their guards open
-- with `if pg_trigger_depth() > 1 then return new; end if;`, and a foreign
-- key's own action counts toward that depth, so the null-out passes straight
-- through. The two guards fixed here have no depth check, which is exactly
-- why they caught. `audit_log` and `booking_refunds` were the first two, fixed
-- in 20260805141453.
--
-- How to find the next one:
--
--   select c.conrelid::regclass, a.attname
--     from pg_constraint c
--     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
--    where c.contype = 'f' and c.confdeltype = 'n'
--      and exists (select 1 from pg_trigger t
--                   where t.tgrelid = c.conrelid and not t.tgisinternal
--                     and (t.tgtype & 16) <> 0);
--
-- Then read each trigger. If it raises rather than reverts, and it has no
-- `pg_trigger_depth()` guard, it is trapped. Do not trust the reading alone:
-- create a user, have them do the thing, and delete the account.

-- ---------------------------------------------------------------- badges
--
-- `guard_manual_badge` exists so that a hand-granted badge always names the
-- hand. That is a rule about granting, and granting only happens once. It has
-- been enforced on every write, so it also fired when the granter's own account
-- released the row on the way out.
--
-- The badge is still validly granted after that. It simply no longer names a
-- live account, which is the whole point of `on delete set null`.
--
-- So: enforce it on INSERT, where the grant happens, and on UPDATE only when
-- somebody is editing the row for real. The release is recognised by comparing
-- everything except the column being released, which is the same test used on
-- audit_log. `to_jsonb(new) - key` rather than hstore's `#=`, because hstore is
-- not installed on this database and a plpgsql body is only parsed when it
-- runs.
create or replace function private.guard_manual_badge()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  /* The account that granted this badge is being deleted, and the foreign key
     is releasing the row. Nothing else about the grant is changing, so there is
     nothing here to guard. */
  if tg_op = 'UPDATE'
     and old.granted_by is not null
     and new.granted_by is null
     and (to_jsonb(new) - 'granted_by') = (to_jsonb(old) - 'granted_by') then
    return new;
  end if;

  /* The same, for the account that revoked it. */
  if tg_op = 'UPDATE'
     and old.revoked_by is not null
     and new.revoked_by is null
     and (to_jsonb(new) - 'revoked_by') = (to_jsonb(old) - 'revoked_by') then
    return new;
  end if;

  if new.granted_by is null
     and exists (select 1 from public.badges where code = new.badge_code and manual_only) then
    raise exception 'That badge is granted by hand and must name who granted it.'
      using errcode = 'RM021';
  end if;

  return new;
end;
$fn$;

-- ---------------------------------------------------------------- suspensions
--
-- Same shape, same fix. `suspended_by` and `lifted_by` are both
-- `on delete set null`, and the guard refused every change to `suspended_by`,
-- so an admin who had ever stopped an agent could never leave.
--
-- The permitted update is narrow on purpose: nothing outside the two actor
-- columns may differ, each of them may only move from somebody to nobody, never
-- the other way and never to a different person, and at least one of them has
-- to be moving or this is not a release at all and the ordinary rules apply.
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

  /* An account that signed this suspension, or lifted it, is being deleted, and
     the foreign key is releasing the row. The suspension still happened and its
     facts are untouched; only the name has gone. */
  if (to_jsonb(new) - 'suspended_by' - 'lifted_by')
       = (to_jsonb(old) - 'suspended_by' - 'lifted_by')
     and (new.suspended_by is not distinct from old.suspended_by
          or (old.suspended_by is not null and new.suspended_by is null))
     and (new.lifted_by is not distinct from old.lifted_by
          or (old.lifted_by is not null and new.lifted_by is null))
     and (new.suspended_by is distinct from old.suspended_by
          or new.lifted_by is distinct from old.lifted_by) then
    return new;
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
