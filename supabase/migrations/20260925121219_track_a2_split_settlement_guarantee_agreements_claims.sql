-- TRACK A.2  MONEY SETTLES AT THE MOMENT OF PAYMENT. TRUST IS THE VALLO GUARANTEE.
--
-- Founder directive, 25 September 2026. Vallo never holds a customer's money.
-- This migration builds what replaces the held-payment design:
--
--  1. SPLIT AT PAYMENT. Every charge is initialised with a Paystack split that
--     names, before the card is touched, exactly where each kobo goes: the
--     lister's share to the lister's own Paystack subaccount (their bank), the
--     Guarantee contribution to a separate reserve subaccount (a separate
--     bank account, clearly labelled, never mixed with operating money), and
--     Vallo's commission to the main account. All three settle from the same
--     transaction. There is no later release decision because there is
--     nothing held. `transactions` records the split it was opened with, and
--     a charge cannot be opened without one (`transactions_00_payment_gate`).
--
--  2. THE VALLO GUARANTEE. `money_policy.guarantee_bps` (100 to 200 basis
--     points, 1 to 2 percent, default 150) of every charge goes to the
--     reserve. `guarantee_reserve_entries` is its own append-only ledger:
--     contributions come only from settled charges, payouts only from an
--     approved claim, and `private.guarantee_pay_out` takes the reserve lock
--     and refuses any payout larger than what the reserve holds or larger
--     than what was actually paid for that booking less what earlier claims on
--     it already took. It cannot pay out more than it holds.
--
--  3. THE INSPECTION GATE AND THE AGREEMENT. For a rental, an agreement can
--     only be drawn up from the renter's SUBMITTED inspection report (all eight
--     items ticked, photos taken at the property). For a stay, from the host's
--     acceptance. Both parties confirm the exact version of the terms, the
--     owner or agent confirms handover (through an approved, live mandate when
--     the listing carries one), and the agreement enters the admin queue.
--     Payment is not available until an admin approves. Approval and rejection
--     reach both parties by in-app notification and by email. Every step is a
--     row in `deal_agreement_events`.
--
--  4. CLAIMS. A claim may be raised only on a PAID agreement, only in the
--     claim window (from move-in or check-in to 72 hours after it,
--     `money_policy.claim_window_hours`), must cite inspection-report items or
--     new evidence, is capped at what was paid for that booking, and is never
--     paid automatically: an admin decides, and a payout is a reserve entry.
--     Scope at launch: rentals and stays. Sale listings cannot open an
--     agreement, so the Guarantee never covers a purchase.
--
-- Nothing in this file writes to, reads from or depends on the retired
-- wallet or escrow tables.

-- ------------------------------------------------------------ the policy
create table if not exists public.money_policy (
  id                  boolean primary key default true check (id),
  guarantee_bps       integer not null default 150 check (guarantee_bps between 100 and 200),
  claim_window_hours  integer not null default 72 check (claim_window_hours between 48 and 72),
  min_inspection_photos integer not null default 3 check (min_inspection_photos between 1 and 40),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id) on delete set null
);
insert into public.money_policy (id) values (true) on conflict (id) do nothing;
alter table public.money_policy enable row level security;
revoke all on public.money_policy from anon, authenticated;
grant select on public.money_policy to authenticated;
drop policy if exists money_policy_read on public.money_policy;
create policy money_policy_read on public.money_policy for select to authenticated using (true);

create or replace function private.current_fee_bps(p_kind public.fee_kind)
returns integer
language sql
stable security definer
set search_path to ''
as $function$
  select coalesce((select f.basis_points from public.fee_rates f
                    where f.kind = p_kind and f.effective_from <= now()
                    order by f.effective_from desc limit 1), 0);
$function$;

-- ---------------------------------------------- where the lister is paid
alter table public.payout_accounts
  add column if not exists paystack_subaccount_code text,
  add column if not exists subaccount_created_at timestamptz;
create unique index if not exists payout_accounts_subaccount_code_key
  on public.payout_accounts (paystack_subaccount_code) where paystack_subaccount_code is not null;

-- The subaccount a lister's share settles to: their default payout account's.
create or replace function private.payee_subaccount(p_user uuid)
returns text
language sql
stable security definer
set search_path to ''
as $function$
  select pa.paystack_subaccount_code
    from public.payout_accounts pa
    join public.agents a on a.id = pa.agent_id
   where a.user_id = p_user and pa.paystack_subaccount_code is not null
   order by pa.is_default desc, pa.created_at desc
   limit 1;
$function$;

-- -------------------------------------------- the split a charge carries
alter table public.transactions
  add column if not exists payee_user_id          uuid references auth.users (id) on delete restrict,
  add column if not exists payee_subaccount_code  text,
  add column if not exists reserve_subaccount_code text,
  add column if not exists lister_share_minor     bigint check (lister_share_minor >= 0),
  add column if not exists guarantee_minor        bigint check (guarantee_minor >= 0),
  add column if not exists commission_minor       bigint check (commission_minor >= 0),
  add column if not exists agreement_id           uuid;
alter table public.transactions drop constraint if exists transactions_split_adds_up;
alter table public.transactions add constraint transactions_split_adds_up check (
  lister_share_minor is null
  or lister_share_minor + guarantee_minor + commission_minor = amount_minor);

alter table public.ledger_entries
  add column if not exists guarantee_reserve_minor bigint not null default 0;
alter table public.ledger_entries drop constraint if exists ledger_balances_chk;
alter table public.ledger_entries add constraint ledger_balances_chk check (
  gross_minor = platform_fee_minor + agent_share_minor + processor_fee_minor + guarantee_reserve_minor);
alter table public.ledger_entries drop constraint if exists ledger_entries_sign_chk;
alter table public.ledger_entries add constraint ledger_entries_sign_chk check (
  (gross_minor >= 0 and platform_fee_minor >= 0 and agent_share_minor >= 0 and processor_fee_minor >= 0
   and net_settlement_minor >= 0 and guarantee_reserve_minor >= 0)
  or (gross_minor <= 0 and platform_fee_minor <= 0 and agent_share_minor <= 0 and processor_fee_minor <= 0
      and net_settlement_minor <= 0 and guarantee_reserve_minor <= 0));

-- A refund goes back to the card through the processor; these say where it is.
alter table public.booking_refunds
  add column if not exists processor_status text not null default 'not_needed'
    check (processor_status in ('not_needed', 'pending', 'submitted', 'failed')),
  add column if not exists processor_refund_id text;

-- -------------------------------------------------------- the agreement
do $$ begin
  create type public.agreement_status as enum
    ('awaiting_parties', 'in_review', 'approved', 'rejected', 'cancelled', 'paid');
exception when duplicate_object then null; end $$;

create table if not exists public.deal_agreements (
  id                        uuid primary key default gen_random_uuid(),
  kind                      text not null check (kind in ('rent', 'stay')),
  listing_id                uuid not null references public.listings (id) on delete restrict,
  inspection_id             uuid unique references public.inspection_requests (id) on delete restrict,
  booking_id                uuid unique references public.bookings (id) on delete restrict,
  renter_id                 uuid not null references auth.users (id) on delete restrict,
  owner_id                  uuid not null references auth.users (id) on delete restrict,
  amount_minor              bigint not null check (amount_minor > 0),
  terms                     jsonb not null,
  terms_version             integer not null default 1 check (terms_version >= 1),
  renter_confirmed_version  integer,
  renter_confirmed_at       timestamptz,
  owner_confirmed_version   integer,
  owner_confirmed_at        timestamptz,
  mandate_id                uuid references public.listing_mandates (id) on delete restrict,
  status                    public.agreement_status not null default 'awaiting_parties',
  submitted_at              timestamptz,
  decided_at                timestamptz,
  decided_by                uuid references auth.users (id) on delete set null,
  decision_reason           text check (decision_reason is null or length(decision_reason) between 1 and 1000),
  paid_at                   timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint deal_agreements_parties_differ check (renter_id <> owner_id),
  constraint deal_agreements_rent_has_inspection check (kind <> 'rent' or inspection_id is not null),
  constraint deal_agreements_stay_has_booking check (kind <> 'stay' or booking_id is not null),
  constraint deal_agreements_rejection_has_reason check (status <> 'rejected' or decision_reason is not null)
);
create index if not exists deal_agreements_status_idx on public.deal_agreements (status, submitted_at);
create index if not exists deal_agreements_renter_idx on public.deal_agreements (renter_id);
create index if not exists deal_agreements_owner_idx on public.deal_agreements (owner_id);
create index if not exists deal_agreements_listing_idx on public.deal_agreements (listing_id);
alter table public.transactions drop constraint if exists transactions_agreement_id_fkey;
alter table public.transactions add constraint transactions_agreement_id_fkey
  foreign key (agreement_id) references public.deal_agreements (id) on delete restrict;
