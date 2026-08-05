-- The audit log becomes genuinely append-only.
--
-- public.audit_log was created with the comment "every privileged action gets a
-- row, and there is no update or delete policy". That was true and it was not
-- enough. RLS has no say over the service role, and writeAudit() runs as the
-- service role, so until now any application code, any script holding the
-- service key, and any migration could quietly rewrite or delete the record
-- staff are judged by. A history that can be edited proves nothing to a
-- regulator, to a court, or to the person disputing what we did.
--
-- Two layers, deliberately, because either one alone has a hole:
--
-- 1. The grants. UPDATE, DELETE and TRUNCATE come off anon, authenticated and
--    service_role. INSERT comes off anon and authenticated as well: there has
--    never been an insert policy for them, so this changes no behaviour today,
--    and it means a future policy added by accident cannot open a write path.
--    service_role keeps INSERT, which is how the log is written at all.
--
-- 2. A trigger that refuses regardless of who is asking, including the table
--    owner and including a superuser session. Grants can be handed back by
--    anyone able to run GRANT; this cannot be worked around without dropping
--    the trigger, which is itself a deliberate, visible act rather than an
--    accident inside an ordinary UPDATE.
--
-- TRUNCATE needs its own statement-level trigger: a row trigger never fires for
-- it, which is exactly how an "append-only" table gets emptied in one line.
--
-- Probed after applying, because a migration succeeding does not mean the rule
-- works. As postgres: UPDATE, DELETE and TRUNCATE each raised 42501 "audit_log
-- is append-only" and the row read back unchanged. As service_role: INSERT
-- still succeeded, UPDATE and DELETE were refused with "permission denied for
-- table audit_log", which is the grant layer answering before the trigger.

revoke update, delete, truncate on public.audit_log from anon, authenticated, service_role;
revoke insert on public.audit_log from anon, authenticated;

create or replace function private.audit_log_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception
    using
      errcode = '42501',
      message = 'public.audit_log is append-only',
      detail  = format('%s on public.audit_log was refused for role %I.', tg_op, current_user),
      hint    = 'Write a new row that records the correction. The history is not editable by design.';
end;
$$;

comment on function private.audit_log_is_append_only() is
  'Refuses every UPDATE, DELETE and TRUNCATE on public.audit_log, for every role.';

drop trigger if exists audit_log_no_update on public.audit_log;
create trigger audit_log_no_update
  before update on public.audit_log
  for each row execute function private.audit_log_is_append_only();

drop trigger if exists audit_log_no_delete on public.audit_log;
create trigger audit_log_no_delete
  before delete on public.audit_log
  for each row execute function private.audit_log_is_append_only();

drop trigger if exists audit_log_no_truncate on public.audit_log;
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.audit_log_is_append_only();

comment on table public.audit_log is
  'Append-only record of every privileged action. UPDATE, DELETE and TRUNCATE are revoked from every client role and refused by trigger for all roles.';
