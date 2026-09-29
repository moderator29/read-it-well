-- MONEY 3 / V-24: EVERY REFUND CARRIES A DUE-BY DATE, MEASURED TO PAYSTACK.
--
-- Supersedes the unapplied 20260924140100_v24 (moved to superseded/). Its
-- premise, that a decided refund lands in a Vallo wallet the instant it is
-- decided, is false now: Vallo holds no money, and a refund goes back to the
-- card or account that paid, through Paystack `/refund`
-- (`lib/payments/refund.ts`). So there are now THREE waits, each measured:
--
--   1. ASK -> INITIATION. A guest asks (`refund_requests`); support must have
--      the refund INITIATED at Paystack, or decline it in words, by the end of
--      the fifth Nigerian business day after the ask (Lagos). "Decided" means
--      a `booking_refunds` row after the ask whose processor status is
--      `submitted` or `processed`: Paystack accepted the refund. A row still
--      `pending` (decided on the desk, never sent) does not answer the clock.
--   2. DECISION -> INITIATION. A `booking_refunds` row left `pending` for more
--      than one business day was decided but never sent to Paystack.
--   3. INITIATION -> SUCCESS. Paystack's `refund.processed` webhook records
--      `processed` (`public.record_processor_refund_outcome`). A refund
--      submitted and not processed within ten business days is chased.
--   And, as before, a rent refund the lister received and owes back
--   (`rent_refunds_owed`) is timed from when it became owed.
--
-- THE LIVE BUG THIS FIXES. `public.record_processor_refund` UPDATEs
-- `booking_refunds.processor_status`, but `booking_refunds_no_update`
-- (append-only) refused every update except nulling `decided_by`, so the
-- processor's answer could never be written. The append-only guard now also
-- admits, and only admits, a FORWARD move of the four processor columns
-- (pending -> submitted | failed, failed -> submitted, submitted -> processed
-- | failed); every other column stays frozen.
--
-- THE CALENDAR IS A TABLE WITH A TWIN: `apps/web/src/lib/trust/
-- business-days.ts`, whose test reads THIS FILE and fails if the two lists
-- differ by a day. Moon-sighted holidays are estimates until declared.

create table if not exists public.ng_public_holidays (
  day        date primary key,
  name       text not null check (length(btrim(name)) between 3 and 80),
  estimated  boolean not null default false,
  check (extract(isodow from day) between 1 and 5)
);
comment on table public.ng_public_holidays is
  'V-24. Nigerian public holidays on the weekday they are observed. Read by private.business_days_after to date every refund promise. Twin of NG_PUBLIC_HOLIDAYS in apps/web/src/lib/trust/business-days.ts, held equal by a test.';
alter table public.ng_public_holidays enable row level security;
revoke all on public.ng_public_holidays from public, anon, authenticated;
grant select on public.ng_public_holidays to authenticated;
grant select, insert, update, delete on public.ng_public_holidays to service_role;
drop policy if exists ng_public_holidays_read on public.ng_public_holidays;
create policy ng_public_holidays_read on public.ng_public_holidays for select to authenticated using (true);

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
  d     date := (p_from at time zone 'Africa/Lagos')::date;
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

/* The three promises, one line each so each is changed in one place. */
create or replace function private.refund_ask_days() returns int language sql immutable set search_path to '' as $$ select 5 $$;
create or replace function private.refund_send_days() returns int language sql immutable set search_path to '' as $$ select 1 $$;
create or replace function private.refund_processor_days() returns int language sql immutable set search_path to '' as $$ select 10 $$;
revoke all on function private.refund_ask_days() from public, anon, authenticated;
revoke all on function private.refund_send_days() from public, anon, authenticated;
revoke all on function private.refund_processor_days() from public, anon, authenticated;

/* ------------------------------------------------ booking_refunds: the processor's side */
alter table public.booking_refunds
  add column if not exists processor_submitted_at timestamptz,
  add column if not exists processor_settled_at timestamptz;