create index if not exists transactions_agreement_idx on public.transactions (agreement_id);

alter table public.deal_agreements enable row level security;
revoke all on public.deal_agreements from anon, authenticated;
grant select on public.deal_agreements to authenticated;
drop policy if exists deal_agreements_party_read on public.deal_agreements;
create policy deal_agreements_party_read on public.deal_agreements for select to authenticated
  using ((select auth.uid()) in (renter_id, owner_id)
         or private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

create table if not exists public.deal_agreement_events (
  id            uuid primary key default gen_random_uuid(),
  agreement_id  uuid not null references public.deal_agreements (id) on delete restrict,
  actor_id      uuid references auth.users (id) on delete set null,
  action        text not null check (action in ('opened', 'amended', 'confirmed', 'submitted',
                                                'approved', 'rejected', 'cancelled', 'paid')),
  from_status   public.agreement_status,
  to_status     public.agreement_status not null,
  terms_version integer not null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists deal_agreement_events_agreement_idx on public.deal_agreement_events (agreement_id, created_at);
alter table public.deal_agreement_events enable row level security;
revoke all on public.deal_agreement_events from anon, authenticated;
grant select on public.deal_agreement_events to authenticated;
drop policy if exists deal_agreement_events_party_read on public.deal_agreement_events;
create policy deal_agreement_events_party_read on public.deal_agreement_events for select to authenticated
  using (exists (select 1 from public.deal_agreements a where a.id = agreement_id
                  and ((select auth.uid()) in (a.renter_id, a.owner_id)
                       or private.has_role((select auth.uid()), 'admin'::public.app_role)
                       or private.has_role((select auth.uid()), 'super_admin'::public.app_role))));

create or replace function private.history_is_fixed()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$function$;
drop trigger if exists deal_agreement_events_fixed on public.deal_agreement_events;
create trigger deal_agreement_events_fixed before update or delete on public.deal_agreement_events
  for each row execute function private.history_is_fixed();

-- Who may work the agreement queue. Admins and super admins today; staff
-- scopes (Track K) extend this one function.
create or replace function private.staff_can(p_user uuid, p_scope text)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_user is not null
     and (private.has_role(p_user, 'super_admin'::public.app_role)
          or private.has_role(p_user, 'admin'::public.app_role));
$function$;

create or replace function private.agreement_log(
  p_agreement public.deal_agreements, p_actor uuid, p_action text,
  p_from public.agreement_status, p_note text)
returns void
language sql
security definer
set search_path to ''
as $function$
  insert into public.deal_agreement_events (agreement_id, actor_id, action, from_status, to_status, terms_version, note)
  values (p_agreement.id, p_actor, p_action, p_from, p_agreement.status, p_agreement.terms_version, p_note);
$function$;

-- Both parties hear about a decision in the app and by email.
create or replace function private.agreement_tell_both(p_agreement public.deal_agreements, p_template text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  who uuid;
  title text;
  body text;
  href text := '/agreements/' || p_agreement.id::text;
  listing_title text;
begin
  select l.title into listing_title from public.listings l where l.id = p_agreement.listing_id;
  if p_template = 'agreement.approved' then
    title := 'Agreement approved: payment is open';
    body := coalesce(listing_title, 'Your agreement') || ' was approved by Vallo. Payment is now available in the app.';
  elsif p_template = 'agreement.rejected' then
    title := 'Agreement sent back';
    body := coalesce(listing_title, 'Your agreement') || ' was not approved: ' || coalesce(p_agreement.decision_reason, '')
            || ' You can change the terms and confirm again.';
  else
    title := 'Agreement waiting for you';
    body := coalesce(listing_title, 'An agreement') || ' has terms waiting for your confirmation.';
  end if;
  foreach who in array array[p_agreement.renter_id, p_agreement.owner_id] loop
    perform private.notify(who, 'booking', title, body, href);
    perform private.email_outbox_enqueue(
      who, p_template,
      p_template || ':' || p_agreement.id::text || ':' || p_agreement.terms_version::text || ':' || who::text,
      jsonb_build_object('agreement_id', p_agreement.id, 'listing_id', p_agreement.listing_id,
                         'kind', p_agreement.kind, 'amount_minor', p_agreement.amount_minor,
                         'reason', p_agreement.decision_reason,
                         'viewer', case when who = p_agreement.renter_id then 'renter' else 'owner' end));
  end loop;
end;
$function$;

-- The terms of a rental, built from the listing's own move-in figures and
-- never from anything a client sent.
create or replace function private.rent_terms(p_listing uuid, p_move_in date, p_handover date, p_notes text)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  lst public.listings%rowtype;
  total bigint;
begin
  select * into lst from public.listings where id = p_listing;
  total := coalesce(lst.total_move_in_cost_minor,
                    coalesce(lst.rent_amount_minor, 0) + coalesce(lst.caution_deposit_minor, 0)
                    + coalesce(lst.service_charge_minor, 0) + coalesce(lst.agency_fee_minor, 0)
                    + coalesce(lst.legal_fee_minor, 0) + coalesce(lst.agreement_fee_minor, 0));
  return jsonb_build_object(
    'move_in', p_move_in,
    'handover_on', coalesce(p_handover, p_move_in),
    'rent_period', coalesce(lst.rent_period::text, 'year'),
    'rent_minor', lst.rent_amount_minor,
    'caution_minor', lst.caution_deposit_minor,
    'service_minor', lst.service_charge_minor,
    'agency_minor', lst.agency_fee_minor,
    'legal_minor', lst.legal_fee_minor,
    'agreement_fee_minor', lst.agreement_fee_minor,
    'total_minor', total,
    'guarantee_bps', (select m.guarantee_bps from public.money_policy m),
    'commission_bps', private.current_fee_bps('commission'),
    'inspection_fee_minor', 0,
    'notes', nullif(btrim(coalesce(p_notes, '')), ''));
end;
$function$;

-- Opening a rental agreement: the inspection gate lives here.
create or replace function public.agreement_open_rent_as(
  p_actor uuid, p_inspection uuid, p_move_in date, p_handover date default null, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  insp public.inspection_requests%rowtype;
  lst public.listings%rowtype;
  lister uuid;
  rep public.inspection_reports%rowtype;
  ticked integer;
  photos integer;
  need_photos integer;
  terms jsonb;
  ag public.deal_agreements%rowtype;
begin
  if p_actor is null or p_inspection is null or p_move_in is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_move_in < (now() at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'move_in_past');
  end if;
  if p_notes is not null and length(p_notes) > 2000 then
    return jsonb_build_object('status', 'notes_too_long');
  end if;
  select * into insp from public.inspection_requests where id = p_inspection;
  if insp.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into lst from public.listings where id = insp.listing_id;
  select a.user_id into lister from public.agents a where a.id = lst.agent_id;
  if p_actor not in (insp.requester_id, coalesce(lister, insp.requester_id)) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if lst.listing_intent is distinct from 'rent' or lst.rent_amount_minor is null then
    return jsonb_build_object('status', 'not_a_rental');
  end if;
  if lister is null or lister = insp.requester_id then
    return jsonb_build_object('status', 'no_lister');
  end if;

  -- THE INSPECTION GATE. A real, evidenced inspection: the renter's report,
  -- submitted, all eight items ticked, and photos taken at the property.
  select * into rep from public.inspection_reports where inspection_id = insp.id;
  if rep.inspection_id is null or rep.submitted_at is null then
    return jsonb_build_object('status', 'inspection_not_submitted');
  end if;
  select count(*) filter (where i.checked) into ticked
    from public.inspection_report_items i where i.inspection_id = insp.id;
  if coalesce(ticked, 0) < 8 then
    return jsonb_build_object('status', 'inspection_incomplete', 'ticked', coalesce(ticked, 0));
  end if;
  select count(*) into photos from public.inspection_report_photos p where p.inspection_id = insp.id;
  select m.min_inspection_photos into need_photos from public.money_policy m;
  if photos < need_photos then
    return jsonb_build_object('status', 'inspection_needs_photos', 'photos', photos, 'needed', need_photos);
  end if;

  select * into ag from public.deal_agreements where inspection_id = insp.id;
  if ag.id is not null then
    return jsonb_build_object('status', 'exists', 'agreement_id', ag.id, 'agreement_status', ag.status);
  end if;

  terms := private.rent_terms(lst.id, p_move_in, p_handover, p_notes);
  if coalesce((terms ->> 'total_minor')::bigint, 0) <= 0 then
    return jsonb_build_object('status', 'no_amount');
  end if;

  insert into public.deal_agreements (kind, listing_id, inspection_id, renter_id, owner_id, amount_minor, terms)
  values ('rent', lst.id, insp.id, insp.requester_id, lister, (terms ->> 'total_minor')::bigint, terms)
  returning * into ag;
  perform private.agreement_log(ag, p_actor, 'opened', null, 'Drawn up from the submitted inspection report.');
  perform private.notify(case when p_actor = ag.renter_id then ag.owner_id else ag.renter_id end,
                         'booking', 'Agreement waiting for you',
                         coalesce(lst.title, 'A property') || ' has terms waiting for your confirmation.',
                         '/agreements/' || ag.id::text);
  return jsonb_build_object('status', 'ok', 'agreement_id', ag.id);
end;
$function$;

-- A stay's agreement is drawn up the moment the host accepts it.
create or replace function private.agreement_open_for_stay()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  lst public.listings%rowtype;
  host uuid;
  ag public.deal_agreements%rowtype;
begin
  if not (tg_op = 'UPDATE' and old.status = 'PENDING' and new.status = 'CONFIRMED') then
    return new;
  end if;
  if exists (select 1 from public.rent_payments rp where rp.booking_id = new.id)
     or exists (select 1 from public.deal_agreements a where a.booking_id = new.id) then
    return new;
  end if;
  select * into lst from public.listings where id = new.listing_id;
  select a.user_id into host from public.agents a where a.id = lst.agent_id;
  if host is null or host = new.guest_id then
    return new;
  end if;
  insert into public.deal_agreements (kind, listing_id, booking_id, renter_id, owner_id, amount_minor, terms)
  values ('stay', lst.id, new.id, new.guest_id, host, new.total_minor,
          jsonb_build_object('check_in', new.check_in, 'check_out', new.check_out, 'nights', new.nights,
                             'adults', new.adults, 'children', new.children,
                             'price_per_night_minor', new.price_per_night_minor,
                             'cleaning_fee_minor', new.cleaning_fee_minor,
                             'service_fee_minor', new.service_fee_minor,
                             'total_minor', new.total_minor,
                             'guarantee_bps', (select m.guarantee_bps from public.money_policy m),
                             'commission_bps', private.current_fee_bps('commission'),
                             'inspection_fee_minor', 0))
  returning * into ag;
  perform private.agreement_log(ag, null, 'opened', null, 'Drawn up when the host accepted the stay.');
  perform private.agreement_tell_both(ag, 'agreement.waiting');
  return new;
end;
$function$;
drop trigger if exists bookings_open_stay_agreement on public.bookings;
create trigger bookings_open_stay_agreement after update of status on public.bookings
  for each row execute function private.agreement_open_for_stay();

-- A party changes the terms: the version moves and every confirmation lapses.
create or replace function public.agreement_amend_as(
  p_actor uuid, p_agreement uuid, p_move_in date, p_handover date default null, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ag public.deal_agreements%rowtype;
  before_status public.agreement_status;
begin
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null or p_actor not in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if ag.status not in ('awaiting_parties', 'rejected') then
    return jsonb_build_object('status', 'locked', 'agreement_status', ag.status);
  end if;
  if ag.kind <> 'rent' then
    return jsonb_build_object('status', 'stay_terms_follow_the_booking');
  end if;
  if p_move_in is null or p_move_in < (now() at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'move_in_past');
  end if;
  if p_notes is not null and length(p_notes) > 2000 then
    return jsonb_build_object('status', 'notes_too_long');
  end if;
  before_status := ag.status;
  update public.deal_agreements
     set terms = private.rent_terms(ag.listing_id, p_move_in, p_handover, p_notes),
         amount_minor = (private.rent_terms(ag.listing_id, p_move_in, p_handover, p_notes) ->> 'total_minor')::bigint,
         terms_version = terms_version + 1,
         renter_confirmed_version = null, renter_confirmed_at = null,
         owner_confirmed_version = null, owner_confirmed_at = null, mandate_id = null,
         status = 'awaiting_parties', decided_at = null, decided_by = null, decision_reason = null,
         submitted_at = null, updated_at = now()
   where id = ag.id
  returning * into ag;
  perform private.agreement_log(ag, p_actor, 'amended', before_status, null);
  return jsonb_build_object('status', 'ok', 'terms_version', ag.terms_version);
end;
$function$;

-- A party confirms the exact version they read. The owner or agent's
-- confirmation is the handover confirmation and goes through the mandate.
create or replace function public.agreement_confirm_as(p_actor uuid, p_agreement uuid, p_version integer)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ag public.deal_agreements%rowtype;
  mandate uuid;
  has_mandates boolean;
  before_status public.agreement_status;
begin
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null or p_actor not in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if ag.status <> 'awaiting_parties' then
    return jsonb_build_object('status', 'locked', 'agreement_status', ag.status);
  end if;
  if p_version is distinct from ag.terms_version then
    return jsonb_build_object('status', 'terms_changed', 'terms_version', ag.terms_version);
  end if;
  if p_actor = ag.renter_id then
    update public.deal_agreements
       set renter_confirmed_version = ag.terms_version, renter_confirmed_at = now(), updated_at = now()
     where id = ag.id returning * into ag;
  else
    select exists (select 1 from public.listing_mandates m where m.listing_id = ag.listing_id) into has_mandates;
    if has_mandates then
      select m.id into mandate from public.listing_mandates m
       where m.listing_id = ag.listing_id
         and m.review_status = 'approved'
         and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
         and m.principal_consent_withdrawn_at is null
       order by m.reviewed_at desc nulls last limit 1;
      if mandate is null then
        return jsonb_build_object('status', 'mandate_not_live');
      end if;
    end if;
    update public.deal_agreements
       set owner_confirmed_version = ag.terms_version, owner_confirmed_at = now(),
           mandate_id = mandate, updated_at = now()
     where id = ag.id returning * into ag;
  end if;
  perform private.agreement_log(ag, p_actor, 'confirmed', ag.status, null);

  if ag.renter_confirmed_version = ag.terms_version and ag.owner_confirmed_version = ag.terms_version then
    before_status := ag.status;
    update public.deal_agreements set status = 'in_review', submitted_at = now(), updated_at = now()
     where id = ag.id returning * into ag;
    perform private.agreement_log(ag, null, 'submitted', before_status, 'Both parties confirmed. Waiting for Vallo review.');
  end if;
  return jsonb_build_object('status', 'ok', 'agreement_status', ag.status);
end;
$function$;

create or replace function public.agreement_cancel_as(p_actor uuid, p_agreement uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ag public.deal_agreements%rowtype;
  before_status public.agreement_status;
begin
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null or p_actor not in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if ag.status in ('paid', 'cancelled') then
    return jsonb_build_object('status', 'locked', 'agreement_status', ag.status);
  end if;
  if exists (select 1 from public.transactions t where t.agreement_id = ag.id and t.status = 'PENDING'
                and t.created_at > now() - interval '2 hours') then
    return jsonb_build_object('status', 'payment_in_flight');
  end if;
  before_status := ag.status;
  update public.deal_agreements set status = 'cancelled', updated_at = now() where id = ag.id returning * into ag;
  perform private.agreement_log(ag, p_actor, 'cancelled', before_status, nullif(btrim(coalesce(p_note, '')), ''));
  return jsonb_build_object('status', 'ok');
end;
$function$;

-- THE ADMIN GATE. Approve or reject, with a reason for a rejection. Called by
-- a signed-in staff member (auth.uid()), never by a client for somebody else.
create or replace function public.admin_decide_agreement(p_agreement uuid, p_decision text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  ag public.deal_agreements%rowtype;
  before_status public.agreement_status;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.staff_can(actor, 'agreements') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_decision not in ('approve', 'reject') then
    return jsonb_build_object('status', 'bad_decision');
  end if;
  if p_decision = 'reject' and (reason is null or length(reason) < 10) then
    return jsonb_build_object('status', 'reason_required');
  end if;
  if reason is not null and length(reason) > 1000 then
    return jsonb_build_object('status', 'reason_too_long');
  end if;
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if ag.status <> 'in_review' then
    return jsonb_build_object('status', 'not_in_review', 'agreement_status', ag.status);
  end if;
  if actor in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'own_agreement');
  end if;
  before_status := ag.status;
  update public.deal_agreements
     set status = case when p_decision = 'approve' then 'approved'::public.agreement_status
                       else 'rejected'::public.agreement_status end,
         decided_at = now(), decided_by = actor, decision_reason = reason, updated_at = now()
   where id = ag.id returning * into ag;
  perform private.agreement_log(ag, actor, case when p_decision = 'approve' then 'approved' else 'rejected' end,
                                before_status, reason);
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'agreement.' || p_decision, 'deal_agreement', ag.id::text,
          jsonb_build_object('reason', reason, 'terms_version', ag.terms_version,
                             'amount_minor', ag.amount_minor, 'kind', ag.kind));
  perform private.agreement_tell_both(ag, case when p_decision = 'approve' then 'agreement.approved'
                                               else 'agreement.rejected' end);
  return jsonb_build_object('status', 'ok', 'agreement_status', ag.status);
end;
$function$;

-- --------------------------------------------- the split, computed here
-- The only place the three shares are computed. The server asks for it when
-- it opens a checkout and stores it on the attempt; the client never sends a
-- share.
create or replace function public.payment_split_for_booking(p_booking uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  bk public.bookings%rowtype;
  ag public.deal_agreements%rowtype;
  g_bps integer;
  c_bps integer;
  guarantee bigint;
  commission bigint;
  sub text;
begin
  select * into bk from public.bookings where id = p_booking;
  if bk.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into ag from public.deal_agreements where booking_id = bk.id;
  if ag.id is null then
    return jsonb_build_object('status', 'no_agreement');
  end if;
  if ag.status <> 'approved' then
    return jsonb_build_object('status', 'agreement_not_approved', 'agreement_status', ag.status, 'agreement_id', ag.id);
  end if;
  if ag.amount_minor <> bk.total_minor then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;
  sub := private.payee_subaccount(ag.owner_id);
  if sub is null then
    return jsonb_build_object('status', 'payee_not_set_up', 'agreement_id', ag.id);
  end if;
  g_bps := coalesce((ag.terms ->> 'guarantee_bps')::integer, (select m.guarantee_bps from public.money_policy m));
  c_bps := coalesce((ag.terms ->> 'commission_bps')::integer, private.current_fee_bps('commission'));
  guarantee := (bk.total_minor * g_bps) / 10000;
  commission := (bk.total_minor * c_bps) / 10000;
  return jsonb_build_object(
    'status', 'ok', 'agreement_id', ag.id, 'amount_minor', bk.total_minor,
    'payee_user_id', ag.owner_id, 'payee_subaccount_code', sub,
    'guarantee_minor', guarantee, 'commission_minor', commission,
    'lister_share_minor', bk.total_minor - guarantee - commission,
    'guarantee_bps', g_bps, 'commission_bps', c_bps);
end;
$function$;

-- A charge attempt cannot exist without an approved agreement and a split.
-- The one exception is a charge the processor has ALREADY taken under a
-- reference we did not recognise: settlement records it so it can be
-- returned, and says so by setting vallo.recording_unknown_charge.
create or replace function private.transactions_payment_gate()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if coalesce(current_setting('vallo.recording_unknown_charge', true), '') = 'on' then
    return new;
  end if;
  if new.status <> 'PENDING' then
    raise exception 'payment_gate: a charge opens as PENDING' using errcode = '42501';
  end if;
  if new.lister_share_minor is null or new.payee_subaccount_code is null or new.reserve_subaccount_code is null
     or new.agreement_id is null then
    raise exception 'payment_gate: a charge needs its split and its agreement' using errcode = '42501';
  end if;
  if not exists (select 1 from public.deal_agreements a
                  where a.id = new.agreement_id and a.booking_id = new.booking_id
                    and a.status = 'approved' and a.amount_minor = new.amount_minor) then
    raise exception 'payment_gate: payment is not available until the agreement is approved' using errcode = '42501';
  end if;
  return new;
end;
$function$;
drop trigger if exists transactions_00_payment_gate on public.transactions;
create trigger transactions_00_payment_gate before insert on public.transactions
  for each row execute function private.transactions_payment_gate();

-- ------------------------------------------------- the Guarantee reserve
create table if not exists public.guarantee_claims (
  id               uuid primary key default gen_random_uuid(),
  agreement_id     uuid not null references public.deal_agreements (id) on delete restrict,
  booking_id       uuid not null references public.bookings (id) on delete restrict,
  claimant_id      uuid not null references auth.users (id) on delete restrict,
  items            text[] not null default '{}',
  description      text not null check (length(description) between 30 and 4000),
  evidence_paths   text[] not null default '{}',
  requested_minor  bigint not null check (requested_minor > 0),
  status           text not null default 'submitted'
                   check (status in ('submitted', 'approved', 'rejected', 'paid')),
  approved_minor   bigint check (approved_minor is null or approved_minor > 0),
  decided_by       uuid references auth.users (id) on delete set null,
  decided_at       timestamptz,
  decision_reason  text check (decision_reason is null or length(decision_reason) <= 1000),
  paid_reference   text,
  paid_at          timestamptz,
  paid_by          uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint guarantee_claims_items_known check (items <@ array['exterior', 'interior', 'kitchen', 'bathrooms',
                                                               'utilities', 'appliances', 'safety', 'overall']),
  constraint guarantee_claims_cites_something check (cardinality(items) > 0 or cardinality(evidence_paths) > 0),
  constraint guarantee_claims_approval_has_amount check (status not in ('approved', 'paid') or approved_minor is not null),
  constraint guarantee_claims_rejection_has_reason check (status <> 'rejected' or decision_reason is not null)
);
create index if not exists guarantee_claims_status_idx on public.guarantee_claims (status, created_at);
create index if not exists guarantee_claims_booking_idx on public.guarantee_claims (booking_id);
alter table public.guarantee_claims enable row level security;
revoke all on public.guarantee_claims from anon, authenticated;
grant select on public.guarantee_claims to authenticated;
drop policy if exists guarantee_claims_read on public.guarantee_claims;
create policy guarantee_claims_read on public.guarantee_claims for select to authenticated
  using (claimant_id = (select auth.uid())
         or exists (select 1 from public.deal_agreements a where a.id = agreement_id
                     and (select auth.uid()) in (a.renter_id, a.owner_id))
         or private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));

create table if not exists public.guarantee_reserve_entries (
  id              uuid primary key default gen_random_uuid(),
  direction       text not null check (direction in ('in', 'out')),
  kind            text not null check (kind in ('contribution', 'claim_payout')),
  amount_minor    bigint not null check (amount_minor > 0),
  booking_id      uuid references public.bookings (id) on delete restrict,
  transaction_id  uuid unique references public.transactions (id) on delete restrict,
  claim_id        uuid unique references public.guarantee_claims (id) on delete restrict,
  note            text,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint guarantee_reserve_contribution_shape check (
    (kind = 'contribution' and direction = 'in' and transaction_id is not null and claim_id is null)
    or (kind = 'claim_payout' and direction = 'out' and claim_id is not null and transaction_id is null))
);
create index if not exists guarantee_reserve_entries_booking_idx on public.guarantee_reserve_entries (booking_id);
alter table public.guarantee_reserve_entries enable row level security;
revoke all on public.guarantee_reserve_entries from anon, authenticated;
drop trigger if exists guarantee_reserve_entries_fixed on public.guarantee_reserve_entries;
create trigger guarantee_reserve_entries_fixed before update or delete on public.guarantee_reserve_entries
  for each row execute function private.history_is_fixed();

create or replace function private.guarantee_reserve_balance()
returns bigint
language sql
stable security definer
set search_path to ''
as $function$
  select coalesce(sum(case when direction = 'in' then amount_minor else -amount_minor end), 0)::bigint
    from public.guarantee_reserve_entries;
$function$;

-- Admin view of the reserve: what it holds and what came in and went out.
create or replace function public.admin_guarantee_reserve()
returns jsonb
language plpgsql
stable security definer
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
    'balance_minor', private.guarantee_reserve_balance(),
    'contributed_minor', (select coalesce(sum(amount_minor), 0) from public.guarantee_reserve_entries where direction = 'in'),
    'paid_out_minor', (select coalesce(sum(amount_minor), 0) from public.guarantee_reserve_entries where direction = 'out'),
    'guarantee_bps', (select m.guarantee_bps from public.money_policy m),
    'claim_window_hours', (select m.claim_window_hours from public.money_policy m),
    'recent', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc)
                          from (select * from public.guarantee_reserve_entries order by created_at desc limit 50) e),
                       '[]'::jsonb));
end;
$function$;

-- When the claim window is open for an agreement: from move-in or check-in
-- to claim_window_hours after it.
create or replace function private.claim_window(p_agreement public.deal_agreements)
returns tstzrange
language sql
stable security definer
set search_path to ''
as $function$
  select tstzrange(
           (coalesce((p_agreement.terms ->> 'move_in')::date, (p_agreement.terms ->> 'check_in')::date)::timestamp
             at time zone 'Africa/Lagos'),
           (coalesce((p_agreement.terms ->> 'move_in')::date, (p_agreement.terms ->> 'check_in')::date)::timestamp
             at time zone 'Africa/Lagos') + make_interval(hours => (select m.claim_window_hours from public.money_policy m)),
           '[)');
$function$;

create or replace function public.guarantee_claim_file_as(
  p_actor uuid, p_agreement uuid, p_items text[], p_description text, p_evidence_paths text[], p_requested_minor bigint)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ag public.deal_agreements%rowtype;
  paid bigint;
  claimed bigint;
  win tstzrange;
  c public.guarantee_claims%rowtype;
  path text;
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null or p_actor not in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if ag.status <> 'paid' or ag.booking_id is null then
    return jsonb_build_object('status', 'not_paid');
  end if;
  win := private.claim_window(ag);
  if not (now() <@ win) then
    return jsonb_build_object('status', 'outside_window', 'opens', lower(win), 'closes', upper(win));
  end if;
  if coalesce(length(btrim(p_description)), 0) < 30 then
    return jsonb_build_object('status', 'describe_more');
  end if;
  if coalesce(cardinality(p_items), 0) = 0 and coalesce(cardinality(p_evidence_paths), 0) = 0 then
    return jsonb_build_object('status', 'cite_something');
  end if;
  foreach path in array coalesce(p_evidence_paths, '{}') loop
    if split_part(path, '/', 1) <> p_actor::text then
      return jsonb_build_object('status', 'evidence_not_yours');
    end if;
  end loop;
  select coalesce(sum(t.amount_minor), 0) into paid
    from public.transactions t where t.booking_id = ag.booking_id and t.status = 'SUCCESSFUL';
  select coalesce(sum(coalesce(g.approved_minor, 0)), 0) into claimed
    from public.guarantee_claims g where g.booking_id = ag.booking_id and g.status in ('approved', 'paid');
  if p_requested_minor is null or p_requested_minor <= 0 or p_requested_minor > paid - claimed then
    return jsonb_build_object('status', 'over_cap', 'cap_minor', greatest(paid - claimed, 0));
  end if;
  if exists (select 1 from public.guarantee_claims g where g.agreement_id = ag.id
               and g.claimant_id = p_actor and g.status = 'submitted') then
    return jsonb_build_object('status', 'already_open');
  end if;
  insert into public.guarantee_claims (agreement_id, booking_id, claimant_id, items, description, evidence_paths, requested_minor)
  values (ag.id, ag.booking_id, p_actor, coalesce(p_items, '{}'), btrim(p_description), coalesce(p_evidence_paths, '{}'),
          p_requested_minor)
  returning * into c;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor, 'guarantee_claim.filed', 'guarantee_claim', c.id::text,
          jsonb_build_object('agreement_id', ag.id, 'requested_minor', p_requested_minor, 'items', p_items));
  return jsonb_build_object('status', 'ok', 'claim_id', c.id);
