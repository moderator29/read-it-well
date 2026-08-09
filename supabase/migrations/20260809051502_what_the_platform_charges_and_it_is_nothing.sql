-- What the platform charges, configurable, and set to nothing.
--
-- The owner's decision, stated plainly: build the whole engine now, switch it
-- on later. There is no user base yet, and a marketplace that introduces a
-- commission after people have started earning on it feels like an ambush
-- however small the number is. So every rate here defaults to zero, every
-- surface renders zero as "no fee" rather than as a missing value, and the day
-- a real rate is switched on it is one insert with a future effective date and
-- an audit trail behind it.
--
-- HALF THE PLUMBING ALREADY EXISTED AND ALWAYS RECORDED ZERO.
-- public.ledger_entries has carried platform_fee_minor since bookings_payments,
-- and private.pay_booking_from_wallet writes 0 into it on every payment. That
-- was not a placeholder for a rate, it was a hardcoded zero, which is why this
-- file exists: a hardcoded zero cannot become five percent without a code
-- deploy, and a marketplace's take rate must be an operational lever rather
-- than a release.
--
-- WHY EFFECTIVE DATES RATHER THAN ONE MUTABLE NUMBER.
-- A rate is a fact about a moment, not about the platform. If a transaction in
-- March was charged nothing and the rate becomes five percent in April, then
-- reading March's fee back through today's rate reports a fee that was never
-- charged, and the platform's own books disagree with the receipts it sent.
-- Rates are therefore append-only rows with a start date, the rate in force at
-- time T is the latest row not after T, and changing the rate never touches
-- history. Nothing here is ever updated in place.
--
-- WHY THE FEE IS ALSO STORED ON THE THING IT WAS CHARGED ON.
-- Even with effective dates, recomputing a historical fee means trusting that
-- the rate table has never been corrected, that the clock the two sides used
-- agrees, and that the rounding rule has not moved. It does not need to be
-- trusted: the computed figure and the id of the rate row it came from are
-- written onto the transaction at the moment of charge, and every reader after
-- that reads the stored number. The rate table answers "what would we charge
-- now". The stored number answers "what did we charge", and those are different
-- questions.

begin;

/* ------------------------------------------------------------------ types */

/*
 * The two things the platform can charge for. Both exist from day one at zero
 * because the alternative is discovering later that the listing fee needs a
 * different table shape than the commission and building it twice.
 */
create type public.fee_kind as enum (
  -- Taken from a completed transaction: an escrow that released, a stay that
  -- was paid for. A share of money that actually changed hands.
  'commission',
  -- Charged to a lister for putting a property up. Not a share of anything.
  'listing_fee'
);

/* ------------------------------------------------------------------ rates */

create table public.fee_rates (
  id uuid primary key default gen_random_uuid(),
  kind public.fee_kind not null,

  /*
   * Basis points, not a percentage and never a float.
   *
   * 250 is 2.5 percent. An integer basis point is the smallest unit anybody
   * quotes a marketplace take rate in, it multiplies against integer kobo
   * without ever producing a fraction of a kobo that has to be rounded twice,
   * and it cannot drift the way 0.025 stored as a double can.
   */
  basis_points integer not null default 0,

  /*
   * A flat amount in kobo, charged on top of the proportional part.
   *
   * Zero today. It exists because a listing fee is far more likely to be a flat
   * five thousand naira than a percentage of a property's value, and a table
   * that could only express percentages would need migrating on the day
   * somebody decided that.
   */
  flat_minor bigint not null default 0,

  /*
   * When this rate starts applying. The rate in force at a moment is the row
   * with the greatest effective_from at or before it.
   *
   * A future date is allowed and is the intended way to change a rate: announce
   * it, insert it dated a month out, and every transaction until then is
   * charged the old rate without anybody having to be awake at midnight.
   */
  effective_from timestamptz not null default now(),

  /* Who changed it and why. Both required on anything after the seed, which is
     enforced by the setter rather than by a constraint, because the seed rows
     below have no admin behind them. */
  created_by uuid references auth.users(id) on delete set null,
  note text,

  created_at timestamptz not null default now(),

  constraint fee_rates_basis_points_sane
    check (basis_points >= 0 and basis_points <= 10000),
  constraint fee_rates_flat_nonneg check (flat_minor >= 0),
  -- One rate per kind per instant. Two rates starting at the same moment is not
  -- a policy, it is a race between two admins, and the loser's number would be
  -- picked arbitrarily by the ordering of a scan.
  constraint fee_rates_one_per_moment unique (kind, effective_from)
);

