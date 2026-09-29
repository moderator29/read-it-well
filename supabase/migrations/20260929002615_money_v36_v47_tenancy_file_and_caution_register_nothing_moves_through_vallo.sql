-- MONEY 4 / V-47 AND V-36: THE TENANCY FILE, AND THE CAUTION REGISTER.
-- NO MONEY MOVES THROUGH VALLO.
--
-- Supersedes the unapplied 20260924140400_v36_v47 (moved to superseded/),
-- whose one money door, `return_caution`, moved a caution from the lister's
-- Vallo wallet to the tenant's. There is no wallet. The redesign:
--
-- THE CAUTION IS PAID TO THE LANDLORD OR AGENT AT MOVE-IN, BY SPLIT. It is
-- part of the move-in total, so the lister's share of the split charge
-- (Track A.2) carries it to the lister's own Paystack subaccount the moment
-- the tenant pays. It is theirs to hold under the tenancy. Vallo keeps the
-- REGISTER, never the money:
--
--   caution_obligations        who holds the caution (the lister), how much,
--                              when the tenancy ends, when it is due back
--   caution_deductions         an itemised deduction the lister proposes,
--                              each tied to a photograph from their own
--                              submitted move-out report (V-54)
--   caution_deduction_answers  the tenant accepts or disputes each line, once
--   caution_dispute_rulings    a disputed line goes to staff (scope
--                              `guarantee`), who allow some, all or none of it
--   caution_returns            a return RECORDED by either party: the lister
--                              saying they paid it back (bank transfer, cash),
--                              or the tenant confirming they received it.
--                              Nothing is paid through Vallo.
--   caution_return_contests    the tenant says a return the lister recorded
--                              never arrived; staff rule on it
--   caution_return_rulings     that ruling
--   guarantee_claims           (live, Track A.2) an unreturned caution past its
--                              due date ESCALATES to a Vallo Guarantee claim
--                              for the undisputed part still owed: by the
--                              tenant from the file, and by a daily job for
--                              any the tenant did not raise. Staff decide it
--                              with the live `admin_decide_guarantee_claim`.
--
-- WHERE A STATE WOULD BE A COLUMN IT IS READ FROM THE ROWS
-- (`private.caution_position`, twin of `cautionState` in lib/tenancy/model.ts).
--
-- THE RECORDS OPEN WHEN THE MOVE-IN IS FULLY PAID: an AFTER trigger on
-- `transactions` reaching SUCCESSFUL opens them only once the charge's
-- successful payments cover its total (`private.tenancy_paid`), so a
-- flatmate's share (V-86) paid alone opens nothing. The trigger runs inside
-- settlement and never raises.
--
-- Every table is RLS-on, append-only, readable by the two parties and staff,
-- and written only through security-definer doors that check auth.uid().

/* ------------------------------------------------------------ helpers */
create or replace function private.tenancy_end(p_move_in date, p_period public.rent_period)
returns date
language sql
immutable
set search_path to ''
as $function$
  select case p_period
    when 'month'   then (p_move_in + interval '1 month')::date
    when 'quarter' then (p_move_in + interval '3 months')::date
    else                (p_move_in + interval '1 year')::date
  end;
$function$;
comment on function private.tenancy_end(date, public.rent_period) is
  'V-47. Move-in plus one rent period. Twin of tenancyEnd in apps/web/src/lib/tenancy/model.ts.';

create or replace function private.caution_return_days()
returns int language sql immutable set search_path to '' as $function$ select 30 $function$;

