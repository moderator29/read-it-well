-- How an address already signed up, so the form can say so before somebody
-- fills in a password they will not be allowed to use.
--
-- This is an enumeration oracle and it is one on purpose. Supabase refuses to
-- answer the question, for good reason, and every product a Nigerian actually
-- uses answers it anyway: the alternative is a person typing a password, a
-- state, a local government and an occupation, pressing the button and only
-- then being told the address is taken. The exposure is bounded three ways.
-- EXECUTE is granted to service_role and to nobody else, so the only path to
-- it is the app's own server action, which is rate limited per connection. It
-- returns which METHOD to use and never anything about the person. And it says
-- nothing that trying to sign in would not also reveal.
create or replace function public.signup_method_for_email(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_providers text[];
begin
  if p_email is null or length(trim(p_email)) = 0 then
    return 'none';
  end if;

  select u.id into v_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_id is null then
    return 'none';
  end if;

  select array_agg(distinct i.provider) into v_providers
  from auth.identities i
  where i.user_id = v_id;

  -- A social identity is the one worth naming, because it is the one somebody
  -- cannot guess: "use Continue with Google" is actionable, "you have an
  -- account" is not.
  if v_providers is not null and 'google' = any(v_providers) then
    return 'google';
  end if;

  return 'email';
end;
$$;

revoke all on function public.signup_method_for_email(text) from public;
revoke all on function public.signup_method_for_email(text) from anon;
revoke all on function public.signup_method_for_email(text) from authenticated;
grant execute on function public.signup_method_for_email(text) to service_role;

-- Probed after applying, not assumed from a clean apply:
--   'phantomfcalls@gmail.com'   -> google
--   '  PHANTOMFCALLS@GMAIL.COM ' -> google   (trimmed and case folded)
--   'nobody-here@example.com'    -> none
--   '' and null                  -> none
--   has_function_privilege anon/authenticated -> false, service_role -> true
