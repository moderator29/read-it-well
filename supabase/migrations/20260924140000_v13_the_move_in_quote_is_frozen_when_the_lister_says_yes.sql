-- V-13: THE QUOTE IS BINDING. The move-in figure is frozen when the lister
-- accepts the inspection, not when the tenant first taps Pay.
--
-- WHY THE MOMENT MATTERS. `private.open_rent_charge` froze the six parts when
-- the tenant opened payment, which is typically AFTER the viewing, and the
-- window between the lister saying yes and the tenant opening payment is
-- exactly when a Lagos agent says "the landlord has increased it" at the
-- gate. A figure that can move in that window is not a quote, it is an
-- opening bid. So the figure is frozen at the one transition the lister
-- writes themselves: into CONFIRMED.
--
-- THE QUOTE IS ITS OWN ROW, NOT TWO COLUMNS ON THE INSPECTION. The entry
-- proposed `quoted_parts jsonb` and `quoted_at` on `inspection_requests`,
-- and both parties can UPDATE that table under RLS, so a column there is a
-- column the lister could rewrite. A separate table with no write grant to
-- anybody but this migration's trigger cannot be. It carries the same six
-- named parts `rent_payments` carries, by name, so the charge copies it
-- column for column and nothing has to parse a jsonb to find the rent.
--
-- ONE QUOTE PER INSPECTION, AND IT DOES NOT MOVE. A lister who edits the
-- listing's fees after saying yes changes the listing and not the quote. A
-- new quote that the tenant accepts is a later piece of work (it needs a
-- consent step in the thread); until it exists the quote the tenant was shown
-- is the quote they are charged, which is the direction a mistake should fall.
--
-- THE CHARGE READS THE QUOTE. `private.open_rent_charge` is replaced with the
-- same body plus one branch: when a quote exists for the inspection, the six
-- parts and the total come from the quote instead of the listing. Nothing
-- else in the function changes, and it is claimed in docs/FIX_SCOPE.md
-- because the audit session has its own pending changes to this function
-- (the Lagos date, the 23P01 answer, the tenancy kind). Whichever lands
-- second must carry the other's lines.
--
-- AND A GUARD THAT OUTLIVES A REPLACEMENT. If a later migration replaces the
-- function from an older body and drops the quote branch, a charge that
-- disagrees with the quote is refused by `rent_payments_honour_the_quote`
-- with SQLSTATE VQ013, rather than silently charging the listing's newer
-- figure. Fail closed: a tenant who cannot pay is a support ticket, a tenant
-- overcharged at the gate is the thing this product exists to stop.
--
-- NO SECURITY DEFINER FUNCTION HERE IS CALLABLE BY A PERSON. The trigger
-- functions are revoked from everybody; the read is RLS on the table.

create table if not exists public.move_in_quotes (
  inspection_id   uuid primary key references public.inspection_requests(id) on delete cascade,
  listing_id      uuid not null references public.listings(id) on delete cascade,
  tenant_id       uuid not null,
  lister_id       uuid not null,
  rent_period     public.rent_period not null default 'year',
  rent_minor      bigint check (rent_minor is null or rent_minor >= 0),
  caution_minor   bigint check (caution_minor is null or caution_minor >= 0),
  service_minor   bigint check (service_minor is null or service_minor >= 0),
  agency_minor    bigint check (agency_minor is null or agency_minor >= 0),
  legal_minor     bigint check (legal_minor is null or legal_minor >= 0),
  agreement_minor bigint check (agreement_minor is null or agreement_minor >= 0),
  total_minor     bigint not null check (total_minor > 0),
  total_stated    boolean not null,
  currency        text not null default 'NGN',
  quoted_at       timestamptz not null default now()
);

comment on table public.move_in_quotes is
  'V-13. The move-in figure frozen at the moment the lister moved the inspection to CONFIRMED. Written only by the transition trigger, never by a person. The rent charge reads it in preference to the listing, so a fee raised after the yes does not reach the tenant.';

