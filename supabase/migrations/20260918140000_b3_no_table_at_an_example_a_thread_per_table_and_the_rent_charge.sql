-- B3 of the third-edition build: the demo-reservation hole closed, a thread
-- per reservation, and the rent charge that ends the inspection journey on
-- the platform.
--
-- Additive throughout. Nothing is dropped, no column loses a value, no policy
-- is revoked. Every block is written to replay: triggers are dropped by name
-- before they are created, columns and tables are `if not exists`, functions
-- are `create or replace`.
--
-- ONE. THE DEMO-RESERVATION HOLE (HANDOFF_05 B0 item 1). All 64 live listings
-- are examples, and `private.reservation_is_valid` refuses an example on the
-- business path (M7) but never looked at `listings.is_demo` on the listing
-- path, so `reserveTable` could write a reservations row against an example
-- restaurant. The refusal joins the same function every other commitment
-- table already runs, `public.refuse_transaction_on_demo_listing`, which reads
-- `listing_id` from the row as jsonb and so sits on reservations unchanged.
-- One function on five tables rather than a sixth copy of the rule. The other
-- direction is extended too: a listing with a reservation against it can no
-- longer be turned into an example.
--
-- TWO. A THREAD PER TABLE (B0 item 2). M10 gave conversations a reservation
-- context; nothing stamped the thread back on the reservation, so the
-- reservation face had nothing to open. `reservations.conversation_id` is
-- the back-pointer, nullable, ON DELETE SET NULL because the thread is the
-- courtesy and the reservation is the record. The guest and host update
-- policies already admit the write. M10's party check walked reservations
-- through listings only; a business reservation (M7) resolved no host and was
-- refused as "does not exist". The check now resolves the host through either
-- spine.
--
-- THREE. THE RENT CHARGE (RECOMMENDATIONS A1-001). A tenancy could be
-- inspected and accepted and then had to be paid for off the platform. The
-- payable record is a `bookings` row, deliberately: `transactions`,
-- `ledger_entries`, `private.pay_booking_from_wallet`, the Paystack webhook,
-- reconciliation and the agent's earnings all hang off a booking, and a
-- second money spine is the thing this platform has been burned by before.
-- `rent_payments` is the tenancy record beside it: which inspection, which
-- listing, the six move-in parts in kobo as the listing stated them, and the
-- booking that carries the money. One row per inspection. The booking is a
-- one-night row whose price is the move-in total, so every existing CHECK on
-- bookings holds in integer kobo with no division; `rent_payments` is what
-- says it is not a stay, and every reader in the product branches on that row
-- rather than on the night count. The 48-hour stale-hold sweep cancels a
-- PENDING booking nobody paid, which is the right thing for a charge too; the
-- charge can be reopened.
--
-- `private.open_rent_charge` is the only writer. It runs as SECURITY DEFINER
-- through a service-role door exactly like `pay_booking_from_wallet`: it
-- checks the inspection belongs to the caller, that the lister accepted it,
-- that the listing is a published rental with a move-in figure, and inserts
-- the booking and the tenancy record in one transaction. The demo trigger
-- still fires on the booking insert, so an example listing refuses here too.
--
-- The notifier `private.notify_booking_change` learns tenancy words: a rent
-- booking must never tell a tenant "Booking request sent" or a landlord "New
-- booking request: 18 Sep to 19 Sep". On INSERT the tenancy row does not
-- exist yet (foreign key order), so the writer sets a transaction-local
-- setting the notifier reads, the same device M5 uses for the inventory
-- writer. On UPDATE the row exists and is the test.
--
-- HOW THE LEAD PROBES THIS, inside one transaction that is rolled back, as
-- the test users the seeded login provides (never a real person):
--
--   begin;
--   -- 1. The hole. As a signed-in test guest (set the JWT claims the way the
--   --    M7 probe did), insert a reservation against any listing where
--   --    is_demo = true and a future reserved_for. Expect SQLSTATE 23514 and
--   --    the message beginning 'This listing is an example'.
--   -- 2. The other direction. As service role, pick a non-demo test listing,
--   --    insert a reservation against it, then `update listings set is_demo
--   --    = true where id = <it>`. Expect 23514 'has real bookings, reviews,
--   --    inspections or reservations'.
--   -- 3. The thread. As the test guest, insert a reservation against a
--   --    non-demo published restaurant listing owned by the test agent, then
--   --    insert into conversations (guest_id, agent_id, context_kind,
--   --    reservation_id) with the two parties. Expect a row. Update the
--   --    reservation's conversation_id to it as the guest: expect 1 row.
--   --    Read the reservation as a third test user: expect 0 rows.
--   --    Repeat the conversations insert with agent_id = the third user:
--   --    expect 23514 'belongs to the guest and the host'.
--   -- 4. The business spine. Insert a business reservation (business_id set,
--   --    listing_id null) as the guest against a published first-party
--   --    non-demo test restaurant with a service window covering the moment,
--   --    then the conversations row with agent_id = businesses.owner_id.
--   --    Expect a row (this failed before this migration).
--   -- 5. The rent charge. As service role: select
--   --    public.open_rent_charge(<tenant>, <inspection>, current_date + 7)
--   --    for a CONFIRMED inspection by the tenant on a published non-demo
--   --    rental test listing carrying rent_amount_minor. Expect
--   --    {"status":"ok", ...} with booking_id and rent_payment_id and
--   --    total_minor equal to coalesce(total_move_in_cost_minor, the sum of
--   --    the stated parts). Call it again: expect {"status":"exists"} with
--   --    the same ids. Read rent_payments as the tenant: 1 row. As the
--   --    lister: 1 row. As a third user: 0 rows. Read notifications for the
--   --    lister: expect 'Rent payment started', and NO 'New booking request'
--   --    row for that booking. Call it for an inspection in state REQUESTED:
--   --    expect {"status":"not_accepted"}. Call it for a demo listing's
--   --    inspection (there can be none, the trigger refuses inspections
--   --    against examples, so instead) call it for a shortlet listing with
--   --    no rent_amount_minor: expect {"status":"not_a_rental"}.
--   -- 6. Pay it: select public.pay_booking_from_wallet(<tenant>,
--   --    <booking_id>, 'rm-book-<uuid>') with a funded test wallet. Expect
--   --    {"status":"ok"} and then notifications 'Rent paid' for the tenant
--   --    and 'Rent received' for the lister, and no 'Booking confirmed'.
--   rollback;
--
-- Nothing in this file has been run against the live project by its author,
-- who has no database credentials. The lead applies and probes it.