comment on table public.fee_rates is
  'What the platform charges, by kind, with effective dates. Append only: changing a rate inserts a row, it never updates one, so a fee charged in the past can always be explained by the row that was in force. Every rate is zero today by the owner''s decision.';

comment on column public.fee_rates.basis_points is
  'Hundredths of a percent. 250 is 2.5 percent. An integer so that a fee against integer kobo is exact.';

-- The only read there is: the latest row for a kind at or before a moment.
create index fee_rates_kind_effective_idx
  on public.fee_rates (kind, effective_from desc);

/* ------------------------------------------------------------------- seed */

/*
 * Zero, from the beginning of time, for both kinds.
 *
 * Dated 1970 rather than now() so that there is no window, however small,
 * before which a lookup finds no row. A missing rate and a zero rate must never
 * be the same thing anywhere in this system: zero is a decision the owner made
 * and the UI says "no fee"; missing is a bug and the UI would have to say
 * nothing at all. Seeding from the epoch means missing cannot happen.
 */
insert into public.fee_rates (kind, basis_points, flat_minor, effective_from, note)
values
  ('commission', 0, 0, 'epoch'::timestamptz,
   'Zero at launch. The engine is built and switched off until there is a user base, so that nobody earning here is ambushed by a rate they did not sign up to.'),
  ('listing_fee', 0, 0, 'epoch'::timestamptz,
   'Zero at launch. Listing is free while supply is the constraint.')
on conflict (kind, effective_from) do nothing;

/* --------------------------------------------------------------- lookup */

/*
 * The rate in force for a kind at a moment.
 *
 * STABLE and readable by anybody, including anon: what the platform charges is
 * not a secret, and a pricing page that had to authenticate to say "no fee"
 * would be absurd. Returns exactly one row, always, because of the epoch seed.
 */