create index if not exists move_in_quotes_listing_idx on public.move_in_quotes (listing_id);
create index if not exists move_in_quotes_tenant_idx on public.move_in_quotes (tenant_id);
create index if not exists move_in_quotes_lister_idx on public.move_in_quotes (lister_id);

alter table public.move_in_quotes enable row level security;

/* BORN LOCKED, then only a read for the two parties and staff. */
revoke all on public.move_in_quotes from public, anon, authenticated;
grant select on public.move_in_quotes to authenticated;
grant all on public.move_in_quotes to service_role;

drop policy if exists move_in_quotes_select_party on public.move_in_quotes;
create policy move_in_quotes_select_party
  on public.move_in_quotes for select
  using (tenant_id = (select auth.uid()) or lister_id = (select auth.uid()));

drop policy if exists move_in_quotes_select_staff on public.move_in_quotes;
create policy move_in_quotes_select_staff
  on public.move_in_quotes for select
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

/* ------------------------------------------------ append-only, like refunds */

create or replace function private.move_in_quotes_are_frozen()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  raise exception 'public.move_in_quotes is frozen: a quote is never edited or deleted'
    using errcode = '42501';
end;
$function$;

revoke all on function private.move_in_quotes_are_frozen() from public, anon, authenticated;

drop trigger if exists move_in_quotes_no_update on public.move_in_quotes;
create trigger move_in_quotes_no_update
  before update on public.move_in_quotes
  for each row execute function private.move_in_quotes_are_frozen();

-- DELETE is refused too, except by the cascade from the inspection itself,
-- which arrives with the inspection row already gone.
create or replace function private.move_in_quotes_no_orphan_delete()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if exists (select 1 from public.inspection_requests r where r.id = old.inspection_id) then
    raise exception 'public.move_in_quotes is frozen: a quote is never edited or deleted'
      using errcode = '42501';
  end if;
  return old;
end;
$function$;

revoke all on function private.move_in_quotes_no_orphan_delete() from public, anon, authenticated;

drop trigger if exists move_in_quotes_no_delete on public.move_in_quotes;
create trigger move_in_quotes_no_delete
  before delete on public.move_in_quotes
  for each row execute function private.move_in_quotes_no_orphan_delete();

/* ------------------------------------------------ the freeze, at the yes */

create or replace function private.freeze_move_in_quote()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  lst       public.listings%rowtype;
  parts_sum bigint;
  total     bigint;
  stated    boolean;
begin
  if new.state <> 'CONFIRMED'::public.inspection_state then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.state = 'CONFIRMED'::public.inspection_state then
    return new;
  end if;

  select * into lst from public.listings where id = new.listing_id;
  if lst.id is null or lst.listing_intent <> 'rent' or lst.rent_amount_minor is null then
    return new;
  end if;

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
  if total is null or total <= 0 then
    return new;
  end if;

  insert into public.move_in_quotes (
    inspection_id, listing_id, tenant_id, lister_id, rent_period,
    rent_minor, caution_minor, service_minor, agency_minor, legal_minor, agreement_minor,
    total_minor, total_stated
  ) values (
    new.id, lst.id, new.requester_id, new.lister_id, coalesce(lst.rent_period, 'year'),
    lst.rent_amount_minor, lst.caution_deposit_minor, lst.service_charge_minor,
    lst.agency_fee_minor, lst.legal_fee_minor, lst.agreement_fee_minor,
    total, stated
  )
  on conflict (inspection_id) do nothing;

  return new;
end;
$function$;

revoke all on function private.freeze_move_in_quote() from public, anon, authenticated;

drop trigger if exists inspection_requests_freeze_quote on public.inspection_requests;
create trigger inspection_requests_freeze_quote
  after insert or update of state on public.inspection_requests
  for each row execute function private.freeze_move_in_quote();

