-- V-47 AND V-36: THE TENANCY FILE, AND THE CAUTION THAT IS OWED RATHER THAN HELD.
--
-- After a tenant pays a move-in total there was no record anybody could open
-- six months later: no copy of what the listing promised, no row saying the
-- caution is owed back, no date the tenancy ends. This file adds those
-- records AROUND the existing `rent_payments` and `transactions` rows. It
-- changes no money function. The one door here that moves money,
-- `return_caution`, CALLS the existing wallet-to-wallet transfer
-- (`private.transfer_between_wallets`, unchanged) from the lister's own wallet
-- to the tenant's, exactly as the Send page does.
--
-- EVERYTHING HERE IS A SIDE TABLE, and every one is append-only:
--
--   tenancy_snapshots       the listing as it stood at the moment of payment
--   caution_obligations     who owes the caution back, how much, by when
--   caution_deductions      itemised lines against it, each tied to a
--                           move-out photograph (V-54's report photos)
--   caution_deduction_answers  the tenant's accept or dispute, once per line
--   caution_returns         a wallet-to-wallet return from the lister to the
--                           tenant, made through `return_caution`
--   tenancy_pins            messages either party pins as evidence
--
-- WHERE A STATE WOULD USUALLY BE A COLUMN, IT IS DERIVED AT READ TIME. An
-- obligation is open, has deductions proposed, is agreed, disputed or returned
-- according to the rows beside it (`lib/tenancy/caution.ts` holds the rule and
-- its tests). A state column would be a second truth that could drift from
-- the rows that justify it.
--
-- NO CUSTODY. Vallo records the debt; it never holds the caution. A return
-- is made only through `return_caution`, which moves the lister's own money
-- to the tenant's wallet through the ordinary transfer, under a reference
-- derived from the obligation and what it has already covered, so a double
-- tap is the same transfer twice and the second is a no-op. It is clamped so
-- returns plus accepted deductions can never exceed the caution. A transfer
-- made any other way is never counted as a caution return, so a refund, a
-- round trip or an unrelated payment cannot inflate the record.
--
-- A VOID TENANCY OWES NOTHING. A rent charge whose booking was CANCELLED, or
-- that was refunded (`booking_refunds`) or reversed by the lister
-- (`rent_refunds_owed`), makes its obligation void: no reminders, no
-- deductions, no returns, and it is left out of the lister's record.
--
-- THE RECORDS OPEN AT PAYMENT, NOT AT CHARGE. A rent charge is opened before it
-- is paid and can lapse unpaid, so the snapshot and the obligation are written
-- by an AFTER trigger on `transactions` the moment a payment for a rent charge
-- is SUCCESSFUL. That trigger runs inside the settlement transaction, so it
-- catches every failure of its own and records a risk alert instead: a
-- payment always settles exactly as it would have without this file.
--
-- RETENTION. Tenancy evidence is kept until tenancy end plus six years, the
-- ordinary limitation period for contract claims (docs/RETENTION_SCHEDULE.md
-- 3.3a). `private.message_is_tenancy_evidence` is the question a message purge
-- must ask before deleting a pinned message.

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
  'V-47. The day a tenancy ends: move-in plus one rent period. Twin of tenancyEnd in apps/web/src/lib/tenancy/dates.ts.';

/* The founder's return window, in days after tenancy end. 30 matches the
   demand-letter practice; one constant so changing it is one line. */
create or replace function private.caution_return_days()
returns int
language sql
immutable
set search_path to ''
as $function$ select 30 $function$;

/* Is the caller a party to this tenancy? Policies call it as the querying
   role, so authenticated keeps EXECUTE (rule 21's exception). */
create or replace function private.tenancy_party(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.rent_payments rp
     where rp.id = p_rent_payment
       and (rp.tenant_id = (select auth.uid()) or rp.lister_id = (select auth.uid()))
  );
$function$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role);
$function$;

