-- V-24: A REFUND HAS A DUE-BY DATE, AND THE DATE IS MEASURED FROM THE ASK.
--
-- The founder's refund promise is three to five business days. The stays copy
-- said "usually within minutes", and nothing anywhere measured either.
--
-- WHAT IS ACTUALLY SLOW, AND WHAT IS NOT. Both refund doors
-- (`private.refund_and_cancel_booking`, `escrow_settle`) credit the wallet
-- COMPLETED in the same transaction that writes the `booking_refunds` row, so
-- once a refund is DECIDED it is in the wallet that instant. A clock started
-- at the decision is met in zero seconds by construction and could never
-- fire. The waits a person actually experiences are two:
--
--   1. from the guest ASKING for a paid stay to be cancelled to support
--      deciding it. There was no record of the ask at all: a guest wrote to
--      support in free text. `public.refund_requests` is that record, and its
--      due-by is the promise.
--   2. a rent refund the lister owes (`public.rent_refunds_owed`, the audit's
--      lister-short path), which has no `booking_refunds` row and waits on the
--      lister. Its clock starts at the row's `created_at`, read at run time;
--      nothing is added to the audit's table.
--
-- THE PROMISE IS A CEILING. A decided refund lands the moment it is decided;
-- the due-by, the end of the fifth Nigerian business day after the ask, Lagos
-- time, is the latest it may take. An hourly job raises one high alert per
-- request or rent refund past that date with no refund recorded.
--
-- WHAT THE ALERT CANNOT CATCH, said plainly: a guest who asks support in free
-- text instead of through the booking page's request (no row, no clock); a
-- partial refund decided later than a first one on the same booking (the
-- first `booking_refunds` row after the ask answers the request); and any
-- refund path that does not write `booking_refunds` or `rent_refunds_owed`.
--
-- THE CALENDAR IS A TABLE, AND IT HAS A TWIN. `apps/web/src/lib/trust/
-- business-days.ts` holds the same holidays for the screens, and its test
-- reads THIS FILE and fails if the two lists differ by a day. Moon-sighted
-- holidays are estimates until the Federal Government declares them and are
-- flagged as such; correct both places when a date is declared.
--
-- NOTHING HERE TOUCHES A MONEY TABLE. The only new trigger is on the new
-- `refund_requests` table; `booking_refunds`, `wallet_entries` and
-- `rent_refunds_owed` are only read.

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

/* ------------------------------------------------------------ the ask */

create table if not exists public.refund_requests (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null unique references public.bookings(id) on delete cascade,
  guest_id     uuid not null default auth.uid(),
  reason       text not null check (reason in ('guest_choice', 'host_cancelled', 'not_as_listed', 'no_access')),
  note         text check (note is null or length(note) <= 1000),
  requested_at timestamptz not null default now(),
  due_by       timestamptz
);

comment on table public.refund_requests is
  'V-24. A guest asking for a paid stay to be cancelled and refunded. due_by (the end of the fifth Nigerian business day after the ask, Lagos time) is the ceiling of the refund promise; the first booking_refunds row for the booking after requested_at answers it. Append-only.';

create index if not exists refund_requests_due_idx on public.refund_requests (due_by);

alter table public.refund_requests enable row level security;
revoke all on public.refund_requests from public, anon, authenticated;
grant select, insert on public.refund_requests to authenticated;
grant all on public.refund_requests to service_role;

drop policy if exists refund_requests_read on public.refund_requests;
create policy refund_requests_read on public.refund_requests for select to authenticated
  using (guest_id = (select auth.uid())
         or private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

/* The guest asks, as themselves, about their own paid, uncancelled stay. */
drop policy if exists refund_requests_insert on public.refund_requests;
create policy refund_requests_insert on public.refund_requests for insert to authenticated
  with check (
    guest_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
       where b.id = refund_requests.booking_id
         and b.guest_id = (select auth.uid())
         and b.status <> 'CANCELLED'
         and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
         and exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL')
    )
  );

