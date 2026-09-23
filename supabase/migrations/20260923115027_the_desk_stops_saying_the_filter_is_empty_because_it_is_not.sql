-- THE ONE OPEN ALERT THAT SAYS THE FILTER IS EMPTY IS NO LONGER TRUE.
--
-- `content.filter.empty` has been open on the operations desk since 22
-- September at 22:20, correctly, because `public.blocked_terms` held zero rows
-- and both scanners were therefore skipping the abuse branch. The hourly watch
-- writes this as a STATE rather than an event, so exactly one row stays open
-- until the state changes. It changed: 20260923113843 seeded 133 terms.
--
-- A desk that carries a resolved condition as an open high alert is the same
-- defect as a desk that carries nothing: in both cases what is on it stops
-- meaning anything. So the row is closed, here, with the fact that closed it.
--
-- THE GUARD IS THE POINT. The update cannot run unless the table actually
-- holds rows. If somebody truncates `blocked_terms` between writing this and
-- applying it, this migration closes nothing and the alert correctly stays
-- open. An alert must never be resolved by a migration that merely asserts the
-- condition has passed.
--
-- Applied 23 September 2026. Notice returned: blocked_terms holds 133 terms;
-- 1 open content.filter.empty alert(s) resolved. Read back afterwards:
-- 0 open, 10 total, on entity_type = 'content_filter'.

do $$
declare
  seeded int;
  closed int;
begin
  select count(*) into seeded from public.blocked_terms;

  if seeded = 0 then
    raise notice 'blocked_terms is still empty, so content.filter.empty stays open. Nothing resolved.';
    return;
  end if;

  update public.risk_alerts
  set resolved_at = now()
  where entity_type = 'content_filter'
    and entity_id   = 'blocked_terms'
    and resolved_at is null;

  get diagnostics closed = row_count;
  raise notice 'blocked_terms holds % terms; % open content.filter.empty alert(s) resolved.', seeded, closed;
end
$$;