/* --------------------------------------- one: no table at an example */

drop trigger if exists reservations_never_against_a_demo_listing on public.reservations;
create trigger reservations_never_against_a_demo_listing
  before insert or update of listing_id on public.reservations
  for each row execute function public.refuse_transaction_on_demo_listing();

comment on function public.refuse_transaction_on_demo_listing() is
  'Refuses any row that points a booking, inspection, review, reservation or '
  'rent charge at an example listing or an example accommodation. Reads the '
  'row as jsonb so it can guard a table carrying either column. Payment and '
  'escrow are covered transitively, because both hang off a booking.';

-- The other direction, extended: a listing with a table booked at it is not
-- turned into an example either.
create or replace function public.refuse_demo_flag_on_committed_listing()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.is_demo is not true or old.is_demo is true then
    return new;
  end if;

  if exists (select 1 from public.bookings b where b.listing_id = new.id)
     or exists (select 1 from public.reviews r where r.listing_id = new.id)
     or exists (select 1 from public.inspection_requests i where i.listing_id = new.id)
     or exists (select 1 from public.reservations rv where rv.listing_id = new.id)
  then
    raise exception
      'Listing % has real bookings, reviews, inspections or reservations against it and cannot be marked as an example.', new.id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

/* --------------------------------------------- two: a thread per table */