create or replace function private.refund_requests_stamp()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if tg_op = 'UPDATE' then
    raise exception 'public.refund_requests is append-only' using errcode = '42501';
  end if;
  new.requested_at := now();
  begin
    new.due_by := private.business_days_after(new.requested_at, 5);
  exception when others then
    new.due_by := null;
  end;
  return new;
end;
$function$;

revoke all on function private.refund_requests_stamp() from public, anon, authenticated;

drop trigger if exists refund_requests_stamp on public.refund_requests;
create trigger refund_requests_stamp
  before insert or update on public.refund_requests
  for each row execute function private.refund_requests_stamp();

/* ------------------------------------------------------------ the measurement */

/* Hourly. One high alert, once, per ask past its due-by with no refund
   recorded after it, and per rent refund owed past five business days and not
   cleared. */
create or replace function private.alert_overdue_refunds()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  raised int := 0;
  more   int := 0;
begin
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open',
         'A refund request missed its due-by date',
         format('The guest asked on %s for booking %s to be cancelled and refunded; it was due by %s (Lagos) and no refund has been recorded.',
                to_char(q.requested_at at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI'), q.booking_id,
                to_char(q.due_by at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI')),
         'refund_request', q.id::text
    from public.refund_requests q
   where q.due_by is not null
     and q.due_by < now()
     and not exists (select 1 from public.booking_refunds r
                      where r.booking_id = q.booking_id and r.created_at >= q.requested_at)
     and not exists (select 1 from public.risk_alerts a
                      where a.entity_type = 'refund_request' and a.entity_id = q.id::text);
  get diagnostics raised = row_count;

  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open',
         'A rent refund owed by a lister is past five business days',
         format('Booking %s: %s kobo owed back by the lister since %s (Lagos), not cleared.',
                o.booking_id, o.amount_minor,
                to_char(o.created_at at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI')),
         'rent_refund_owed', o.booking_id::text
    from public.rent_refunds_owed o
   where o.cleared_at is null
     and private.business_days_after(o.created_at, 5) < now()
     and not exists (select 1 from public.risk_alerts a
                      where a.entity_type = 'rent_refund_owed' and a.entity_id = o.booking_id::text);
  get diagnostics more = row_count;
  return raised + more;
end;
$function$;

revoke all on function private.alert_overdue_refunds() from public, anon, authenticated;

/* The operator's list, filtered in the database so it can never be emptied
   by a page of old rows: open asks and uncleared rent refunds whose due-by is
   past or inside the next 24 hours, soonest first. */
create or replace function public.admin_refund_clock()
returns table (kind text, subject_id uuid, booking_id uuid, amount_minor bigint, due_by timestamptz)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select * from (
    select 'request'::text, q.id, q.booking_id,
           coalesce((select sum(t.amount_minor) from public.transactions t
                      where t.booking_id = q.booking_id and t.status = 'SUCCESSFUL'), 0)::bigint,
           coalesce(q.due_by, private.business_days_after(q.requested_at, 5))
      from public.refund_requests q
     where not exists (select 1 from public.booking_refunds r
                        where r.booking_id = q.booking_id and r.created_at >= q.requested_at)
    union all
    select 'rent_owed'::text, o.booking_id, o.booking_id, o.amount_minor,
           private.business_days_after(o.created_at, 5)
      from public.rent_refunds_owed o
     where o.cleared_at is null
  ) clock (kind, subject_id, booking_id, amount_minor, due_by)
  where (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role))
    and clock.due_by < now() + interval '24 hours'
  order by clock.due_by asc
  limit 500;
$function$;

revoke all on function public.admin_refund_clock() from public, anon;
grant execute on function public.admin_refund_clock() to authenticated;

select cron.unschedule('vallo_alert_overdue_refunds')
 where exists (select 1 from cron.job where jobname = 'vallo_alert_overdue_refunds');

select cron.schedule('vallo_alert_overdue_refunds', '12 * * * *',
                     'select private.alert_overdue_refunds();');
