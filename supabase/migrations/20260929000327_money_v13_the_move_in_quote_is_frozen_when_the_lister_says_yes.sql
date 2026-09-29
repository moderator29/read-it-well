-- MONEY 1 / V-13: THE MOVE-IN QUOTE IS FROZEN WHEN THE LISTER SAYS YES.
--
-- Supersedes the unapplied 20260924140000_v13 (moved to
-- supabase/migrations/superseded/). Rebuilt for split settlement: nothing in
-- this file holds, credits or moves money. It fixes the FIGURE a split charge
-- is opened at.
--
-- 1. `public.move_in_quotes`: one row per inspection, written only by the
--    trigger on the lister's move to CONFIRMED, never by a person, never
--    edited, never deleted except by the cascade from its inspection.
-- 2. THE AGREEMENT READS THE QUOTE. Payment opens only on an approved
--    `deal_agreements` row (Track A.2), and a rent agreement's terms are drawn
--    from the listing by `private.rent_terms`. A fee raised on the listing
--    between the yes and the agreement would otherwise reach the tenant. A
--    BEFORE trigger on `deal_agreements` (kind 'rent', on insert and on every
--    new terms version) overwrites the six money parts, the total and
--    `amount_minor` with the frozen quote and stamps `quoted_at`. The two
--    agreement doors (`agreement_open_rent_as`, `agreement_amend_as`) are
--    untouched, so any later door inherits the rule.
-- 3. THE CHARGE READS THE QUOTE. `private.open_rent_charge` is the LIVE body
--    (pg_get_functiondef, 28 September 2026) plus the one quote branch. The
--    live semantics are kept exactly: move_in_past, not_accepted, own_listing,
--    exists, SUP-09 already_let under the listing lock, ESC-03 date_taken.
--    `rent_payments_00_needs_approved_agreement` then compares the charge to
--    the agreement, and both came from the same quote.
-- 4. A GUARD THAT OUTLIVES A REPLACEMENT: `rent_payments_honour_the_quote`
--    refuses (VQ013) a charge whose parts differ from the quote, on insert
--    and on an update that touches a money column only, so it never fires
--    inside a settlement (settlement writes transactions, ledger_entries and
--    deal_agreements, never rent_payments' parts).
--
-- Every function is revoked from the API roles; the table is read under RLS
-- by the two parties and admins only.

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
  'V-13. The move-in figure frozen at the moment the lister moved the inspection to CONFIRMED. Written only by the transition trigger. The rent agreement and the split charge both read it in preference to the listing, so a fee raised after the yes never reaches the tenant.';

create index if not exists move_in_quotes_listing_idx on public.move_in_quotes (listing_id);
create index if not exists move_in_quotes_tenant_idx on public.move_in_quotes (tenant_id);
create index if not exists move_in_quotes_lister_idx on public.move_in_quotes (lister_id);

alter table public.move_in_quotes enable row level security;
revoke all on public.move_in_quotes from public, anon, authenticated;
grant select on public.move_in_quotes to authenticated;
grant select, insert, delete on public.move_in_quotes to service_role;

drop policy if exists move_in_quotes_select_party on public.move_in_quotes;
create policy move_in_quotes_select_party on public.move_in_quotes for select to authenticated
  using (tenant_id = (select auth.uid()) or lister_id = (select auth.uid()));
drop policy if exists move_in_quotes_select_staff on public.move_in_quotes;
create policy move_in_quotes_select_staff on public.move_in_quotes for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

create or replace function private.move_in_quotes_are_frozen()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if tg_op = 'DELETE'
     and not exists (select 1 from public.inspection_requests r where r.id = old.inspection_id) then
    return old;
  end if;
  raise exception 'public.move_in_quotes is frozen: a quote is never edited or deleted' using errcode = '42501';
end;
$function$;
revoke all on function private.move_in_quotes_are_frozen() from public, anon, authenticated;
drop trigger if exists move_in_quotes_frozen on public.move_in_quotes;
create trigger move_in_quotes_frozen before update or delete on public.move_in_quotes
  for each row execute function private.move_in_quotes_are_frozen();

/* ------------------------------------------------------- the freeze, at the yes */
create or replace function private.freeze_move_in_quote()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  lst   public.listings%rowtype;
  total bigint;
begin
  if new.state <> 'CONFIRMED'::public.inspection_state then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.state = 'CONFIRMED'::public.inspection_state then
    return new;
  end if;
  select * into lst from public.listings where id = new.listing_id;
  if lst.id is null or lst.listing_intent is distinct from 'rent' or lst.rent_amount_minor is null then
    return new;
  end if;
  total := coalesce(lst.total_move_in_cost_minor,
                    coalesce(lst.rent_amount_minor, 0) + coalesce(lst.caution_deposit_minor, 0)
                    + coalesce(lst.service_charge_minor, 0) + coalesce(lst.agency_fee_minor, 0)
                    + coalesce(lst.legal_fee_minor, 0) + coalesce(lst.agreement_fee_minor, 0));
  if total is null or total <= 0 then
    return new;
  end if;
  -- A failed freeze never refuses the lister's yes: it is recorded as an
  -- alert, and the agreement then falls back to the listing's figure.
  begin
    insert into public.move_in_quotes (
      inspection_id, listing_id, tenant_id, lister_id, rent_period,
      rent_minor, caution_minor, service_minor, agency_minor, legal_minor, agreement_minor,
      total_minor, total_stated)
    values (
      new.id, lst.id, new.requester_id, new.lister_id, coalesce(lst.rent_period, 'year'),
      lst.rent_amount_minor, lst.caution_deposit_minor, lst.service_charge_minor,
      lst.agency_fee_minor, lst.legal_fee_minor, lst.agreement_fee_minor,
      total, lst.total_move_in_cost_minor is not null)
    on conflict (inspection_id) do nothing;
  exception when others then
    begin
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('medium', 'open', 'A move-in quote could not be frozen',
              format('Inspection %s was accepted but its quote was not written: %s', new.id, sqlerrm),
              'inspection_request', new.id::text);
    exception when others then
      null;
    end;
  end;
  return new;
end;
$function$;
revoke all on function private.freeze_move_in_quote() from public, anon, authenticated;
drop trigger if exists inspection_requests_freeze_quote on public.inspection_requests;
create trigger inspection_requests_freeze_quote
  after insert or update of state on public.inspection_requests
  for each row execute function private.freeze_move_in_quote();

-- Inspections already accepted: the listing's figure as it stands (none live).
insert into public.move_in_quotes (
  inspection_id, listing_id, tenant_id, lister_id, rent_period,
  rent_minor, caution_minor, service_minor, agency_minor, legal_minor, agreement_minor,
  total_minor, total_stated, quoted_at)
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

/* ------------------------------------------------- the agreement reads the quote */
create or replace function private.rent_agreement_honours_the_quote()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  q public.move_in_quotes%rowtype;
begin
  if new.kind <> 'rent' or new.inspection_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.terms_version = old.terms_version and new.terms = old.terms
     and new.amount_minor = old.amount_minor then
    return new;
  end if;
  select * into q from public.move_in_quotes where inspection_id = new.inspection_id;
  if q.inspection_id is null then
    return new;
  end if;
  new.terms := new.terms || jsonb_build_object(
    'rent_period', q.rent_period::text,
    'rent_minor', q.rent_minor,
    'caution_minor', q.caution_minor,
    'service_minor', q.service_minor,
    'agency_minor', q.agency_minor,
    'legal_minor', q.legal_minor,
    'agreement_fee_minor', q.agreement_minor,
    'total_minor', q.total_minor,
    'quoted_at', q.quoted_at);
  new.amount_minor := q.total_minor;
  return new;
end;
$function$;
revoke all on function private.rent_agreement_honours_the_quote() from public, anon, authenticated;
drop trigger if exists deal_agreements_00_honour_the_quote on public.deal_agreements;
create trigger deal_agreements_00_honour_the_quote
  before insert or update of terms, terms_version, amount_minor on public.deal_agreements
  for each row execute function private.rent_agreement_honours_the_quote();

/* ------------------------------------------------------ the charge reads the quote */
CREATE OR REPLACE FUNCTION private.open_rent_charge(p_tenant uuid, p_inspection uuid, p_move_in date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  q           public.move_in_quotes%rowtype;
begin
  if p_tenant is null or p_inspection is null or p_move_in is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_move_in < (now() at time zone 'Africa/Lagos')::date then
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
  -- stands now. Any later replacement of this function must carry this block.
  select * into q from public.move_in_quotes where inspection_id = p_inspection;
  if q.inspection_id is not null then
    lst.rent_amount_minor        := q.rent_minor;
    lst.caution_deposit_minor    := q.caution_minor;
    lst.service_charge_minor     := q.service_minor;
    lst.agency_fee_minor         := q.agency_minor;
    lst.legal_fee_minor          := q.legal_minor;
    lst.agreement_fee_minor      := q.agreement_minor;
    lst.rent_period              := q.rent_period;
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
  -- SUP-09. Once a move-in total on this home is paid, no other charge opens.
  perform 1 from public.listings where id = lst.id for update;
  if private.listing_is_let(lst.id, null) then
    return jsonb_build_object('status', 'already_let');
  end if;
  perform set_config('vallo.rent_charge', 'true', true);
  /* ESC-03. A stay held on the move-in date makes this insert collide with
     the calendar; say so rather than failing as "could not be opened". */
  begin
    insert into public.bookings (
      listing_id, guest_id, check_in, check_out, nights, adults, children,
      price_per_night_minor, cleaning_fee_minor, service_fee_minor,
      subtotal_minor, total_minor, currency, status
    ) values (
      lst.id, p_tenant, p_move_in, p_move_in + 1, 1, 1, 0,
      total, 0, 0, total, total, 'NGN', 'PENDING'
    )
    returning id into v_booking;
  exception when exclusion_violation then
    perform set_config('vallo.rent_charge', '', true);
    return jsonb_build_object('status', 'date_taken');
  end;
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

/* ------------------------------------------------------ the guard that outlives it */
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
  before insert or update of total_minor, rent_minor, caution_minor, service_minor,
                             agency_minor, legal_minor, agreement_minor
  on public.rent_payments
  for each row execute function private.rent_payments_honour_the_quote();

/* ------------------------------------------------------------------ read back */
do $$
declare def text;
begin
  if not exists (select 1 from pg_class where oid = 'public.move_in_quotes'::regclass and relrowsecurity) then
    raise exception 'move_in_quotes has no RLS';
  end if;
  if has_table_privilege('authenticated', 'public.move_in_quotes', 'INSERT, UPDATE, DELETE, TRUNCATE')
     or has_table_privilege('anon', 'public.move_in_quotes', 'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'move_in_quotes is writable or anon-readable';
  end if;
  def := pg_get_functiondef('private.open_rent_charge(uuid,uuid,date)'::regprocedure);
  if position('public.move_in_quotes' in def) = 0 or position('date_taken' in def) = 0
     or position('listing_is_let' in def) = 0 then
    raise exception 'open_rent_charge lost the quote branch or a live branch';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'deal_agreements_00_honour_the_quote')
     or not exists (select 1 from pg_trigger where tgname = 'inspection_requests_freeze_quote')
     or not exists (select 1 from pg_trigger where tgname = 'rent_payments_honour_the_quote') then
    raise exception 'a V-13 trigger is missing';
  end if;
  if has_function_privilege('authenticated', 'private.open_rent_charge(uuid,uuid,date)', 'EXECUTE') then
    raise exception 'open_rent_charge is callable by authenticated';
  end if;
end $$;
