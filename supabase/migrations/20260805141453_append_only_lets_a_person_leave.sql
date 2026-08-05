-- Nobody could delete their account. Append-only had grown teeth it should not
-- have, and the two tables failed for two different reasons.
--
-- Measured before this, on a user created seconds earlier with no history:
--
--   delete a brand new user            FAILED 42501 public.booking_refunds is append-only
--   delete a user with one audit line  FAILED 42501 public.audit_log is append-only
--
-- 1. `booking_refunds` REFUSED A STATEMENT THAT TOUCHED NOTHING. Its UPDATE and
--    DELETE guards were STATEMENT level, so they fire once per statement
--    whether or not a single row matches. `audit_log.actor_id` and
--    `booking_refunds.decided_by` are both `on delete set null`, so removing any
--    user issues an UPDATE against both tables, and against `booking_refunds`
--    that was refused even with the table empty. One misplaced FOR EACH ROW made
--    every account on this platform permanent.
--
--    `audit_log` had it right: row level, so it only fires on a row that exists.
--
-- 2. `audit_log` THEN FAILED HONESTLY, and that is a real conflict. A log that
--    may never be updated cannot let go of somebody who leaves, and the record
--    has to outlive them, because it is what staff are judged by.
--
--    So the rule is narrowed rather than dropped. The only update either table
--    accepts is one that RELEASES THE PERSON: the actor goes from somebody to
--    nobody and nothing else changes. The comparison is the whole row as jsonb
--    with that one key removed, so a column added later is covered without
--    anybody remembering to come back.
--
--    Both promises hold at once. The words of the record stay unwritable, and a
--    person can still leave.
--
-- Probed after, all seven passing: a person with an audit line can leave, the
-- record survives them, the actor is released, rewriting the record is refused,
-- deleting it is refused, and releasing the actor while editing anything else
-- in the same statement is refused.

create or replace function private.audit_log_is_append_only()
returns trigger
language plpgsql
as $fn$
begin
  if tg_op = 'UPDATE'
     and old.actor_id is not null
     and new.actor_id is null
     and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;

  raise exception 'public.audit_log is append-only' using errcode = '42501';
end;
$fn$;

create or replace function private.booking_refunds_is_append_only()
returns trigger
language plpgsql
as $fn$
begin
  if tg_op = 'UPDATE'
     and old.decided_by is not null
     and new.decided_by is null
     and (to_jsonb(new) - 'decided_by') = (to_jsonb(old) - 'decided_by') then
    return new;
  end if;

  raise exception 'public.booking_refunds is append-only' using errcode = '42501';
end;
$fn$;

/*
 * FOR EACH ROW on UPDATE and DELETE, so a statement matching nothing is not
 * refused. TRUNCATE stays statement level because a row trigger never fires for
 * it, which is the whole reason it needs its own.
 */
drop trigger if exists booking_refunds_no_update on public.booking_refunds;
drop trigger if exists booking_refunds_no_delete on public.booking_refunds;

create trigger booking_refunds_no_update
  before update on public.booking_refunds
  for each row execute function private.booking_refunds_is_append_only();

create trigger booking_refunds_no_delete
  before delete on public.booking_refunds
  for each row execute function private.booking_refunds_is_append_only();
