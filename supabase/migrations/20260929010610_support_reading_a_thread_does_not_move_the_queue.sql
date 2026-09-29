-- Reading a support thread does not move the ticket in the staff queue.
--
-- The admin queue orders support tickets by updated_at, latest first, so a
-- member's reply floats the ticket up (DB2, 20260929001306). The member's
-- "mark read" stamp (support_ticket_member_mark_read, 20260929000412) is also
-- an UPDATE, and the generic set_updated_at trigger bumped updated_at on it,
-- so a member merely opening their thread floated the ticket as if they had
-- written. This trigger runs after set_updated_at (triggers of one timing
-- fire in name order) and, when member_read_at is the only column that
-- changed, puts updated_at back. Every other update is untouched.

create or replace function private.support_ticket_read_keeps_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.member_read_at is distinct from old.member_read_at
     and (to_jsonb(new) - 'member_read_at' - 'updated_at') = (to_jsonb(old) - 'member_read_at' - 'updated_at') then
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

create trigger support_tickets_zz_read_keeps_updated_at
  before update on public.support_tickets
  for each row execute function private.support_ticket_read_keeps_updated_at();

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'support_tickets_zz_read_keeps_updated_at') then
    raise exception 'support_tickets_zz_read_keeps_updated_at missing';
  end if;
  if 'support_tickets_zz_read_keeps_updated_at' <= 'support_tickets_set_updated_at' then
    raise exception 'the read trigger would fire before set_updated_at';
  end if;
end;
$$;
