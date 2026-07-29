-- Feature flags: runtime kill switches without a redeploy.
--
-- One row per switchable surface, world-readable so the layout can gate
-- features for anonymous visitors too, admin-writable so an incident can be
-- contained from the console. The app reads these with a short in-memory TTL
-- cache and treats a missing table or missing row as enabled, so the flags
-- can only ever turn things off, never break them.

create table public.feature_flags (
  key        text primary key,
  enabled    boolean not null default true,
  note       text,
  updated_at timestamptz not null default now()
);

comment on table public.feature_flags is
  'Runtime feature switches. Missing row means enabled.';

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

insert into public.feature_flags (key, note) values
  ('bookings',           'Reserve and cancel flows.'),
  ('wallet',             'Wallet funding, withdrawals and transfers.'),
  ('messaging',          'Guest to agent messaging.'),
  ('assistant',          'The AI assistant.'),
  ('support',            'Support chat and ticket filing.'),
  ('agent_listings',     'Agent listing creation and editing.'),
  ('hybrid_hotels',      'Amadeus partner hotel inventory.'),
  ('hybrid_restaurants', 'Google Places partner restaurant inventory.');

-- Row Level Security.
alter table public.feature_flags enable row level security;

create policy feature_flags_select_all
  on public.feature_flags for select
  using (true);

create policy feature_flags_admin_write
  on public.feature_flags for all
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));
