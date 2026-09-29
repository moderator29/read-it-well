-- Two failure alerts from 24 September were still open for jobs that have
-- since recovered: new-match-alerts failed on a missing listing_match_queue
-- and landlord-line on a missing landlord_line_enqueue, both created by the
-- 24 September migrations applied since. Each job has written clean runs
-- every half hour after. An alert is closed here only when a later clean run
-- of the same job exists in the audit log; anything without that proof stays
-- open.
update public.risk_alerts a
   set status = 'resolved', resolved_at = now()
 where a.status = 'open'
   and a.entity_id in ('new-match-alerts', 'landlord-line')
   and exists (
     select 1 from public.audit_log l
      where l.entity_type = 'cron_job'
        and l.entity_id = a.entity_id
        and l.created_at > a.created_at
        and l.metadata ->> 'outcome' = 'ok');

do $readback$
begin
  if exists (select 1 from public.risk_alerts a
              where a.status = 'open' and a.entity_id in ('new-match-alerts', 'landlord-line')
                and exists (select 1 from public.audit_log l where l.entity_type = 'cron_job'
                              and l.entity_id = a.entity_id and l.created_at > a.created_at
                              and l.metadata ->> 'outcome' = 'ok')) then
    raise exception 'READ-BACK FAILED: a recovered alert is still open';
  end if;
end;
$readback$;
