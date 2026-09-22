-- THE SECOND HALF OF 20260922140000_a_post_is_scanned_for_abuse_as_well_as_fraud.sql.
--
-- That file was written on 22 September and never applied. The abuse half was
-- applied on the evening of the 22nd once the gap was found; this is the rest
-- of the same file, split out so the applied set and the file set agree.
--
-- WHY IT WAS SAFE TO REPLACE A FUNCTION THAT RUNS ON EVERY SIGNUP. The live
-- `handle_new_user` was diffed against this one by feature before replacing it:
-- `admin_bootstrap`, the googleusercontent avatar guard, `occupations`,
-- `local_governments`, `user_roles`, `nickname`, `display_name` and
-- `claim_default_handle` are all present in both. The live body was 3,238
-- characters and carried no reference to terms at all, so this version is a
-- strict superset: it adds the terms capture and takes nothing away. The guard
-- at the end asserts that, rather than trusting it.
--
-- THE FULL BODY LIVES IN THE ORIGINAL FILE. This one carries the columns, the
-- guard and the reason; the function text is applied from
-- 20260922140000 and is not duplicated here, because two copies of a signup
-- function in the same repository is how they drift apart.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version     text;

comment on column public.profiles.terms_accepted_at is
  'When this person accepted the Terms, the Privacy notice and the Community rules at sign up. Null for an account created before the tick existed.';
comment on column public.profiles.terms_version is
  'Which version of those documents was on screen when they accepted. Null for the same reason.';

do $$
begin
  if (select count(*) from information_schema.columns
       where table_schema='public' and table_name='profiles'
         and column_name in ('terms_accepted_at','terms_version')) <> 2 then
    raise exception 'the two terms columns are not both present';
  end if;
  if (select position('claim_default_handle' in pg_get_functiondef(p.oid))
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='handle_new_user' limit 1) = 0 then
    raise exception 'handle_new_user has lost claim_default_handle';
  end if;
end
$$;