create or replace function private.tenancy_party(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (select 1 from public.rent_payments rp
                  where rp.id = p_rent_payment
                    and (rp.tenant_id = (select auth.uid()) or rp.lister_id = (select auth.uid())));
$function$;

-- What the charge's successful card payments add up to (one, or V-86 shares).
create or replace function private.rent_charge_paid_minor(p_rent_payment uuid)
returns bigint
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(sum(t.amount_minor), 0)::bigint
    from public.rent_payments rp
    join public.transactions t on t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL'
   where rp.id = p_rent_payment;
$function$;

-- A tenancy exists once the whole move-in total has settled by split.
create or replace function private.tenancy_paid(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (select 1 from public.rent_payments rp
                  where rp.id = p_rent_payment
                    and private.rent_charge_paid_minor(rp.id) >= rp.total_minor);
$function$;

-- Void only when the whole move-in fell through: cancelled, or refunded to the
-- card (and recorded as owed back by the lister) up to the full total.
create or replace function private.tenancy_void(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.rent_payments rp
      join public.bookings b on b.id = rp.booking_id
     where rp.id = p_rent_payment
       and (b.status = 'CANCELLED'
            or coalesce((select sum(r.refund_minor) from public.booking_refunds r where r.booking_id = b.id), 0)
             + coalesce((select sum(o.amount_minor) from public.rent_refunds_owed o where o.booking_id = b.id), 0)
               >= rp.total_minor));
$function$;

create or replace function public.tenancy_is_void(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (private.tenancy_party(p_rent_payment) or private.is_staff()) and private.tenancy_void(p_rent_payment);
$function$;

create or replace function private.tenancy_tell(p_user uuid, p_title text, p_body text, p_rent_payment uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  perform private.notify(p_user, 'booking'::public.notification_kind, p_title, p_body, '/tenancy/' || p_rent_payment);
exception when others then
  null;
end;
$function$;

create or replace function private.tenancy_record_is_frozen()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;
  raise exception '%.% is append-only: a tenancy record is never edited', tg_table_schema, tg_table_name
    using errcode = '42501';
end;
$function$;

revoke all on function private.tenancy_end(date, public.rent_period) from public, anon;
revoke all on function private.caution_return_days() from public, anon;
revoke all on function private.tenancy_party(uuid) from public, anon;
revoke all on function private.rent_charge_paid_minor(uuid) from public, anon, authenticated;
revoke all on function private.tenancy_paid(uuid) from public, anon, authenticated;
revoke all on function private.tenancy_void(uuid) from public, anon;
revoke all on function public.tenancy_is_void(uuid) from public, anon;
revoke all on function private.tenancy_tell(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function private.tenancy_record_is_frozen() from public, anon, authenticated;
-- Policies call these as the querying role.
grant execute on function private.tenancy_end(date, public.rent_period) to authenticated;
grant execute on function private.caution_return_days() to authenticated;
grant execute on function private.tenancy_party(uuid) to authenticated;
grant execute on function private.tenancy_void(uuid) to authenticated;
grant execute on function public.tenancy_is_void(uuid) to authenticated;

/* ------------------------------------------------------------ the tables */
create table if not exists public.tenancy_snapshots (
  rent_payment_id uuid primary key references public.rent_payments(id) on delete cascade,
  listing         jsonb not null,
  amenities       text[] not null default '{}',
  taken_at        timestamptz not null default now(),
  constraint tenancy_snapshots_listing_is_object check (jsonb_typeof(listing) = 'object')
);
comment on table public.tenancy_snapshots is
  'V-47. The listing as it stood when the move-in was fully paid. Never the address, landmark or coordinates. Append-only; kept to tenancy end plus six years.';

create table if not exists public.caution_obligations (
  id              uuid primary key default gen_random_uuid(),
  rent_payment_id uuid not null unique references public.rent_payments(id) on delete cascade,
  tenant_id       uuid not null,
  lister_id       uuid not null,
  amount_minor    bigint not null check (amount_minor > 0),
  tenancy_end     date not null,
  due_on          date not null,
  opened_at       timestamptz not null default now(),
  check (due_on >= tenancy_end)
);
comment on table public.caution_obligations is
  'V-36. A caution deposit the lister HOLDS under the tenancy (it reached their own subaccount in the move-in split) and owes back by due_on. Vallo keeps this register and never the money. State is read from the rows beside it (private.caution_position).';

create table if not exists public.caution_deductions (
  id              uuid primary key default gen_random_uuid(),
  obligation_id   uuid not null references public.caution_obligations(id) on delete cascade,
  item            text not null check (item in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall')),
  amount_minor    bigint not null check (amount_minor > 0),
  photo_id        uuid not null,
  note            text check (note is null or length(note) <= 500),
  proposed_by     uuid not null,
  created_at      timestamptz not null default now()
);
comment on table public.caution_deductions is
  'V-36. One itemised deduction the lister proposes against a caution, named by an inspection item and tied to a photograph from their own submitted move-out report.';

create table if not exists public.caution_deduction_answers (
  deduction_id uuid primary key references public.caution_deductions(id) on delete cascade,
  answer       text not null check (answer in ('accepted', 'disputed')),
  answered_by  uuid not null,
  answered_at  timestamptz not null default now()
);

create table if not exists public.caution_dispute_rulings (
  deduction_id  uuid primary key references public.caution_deductions(id) on delete cascade,
  allowed_minor bigint not null check (allowed_minor >= 0),
  reason        text not null check (length(btrim(reason)) between 10 and 1000),
  decided_by    uuid not null,
  decided_at    timestamptz not null default now()
);
comment on table public.caution_dispute_rulings is
  'V-36. Staff''s ruling on a deduction the tenant disputed: how much of it the lister may keep (0 to the line). Written only by admin_rule_caution_dispute.';

create table if not exists public.caution_returns (
  id              uuid primary key default gen_random_uuid(),
  obligation_id   uuid not null references public.caution_obligations(id) on delete cascade,
  amount_minor    bigint not null check (amount_minor > 0),
  returned_on     date not null,
  method          text not null check (method in ('bank_transfer', 'cash', 'other')),
  reference       text check (reference is null or length(reference) between 1 and 100),
  recorded_by     uuid not null,
  recorded_as     text not null check (recorded_as in ('lister_sent', 'tenant_received')),
  idempotency_key uuid not null unique,
  recorded_at     timestamptz not null default now()
);
comment on table public.caution_returns is
  'V-36. A caution return RECORDED by a party: the lister saying they paid it back, or the tenant confirming receipt. The money went from the lister to the tenant directly; Vallo only records it. A lister_sent row the tenant contests stops counting until staff rule.';

create table if not exists public.caution_return_contests (
  return_id    uuid primary key references public.caution_returns(id) on delete cascade,
  contested_by uuid not null,
  note         text not null check (length(btrim(note)) between 5 and 1000),
  contested_at timestamptz not null default now()
);

create table if not exists public.caution_return_rulings (
  return_id  uuid primary key references public.caution_returns(id) on delete cascade,
  outcome    text not null check (outcome in ('received', 'not_received')),
  reason     text not null check (length(btrim(reason)) between 10 and 1000),
  decided_by uuid not null,
  decided_at timestamptz not null default now()
);

create table if not exists public.tenancy_pins (
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  message_id      uuid not null references public.messages(id) on delete cascade,
  pinned_by       uuid not null default auth.uid(),
  created_at      timestamptz not null default now(),
  primary key (rent_payment_id, message_id)
);
comment on table public.tenancy_pins is
  'V-47. A message either party pinned to the tenancy as evidence, kept to tenancy end plus six years (private.message_is_tenancy_evidence).';

create index if not exists caution_obligations_tenant_idx on public.caution_obligations (tenant_id);
create index if not exists caution_obligations_lister_idx on public.caution_obligations (lister_id);
create index if not exists caution_obligations_due_idx on public.caution_obligations (due_on);
create index if not exists caution_deductions_obligation_idx on public.caution_deductions (obligation_id);
create index if not exists caution_deductions_photo_idx on public.caution_deductions (photo_id);
create index if not exists caution_returns_obligation_idx on public.caution_returns (obligation_id);
create index if not exists tenancy_pins_message_idx on public.tenancy_pins (message_id);

-- The Guarantee claim a caution escalates to (the live Track A.2 table).
alter table public.guarantee_claims
  add column if not exists caution_obligation_id uuid references public.caution_obligations(id) on delete restrict;
create index if not exists guarantee_claims_caution_idx on public.guarantee_claims (caution_obligation_id)
  where caution_obligation_id is not null;
alter table public.guarantee_claims drop constraint if exists guarantee_claims_cites_something;
alter table public.guarantee_claims add constraint guarantee_claims_cites_something
  check (cardinality(items) > 0 or cardinality(evidence_paths) > 0 or caution_obligation_id is not null);

/* ------------------------------------------------------------ born locked */
alter table public.tenancy_snapshots enable row level security;
alter table public.caution_obligations enable row level security;
alter table public.caution_deductions enable row level security;
alter table public.caution_deduction_answers enable row level security;
alter table public.caution_dispute_rulings enable row level security;
alter table public.caution_returns enable row level security;
alter table public.caution_return_contests enable row level security;
alter table public.caution_return_rulings enable row level security;
alter table public.tenancy_pins enable row level security;

revoke all on public.tenancy_snapshots, public.caution_obligations, public.caution_deductions,
              public.caution_deduction_answers, public.caution_dispute_rulings, public.caution_returns,
              public.caution_return_contests, public.caution_return_rulings, public.tenancy_pins
  from public, anon, authenticated;
grant select on public.tenancy_snapshots, public.caution_obligations, public.caution_deductions,
               public.caution_deduction_answers, public.caution_dispute_rulings, public.caution_returns,
               public.caution_return_contests, public.caution_return_rulings, public.tenancy_pins
  to authenticated;
grant insert on public.tenancy_pins to authenticated;
grant select, insert on public.tenancy_snapshots, public.caution_obligations, public.caution_deductions,
               public.caution_deduction_answers, public.caution_dispute_rulings, public.caution_returns,
               public.caution_return_contests, public.caution_return_rulings, public.tenancy_pins
  to service_role;

drop policy if exists tenancy_snapshots_read on public.tenancy_snapshots;
create policy tenancy_snapshots_read on public.tenancy_snapshots for select to authenticated
  using (private.tenancy_party(rent_payment_id) or private.is_staff());
drop policy if exists caution_obligations_read on public.caution_obligations;
create policy caution_obligations_read on public.caution_obligations for select to authenticated
  using (tenant_id = (select auth.uid()) or lister_id = (select auth.uid()) or private.is_staff());
drop policy if exists caution_deductions_read on public.caution_deductions;
create policy caution_deductions_read on public.caution_deductions for select to authenticated
  using (exists (select 1 from public.caution_obligations o where o.id = obligation_id));
drop policy if exists caution_deduction_answers_read on public.caution_deduction_answers;
create policy caution_deduction_answers_read on public.caution_deduction_answers for select to authenticated
  using (exists (select 1 from public.caution_deductions d where d.id = deduction_id));
drop policy if exists caution_dispute_rulings_read on public.caution_dispute_rulings;
create policy caution_dispute_rulings_read on public.caution_dispute_rulings for select to authenticated
  using (exists (select 1 from public.caution_deductions d where d.id = deduction_id));
drop policy if exists caution_returns_read on public.caution_returns;
create policy caution_returns_read on public.caution_returns for select to authenticated
  using (exists (select 1 from public.caution_obligations o where o.id = obligation_id));
drop policy if exists caution_return_contests_read on public.caution_return_contests;
create policy caution_return_contests_read on public.caution_return_contests for select to authenticated
  using (exists (select 1 from public.caution_returns r where r.id = return_id));
drop policy if exists caution_return_rulings_read on public.caution_return_rulings;
create policy caution_return_rulings_read on public.caution_return_rulings for select to authenticated
  using (exists (select 1 from public.caution_returns r where r.id = return_id));
drop policy if exists tenancy_pins_read on public.tenancy_pins;
create policy tenancy_pins_read on public.tenancy_pins for select to authenticated
  using (private.tenancy_party(rent_payment_id) or private.is_staff());
drop policy if exists tenancy_pins_insert on public.tenancy_pins;
create policy tenancy_pins_insert on public.tenancy_pins for insert to authenticated
  with check (
    pinned_by = (select auth.uid())
    and private.tenancy_party(rent_payment_id)
    and exists (select 1 from public.messages m
                  join public.conversations c on c.id = m.conversation_id
                  join public.rent_payments rp on rp.id = tenancy_pins.rent_payment_id
                 where m.id = tenancy_pins.message_id
                   and c.listing_id = rp.listing_id and c.guest_id = rp.tenant_id and c.agent_id = rp.lister_id));

do $$
declare t text;
begin
  foreach t in array array['tenancy_snapshots','caution_obligations','caution_deductions','caution_deduction_answers',
                           'caution_dispute_rulings','caution_returns','caution_return_contests',
                           'caution_return_rulings','tenancy_pins'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_frozen', t);
    execute format('create trigger %I before update on public.%I for each row execute function private.tenancy_record_is_frozen()', t || '_frozen', t);
  end loop;
end $$;

/* ------------------------------------------------------------ where a caution stands */
-- One reading, used by every door, the reminders, the record and the file.
--   returned   returns that count: not contested, or ruled received
--   in_doubt   lister_sent returns contested and not yet ruled
--   deducted   accepted lines, plus what staff allowed on disputed lines
--   proposed   lines not yet answered
--   disputed   disputed lines not yet ruled
--   guaranteed what the Vallo Guarantee approved or paid on this caution
--   outstanding  amount - returned - deducted - guaranteed (never below 0)
--   claimable    outstanding less everything still in question
--                (proposed, disputed, in doubt, an open claim): the part a
--                Guarantee claim may ask for
create or replace function private.caution_position(p_obligation uuid)
returns table (amount_minor bigint, returned_minor bigint, in_doubt_minor bigint, deducted_minor bigint,
               proposed_minor bigint, disputed_minor bigint, guaranteed_minor bigint, claim_open_minor bigint,
               outstanding_minor bigint, claimable_minor bigint)
language sql
stable
security definer
set search_path to ''
as $function$
  with o as (select * from public.caution_obligations where id = p_obligation),
  r as (
    select
      coalesce(sum(cr.amount_minor) filter (
        where not exists (select 1 from public.caution_return_contests c where c.return_id = cr.id)
           or exists (select 1 from public.caution_return_rulings x where x.return_id = cr.id and x.outcome = 'received')), 0) as returned,
      coalesce(sum(cr.amount_minor) filter (
        where exists (select 1 from public.caution_return_contests c where c.return_id = cr.id)
          and not exists (select 1 from public.caution_return_rulings x where x.return_id = cr.id)), 0) as in_doubt
      from public.caution_returns cr where cr.obligation_id = p_obligation),
  d as (
    select
      coalesce(sum(case when a.answer = 'accepted' then cd.amount_minor
                        when a.answer = 'disputed' and ru.deduction_id is not null then ru.allowed_minor
                        else 0 end), 0) as deducted,
      coalesce(sum(cd.amount_minor) filter (where a.deduction_id is null), 0) as proposed,
      coalesce(sum(cd.amount_minor) filter (where a.answer = 'disputed' and ru.deduction_id is null), 0) as disputed
      from public.caution_deductions cd
      left join public.caution_deduction_answers a on a.deduction_id = cd.id
      left join public.caution_dispute_rulings ru on ru.deduction_id = cd.id
     where cd.obligation_id = p_obligation),
  g as (
    select coalesce(sum(gc.approved_minor) filter (where gc.status in ('approved', 'paid')), 0) as guaranteed,
           coalesce(sum(gc.requested_minor) filter (where gc.status = 'submitted'), 0) as claim_open
      from public.guarantee_claims gc where gc.caution_obligation_id = p_obligation)
  select o.amount_minor, r.returned, r.in_doubt, d.deducted, d.proposed, d.disputed, g.guaranteed, g.claim_open,
         greatest(o.amount_minor - r.returned - d.deducted - g.guaranteed, 0),
         greatest(o.amount_minor - r.returned - d.deducted - g.guaranteed - d.proposed - d.disputed - r.in_doubt - g.claim_open, 0)
    from o, r, d, g;
$function$;
revoke all on function private.caution_position(uuid) from public, anon, authenticated;

/* ------------------------------------------------------------ opened when fully paid */
create or replace function private.open_tenancy_records(p_booking uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp   public.rent_payments%rowtype;
  lst  public.listings%rowtype;
  ends date;
begin
  select * into rp from public.rent_payments where booking_id = p_booking;
  if rp.id is null or not private.tenancy_paid(rp.id) then
    return;
  end if;
  select * into lst from public.listings where id = rp.listing_id;
  if lst.id is not null then
    insert into public.tenancy_snapshots (rent_payment_id, listing, amenities)
    values (rp.id,
      jsonb_build_object(
        'title', lst.title, 'description', lst.description,
        'property_type', lst.property_type, 'area', lst.area, 'city', lst.city,
        'state_code', lst.state_code, 'bedrooms', lst.bedrooms, 'bathrooms', lst.bathrooms,
        'toilets', lst.toilets, 'size_sqm', lst.size_sqm, 'furnished', lst.furnished,
        'condition', lst.condition, 'power_grid', lst.power_grid, 'power_backup', lst.power_backup,
        'power_backup_hours', lst.power_backup_hours, 'water_supply', lst.water_supply,
        'prepaid_meter', lst.prepaid_meter, 'has_estate_access', lst.has_estate_access,
        'parking_spaces', lst.parking_spaces, 'minimum_tenancy_months', lst.minimum_tenancy_months,
        'reference', lst.reference, 'listing_role', lst.listing_role,
        'mandate_verified_at', lst.mandate_verified_at),
      coalesce((select array_agg(a.code order by a.code)
                  from public.listing_amenities la join public.amenities a on a.id = la.amenity_id
                 where la.listing_id = lst.id), '{}'))
    on conflict (rent_payment_id) do nothing;
  end if;
  if coalesce(rp.caution_minor, 0) > 0 then
    ends := private.tenancy_end(rp.move_in, rp.rent_period);
    insert into public.caution_obligations (rent_payment_id, tenant_id, lister_id, amount_minor, tenancy_end, due_on)
    values (rp.id, rp.tenant_id, rp.lister_id, rp.caution_minor, ends, ends + private.caution_return_days())
    on conflict (rent_payment_id) do nothing;
  end if;
end;
$function$;
revoke all on function private.open_tenancy_records(uuid) from public, anon, authenticated;

create or replace function private.open_tenancy_records_on_payment()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if new.booking_id is null or new.status <> 'SUCCESSFUL' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'SUCCESSFUL' then
    return new;
  end if;
  -- INSIDE THE SETTLEMENT TRANSACTION: NEVER RAISE.
  begin
    perform private.open_tenancy_records(new.booking_id);
  exception when others then
    begin
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('medium', 'open', 'Tenancy records were not opened at payment',
              format('Booking %s settled but its tenancy snapshot or caution register was not written: %s', new.booking_id, sqlerrm),
              'booking', new.booking_id::text);
    exception when others then
      null;
    end;
  end;
  return new;
end;
$function$;
revoke all on function private.open_tenancy_records_on_payment() from public, anon, authenticated;
drop trigger if exists transactions_open_tenancy_records on public.transactions;
create trigger transactions_open_tenancy_records
  after insert or update of status on public.transactions
  for each row execute function private.open_tenancy_records_on_payment();

-- Charges already fully paid (none live).
do $$
declare b uuid;
begin
  for b in select rp.booking_id from public.rent_payments rp where private.tenancy_paid(rp.id) loop
    perform private.open_tenancy_records(b);
  end loop;
end $$;

/* ------------------------------------------------------------ the lister proposes a deduction */
create or replace function public.propose_caution_deduction(
  p_obligation uuid, p_item text, p_amount bigint, p_photo uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  o      public.caution_obligations%rowtype;
  pos    record;
  new_id uuid;
begin
  select * into o from public.caution_obligations where id = p_obligation for update;
  if o.id is null or o.lister_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if private.tenancy_void(o.rent_payment_id) then
    return jsonb_build_object('status', 'void');
  end if;
  if o.tenancy_end > (now() at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'not_ended');
  end if;
  if p_item is null or p_item not in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall') then
    return jsonb_build_object('status', 'bad_item');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if p_photo is null or not exists (
    select 1 from public.tenancy_report_photos ph join public.tenancy_reports r on r.id = ph.report_id
     where ph.id = p_photo and r.rent_payment_id = o.rent_payment_id and r.stage = 'move_out'
       and r.author_id = o.lister_id and r.submitted_at is not null
       and (r.submitted_at at time zone 'Africa/Lagos')::date >= o.tenancy_end) then
    return jsonb_build_object('status', 'needs_move_out_photo');
  end if;
  select * into pos from private.caution_position(o.id);
  -- Every line not yet disputed counts against what is left, so the record
  -- can never be taken past 100 percent.
  if pos.returned_minor + pos.in_doubt_minor + pos.deducted_minor + pos.proposed_minor
     + pos.guaranteed_minor + pos.claim_open_minor + p_amount > o.amount_minor then
    return jsonb_build_object('status', 'exceeds_caution');
  end if;
  insert into public.caution_deductions (obligation_id, item, amount_minor, photo_id, note, proposed_by)
  values (o.id, p_item, p_amount, p_photo, nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid()))
  returning id into new_id;
  perform private.tenancy_tell(o.tenant_id, 'A deduction was proposed from your caution',
                               'Accept or dispute it in your tenancy file. A disputed line goes to Vallo staff.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok', 'deduction_id', new_id);
end;
$function$;

/* ------------------------------------------------------------ the tenant answers, once */
create or replace function public.answer_caution_deduction(p_deduction uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  o public.caution_obligations%rowtype;
begin
  select o2.* into o from public.caution_deductions d join public.caution_obligations o2 on o2.id = d.obligation_id
   where d.id = p_deduction;
  if o.id is null or o.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_answer not in ('accepted', 'disputed') then
    return jsonb_build_object('status', 'bad_answer');
  end if;
  perform 1 from public.caution_obligations where id = o.id for update;
  insert into public.caution_deduction_answers (deduction_id, answer, answered_by)
  values (p_deduction, p_answer, (select auth.uid()))
  on conflict (deduction_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_answered');
  end if;
  perform private.tenancy_tell(o.lister_id,
    case when p_answer = 'accepted' then 'A caution deduction was accepted'
         else 'A caution deduction was disputed and has gone to Vallo staff' end,
    'See the answer in the tenancy file.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* ------------------------------------------------------------ staff rule on a dispute */
create or replace function public.admin_rule_caution_dispute(p_deduction uuid, p_allowed_minor bigint, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor  uuid := auth.uid();
  d      public.caution_deductions%rowtype;
  o      public.caution_obligations%rowtype;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.staff_can(actor, 'guarantee') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into d from public.caution_deductions where id = p_deduction;
  if d.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into o from public.caution_obligations where id = d.obligation_id for update;
  if actor in (o.tenant_id, o.lister_id) then
    return jsonb_build_object('status', 'own_tenancy');
  end if;
  if not exists (select 1 from public.caution_deduction_answers a where a.deduction_id = d.id and a.answer = 'disputed') then
    return jsonb_build_object('status', 'not_disputed');
  end if;
  if reason is null or length(reason) < 10 then
    return jsonb_build_object('status', 'reason_required');
  end if;
  if p_allowed_minor is null or p_allowed_minor < 0 or p_allowed_minor > d.amount_minor then
    return jsonb_build_object('status', 'bad_amount', 'max_minor', d.amount_minor);
  end if;
  insert into public.caution_dispute_rulings (deduction_id, allowed_minor, reason, decided_by)
  values (d.id, p_allowed_minor, reason, actor)
  on conflict (deduction_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_ruled');
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'caution.dispute_ruled', 'caution_deduction', d.id::text,
          jsonb_build_object('allowed_minor', p_allowed_minor, 'line_minor', d.amount_minor, 'reason', reason));
  perform private.tenancy_tell(o.tenant_id, 'Vallo ruled on a disputed caution deduction', 'Read the ruling in your tenancy file.', o.rent_payment_id);
  perform private.tenancy_tell(o.lister_id, 'Vallo ruled on a disputed caution deduction', 'Read the ruling in the tenancy file.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* ------------------------------------------------------------ a return is recorded */
-- The lister records that they paid it back, or the tenant confirms they
-- received it. No money moves through Vallo. p_key is minted when the form is
-- drawn, so a double tap records once.
create or replace function public.record_caution_return(
  p_obligation uuid, p_amount bigint, p_returned_on date, p_method text, p_reference text, p_key uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  caller uuid := (select auth.uid());
  o      public.caution_obligations%rowtype;
  pos    record;
  as_who text;
  new_id uuid;
begin
  select * into o from public.caution_obligations where id = p_obligation for update;
  if o.id is null or caller is null or caller not in (o.tenant_id, o.lister_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if private.tenancy_void(o.rent_payment_id) then
    return jsonb_build_object('status', 'void');
  end if;
  if p_key is null or p_amount is null or p_amount <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if exists (select 1 from public.caution_returns r where r.idempotency_key = p_key) then
    return jsonb_build_object('status', 'already_recorded');
  end if;
  if p_returned_on is null or p_returned_on > (now() at time zone 'Africa/Lagos')::date
     or p_returned_on < (o.opened_at at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'bad_date');
  end if;
  if p_method not in ('bank_transfer', 'cash', 'other') then
    return jsonb_build_object('status', 'bad_method');
  end if;
  select * into pos from private.caution_position(o.id);
  if pos.returned_minor + pos.in_doubt_minor + pos.deducted_minor + pos.proposed_minor
     + pos.guaranteed_minor + p_amount > o.amount_minor then
    return jsonb_build_object('status', 'exceeds_caution');
  end if;
  as_who := case when caller = o.lister_id then 'lister_sent' else 'tenant_received' end;
  insert into public.caution_returns (obligation_id, amount_minor, returned_on, method, reference, recorded_by, recorded_as, idempotency_key)
  values (o.id, p_amount, p_returned_on, p_method, nullif(btrim(coalesce(p_reference, '')), ''), caller, as_who, p_key)
  returning id into new_id;
  if as_who = 'lister_sent' then
    perform private.tenancy_tell(o.tenant_id, 'Your landlord recorded a caution return',
      'Check it reached you. If it did not, say so in your tenancy file and Vallo staff will look.', o.rent_payment_id);
  else
    perform private.tenancy_tell(o.lister_id, 'Your tenant confirmed a caution return', 'It is on the record in the tenancy file.', o.rent_payment_id);
  end if;
  return jsonb_build_object('status', 'ok', 'return_id', new_id, 'recorded_as', as_who);
end;
$function$;

/* The tenant says a return the lister recorded never arrived. */
create or replace function public.contest_caution_return(p_return uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  r public.caution_returns%rowtype;
  o public.caution_obligations%rowtype;
begin
  select * into r from public.caution_returns where id = p_return;
  select * into o from public.caution_obligations where id = r.obligation_id;
  if r.id is null or o.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.recorded_as <> 'lister_sent' then
    return jsonb_build_object('status', 'own_record');
  end if;
  if coalesce(length(btrim(p_note)), 0) < 5 then
    return jsonb_build_object('status', 'note_required');
  end if;
  insert into public.caution_return_contests (return_id, contested_by, note)
  values (r.id, (select auth.uid()), left(btrim(p_note), 1000))
  on conflict (return_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_contested');
  end if;
  perform private.tenancy_tell(o.lister_id, 'Your tenant says a caution return did not arrive',
    'Vallo staff will look at it. Add your transfer receipt to the thread.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok');
end;
$function$;

create or replace function public.admin_rule_caution_return(p_return uuid, p_outcome text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor  uuid := auth.uid();
  r      public.caution_returns%rowtype;
  o      public.caution_obligations%rowtype;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.staff_can(actor, 'guarantee') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into r from public.caution_returns where id = p_return;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into o from public.caution_obligations where id = r.obligation_id for update;
  if actor in (o.tenant_id, o.lister_id) then
    return jsonb_build_object('status', 'own_tenancy');
  end if;
  if not exists (select 1 from public.caution_return_contests c where c.return_id = r.id) then
    return jsonb_build_object('status', 'not_contested');
  end if;
  if p_outcome not in ('received', 'not_received') then
    return jsonb_build_object('status', 'bad_outcome');
  end if;
  if reason is null or length(reason) < 10 then
    return jsonb_build_object('status', 'reason_required');
  end if;
  insert into public.caution_return_rulings (return_id, outcome, reason, decided_by)
  values (r.id, p_outcome, reason, actor)
  on conflict (return_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_ruled');
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'caution.return_ruled', 'caution_return', r.id::text,
          jsonb_build_object('outcome', p_outcome, 'amount_minor', r.amount_minor, 'reason', reason));
  perform private.tenancy_tell(o.tenant_id, 'Vallo ruled on a caution return', 'Read the ruling in your tenancy file.', o.rent_payment_id);
  perform private.tenancy_tell(o.lister_id, 'Vallo ruled on a caution return', 'Read the ruling in the tenancy file.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* ------------------------------------------------------------ past due: the Vallo Guarantee */
create or replace function private.caution_escalate(p_obligation uuid, p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  o   public.caution_obligations%rowtype;
  rp  public.rent_payments%rowtype;
  ag  public.deal_agreements%rowtype;
  pos record;
  c   public.guarantee_claims%rowtype;
begin
  select * into o from public.caution_obligations where id = p_obligation for update;
  if o.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if private.tenancy_void(o.rent_payment_id) then
    return jsonb_build_object('status', 'void');
  end if;
  if o.due_on >= (now() at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'not_due', 'due_on', o.due_on);
  end if;
  if exists (select 1 from public.guarantee_claims g where g.caution_obligation_id = o.id and g.status = 'submitted') then
    return jsonb_build_object('status', 'already_open');
  end if;
  select * into pos from private.caution_position(o.id);
  if pos.claimable_minor <= 0 then
    return jsonb_build_object('status', 'nothing_claimable', 'outstanding_minor', pos.outstanding_minor);
  end if;
  select * into rp from public.rent_payments where id = o.rent_payment_id;
  select * into ag from public.deal_agreements where inspection_id = rp.inspection_id;
  if ag.id is null or ag.status <> 'paid' or ag.booking_id is null then
    return jsonb_build_object('status', 'no_paid_agreement');
  end if;
  insert into public.guarantee_claims (agreement_id, booking_id, claimant_id, items, description, evidence_paths,
                                       requested_minor, caution_obligation_id)
  values (ag.id, ag.booking_id, o.tenant_id, '{}',
          format('Caution deposit not returned. %s kobo was paid to the lister at move-in and was due back by %s; %s kobo is still owed and not in dispute.',
                 o.amount_minor, to_char(o.due_on, 'FMDD Month YYYY'), pos.claimable_minor),
          '{}', pos.claimable_minor, o.id)
  returning * into c;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor, 'guarantee_claim.filed', 'guarantee_claim', c.id::text,
          jsonb_build_object('source', 'caution', 'obligation_id', o.id, 'requested_minor', pos.claimable_minor,
                             'automatic', p_actor is null));
  perform private.tenancy_tell(o.tenant_id, 'Your caution is with the Vallo Guarantee',
    'It was not returned by the due date. Vallo staff will review the claim and tell you the outcome.', o.rent_payment_id);
  perform private.tenancy_tell(o.lister_id, 'An unreturned caution went to the Vallo Guarantee',
    'The caution was due back and has not been recorded as returned. Record the return in the tenancy file if you have paid it.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok', 'claim_id', c.id, 'requested_minor', pos.claimable_minor);
end;
$function$;
revoke all on function private.caution_escalate(uuid, uuid) from public, anon, authenticated;

create or replace function public.escalate_caution_to_guarantee(p_obligation uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  o public.caution_obligations%rowtype;
begin
  select * into o from public.caution_obligations where id = p_obligation;
  if o.id is null or o.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  return private.caution_escalate(o.id, (select auth.uid()));
end;
$function$;

/* ------------------------------------------------------------ the staff desk */
create or replace function public.admin_caution_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
begin
  if not private.staff_can(actor, 'guarantee') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  return jsonb_build_object(
    'status', 'ok',
    'disputes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'deduction_id', d.id, 'obligation_id', o.id, 'rent_payment_id', o.rent_payment_id,
               'item', d.item, 'amount_minor', d.amount_minor, 'note', d.note,
               'caution_minor', o.amount_minor, 'disputed_at', a.answered_at,
               'photo_path', ph.storage_path, 'tenant_id', o.tenant_id, 'lister_id', o.lister_id)
             order by a.answered_at)
        from public.caution_deductions d
        join public.caution_deduction_answers a on a.deduction_id = d.id and a.answer = 'disputed'
        join public.caution_obligations o on o.id = d.obligation_id
        left join public.tenancy_report_photos ph on ph.id = d.photo_id
       where not exists (select 1 from public.caution_dispute_rulings r where r.deduction_id = d.id)), '[]'::jsonb),
    'contested_returns', coalesce((
      select jsonb_agg(jsonb_build_object(
               'return_id', r.id, 'obligation_id', o.id, 'rent_payment_id', o.rent_payment_id,
               'amount_minor', r.amount_minor, 'returned_on', r.returned_on, 'method', r.method,
               'reference', r.reference, 'contest_note', c.note, 'contested_at', c.contested_at)
             order by c.contested_at)
        from public.caution_returns r
        join public.caution_return_contests c on c.return_id = r.id
        join public.caution_obligations o on o.id = r.obligation_id
       where not exists (select 1 from public.caution_return_rulings x where x.return_id = r.id)), '[]'::jsonb));
end;
$function$;

/* ------------------------------------------------------------ the lister's record */
create or replace function public.lister_caution_record(p_lister uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  with per as (
    select o.id, o.amount_minor, o.due_on, p.returned_minor, p.deducted_minor, p.guaranteed_minor, p.outstanding_minor,
           (select max(r.returned_on) from public.caution_returns r where r.obligation_id = o.id) as last_return,
           exists (select 1 from public.guarantee_claims g where g.caution_obligation_id = o.id) as escalated
      from public.caution_obligations o
      join public.rent_payments rp on rp.id = o.rent_payment_id
      join public.listings l on l.id = rp.listing_id
      cross join lateral private.caution_position(o.id) p
     where o.lister_id = p_lister and not l.is_demo and not private.tenancy_void(o.rent_payment_id)
  ), settled as (
    select * from per where outstanding_minor = 0
  )
  select case when (select count(*) from settled) >= 5 then jsonb_build_object(
           'settled', (select count(*) from settled),
           'on_time', (select count(*) from settled
                        where returned_minor > 0 and not escalated and last_return <= due_on),
           'overdue', (select count(*) from per
                        where outstanding_minor > 0 and due_on < (now() at time zone 'Africa/Lagos')::date),
           'escalated', (select count(*) from per where escalated),
           'average_deduction_bps', (select (sum(deducted_minor) * 10000 / nullif(sum(amount_minor), 0))::int from settled)
         ) end;
$function$;

revoke all on function public.propose_caution_deduction(uuid, text, bigint, uuid, text) from public, anon;
revoke all on function public.answer_caution_deduction(uuid, text) from public, anon;
revoke all on function public.admin_rule_caution_dispute(uuid, bigint, text) from public, anon;
revoke all on function public.record_caution_return(uuid, bigint, date, text, text, uuid) from public, anon;
revoke all on function public.contest_caution_return(uuid, text) from public, anon;
revoke all on function public.admin_rule_caution_return(uuid, text, text) from public, anon;
revoke all on function public.escalate_caution_to_guarantee(uuid) from public, anon;
revoke all on function public.admin_caution_desk() from public, anon;
revoke all on function public.lister_caution_record(uuid) from public, anon;
grant execute on function public.propose_caution_deduction(uuid, text, bigint, uuid, text) to authenticated;
grant execute on function public.answer_caution_deduction(uuid, text) to authenticated;
grant execute on function public.admin_rule_caution_dispute(uuid, bigint, text) to authenticated;
grant execute on function public.record_caution_return(uuid, bigint, date, text, text, uuid) to authenticated;
grant execute on function public.contest_caution_return(uuid, text) to authenticated;
grant execute on function public.admin_rule_caution_return(uuid, text, text) to authenticated;
grant execute on function public.escalate_caution_to_guarantee(uuid) to authenticated;
grant execute on function public.admin_caution_desk() to authenticated;
grant execute on function public.lister_caution_record(uuid) to authenticated;

/* ------------------------------------------------------------ retention */
create or replace function private.message_is_tenancy_evidence(p_message uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (select 1 from public.tenancy_pins pin join public.rent_payments rp on rp.id = pin.rent_payment_id
                  where pin.message_id = p_message
                    and private.tenancy_end(rp.move_in, rp.rent_period) + interval '6 years' > now());
$function$;
revoke all on function private.message_is_tenancy_evidence(uuid) from public, anon, authenticated;
comment on function private.message_is_tenancy_evidence(uuid) is
  'V-47. True while a message is pinned to a tenancy whose end plus six years is still ahead. Any message purge must skip such a message.';

/* ------------------------------------------------------------ reminders and escalation */
/* Daily: the lister at due minus 30 and minus 7, the tenant on the due date,
   and every caution past due with an undisputed part still owed goes to the
   Vallo Guarantee (the tenant is told; staff decide). */
create or replace function private.remind_caution_due()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  sent  int := 0;
  o     record;
  r     jsonb;
begin
  for o in
    select ob.*, p.outstanding_minor
      from public.caution_obligations ob
      cross join lateral private.caution_position(ob.id) p
     where ob.due_on in (today + 30, today + 7, today)
       and not private.tenancy_void(ob.rent_payment_id)
  loop
    if o.outstanding_minor <= 0 then
      continue;
    end if;
    if o.due_on = today then
      perform private.tenancy_tell(o.tenant_id, 'Your caution is due back today',
        'If it has reached you, confirm it in your tenancy file. If it has not by tomorrow, it goes to the Vallo Guarantee.',
        o.rent_payment_id);
    else
      perform private.tenancy_tell(o.lister_id, format('A caution is due back in %s days', o.due_on - today),
        'Pay it back to your tenant and record the return in the tenancy file, or propose itemised deductions from the move-out report.',
        o.rent_payment_id);
    end if;
    sent := sent + 1;
  end loop;
  for o in
    select ob.id from public.caution_obligations ob
     where ob.due_on < today
       and not exists (select 1 from public.guarantee_claims g where g.caution_obligation_id = ob.id and g.status = 'submitted')
     order by ob.due_on
     limit 200
  loop
    begin
      r := private.caution_escalate(o.id, null);
      if r ->> 'status' = 'ok' then
        sent := sent + 1;
      end if;
    exception when others then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('medium', 'open', 'An overdue caution could not be escalated',
              format('Caution %s: %s', o.id, sqlerrm), 'caution_obligation', o.id::text);
    end;
  end loop;
  return sent;
end;
$function$;
revoke all on function private.remind_caution_due() from public, anon, authenticated;

select cron.unschedule('vallo_remind_caution_due')
 where exists (select 1 from cron.job where jobname = 'vallo_remind_caution_due');
select cron.schedule('vallo_remind_caution_due', '15 7 * * *', 'select private.remind_caution_due();');

/* ------------------------------------------------------------------ read back */
do $$
declare t text;
begin
  foreach t in array array['tenancy_snapshots','caution_obligations','caution_deductions','caution_deduction_answers',
                           'caution_dispute_rulings','caution_returns','caution_return_contests',
                           'caution_return_rulings','tenancy_pins'] loop
    if not exists (select 1 from pg_class where oid = ('public.' || t)::regclass and relrowsecurity) then
      raise exception '% has no RLS', t;
    end if;
    if has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('authenticated', 'public.' || t, 'UPDATE, DELETE, TRUNCATE') then
      raise exception '% is open to the wrong role', t;
    end if;
  end loop;
  if has_table_privilege('authenticated', 'public.caution_returns', 'INSERT')
     or has_table_privilege('authenticated', 'public.caution_obligations', 'INSERT') then
    raise exception 'a register table is writable directly';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'return_caution') then
    raise exception 'the wallet-to-wallet return_caution exists';
  end if;
  if has_function_privilege('authenticated', 'private.caution_escalate(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.record_caution_return(uuid,bigint,date,text,text,uuid)', 'EXECUTE') then
    raise exception 'a caution door is open to the wrong role';
  end if;
  if not exists (select 1 from cron.job where jobname = 'vallo_remind_caution_due') then
    raise exception 'the caution job is not scheduled';
  end if;
end $$;
