/*
 * AN UPHELD ARRIVAL REPORT STAYS OPEN UNTIL THE MONEY MOVES.
 *
 * Only the desk DECLINING a report closes it on its own. An upheld report is
 * the desk agreeing with the guest, so the stay's payout must stay paused
 * until the refund desk decides the refund ask or a refund is recorded,
 * exactly as before any ruling.
 */

create or replace function private.arrival_report_open(p_booking uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  reported timestamptz;
  ruled boolean := false;
begin
  select c.answered_at into reported
    from public.booking_arrival_checks c
   where c.booking_id = p_booking and c.answer <> 'as_listed'
     and (c.ruled_at is null or c.ruling = 'upheld');
  if reported is null then
    return false;
  end if;
  begin
    execute 'select exists (select 1 from public.refund_requests r join public.refund_request_decisions d on d.request_id = r.id where r.booking_id = $1 and d.decided_at >= $2)
                 or exists (select 1 from public.booking_refunds f where f.booking_id = $1 and f.created_at >= $2)'
      into ruled using p_booking, reported;
  exception when others then
    ruled := false;
  end;
  return not coalesce(ruled, false);
end;
$function$;

revoke all on function private.arrival_report_open(uuid) from public, anon, authenticated;
grant execute on function private.arrival_report_open(uuid) to service_role;
