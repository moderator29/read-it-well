-- THREE MORE STAFF SCOPES (29 September 2026).
--
-- A CFO, a compliance officer or an operations lead had no scope of their own,
-- so the only way to let them see their area was to make them a full admin,
-- which also opened kill switches, reference data and staff access. Each now
-- has a scope that opens exactly their desks:
--
--   finance     the Money and Payments desks, read only, and the payments
--               history and its export
--   compliance  the Compliance desk (STR, thresholds, PEP, sanctions,
--               beneficial ownership)
--   operations  the Operations, Alerts and Bookings desks
--
-- Added on their own because a new enum value cannot be used in the same
-- transaction that adds it.
alter type public.staff_scope add value if not exists 'finance';
alter type public.staff_scope add value if not exists 'compliance';
alter type public.staff_scope add value if not exists 'operations';
