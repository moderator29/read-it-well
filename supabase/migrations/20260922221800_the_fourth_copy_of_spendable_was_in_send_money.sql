/*
 * F-9, continued. THE RESEARCH FILE NAMED TWO COPIES. THERE WERE THREE.
 *
 * `docs/research/ESCROW_END_TO_END_RESEARCH.md:5.1` records the withdrawal
 * path and the booking path as carrying their own inline spendable arithmetic,
 * with `private.wallet_spendable_locked` as the one true definition. Both were
 * fixed in `20260922221500`. That migration then asserted that no function
 * anywhere still contained the phrase `settled - held`, and the assertion
 * failed, which is how this one was found: `private.transfer_between_wallets`,
 * the send-money path, carries a third copy. It spells the comparison
 * `if (settled - held) < amount` rather than assigning to a `spendable`
 * variable, which is why a search for the assignment would have missed it.
 *
 * THREE COPIES WAS ALREADY THE DEFECT. FOUR WAS WORSE AND NOBODY KNEW.
 *
 * Same method as 20260922221500: the live definition is rewritten, the
 * expected text is asserted before anything is touched, and the result is
 * asserted afterwards.
 */

do $f9b$
declare
  target constant text := 'private.transfer_between_wallets(uuid, uuid, bigint, text, text, text)';
  old_block constant text := $old$
  select coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end), 0)
    into settled
    from public.wallet_entries
   where wallet_id = sender_wallet and status = 'COMPLETED';

  select coalesce(sum(amount_minor), 0)
    into held
    from public.wallet_entries
   where wallet_id = sender_wallet and status = 'PENDING' and direction = 'debit';

  if (settled - held) < amount then
$old$;
  new_block constant text := $new$
  if private.wallet_spendable_locked(sender_wallet) < amount then
$new$;
  def text;
  rewritten text;
  pattern text;
begin
  def := pg_get_functiondef(target::regprocedure);

  if position('private.wallet_spendable_locked(' in def) > 0 then
    raise notice 'F-9b: % already calls the shared function, left alone', target;
    return;
  end if;

  pattern := regexp_replace(old_block, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g');
  pattern := regexp_replace(btrim(pattern), '\s+', '\\s+', 'g');
  rewritten := regexp_replace(def, pattern, btrim(new_block), 'g');

  if rewritten = def then
    raise exception
      'F-9b FAILED. The inline spendable block in % is not the text this migration expected, so NOTHING was changed.', target;
  end if;

  execute rewritten;

  def := pg_get_functiondef(target::regprocedure);
  if position('private.wallet_spendable_locked(sender_wallet)' in def) = 0
     or position('settled - held' in def) > 0 then
    raise exception 'F-9b FAILED. The rewrite did not take on %.', target;
  end if;
end;
$f9b$;

revoke all on function private.transfer_between_wallets(uuid, uuid, bigint, text, text, text) from public, anon, authenticated;

/*
 * THE ASSERTION THAT FOUND THIS ONE, NOW STANDING FOR THE WHOLE DATABASE.
 *
 * Any future function that reinvents the arithmetic fails this migration's
 * descendants rather than shipping quietly, because this same block is what a
 * later migration will copy.
 */
do $check$
declare
  strays text;
begin
  select string_agg(n.nspname || '.' || p.proname, ', ')
    into strays
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prokind = 'f'
     and p.proname <> 'wallet_spendable_locked'
     and pg_get_functiondef(p.oid) ~ 'status\s*=\s*''PENDING''\s*and\s*direction\s*=\s*''debit''';

  if strays is not null then
    raise exception
      'SPENDABLE IS DEFINED IN MORE THAN ONE PLACE AGAIN: %. There is exactly one definition and it is private.wallet_spendable_locked.',
      strays;
  end if;
end;
$check$;
