/*
 * F-3 to F-7 from `docs/research/ESCROW_END_TO_END_RESEARCH.md` part 5.1.
 *
 * F-1 (the dead brand string) and F-2 (the four exposed verbs) landed earlier
 * and were read back off the live database before this migration was written:
 * the four doors answer `false` for both `anon` and `authenticated`, and the
 * ledger notes say Vallo. Nothing here reopens either.
 *
 * WHAT IS IN HERE, IN ORDER.
 *
 *   F-3  An inspection confirms AT MOST ONE escrow, chosen deterministically,
 *        and the payer is told which one. The loop it replaces confirmed every
 *        open hold on the listing at once.
 *   F-4  `escrows` joins the demo-listing guard. Six other money and trust
 *        tables were already on it and escrow was not.
 *   F-5  CANCELLED is wired into the state machine and given a door that
 *        refuses to cancel anything a hold has already posted against.
 *   F-6  `escrow_hold` gains `hold_days`, clamped exactly as the wallet door
 *        clamps it. Added as a DEFAULTED argument, because PostgREST resolves
 *        an RPC by argument name and a new defaulted name is additive.
 *   F-7  A commission may be taken only where the purpose permits one. Today
 *        that is the agency fee and nothing else, so switching a rate on
 *        cannot start quietly taking a cut of somebody's caution deposit.
 *
 * ALSO: the opening door refuses every purpose except the agency fee. Postgres
 * has no `drop value`, so `first_rent`, `rent_deposit`, `purchase_deposit` and
 * `purchase_balance` cannot leave `escrow_purpose`. They are refused by name
 * instead. `purchase_balance` is refused permanently. `purchase_deposit` is
 * refused until a trustee structure is signed off in writing, which is the
 * founder's solicitor's answer and not a code decision.
 *
 * A FINDING, RECORDED WHERE IT WAS FOUND. `authenticated` holds USAGE on the
 * `private` schema on this project, and four of the escrow functions in it had
 * no ACL at all, which means EXECUTE to PUBLIC. They were never reachable over
 * PostgREST, which only serves `public`, so nothing was exploitable; but the
 * grant was open and rule 21 is about the grant. All four are closed below.
 *
 * RULE 21, BORN LOCKED. Every SECURITY DEFINER function below has its EXECUTE
 * revoked from `public`, `anon` and `authenticated` in this same migration,
 * restated even where `create or replace` would have preserved the grants, and
 * read back at the end of the file.
 */

-- ---------------------------------------------------------------------------
-- F-5. The state machine learns to say no was said.
-- ---------------------------------------------------------------------------

create or replace function private.escrow_transition_is_legal(
  from_state public.escrow_state,
  to_state public.escrow_state
) returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select (from_state, to_state) in (
    ('INITIATED', 'FUNDED'),
    ('FUNDED', 'HELD'),
    ('HELD', 'RELEASE_REQUESTED'),
    ('HELD', 'RELEASED'),
    ('RELEASE_REQUESTED', 'RELEASED'),
    ('HELD', 'REFUNDED'),
    ('RELEASE_REQUESTED', 'REFUNDED'),
    ('INITIATED', 'DISPUTED'),
    ('FUNDED', 'DISPUTED'),
    ('HELD', 'DISPUTED'),
    ('RELEASE_REQUESTED', 'DISPUTED'),
    ('DISPUTED', 'RESOLVED'),
    /* F-5. A proposal nobody accepted, and a funding that never posted. */
    ('INITIATED', 'CANCELLED'),
    ('FUNDED', 'CANCELLED')
  );
$$;

comment on function private.escrow_transition_is_legal(public.escrow_state, public.escrow_state) is
  'The whole escrow state machine, as data. CANCELLED is reachable only from the two states no money has left, and private.escrow_cancel_as refuses even those when a hold entry exists.';

-- ---------------------------------------------------------------------------
-- The two purpose rules, as named functions rather than literals in a body.
-- ---------------------------------------------------------------------------

create or replace function private.escrow_purpose_is_open(p public.escrow_purpose)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  /*
   * The agency fee, and nothing else, for now.
   *
   * part 3 of the research file works through every transaction this platform
   * carries and lands on the agency fee as the one where holding the money
   * until the service is delivered is both useful and proportionate. The
   * purchase deposit passes the same test but only through a trustee, which is
   * a structure nobody has signed yet. The purchase balance never passes it at
   * any size. first_rent and rent_deposit are better served by a record of what
   * was paid than by a hold.
   */
  select p = 'agency_fee';
$$;

