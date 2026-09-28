-- The alert dedupe window was ten minutes, so a job failing every fifteen
-- (sanctions-screen, pg-cron-watch) opened a new identical row each run:
-- 411 "Sanctions: lists unreadable" and 73 "Cron: schedule, silent" were
-- open at once, burying every other alert on the desk. The window is now a
-- day (lib/alerts/record.ts). Here each set of open repeats (same title,
-- same subject) is folded into its newest row, which stays open; the older
-- copies are marked resolved. No alert of a kind is closed that is not a
-- duplicate of one still open.
with ranked as (
  select id, row_number() over (partition by title, entity_id order by created_at desc) rn
  from public.risk_alerts where status = 'open'
)
update public.risk_alerts a set status = 'resolved', resolved_at = now()
from ranked r where r.id = a.id and r.rn > 1;

do $readback$
begin
  if exists (select 1 from public.risk_alerts where status = 'open'
             group by title, entity_id having count(*) > 1) then
    raise exception 'READ-BACK FAILED: open repeats remain';
  end if;
end;
$readback$;
