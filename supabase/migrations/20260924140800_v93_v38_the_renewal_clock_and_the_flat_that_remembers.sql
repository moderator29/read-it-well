-- V-93 AND V-38: THE RENEWAL CLOCK, AND THE FLAT THAT REMEMBERS ITS LAST LET.
--
-- A tenancy paid through Vallo knows when it ends (`private.tenancy_end`).
-- This file puts that date to work, around the existing rows:
--
--   V-93, THE CLOCK. At 90, 60 and 30 days before the end the tenant is told
--   when the rent renews, and the lister is asked to confirm the renewal
--   figure. The lister's figure is a row (`tenancy_renewal_offers`, append
--   only, latest wins) that copies rent and service charge by default and
--   carries NO agency, legal or agreement fee unless the lister adds one; the
--   screen then says renewal fees are not usual. The tenant answers renewing
--   or leaving (`tenancy_renewal_answers`, once).
--
--   THE RENEWAL CHARGE ITSELF IS NOT HERE. `rent_payments.inspection_id` is
--   NOT NULL and UNIQUE, so a second charge on the same tenancy cannot be
--   expressed without changing that column and adding a renewal variant of
--   `open_rent_charge`: existing schema and a money function, both the audit
--   session's. It is reported as blocked rather than built around.
--
--   V-38, THE FLAT THAT REMEMBERS. Inside 90 days of the end, and unless the
--   tenant has said they are renewing, the lister can relist: a new DRAFT
--   listing cloned from the let one (facts, utilities, fees as last listed,
--   amenities), joined to its predecessor in `listing_lineage`. The draft goes
--   through the ordinary submit gate and review. PHOTOS ARE NOT COPIED: a
--   photo row names a storage object, and two listings naming one object
--   means deleting a photo from the draft could take it from the let
--   listing's record; a flat also changes between lets, so the lister
--   photographs it again. Once published, the page
--   prints one dated line from `listing_last_let`: the month and the rent the
--   predecessor was actually let at through Vallo. A let with no Vallo
--   payment prints nothing. The outgoing tenant's account of the flat (light,
--   water, flooding, as it actually was) opens only after their caution is
--   settled, so the landlord has no leverage over what they say, and appears
--   on the successor, counted and dated.
--
-- A VOID TENANCY (cancelled, refunded or reversed; `private.tenancy_void`)
-- has no renewal, no reminders, no relist and no last-let line: nobody let
-- the flat at that figure.
--
-- Examples can never have a predecessor or a successor: the demo trigger
-- refuses any rent charge against an example, and the clone refuses an
-- example source.

/* ------------------------------------------------------------ V-93 */

create table if not exists public.tenancy_renewal_offers (
  id              uuid primary key default gen_random_uuid(),
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  rent_minor      bigint not null check (rent_minor > 0),
  service_minor   bigint check (service_minor is null or service_minor >= 0),
  agency_minor    bigint not null default 0 check (agency_minor >= 0),
  legal_minor     bigint not null default 0 check (legal_minor >= 0),
  agreement_minor bigint not null default 0 check (agreement_minor >= 0),
  offered_by      uuid not null,
  offered_at      timestamptz not null default now()
);

comment on table public.tenancy_renewal_offers is
  'V-93. The lister''s renewal figure for a tenancy, latest row wins. Fees default to zero; any fee the lister adds is shown with the words that renewal fees are not usual.';

create table if not exists public.tenancy_renewal_answers (
  rent_payment_id uuid primary key references public.rent_payments(id) on delete cascade,
  answer          text not null check (answer in ('renewing', 'leaving')),
  answered_by     uuid not null,
  answered_at     timestamptz not null default now()
);

/* When the tenant was last told about the renewal figure: one notice a day at most. */
create table if not exists public.tenancy_renewal_notices (
  rent_payment_id uuid primary key references public.rent_payments(id) on delete cascade,
  notified_at     timestamptz not null default now()
);
alter table public.tenancy_renewal_notices enable row level security;
revoke all on public.tenancy_renewal_notices from public, anon, authenticated;
grant all on public.tenancy_renewal_notices to service_role;