end;
$function$;

-- THE PAYOUT. Never automatic. The reserve lock serialises every payout, and
-- the three caps are read under it: what the claim asked for, what was paid
-- for this booking less earlier claims on it, and what the reserve holds.
create or replace function public.admin_decide_guarantee_claim(
  p_claim uuid, p_decision text, p_amount_minor bigint default null, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  c public.guarantee_claims%rowtype;
  ag public.deal_agreements%rowtype;
  paid bigint;
  claimed bigint;
  balance bigint;
  cap bigint;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.staff_can(actor, 'guarantee') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_decision not in ('approve', 'reject') then
    return jsonb_build_object('status', 'bad_decision');
  end if;
  if p_decision = 'reject' and (reason is null or length(reason) < 10) then
    return jsonb_build_object('status', 'reason_required');
  end if;
  perform pg_advisory_xact_lock(hashtext('vallo.guarantee_reserve'));
  select * into c from public.guarantee_claims where id = p_claim for update;
  if c.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if c.status <> 'submitted' then
    return jsonb_build_object('status', 'already_decided', 'claim_status', c.status);
  end if;
  select * into ag from public.deal_agreements where id = c.agreement_id;
  if actor in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'own_claim');
  end if;
  if p_decision = 'reject' then
    update public.guarantee_claims set status = 'rejected', decided_by = actor, decided_at = now(),
           decision_reason = reason where id = c.id;
  else
    select coalesce(sum(t.amount_minor), 0) into paid
      from public.transactions t where t.booking_id = c.booking_id and t.status = 'SUCCESSFUL';
    select coalesce(sum(g.approved_minor), 0) into claimed
      from public.guarantee_claims g where g.booking_id = c.booking_id and g.status in ('approved', 'paid');
    balance := private.guarantee_reserve_balance();
    cap := least(c.requested_minor, paid - claimed, balance);
    if p_amount_minor is null or p_amount_minor <= 0 then
      return jsonb_build_object('status', 'bad_amount');
    end if;
    if p_amount_minor > cap then
      return jsonb_build_object('status', 'over_cap', 'cap_minor', greatest(cap, 0),
                                'requested_minor', c.requested_minor, 'booking_left_minor', paid - claimed,
                                'reserve_minor', balance);
    end if;
    update public.guarantee_claims set status = 'approved', approved_minor = p_amount_minor, decided_by = actor,
           decided_at = now(), decision_reason = reason where id = c.id;
    insert into public.guarantee_reserve_entries (direction, kind, amount_minor, booking_id, claim_id, note, created_by)
    values ('out', 'claim_payout', p_amount_minor, c.booking_id, c.id, reason, actor);
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'guarantee_claim.' || p_decision, 'guarantee_claim', c.id::text,
          jsonb_build_object('amount_minor', p_amount_minor, 'reason', reason));
  perform private.notify(c.claimant_id, 'booking',
    case when p_decision = 'approve' then 'Guarantee claim approved' else 'Guarantee claim not approved' end,
    case when p_decision = 'approve'
         then 'Vallo approved ' || 'NGN ' || to_char(p_amount_minor::numeric / 100, 'FM999,999,999,990.00')
              || ' from the Vallo Guarantee. It will be paid to your bank account and you will be told when it is sent.'
         else 'Vallo did not approve this claim: ' || reason end,
    '/agreements/' || c.agreement_id::text);
  perform private.email_outbox_enqueue(c.claimant_id, 'guarantee.claim_decided',
    'guarantee.claim_decided:' || c.id::text,
    jsonb_build_object('claim_id', c.id, 'agreement_id', c.agreement_id, 'decision', p_decision,
                       'amount_minor', p_amount_minor, 'reason', reason));
  return jsonb_build_object('status', 'ok');
