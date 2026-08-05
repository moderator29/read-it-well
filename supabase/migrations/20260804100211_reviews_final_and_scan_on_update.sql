-- A review is final, enforced by the database rather than by form copy.
--
-- reviews_write_path left reviews_update_own in place on the reasoning that no
-- code called it. That reasoning was wrong. PostgREST exposes every table
-- directly, so a policy that exists is a live write path whether or not any of
-- our code uses it: a signed-in guest could post a clean review, let it pass the
-- insert scan, then PATCH /rest/v1/reviews?id=eq.<id> with an account number and
-- payment language. No trigger covered UPDATE, so nothing was flagged and the
-- text went straight onto a public listing page.
--
-- Two halves, because either alone is insufficient:
--   1. Remove the update policy. The product rule is that a review is final, so
--      the database says so. No update policy means no client update at all,
--      which is stronger than any wording on a form.
--   2. Extend the scan to UPDATE regardless, as defence in depth, so that if an
--      update path is ever added back the scanner is already covering it rather
--      than being remembered.
--
-- public.messages is the precedent that should have been followed first: it has
-- no update policy at all, which is exactly why scan_message on INSERT alone is
-- sufficient there.

drop policy if exists reviews_update_own on public.reviews;

-- Scan on insert AND update. On update we only re-scan when the body actually
-- changed, so an unrelated column write cannot file a duplicate alert about
-- text that was already reviewed.
--
-- The tg_op test is a nested if rather than one `and` expression on purpose:
-- plpgsql evaluates a boolean expression through SQL and does not guarantee
-- short-circuit, and `old` is unassigned during an INSERT, so a single
-- combined condition could raise instead of skipping.
create or replace function private.scan_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
begin
  if tg_op = 'UPDATE' then
    if new.body is not distinct from old.body then
      return new;
    end if;
  end if;

  if new.body is null then
    return new;
  end if;

  if new.body ~ '\d{10}' then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'high',
      'Account number in a review',
      'A review body carries a 10 digit run: ' || substring(new.body from '\d{10}'),
      'review',
      new.id::text
    );
  end if;

  if new.body ~* keyword_pattern then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'medium',
      'Payment language in a review',
      'A review body carries payment language: ' || substring(lower(new.body) from keyword_pattern),
      'review',
      new.id::text
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.scan_review() from public, anon, authenticated;

drop trigger if exists reviews_scan_after_insert on public.reviews;

create trigger reviews_scan_after_write
  after insert or update on public.reviews
  for each row execute function private.scan_review();