create index if not exists tenancy_renewal_offers_rp_idx on public.tenancy_renewal_offers (rent_payment_id, offered_at desc);

/* ------------------------------------------------------------ V-38 */

create table if not exists public.listing_lineage (
  successor_listing_id        uuid primary key references public.listings(id) on delete cascade,
  predecessor_listing_id      uuid not null references public.listings(id) on delete cascade,
  predecessor_rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  created_by                  uuid not null,
  created_at                  timestamptz not null default now(),
  check (successor_listing_id <> predecessor_listing_id)
);

comment on table public.listing_lineage is
  'V-38. A listing relisted from a tenancy let through Vallo, and the tenancy it succeeds. Written only by relist_from_tenancy.';

create table if not exists public.tenancy_exit_accounts (
  rent_payment_id uuid primary key references public.rent_payments(id) on delete cascade,
  light           text not null check (light in ('most_of_the_day', 'some_of_the_day', 'rarely')),
  water           text not null check (water in ('always', 'sometimes', 'rarely')),
  flooding        text not null check (flooding in ('never', 'sometimes', 'often')),
  answered_by     uuid not null,
  answered_at     timestamptz not null default now()
);

comment on table public.tenancy_exit_accounts is
  'V-38. The outgoing tenant''s account of the flat as it actually was: light, water, flooding. Opens only once their caution is settled or none was paid. Shown on the successor listing, counted and dated.';

/* ------------------------------------------------------------ born locked */

alter table public.tenancy_renewal_offers enable row level security;
alter table public.tenancy_renewal_answers enable row level security;
alter table public.listing_lineage enable row level security;
alter table public.tenancy_exit_accounts enable row level security;
revoke all on public.tenancy_renewal_offers, public.tenancy_renewal_answers, public.listing_lineage,
              public.tenancy_exit_accounts from public, anon, authenticated;
grant select on public.tenancy_renewal_offers, public.tenancy_renewal_answers, public.listing_lineage,
               public.tenancy_exit_accounts to authenticated;
grant all on public.tenancy_renewal_offers, public.tenancy_renewal_answers, public.listing_lineage,
             public.tenancy_exit_accounts to service_role;

create policy tenancy_renewal_offers_read on public.tenancy_renewal_offers for select to authenticated
  using (private.tenancy_party(rent_payment_id) or private.is_staff());
create policy tenancy_renewal_answers_read on public.tenancy_renewal_answers for select to authenticated
  using (private.tenancy_party(rent_payment_id) or private.is_staff());
create policy listing_lineage_read on public.listing_lineage for select to authenticated
  using (private.owns_listing(successor_listing_id) or private.is_staff());
create policy tenancy_exit_accounts_read on public.tenancy_exit_accounts for select to authenticated
  using (private.tenancy_party(rent_payment_id) or private.is_staff());

