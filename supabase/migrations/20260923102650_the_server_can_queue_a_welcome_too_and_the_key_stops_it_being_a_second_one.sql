-- BELT AND BRACES ON THE WELCOME, AND THE ONE THING THAT MAKES TWO PATHS SAFE.
--
-- The triggers on `auth.users` are the coverage: they fire in the same
-- transaction as the confirmation and they cover every door, including the
-- three no server action ever sees (Continue with Google, an invite, the admin
-- API). They are the reason `lib/auth/actions.ts` no longer has to remember.
--
-- `welcomeOnce` is kept anyway, and this is what it calls. Two reasons worth
-- stating rather than assuming.
--
--   A TRIGGER IS ONE OBJECT AND OBJECTS GET DROPPED. `auth` is not our schema.
--   A GoTrue upgrade, a restore from a snapshot taken before today, or a
--   migration written by somebody who did not know it was there, and the
--   welcome is silently gone with nothing to notice. The server path covers
--   the two commonest doors on its own.
--
--   AND THE SERVER PATH CANNOT MAKE A SECOND EMAIL, which is the only thing
--   that would make belt and braces worse than either alone. Both paths
--   compose the SAME dedupe key, `account:welcome:<user id>`, and
--   `email_outbox_dedupe_key` is UNIQUE with `on conflict do nothing`
--   underneath. Whichever arrives first writes the row; the other is told
--   `already` and writes nothing. That is proven below rather than argued.
--
-- WHY IT IS A FUNCTION AND NOT AN INSERT FROM TYPESCRIPT. Two things.
-- `private.email_outbox_enqueue` is not reachable from PostgREST and must not
-- become so. And THE GUARDS BELONG NEXT TO THE DATA: whether an address has
-- been confirmed is a fact in `auth.users`, and a caller that had to check it
-- first would be a caller that could be talked out of checking. A server
-- action can ask for a welcome for any account id it likes and still cannot
-- get one queued for an address that is still a claim.
--
-- Rule 21: born locked, service_role only, read back in this migration.
--
-- PROVEN BEFORE LANDING by a probe that ran this same DDL against the live
-- catalogue and rolled back on a deliberate raise:
-- PROBE ALL PASS welcome enqueue: locked=1 unconfirmed=refused
-- anonymous=refused trigger-then-server=already,1
-- server-alone=queued,then-already.

create or replace function public.email_outbox_enqueue_welcome(p_user uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user auth.users;
  v_id uuid;
begin
  if p_user is null then
    return 'refused';
  end if;

  select * into v_user from auth.users where id = p_user;
  if v_user.id is null then return 'refused'; end if;
  /* The same four guards the trigger applies, in the same order, because two
     paths that disagree about who deserves a welcome is worse than one. */
  if coalesce(v_user.is_anonymous, false) then return 'refused'; end if;
  if v_user.deleted_at is not null then return 'refused'; end if;
  if v_user.email_confirmed_at is null then return 'refused'; end if;
  if coalesce(btrim(v_user.email), '') = '' then return 'refused'; end if;

  v_id := private.email_outbox_enqueue(
    p_user,
    'account.welcome',
    /* THE SAME KEY THE TRIGGER COMPOSES. This line is the whole safety
       argument for having two paths; it must never diverge from
       `private.enqueue_welcome_email`. */
    'account:welcome:' || p_user::text,
    jsonb_build_object('at', now())
  );

  /* `queued` this call wrote the row. `already` the key was there, which is a
     success and not a failure: the email it describes is queued, sent, or
     deliberately given up on. `refused` there is nobody here to welcome. */
  return case when v_id is null then 'already' else 'queued' end;
end;
$$;

revoke all on function public.email_outbox_enqueue_welcome(uuid) from public, anon, authenticated;
grant execute on function public.email_outbox_enqueue_welcome(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- RULE 21, READ BACK INSIDE THE MIGRATION, BOTH HALVES.

do $$
declare
  v_open int;
  v_service int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'email_outbox_enqueue_welcome'
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: email_outbox_enqueue_welcome is executable by anon or authenticated';
  end if;

  /* Locked to the wrong roles is still broken: the send site runs as the
     service role and must be able to call it. */
  select count(*) into v_service
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'email_outbox_enqueue_welcome'
     and has_function_privilege('service_role', p.oid, 'EXECUTE');
  if v_service <> 1 then
    raise exception 'the send site cannot call email_outbox_enqueue_welcome';
  end if;
end
$$;
