/*
 * F-9. Spendable arithmetic in ONE place.
 *
 * Split out of `20260922221000_escrow_the_seven_remaining_fixes_before_any_product`
 * because it is the only part of that work that touches a money function
 * outside escrow, and a change to the booking and withdrawal doors deserves to
 * be revertable on its own.
 */

-- ---------------------------------------------------------------------------
-- F-9. Spendable arithmetic in ONE place.
--
-- Two money doors carried their own inline copy of "COMPLETED credits minus
-- COMPLETED debits minus PENDING debits". A third, the escrow door, already
-- calls `private.wallet_spendable_locked`. Three copies of one definition is
-- three chances for them to drift, and the drift would be silent and would be
-- about money.
--
-- The replacement is done on the LIVE definition rather than on a retyped
-- copy, because retyping a five kilobyte money function by hand to change four
-- lines of it is how a body loses a check nobody notices. The block asserts the
-- exact text it expects before it touches anything, and asserts the result
-- afterwards, so it cannot quietly do nothing.
-- ---------------------------------------------------------------------------

do $f9$
declare
  /* The two inline copies, written out as they stand in the live bodies. */
  booking_old constant text := $old1$
  select coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end), 0)
    into settled
    from public.wallet_entries
   where wallet_id = payer_wallet and status = 'COMPLETED';

  select coalesce(sum(amount_minor), 0)
    into held
    from public.wallet_entries
   where wallet_id = payer_wallet and status = 'PENDING' and direction = 'debit';

  spendable := settled - held;
$old1$;
  booking_new constant text := $new1$
  spendable := private.wallet_spendable_locked(payer_wallet);
$new1$;

  withdrawal_old constant text := $old2$
  select coalesce(sum(
           case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end
         ), 0)
    into settled
  from public.wallet_entries e
  where e.wallet_id = target_wallet and e.status = 'COMPLETED';

  -- Pending debits are money already committed to an in-flight withdrawal.
  -- Spendable has to exclude them or the same naira funds two payouts.
  select coalesce(sum(e.amount_minor), 0) into held
  from public.wallet_entries e
  where e.wallet_id = target_wallet
    and e.status = 'PENDING'
    and e.direction = 'debit';

  spendable := settled - held;
$old2$;
  withdrawal_new constant text := $new2$
  spendable := private.wallet_spendable_locked(target_wallet);
$new2$;

  jobs text[][] := array[
    array['private.pay_booking_from_wallet(uuid, uuid, text)', booking_old, booking_new],
    array['public.hold_wallet_withdrawal(uuid, bigint, text, jsonb)', withdrawal_old, withdrawal_new]
  ];
  i integer;
  target text;
  def text;
  rewritten text;
  pattern text;
begin
  for i in 1 .. array_length(jobs, 1) loop
    target := jobs[i][1];
    def := pg_get_functiondef(target::regprocedure);

    if position('private.wallet_spendable_locked(' in def) > 0 then
      raise notice 'F-9: % already calls the shared function, left alone', target;
      continue;
    end if;

    /*
     * The literal, turned into a whitespace-tolerant pattern: every regex
     * metacharacter escaped, then every run of whitespace widened to \s+. A
     * migration that depended on the exact number of spaces in somebody else's
     * layout would be a trap for the next person who reformats it.
     */
    pattern := regexp_replace(jobs[i][2], '([.^$*+?()\[\]{}|\\])', '\\\1', 'g');
    pattern := regexp_replace(btrim(pattern), '\s+', '\\s+', 'g');

    rewritten := regexp_replace(def, pattern, btrim(jobs[i][3]), 'g');

    if rewritten = def then
      raise exception
        'F-9 FAILED on %. The inline spendable block is not the text this migration expected, so NOTHING was changed. Read the live body and correct the migration.',
        target;
    end if;

    execute rewritten;

    def := pg_get_functiondef(target::regprocedure);
    if position('private.wallet_spendable_locked(' in def) = 0
       or position('settled - held' in def) > 0 then
      raise exception 'F-9 FAILED on %. The rewrite did not take.', target;
    end if;
    raise notice 'F-9: % now calls private.wallet_spendable_locked', target;
  end loop;
end;
$f9$;

/* The two rewritten bodies keep their own grants, which this restates. */
revoke all on function private.pay_booking_from_wallet(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.hold_wallet_withdrawal(uuid, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.hold_wallet_withdrawal(uuid, bigint, text, jsonb) to service_role;