end;
$function$;

create or replace function public.admin_mark_guarantee_claim_paid(p_claim uuid, p_bank_reference text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  c public.guarantee_claims%rowtype;
begin
  if not private.staff_can(actor, 'guarantee') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if coalesce(length(btrim(p_bank_reference)), 0) < 4 then
    return jsonb_build_object('status', 'reference_required');
  end if;
  select * into c from public.guarantee_claims where id = p_claim for update;
  if c.id is null or c.status <> 'approved' then
    return jsonb_build_object('status', 'not_approved');
  end if;
  update public.guarantee_claims set status = 'paid', paid_reference = btrim(p_bank_reference),
         paid_at = now(), paid_by = actor where id = c.id;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'guarantee_claim.paid', 'guarantee_claim', c.id::text,
          jsonb_build_object('reference', btrim(p_bank_reference), 'amount_minor', c.approved_minor));
  perform private.notify(c.claimant_id, 'booking', 'Guarantee payment sent',
    'NGN ' || to_char(c.approved_minor::numeric / 100, 'FM999,999,999,990.00')
      || ' from the Vallo Guarantee was sent to your bank. Reference ' || btrim(p_bank_reference) || '.',
    '/agreements/' || c.agreement_id::text);
  return jsonb_build_object('status', 'ok');
