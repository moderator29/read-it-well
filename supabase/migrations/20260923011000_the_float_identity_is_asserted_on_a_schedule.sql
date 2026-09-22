/*
 * INVARIANT I-2, ASSERTED. IT NEVER HAS BEEN, IN EITHER DIRECTION.
 *
 * The research file calls this the single most important new check and records
 * that the identity "has never been asserted anywhere in this codebase". It is
 * the float reconciliation: the escrow money the LEDGER says is held must
 * equal the escrow money the AGREEMENT ROWS say is held, to the kobo, always.
 *
 * Under the structure this platform is heading for, reconciliation is not
 * against Paystack. Money enters through `rm-fund-` and the escrow leg is
 * internal, so the escrow ledger has nothing external to agree with. It has to
 * agree with ITSELF, and nothing has ever asked it to.
 *
 * SEVEN INVARIANTS, NOT ONE. I-2 is the headline, but a float that balances
 * while a wallet is overdrawn or an agreement is holding money the ledger
 * never took is not actually sound. The full list, from 5.4:
 *
 *   I-1  No wallet's derived balance may ever be negative.
 *        `private.wallets_overdrawn()` has existed since August and NOTHING
 *        HAS EVER CALLED IT ON A SCHEDULE. It is called here.
 *   I-2  The float, both ways, equal.
 *   I-3a Every live agreement has a hold entry.
 *   I-3b No agreement has two hold entries.
 *   I-3c Every settled agreement has its settlement entry.
 *   I-8  Commission plus the payee's net equals the gross, exactly, with no
 *        rounding loss. Verified once by hand in August in a rolled-back
 *        block. Standing now.
 *   Plus: nothing stuck in FUNDED, which should be impossible because the two
 *        updates that pass through it are in one transaction, and is therefore
 *        a crash signature rather than a slow path.
 *
 * WHAT IT DOES WHEN IT FAILS. It writes a `risk_alerts` row an operator sees,
 * at severity high, and an audit row carrying the numbers. It does NOT raise,
 * because a scheduled job that raises is a job whose failure is visible only
 * in a log nobody reads, and because raising would roll back the very audit
 * row that says what went wrong.
 *
 * WHAT IT DOES WHEN IT PASSES. It writes an audit row too. A check that is
 * silent on success cannot be told from a check that is not running, and this
 * build has already found a scheduler reporting success for a reply it never
 * read.
 *
 * PROVED, NOT ASSUMED. `scripts/probes/escrow_invariants.sql` seeds three real
 * breaches against the live database inside a transaction that rolls back, and
 * asserts each one is caught and that a sound agreement is not. It found a bug
 * in this function on its first run.
 */

create or replace function private.escrow_invariants_check()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb := private.escrow_float_components();
  breaches jsonb := '[]'::jsonb;
  detail jsonb;
  n bigint;
  b jsonb;
  alert_title text;
