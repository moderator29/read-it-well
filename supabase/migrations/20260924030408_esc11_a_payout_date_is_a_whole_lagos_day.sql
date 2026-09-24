-- ESC-11: a held payment paid out at whatever hour it had been funded, 21 days
-- later (plus up to 59 minutes to the next :17 sweep), while every surface
-- showed only a date. A payer who objected in the evening of the day shown
-- could find it already paid that morning.
--
-- A payout moment in the future is now the end of its Lagos day: 00:00 WAT on
-- the next day. So the date shown is the last whole day to object, and the
-- hourly sweep pays out at 00:17 WAT after it. One trigger snaps it for every
-- door that sets auto_release_at (funding, the legacy hold, the wallet door),
-- and it is idempotent: a moment already at midnight in Lagos is left as it
-- is. A moment already due is left alone. Rows already held are snapped once
-- here (live has none).

create or replace function private.escrow_payout_at_end_of_lagos_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_at timestamp;
begin
  if new.auto_release_at is null or new.auto_release_at <= now() then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.auto_release_at is not distinct from old.auto_release_at then
    return new;
  end if;
  local_at := new.auto_release_at at time zone 'Africa/Lagos';
  if local_at::time <> time '00:00' then
    new.auto_release_at := ((local_at::date + 1)::timestamp) at time zone 'Africa/Lagos';
  end if;
  return new;
end;
$$;
revoke all on function private.escrow_payout_at_end_of_lagos_day() from public, anon, authenticated;

drop trigger if exists escrows_payout_at_end_of_lagos_day on public.escrows;
create trigger escrows_payout_at_end_of_lagos_day
  before insert or update of auto_release_at on public.escrows
  for each row execute function private.escrow_payout_at_end_of_lagos_day();

update public.escrows
   set auto_release_at = (((auto_release_at at time zone 'Africa/Lagos')::date + 1)::timestamp) at time zone 'Africa/Lagos'
 where state in ('HELD', 'RELEASE_REQUESTED')
   and auto_release_at > now()
   and (auto_release_at at time zone 'Africa/Lagos')::time <> time '00:00';
