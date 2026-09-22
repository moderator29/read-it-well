-- The single open row raised at 18:20 reported `vallo_reconcile_payments` run
-- 8187 failing at 15:47 on the pasted newline in the site URL. That was fixed
-- at 17:37 and the job returned `ok_200` on its own schedule at 18:47.
--
-- The watch now carries `recovered_at` per failure and will not raise a
-- recovered fault again; this closes the row that was already on the desk.
--
-- Nothing is deleted. Status and timestamp only. Idempotent.

update public.risk_alerts
   set status      = 'resolved',
       resolved_at = now()
 where status = 'open'
   and (entity_type = 'cron_job' or title ilike 'cron%')
   and description like '%8187%';