alter table public.booking_refunds drop constraint if exists booking_refunds_processor_status_check;
alter table public.booking_refunds add constraint booking_refunds_processor_status_check
  check (processor_status in ('not_needed', 'pending', 'submitted', 'processed', 'failed'));
alter table public.booking_refunds drop constraint if exists booking_refunds_processor_stamps;
alter table public.booking_refunds add constraint booking_refunds_processor_stamps check (
  (processor_status not in ('submitted', 'processed') or processor_submitted_at is not null)
  and (processor_status <> 'processed' or processor_settled_at is not null));
create index if not exists booking_refunds_processor_idx on public.booking_refunds (processor_status, created_at)
  where processor_status in ('pending', 'submitted', 'failed');
create index if not exists booking_refunds_processor_ref_idx on public.booking_refunds (processor_refund_id)
  where processor_refund_id is not null;

create or replace function private.booking_refunds_is_append_only()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  processor_cols constant text[] := array['processor_status', 'processor_refund_id',
                                          'processor_submitted_at', 'processor_settled_at'];
begin
  if tg_op = 'UPDATE'
     and old.decided_by is not null
     and new.decided_by is null
     and (to_jsonb(new) - 'decided_by') = (to_jsonb(old) - 'decided_by') then
    return new;
  end if;
  -- V-24: the processor's answer is written forward, once per step, and
  -- nothing else on the row moves.
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - processor_cols) = (to_jsonb(old) - processor_cols)
     and ((old.processor_status = 'pending' and new.processor_status in ('submitted', 'failed'))
          or (old.processor_status = 'failed' and new.processor_status = 'submitted')
          or (old.processor_status = 'submitted' and new.processor_status in ('processed', 'failed')))
     and (old.processor_submitted_at is null or new.processor_submitted_at = old.processor_submitted_at)
     and (old.processor_settled_at is null or new.processor_settled_at = old.processor_settled_at) then
    return new;
  end if;
  raise exception 'public.booking_refunds is append-only' using errcode = '42501';
end;
$function$;

/* The processor has the refund (or refused it). Same signature and answer as
   before; now stamps when Paystack accepted it. Service role only. */