end;
$function$;

-- Evidence for a claim lives in its own private bucket, in the claimant's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guarantee-evidence', 'guarantee-evidence', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;
drop policy if exists guarantee_evidence_insert_own on storage.objects;
create policy guarantee_evidence_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'guarantee-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists guarantee_evidence_read on storage.objects;
create policy guarantee_evidence_read on storage.objects for select to authenticated
  using (bucket_id = 'guarantee-evidence'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or private.has_role((select auth.uid()), 'admin'::public.app_role)
              or private.has_role((select auth.uid()), 'super_admin'::public.app_role)));

-- ----------------------------------------------- settlement, rewritten
-- The charge settled at the processor with its split. This records it: the
-- ledger row carries the four shares, the Guarantee contribution enters the
-- reserve, the agreement is paid and the booking confirmed. A charge that
-- cannot be applied is NOT kept by Vallo and is NOT credited anywhere: it is
-- marked for a full refund to the card, which the caller issues.
create or replace function private.settle_booking_charge(
  p_reference text, p_amount_minor bigint, p_processor_fee_minor bigint default null, p_fallback_booking uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  tx          public.transactions%rowtype;
  bk          public.bookings%rowtype;
  ag          public.deal_agreements%rowtype;
  gross       bigint;
  fee         bigint;
  reason      text;
  was_pending boolean;
  is_rent     boolean;
  lagos_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if p_reference is null or length(btrim(p_reference)) = 0 then
    return jsonb_build_object('outcome', 'bad_request');
  end if;

  select * into tx from public.transactions where provider_ref = p_reference;
  if tx.id is null then
    if p_fallback_booking is null
       or not exists (select 1 from public.bookings where id = p_fallback_booking) then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (p_fallback_booking, 'paystack', p_reference, greatest(0, coalesce(p_amount_minor, 0)), 'NGN', 'PENDING')
    on conflict (provider_ref) do nothing;
    perform set_config('vallo.recording_unknown_charge', '', true);
    select * into tx from public.transactions where provider_ref = p_reference;
    if tx.id is null then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
  end if;

  select * into bk from public.bookings where id = tx.booking_id for update;
  select * into tx from public.transactions where id = tx.id for update;
  if tx.status in ('SUCCESSFUL', 'REFUNDED') then
    return jsonb_build_object('outcome', 'already-settled', 'booking_id', bk.id, 'transaction_status', tx.status);
  end if;
  select * into ag from public.deal_agreements where id = tx.agreement_id for update;

  is_rent := exists (select 1 from public.rent_payments rp where rp.booking_id = bk.id);
  if is_rent then
    perform 1 from public.listings where id = bk.listing_id for update;
  end if;

  gross := case when coalesce(p_amount_minor, 0) > 0 then p_amount_minor else tx.amount_minor end;
  reason := case
    when tx.lister_share_minor is null or ag.id is null then 'no_split'
    when ag.status <> 'approved' then 'agreement_' || ag.status::text
    when bk.status not in ('PENDING', 'CONFIRMED') then 'booking_' || lower(bk.status::text)
    when exists (select 1 from public.transactions t
                  where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id) then 'already_paid'
    when is_rent and private.listing_is_let(bk.listing_id, bk.id) then 'already_let'
    when bk.status = 'PENDING' and bk.check_in < lagos_today then 'check_in_passed'
    when gross <> tx.amount_minor then 'amount_mismatch'
    else null
  end;

  if reason is not null then
    -- Nothing is kept and nothing is credited: the whole charge goes back to
    -- the card. The caller issues the processor refund against this row.
    update public.transactions set status = 'FAILED', updated_at = now() where id = tx.id;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A card payment could not be applied and must be refunded to the card',
            format('Reference %s took %s kobo for booking %s (status %s) and could not be applied (%s). '
                   || 'Refund the full amount to the card through Paystack.',
                   p_reference, gross, bk.id, bk.status, reason),
            'booking', bk.id::text);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'booking.charge_refund_due', 'booking', bk.id::text,
            jsonb_build_object('reference', p_reference, 'amount_minor', gross, 'reason', reason));
    return jsonb_build_object('outcome', 'refund-due', 'booking_id', bk.id, 'reason', reason,
                              'amount_minor', gross, 'reference', p_reference);
  end if;

  update public.transactions set status = 'SUCCESSFUL', updated_at = now() where id = tx.id;

  -- The processor's fee is borne by the lister's subaccount (the split's
  -- bearer), so it comes out of the lister's share and nobody else's.
  fee := least(tx.lister_share_minor, greatest(0, coalesce(p_processor_fee_minor, 0)));
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor,
     processor_fee_minor, guarantee_reserve_minor, net_settlement_minor)
  values (bk.id, tx.id, gross, tx.commission_minor, tx.lister_share_minor - fee, fee, tx.guarantee_minor,
          tx.lister_share_minor - fee)
  on conflict (transaction_id) where transaction_id is not null do nothing;

  if tx.guarantee_minor > 0 then
    insert into public.guarantee_reserve_entries (direction, kind, amount_minor, booking_id, transaction_id, note)
    values ('in', 'contribution', tx.guarantee_minor, bk.id, tx.id, 'Guarantee contribution settled with the charge')
    on conflict (transaction_id) do nothing;
  end if;

  update public.deal_agreements set status = 'paid', paid_at = now(), updated_at = now() where id = ag.id
  returning * into ag;
  perform private.agreement_log(ag, null, 'paid', 'approved', 'Paid. The lister''s share and the Guarantee settled with the charge.');

  was_pending := bk.status = 'PENDING';
  if was_pending then
    update public.bookings set status = 'CONFIRMED' where id = bk.id and status = 'PENDING';
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'PENDING', 'CONFIRMED', 'Payment received, so the booking is confirmed.');
    insert into public.availability (listing_id, date, status)
    select bk.listing_id, d::date, 'booked'
      from generate_series(bk.check_in::timestamp, (bk.check_out - 1)::timestamp, interval '1 day') as d
    on conflict (listing_id, date) do update set status = 'booked';
  else
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'CONFIRMED', 'CONFIRMED', 'Payment received. The host had already accepted this stay.');
  end if;

  return jsonb_build_object(
    'outcome', 'settled', 'booking_id', bk.id, 'confirmed', was_pending, 'amount_minor', gross,
    'ledger', jsonb_build_object(
      'grossMinor', gross, 'platformFeeMinor', tx.commission_minor, 'agentShareMinor', tx.lister_share_minor - fee,
      'processorFeeMinor', fee, 'guaranteeMinor', tx.guarantee_minor, 'netSettlementMinor', tx.lister_share_minor - fee));
