-- DB-13 and DB-14: no index repeats a unique index with the same leading
-- columns, the unique indexes that serve those reads are still there, and the
-- foreign keys have an index whose first column is the key.
--
-- 29 September 2026: the escrow float snapshot index and the five escrow
-- foreign keys left this list when custody was retired (Track A); their
-- tables no longer exist, and track-a-custody-retired.sql holds that.
do $$
declare
  n int;
  uncovered text;
begin
  select count(*) into n from pg_class
   where relname in ('local_governments_state_idx', 'business_photos_business_idx',
                     'fee_rates_kind_effective_idx', 'payout_accounts_agent_idx');
  if n <> 0 then raise exception 'PROBE_FAIL db-13: % duplicate indexes remain', n; end if;
  select count(*) into n from pg_class
   where relname in ('local_governments_state_code_name_key', 'business_photos_business_id_position_key',
                     'fee_rates_one_per_moment', 'payout_accounts_agent_number_uq');
  if n <> 4 then raise exception 'PROBE_FAIL db-13: only % of the 4 unique indexes stand', n; end if;

  select string_agg(f.tbl || '.' || f.col, ', ') into uncovered
    from (values ('email_outbox', 'user_id'), ('email_recovery_requests', 'opened_by'),
                 ('email_recovery_requests', 'began_by'), ('email_recovery_requests', 'completed_by'),
                 ('email_recovery_requests', 'cancelled_by'),
                 ('fee_rates', 'created_by'), ('inspection_reports', 'author_id'), ('platform_revenue', 'listing_id'),
                 ('platform_revenue', 'rate_id'), ('price_check_events', 'lga_code'), ('price_check_events', 'listing_id'),
                 ('price_check_events', 'user_id'), ('price_check_shares', 'created_by'), ('price_check_shares', 'lga_code'),
                 ('price_check_watches', 'lga_code'), ('price_check_watches', 'state_code'), ('push_queue', 'collapsed_into')
         ) f(tbl, col)
   where not exists (
           select 1 from pg_index i
             join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
            where i.indrelid = format('public.%I', f.tbl)::regclass and a.attname = f.col);
  if uncovered is not null then raise exception 'PROBE_FAIL db-14: no index behind %', uncovered; end if;

  raise exception 'PROBE_OK db-13-14';
end
$$;