create or replace function private.escrow_commission_is_permitted(p public.escrow_purpose)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  /*
   * F-7. A commission is a cut of somebody else's money and it needs a reason.
   *
   * The rate table is a live switch: turning a commission rate on today would
   * start taking a percentage of every release, including a caution deposit
   * going back to the person who lodged it. This says where a cut may ever be
   * taken. The platform charges nothing at today's rates, and this function is
   * what keeps that true by construction rather than by the rate happening to
   * be zero.
   */
  select p = 'agency_fee';
$$;

comment on function private.escrow_commission_is_permitted(public.escrow_purpose) is
  'F-7. Where a commission may ever be taken. Consulted by private.escrow_settle before any rate is read.';

-- ---------------------------------------------------------------------------
-- F-3. An inspection confirms AT MOST ONE escrow.
-- ---------------------------------------------------------------------------

create or replace function private.escrow_inspection_is_a_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  others integer := 0;
begin
  if new.listing_id is null then
    return null;
  end if;

  /*
   * ONE ROW, CHOSEN THE SAME WAY EVERY TIME.
   *
   * The loop this replaces confirmed the payer's side of EVERY open hold this
   * payer had against this listing. An inspection is evidence about one
   * property on one day; it is not consent to release every payment attached
   * to that property. Where a payer genuinely holds more than one, the oldest
   * is confirmed, the rest are left alone, and the payer is told by name what
   * happened, because a silent partial effect is worse than either extreme.
   */
  select * into e
    from public.escrows
   where payer_id = new.user_id
     and listing_id = new.listing_id
     and state in ('HELD', 'RELEASE_REQUESTED')
     and payer_confirmed_at is null
   order by coalesce(held_at, initiated_at), id
   limit 1
   for update;

  if e.id is null then
    return null;
  end if;

  select count(*) into others
    from public.escrows
   where payer_id = new.user_id
     and listing_id = new.listing_id
     and state in ('HELD', 'RELEASE_REQUESTED')
     and payer_confirmed_at is null
     and id <> e.id;

  update public.escrows
     set payer_confirmed_at = new.confirmed_at,
         inspection_confirmation_id = new.id
   where id = e.id
   returning * into e;

  if others > 0 then
    perform private.notify(
      new.user_id, 'wallet',
      'One held payment was confirmed',
      'Your inspection confirmed the earliest payment you are holding on this property. '
        || others::text
        || case when others = 1 then ' other payment is' else ' other payments are' end
        || ' still held and waiting for you.',
      '/escrow/' || e.id::text
    );
  end if;

  if e.payee_confirmed_at is not null then
    perform private.escrow_settle(
      e.id, 'release', 'RELEASED', new.user_id,
      'The payer confirmed the inspection and the payee had already confirmed, so the money went out.'
    );
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- F-4. Escrow joins the demo-listing guard.
-- ---------------------------------------------------------------------------

drop trigger if exists escrows_never_against_a_demo_listing on public.escrows;
create trigger escrows_never_against_a_demo_listing
  before insert on public.escrows
  for each row execute function public.refuse_transaction_on_demo_listing();

comment on trigger escrows_never_against_a_demo_listing on public.escrows is
  'F-4. Six money and trust tables carried this guard and escrow did not, because an escrow hangs off a nullable listing_id and was missed when the set was drawn up.';

-- ---------------------------------------------------------------------------
-- F-7. The commission guard, inside the settlement.
-- ---------------------------------------------------------------------------

