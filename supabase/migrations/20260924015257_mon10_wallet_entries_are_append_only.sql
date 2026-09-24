-- MON-10 (step 4): the ledger is append-only in the database, not only in the
-- application. (Steps 1-3, the API-role revokes, were applied in
-- 20260924002038.) Every role, the service role and definer functions
-- included, now meets a BEFORE UPDATE OR DELETE trigger on wallet_entries:
--   - an entry is never deleted;
--   - id, wallet, kind, direction, amount and created_at never change;
--   - status moves only PENDING -> COMPLETED | FAILED | REVERSED;
--   - the money-bearing metadata keys (escrow_id, pot_id, booking_id,
--     gross_minor, commission_minor, reversal_of, payee_id, purpose) never
--     change or disappear once written; captions and personal details may
--     (labels, and the account purge's scrub);
--   - the one sanctioned correction of a COMPLETED entry is a super admin's
--     escrow ruling reversal (ESC-07), which sets vallo.escrow_reversal for its
--     transaction: an escrow release or refund credit may then become REVERSED,
--     its reference suffixed ':reversed:<ruling>'.
-- A correction is otherwise a new entry.

create or replace function private.guard_wallet_entry_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reversing boolean := coalesce(current_setting('vallo.escrow_reversal', true), '') = 'on';
  protected constant text[] := array['escrow_id', 'pot_id', 'booking_id', 'gross_minor', 'commission_minor',
                                     'reversal_of', 'payee_id', 'purpose'];
  k text;
  sanctioned boolean;
begin
  if tg_op = 'DELETE' then
    raise exception 'wallet_entries_are_append_only: a ledger entry is never deleted'
      using errcode = '42501', hint = 'MON-10: post a correcting entry instead.';
  end if;

  if (new.id, new.wallet_id, new.kind, new.direction, new.amount_minor, new.created_at)
     is distinct from
     (old.id, old.wallet_id, old.kind, old.direction, old.amount_minor, old.created_at) then
    raise exception 'wallet_entries_are_append_only: an entry''s wallet, kind, direction and amount are fixed'
      using errcode = '42501', hint = 'MON-10: post a correcting entry instead.';
  end if;

  sanctioned := reversing
                and old.kind in ('escrow_release', 'escrow_refund')
                and old.status = 'COMPLETED' and new.status = 'REVERSED'
                and new.reference like old.reference || ':reversed:%';

  if new.reference is distinct from old.reference and not sanctioned then
    raise exception 'wallet_entries_are_append_only: an entry''s reference is fixed'
      using errcode = '42501', hint = 'MON-10.';
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'PENDING' and new.status in ('COMPLETED', 'FAILED', 'REVERSED'))
     and not sanctioned then
    raise exception 'wallet_entries_are_append_only: % cannot become %', old.status, new.status
      using errcode = '42501', hint = 'MON-10: only a PENDING entry is settled in place.';
  end if;

  foreach k in array protected loop
    if (old.metadata ? k) and (new.metadata -> k) is distinct from (old.metadata -> k) then
      raise exception 'wallet_entries_are_append_only: metadata % is fixed once written', k
        using errcode = '42501', hint = 'MON-10.';
    end if;
  end loop;

  return new;
end;
$$;
revoke all on function private.guard_wallet_entry_change() from public, anon, authenticated;

drop trigger if exists wallet_entries_00_append_only on public.wallet_entries;
create trigger wallet_entries_00_append_only
  before update or delete on public.wallet_entries
  for each row execute function private.guard_wallet_entry_change();
