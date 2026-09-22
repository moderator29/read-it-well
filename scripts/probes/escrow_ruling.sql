-- T-14. THE ADMIN RULING, AGAINST THE LIVE DATABASE, ROLLED BACK.
--
-- Run through `mcp__Supabase__apply_migration`. It ENDS IN A DELIBERATE
-- `raise exception`, so the whole transaction rolls back and nothing reaches a
-- live product table, including the admin role it grants itself.
--
-- IT FORGES A CLAIM, WHICH IS THE ONLY WAY TO TEST THIS AT ALL.
-- `escrow_admin_resolve` reads `auth.uid()` and that is null for the service
-- role, so without `set_config('request.jwt.claims', ...)` the only outcome
-- reachable is `forbidden`. The forged claim and the granted role both vanish
-- with the rollback.
--
-- What it proves:
--   A real hold posts, the float balances, and the payer is down exactly the
--   amount held.
--   A nineteen character ruling is refused and the function NAMES its floor.
--   An invented direction is refused.
--   A real ruling settles the agreement to RESOLVED.
--   The ruling reaches BOTH parties WORD FOR WORD and links to the agreement
--   rather than to a balance.
--   No notification carries the banned word.
--   A second ruling on a settled agreement is refused.
--   The float still balances afterwards and the refund returns the seed to
--   the kobo.
--
-- TWO EARLIER RUNS FAILED AND BOTH FAILURES WERE THE PROBE'S, NOT THE
-- PRODUCT'S. They are in escrow_ruling.log because the first one is the
-- clearest demonstration in this build that I-2 is connected to something.

do $probe$
declare
  u1 uuid; u2 uuid; esc uuid; r jsonb; c integer; w uuid; before_minor bigint;
  ruling constant text :=
    'Neither side produced a record of a viewing, so the money goes back to the payer.';
begin
  select id into u1 from auth.users order by created_at limit 1;
  select id into u2 from auth.users order by created_at desc limit 1;
  if u1 is null or u2 is null or u1 = u2 then
    raise exception 'PROBE CANNOT RUN: needs two distinct auth users';
  end if;

  insert into public.user_roles (user_id, role) values (u1, 'admin') on conflict do nothing;
  perform set_config('request.jwt.claims',
    json_build_object('sub', u1::text, 'role', 'authenticated')::text, true);
  if auth.uid() <> u1 then
    raise exception 'PROBE CANNOT RUN: the forged claim did not reach auth.uid()';
  end if;

  insert into public.wallets (user_id) values (u1), (u2) on conflict (user_id) do nothing;
  select id into w from public.wallets where user_id = u1;

  /*
   * MEASURE A DELTA, NEVER AN ABSOLUTE. An earlier run asserted the payer
   * ended at exactly 500,000 and found 600,000, because this is a LIVE wallet
   * with a real balance already in it. A probe that assumes an empty account
   * fails on a real database and passes on an empty one, which is the wrong
   * way round.
   */
  before_minor := private.wallet_spendable_locked(w);

  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (w, 'deposit', 'credit', 500000, 'probe-seed-' || w::text, 'COMPLETED');

  r := public.escrow_fund_from_wallet_as(u1, u2, null, 'agency_fee', 500000, 'probe-esc-rule-hold', 21);
  if (r ->> 'status') <> 'ok' then
    raise exception 'PROBE CANNOT RUN: the funding door refused: %', r;
  end if;
  esc := (r ->> 'escrow_id')::uuid;

  if (private.escrow_invariants_check() ->> 'ok')::boolean is not true then
    raise exception 'PROBE FAILED at the hold. The float did not balance: %',
      private.escrow_invariants_check() ->> 'breaches';
  end if;
  if private.wallet_spendable_locked(w) <> before_minor then
    raise exception 'PROBE FAILED. The hold left the payer at a delta of %, not 0.',
      private.wallet_spendable_locked(w) - before_minor;
  end if;

  r := public.escrow_raise_dispute_as(u1, esc, 'The agent never showed up for the viewing.');
  if (r ->> 'status') <> 'ok' then
    raise exception 'PROBE CANNOT RUN: the dispute door refused: %', r;
  end if;

  r := public.escrow_admin_resolve(esc, 'refund', repeat('a', 19));
  if (r ->> 'status') <> 'needs_a_reason' or (r ->> 'minimum') <> '20' then
    raise exception 'PROBE FAILED. A 19 character ruling was accepted, or the floor is unnamed: %', r;
  end if;

  r := public.escrow_admin_resolve(esc, 'keep', ruling);
  if (r ->> 'status') <> 'bad_direction' then
    raise exception 'PROBE FAILED. An invented direction was accepted: %', r;
  end if;

  r := public.escrow_admin_resolve(esc, 'refund', ruling);
  if (r ->> 'status') <> 'ok' then
    raise exception 'PROBE FAILED. A well formed ruling was refused: %', r;
  end if;
  if (select state from public.escrows where id = esc) <> 'RESOLVED' then
    raise exception 'PROBE FAILED. The agreement did not reach RESOLVED.';
  end if;

  select count(*) into c from public.notifications
   where user_id in (u1, u2) and body = ruling and href = '/escrow/' || esc::text;
  if c <> 2 then
    raise exception 'PROBE FAILED. The ruling reached % parties verbatim, not 2.', c;
  end if;

  select count(*) into c from public.notifications
   where user_id in (u1, u2) and (lower(title) like '%escrow%' or lower(body) like '%escrow%');
  if c <> 0 then
    raise exception 'PROBE FAILED. The banned word reached a person in % notification(s).', c;
  end if;

  r := public.escrow_admin_resolve(esc, 'release', 'Changed my mind about who was right here.');
  if (r ->> 'status') <> 'not_disputed' then
    raise exception 'PROBE FAILED. A second ruling was accepted: %', r;
  end if;

  if (private.escrow_invariants_check() ->> 'ok')::boolean is not true then
    raise exception 'PROBE FAILED. The float stopped balancing after the ruling: %',
      private.escrow_invariants_check() ->> 'breaches';
  end if;

  if private.wallet_spendable_locked(w) - before_minor <> 500000 then
    raise exception 'PROBE FAILED. The payer is up % kobo on the seed of 500000 after a full refund.',
      private.wallet_spendable_locked(w) - before_minor;
  end if;

  raise exception
    'PROBE ALL PASS. A real hold posted, the float balanced and the payer was down exactly the amount held. A 19 character ruling refused and the function named its floor of 20. An invented direction refused. A real ruling settled the agreement to RESOLVED, reached BOTH parties word for word, linked to the agreement rather than to a balance, and carried no banned word. A second ruling refused. The float still balanced and the refund returned the seed to the kobo. Rolling back.';
end;
$probe$;