do $$
declare t text;
begin
  foreach t in array array['tenancy_renewal_offers','tenancy_renewal_answers','listing_lineage','tenancy_exit_accounts'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_frozen', t);
    execute format('create trigger %I before update on public.%I for each row execute function private.tenancy_record_is_frozen()', t || '_frozen', t);
  end loop;
end $$;

/* ------------------------------------------------------------ the doors */

create or replace function public.offer_renewal(
  p_rent_payment uuid, p_rent bigint, p_service bigint default null,
  p_agency bigint default 0, p_legal bigint default 0, p_agreement bigint default 0)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp public.rent_payments%rowtype;
  prev public.tenancy_renewal_offers%rowtype;
begin
  select * into rp from public.rent_payments where id = p_rent_payment for update;
  if rp.id is null or rp.lister_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not private.tenancy_paid(rp.id) then
    return jsonb_build_object('status', 'not_paid');
  end if;
  if private.tenancy_void(rp.id) then
    return jsonb_build_object('status', 'void');
  end if;
  if p_rent is null or p_rent <= 0 or coalesce(p_service, 0) < 0
     or coalesce(p_agency, 0) < 0 or coalesce(p_legal, 0) < 0 or coalesce(p_agreement, 0) < 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  select * into prev from public.tenancy_renewal_offers
   where rent_payment_id = rp.id order by offered_at desc limit 1;
  -- The same figures again are not a new offer: nothing is written and the
  -- tenant is not told twice.
  if prev.id is not null
     and prev.rent_minor = p_rent and prev.service_minor is not distinct from p_service
     and prev.agency_minor = coalesce(p_agency, 0) and prev.legal_minor = coalesce(p_legal, 0)
     and prev.agreement_minor = coalesce(p_agreement, 0) then
    return jsonb_build_object('status', 'ok', 'unchanged', true);
  end if;
  insert into public.tenancy_renewal_offers
    (rent_payment_id, rent_minor, service_minor, agency_minor, legal_minor, agreement_minor, offered_by)
  values (rp.id, p_rent, p_service, coalesce(p_agency, 0), coalesce(p_legal, 0), coalesce(p_agreement, 0), rp.lister_id);
  -- Told on the first offer and on a changed one, at most once a day,
  -- measured from the last notice rather than the last offer.
  if not exists (select 1 from public.tenancy_renewal_notices n
                  where n.rent_payment_id = rp.id and n.notified_at > now() - interval '1 day') then
    insert into public.tenancy_renewal_notices (rent_payment_id, notified_at) values (rp.id, now())
    on conflict (rent_payment_id) do update set notified_at = excluded.notified_at;
    perform private.tenancy_tell(rp.tenant_id,
      case when prev.id is null then 'The renewal figure is in' else 'The renewal figure changed' end,
      'Your tenancy file shows what renewing costs.', rp.id);
  end if;
  return jsonb_build_object('status', 'ok');
end;
$function$;

create or replace function public.answer_renewal(p_rent_payment uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp public.rent_payments%rowtype;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null or rp.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not private.tenancy_paid(rp.id) then
    return jsonb_build_object('status', 'not_paid');
  end if;
  if private.tenancy_void(rp.id) then
    return jsonb_build_object('status', 'void');
  end if;
  if p_answer not in ('renewing', 'leaving') then
    return jsonb_build_object('status', 'bad_answer');
  end if;
  insert into public.tenancy_renewal_answers (rent_payment_id, answer, answered_by)
  values (rp.id, p_answer, rp.tenant_id)
  on conflict (rent_payment_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_answered');
  end if;
  perform private.tenancy_tell(rp.lister_id,
    case when p_answer = 'renewing' then 'Your tenant is renewing' else 'Your tenant is leaving at the end of the tenancy' end,
    'See it in the tenancy file.', rp.id);
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* V-38. Clone the let listing into a fresh DRAFT for its lister. */
create or replace function public.relist_from_tenancy(p_rent_payment uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp  public.rent_payments%rowtype;
  src public.listings%rowtype;
  ends date;
  fresh uuid;
  existing uuid;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null or rp.lister_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not private.tenancy_paid(rp.id) then
    return jsonb_build_object('status', 'not_paid');
  end if;
  if private.tenancy_void(rp.id) then
    return jsonb_build_object('status', 'void');
  end if;
  ends := private.tenancy_end(rp.move_in, rp.rent_period);
  if ends - 90 > (now() at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'too_early', 'opens_on', ends - 90);
  end if;
  if exists (select 1 from public.tenancy_renewal_answers a where a.rent_payment_id = rp.id and a.answer = 'renewing') then
    return jsonb_build_object('status', 'tenant_renewing');
  end if;
  select l.successor_listing_id into existing from public.listing_lineage l where l.predecessor_rent_payment_id = rp.id;
  if existing is not null then
    return jsonb_build_object('status', 'ok', 'listing_id', existing, 'existing', true);
  end if;
  select * into src from public.listings where id = rp.listing_id;
  if src.id is null or src.is_demo then
    return jsonb_build_object('status', 'not_found');
  end if;

  insert into public.listings (
    agent_id, title, description, property_type, status, state_code, city, area, address, landmark,
    latitude, longitude, bedrooms, bathrooms, rate_minor, rate_period, power_grid, power_backup,
    power_backup_hours, water_supply, prepaid_meter, has_estate_access, listing_intent,
    rent_amount_minor, rent_period, rent_negotiable, caution_deposit_minor, service_charge_minor,
    service_charge_period, agency_fee_minor, legal_fee_minor, agreement_fee_minor,
    minimum_tenancy_months, available_from, furnished, size_sqm, toilets, parking_spaces, floor,
    total_floors, condition, listing_role, firm_id, is_demo, featured
  ) values (
    src.agent_id, src.title, src.description, src.property_type, 'DRAFT', src.state_code, src.city, src.area,
    src.address, src.landmark, src.latitude, src.longitude, src.bedrooms, src.bathrooms, src.rate_minor,
    src.rate_period, src.power_grid, src.power_backup, src.power_backup_hours, src.water_supply,
    src.prepaid_meter, src.has_estate_access, src.listing_intent, src.rent_amount_minor, src.rent_period,
    src.rent_negotiable, src.caution_deposit_minor, src.service_charge_minor, src.service_charge_period,
    src.agency_fee_minor, src.legal_fee_minor, src.agreement_fee_minor, src.minimum_tenancy_months,
    ends, src.furnished, src.size_sqm, src.toilets, src.parking_spaces, src.floor, src.total_floors,
    src.condition, src.listing_role, src.firm_id, false, false
  )
  returning id into fresh;

  insert into public.listing_amenities (listing_id, amenity_id)
  select fresh, a.amenity_id from public.listing_amenities a where a.listing_id = src.id;

  insert into public.listing_lineage (successor_listing_id, predecessor_listing_id, predecessor_rent_payment_id, created_by)
  values (fresh, src.id, rp.id, rp.lister_id);

  return jsonb_build_object('status', 'ok', 'listing_id', fresh, 'existing', false);
end;
$function$;

/* V-38. The outgoing tenant's account, once their caution is settled. */
create or replace function public.answer_exit_account(p_rent_payment uuid, p_light text, p_water text, p_flooding text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp public.rent_payments%rowtype;
  o  public.caution_obligations%rowtype;
  covered bigint;
begin
  select * into rp from public.rent_payments where id = p_rent_payment;
  if rp.id is null or rp.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if not private.tenancy_paid(rp.id) or private.tenancy_void(rp.id) then
    return jsonb_build_object('status', 'void');
  end if;
  if private.tenancy_end(rp.move_in, rp.rent_period) - 30 > (now() at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'too_early');
  end if;
  select * into o from public.caution_obligations where rent_payment_id = rp.id;
  if o.id is not null then
    covered := coalesce((select sum(r.amount_minor) from public.caution_returns r where r.obligation_id = o.id), 0)
             + coalesce((select sum(d.amount_minor) from public.caution_deductions d
                           join public.caution_deduction_answers a on a.deduction_id = d.id and a.answer = 'accepted'
                          where d.obligation_id = o.id), 0);
    if covered < o.amount_minor then
      return jsonb_build_object('status', 'caution_not_settled');
    end if;
  end if;
  begin
    insert into public.tenancy_exit_accounts (rent_payment_id, light, water, flooding, answered_by)
    values (rp.id, p_light, p_water, p_flooding, rp.tenant_id);
  exception
    when unique_violation then return jsonb_build_object('status', 'already_answered');
    when check_violation then return jsonb_build_object('status', 'bad_answer');
  end;
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* V-38. What the public page prints about a successor listing: the month and
   rent its predecessor was let at through Vallo, and the outgoing tenant's
   account. Nothing about who. Null for a listing with no Vallo let behind it. */
create or replace function public.listing_last_let(p_listing uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select jsonb_build_object(
           'paid_month', date_trunc('month', (select min(t.created_at) from public.transactions t
                                                where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL')),
           'rent_minor', rp.rent_minor,
           'rent_period', rp.rent_period,
           'exit', (select jsonb_build_object('light', e.light, 'water', e.water, 'flooding', e.flooding,
                                              'answered_month', date_trunc('month', e.answered_at))
                      from public.tenancy_exit_accounts e where e.rent_payment_id = rp.id))
    from public.listing_lineage l
    join public.listings s on s.id = l.successor_listing_id and s.status = 'PUBLISHED' and not s.is_demo
    join public.rent_payments rp on rp.id = l.predecessor_rent_payment_id
   where l.successor_listing_id = p_listing
     and rp.rent_minor is not null
     -- Only for the same flat: a successor edited into another area, type or
     -- size is not the flat that was let, so its last let is not printed.
     and exists (select 1 from public.listings pre
                  where pre.id = l.predecessor_listing_id
                    and pre.state_code is not distinct from s.state_code
                    and lower(btrim(coalesce(pre.area, ''))) = lower(btrim(coalesce(s.area, '')))
                    and pre.property_type is not distinct from s.property_type
                    and pre.bedrooms is not distinct from s.bedrooms)
     and not private.tenancy_void(rp.id)
     and exists (select 1 from public.transactions t where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL');
$function$;

revoke all on function public.offer_renewal(uuid, bigint, bigint, bigint, bigint, bigint) from public, anon;
revoke all on function public.answer_renewal(uuid, text) from public, anon;
revoke all on function public.relist_from_tenancy(uuid) from public, anon;
revoke all on function public.answer_exit_account(uuid, text, text, text) from public, anon;
revoke all on function public.listing_last_let(uuid) from public, anon;
grant execute on function public.offer_renewal(uuid, bigint, bigint, bigint, bigint, bigint) to authenticated;
grant execute on function public.answer_renewal(uuid, text) to authenticated;
grant execute on function public.relist_from_tenancy(uuid) to authenticated;
grant execute on function public.answer_exit_account(uuid, text, text, text) to authenticated;
grant execute on function public.listing_last_let(uuid) to authenticated;

/* ------------------------------------------------------------ the clock */

/* Daily. At 90, 60 and 30 days before a paid tenancy ends: the tenant is told
   when the rent renews; the lister is asked to confirm the figure, and at 90
   days, unless the tenant has said they are renewing, offered the relist. */
create or replace function private.remind_renewals()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  sent int := 0;
  r record;
  ends date;
  left_days int;
begin
  for r in
    select rp.* from public.rent_payments rp
     where exists (select 1 from public.transactions t where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL')
       and private.tenancy_end(rp.move_in, rp.rent_period) - today in (90, 60, 30)
       and not private.tenancy_void(rp.id)
  loop
    ends := private.tenancy_end(r.move_in, r.rent_period);
    left_days := ends - today;
    insert into public.notifications (user_id, kind, title, body, href)
    values (r.tenant_id, 'booking', format('Your rent renews in %s days', left_days),
            'Your tenancy file shows the date and the renewal figure once the lister confirms it.',
            '/tenancy/' || r.id);
    insert into public.notifications (user_id, kind, title, body, href)
    values (r.lister_id, 'booking', format('A tenancy ends in %s days', left_days),
            case when left_days = 90
                  and not exists (select 1 from public.tenancy_renewal_answers a where a.rent_payment_id = r.id and a.answer = 'renewing')
                 then 'Confirm the renewal figure, or relist the flat from its tenancy file.'
                 else 'Confirm the renewal figure from the tenancy file.' end,
            '/tenancy/' || r.id);
    sent := sent + 2;
  end loop;
  return sent;
end;
$function$;

revoke all on function private.remind_renewals() from public, anon, authenticated;

select cron.unschedule('vallo_remind_renewals')
 where exists (select 1 from cron.job where jobname = 'vallo_remind_renewals');

select cron.schedule('vallo_remind_renewals', '20 7 * * *', 'select private.remind_renewals();');
