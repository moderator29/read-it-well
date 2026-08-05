-- The scanner was overruling the reviewer.
--
-- `private.scan_social_profile` is a BEFORE trigger that reads the bio and the
-- link on every write. When the text changes and comes back clean it sets
-- `bio_status` to LIVE, which is exactly right for the person editing their own
-- profile: they fixed it, it goes back up.
--
-- It was wrong for the console. Taking a bio down empties it, and an empty bio
-- is clean, so the scanner immediately published the removal as LIVE. The
-- decision the operator had just made, and the notification the author was
-- about to be sent, both said REMOVED; the row said LIVE. Found by a probe
-- running as a real admin under RLS, not by reading the code: the update
-- succeeded, returned a row, and quietly meant the opposite of what it said.
--
-- The rule now: an admin explicitly moving `bio_status` is final, in both
-- directions. The scanner still holds a bad bio from anybody who is not staff,
-- and it still releases a corrected one, but it no longer has an opinion about
-- a ruling a person has already made. That also gives the console the ability
-- to release a false positive, which it did not have before: a bio that happens
-- to contain ten digits could never be published by anybody, ever.

create or replace function private.scan_social_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  haystack        text;
  reason          text;
  sev             public.alert_severity;
  staff           boolean;
  ruled           boolean;
begin
  staff := private.has_role((select auth.uid()), 'admin')
        or private.has_role((select auth.uid()), 'super_admin');
  ruled := tg_op = 'UPDATE' and staff and new.bio_status is distinct from old.bio_status;

  -- An operator who has just decided is not asking for a second opinion.
  if ruled then
    return new;
  end if;

  haystack := coalesce(new.bio, '') || ' ' || coalesce(new.link, '');

  if haystack ~ '\d{10}' then
    reason := 'account number';
    sev    := 'high';
  elsif haystack ~* keyword_pattern then
    reason := 'payment language';
    sev    := 'medium';
  end if;

  if reason is not null then
    new.bio_status := 'HELD';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      sev,
      'Social bio held for review',
      'A profile bio or link contained ' || reason || ' and was held before it became public.',
      'social_profile',
      new.user_id::text
    );
  elsif tg_op = 'UPDATE' then
    -- Only an actual text change releases a hold. An unrelated column write must
    -- not quietly publish a bio a human has not looked at yet.
    if new.bio is distinct from old.bio or new.link is distinct from old.link then
      new.bio_status := 'LIVE';
    end if;
  end if;

  return new;
end;
$fn$;
