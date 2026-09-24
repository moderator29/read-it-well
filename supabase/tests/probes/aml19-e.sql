-- AML-19 (e): every fee rate write is audited, whatever the path, including
-- the service role writing the table directly. Rolls back.
do $$
declare
  fr uuid; since timestamptz := now();
begin
  set local role service_role;
  insert into public.fee_rates (kind, basis_points, flat_minor, effective_from, note)
  values ('listing_fee', 100, 0, now() + interval '400 days', 'probe') returning id into fr;
  update public.fee_rates set basis_points = 150 where id = fr;
  delete from public.fee_rates where id = fr;
  reset role;

  if (select count(*) from public.audit_log a where a.entity_type = 'fee_rate' and a.entity_id = fr::text
        and a.action in ('fee_rate.row_insert', 'fee_rate.row_update', 'fee_rate.row_delete')
        and a.created_at >= since) <> 3 then
    raise exception 'PROBE_FAIL aml19-e: a direct fee rate write was not audited';
  end if;

  raise exception 'PROBE_OK aml19-e';
end $$;