create or replace function public.fee_rate_at(
  p_kind public.fee_kind,
  p_at timestamptz default now()
)
returns table (rate_id uuid, basis_points integer, flat_minor bigint, effective_from timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.basis_points, r.flat_minor, r.effective_from
  from public.fee_rates r
  where r.kind = p_kind
    and r.effective_from <= p_at
  order by r.effective_from desc
  limit 1;
$$;

comment on function public.fee_rate_at is
  'The rate in force for a kind at a moment. Always returns exactly one row: the epoch seed guarantees it, so a caller never has to tell a missing rate from a zero one.';

/*
 * What a fee actually comes to, in kobo, with the rate that produced it.
 *
 * INTEGER ARITHMETIC, ONE ROUNDING, DOWNWARD. The proportional part is
 * amount * basis_points / 10000 in bigint, which truncates, so a fee is never
 * a kobo more than the rate says. Rounding a marketplace's own take DOWN is the
 * only defensible direction: the error, when there is one, is against the
 * platform and in favour of the person being charged.
 *
 * The rate id comes back with the number so the caller can freeze both onto the
 * transaction. A caller that stores the fee and not the rate has stored a
 * number nobody can later explain.
 */
create or replace function private.compute_fee(
  p_kind public.fee_kind,
  p_amount_minor bigint,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record;
  fee bigint;
begin
  if p_amount_minor is null or p_amount_minor < 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  select * into r from public.fee_rate_at(p_kind, p_at);
  if r.rate_id is null then
    -- Unreachable while the epoch seed exists. Answering zero rather than
    -- raising is still the right failure: a marketplace that cannot read its
    -- own rate table must not stop taking money, it must stop taking a cut.
    return jsonb_build_object(
      'status', 'ok', 'fee_minor', 0, 'basis_points', 0, 'flat_minor', 0, 'rate_id', null
    );
  end if;

  fee := (p_amount_minor * r.basis_points) / 10000 + r.flat_minor;
  -- A flat fee larger than the transaction cannot be taken out of it.
  if fee > p_amount_minor then
    fee := p_amount_minor;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'fee_minor', fee,
    'basis_points', r.basis_points,
    'flat_minor', r.flat_minor,
    'rate_id', r.rate_id
  );
end;
$$;

comment on function private.compute_fee is
  'The fee in kobo for an amount at a moment, with the rate row that produced it. Integer arithmetic, truncating, so the platform never takes a kobo more than the stated rate.';

/* ---------------------------------------------------------------- setting */

/*
 * Changing a rate. An insert, an audit entry, and no update anywhere.
 *
 * Refuses an effective date in the past, which is the one guard that matters:
 * back-dating a rate would mean transactions already charged at the old rate
 * can no longer be explained by the table, which is the exact failure the
 * effective dates exist to prevent. A rate takes effect from now or later, and
 * "now" is as retroactive as it gets.
 */
create or replace function private.set_fee_rate(
  acting_admin uuid,
  p_kind public.fee_kind,
  p_basis_points integer,
  p_flat_minor bigint,
  p_effective_from timestamptz,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  starts timestamptz := coalesce(p_effective_from, now());
begin
  if acting_admin is null
     or not (private.has_role(acting_admin, 'admin') or private.has_role(acting_admin, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_basis_points is null or p_basis_points < 0 or p_basis_points > 10000 then
    return jsonb_build_object('status', 'bad_rate');
  end if;
  if p_flat_minor is null or p_flat_minor < 0 then
    return jsonb_build_object('status', 'bad_flat');
  end if;
  if p_note is null or char_length(btrim(p_note)) < 4 then
    return jsonb_build_object('status', 'needs_a_reason');
  end if;
  -- A minute of slack, because a form submitted at 12:00:00 and processed at
  -- 12:00:01 with "effective now" must not be refused as back-dating.
  if starts < now() - interval '1 minute' then
    return jsonb_build_object('status', 'cannot_backdate');
  end if;

  insert into public.fee_rates (kind, basis_points, flat_minor, effective_from, created_by, note)
  values (p_kind, p_basis_points, p_flat_minor, starts, acting_admin, btrim(p_note))
  returning id into new_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    acting_admin, 'fee_rate.set', 'fee_rate', new_id::text,
    jsonb_build_object(
      'kind', p_kind,
      'basis_points', p_basis_points,
      'flat_minor', p_flat_minor,
      'effective_from', starts,
      'note', btrim(p_note)
    )
  );

  return jsonb_build_object('status', 'ok', 'rate_id', new_id, 'effective_from', starts);
exception when unique_violation then
  return jsonb_build_object('status', 'duplicate');
end;
$$;

comment on function private.set_fee_rate is
  'Insert a new rate for a kind. Admin only, reason required, never back-dated, always audited. There is deliberately no way to update or delete a rate row.';

/* -------------------------------------------------------------------- RLS */

alter table public.fee_rates enable row level security;

/*
 * Anybody may read what the platform charges, including a signed-out visitor.
 * A take rate that has to be discovered by signing up is the thing this whole
 * file is trying not to be.
 */
create policy fee_rates_select_all
  on public.fee_rates for select
  using (true);

/* No insert, update or delete policy exists, at all. Rates change through
   private.set_fee_rate and through nothing else, so the audit entry cannot be
   skipped by writing the row directly. */

revoke all on table public.fee_rates from anon, authenticated;
grant select on table public.fee_rates to anon, authenticated;

revoke all on function private.compute_fee(public.fee_kind, bigint, timestamptz) from public, anon, authenticated;
revoke all on function private.set_fee_rate(uuid, public.fee_kind, integer, bigint, timestamptz, text) from public, anon, authenticated;
grant execute on function public.fee_rate_at(public.fee_kind, timestamptz) to anon, authenticated;

/* ------------------------------------------- the listing fee, on the listing

   Where a listing fee lands once it is no longer zero. Frozen onto the row at
   the moment it is charged, with the rate that produced it, for exactly the
   reason stated at the top of this file: the table says what we would charge
   today and these columns say what we charged.
   -------------------------------------------------------------------------- */

alter table public.listings
  add column if not exists listing_fee_minor bigint,
  add column if not exists listing_fee_rate_id uuid references public.fee_rates(id) on delete set null,
  add column if not exists listing_fee_charged_at timestamptz;

comment on column public.listings.listing_fee_minor is
  'What was actually charged to publish this listing, in kobo, at the moment it was charged. Null means no fee has been charged; 0 means a fee was computed and it came to nothing, which is what every listing says today. The two are different facts and the UI renders them differently.';

alter table public.listings
  add constraint listings_listing_fee_nonneg
    check (listing_fee_minor is null or listing_fee_minor >= 0),
  add constraint listings_listing_fee_has_its_rate
    check (listing_fee_minor is null or (listing_fee_rate_id is not null and listing_fee_charged_at is not null));

commit;
