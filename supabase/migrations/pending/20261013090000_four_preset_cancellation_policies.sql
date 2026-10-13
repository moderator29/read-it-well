-- PENDING, NOT APPLIED. Four preset cancellation policies a host picks from:
-- Flexible, Moderate, Firm and Strict, the shape Airbnb and Booking.com use.
--
-- WHAT IT CHANGES.
--   * public.cancellation_policies gains `preset` (a stable code, unique when
--     set) and `position` (the order a host and a guest meet them). Both
--     nullable, so the two existing rows (the example stays' policies) keep
--     working and are simply not offered to a new host.
--   * Four rows are inserted, each with its refund tiers in `rules` (the
--     shape `[{hours_before, refund_bps}]` the stay page and
--     `lib/trust/cancellation.ts` already read) and a summary that says the
--     same thing in plain words. `is_free_until_hours` is the full-refund
--     window, which the stays filter reads; Strict has none.
--   * No row is changed or removed, and no grant or policy changes: the table
--     is already readable by everybody (`cancellation_policies_select_all`).
--
-- THE TIERS, which the wizard, the stay page and checkout print from `rules`:
--   Flexible  full refund until 24 hours before check-in, nothing after.
--   Moderate  full refund until 5 days before, half after.
--   Firm      full refund until 30 days before, half until 7 days, nothing after.
--   Strict    half until 7 days before, nothing after.
--
-- The app reads the table with `select *`, so it runs before and after this
-- is applied: before, the wizard offers every policy as it does today.

alter table public.cancellation_policies
  add column if not exists preset text
    check (preset is null or preset in ('flexible', 'moderate', 'firm', 'strict')),
  add column if not exists position smallint
    check (position is null or position between 0 and 100);

create unique index if not exists cancellation_policies_preset_key
  on public.cancellation_policies (preset) where preset is not null;

comment on column public.cancellation_policies.preset is
  'The preset a host picks in the wizard (flexible, moderate, firm, strict). Null for a policy that is not offered to new hosts.';
comment on column public.cancellation_policies.position is
  'The order presets are offered and shown in, lowest first.';

insert into public.cancellation_policies (id, name, summary, rules, is_free_until_hours, preset, position)
values
  ('ef100000-0000-4000-8000-000000000001', 'Flexible',
   'Full refund if you cancel at least 24 hours before check-in. No refund after that.',
   '[{"hours_before": 24, "refund_bps": 10000}, {"hours_before": 0, "refund_bps": 0}]'::jsonb,
   24, 'flexible', 1),
  ('ef100000-0000-4000-8000-000000000002', 'Moderate',
   'Full refund if you cancel at least 5 days before check-in. Half back after that.',
   '[{"hours_before": 120, "refund_bps": 10000}, {"hours_before": 0, "refund_bps": 5000}]'::jsonb,
   120, 'moderate', 2),
  ('ef100000-0000-4000-8000-000000000003', 'Firm',
   'Full refund if you cancel at least 30 days before check-in, half back if you cancel at least 7 days before, and no refund after that.',
   '[{"hours_before": 720, "refund_bps": 10000}, {"hours_before": 168, "refund_bps": 5000}, {"hours_before": 0, "refund_bps": 0}]'::jsonb,
   720, 'firm', 3),
  ('ef100000-0000-4000-8000-000000000004', 'Strict',
   'Half back if you cancel at least 7 days before check-in. No refund after that.',
   '[{"hours_before": 168, "refund_bps": 5000}, {"hours_before": 0, "refund_bps": 0}]'::jsonb,
   null, 'strict', 4)
on conflict (id) do nothing;
