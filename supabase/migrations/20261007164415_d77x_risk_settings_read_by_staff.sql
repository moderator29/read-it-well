-- D77x: the risk settings row is read by staff through a helper they can run,
-- and written only through public.admin_update_risk_settings (audited).
-- d68d's policy called private.staff_can, which the authenticated role cannot
-- execute, so every read of the row as a staff member failed with 42501 and
-- the admin risk settings screen could not load (probe db-20). d68d also
-- granted members UPDATE on the row directly (probes db-06, mon-10); the
-- staff RPC is the only write path the app uses.
set local lock_timeout = '10s';

alter policy agreement_risk_settings_staff on public.agreement_risk_settings
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

revoke update on public.agreement_risk_settings from authenticated;
