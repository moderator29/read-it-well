-- public.platform_revenue is RLS-enabled with no policies, which denies anon and
-- authenticated outright and leaves service_role as the only reader. That is
-- the right posture for an append-only revenue ledger and it means the console
-- cannot read a single row of it through the operator's own client.
--
-- This is the door, and it is a SECURITY DEFINER function rather than a
-- permissive policy on purpose: a policy would publish the table to every
-- authenticated session that could forge a PostgREST call, whereas a function
-- publishes exactly one shape, computed once, to a caller whose role has just
-- been checked. Same pattern as escrow_admin_resolve and set_fee_rate: if
-- auth.uid() does not carry 'admin' or 'super_admin' the answer is
-- {"status": "forbidden"} and nothing is read.
--
-- READ ONLY. There is no admin write path to platform_revenue here and there
-- must not be one. The table is written by private.escrow_settle inside the
-- same transaction as the payee credit, which is what makes it reconcilable
-- against the escrow it came from. A row an operator could type by hand would
-- break that property permanently.

create or replace function public.admin_revenue_summary(p_days integer default 90)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := auth.uid();
  days integer := least(greatest(coalesce(p_days, 90), 1), 3650);
  by_source jsonb;
  recent jsonb;
  window_total bigint;
  all_time bigint;
begin
  if actor is null
     or not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- Every source the enum carries, present even at zero. A revenue line that
  -- simply vanishes when it has earned nothing is how "listing fees are not
  -- being charged" stays invisible for a quarter.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source', s.source,
        'amount_minor', coalesce(r.amount_minor, 0),
        'entries', coalesce(r.entries, 0)
      )
      order by s.source
    ),
    '[]'::jsonb
  )
  into by_source
  from (select unnest(enum_range(null::public.revenue_source)) as source) s
  left join (
    select source, sum(amount_minor)::bigint as amount_minor, count(*)::bigint as entries
    from public.platform_revenue
    where created_at > now() - make_interval(days => days)
    group by source
  ) r on r.source = s.source;

  select coalesce(sum(amount_minor), 0)::bigint
  into window_total
  from public.platform_revenue
  where created_at > now() - make_interval(days => days);

  select coalesce(sum(amount_minor), 0)::bigint
  into all_time
  from public.platform_revenue;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'source', t.source,
        'amount_minor', t.amount_minor,
        'currency', t.currency,
        'escrow_id', t.escrow_id,
        'listing_id', t.listing_id,
        'reference', t.reference,
        'created_at', t.created_at
      )
      order by t.created_at desc
    ),
    '[]'::jsonb
  )
  into recent
  from (
    select *
    from public.platform_revenue
    where created_at > now() - make_interval(days => days)
    order by created_at desc
    limit 50
  ) t;

  return jsonb_build_object(
    'status', 'ok',
    'window_days', days,
    'by_source', by_source,
    'window_total_minor', window_total,
    'all_time_minor', all_time,
    'recent', recent
  );
end;
$function$;

revoke all on function public.admin_revenue_summary(integer) from public;
revoke all on function public.admin_revenue_summary(integer) from anon;
grant execute on function public.admin_revenue_summary(integer) to authenticated;
grant execute on function public.admin_revenue_summary(integer) to service_role;
