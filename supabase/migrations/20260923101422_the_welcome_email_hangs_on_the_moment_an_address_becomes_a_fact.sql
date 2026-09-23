-- THE WELCOME EMAIL HAS BEEN BUILT AND UNSENT SINCE THE CATALOGUE WAS WRITTEN.
--
-- WHAT WAS WRONG, MEASURED RATHER THAN ASSERTED. `welcome` is six versions, a
-- 32kB document, a test file beside it and a place in the fixtures.
-- `lib/notify/welcome.ts` (`welcomeOnce`) called it from two places in
-- `lib/auth/actions.ts`. On this database today: seven accounts, five of them
-- with a confirmed address, and `profiles.welcomed_at` NULL on every single
-- row. Not one person who has ever signed up here has been written to.
--
-- WHY THE TWO CALL SITES WERE NEVER GOING TO BE ENOUGH, WHICH IS THE PART
-- WORTH KEEPING. They were the six digit code and the emailed link. THEY ARE
-- NOT THE ONLY DOORS. Continue with Google mints a confirmed account inside
-- GoTrue and returns through an OAuth callback that has never heard of
-- `welcomeOnce`; so does an invite, so does an account the admin API creates,
-- and so will whatever door is added next. Wiring the doors we can see is how
-- a platform ends up with three of five covered under a green suite.
--
-- An address becoming confirmed is visible in exactly one place, which is the
-- column that records it. So this is a trigger, in the same transaction as the
-- confirmation, and it covers every door there will ever be.
--
-- WHY IT STILL HANGS ON CONFIRMATION AND NOT ON THE INSERT ALONE. At the
-- moment somebody presses Create account the address is a CLAIM. Mailing an
-- unconfirmed address makes this platform the delivery mechanism for somebody
-- else's abuse: type a stranger's address into our sign-up and we post to
-- them. The address becomes a fact when `email_confirmed_at` is written, and
-- that happens either on the INSERT itself (Google, invite, admin API, and any
-- deployment with confirmations switched off) or on a later UPDATE (the code
-- and the link). Both are covered below, by one function and two triggers.
--
-- EXACTLY ONCE, FOR EVER, AND THE DATABASE IS WHAT MAKES IT SO. The dedupe key
-- is `account:welcome:<user id>` and `email_outbox_dedupe_key` is UNIQUE, so a
-- retried sign up, a second tap on the emailed link, a confirmation reversed
-- and redone, and both triggers firing for one account all land on one key and
-- the second writes nothing. This is strictly stronger than the
-- `profiles.welcomed_at` claim it replaces, which sat on a table the account
-- holder can write.
--
-- `profiles.welcomed_at` IS LEFT IN PLACE AND NO LONGER WRITTEN. Dropping a
-- column is a data-losing migration and the stop list forbids one for
-- tidiness. It is NULL on every row, so nothing is lost by leaving it, and a
-- comment on it now says what it was and what replaced it.
--
-- NOBODY IS BACKFILLED. The five confirmed accounts on this database predate
-- the wire and would receive "Welcome to Vallo" months after they arrived,
-- which is not a welcome, it is a surprise. The triggers fire forward only.
--
-- A TRIGGER ON THE AUTH SCHEMA MAY NEVER BREAK SIGNING IN, and this one is on
-- `auth.users` itself, so the body swallows exactly as
-- `private.enqueue_new_device_email` does and says so to the Postgres log.
--
-- PROVEN BEFORE LANDING, by a probe migration that installed this same DDL,
-- drove all four cases and rolled everything back on a deliberate raise:
-- PROBE ALL PASS welcome: insert-door=1 unconfirmed=0 confirm-door=1
-- dedupe=1 anonymous=0.

create or replace function private.enqueue_welcome_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  /* An anonymous account has no address to welcome, and a soft deleted one
     has nobody behind it. Neither is a person who just arrived. */
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;
  if new.deleted_at is not null then
    return new;
  end if;
  if new.email_confirmed_at is null then
    return new;
  end if;
  if coalesce(btrim(new.email), '') = '' then
    return new;
  end if;

  perform private.email_outbox_enqueue(
    new.id,
    'account.welcome',
    /* One account, one welcome, for ever. Not one per confirmation: an
       address re-confirmed is the same person arriving the same once. */
    'account:welcome:' || new.id::text,
    /* NOTHING ABOUT THE PERSON. Not the address, which is the whole reason the
       queue holds a user id; and not the declared role either, which is a
       statement somebody made about themselves and is read at send time from
       `profiles.signup_role` by the drain. `at` is the clock and says nothing
       about anybody. */
    jsonb_build_object('at', now())
  );

  return new;
exception when others then
  /* See the head: a trigger on the auth schema may never break signing in or
     signing up. One lost welcome is a smaller harm by a wide margin. */
  raise warning '[outbox] welcome enqueue failed: %', sqlstate;
  return new;
end;
$$;

revoke all on function private.enqueue_welcome_email() from public, anon, authenticated;

/* THE DOOR THAT ARRIVES ALREADY CONFIRMED: Google, an invite, the admin API,
   and any deployment with email confirmations switched off. */
drop trigger if exists users_enqueue_welcome_email_on_insert on auth.users;
create trigger users_enqueue_welcome_email_on_insert
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function private.enqueue_welcome_email();

/* THE DOOR THAT CONFIRMS LATER: the six digit code and the emailed link. The
   `when` keeps this off every other UPDATE of the column, because
   `old.email_confirmed_at is null` is the transition from claim to fact and
   nothing else is. */
drop trigger if exists users_enqueue_welcome_email_on_confirm on auth.users;
create trigger users_enqueue_welcome_email_on_confirm
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.enqueue_welcome_email();

comment on column public.profiles.welcomed_at is
  'DISUSED since the welcome moved onto the outbox. The once-ever guarantee is now the UNIQUE dedupe key account:welcome:<user id> on public.email_outbox, which the account holder cannot write. Kept because dropping a column is data-losing; NULL on every row.';

-- ----------------------------------------------------------------------------
-- RULE 21, AND BOTH TRIGGERS READ BACK INSIDE THIS MIGRATION.

do $$
declare
  v_open int;
  v_triggers int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname = 'enqueue_welcome_email'
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: private.enqueue_welcome_email is executable by anon or authenticated';
  end if;

  select count(*) into v_triggers
    from pg_trigger t
   where not t.tgisinternal and t.tgenabled = 'O'
     and t.tgname in ('users_enqueue_welcome_email_on_insert',
                      'users_enqueue_welcome_email_on_confirm');
  if v_triggers <> 2 then
    raise exception 'the two welcome triggers are not both installed and enabled (%)', v_triggers;
  end if;
end
$$;