create or replace function public.record_processor_refund(p_refund uuid, p_status text, p_processor_id text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_status not in ('submitted', 'failed') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  update public.booking_refunds
     set processor_status = p_status,
         processor_refund_id = coalesce(nullif(btrim(p_processor_id), ''), processor_refund_id),
         processor_submitted_at = case when p_status = 'submitted' then now() else processor_submitted_at end
   where id = p_refund and processor_status in ('pending', 'failed');
  return jsonb_build_object('status', case when found then 'ok' else 'not_found' end);
end;
$function$;
revoke all on function public.record_processor_refund(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_processor_refund(uuid, text, text) to service_role;

/* Paystack's refund webhook (refund.processed / refund.failed): the money
   reached the card, or did not. Matched on Paystack's refund id first, then
   on the charge reference for the one row still waiting on it. Idempotent: a
   replayed event answers 'already'. Service role only. */
create or replace function public.record_processor_refund_outcome(
  p_processor_refund_id text, p_transaction_reference text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r public.booking_refunds%rowtype;
begin
  if p_status not in ('processed', 'failed') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  select * into r from public.booking_refunds
   where processor_refund_id = nullif(btrim(p_processor_refund_id), '')
   order by created_at desc limit 1 for update;
  if r.id is null and nullif(btrim(p_transaction_reference), '') is not null then
    select br.* into r from public.booking_refunds br
      join public.transactions t on t.booking_id = br.booking_id and t.provider_ref = btrim(p_transaction_reference)
     where br.processor_status = 'submitted'
     order by br.processor_submitted_at desc limit 1 for update of br;
  end if;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.processor_status = p_status then
    return jsonb_build_object('status', 'already', 'refund_id', r.id);
  end if;
  if r.processor_status <> 'submitted' then
    return jsonb_build_object('status', 'not_submitted', 'refund_id', r.id, 'processor_status', r.processor_status);
  end if;
  update public.booking_refunds
     set processor_status = p_status,
         processor_refund_id = coalesce(processor_refund_id, nullif(btrim(p_processor_refund_id), '')),
         processor_settled_at = case when p_status = 'processed' then now() else processor_settled_at end
   where id = r.id;
  if p_status = 'failed' then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'Paystack could not complete a refund to the card',
            format('Refund %s on booking %s (%s kobo) failed at the processor. Contact the guest and retry.',
                   r.id, r.booking_id, r.refund_minor),
            'booking_refund', r.id::text);
  end if;
  return jsonb_build_object('status', 'ok', 'refund_id', r.id, 'booking_id', r.booking_id);
end;
$function$;
revoke all on function public.record_processor_refund_outcome(text, text, text) from public, anon, authenticated;
grant execute on function public.record_processor_refund_outcome(text, text, text) to service_role;

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
  'V-24. A guest asking for a paid stay to be cancelled and refunded to the card. due_by (the end of the fifth Nigerian business day after the ask, Lagos) is when the refund must be INITIATED at Paystack or declined in words. Append-only.';
create index if not exists refund_requests_due_idx on public.refund_requests (due_by);
create index if not exists refund_requests_guest_idx on public.refund_requests (guest_id);
alter table public.refund_requests enable row level security;
revoke all on public.refund_requests from public, anon, authenticated;
grant select, insert on public.refund_requests to authenticated;
grant select, insert on public.refund_requests to service_role;

drop policy if exists refund_requests_read on public.refund_requests;
create policy refund_requests_read on public.refund_requests for select to authenticated
  using (guest_id = (select auth.uid())
         or private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
drop policy if exists refund_requests_insert on public.refund_requests;
create policy refund_requests_insert on public.refund_requests for insert to authenticated
  with check (
    guest_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
       where b.id = refund_requests.booking_id
         and b.guest_id = (select auth.uid())
         and b.status <> 'CANCELLED'
         and b.check_out > (now() at time zone 'Africa/Lagos')::date
         and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
         and exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL')));

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
    new.due_by := private.business_days_after(new.requested_at, private.refund_ask_days());
  exception when others then
    new.due_by := null;
  end;
  return new;
end;
$function$;
revoke all on function private.refund_requests_stamp() from public, anon, authenticated;
drop trigger if exists refund_requests_stamp on public.refund_requests;
create trigger refund_requests_stamp before insert or update on public.refund_requests
  for each row execute function private.refund_requests_stamp();

/* Is this ask answered by a refund Paystack has accepted? */
create or replace function private.refund_request_initiated_at(p_request uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $function$
  select min(r.processor_submitted_at)
    from public.refund_requests q
    join public.booking_refunds r on r.booking_id = q.booking_id and r.created_at >= q.requested_at
   where q.id = p_request and r.processor_status in ('submitted', 'processed');
$function$;
revoke all on function private.refund_request_initiated_at(uuid) from public, anon, authenticated;

/* ------------------------------------------------------------ the decision */
create table if not exists public.refund_request_decisions (
  request_id uuid primary key references public.refund_requests(id) on delete cascade,
  decision   text not null check (decision in ('declined', 'refunded')),
  note       text check (note is null or length(note) <= 1000),
  decided_by uuid not null,
  decided_at timestamptz not null default now()
);
comment on table public.refund_request_decisions is
  'V-24. Support''s decision on a refund request: declined (with the reason the guest reads), or refunded (only once a refund after the ask has been INITIATED at Paystack). Append-only.';
alter table public.refund_request_decisions enable row level security;
revoke all on public.refund_request_decisions from public, anon, authenticated;
grant select on public.refund_request_decisions to authenticated;
grant select, insert on public.refund_request_decisions to service_role;
drop policy if exists refund_request_decisions_read on public.refund_request_decisions;
create policy refund_request_decisions_read on public.refund_request_decisions for select to authenticated
  using (exists (select 1 from public.refund_requests q where q.id = request_id));

create or replace function private.refund_request_decisions_frozen()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  raise exception 'public.refund_request_decisions is append-only' using errcode = '42501';
end;
$function$;
revoke all on function private.refund_request_decisions_frozen() from public, anon, authenticated;
drop trigger if exists refund_request_decisions_frozen on public.refund_request_decisions;
create trigger refund_request_decisions_frozen before update on public.refund_request_decisions
  for each row execute function private.refund_request_decisions_frozen();

create or replace function public.decide_refund_request(p_request uuid, p_decision text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  q public.refund_requests%rowtype;
  caller uuid := (select auth.uid());
begin
  if not (private.has_role(caller, 'admin'::public.app_role)
          or private.has_role(caller, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'not_allowed');
  end if;
  select * into q from public.refund_requests where id = p_request;
  if q.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_decision not in ('declined', 'refunded') then
    return jsonb_build_object('status', 'bad_decision');
  end if;
  if p_decision = 'declined' and nullif(btrim(coalesce(p_note, '')), '') is null then
    return jsonb_build_object('status', 'needs_reason');
  end if;
  -- DECIDED means Paystack accepted the refund, never that a row was typed.
  if p_decision = 'refunded' and private.refund_request_initiated_at(q.id) is null then
    return jsonb_build_object('status', 'no_refund_initiated');
  end if;
  insert into public.refund_request_decisions (request_id, decision, note, decided_by)
  values (q.id, p_decision, left(nullif(btrim(coalesce(p_note, '')), ''), 1000), caller)
  on conflict (request_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_decided');
  end if;
  if p_decision = 'declined' then
    begin
      perform private.notify(q.guest_id, 'booking'::public.notification_kind,
        'Support answered your refund request', 'Open the booking to read the answer.', '/bookings/' || q.booking_id);
    exception when others then
      null;
    end;
  end if;
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.decide_refund_request(uuid, text, text) from public, anon;
grant execute on function public.decide_refund_request(uuid, text, text) to authenticated;

/* ------------------------------------------------------------ the measurement */
/* Hourly. One high alert, once, per wait past its date. */
create or replace function private.alert_overdue_refunds()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  n     int;
  total int := 0;
begin
  -- 1. An ask with no refund initiated at Paystack and no decline, past due.
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open', 'A refund request missed its due-by date',
         format('The guest asked on %s for booking %s to be cancelled and refunded; the refund had to be initiated at Paystack by %s (Lagos) and has not been.',
                to_char(q.requested_at at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI'), q.booking_id,
                to_char(q.due_by at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI')),
         'refund_request', q.id::text
    from public.refund_requests q
   where q.due_by is not null and q.due_by < now()
     and private.refund_request_initiated_at(q.id) is null
     and not exists (select 1 from public.refund_request_decisions d where d.request_id = q.id)
     and not exists (select 1 from public.risk_alerts a where a.entity_type = 'refund_request' and a.entity_id = q.id::text);
  get diagnostics n = row_count; total := total + n;

  -- 2. Decided on the desk, never sent to Paystack.
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open', 'A decided refund was never sent to Paystack',
         format('Refund %s on booking %s (%s kobo) was decided on %s and is still %s at the processor.',
                r.id, r.booking_id, r.refund_minor,
                to_char(r.created_at at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI'), r.processor_status),
         'booking_refund_unsent', r.id::text
    from public.booking_refunds r
   where r.processor_status in ('pending', 'failed') and r.refund_minor > 0
     and private.business_days_after(r.created_at, private.refund_send_days()) < now()
     and not exists (select 1 from public.risk_alerts a where a.entity_type = 'booking_refund_unsent' and a.entity_id = r.id::text);
  get diagnostics n = row_count; total := total + n;

  -- 3. Initiated, and Paystack has not said it reached the card.
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open', 'A refund initiated at Paystack has not completed',
         format('Refund %s on booking %s (%s kobo) was accepted by Paystack on %s and no success has been received after %s business days.',
                r.id, r.booking_id, r.refund_minor,
                to_char(r.processor_submitted_at at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI'), private.refund_processor_days()),
         'booking_refund_slow', r.id::text
    from public.booking_refunds r
   where r.processor_status = 'submitted'
     and private.business_days_after(r.processor_submitted_at, private.refund_processor_days()) < now()
     and not exists (select 1 from public.risk_alerts a where a.entity_type = 'booking_refund_slow' and a.entity_id = r.id::text);
  get diagnostics n = row_count; total := total + n;

  -- 4. A rent refund the lister received and owes back, past five business days.
  insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
  select 'high', 'open', 'A rent refund owed by a lister is past five business days',
         format('Booking %s: %s kobo owed back by the lister since %s (Lagos), not cleared.',
                o.booking_id, o.amount_minor, to_char(o.created_at at time zone 'Africa/Lagos', 'Dy DD Mon YYYY HH24:MI')),
         'rent_refund_owed', o.booking_id::text || ':' || floor(extract(epoch from o.created_at))::bigint
    from public.rent_refunds_owed o
   where o.cleared_at is null
     and private.business_days_after(o.created_at, private.refund_ask_days()) < now()
     and not exists (select 1 from public.risk_alerts a
                      where a.entity_type = 'rent_refund_owed'
                        and a.entity_id = o.booking_id::text || ':' || floor(extract(epoch from o.created_at))::bigint);
  get diagnostics n = row_count; total := total + n;
  return total;
end;
$function$;
revoke all on function private.alert_overdue_refunds() from public, anon, authenticated;

/* The operator's list, filtered in the database: every open wait whose date
   is past or inside the next 24 hours, soonest first. kind is one of
   request | unsent | processor | rent_owed. */
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
           coalesce(q.due_by, private.business_days_after(q.requested_at, private.refund_ask_days()))
      from public.refund_requests q
     where private.refund_request_initiated_at(q.id) is null
       and not exists (select 1 from public.refund_request_decisions d where d.request_id = q.id)
    union all
    select 'unsent'::text, r.id, r.booking_id, r.refund_minor,
           private.business_days_after(r.created_at, private.refund_send_days())
      from public.booking_refunds r
     where r.processor_status in ('pending', 'failed') and r.refund_minor > 0
    union all
    select 'processor'::text, r.id, r.booking_id, r.refund_minor,
           private.business_days_after(r.processor_submitted_at, private.refund_processor_days())
      from public.booking_refunds r
     where r.processor_status = 'submitted'
    union all
    select 'rent_owed'::text, o.booking_id, o.booking_id, o.amount_minor,
           private.business_days_after(o.created_at, private.refund_ask_days())
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
select cron.schedule('vallo_alert_overdue_refunds', '12 * * * *', 'select private.alert_overdue_refunds();');

/* ------------------------------------------------------------------ read back */
do $$
begin
  if not exists (select 1 from pg_class where oid = 'public.refund_requests'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid = 'public.refund_request_decisions'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid = 'public.ng_public_holidays'::regclass and relrowsecurity) then
    raise exception 'a V-24 table has no RLS';
  end if;
  if has_table_privilege('authenticated', 'public.refund_requests', 'UPDATE, DELETE, TRUNCATE')
     or has_table_privilege('authenticated', 'public.refund_request_decisions', 'INSERT, UPDATE, DELETE')
     or has_table_privilege('anon', 'public.refund_requests', 'SELECT, INSERT') then
    raise exception 'a V-24 table is writable by the wrong role';
  end if;
  if has_function_privilege('authenticated', 'public.record_processor_refund_outcome(text,text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.record_processor_refund_outcome(text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_processor_refund(uuid,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.record_processor_refund_outcome(text,text,text)', 'EXECUTE') then
    raise exception 'a processor door is open to the wrong role';
  end if;
  if (select count(*) from public.ng_public_holidays) < 16 then
    raise exception 'the holiday calendar did not land';
  end if;
  -- Thursday 1 October 2026 is a holiday: five business days after Wednesday
  -- 30 September end on Thursday 8 October.
  if (private.business_days_after('2026-09-30 10:00+01'::timestamptz, 5) at time zone 'Africa/Lagos')::date <> '2026-10-08' then
    raise exception 'business_days_after skipped the wrong days';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_alert_overdue_refunds') then
    raise exception 'the refund clock job is not scheduled';
  end if;
end $$;
