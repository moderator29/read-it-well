-- Fix: private.scan_social_profile() raised 42804 at runtime.
--
-- `case when ... then 'high' else 'medium' end` produces an untyped literal that
-- Postgres will not implicitly coerce to public.alert_severity in an INSERT
-- target list. The migration that created this function applied perfectly and
-- the function was broken on its first call. Caught by a functional probe, which
-- is the whole reason this project runs one after every migration rather than
-- treating "migration applied" as "feature works".

create or replace function private.scan_social_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  haystack        text;
  reason          text;
  sev             public.alert_severity;
begin
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
$$;