end;
$function$;

-- --------------------------------------------------- refunds, rewritten
-- A refund is decided here and returned to the card by the processor. The
-- lister's share already settled to the lister; when Vallo's processor
-- balance funds a refund, what the lister received is recorded as owed back
-- (rent_refunds_owed), never taken from any balance, because there is none.
create or replace function private.refund_booking_payment(
  acting_admin uuid, target_booking uuid, refund_amount bigint, refund_reference text, reason_code text,
  decision_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  bk          public.bookings%rowtype;
  lister      uuid;
  paid_total  bigint;
  refunded    bigint;
  refundable  bigint;
  refund_id   uuid;
begin
  if acting_admin is null or target_booking is null
     or refund_reference is null or length(btrim(refund_reference)) = 0 or reason_code is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if reason_code not in ('guest_choice', 'host_cancelled', 'not_as_listed', 'no_access', 'goodwill', 'duplicate_charge') then
    return jsonb_build_object('status', 'bad_reason');
  end if;
  if refund_amount is null or refund_amount <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into bk from public.bookings where id = target_booking for update;
  if bk.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select coalesce(sum(t.amount_minor), 0) into paid_total
    from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL';
  select coalesce(sum(r.refund_minor), 0) into refunded from public.booking_refunds r where r.booking_id = bk.id;
  refundable := paid_total - refunded;
  if refund_amount > refundable then
    return jsonb_build_object('status', 'over_refund', 'paid_minor', paid_total, 'refunded_minor', refunded,
                              'refundable_minor', refundable, 'refund_minor', refund_amount);
  end if;
  begin
    insert into public.booking_refunds
      (booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, note,
       wallet_reference, decided_by, processor_status)
    values (bk.id, bk.guest_id, paid_total, refund_amount, paid_total - refund_amount, reason_code,
            nullif(btrim(decision_note), ''), btrim(refund_reference), acting_admin, 'pending')
    returning id into refund_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor,
     guarantee_reserve_minor, net_settlement_minor)
  values (bk.id, null, -refund_amount, 0, -refund_amount, 0, 0, -refund_amount);
  select a.user_id into lister from public.listings l join public.agents a on a.id = l.agent_id where l.id = bk.listing_id;
  if lister is not null then
    insert into public.rent_refunds_owed (booking_id, lister_id, amount_minor)
    values (bk.id, lister, refund_amount)
    on conflict (booking_id) do update
      set amount_minor = public.rent_refunds_owed.amount_minor + excluded.amount_minor, cleared_at = null, updated_at = now();
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (acting_admin, 'booking.refunded', 'booking', bk.id::text,
          jsonb_build_object('refund_minor', refund_amount, 'reason', reason_code, 'booking_status', bk.status,
                             'refundable_after_minor', refundable - refund_amount, 'to', 'card'));
  return jsonb_build_object('status', 'ok', 'booking_id', bk.id, 'guest_id', bk.guest_id, 'booking_status', bk.status,
                            'paid_minor', paid_total, 'refund_minor', refund_amount,
                            'refundable_after_minor', refundable - refund_amount,
                            'reference', btrim(refund_reference), 'refund_id', refund_id);