create or replace function private.escrow_settle(
  p_escrow uuid,
  p_direction text,
  p_to_state public.escrow_state,
  p_actor uuid,
  p_note text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  target_user uuid;
  target_wallet uuid;
  fee jsonb;
  commission bigint := 0;
  rate_id uuid;
  net bigint;
  entry_kind public.wallet_entry_kind;
begin
  if p_direction not in ('release', 'refund') then
    return jsonb_build_object('status', 'bad_direction');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if e.state in ('RELEASED', 'REFUNDED', 'RESOLVED', 'CANCELLED') then
    return jsonb_build_object('status', 'already_settled', 'state', e.state);
  end if;

  if p_direction = 'release' then
    target_user := e.payee_id;
    entry_kind := 'escrow_release';
    /*
     * F-7. The rate is not even read unless the purpose permits a cut.
     */
    if private.escrow_commission_is_permitted(e.purpose) then
      fee := private.compute_fee('commission', e.amount_minor, now());
      if fee ->> 'status' = 'ok' then
        commission := coalesce((fee ->> 'fee_minor')::bigint, 0);
        rate_id := nullif(fee ->> 'rate_id', '')::uuid;
      end if;
    else
      commission := 0;
      rate_id := null;
    end if;
  else
    /* A refund returns the whole amount. We do not charge somebody a
       commission for getting their own money back. */
    target_user := e.payer_id;
    entry_kind := 'escrow_refund';
    commission := 0;
    rate_id := null;
  end if;

  net := e.amount_minor - commission;
  if net < 0 then
    return jsonb_build_object('status', 'bad_commission');
  end if;

  target_wallet := private.wallet_for_update(target_user);
  if target_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  insert into public.wallet_entries
    (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values
    (target_wallet, entry_kind, 'credit', net,
     'escrow:' || p_direction || ':' || e.id::text, 'COMPLETED',
     jsonb_build_object(
       'note', case when p_direction = 'release'
                    then 'Released to you on Vallo'
                    else 'Refunded to you on Vallo' end,
       'escrow_id', e.id,
       'purpose', e.purpose,
       'listing_id', e.listing_id,
       'gross_minor', e.amount_minor,
       'commission_minor', commission,
       'settled_by', p_actor,
       'reason', p_note
     ));

  if commission > 0 then
    insert into public.platform_revenue
      (source, amount_minor, escrow_id, listing_id, rate_id, reference, metadata)
    values
      ('escrow_commission', commission, e.id, e.listing_id, rate_id,
       'escrow:commission:' || e.id::text,
       jsonb_build_object(
         'gross_minor', e.amount_minor,
         'net_to_payee_minor', net,
         'payer_id', e.payer_id,
         'payee_id', e.payee_id,
         'settled_by', p_actor
       ));
  end if;

  update public.escrows
     set state = p_to_state,
         released_at = case when p_direction = 'release' then now() else released_at end,
         refunded_at = case when p_direction = 'refund' then now() else refunded_at end,
         resolved_at = case when p_to_state = 'RESOLVED' then now() else resolved_at end,
         resolved_by = case when p_to_state = 'RESOLVED' then p_actor else resolved_by end,
         resolution_note = case when p_to_state = 'RESOLVED' then p_note else resolution_note end,
         commission_minor = commission,
         commission_rate_id = rate_id
   where id = e.id;

  perform private.notify(
    target_user, 'wallet',
    case when p_direction = 'release' then 'A held payment reached your balance' else 'A held payment was returned to you' end,
    'The money is in your Vallo balance now.',
    '/escrow/' || e.id::text
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', e.id,
    'direction', p_direction,
    'state', p_to_state,
    'gross_minor', e.amount_minor,
    'commission_minor', commission,
    'net_minor', net
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- F-6. The service path gets the same hold window the wallet path has.
-- ---------------------------------------------------------------------------

create or replace function public.escrow_hold(
  escrow_id uuid,
  payer_user uuid,
  amount bigint,
  hold_reference text,
  note text default null,
  hold_days integer default 21
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
  payer_wallet uuid;
  spendable bigint;
  window_days integer := greatest(1, least(coalesce(hold_days, 21), 180));
begin
  if escrow_id is null or payer_user is null or hold_reference is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if amount is null or amount <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  select * into e from public.escrows where id = escrow_id for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Asked and answered. Checked BEFORE the state, because a hold that posted
  -- and then released is still a hold that posted, and the caller retrying it
  -- needs to hear that rather than a refusal it might respond to by opening a
  -- second escrow.
  if exists (select 1 from public.wallet_entries w where w.reference = hold_reference) then
    return jsonb_build_object('status', 'duplicate', 'state', e.state, 'amount_minor', e.amount_minor);
  end if;

  if e.payer_id <> payer_user then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;
  if e.state <> 'INITIATED' then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state);
  end if;
  if amount <> e.amount_minor then
    return jsonb_build_object('status', 'wrong_state', 'state', e.state, 'amount_minor', e.amount_minor);
  end if;

  payer_wallet := private.wallet_for_update(e.payer_id);
  if payer_wallet is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  spendable := private.wallet_spendable_locked(payer_wallet);
  if spendable < e.amount_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', e.amount_minor,
      'state', e.state
    );
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'escrow_hold', 'debit', e.amount_minor, hold_reference, 'COMPLETED',
       jsonb_build_object(
         'note', coalesce(note, 'Held for a transaction on Vallo'),
         'escrow_id', e.id,
         'purpose', e.purpose,
         'payee_id', e.payee_id,
         'listing_id', e.listing_id
       ));
  exception when unique_violation then
    -- The belt to the check above's braces: two retries racing each other.
    return jsonb_build_object(
      'status', 'duplicate', 'state', e.state, 'amount_minor', e.amount_minor
    );
  end;

  update public.escrows set state = 'FUNDED', funded_at = now() where id = e.id;
  update public.escrows
     set state = 'HELD',
         held_at = now(),
         auto_release_at = now() + make_interval(days => window_days)
   where id = e.id;

  perform private.notify(
    e.payee_id, 'wallet', 'Money is held for you',
    'A payment is now held for you. It reaches your balance when both sides confirm, or on its own on the date shown.',
    '/escrow/' || e.id::text
  );

  return jsonb_build_object(
    'status', 'ok', 'state', 'HELD', 'amount_minor', e.amount_minor,
    'escrow_id', e.id,
    'auto_release_at', now() + make_interval(days => window_days)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- F-5, the door. Declining a proposal.
-- ---------------------------------------------------------------------------

create or replace function public.escrow_cancel_as(
  p_actor uuid,
  p_escrow uuid,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.escrows;
begin
  if p_actor is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_escrow is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  select * into e from public.escrows where id = p_escrow for update;
  if e.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_actor <> e.payer_id and p_actor <> e.payee_id then
    return jsonb_build_object('status', 'not_a_party');
  end if;
  if e.state = 'CANCELLED' then
    /* A second tap is not a second cancellation. */
    return jsonb_build_object('status', 'ok', 'escrow_id', e.id, 'state', 'CANCELLED',
                              'amount_minor', e.amount_minor);
  end if;
  if e.state not in ('INITIATED', 'FUNDED') then
    return jsonb_build_object('status', 'not_cancellable', 'state', e.state);
  end if;

  /*
   * THE LINE THIS FUNCTION EXISTS FOR.
   *
   * FUNDED is legal in the state machine because the two updates that carry an
   * escrow from INITIATED to HELD pass through it, and a crash between them
   * would strand a row there. But a hold that POSTED is money that left a
   * balance, and money that left a balance has to be refunded rather than
   * cancelled. So the state is not the test: the ledger is.
   */
  if exists (
    select 1 from public.wallet_entries w
     where w.kind = 'escrow_hold'
       and (w.metadata ->> 'escrow_id') = e.id::text
  ) then
    return jsonb_build_object('status', 'already_funded', 'state', e.state);
  end if;

  update public.escrows
     set state = 'CANCELLED',
         resolution_note = coalesce(nullif(btrim(coalesce(p_reason, '')), ''), resolution_note),
         resolved_by = p_actor,
         resolved_at = now()
   where id = e.id;

  perform private.notify(
    case when p_actor = e.payer_id then e.payee_id else e.payer_id end,
    'wallet',
    'A proposed payment was withdrawn',
    'Nothing was taken from either balance.',
    '/escrow/' || e.id::text
  );

  return jsonb_build_object(
    'status', 'ok', 'escrow_id', e.id, 'state', 'CANCELLED', 'amount_minor', e.amount_minor
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The opening door refuses every purpose but the agency fee.
-- ---------------------------------------------------------------------------

create or replace function public.escrow_fund_from_wallet_as(
  p_actor uuid,
  p_payee uuid,
  p_listing uuid,
  p_purpose public.escrow_purpose,
  p_amount_minor bigint,
  p_reference text,
  p_hold_days integer default 21
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payer uuid := p_actor;
  payer_wallet uuid;
  spendable bigint;
  escrow_id uuid;
  hold_days integer := greatest(1, least(coalesce(p_hold_days, 21), 180));
begin
  if payer is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_payee is null or p_purpose is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_reference is null or char_length(btrim(p_reference)) = 0 then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_payee = payer then
    return jsonb_build_object('status', 'same_party');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if not private.escrow_purpose_is_open(p_purpose) then
    return jsonb_build_object('status', 'purpose_not_open', 'purpose', p_purpose);
  end if;

  payer_wallet := private.wallet_for_update(payer);
  if payer_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  spendable := private.wallet_spendable_locked(payer_wallet);
  if spendable < p_amount_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', p_amount_minor
    );
  end if;

  insert into public.escrows (payer_id, payee_id, listing_id, purpose, amount_minor)
  values (payer, p_payee, p_listing, p_purpose, p_amount_minor)
  returning id into escrow_id;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'escrow_hold', 'debit', p_amount_minor, btrim(p_reference), 'COMPLETED',
       jsonb_build_object(
         'note', 'Held for a transaction on Vallo',
         'escrow_id', escrow_id,
         'purpose', p_purpose,
         'payee_id', p_payee,
         'listing_id', p_listing
       ));
  exception when unique_violation then
    /*
     * E-8, THE RETRY ASYMMETRY. This door used to raise where escrow_hold
     * answers. Both now answer, in the same word, so a caller retrying after a
     * dropped connection reads one vocabulary and not two.
     */
    return jsonb_build_object('status', 'duplicate', 'reference', btrim(p_reference));
  end;

  update public.escrows
     set state = 'FUNDED', funded_at = now()
   where id = escrow_id;

  update public.escrows
     set state = 'HELD',
         held_at = now(),
         auto_release_at = now() + make_interval(days => hold_days)
   where id = escrow_id;

  perform private.notify(
    p_payee, 'wallet', 'Money is held for you',
    'A payment is now held for you. It reaches your balance when both sides confirm, or on its own on the date shown.',
    '/escrow/' || escrow_id::text
  );

  return jsonb_build_object(
    'status', 'ok',
    'escrow_id', escrow_id,
    'amount_minor', p_amount_minor,
    'state', 'HELD',
    'auto_release_at', now() + make_interval(days => hold_days)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RULE 21. Born locked, restated, never inherited.
-- ---------------------------------------------------------------------------

revoke all on function private.escrow_transition_is_legal(public.escrow_state, public.escrow_state) from public, anon, authenticated;
revoke all on function private.escrow_purpose_is_open(public.escrow_purpose) from public, anon, authenticated;
revoke all on function private.escrow_commission_is_permitted(public.escrow_purpose) from public, anon, authenticated;
revoke all on function private.escrow_inspection_is_a_signal() from public, anon, authenticated;
/* The two trigger functions were BORN PUBLIC in August and nobody noticed,
   because a trigger fires on its owner's authority whatever the grants say and
   nothing ever failed. `private` has no USAGE for either role, so neither was
   reachable, but rule 21 is about the grant and not about the second lock that
   happens to be holding. */
revoke all on function private.escrow_audit_insert() from public, anon, authenticated;
revoke all on function private.escrow_guard_transition() from public, anon, authenticated;
revoke all on function private.escrow_sweep_timeouts() from public, anon, authenticated;
revoke all on function private.escrow_settle(uuid, text, public.escrow_state, uuid, text) from public, anon, authenticated;
revoke all on function public.escrow_hold(uuid, uuid, bigint, text, text, integer) from public, anon, authenticated;
revoke all on function public.escrow_cancel_as(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, public.escrow_purpose, bigint, text, integer) from public, anon, authenticated;

grant execute on function public.escrow_hold(uuid, uuid, bigint, text, text, integer) to service_role;
grant execute on function public.escrow_cancel_as(uuid, uuid, text) to service_role;
grant execute on function public.escrow_fund_from_wallet_as(uuid, uuid, uuid, public.escrow_purpose, bigint, text, integer) to service_role;

/*
 * F-6 leaves the five-argument escrow_hold behind as a separate overload,
 * which would make the PostgREST call ambiguous and, worse, let a caller reach
 * a body that ignores hold_days. It is dropped by its exact old signature.
 */
drop function if exists public.escrow_hold(uuid, uuid, bigint, text, text);

-- ---------------------------------------------------------------------------
-- READ THE GRANTS BACK. A migration that claims a revoke and does not check it
-- is a green light nobody pulled on.
-- ---------------------------------------------------------------------------

do $$
declare
  leak text;
begin
  select string_agg(p.oid::regprocedure::text || ' -> ' || r.rolname, ', ')
    into leak
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) as r(rolname)
   /*
    * THE BRACKETS ARE LOAD-BEARING. Written without them, `A or B and C`
    * parses as `A or (B and C)`, the private-schema half carries no privilege
    * test at all, and the check reports every escrow function in `private` as
    * leaking whatever its grants say. It did exactly that on the first run of
    * this migration and refused it. A check that cries wolf is as useless as
    * one that sleeps, and this one had to be fixed before it was believed.
    */
   where ((n.nspname = 'private' and p.proname like 'escrow%')
       or (n.nspname = 'public' and p.proname in (
            'escrow_hold', 'escrow_open', 'escrow_release', 'escrow_refund',
            'escrow_cancel_as',
            'escrow_fund_from_wallet', 'escrow_fund_from_wallet_as',
            'escrow_confirm', 'escrow_confirm_as',
            'escrow_request_release', 'escrow_request_release_as',
            'escrow_raise_dispute', 'escrow_raise_dispute_as')))
     and has_function_privilege(r.rolname, p.oid, 'EXECUTE');

  if leak is not null then
    raise exception 'RULE 21 VIOLATED. These are reachable by a signed-in stranger: %', leak;
  end if;
end;
$$;
