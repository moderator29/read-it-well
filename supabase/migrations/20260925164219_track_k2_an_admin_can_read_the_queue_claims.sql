-- The claims read policy called private.is_operator, which no API role may
-- execute, so an admin's own client could not read claims (42501). Admins read
-- through has_role, as the other admin policies do; a scoped staff member
-- reads claims through the service client after requireAdmin(scope).
drop policy if exists queue_claims_operator_read on public.queue_claims;
create policy queue_claims_operator_read on public.queue_claims
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
