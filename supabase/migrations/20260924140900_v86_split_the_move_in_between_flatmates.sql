-- V-86: SPLIT THE MOVE-IN BETWEEN FLATMATES.
--
-- Flat-sharing is how young Lagos rents. The lead tenant (the rent charge's
-- `tenant_id`) INVITES co-tenants to a share each; a co-tenant accepts or
-- declines, and only an accepted share can be paid. The co-tenant pays WALLET
-- TO WALLET into the lead's wallet, and the lead pays the lister through the
-- ordinary rent door, once. No money reaches the lister until the lead pays,
-- and nothing here touches the charge or the settlement.
--
-- SHARES SUM TO THE TOTAL BY CONSTRUCTION. Only co-tenants have rows; the
-- lead's share is the remainder (`rent_payment_shares`), declined shares do
-- not count, and the writer refuses any share that would leave the lead with
-- nothing, so standing shares plus the lead's always equal the total exactly.
--
-- CONSENT AND NOISE. An invitation is only that: the notice says "invited",
-- never "you owe". One notice per (charge, person) ever, so removing and
-- re-adding cannot renotify, and a lead can invite at most 10 people a day
-- (`private.consume_rate_limit`).
--
-- THE SHARE PAYMENT CALLS THE EXISTING TRANSFER. `pay_rent_share` moves the
-- co-tenant's own money to the lead through `private.transfer_between_wallets`
-- (unchanged), under the platform's transfer shape (rm-p2p-<uuid>-out / -in)
-- with the uuid derived from the contributor row, so the same share cannot be
-- paid twice. It is refused unless the share was accepted and the charge is
-- still open and payable (booking PENDING, nothing settled, not void). Like
-- the transfer it wraps it is SERVICE ROLE ONLY: money never moves from a
-- browser, and the server action applies the wallet flag, the account hold
-- and the money limits first.
--
-- WHEN A CHARGE GOES VOID AFTER SHARES WERE PAID (the booking cancelled, or
-- the whole total refunded or reversed; a partial refund is not void), the
-- money sits in the lead's wallet. The lead returns each share
-- in one tap (`return_rent_share`, the same transfer, a reference derived from
-- the row, exactly the amount paid, once), the share page shows the co-tenant
-- what they paid, to whom and when, and a daily job tells each paid co-tenant
-- once that the move-in fell through.
--
-- THE CAUTION IS ATTRIBUTED AT READ TIME, pro rata to each share with the
-- remainder on the lead. No column holds it.

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
  'V-86. A co-tenant invited to a share of a rent charge''s move-in total, paid to the lead tenant wallet to wallet once accepted. The lead''s share is the remainder. Written only through add_rent_contributor; an unpaid row can be removed by the lead.';

create table if not exists public.rent_share_answers (
  contributor_id uuid primary key references public.rent_payment_contributors(id) on delete cascade,
  answer         text not null check (answer in ('accepted', 'declined')),
  answered_at    timestamptz not null default now()
);

create table if not exists public.rent_share_payments (
  contributor_id  uuid primary key references public.rent_payment_contributors(id) on delete restrict,
  wallet_entry_id uuid not null unique,
  reference       text not null unique,
  amount_minor    bigint not null check (amount_minor > 0),
  paid_at         timestamptz not null default now()
);

create table if not exists public.rent_share_returns (
  contributor_id  uuid primary key references public.rent_share_payments(contributor_id) on delete restrict,
  wallet_entry_id uuid not null unique,
  reference       text not null unique,
  amount_minor    bigint not null check (amount_minor > 0),
  returned_at     timestamptz not null default now()
);

/* A decline outlives the invitation: removing and re-inviting a person who
   declined is refused, so a "no" cannot be worn down. */
create table if not exists public.rent_share_declines (
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  user_id         uuid not null,
  declined_at     timestamptz not null default now(),
  primary key (rent_payment_id, user_id)
);

/* One invitation notice per (charge, person), ever; one void notice per share. */
create table if not exists public.rent_share_notices (
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  user_id         uuid not null,
  sent_at         timestamptz not null default now(),
  primary key (rent_payment_id, user_id)
);
create table if not exists public.rent_share_void_notices (
  contributor_id uuid primary key references public.rent_payment_contributors(id) on delete cascade,
  sent_at        timestamptz not null default now()
);

