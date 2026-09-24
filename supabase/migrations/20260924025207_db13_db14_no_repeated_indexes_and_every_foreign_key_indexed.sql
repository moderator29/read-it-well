-- Five indexes that repeat a unique index, and twenty-two foreign keys with no
-- index behind them.
--
-- Each dropped index has the same leading columns as a unique index on the
-- same table, which serves every query it served (a descending twin is the
-- same index read backwards). Each foreign key below gets an index, so
-- deleting or anonymising the row it points at does not scan the table
-- under lock; the ones naming a staff actor, which are mostly empty, are
-- partial. The tables are small today, so a plain CREATE INDEX holds its
-- lock for milliseconds.

drop index if exists public.local_governments_state_idx;       -- = local_governments_state_code_name_key
drop index if exists public.business_photos_business_idx;      -- = business_photos_business_id_position_key
drop index if exists public.escrow_float_snapshots_as_of_idx;  -- = escrow_float_snapshots_as_of_key, read backwards
drop index if exists public.fee_rates_kind_effective_idx;      -- = fee_rates_one_per_moment, read backwards
drop index if exists public.payout_accounts_agent_idx;         -- a prefix of payout_accounts_agent_number_uq

create index if not exists email_outbox_user_idx on public.email_outbox (user_id);
create index if not exists email_recovery_requests_opened_by_idx on public.email_recovery_requests (opened_by) where opened_by is not null;
create index if not exists email_recovery_requests_began_by_idx on public.email_recovery_requests (began_by) where began_by is not null;
create index if not exists email_recovery_requests_completed_by_idx on public.email_recovery_requests (completed_by) where completed_by is not null;
create index if not exists email_recovery_requests_cancelled_by_idx on public.email_recovery_requests (cancelled_by) where cancelled_by is not null;
create index if not exists escrow_evidence_author_idx on public.escrow_evidence (author_id);
create index if not exists escrows_disputed_by_idx on public.escrows (disputed_by) where disputed_by is not null;
create index if not exists escrows_opened_by_idx on public.escrows (opened_by) where opened_by is not null;
create index if not exists escrows_release_requested_by_idx on public.escrows (release_requested_by) where release_requested_by is not null;
create index if not exists escrows_resolved_by_idx on public.escrows (resolved_by) where resolved_by is not null;
create index if not exists fee_rates_created_by_idx on public.fee_rates (created_by) where created_by is not null;
create index if not exists inspection_reports_author_idx on public.inspection_reports (author_id);
create index if not exists platform_revenue_listing_idx on public.platform_revenue (listing_id) where listing_id is not null;
create index if not exists platform_revenue_rate_idx on public.platform_revenue (rate_id) where rate_id is not null;
create index if not exists price_check_events_lga_idx on public.price_check_events (lga_code);
create index if not exists price_check_events_listing_idx on public.price_check_events (listing_id) where listing_id is not null;
create index if not exists price_check_events_user_idx on public.price_check_events (user_id) where user_id is not null;
create index if not exists price_check_shares_created_by_idx on public.price_check_shares (created_by) where created_by is not null;
create index if not exists price_check_shares_lga_idx on public.price_check_shares (lga_code);
create index if not exists price_check_watches_lga_idx on public.price_check_watches (lga_code);
create index if not exists price_check_watches_state_idx on public.price_check_watches (state_code);
create index if not exists push_queue_collapsed_into_idx on public.push_queue (collapsed_into) where collapsed_into is not null;