revoke all on function private.tenancy_end(date, public.rent_period) from public, anon;
revoke all on function private.caution_return_days() from public, anon;
revoke all on function private.tenancy_party(uuid) from public, anon;
revoke all on function private.is_staff() from public, anon;
grant execute on function private.tenancy_end(date, public.rent_period) to authenticated;
grant execute on function private.caution_return_days() to authenticated;
grant execute on function private.tenancy_party(uuid) to authenticated;
grant execute on function private.is_staff() to authenticated;

/* A tenancy is void when its charge was cancelled, refunded or reversed. */
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
            or exists (select 1 from public.booking_refunds r where r.booking_id = b.id and r.refund_minor > 0)
            or exists (select 1 from public.rent_refunds_owed o where o.booking_id = b.id))
  );
$function$;

revoke all on function private.tenancy_void(uuid) from public, anon;
grant execute on function private.tenancy_void(uuid) to authenticated;

/* The tenancy file asks the same question for its reader: a party learns
   whether their own tenancy is void, and a stranger learns nothing. */
create or replace function public.tenancy_is_void(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (private.tenancy_party(p_rent_payment) or private.is_staff())
     and private.tenancy_void(p_rent_payment);
$function$;

revoke all on function public.tenancy_is_void(uuid) from public, anon;
grant execute on function public.tenancy_is_void(uuid) to authenticated;

/* Tell the other party, and never fail the write that prompted it. */
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

revoke all on function private.tenancy_tell(uuid, text, text, uuid) from public, anon, authenticated;

/* One append-only guard for every table in this file. */
create or replace function private.tenancy_record_is_frozen()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  -- A cascade from the tenancy itself (rent_payments deleted) is let through.
  if tg_op = 'DELETE' then
    return old;
  end if;
  raise exception '%.% is append-only: a tenancy record is never edited', tg_table_schema, tg_table_name
    using errcode = '42501';
end;
$function$;

revoke all on function private.tenancy_record_is_frozen() from public, anon, authenticated;

/* ------------------------------------------------------------ V-47 snapshot */

create table if not exists public.tenancy_snapshots (
  rent_payment_id uuid primary key references public.rent_payments(id) on delete cascade,
  listing         jsonb not null,
  amenities       text[] not null default '{}',
  taken_at        timestamptz not null default now(),
  constraint tenancy_snapshots_listing_is_object check (jsonb_typeof(listing) = 'object')
);

comment on table public.tenancy_snapshots is
  'V-47. The listing as it stood at the moment of payment: facts, utilities, the lister''s own title and description as written, and amenities. The address, landmark and coordinate columns are never copied; the title and description are the lister''s free text and are copied as written. Append-only; kept to tenancy end plus six years.';

/* ------------------------------------------------------------ V-36 register */

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
  'V-36. A caution deposit that is OWED back, not held: the lister owes amount_minor to the tenant by due_on (tenancy end plus the return window). State is derived from the deductions, answers and returns beside it. Vallo records; it never holds the money.';

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
  'V-36. One itemised deduction against a caution, named by an inspection checklist item and tied to a move-out photograph. A lump sum with no item and no photo cannot be recorded.';

create table if not exists public.caution_deduction_answers (
  deduction_id uuid primary key references public.caution_deductions(id) on delete cascade,
  answer       text not null check (answer in ('accepted', 'disputed')),
  answered_by  uuid not null,
  answered_at  timestamptz not null default now()
);

create table if not exists public.caution_returns (
  id              uuid primary key default gen_random_uuid(),
  obligation_id   uuid not null references public.caution_obligations(id) on delete cascade,
  wallet_entry_id uuid not null unique,
  reference       text not null unique,
  amount_minor    bigint not null check (amount_minor > 0),
  returned_at     timestamptz not null,
  recorded_at     timestamptz not null default now()
);

comment on table public.caution_returns is
  'V-36. A completed wallet-to-wallet transfer from the lister to the tenant, linked to the caution it returns. The money moved through the ordinary transfer; this row only says what it was for.';

/* ------------------------------------------------------------ V-47 pins */

create table if not exists public.tenancy_pins (
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  message_id      uuid not null references public.messages(id) on delete cascade,
  pinned_by       uuid not null default auth.uid(),
  created_at      timestamptz not null default now(),
  primary key (rent_payment_id, message_id)
);

comment on table public.tenancy_pins is
  'V-47. A message either party pinned to the tenancy as evidence. A pinned message outlives the three-year thread purge until tenancy end plus six years (private.message_is_tenancy_evidence).';

create index if not exists caution_obligations_tenant_idx on public.caution_obligations (tenant_id);
create index if not exists caution_obligations_lister_idx on public.caution_obligations (lister_id);
create index if not exists caution_obligations_due_idx on public.caution_obligations (due_on);
create index if not exists caution_deductions_obligation_idx on public.caution_deductions (obligation_id);
create index if not exists caution_returns_obligation_idx on public.caution_returns (obligation_id);
create index if not exists tenancy_pins_message_idx on public.tenancy_pins (message_id);

/* ------------------------------------------------------------ born locked */

alter table public.tenancy_snapshots enable row level security;
alter table public.caution_obligations enable row level security;
alter table public.caution_deductions enable row level security;
alter table public.caution_deduction_answers enable row level security;
alter table public.caution_returns enable row level security;
alter table public.tenancy_pins enable row level security;

revoke all on public.tenancy_snapshots, public.caution_obligations, public.caution_deductions,
              public.caution_deduction_answers, public.caution_returns, public.tenancy_pins
  from public, anon, authenticated;
grant select on public.tenancy_snapshots, public.caution_obligations, public.caution_deductions,
               public.caution_deduction_answers, public.caution_returns, public.tenancy_pins
  to authenticated;
-- The only direct write a person has is a pin, and its policy checks it.
grant insert on public.tenancy_pins to authenticated;
grant all on public.tenancy_snapshots, public.caution_obligations, public.caution_deductions,
             public.caution_deduction_answers, public.caution_returns, public.tenancy_pins
  to service_role;

create policy tenancy_snapshots_read on public.tenancy_snapshots for select to authenticated
  using (private.tenancy_party(rent_payment_id) or private.is_staff());
create policy caution_obligations_read on public.caution_obligations for select to authenticated
  using (tenant_id = (select auth.uid()) or lister_id = (select auth.uid()) or private.is_staff());
create policy caution_deductions_read on public.caution_deductions for select to authenticated
  using (exists (select 1 from public.caution_obligations o where o.id = obligation_id));
create policy caution_deduction_answers_read on public.caution_deduction_answers for select to authenticated
  using (exists (select 1 from public.caution_deductions d where d.id = deduction_id));
create policy caution_returns_read on public.caution_returns for select to authenticated
  using (exists (select 1 from public.caution_obligations o where o.id = obligation_id));
create policy tenancy_pins_read on public.tenancy_pins for select to authenticated
  using (private.tenancy_party(rent_payment_id) or private.is_staff());
-- A pin: by a party, as themselves, of a message in THE conversation between
-- this tenant and this lister about this listing, and nowhere else.
create policy tenancy_pins_insert on public.tenancy_pins for insert to authenticated
  with check (
    pinned_by = (select auth.uid())
    and private.tenancy_party(rent_payment_id)
    and exists (
      select 1
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
        join public.rent_payments rp on rp.id = tenancy_pins.rent_payment_id
       where m.id = tenancy_pins.message_id
         and c.listing_id = rp.listing_id
         and c.guest_id = rp.tenant_id
         and c.agent_id = rp.lister_id
    )
  );

do $$
declare t text;
begin
  foreach t in array array['tenancy_snapshots','caution_obligations','caution_deductions',
                           'caution_deduction_answers','caution_returns','tenancy_pins'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_frozen', t);
    execute format('create trigger %I before update on public.%I for each row execute function private.tenancy_record_is_frozen()', t || '_frozen', t);
  end loop;
end $$;

/* ------------------------------------------------------------ opened at payment */

create or replace function private.open_tenancy_records(p_booking uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rp  public.rent_payments%rowtype;
  lst public.listings%rowtype;
  ends date;
begin
  select * into rp from public.rent_payments where booking_id = p_booking;
  if rp.id is null then
    return;
  end if;
  select * into lst from public.listings where id = rp.listing_id;

  if lst.id is not null then
    insert into public.tenancy_snapshots (rent_payment_id, listing, amenities)
    values (
      rp.id,
      -- The promise. The address, landmark and coordinate columns are never
      -- copied; the title and description are the lister's own words, copied
      -- as written, because they are the promise.
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
        'mandate_verified_at', lst.mandate_verified_at
      ),
      coalesce((select array_agg(a.code order by a.code)
                  from public.listing_amenities la join public.amenities a on a.id = la.amenity_id
                 where la.listing_id = lst.id), '{}')
    )
    on conflict (rent_payment_id) do nothing;
  end if;

  if coalesce(rp.caution_minor, 0) > 0 then
    ends := private.tenancy_end(rp.move_in, rp.rent_period);
    insert into public.caution_obligations
      (rent_payment_id, tenant_id, lister_id, amount_minor, tenancy_end, due_on)
    values
      (rp.id, rp.tenant_id, rp.lister_id, rp.caution_minor, ends, ends + private.caution_return_days())
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
              format('Booking %s settled but its tenancy snapshot or caution obligation was not written: %s',
                     new.booking_id, sqlerrm),
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

-- Rent charges already paid before this file. None exist live.
do $$
declare b uuid;
begin
  for b in
    select distinct rp.booking_id from public.rent_payments rp
     where exists (select 1 from public.transactions t where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL')
  loop
    perform private.open_tenancy_records(b);
  end loop;
end $$;

/* ------------------------------------------------------------ the doors */

/* The lister proposes one itemised deduction, against a photograph from
   THEIR OWN SUBMITTED move-out report (V-54), and only once the tenancy has
   ended: a draft report, or one written while the tenant still lives there,
   is not evidence of what the tenant left behind. */
create or replace function public.propose_caution_deduction(
  p_obligation uuid, p_item text, p_amount bigint, p_photo uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  o         public.caution_obligations%rowtype;
  committed bigint;
  returned  bigint;
  new_id    uuid;
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
    select 1
      from public.tenancy_report_photos ph
      join public.tenancy_reports r on r.id = ph.report_id
     where ph.id = p_photo
       and r.rent_payment_id = o.rent_payment_id
       and r.stage = 'move_out'
       and r.author_id = o.lister_id
       and r.submitted_at is not null
       and (r.submitted_at at time zone 'Africa/Lagos')::date >= o.tenancy_end
  ) then
    return jsonb_build_object('status', 'needs_move_out_photo');
  end if;
  select coalesce(sum(d.amount_minor), 0) into committed
    from public.caution_deductions d
    left join public.caution_deduction_answers a on a.deduction_id = d.id
   where d.obligation_id = o.id and coalesce(a.answer, 'accepted') <> 'disputed';
  select coalesce(sum(r.amount_minor), 0) into returned
    from public.caution_returns r where r.obligation_id = o.id;
  if committed + returned + p_amount > o.amount_minor then
    return jsonb_build_object('status', 'exceeds_caution');
  end if;
  insert into public.caution_deductions (obligation_id, item, amount_minor, photo_id, note, proposed_by)
  values (o.id, p_item, p_amount, p_photo, nullif(btrim(coalesce(p_note, '')), ''), (select auth.uid()))
  returning id into new_id;
  perform private.tenancy_tell(o.tenant_id, 'A deduction was proposed from your caution',
                               'Accept or dispute it in your tenancy file.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok', 'deduction_id', new_id);
end;
$function$;

/* The tenant accepts or disputes one line, once. */
create or replace function public.answer_caution_deduction(p_deduction uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  o public.caution_obligations%rowtype;
begin
  select o2.* into o
    from public.caution_deductions d join public.caution_obligations o2 on o2.id = d.obligation_id
   where d.id = p_deduction;
  if o.id is null or o.tenant_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_answer not in ('accepted', 'disputed') then
    return jsonb_build_object('status', 'bad_answer');
  end if;
  insert into public.caution_deduction_answers (deduction_id, answer, answered_by)
  values (p_deduction, p_answer, (select auth.uid()))
  on conflict (deduction_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_answered');
  end if;
  perform private.tenancy_tell(o.lister_id,
    case when p_answer = 'accepted' then 'A caution deduction was accepted' else 'A caution deduction was disputed' end,
    'See the answer in the tenancy file.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* The lister returns caution money from their own wallet to the tenant's.
   The ordinary transfer does the moving; the reference is derived from the
   obligation and what it already covers, so a repeat of the same tap is the
   same transfer and is refused as a duplicate. SERVICE ROLE ONLY, like the
   transfer it wraps: money never moves from a browser. The server action
   checks the session, the wallet flag and the money limits, then names the
   caller as p_lister. */
create or replace function public.return_caution(p_obligation uuid, p_amount bigint, p_lister uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  o        public.caution_obligations%rowtype;
  returned bigint;
  accepted bigint;
  outcome  text;
  out_ref  text;
  pair     uuid;
  entry    public.wallet_entries%rowtype;
begin
  select * into o from public.caution_obligations where id = p_obligation for update;
  if o.id is null or p_lister is null or o.lister_id <> p_lister then
    return jsonb_build_object('status', 'not_found');
  end if;
  if private.tenancy_void(o.rent_payment_id) then
    return jsonb_build_object('status', 'void');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  select coalesce(sum(r.amount_minor), 0) into returned from public.caution_returns r where r.obligation_id = o.id;
  select coalesce(sum(d.amount_minor), 0) into accepted
    from public.caution_deductions d
    join public.caution_deduction_answers a on a.deduction_id = d.id and a.answer = 'accepted'
   where d.obligation_id = o.id;
  if returned + accepted + p_amount > o.amount_minor then
    return jsonb_build_object('status', 'exceeds_caution');
  end if;
  -- The platform's own transfer shape (rm-p2p-<uuid>-out / -in, see
  -- lib/payments/references.ts), with the uuid derived from the obligation and
  -- what it already covers instead of drawn fresh: the same tap twice is the
  -- same reference, and the ledger's unique index refuses the second.
  pair := md5('caution:' || o.id || ':' || (returned + accepted))::uuid;
  out_ref := 'rm-p2p-' || pair || '-out';
  outcome := private.transfer_between_wallets(o.lister_id, o.tenant_id, p_amount, out_ref,
                                              'rm-p2p-' || pair || '-in', 'Caution return');
  if outcome = 'duplicate' then
    return jsonb_build_object('status', 'already_returned');
  end if;
  if outcome <> 'ok' then
    return jsonb_build_object('status', outcome);
  end if;
  select * into entry from public.wallet_entries where reference = out_ref;
  insert into public.caution_returns (obligation_id, wallet_entry_id, reference, amount_minor, returned_at)
  values (o.id, entry.id, out_ref, p_amount, entry.created_at);
  perform private.tenancy_tell(o.tenant_id, 'Caution money is back in your wallet',
                               'Your tenancy file shows what was returned.', o.rent_payment_id);
  return jsonb_build_object('status', 'ok', 'amount_minor', p_amount);
end;
$function$;

/* A lister's caution record, only once five obligations have settled. Settled
   means returned plus accepted deductions cover the whole caution. */
create or replace function public.lister_caution_record(p_lister uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  with per as (
    select o.id, o.amount_minor, o.due_on,
           coalesce((select sum(r.amount_minor) from public.caution_returns r where r.obligation_id = o.id), 0) as returned,
           coalesce((select sum(d.amount_minor) from public.caution_deductions d
                       join public.caution_deduction_answers a on a.deduction_id = d.id and a.answer = 'accepted'
                      where d.obligation_id = o.id), 0) as deducted,
           (select max(r.returned_at) from public.caution_returns r where r.obligation_id = o.id) as last_return
      from public.caution_obligations o
     where o.lister_id = p_lister
       and not private.tenancy_void(o.rent_payment_id)
  ), settled as (
    select * from per where returned + deducted >= amount_minor
  )
  select case when count(*) >= 5 then jsonb_build_object(
           'settled', count(*),
           'on_time', count(*) filter (where last_return is null or (last_return at time zone 'Africa/Lagos')::date <= due_on),
           'average_deduction_bps', (sum(deducted) * 10000 / nullif(sum(amount_minor), 0))::int
         ) end
    from settled;
$function$;

revoke all on function public.propose_caution_deduction(uuid, text, bigint, uuid, text) from public, anon;
revoke all on function public.answer_caution_deduction(uuid, text) from public, anon;
revoke all on function public.return_caution(uuid, bigint, uuid) from public, anon, authenticated;
revoke all on function public.lister_caution_record(uuid) from public, anon;
grant execute on function public.propose_caution_deduction(uuid, text, bigint, uuid, text) to authenticated;
grant execute on function public.answer_caution_deduction(uuid, text) to authenticated;
grant execute on function public.return_caution(uuid, bigint, uuid) to service_role;
grant execute on function public.lister_caution_record(uuid) to authenticated;

/* ------------------------------------------------------------ retention */

create or replace function private.message_is_tenancy_evidence(p_message uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.tenancy_pins pin
      join public.rent_payments rp on rp.id = pin.rent_payment_id
     where pin.message_id = p_message
       and private.tenancy_end(rp.move_in, rp.rent_period) + interval '6 years' > now()
  );
$function$;

revoke all on function private.message_is_tenancy_evidence(uuid) from public, anon, authenticated;

comment on function private.message_is_tenancy_evidence(uuid) is
  'V-47. True while a message is pinned to a tenancy whose end plus six years is still ahead. Any message purge must skip such a message.';

/* ------------------------------------------------------------ reminders */

/* Daily: the lister at due minus 30 and due minus 7 days, the tenant on the
   due date. Only for an obligation that is not yet covered. */
create or replace function private.remind_caution_due()
returns int
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  sent int := 0;
  o record;
begin
  for o in
    select ob.*,
           coalesce((select sum(r.amount_minor) from public.caution_returns r where r.obligation_id = ob.id), 0)
         + coalesce((select sum(d.amount_minor) from public.caution_deductions d
                       join public.caution_deduction_answers a on a.deduction_id = d.id and a.answer = 'accepted'
                      where d.obligation_id = ob.id), 0) as covered
      from public.caution_obligations ob
     where ob.due_on in (today + 30, today + 7, today)
       and not private.tenancy_void(ob.rent_payment_id)
  loop
    if o.covered >= o.amount_minor then
      continue;
    end if;
    if o.due_on = today then
      insert into public.notifications (user_id, kind, title, body, href)
      values (o.tenant_id, 'booking', 'Your caution is due back today',
              'Your tenancy file shows what is owed and what has been returned.',
              '/tenancy/' || o.rent_payment_id);
    else
      insert into public.notifications (user_id, kind, title, body, href)
      values (o.lister_id, 'booking',
              format('A caution is due back in %s days', o.due_on - today),
              'Return it from your wallet, or propose itemised deductions from the move-out report.',
              '/tenancy/' || o.rent_payment_id);
    end if;
    sent := sent + 1;
  end loop;
  return sent;
end;
$function$;

revoke all on function private.remind_caution_due() from public, anon, authenticated;

select cron.unschedule('vallo_remind_caution_due')
 where exists (select 1 from cron.job where jobname = 'vallo_remind_caution_due');

select cron.schedule('vallo_remind_caution_due', '15 7 * * *',
                     'select private.remind_caution_due();');
