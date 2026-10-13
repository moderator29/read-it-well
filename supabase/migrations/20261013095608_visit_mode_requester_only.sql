set lock_timeout = '5s';

-- --------------------------------------------------------------------- 3
create or replace function private.inspection_columns_belong()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null
     or private.has_role(caller, 'admin'::public.app_role)
     or private.has_role(caller, 'super_admin'::public.app_role) then
    return new;
  end if;

  if new.conversation_id is not null
     and (tg_op = 'INSERT' or new.conversation_id is distinct from old.conversation_id)
     and not exists (
       select 1
         from public.conversations c
        where c.id = new.conversation_id
          and c.guest_id = new.requester_id
          and c.agent_id = new.lister_id
          and c.listing_id = new.listing_id
     ) then
    raise exception 'an inspection belongs only in the conversation between its two parties about its listing'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    if new.state = 'REQUESTED'::public.inspection_state
       and (new.slot_at is not null or new.lister_note is not null) then
      raise exception 'a new inspection request carries no agreed time and no lister note'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.requested_at is distinct from old.requested_at then
    raise exception 'the time an inspection was asked for does not change'
      using errcode = 'check_violation';
  end if;

  if new.slot_at is distinct from old.slot_at
     and not (
       caller = old.lister_id
       and new.state is distinct from old.state
       and new.state in ('CONFIRMED'::public.inspection_state, 'PROPOSED'::public.inspection_state)
     ) then
    raise exception 'the agreed time of an inspection changes only with the lister''s answer'
      using errcode = 'check_violation';
  end if;

  if new.note is distinct from old.note and caller <> old.requester_id then
    raise exception 'the request note is the requester''s to write'
      using errcode = 'check_violation';
  end if;
  if new.lister_note is distinct from old.lister_note and caller <> old.lister_id then
    raise exception 'the lister note is the lister''s to write'
      using errcode = 'check_violation';
  end if;
  -- visit_mode: how the renter visits is the renter's to say.
  if new.visit_mode is distinct from old.visit_mode and caller <> old.requester_id then
    raise exception 'the visit mode is the requester''s to choose'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;