-- Inspections already accepted before this file get the listing's figure as
-- it stands now: the best available record of what was quoted, and on the
-- live database there are none.
insert into public.move_in_quotes (
  inspection_id, listing_id, tenant_id, lister_id, rent_period,
  rent_minor, caution_minor, service_minor, agency_minor, legal_minor, agreement_minor,
  total_minor, total_stated, quoted_at
)
select r.id, l.id, r.requester_id, r.lister_id, coalesce(l.rent_period, 'year'),
       l.rent_amount_minor, l.caution_deposit_minor, l.service_charge_minor,
       l.agency_fee_minor, l.legal_fee_minor, l.agreement_fee_minor,
       coalesce(l.total_move_in_cost_minor,
                coalesce(l.rent_amount_minor, 0) + coalesce(l.caution_deposit_minor, 0)
                + coalesce(l.service_charge_minor, 0) + coalesce(l.agency_fee_minor, 0)
                + coalesce(l.legal_fee_minor, 0) + coalesce(l.agreement_fee_minor, 0)),
       l.total_move_in_cost_minor is not null,
       coalesce(r.responded_at, r.updated_at)
  from public.inspection_requests r
  join public.listings l on l.id = r.listing_id
 where r.state in ('CONFIRMED', 'COMPLETED')
   and coalesce(r.outcome, 'inspected') <> 'no_deal'
   and l.listing_intent = 'rent'
   and l.rent_amount_minor is not null
   and coalesce(l.total_move_in_cost_minor,
                coalesce(l.rent_amount_minor, 0) + coalesce(l.caution_deposit_minor, 0)
                + coalesce(l.service_charge_minor, 0) + coalesce(l.agency_fee_minor, 0)
                + coalesce(l.legal_fee_minor, 0) + coalesce(l.agreement_fee_minor, 0)) > 0
on conflict (inspection_id) do nothing;

/* ------------------------------------------------ the charge reads the quote */

create or replace function private.open_rent_charge(p_tenant uuid, p_inspection uuid, p_move_in date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  insp        public.inspection_requests%rowtype;
  lst         public.listings%rowtype;
  q           public.move_in_quotes%rowtype;
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

  -- V-13: the quote frozen at the lister's yes wins over the listing as it
  -- stands now. The parts are copied from whichever source is used, so the
  -- charge's parts always add up the way its total was quoted.
  select * into q from public.move_in_quotes where inspection_id = p_inspection;
  if q.inspection_id is not null then
    lst.rent_amount_minor     := q.rent_minor;
    lst.caution_deposit_minor := q.caution_minor;
    lst.service_charge_minor  := q.service_minor;
    lst.agency_fee_minor      := q.agency_minor;
    lst.legal_fee_minor       := q.legal_minor;
    lst.agreement_fee_minor   := q.agreement_minor;
    lst.rent_period           := q.rent_period;
    lst.total_move_in_cost_minor := case when q.total_stated then q.total_minor else null end;
  end if;

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
$function$;

/* ------------------------------------------------ the guard that outlives it */

create or replace function private.rent_payments_honour_the_quote()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  q public.move_in_quotes%rowtype;
begin
  select * into q from public.move_in_quotes where inspection_id = new.inspection_id;
  if q.inspection_id is null then
    return new;
  end if;
  if new.total_minor <> q.total_minor
     or new.rent_minor is distinct from q.rent_minor
     or new.caution_minor is distinct from q.caution_minor
     or new.service_minor is distinct from q.service_minor
     or new.agency_minor is distinct from q.agency_minor
     or new.legal_minor is distinct from q.legal_minor
     or new.agreement_minor is distinct from q.agreement_minor then
    raise exception 'this rent charge does not match the move-in quote frozen when the lister accepted the inspection'
      using errcode = 'VQ013';
  end if;
  return new;
end;
$function$;

revoke all on function private.rent_payments_honour_the_quote() from public, anon, authenticated;

drop trigger if exists rent_payments_honour_the_quote on public.rent_payments;
create trigger rent_payments_honour_the_quote
  before insert or update on public.rent_payments
  for each row execute function private.rent_payments_honour_the_quote();
