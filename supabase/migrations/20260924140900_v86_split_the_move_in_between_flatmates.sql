-- V-86: SPLIT THE MOVE-IN BETWEEN FLATMATES.
--
-- Flat-sharing is how young Lagos rents. The lead tenant (the rent charge's
-- `tenant_id`) names co-tenants and a share each; every co-tenant sees their
-- share and pays it WALLET TO WALLET into the lead's wallet, and the lead pays
-- the lister through the ordinary rent door, once. No money reaches the lister
-- until the lead pays, and nothing here touches the charge or the settlement.
--
-- SHARES SUM TO THE TOTAL BY CONSTRUCTION. Only co-tenants have rows; the
-- lead's share is the remainder (`rent_payment_shares`), and the writer
-- refuses any share that would leave the lead with nothing, so co-tenant
-- shares plus the lead's always equal `rent_payments.total_minor` exactly.
--
-- THE SHARE PAYMENT CALLS THE EXISTING TRANSFER. `pay_rent_share` moves the
-- co-tenant's own money to the lead through `private.transfer_between_wallets`
-- (unchanged), under the platform's transfer shape (rm-p2p-<uuid>-out / -in)
-- with the uuid derived from the contributor row, so the same share cannot be
-- paid twice. Like that transfer it is SERVICE ROLE ONLY: money never moves
-- from a browser, and the server action applies the wallet flag and the money
-- limits first. The payment is recorded in its own append-only row.
--
-- THE CAUTION IS ATTRIBUTED AT READ TIME, pro rata to each share with the
-- remainder on the lead, so a flatmate who leaves can be repaid their part.
-- No column holds it.
--
-- A VOID CHARGE (cancelled, refunded or reversed) takes no new co-tenants and
-- no share payments.

create table if not exists public.rent_payment_contributors (
  id              uuid primary key default gen_random_uuid(),
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  user_id         uuid not null,
  share_minor     bigint not null check (share_minor > 0),
  added_by        uuid not null,
  added_at        timestamptz not null default now(),
  unique (rent_payment_id, user_id)
);

comment on table public.rent_payment_contributors is
  'V-86. A co-tenant on a rent charge and the share of the move-in total they pay to the lead tenant, wallet to wallet. The lead''s share is the remainder. Written only through add_rent_contributor; an unpaid row can be removed by the lead.';

create table if not exists public.rent_share_payments (
  contributor_id  uuid primary key references public.rent_payment_contributors(id) on delete restrict,
  wallet_entry_id uuid not null unique,
  reference       text not null unique,
  amount_minor    bigint not null check (amount_minor > 0),
  paid_at         timestamptz not null default now()
);

comment on table public.rent_share_payments is
  'V-86. A co-tenant''s share, paid wallet to wallet into the lead tenant''s wallet through pay_rent_share. Append-only.';

create index if not exists rent_payment_contributors_user_idx on public.rent_payment_contributors (user_id);

alter table public.rent_payment_contributors enable row level security;
alter table public.rent_share_payments enable row level security;
revoke all on public.rent_payment_contributors, public.rent_share_payments from public, anon, authenticated;
grant select on public.rent_payment_contributors, public.rent_share_payments to authenticated;
grant all on public.rent_payment_contributors, public.rent_share_payments to service_role;

/* The lead, the lister and the co-tenant themselves read a contributor row. */
create policy rent_payment_contributors_read on public.rent_payment_contributors for select to authenticated
  using (user_id = (select auth.uid()) or private.tenancy_party(rent_payment_id) or private.is_staff());
create policy rent_share_payments_read on public.rent_share_payments for select to authenticated
  using (exists (select 1 from public.rent_payment_contributors c where c.id = contributor_id));

drop trigger if exists rent_payment_contributors_frozen on public.rent_payment_contributors;
create trigger rent_payment_contributors_frozen before update on public.rent_payment_contributors
  for each row execute function private.tenancy_record_is_frozen();
drop trigger if exists rent_share_payments_frozen on public.rent_share_payments;
create trigger rent_share_payments_frozen before update on public.rent_share_payments
  for each row execute function private.tenancy_record_is_frozen();

/* Every share on a charge, the lead's as the remainder. */
create or replace view public.rent_payment_shares
with (security_invoker = true) as
  select rp.id as rent_payment_id, rp.tenant_id as user_id, true as is_lead,
         rp.total_minor - coalesce((select sum(c.share_minor) from public.rent_payment_contributors c
                                     where c.rent_payment_id = rp.id), 0) as share_minor
    from public.rent_payments rp
  union all
  select c.rent_payment_id, c.user_id, false, c.share_minor
    from public.rent_payment_contributors c;

revoke all on public.rent_payment_shares from public, anon;
grant select on public.rent_payment_shares to authenticated;

/* ------------------------------------------------------------ the doors */

