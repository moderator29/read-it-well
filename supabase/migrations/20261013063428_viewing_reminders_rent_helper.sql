-- Applied 13 October 2026, part of the viewing no-show and both-sides reminders migration (founder decisions, round 2).
-- Dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

create or replace function private.send_rent_due_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  r        record;
  sent     integer := 0;
  today    date := (now() at time zone 'Africa/Lagos')::date;
  stage_n  integer;
  stage    text;
begin
  for r in
    select rp.id, rp.tenant_id, rp.move_in, private.tenancy_end(rp.move_in, rp.rent_period) as ends_on
      from public.rent_payments rp
     where rp.rent_period in ('year', 'quarter')
       and exists (select 1 from public.tenancy_snapshots s where s.rent_payment_id = rp.id)
       and private.tenancy_end(rp.move_in, rp.rent_period) >= today
       and private.tenancy_end(rp.move_in, rp.rent_period) <= today + 180
     limit 2000
  loop
    if private.tenancy_void(r.id) then
      continue;
    end if;
    stage := null;
    foreach stage_n in array array[7, 30, 90, 180] loop
      if r.ends_on - today <= stage_n and (r.ends_on - stage_n) > r.move_in then
        stage := 'd' || stage_n;
        exit;
      end if;
    end loop;
    continue when stage is null;
    insert into public.member_reminders (kind, subject_id, stage) values ('rent_due', r.id, stage) on conflict do nothing;
    continue when not found;
    perform private.notify(r.tenant_id, 'booking'::public.notification_kind,
      case when r.ends_on - today <= 1 then 'Your rent is due tomorrow'
           else 'Your rent is due in ' || (r.ends_on - today) || ' days' end,
      'Your tenancy runs to ' || to_char(r.ends_on, 'FMDD FMMonth YYYY') ||
        '. Open it to see the figure and what setting it aside each month adds up to.',
      '/tenancy/' || r.id);
    sent := sent + 1;
  end loop;
  return sent;
end;
$fn$;
revoke all on function private.send_rent_due_reminders() from public, anon, authenticated;
