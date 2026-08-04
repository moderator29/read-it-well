-- A cast, in its own migration, for a reason this project has hit before: a
-- `case` returning bare literals will not coerce to an enum in an INSERT target
-- list, and the migration applies green while the function breaks on its first
-- real call. The severity is spelled with its type here.
create or replace function private.notify_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  serious constant text[] := array['off_platform_payment', 'scam', 'unsafe'];
  target_href text;
begin
  target_href := case new.target_type
    when 'listing' then '/listing/' || new.target_id
    when 'post'    then '/post/' || new.target_id
    else '/notifications'
  end;

  perform private.notify(
    new.reporter_id,
    'support',
    'Report received',
    'Thank you. Our team reviews every report, and we will act on this one without you having to chase it.',
    target_href
  );

  if new.category = any (serious) then
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (
      'high'::alert_severity,
      'Reported: ' || replace(new.category, '_', ' '),
      'A member reported a ' || new.target_type || '. Their words: ' || left(new.reason, 400),
      new.target_type,
      new.target_id
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.notify_report() from public, anon, authenticated;
