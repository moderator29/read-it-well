-- MONEY AUDIT FIX, FOLLOW-UP: THE UNKNOWN-OUTCOME ALERT USES A SEVERITY THE
-- ENUM HAS.
--
-- `20260929013455` wrote an `unknown` share refund's alert as severity
-- 'critical', which `public.alert_severity` (low, medium, high) does not
-- have, so recording `unknown` failed. The rolled-back probe caught it
-- before any row reached that path. The alert is 'high' in the database;
-- the app's own `refund.outcome_unknown` alert (lib/alerts) stays critical.
-- Nothing else changes; grants are unchanged (service_role only).

create or replace function public.record_rent_share_refund(p_refund uuid, p_status text, p_processor_id text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_status not in ('submitted', 'failed', 'unknown') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  update public.rent_share_refunds
     set processor_status = p_status,
         processor_refund_id = coalesce(nullif(btrim(p_processor_id), ''), processor_refund_id),
         processor_submitted_at = case when p_status = 'submitted' then coalesce(processor_submitted_at, now())
                                       else processor_submitted_at end
   where id = p_refund and processor_status in ('sending', 'unknown') and processor_status <> p_status;
  if not found then
    return jsonb_build_object('status', 'not_claimed');
  end if;
  if p_status = 'unknown' then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A move-in share refund may or may not have reached Paystack',
            format('Share refund %s: Paystack did not answer. Check the Paystack dashboard before anything is retried; it is never re-sent automatically.', p_refund),
            'rent_share_refund', p_refund::text);
  end if;
  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.record_rent_share_refund(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_rent_share_refund(uuid, text, text) to service_role;

do $$
begin
  if position('critical' in pg_get_functiondef('public.record_rent_share_refund(uuid,text,text)'::regprocedure)) > 0 then
    raise exception 'record_rent_share_refund still names a severity the enum does not have';
  end if;
  if has_function_privilege('authenticated', 'public.record_rent_share_refund(uuid,text,text)', 'EXECUTE') then
    raise exception 'record_rent_share_refund is executable by authenticated';
  end if;
end;
$$;
