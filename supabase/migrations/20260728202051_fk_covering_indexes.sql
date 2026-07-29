-- Covering indexes for every foreign key the performance advisor flagged.
-- Joins and cascade checks stay fast as tables grow.
create index if not exists agent_applications_reviewer_idx on public.agent_applications (reviewer_id);
create index if not exists agent_applications_state_idx    on public.agent_applications (state_code);
create index if not exists agent_documents_application_idx on public.agent_documents (application_id);
create index if not exists agents_application_idx          on public.agents (application_id);
create index if not exists booking_state_events_actor_idx  on public.booking_state_events (actor_id);
create index if not exists booking_state_events_booking_idx on public.booking_state_events (booking_id);
create index if not exists conversations_agent_idx         on public.conversations (agent_id);
create index if not exists conversations_listing_idx       on public.conversations (listing_id);
create index if not exists ledger_entries_transaction_idx  on public.ledger_entries (transaction_id);
create index if not exists listing_amenities_amenity_idx   on public.listing_amenities (amenity_id);
create index if not exists listings_reviewer_idx           on public.listings (reviewer_id);
create index if not exists messages_sender_idx             on public.messages (sender_id);
create index if not exists payout_accounts_agent_idx       on public.payout_accounts (agent_id);
create index if not exists reports_reporter_idx            on public.reports (reporter_id);
create index if not exists reviews_author_idx              on public.reviews (author_id);
create index if not exists saved_items_listing_idx         on public.saved_items (listing_id);
create index if not exists saved_searches_user_idx         on public.saved_searches (user_id);
