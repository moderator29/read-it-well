-- B7. An operator can find a person by their email address.
--
-- The payment-method lookup panel on /admin/payments takes a handle or an
-- address. A handle resolves through public.social_profiles; an address has
-- nowhere to resolve, because public.profiles carries no email by design and
-- the GoTrue admin API offers no lookup by address. This function is that
-- lookup, and it is deliberately the smallest thing that answers it: one
-- uuid or null, never the address back, never a row of auth.users.
--
-- It repeats the role check at its own boundary in the same shape
-- public.admin_payment_health uses: auth.uid() must carry 'admin' or
-- 'super_admin' under private.has_role or it returns null and reads nothing.
-- anon holds no EXECUTE. Additive and idempotent: create or replace, and the
-- grants are restated rather than assumed.
--
-- NOT PROBED. This worker has no database credentials. The lead applies it and
-- runs the probe below; until then apps/web/src/lib/admin/queries.ts answers
-- "email-unavailable" for an address, which the panel prints as such.
--
-- Probe, as the applying admin:
--   select public.admin_user_id_by_email('nobody@example.invalid');
--     -> null (no such account) as admin; null as a non-admin too.
--   select proname, prosecdef from pg_proc where proname = 'admin_user_id_by_email';
--     -> one row, prosecdef true.
--   select has_function_privilege('anon', 'public.admin_user_id_by_email(text)', 'execute');
--     -> false.
--   select has_function_privilege('authenticated', 'public.admin_user_id_by_email(text)', 'execute');
--     -> true.

create or replace function public.admin_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := auth.uid();
  found uuid;
begin
  if actor is null then
    return null;
  end if;
  if not (private.has_role(actor, 'admin') or private.has_role(actor, 'super_admin')) then
    return null;
  end if;
  if p_email is null or length(trim(p_email)) = 0 then
    return null;
  end if;

  select u.id
    into found
    from auth.users u
   where lower(u.email) = lower(trim(p_email))
   limit 1;

  return found;
end;
$function$;

revoke all on function public.admin_user_id_by_email(text) from public;
revoke all on function public.admin_user_id_by_email(text) from anon;
grant execute on function public.admin_user_id_by_email(text) to authenticated;
grant execute on function public.admin_user_id_by_email(text) to service_role;