end;
$function$;

create or replace function private.refund_and_cancel_booking(
  acting_admin uuid, target_booking uuid, refund_amount bigint, refund_reference text, reason_code text,
  decision_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  bk            public.bookings%rowtype;
  before_status public.booking_status;
  paid_total    bigint;
  refunded      bigint;
  refund_id     uuid;
  lister        uuid;
begin
  if acting_admin is null or target_booking is null or reason_code is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if reason_code not in ('guest_choice', 'host_cancelled', 'not_as_listed', 'no_access') then
    return jsonb_build_object('status', 'bad_reason');
  end if;
  if refund_amount is null or refund_amount < 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if refund_amount > 0 and (refund_reference is null or length(refund_reference) = 0) then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into bk from public.bookings where id = target_booking for update;
  if bk.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if bk.status = 'CANCELLED' then
    return jsonb_build_object('status', 'already_cancelled');
  end if;
  before_status := bk.status;
  select coalesce(sum(t.amount_minor), 0) into paid_total
    from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL';
  select coalesce(sum(r.refund_minor), 0) into refunded from public.booking_refunds r where r.booking_id = bk.id;
  if refund_amount > paid_total - refunded then
    return jsonb_build_object('status', 'over_refund', 'paid_minor', paid_total, 'refunded_minor', refunded,
                              'refundable_minor', paid_total - refunded, 'refund_minor', refund_amount);
  end if;
  if refund_amount > 0 then
    insert into public.ledger_entries
      (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor,
       guarantee_reserve_minor, net_settlement_minor)
    values (bk.id, null, -refund_amount, 0, -refund_amount, 0, 0, -refund_amount);
    select a.user_id into lister from public.listings l join public.agents a on a.id = l.agent_id where l.id = bk.listing_id;
    if lister is not null then
      insert into public.rent_refunds_owed (booking_id, lister_id, amount_minor)
      values (bk.id, lister, refund_amount)
      on conflict (booking_id) do update
        set amount_minor = public.rent_refunds_owed.amount_minor + excluded.amount_minor, cleared_at = null, updated_at = now();
    end if;
  end if;
  update public.bookings set status = 'CANCELLED' where id = bk.id and status in ('PENDING', 'CONFIRMED');
  if not found then
    raise exception 'booking % could not be cancelled from %', bk.id, before_status;
  end if;
  insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
  values (bk.id, before_status, 'CANCELLED', acting_admin,
          coalesce(nullif(btrim(decision_note), ''), 'Cancelled by Vallo support.'));
  delete from public.availability a
   where a.listing_id = bk.listing_id and a.status = 'booked' and a.date >= bk.check_in and a.date < bk.check_out;
  update public.deal_agreements set status = 'cancelled', updated_at = now()
   where booking_id = bk.id and status not in ('cancelled');
  insert into public.booking_refunds
    (booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, note, wallet_reference, decided_by, processor_status)
  values (bk.id, bk.guest_id, paid_total, refund_amount, paid_total - refund_amount, reason_code,
          nullif(btrim(decision_note), ''), case when refund_amount > 0 then refund_reference else null end, acting_admin,
          case when refund_amount > 0 then 'pending' else 'not_needed' end)
  returning id into refund_id;
  return jsonb_build_object('status', 'ok', 'booking_id', bk.id, 'guest_id', bk.guest_id, 'listing_id', bk.listing_id,
                            'previous_status', before_status, 'paid_minor', paid_total, 'refund_minor', refund_amount,
                            'retained_minor', paid_total - refund_amount,
                            'reference', case when refund_amount > 0 then refund_reference else null end,
                            'refund_id', refund_id);
end;
$function$;

-- The processor has the refund: record where it is.
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
  update public.booking_refunds set processor_status = p_status, processor_refund_id = nullif(btrim(p_processor_id), '')
   where id = p_refund and processor_status in ('pending', 'failed');
  return jsonb_build_object('status', case when found then 'ok' else 'not_found' end);
end;
$function$;

-- A rent charge opens only on an APPROVED agreement, at the agreed figure and
-- move-in date. The agreement, not the tap, is the proof of what was agreed.
create or replace function private.rent_charge_needs_approved_agreement()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ag public.deal_agreements%rowtype;
begin
  select * into ag from public.deal_agreements where inspection_id = new.inspection_id;
  if ag.id is null or ag.status <> 'approved' then
    raise exception 'agreement_not_approved: payment is not available until the agreement is approved'
      using errcode = '42501';
  end if;
  if new.total_minor <> ag.amount_minor then
    raise exception 'agreement_amount_changed: the move-in figure differs from the approved agreement'
      using errcode = '42501';
  end if;
  update public.deal_agreements set booking_id = new.booking_id, updated_at = now() where id = ag.id;
  return new;
end;
$function$;
drop trigger if exists rent_payments_00_needs_approved_agreement on public.rent_payments;
create trigger rent_payments_00_needs_approved_agreement before insert or update of booking_id, total_minor
  on public.rent_payments for each row execute function private.rent_charge_needs_approved_agreement();

-- ------------------------------------------------------------ grants
revoke all on function public.agreement_open_rent_as(uuid, uuid, date, date, text) from public, anon, authenticated;
revoke all on function public.agreement_amend_as(uuid, uuid, date, date, text) from public, anon, authenticated;
revoke all on function public.agreement_confirm_as(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.agreement_cancel_as(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.guarantee_claim_file_as(uuid, uuid, text[], text, text[], bigint) from public, anon, authenticated;
revoke all on function public.payment_split_for_booking(uuid) from public, anon, authenticated;
revoke all on function public.record_processor_refund(uuid, text, text) from public, anon, authenticated;
grant execute on function public.agreement_open_rent_as(uuid, uuid, date, date, text) to service_role;
grant execute on function public.agreement_amend_as(uuid, uuid, date, date, text) to service_role;
grant execute on function public.agreement_confirm_as(uuid, uuid, integer) to service_role;
grant execute on function public.agreement_cancel_as(uuid, uuid, text) to service_role;
grant execute on function public.guarantee_claim_file_as(uuid, uuid, text[], text, text[], bigint) to service_role;
grant execute on function public.payment_split_for_booking(uuid) to service_role;
grant execute on function public.record_processor_refund(uuid, text, text) to service_role;

revoke all on function public.admin_decide_agreement(uuid, text, text) from public, anon;
revoke all on function public.admin_decide_guarantee_claim(uuid, text, bigint, text) from public, anon;
revoke all on function public.admin_mark_guarantee_claim_paid(uuid, text) from public, anon;
revoke all on function public.admin_guarantee_reserve() from public, anon;
grant execute on function public.admin_decide_agreement(uuid, text, text) to authenticated;
grant execute on function public.admin_decide_guarantee_claim(uuid, text, bigint, text) to authenticated;
grant execute on function public.admin_mark_guarantee_claim_paid(uuid, text) to authenticated;
grant execute on function public.admin_guarantee_reserve() to authenticated;

-- ------------------------------------------ the stay-hold sweep, adjusted
-- ESC-14 released an accepted stay 24 hours after the host accepted it if
-- nobody paid. Payment now opens only when Vallo approves the agreement, so
-- the 24 hours run from the APPROVAL, and a stay whose agreement is still
-- being confirmed or reviewed keeps its nights for up to 72 hours from the
-- acceptance. A released stay's agreement is cancelled with it.
create or replace function private.expire_booking_holds(p_ttl interval default '48:00:00'::interval, p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  b             record;
  released      uuid[] := '{}';
  paid_pending  uuid[] := '{}';
  paying        uuid[] := '{}';
  unpaid        uuid[] := '{}';
  waiting       uuid[] := '{}';
  ttl_hours     integer;
  lagos_today   date := (now() at time zone 'Africa/Lagos')::date;
begin
  if p_ttl is null or p_ttl < interval '1 hour' then
    raise exception 'A hold lives for at least one hour before it can expire.' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'A sweep releases between 1 and 5000 holds per run.' using errcode = '22023';
  end if;
  ttl_hours := floor(extract(epoch from p_ttl) / 3600)::integer;
  for b in
    select bk.id, bk.listing_id, bk.check_in, bk.check_out, bk.created_at
      from public.bookings bk
     where bk.status = 'PENDING'
       and bk.created_at < now() - p_ttl
     order by bk.created_at
     limit p_limit
       for update of bk skip locked
  loop
    if exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL') then
      paid_pending := paid_pending || b.id;
      continue;
    end if;
    if b.created_at > now() - (p_ttl + interval '2 hours') and exists (
      select 1 from public.transactions t
       where t.booking_id = b.id and t.status = 'PENDING' and t.created_at > now() - interval '2 hours'
    ) then
      paying := paying || b.id;
      continue;
    end if;
    update public.bookings set status = 'CANCELLED' where id = b.id and status = 'PENDING';
    if not found then
      continue;
    end if;
    released := released || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'PENDING', 'CANCELLED',
            format('Auto-released: the request was not confirmed within %s hours.', ttl_hours));
    update public.deal_agreements set status = 'cancelled', updated_at = now()
     where booking_id = b.id and status not in ('paid', 'cancelled');
    delete from public.availability av
     where av.listing_id = b.listing_id and av.status = 'booked'
       and av.date >= b.check_in and av.date < b.check_out;
  end loop;

  for b in
    select bk.id, bk.listing_id, bk.check_in, bk.check_out,
           coalesce((select max(e.created_at) from public.booking_state_events e
                      where e.booking_id = bk.id and e.to_status = 'CONFIRMED'), bk.updated_at) as accepted_at,
           ag.status as agreement_status, ag.decided_at as approved_at
      from public.bookings bk
      left join public.deal_agreements ag on ag.booking_id = bk.id
     where bk.status = 'CONFIRMED'
       and not exists (select 1 from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL')
       and not exists (select 1 from public.rent_payments rp where rp.booking_id = bk.id)
     order by bk.check_in
     limit p_limit
       for update of bk skip locked
  loop
    if b.agreement_status in ('awaiting_parties', 'in_review', 'rejected') then
      if b.accepted_at > now() - interval '72 hours' and b.check_in > lagos_today then
        waiting := waiting || b.id;
        continue;
      end if;
    elsif b.agreement_status = 'approved' then
      if not (b.approved_at < now() - interval '24 hours'
              or (b.check_in <= lagos_today and b.approved_at < now() - interval '2 hours')) then
        continue;
      end if;
    elsif not (b.accepted_at < now() - interval '24 hours'
               or (b.check_in <= lagos_today and b.accepted_at < now() - interval '2 hours')) then
      continue;
    end if;
    if exists (select 1 from public.transactions t
                where t.booking_id = b.id and t.status = 'PENDING' and t.created_at > now() - interval '2 hours') then
      paying := paying || b.id;
      continue;
    end if;
    update public.bookings set status = 'CANCELLED' where id = b.id and status = 'CONFIRMED';
    if not found then
      continue;
    end if;
    unpaid := unpaid || b.id;
    released := released || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'CONFIRMED', 'CANCELLED',
            'Auto-released: the stay was accepted but not paid for in time.');
    update public.deal_agreements set status = 'cancelled', updated_at = now()
     where booking_id = b.id and status not in ('paid', 'cancelled');
    delete from public.availability av
     where av.listing_id = b.listing_id and av.status = 'booked'
       and av.date >= b.check_in and av.date < b.check_out;
  end loop;

  return jsonb_build_object('released', to_jsonb(released), 'paid_pending', to_jsonb(paid_pending),
                            'payment_in_flight', to_jsonb(paying), 'accepted_unpaid', to_jsonb(unpaid),
                            'agreement_pending', to_jsonb(waiting), 'ttl_hours', ttl_hours);
end;
$function$;