create or replace function public.add_rent_contributor(p_rent_payment uuid, p_user uuid, p_share bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp public.rent_payments%rowtype;
  taken bigint;
  new_id uuid;
begin
  select * into rp from public.rent_payments where id = p_rent_payment for update;
  if rp.id is null or rp.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if private.tenancy_void(rp.id) then
    return jsonb_build_object('status', 'void');
  end if;
  if p_user is null or p_user = rp.tenant_id or p_user = rp.lister_id then
    return jsonb_build_object('status', 'bad_person');
  end if;
  if p_share is null or p_share <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  select coalesce(sum(share_minor), 0) into taken from public.rent_payment_contributors where rent_payment_id = rp.id;
  if taken + p_share >= rp.total_minor then
    return jsonb_build_object('status', 'exceeds_total');
  end if;
  begin
    insert into public.rent_payment_contributors (rent_payment_id, user_id, share_minor, added_by)
    values (rp.id, p_user, p_share, rp.tenant_id)
    returning id into new_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'already_added');
  end;
  begin
    perform private.notify(p_user, 'booking'::public.notification_kind, 'You have a share of a move-in to pay',
      'Open it to see your share and pay it from your wallet.', '/rent/share/' || new_id);
  exception when others then
    null;
  end;
  return jsonb_build_object('status', 'ok', 'contributor_id', new_id);
end;
$function$;

create or replace function public.remove_rent_contributor(p_contributor uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c public.rent_payment_contributors%rowtype;
begin
  select c2.* into c from public.rent_payment_contributors c2
    join public.rent_payments rp on rp.id = c2.rent_payment_id
   where c2.id = p_contributor and rp.tenant_id = (select auth.uid());
  if c.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if exists (select 1 from public.rent_share_payments s where s.contributor_id = c.id) then
    return jsonb_build_object('status', 'already_paid');
  end if;
  delete from public.rent_payment_contributors where id = c.id;
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* The co-tenant pays their share into the lead's wallet. Service role only. */
create or replace function public.pay_rent_share(p_contributor uuid, p_payer uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c public.rent_payment_contributors%rowtype;
  rp public.rent_payments%rowtype;
  pair uuid;
  out_ref text;
  outcome text;
  entry public.wallet_entries%rowtype;
begin
  select * into c from public.rent_payment_contributors where id = p_contributor for update;
  if c.id is null or p_payer is null or c.user_id <> p_payer then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into rp from public.rent_payments where id = c.rent_payment_id;
  if private.tenancy_void(rp.id) then
    return jsonb_build_object('status', 'void');
  end if;
  if exists (select 1 from public.rent_share_payments s where s.contributor_id = c.id) then
    return jsonb_build_object('status', 'already_paid');
  end if;
  pair := md5('rent-share:' || c.id)::uuid;
  out_ref := 'rm-p2p-' || pair || '-out';
  outcome := private.transfer_between_wallets(c.user_id, rp.tenant_id, c.share_minor, out_ref,
                                              'rm-p2p-' || pair || '-in', 'Move-in share');
  if outcome = 'duplicate' then
    return jsonb_build_object('status', 'already_paid');
  end if;
  if outcome <> 'ok' then
    return jsonb_build_object('status', outcome);
  end if;
  select * into entry from public.wallet_entries where reference = out_ref;
  insert into public.rent_share_payments (contributor_id, wallet_entry_id, reference, amount_minor)
  values (c.id, entry.id, out_ref, c.share_minor);
  begin
    perform private.notify(rp.tenant_id, 'booking'::public.notification_kind, 'A flatmate paid their share',
      'It is in your wallet. Your tenancy file shows every share.', '/tenancy/' || rp.id);
  exception when others then
    null;
  end;
  return jsonb_build_object('status', 'ok', 'amount_minor', c.share_minor);
end;
$function$;

/* What a co-tenant sees of their share: area-level, never the address. */
create or replace function public.my_rent_share(p_contributor uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select jsonb_build_object(
           'contributor_id', c.id,
           'share_minor', c.share_minor,
           'total_minor', rp.total_minor,
           'move_in', rp.move_in,
           'area', l.area,
           'city', l.city,
           'lead', nullif(btrim(coalesce(p.first_name, '')), ''),
           'paid_at', (select s.paid_at from public.rent_share_payments s where s.contributor_id = c.id),
           'void', private.tenancy_void(rp.id))
    from public.rent_payment_contributors c
    join public.rent_payments rp on rp.id = c.rent_payment_id
    join public.listings l on l.id = rp.listing_id
    left join public.profiles p on p.id = rp.tenant_id
   where c.id = p_contributor
     and c.user_id = (select auth.uid());
$function$;

revoke all on function public.add_rent_contributor(uuid, uuid, bigint) from public, anon;
revoke all on function public.remove_rent_contributor(uuid) from public, anon;
revoke all on function public.pay_rent_share(uuid, uuid) from public, anon, authenticated;
revoke all on function public.my_rent_share(uuid) from public, anon;
grant execute on function public.add_rent_contributor(uuid, uuid, bigint) to authenticated;
grant execute on function public.remove_rent_contributor(uuid) to authenticated;
grant execute on function public.pay_rent_share(uuid, uuid) to service_role;
grant execute on function public.my_rent_share(uuid) to authenticated;
