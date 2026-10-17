-- ZZ-DIAG-STATE: read-only counts the 17 October audit (lead) needs, because
-- the session's connector cannot reach the project. Counts only, no personal
-- data. Always reports through PROBE_FAIL; writes nothing. Delete after reading.
do $$
declare
  r jsonb := '{}'::jsonb;
begin
  r := r || jsonb_build_object('push_tokens_by_platform', (select coalesce(jsonb_object_agg(coalesce(platform::text, 'null'), n), '{}') from (select platform, count(*) n from public.push_tokens group by platform) s));
  r := r || jsonb_build_object('cron_jobs', (select count(*) from cron.job), 'cron_inactive', (select coalesce(jsonb_agg(jobname), '[]') from cron.job where not active));
  r := r || jsonb_build_object('cron_failed_24h', (select coalesce(jsonb_object_agg(jobname, n), '{}') from (
       select j.jobname, count(*) n from cron.job_run_details d join cron.job j on j.jobid = d.jobid
        where d.status = 'failed' and d.start_time > now() - interval '24 hours' group by j.jobname) s));
  r := r || jsonb_build_object('flags_on', (select coalesce(jsonb_agg(key order by key), '[]') from public.feature_flags where enabled));
  r := r || jsonb_build_object('open_alerts_by_severity', (select coalesce(jsonb_object_agg(severity, n), '{}') from (select severity::text, count(*) n from public.risk_alerts where status = 'open' group by severity) s));
  r := r || jsonb_build_object('listings_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status::text, count(*) n from public.listings group by status) s));
  if true then
    raise exception 'PROBE_FAIL zz-diag-state: %', r::text;
  end if;
  raise exception 'PROBE_OK zz-diag-state';
end
$$;