alter table public.reservations
  add column if not exists conversation_id uuid references public.conversations (id) on delete set null;

comment on column public.reservations.conversation_id is
  'The thread attached to this reservation (conversations.context_kind = reservation), stamped by reserveTable once the thread exists. Null until then; the thread is the courtesy, the reservation is the record.';

create index if not exists reservations_conversation_idx
  on public.reservations (conversation_id)
  where conversation_id is not null;

-- M10's party check, taught the business spine. The host of a listing
-- reservation is the listing's agent; the host of a business reservation is
-- the business owner. Everything else is the M10 body as its probe corrected
-- it: the shape check speaks first when the per-kind id is null.
create or replace function private.conversation_context_is_valid()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  guest uuid;
  host  uuid;
begin
  if tg_op = 'UPDATE' then
    if new.context_kind <> old.context_kind
       or new.reservation_id is distinct from old.reservation_id
       or new.booking_id is distinct from old.booking_id then
      raise exception 'the context of a thread does not change'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.context_kind = 'reservation' and new.reservation_id is not null then
    select r.guest_id, coalesce(a.user_id, b.owner_id)
      into guest, host
    from public.reservations r
    left join public.listings   l on l.id = r.listing_id
    left join public.agents     a on a.id = l.agent_id
    left join public.businesses b on b.id = r.business_id
    where r.id = new.reservation_id;
    if guest is null then
      raise exception 'reservation % does not exist', new.reservation_id
        using errcode = 'foreign_key_violation';
    end if;
    if host is null or new.guest_id <> guest or new.agent_id <> host then
      raise exception 'a reservation thread belongs to the guest and the host of that reservation'
        using errcode = 'check_violation';
    end if;
  elsif new.context_kind = 'booking' and new.booking_id is not null then
    select b.guest_id, a.user_id
      into guest, host
    from public.bookings b
    join public.listings l on l.id = b.listing_id
    join public.agents   a on a.id = l.agent_id
    where b.id = new.booking_id;
    if guest is null then
      raise exception 'booking % does not exist', new.booking_id
        using errcode = 'foreign_key_violation';
    end if;
    if new.guest_id <> guest or new.agent_id <> host then
      raise exception 'a booking thread belongs to the guest and the host of that booking'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$function$;

revoke execute on function private.conversation_context_is_valid() from public, anon, authenticated;

/* ------------------------------------------------ three: the rent charge */