create index if not exists rent_payment_contributors_user_idx on public.rent_payment_contributors (user_id);

alter table public.rent_payment_contributors enable row level security;
alter table public.rent_share_answers enable row level security;
alter table public.rent_share_payments enable row level security;
alter table public.rent_share_returns enable row level security;
alter table public.rent_share_notices enable row level security;
alter table public.rent_share_void_notices enable row level security;
alter table public.rent_share_declines enable row level security;
revoke all on public.rent_share_declines from public, anon, authenticated;
grant all on public.rent_share_declines to service_role;
revoke all on public.rent_payment_contributors, public.rent_share_answers, public.rent_share_payments,
              public.rent_share_returns, public.rent_share_notices, public.rent_share_void_notices
  from public, anon, authenticated;
grant select on public.rent_payment_contributors, public.rent_share_answers, public.rent_share_payments,
               public.rent_share_returns to authenticated;
grant all on public.rent_payment_contributors, public.rent_share_answers, public.rent_share_payments,
             public.rent_share_returns, public.rent_share_notices, public.rent_share_void_notices to service_role;

/* The lead and the co-tenant themselves read a contributor row, and staff.
   Not the lister: who the tenant shares a flat with is not the lister's. */
create policy rent_payment_contributors_read on public.rent_payment_contributors for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.rent_payments rp where rp.id = rent_payment_id and rp.tenant_id = (select auth.uid()))
         or private.is_staff());
create policy rent_share_answers_read on public.rent_share_answers for select to authenticated
  using (exists (select 1 from public.rent_payment_contributors c where c.id = contributor_id));
create policy rent_share_payments_read on public.rent_share_payments for select to authenticated
  using (exists (select 1 from public.rent_payment_contributors c where c.id = contributor_id));
create policy rent_share_returns_read on public.rent_share_returns for select to authenticated
  using (exists (select 1 from public.rent_payment_contributors c where c.id = contributor_id));

