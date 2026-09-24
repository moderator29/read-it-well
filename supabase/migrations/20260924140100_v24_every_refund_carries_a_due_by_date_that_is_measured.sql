-- V-24: EVERY REFUND CARRIES A DUE-BY DATE, AND THE DATE IS MEASURED.
--
-- The founder's refund promise is three to five business days. The stays copy
-- said "usually within minutes", and nothing anywhere measured either. From
-- here a refund has ONE promise, stored on its own row at the moment it is
-- decided: in the guest's wallet by the end of the fifth Nigerian business
-- day after the decision, Lagos time. The guest sees that date; the operator
-- sees the refunds due inside a day; a job raises a high alert for any refund
-- whose date passed without a completed credit.
--
-- THE CALENDAR IS A TABLE, AND IT HAS A TWIN. `apps/web/src/lib/trust/
-- business-days.ts` holds the same holidays for the screens, and its test
-- reads THIS FILE and fails if the two lists differ by a day. Moon-sighted
-- holidays are estimates until the Federal Government declares them and are
-- flagged as such; correct both places when a date is declared.
--
-- WHY A TRIGGER AND NOT THE REFUND FUNCTIONS. Refunds are written by
-- `private.refund_and_cancel_booking` and `escrow_settle`, both owned by the
-- audit session. A BEFORE INSERT trigger stamps `due_by` on whatever row they
-- write without a line of theirs changing. The append-only guard on
-- `booking_refunds` refuses UPDATE and DELETE, never INSERT, and the trigger
-- only ever sets the new row's own column, and it catches its own failure
-- so it can never raise inside the refund's transaction.
--
-- LANDED IS NOT A COLUMN. Whether the refund reached the wallet is the linked
-- wallet entry's own status, which is the only honest answer; a copy of it here
-- would be a second truth that could disagree with the first.

create table if not exists public.ng_public_holidays (
  day        date primary key,
  name       text not null check (length(btrim(name)) between 3 and 80),
  estimated  boolean not null default false,
  check (extract(isodow from day) between 1 and 5)
);

comment on table public.ng_public_holidays is
  'V-24. Nigerian public holidays on the weekday they are observed. Read by private.business_days_after to date every refund promise. Moon-sighted days are estimated until the Federal Government declares them. Twin of NG_PUBLIC_HOLIDAYS in apps/web/src/lib/trust/business-days.ts, held equal by a test.';

alter table public.ng_public_holidays enable row level security;
revoke all on public.ng_public_holidays from public, anon, authenticated;
grant select on public.ng_public_holidays to authenticated;
grant all on public.ng_public_holidays to service_role;

drop policy if exists ng_public_holidays_read on public.ng_public_holidays;
create policy ng_public_holidays_read
  on public.ng_public_holidays for select to authenticated
  using (true);

insert into public.ng_public_holidays (day, name, estimated) values
  ('2026-10-01', 'Independence Day', false),
  ('2026-12-25', 'Christmas Day', false),
  ('2026-12-28', 'Boxing Day (observed)', false),
  ('2027-01-01', 'New Year''s Day', false),
  ('2027-03-10', 'Eid al-Fitr', true),
  ('2027-03-11', 'Eid al-Fitr holiday', true),
  ('2027-03-26', 'Good Friday', false),
  ('2027-03-29', 'Easter Monday', false),
  ('2027-05-03', 'Workers'' Day (observed)', false),
  ('2027-05-17', 'Eid al-Adha', true),
  ('2027-05-18', 'Eid al-Adha holiday', true),
  ('2027-06-14', 'Democracy Day (observed)', false),
  ('2027-08-16', 'Eid-el-Maulud (observed)', true),
  ('2027-10-01', 'Independence Day', false),
  ('2027-12-27', 'Christmas Day (observed)', false),
  ('2027-12-28', 'Boxing Day (observed)', false)
on conflict (day) do update set name = excluded.name, estimated = excluded.estimated;

/* The last second of the nth Lagos business day after an instant. The day of
   the instant itself never counts. */
create or replace function private.business_days_after(p_from timestamptz, p_days int)
returns timestamptz
language plpgsql
stable
set search_path to 'pg_catalog', 'public'
as $function$
declare
  d    date := (p_from at time zone 'Africa/Lagos')::date;
  left_ int := greatest(coalesce(p_days, 0), 0);
begin
  while left_ > 0 loop
    d := d + 1;
    if extract(isodow from d) between 1 and 5
       and not exists (select 1 from public.ng_public_holidays h where h.day = d) then
      left_ := left_ - 1;
    end if;
  end loop;
  return (d::timestamp + interval '23 hours 59 minutes 59 seconds') at time zone 'Africa/Lagos';
end;
$function$;

revoke all on function private.business_days_after(timestamptz, int) from public, anon, authenticated;

alter table public.booking_refunds add column if not exists due_by timestamptz;

comment on column public.booking_refunds.due_by is
  'V-24. The promise: this refund is in the guest''s wallet by the end of the fifth Nigerian business day after the decision, Lagos time. Stamped on insert by booking_refunds_stamp_due_by; measured by private.alert_overdue_refunds.';

create or replace function private.booking_refunds_stamp_due_by()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  -- Runs inside the refund's own transaction, so it may never raise: a date
  -- that cannot be computed is left null and the alert job treats a null
  -- due-by as nothing to measure, rather than the refund being refused.
  begin
    new.due_by := private.business_days_after(coalesce(new.created_at, now()), 5);
  exception when others then
    new.due_by := null;
  end;
  return new;
end;
$function$;

revoke all on function private.booking_refunds_stamp_due_by() from public, anon, authenticated;

drop trigger if exists booking_refunds_stamp_due_by on public.booking_refunds;
create trigger booking_refunds_stamp_due_by
  before insert on public.booking_refunds
  for each row execute function private.booking_refunds_stamp_due_by();

/* The measurement. Hourly: any refund with money owed, past its due-by, whose
   wallet credit is missing or not COMPLETED, raises one high alert, once. */
create or replace function private.alert_overdue_refunds()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  raised int := 0;
begin
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open',
         'A refund missed its due-by date',
         format('Refund of %s kobo on booking %s was due in the guest''s wallet by %s (Lagos) and has not landed.',
                r.refund_minor, r.booking_id,
                to_char(r.due_by at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI')),
         'booking_refund', r.id::text
    from public.booking_refunds r
    left join public.wallet_entries e on e.id = r.wallet_entry_id
   where r.refund_minor > 0
     and r.due_by is not null
     and r.due_by < now()
     and (e.id is null or e.status <> 'COMPLETED')
     and not exists (
       select 1 from public.risk_alerts a
        where a.entity_type = 'booking_refund' and a.entity_id = r.id::text
     );
  get diagnostics raised = row_count;
  return raised;
end;
$function$;

revoke all on function private.alert_overdue_refunds() from public, anon, authenticated;

select cron.unschedule('vallo_alert_overdue_refunds')
 where exists (select 1 from cron.job where jobname = 'vallo_alert_overdue_refunds');

select cron.schedule('vallo_alert_overdue_refunds', '12 * * * *',
                     'select private.alert_overdue_refunds();');