create table if not exists public.rent_payments (
  id               uuid primary key default gen_random_uuid(),
  inspection_id    uuid not null references public.inspection_requests (id) on delete restrict,
  listing_id       uuid not null references public.listings (id) on delete restrict,
  tenant_id        uuid not null references auth.users (id) on delete restrict,
  -- The person who is paid: the listing's agent, as a user id, so the lister
  -- reads their own rows without a join through agents.
  lister_id        uuid not null references auth.users (id) on delete restrict,
  -- The booking that carries the money. One booking per charge, and a charge
  -- whose booking the sweep cancelled is reopened by pointing at a new one.
  booking_id       uuid not null references public.bookings (id) on delete restrict,
  move_in          date not null,
  rent_period      public.rent_period not null default 'year',
  -- The six parts exactly as the listing stated them at the moment the charge
  -- opened: null means the lister did not say, zero means they said none.
  rent_minor       bigint check (rent_minor is null or rent_minor >= 0),
  caution_minor    bigint check (caution_minor is null or caution_minor >= 0),
  service_minor    bigint check (service_minor is null or service_minor >= 0),
  agency_minor     bigint check (agency_minor is null or agency_minor >= 0),
  legal_minor      bigint check (legal_minor is null or legal_minor >= 0),
  agreement_minor  bigint check (agreement_minor is null or agreement_minor >= 0),
  -- The figure charged: the lister's stated total, or the sum of the parts.
  total_minor      bigint not null check (total_minor > 0),
  total_stated     boolean not null default false,
  currency         text not null default 'NGN' check (currency = 'NGN'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (inspection_id),
  unique (booking_id),
  constraint rent_payments_parties_differ_chk check (tenant_id <> lister_id)
);

comment on table public.rent_payments is
  'The tenancy charge behind an accepted inspection: the move-in parts in kobo as the listing stated them and the bookings row that carries the money through the existing wallet, card, webhook and ledger rails. One per inspection. Written only by private.open_rent_charge.';

create index if not exists rent_payments_tenant_idx on public.rent_payments (tenant_id, created_at desc);
create index if not exists rent_payments_lister_idx on public.rent_payments (lister_id, created_at desc);
create index if not exists rent_payments_listing_idx on public.rent_payments (listing_id);

drop trigger if exists rent_payments_set_updated_at on public.rent_payments;
create trigger rent_payments_set_updated_at
  before update on public.rent_payments
  for each row execute function public.set_updated_at();

-- Belt and braces: the booking insert already refuses an example listing, and
-- so does this row on its own.
drop trigger if exists rent_payments_never_against_a_demo_listing on public.rent_payments;
create trigger rent_payments_never_against_a_demo_listing
  before insert or update of listing_id on public.rent_payments
  for each row execute function public.refuse_transaction_on_demo_listing();

alter table public.rent_payments enable row level security;

drop policy if exists rent_payments_select_tenant on public.rent_payments;
create policy rent_payments_select_tenant
  on public.rent_payments for select to authenticated
  using (tenant_id = (select auth.uid()));

drop policy if exists rent_payments_select_lister on public.rent_payments;
create policy rent_payments_select_lister
  on public.rent_payments for select to authenticated
  using (lister_id = (select auth.uid()));

drop policy if exists rent_payments_admin_select on public.rent_payments;
create policy rent_payments_admin_select
  on public.rent_payments for select
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

-- No client write policy on purpose: the only writer is the function below.

/* ------------------------------------------------------- the one writer */

create or replace function private.open_rent_charge(
  p_tenant     uuid,
  p_inspection uuid,
  p_move_in    date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  insp        public.inspection_requests%rowtype;
  lst         public.listings%rowtype;
  lister_user uuid;
  existing    public.rent_payments%rowtype;
  existing_bk public.bookings%rowtype;
  parts_sum   bigint;
  total       bigint;
  stated      boolean;
  v_booking   uuid;
  charge_id   uuid;
begin
  if p_tenant is null or p_inspection is null or p_move_in is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_move_in < current_date then
    return jsonb_build_object('status', 'move_in_past');
  end if;

  select * into insp from public.inspection_requests where id = p_inspection;
  if insp.id is null or insp.requester_id <> p_tenant then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- The lister has to have said yes. CONFIRMED is the acceptance; COMPLETED
  -- with any outcome but no_deal is an inspection that happened and did not
  -- end the conversation.
  if not (insp.state = 'CONFIRMED'
          or (insp.state = 'COMPLETED' and coalesce(insp.outcome, 'inspected') <> 'no_deal')) then
    return jsonb_build_object('status', 'not_accepted', 'state', insp.state);
  end if;

  select * into lst from public.listings where id = insp.listing_id;
  if lst.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if lst.status <> 'PUBLISHED' then
    return jsonb_build_object('status', 'not_published');
  end if;
  if lst.listing_intent <> 'rent' or lst.rent_amount_minor is null then
    return jsonb_build_object('status', 'not_a_rental');
  end if;

  select a.user_id into lister_user from public.agents a where a.id = lst.agent_id;
  if lister_user is null then
    return jsonb_build_object('status', 'no_lister');
  end if;
  if lister_user = p_tenant then
    return jsonb_build_object('status', 'own_listing');
  end if;

  -- The same arithmetic as lib/listings/pricing.ts moveInTotal: the stated
  -- total when there is one, else the sum of the parts the lister named.
  parts_sum := coalesce(lst.rent_amount_minor, 0)
             + coalesce(lst.caution_deposit_minor, 0)
             + coalesce(lst.service_charge_minor, 0)
             + coalesce(lst.agency_fee_minor, 0)
             + coalesce(lst.legal_fee_minor, 0)
             + coalesce(lst.agreement_fee_minor, 0);
  if lst.total_move_in_cost_minor is not null then
    total  := lst.total_move_in_cost_minor;
    stated := true;
  else
    total  := parts_sum;
    stated := false;
  end if;
  if total <= 0 then
    return jsonb_build_object('status', 'no_amount');
  end if;

  -- One charge per inspection. An open or paid one is handed back; only a
  -- charge whose booking was cancelled unpaid is reopened.
  select * into existing from public.rent_payments where inspection_id = p_inspection;
  if existing.id is not null then
    select * into existing_bk from public.bookings where id = existing.booking_id;
    if existing_bk.status <> 'CANCELLED'
       or exists (select 1 from public.transactions t where t.booking_id = existing_bk.id and t.status = 'SUCCESSFUL') then
      return jsonb_build_object(
        'status', 'exists',
        'rent_payment_id', existing.id,
        'booking_id', existing.booking_id,
        'total_minor', existing.total_minor
      );
    end if;
  end if;

  -- Tell the notifier this booking is a tenancy charge. Transaction-local, so
  -- it cannot leak into any other statement.
  perform set_config('vallo.rent_charge', 'true', true);

  insert into public.bookings (
    listing_id, guest_id, check_in, check_out, nights, adults, children,
    price_per_night_minor, cleaning_fee_minor, service_fee_minor,
    subtotal_minor, total_minor, currency, status
  ) values (
    lst.id, p_tenant, p_move_in, p_move_in + 1, 1, 1, 0,
    total, 0, 0, total, total, 'NGN', 'PENDING'
  )
  returning id into v_booking;

  perform set_config('vallo.rent_charge', '', true);

  if existing.id is not null then
    update public.rent_payments
       set booking_id = v_booking, move_in = p_move_in,
           rent_minor = lst.rent_amount_minor, caution_minor = lst.caution_deposit_minor,
           service_minor = lst.service_charge_minor, agency_minor = lst.agency_fee_minor,
           legal_minor = lst.legal_fee_minor, agreement_minor = lst.agreement_fee_minor,
           total_minor = total, total_stated = stated,
           rent_period = coalesce(lst.rent_period, 'year')
     where id = existing.id;
    charge_id := existing.id;
  else
    insert into public.rent_payments (
      inspection_id, listing_id, tenant_id, lister_id, booking_id, move_in, rent_period,
      rent_minor, caution_minor, service_minor, agency_minor, legal_minor, agreement_minor,
      total_minor, total_stated
    ) values (
      insp.id, lst.id, p_tenant, lister_user, v_booking, p_move_in, coalesce(lst.rent_period, 'year'),
      lst.rent_amount_minor, lst.caution_deposit_minor, lst.service_charge_minor,
      lst.agency_fee_minor, lst.legal_fee_minor, lst.agreement_fee_minor,
      total, stated
    )
    returning id into charge_id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'rent_payment_id', charge_id,
    'booking_id', v_booking,
    'total_minor', total
  );
end;
$$;

comment on function private.open_rent_charge(uuid, uuid, date) is
  'Opens the tenancy charge for an accepted inspection: one PENDING bookings row priced at the move-in total plus the rent_payments record, in one transaction. Idempotent per inspection; reopens only a charge whose booking was cancelled unpaid.';

revoke execute on function private.open_rent_charge(uuid, uuid, date) from public, anon, authenticated;

-- The service-role door, exactly as pay_booking_from_wallet has one.
create or replace function public.open_rent_charge(
  p_tenant     uuid,
  p_inspection uuid,
  p_move_in    date
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.open_rent_charge(p_tenant, p_inspection, p_move_in);
$$;

comment on function public.open_rent_charge(uuid, uuid, date) is
  'Service-role door to private.open_rent_charge.';

revoke execute on function public.open_rent_charge(uuid, uuid, date) from public, anon, authenticated;
grant  execute on function public.open_rent_charge(uuid, uuid, date) to service_role;

/* --------------------------------------- the notifier learns tenancy words */

create or replace function private.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  host_user     uuid;
  listing_title text;
  tenancy       boolean;
  tenant_name   text;
  charge        public.rent_payments%rowtype;
begin
  select a.user_id, l.title into host_user, listing_title
  from public.listings l
  join public.agents   a on a.id = l.agent_id
  where l.id = new.listing_id;

  -- A tenancy charge, not a stay. On INSERT the rent_payments row is not
  -- written yet, so the writer says so through a transaction-local setting;
  -- afterwards the row itself is the evidence.
  tenancy := coalesce(current_setting('vallo.rent_charge', true), '') = 'true'
             or exists (select 1 from public.rent_payments rp where rp.booking_id = new.id);

  if tenancy then
    select * into charge from public.rent_payments rp where rp.booking_id = new.id;
    tenant_name := coalesce(
      (select p.display_name from public.profiles p where p.id = new.guest_id),
      'The tenant'
    );
    if tg_op = 'INSERT' then
      perform private.notify(host_user, 'booking', 'Rent payment started',
        tenant_name || ' is paying the move-in total for ' || coalesce(listing_title, 'your listing') || ' on Vallo.',
        '/agent/earnings');
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'CONFIRMED' then
        perform private.notify(new.guest_id, 'booking', 'Rent paid',
          coalesce(listing_title, 'Your new home') || ': the move-in total is paid and recorded to the kobo.',
          case when charge.inspection_id is null then '/bookings' else '/rent/pay/' || charge.inspection_id end);
        perform private.notify(host_user, 'booking', 'Rent received',
          tenant_name || ' has paid the move-in total for ' || coalesce(listing_title, 'your listing') || '.',
          '/agent/earnings');
      elsif new.status = 'CANCELLED' then
        perform private.notify(new.guest_id, 'booking', 'Rent payment step closed',
          coalesce(listing_title, 'Your listing') || ': the payment step closed unpaid. Open it again from the inspection when you are ready.',
          case when charge.inspection_id is null then '/inspections' else '/rent/pay/' || charge.inspection_id end);
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform private.notify(host_user, 'booking', 'New booking request',
      coalesce(listing_title, 'A listing') || ': ' || to_char(new.check_in, 'DD Mon') || ' to ' || to_char(new.check_out, 'DD Mon') || '.',
      '/agent/bookings');
    perform private.notify(new.guest_id, 'booking', 'Booking request sent',
      'Your request for ' || coalesce(listing_title, 'this stay') || ' is with the host.',
      '/bookings');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      perform private.notify(new.guest_id, 'booking', 'Booking confirmed',
        coalesce(listing_title, 'Your stay') || ' is confirmed for ' || to_char(new.check_in, 'DD Mon') || '.',
        '/bookings');
    elsif new.status = 'CANCELLED' then
      perform private.notify(new.guest_id, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'Your stay') || ' has been cancelled.',
        '/bookings');
      perform private.notify(host_user, 'booking', 'Booking cancelled',
        coalesce(listing_title, 'A booking') || ' for ' || to_char(new.check_in, 'DD Mon') || ' was cancelled.',
        '/agent/bookings');
    elsif new.status = 'COMPLETED' then
      perform private.notify(new.guest_id, 'booking', 'Stay complete',
        coalesce(listing_title, 'Your stay') || ' is recorded as complete. Thank you for staying.',
        '/bookings');
    end if;
  end if;

  return new;
end;
$function$;