begin
  -- I-2. The float, both ways.
  if (c ->> 'difference_minor')::bigint <> 0 then
    breaches := breaches || jsonb_build_array(jsonb_build_object(
      'invariant', 'I-2',
      'what', 'The escrow float derived from the ledger disagrees with the float derived from the agreement rows.',
      'ledger_float_minor', (c ->> 'ledger_float_minor')::bigint,
      'escrow_float_minor', (c ->> 'escrow_float_minor')::bigint,
      'difference_minor', (c ->> 'difference_minor')::bigint
    ));
  end if;

  -- I-1. Nobody may be overdrawn.
  select count(*), coalesce(jsonb_agg(jsonb_build_object('wallet_id', w.wallet_id, 'balance_minor', w.balance_minor)), '[]'::jsonb)
    into n, detail
    from private.wallets_overdrawn() w;
  if n > 0 then
    breaches := breaches || jsonb_build_array(jsonb_build_object(
      'invariant', 'I-1', 'what', 'A wallet balance is negative.', 'count', n, 'wallets', detail
    ));
  end if;

  -- I-3a. A live agreement with no hold entry.
  select count(*), coalesce(jsonb_agg(e.id), '[]'::jsonb) into n, detail
    from public.escrows e
   where e.state in ('FUNDED', 'HELD', 'RELEASE_REQUESTED')
     and not exists (
       select 1 from public.wallet_entries w
        where w.kind = 'escrow_hold' and (w.metadata ->> 'escrow_id') = e.id::text);
  if n > 0 then
    breaches := breaches || jsonb_build_array(jsonb_build_object(
      'invariant', 'I-3a', 'what', 'An agreement says it is holding money the ledger never took.', 'count', n, 'escrow_ids', detail
    ));
  end if;

  -- I-3b. Two hold entries on one agreement.
  select count(*), coalesce(jsonb_agg(x.escrow_id), '[]'::jsonb) into n, detail
    from (
      select (w.metadata ->> 'escrow_id') as escrow_id
        from public.wallet_entries w
       where w.kind = 'escrow_hold' and w.metadata ? 'escrow_id'
       group by 1 having count(*) > 1
    ) x;
  if n > 0 then
    breaches := breaches || jsonb_build_array(jsonb_build_object(
      'invariant', 'I-3b', 'what', 'One agreement carries more than one hold. The same money was taken twice.', 'count', n, 'escrow_ids', detail
    ));
  end if;

  -- I-3c. A settled agreement with no settlement entry.
  select count(*), coalesce(jsonb_agg(e.id), '[]'::jsonb) into n, detail
    from public.escrows e
   where e.state in ('RELEASED', 'REFUNDED', 'RESOLVED')
     and not exists (
       select 1 from public.wallet_entries w
        where w.kind in ('escrow_release', 'escrow_refund')
          and (w.metadata ->> 'escrow_id') = e.id::text);
  if n > 0 then
    breaches := breaches || jsonb_build_array(jsonb_build_object(
      'invariant', 'I-3c', 'what', 'An agreement is settled and nobody was paid.', 'count', n, 'escrow_ids', detail
    ));
  end if;

  -- I-8. Net plus commission equals gross, exactly.
  select count(*), coalesce(jsonb_agg(jsonb_build_object(
           'escrow_id', e.id, 'gross_minor', e.amount_minor,
           'net_minor', w.amount_minor, 'commission_minor', coalesce(e.commission_minor, 0))), '[]'::jsonb)
    into n, detail
    from public.escrows e
    join public.wallet_entries w
      on w.kind in ('escrow_release', 'escrow_refund')
     and (w.metadata ->> 'escrow_id') = e.id::text
   where w.amount_minor + coalesce(e.commission_minor, 0) <> e.amount_minor;
  if n > 0 then
    breaches := breaches || jsonb_build_array(jsonb_build_object(
      'invariant', 'I-8', 'what', 'A settlement lost or invented kobo between the gross, the commission and the net.', 'count', n, 'settlements', detail
    ));
  end if;

  -- Stuck in FUNDED. Two updates in one transaction pass through it, so a row
  -- that sits there for a minute is a crash signature and not a slow path.
  select count(*), coalesce(jsonb_agg(e.id), '[]'::jsonb) into n, detail
    from public.escrows e
   where e.state = 'FUNDED' and e.funded_at < now() - interval '1 minute';
  if n > 0 then
    breaches := breaches || jsonb_build_array(jsonb_build_object(
      'invariant', 'STUCK', 'what', 'An agreement has been in FUNDED for more than a minute, which the code cannot produce on a healthy path.', 'count', n, 'escrow_ids', detail
    ));
  end if;

  /*
   * One open alert per breach kind, never one per pass. The comparison is on
   * `ra.entity_id`, which is the invariant's name, and never on a bare `title`
   * that a declared variable also answers to. THE FIRST REVISION OF THIS
   * FUNCTION DID EXACTLY THAT and the probe below caught it; the note is in
   * the next migration.
   */
  for b in select * from jsonb_array_elements(breaches) loop
    alert_title := 'Escrow invariant ' || (b ->> 'invariant') || ' is broken';
    if not exists (
      select 1 from public.risk_alerts ra
       where ra.status = 'open'
         and ra.entity_type = 'escrow_invariant'
         and ra.entity_id = (b ->> 'invariant')
    ) then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', alert_title, (b ->> 'what') || ' ' || b::text, 'escrow_invariant', b ->> 'invariant');
    end if;
  end loop;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    null,
    case when jsonb_array_length(breaches) = 0 then 'escrow.invariants.held' else 'escrow.invariants.broken' end,
    'escrow_invariants', null,
    jsonb_build_object('components', c, 'breaches', breaches, 'breach_count', jsonb_array_length(breaches))
  );

  return jsonb_build_object(
    'ok', jsonb_array_length(breaches) = 0,
    'breach_count', jsonb_array_length(breaches),
    'breaches', breaches,
    'components', c
  );
end;
$$;

comment on function private.escrow_invariants_check() is
  'Asserts the escrow float identity I-2 and six sister invariants. Writes a high risk_alerts row per breach kind and an audit row on every pass, whether it passed or failed.';

revoke all on function private.escrow_invariants_check() from public, anon, authenticated;

do $$
begin
  if has_function_privilege('anon', 'private.escrow_invariants_check()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.escrow_invariants_check()', 'EXECUTE') then
    raise exception 'RULE 21 VIOLATED on private.escrow_invariants_check()';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hourly, at :23. The escrow sweeper is at :17, the reconciliation at :47, the
-- rate limit purge at :30 and the stale hold sweep on the quarter hours. :23
-- is clear of all of them and sits six minutes after the sweeper, which is the
-- job most likely to have broken the identity if anything did.
-- ---------------------------------------------------------------------------

select cron.unschedule('vallo_escrow_invariants')
 where exists (select 1 from cron.job where jobname = 'vallo_escrow_invariants');

select cron.schedule(
  'vallo_escrow_invariants',
  '23 * * * *',
  $job$ select private.escrow_invariants_check(); $job$
);
