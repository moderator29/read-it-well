-- DB-P2-02: the alerts the pass-one audit probes raised (an unsigned Paystack
-- webhook, the unconfigured Yellow Card webhook, the account purge called
-- without its secret) are not left open on the desk. Checked live on
-- 2026-09-24: no alert of any kind is open, and the three account-purge
-- alerts were resolved on 2026-09-22, so no data change was needed. Rolls back.
do $$
declare
  n int;
begin
  select count(*) into n from public.risk_alerts
   where status = 'open'
     and (title ilike 'Cron: account purge, unauthorised%'
          or title ilike '%signature%invalid%'
          or title ilike '%yellow%card%unconfigured%');
  if n <> 0 then raise exception 'PROBE_FAIL db-p2-02: % probe-raised alerts are still open', n; end if;
  raise exception 'PROBE_OK db-p2-02';
end $$;