do $$
declare t text;
begin
  foreach t in array array['rent_payment_contributors','rent_share_answers','rent_share_payments','rent_share_returns'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_frozen', t);
    execute format('create trigger %I before update on public.%I for each row execute function private.tenancy_record_is_frozen()', t || '_frozen', t);
  end loop;
end $$;

/* Every standing share on a charge, the lead's as the remainder. */
create or replace view public.rent_payment_shares
with (security_invoker = true) as
  select rp.id as rent_payment_id, rp.tenant_id as user_id, true as is_lead,
         rp.total_minor - coalesce((select sum(c.share_minor) from public.rent_payment_contributors c
                                     where c.rent_payment_id = rp.id
                                       and not exists (select 1 from public.rent_share_answers a
                                                        where a.contributor_id = c.id and a.answer = 'declined')), 0) as share_minor
    from public.rent_payments rp
  union all
  select c.rent_payment_id, c.user_id, false, c.share_minor
    from public.rent_payment_contributors c
   where not exists (select 1 from public.rent_share_answers a where a.contributor_id = c.id and a.answer = 'declined');

revoke all on public.rent_payment_shares from public, anon;
grant select on public.rent_payment_shares to authenticated;

/* A share is void only when the whole move-in fell through: the booking was
   CANCELLED, or the full total was refunded or reversed. A partial refund
   leaves the tenancy standing and the shares with it. The same test as
   private.tenancy_void (V-36), named here for the doors that read it. */
create or replace function private.rent_share_void(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.tenancy_void(p_rent_payment);
$function$;

revoke all on function private.rent_share_void(uuid) from public, anon, authenticated;

/* Open and payable: the booking is still PENDING, nothing has settled, not void. */
create or replace function private.rent_charge_payable(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.rent_payments rp join public.bookings b on b.id = rp.booking_id
     where rp.id = p_rent_payment and b.status = 'PENDING'
       and not exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL')
  ) and not private.tenancy_void(p_rent_payment);
$function$;

revoke all on function private.rent_charge_payable(uuid) from public, anon, authenticated;

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
  if not private.rent_charge_payable(rp.id) then
    return jsonb_build_object('status', 'not_open');
  end if;
  if p_user is null or p_user = rp.tenant_id or p_user = rp.lister_id then
    return jsonb_build_object('status', 'bad_person');
  end if;
  if p_share is null or p_share <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if exists (select 1 from public.rent_share_declines d where d.rent_payment_id = rp.id and d.user_id = p_user) then
    return jsonb_build_object('status', 'declined_before');
  end if;
  if not private.consume_rate_limit('rent_share_invite', rp.tenant_id::text, 10, 86400) then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  select coalesce(sum(c.share_minor), 0) into taken
    from public.rent_payment_contributors c
   where c.rent_payment_id = rp.id
     and not exists (select 1 from public.rent_share_answers a where a.contributor_id = c.id and a.answer = 'declined');
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
  -- An invitation, once per (charge, person) ever.
  insert into public.rent_share_notices (rent_payment_id, user_id) values (rp.id, p_user)
  on conflict do nothing;
  if found then
    begin
      perform private.notify(p_user, 'booking'::public.notification_kind, 'You were invited to share a move-in',
        'Open it to see the share and accept or decline.', '/rent/share/' || new_id);
    exception when others then
      null;
    end;
  end if;
  return jsonb_build_object('status', 'ok', 'contributor_id', new_id);
end;
$function$;

/* The co-tenant accepts or declines, once. */
create or replace function public.answer_rent_share(p_contributor uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c public.rent_payment_contributors%rowtype;
  lead uuid;
begin
  select * into c from public.rent_payment_contributors where id = p_contributor;
  if c.id is null or c.user_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_answer not in ('accepted', 'declined') then
    return jsonb_build_object('status', 'bad_answer');
  end if;
  insert into public.rent_share_answers (contributor_id, answer) values (c.id, p_answer)
  on conflict (contributor_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_answered');
  end if;
  if p_answer = 'declined' then
    insert into public.rent_share_declines (rent_payment_id, user_id) values (c.rent_payment_id, c.user_id)
    on conflict do nothing;
  end if;
  select rp.tenant_id into lead from public.rent_payments rp where rp.id = c.rent_payment_id;
  begin
    perform private.notify(lead, 'booking'::public.notification_kind,
      case when p_answer = 'accepted' then 'A flatmate accepted their share' else 'A flatmate declined their share' end,
      'Your tenancy file shows every share.', '/tenancy/' || c.rent_payment_id);
  exception when others then
    null;
  end;
  return jsonb_build_object('status', 'ok');
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

/* The co-tenant pays their accepted share into the lead's wallet. Service role only. */
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
  pair := md5('rent-share:' || c.id)::uuid;
  out_ref := 'rm-p2p-' || pair || '-out';
  if exists (select 1 from public.rent_share_payments s where s.contributor_id = c.id) then
    return jsonb_build_object('status', 'already_paid', 'reference', out_ref);
  end if;
  if not exists (select 1 from public.rent_share_answers a where a.contributor_id = c.id and a.answer = 'accepted') then
    return jsonb_build_object('status', 'not_accepted');
  end if;
  if not private.rent_charge_payable(rp.id) then
    return jsonb_build_object('status', 'not_open');
  end if;
  outcome := private.transfer_between_wallets(c.user_id, rp.tenant_id, c.share_minor, out_ref,
                                              'rm-p2p-' || pair || '-in', 'Move-in share');
  if outcome = 'duplicate' then
    return jsonb_build_object('status', 'already_paid', 'reference', out_ref);
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
  return jsonb_build_object('status', 'ok', 'amount_minor', c.share_minor, 'reference', out_ref);
end;
$function$;

/* The lead returns a paid share once the charge is void. Service role only. */
create or replace function public.return_rent_share(p_contributor uuid, p_lead uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c public.rent_payment_contributors%rowtype;
  rp public.rent_payments%rowtype;
  paid public.rent_share_payments%rowtype;
  pair uuid;
  out_ref text;
  outcome text;
  entry public.wallet_entries%rowtype;
begin
  select * into c from public.rent_payment_contributors where id = p_contributor for update;
  select * into rp from public.rent_payments where id = c.rent_payment_id;
  if c.id is null or p_lead is null or rp.tenant_id <> p_lead then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into paid from public.rent_share_payments where contributor_id = c.id;
  if paid.contributor_id is null then
    return jsonb_build_object('status', 'not_paid');
  end if;
  if not private.rent_share_void(rp.id) then
    return jsonb_build_object('status', 'not_void');
  end if;
  pair := md5('rent-share-return:' || c.id)::uuid;
  out_ref := 'rm-p2p-' || pair || '-out';
  if exists (select 1 from public.rent_share_returns r where r.contributor_id = c.id) then
    return jsonb_build_object('status', 'already_returned', 'reference', out_ref);
  end if;
  outcome := private.transfer_between_wallets(rp.tenant_id, c.user_id, paid.amount_minor, out_ref,
                                              'rm-p2p-' || pair || '-in', 'Move-in share returned');
  if outcome = 'duplicate' then
    return jsonb_build_object('status', 'already_returned', 'reference', out_ref);
  end if;
  if outcome <> 'ok' then
    return jsonb_build_object('status', outcome);
  end if;
  select * into entry from public.wallet_entries where reference = out_ref;
  insert into public.rent_share_returns (contributor_id, wallet_entry_id, reference, amount_minor)
  values (c.id, entry.id, out_ref, paid.amount_minor);
  begin
    perform private.notify(c.user_id, 'booking'::public.notification_kind, 'Your move-in share is back in your wallet',
      'The move-in fell through, and your share was returned.', '/rent/share/' || c.id);
  exception when others then
    null;
  end;
  return jsonb_build_object('status', 'ok', 'amount_minor', paid.amount_minor, 'reference', out_ref);
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
           'answer', (select a.answer from public.rent_share_answers a where a.contributor_id = c.id),
           'paid_minor', (select s.amount_minor from public.rent_share_payments s where s.contributor_id = c.id),
           'paid_at', (select s.paid_at from public.rent_share_payments s where s.contributor_id = c.id),
           'returned_at', (select r.returned_at from public.rent_share_returns r where r.contributor_id = c.id),
           'payable', private.rent_charge_payable(rp.id),
           'void', private.rent_share_void(rp.id))
    from public.rent_payment_contributors c
    join public.rent_payments rp on rp.id = c.rent_payment_id
    join public.listings l on l.id = rp.listing_id
    left join public.profiles p on p.id = rp.tenant_id
   where c.id = p_contributor
     and c.user_id = (select auth.uid());
$function$;

/* Daily: tell each paid co-tenant, once, that their move-in went void. */
create or replace function private.notify_void_shares()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  sent int := 0;
  r record;
begin
  for r in
    select c.id, c.user_id from public.rent_payment_contributors c
      join public.rent_share_payments s on s.contributor_id = c.id
     where private.rent_share_void(c.rent_payment_id)
       and not exists (select 1 from public.rent_share_returns x where x.contributor_id = c.id)
       and not exists (select 1 from public.rent_share_void_notices v where v.contributor_id = c.id)
  loop
    insert into public.rent_share_void_notices (contributor_id) values (r.id) on conflict do nothing;
    insert into public.notifications (user_id, kind, title, body, href)
    values (r.user_id, 'booking', 'The move-in you paid a share of fell through',
            'Your share is with the flatmate who led it, who can return it in one tap. Your share page shows what you paid.',
            '/rent/share/' || r.id);
    sent := sent + 1;
  end loop;
  return sent;
end;
$function$;

revoke all on function private.notify_void_shares() from public, anon, authenticated;

select cron.unschedule('vallo_notify_void_shares')
 where exists (select 1 from cron.job where jobname = 'vallo_notify_void_shares');
select cron.schedule('vallo_notify_void_shares', '25 7 * * *', 'select private.notify_void_shares();');

revoke all on function public.add_rent_contributor(uuid, uuid, bigint) from public, anon;
revoke all on function public.answer_rent_share(uuid, text) from public, anon;
revoke all on function public.remove_rent_contributor(uuid) from public, anon;
revoke all on function public.pay_rent_share(uuid, uuid) from public, anon, authenticated;
revoke all on function public.return_rent_share(uuid, uuid) from public, anon, authenticated;
revoke all on function public.my_rent_share(uuid) from public, anon;
grant execute on function public.add_rent_contributor(uuid, uuid, bigint) to authenticated;
grant execute on function public.answer_rent_share(uuid, text) to authenticated;
grant execute on function public.remove_rent_contributor(uuid) to authenticated;
grant execute on function public.pay_rent_share(uuid, uuid) to service_role;
grant execute on function public.return_rent_share(uuid, uuid) to service_role;
grant execute on function public.my_rent_share(uuid) to authenticated;
