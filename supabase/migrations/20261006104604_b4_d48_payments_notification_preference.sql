-- D48 step 2 (R3-31): the `wallet` notification preference becomes `payments`.
-- Applied 6 October 2026. The function is named without the retired word, which the custody guard (private.refuse_custody_objects) refuses.
--
-- profiles.settings.notifications.wallet is copied to
-- profiles.settings.notifications.payments for every member who has the old
-- key and not yet the new one. ADDITIVE: the old key stays, so the current
-- settings page (Session 3 owns the label and the toggle) keeps reading what
-- it reads until it moves to `payments`. A member who already has `payments`
-- keeps their own choice. Members with no notifications object at all are
-- left alone: the default applies to them on both keys. Idempotent: a second
-- run finds nothing to copy. A trigger keeps new writes in step until the
-- settings page writes `payments` itself. Additive only; no row or trigger
-- removal.
--
-- THE MIRROR KEEPS FOLLOWING `wallet`. The settings page still writes the old
-- `wallet` toggle, so whenever an update changes `wallet` and leaves
-- `payments` as it was, `payments` takes the new `wallet` value: an opt-out
-- made on the old toggle is never lost. A write that changes `payments`
-- itself is the member's own choice and is kept. TEMPORARY: retire the
-- trigger (in its own reviewed change) once the settings page writes
-- `payments`; target 2026-12-31.
--
-- Side effect, accepted: the copy below bumps profiles.updated_at for the 15
-- members it touches (profiles_set_updated_at); the other profiles triggers
-- are no-ops for it.

set local lock_timeout = '5s';

update public.profiles
   set settings = jsonb_set(settings, '{notifications,payments}', settings -> 'notifications' -> 'wallet', true)
 where jsonb_typeof(settings -> 'notifications') = 'object'
   and (settings -> 'notifications') ? 'wallet'
   and not (settings -> 'notifications') ? 'payments';

-- Until the settings page writes `payments` itself: a write that carries only
-- `wallet` fills `payments` from it, and a later change to `wallet` alone is
-- mirrored into `payments`. A change to `payments` itself is never overwritten.
create or replace function private.notifications_payments_mirror()
returns trigger language plpgsql set search_path = '' as $$
begin
  if jsonb_typeof(new.settings -> 'notifications') = 'object'
     and (new.settings -> 'notifications') ? 'wallet' then
    if not (new.settings -> 'notifications') ? 'payments' then
      new.settings := jsonb_set(new.settings, '{notifications,payments}', new.settings -> 'notifications' -> 'wallet', true);
    elsif tg_op = 'UPDATE'
       and (new.settings -> 'notifications' -> 'wallet') is distinct from (old.settings -> 'notifications' -> 'wallet')
       and (new.settings -> 'notifications' -> 'payments') is not distinct from (old.settings -> 'notifications' -> 'payments') then
      new.settings := jsonb_set(new.settings, '{notifications,payments}', new.settings -> 'notifications' -> 'wallet', true);
    end if;
  end if;
  return new;
end $$;
revoke all on function private.notifications_payments_mirror() from public, anon, authenticated;

create or replace trigger profiles_notifications_payments
  before insert or update of settings on public.profiles
  for each row execute function private.notifications_payments_mirror();

do $check$
declare n int;
begin
  select count(*) into n from public.profiles
   where jsonb_typeof(settings -> 'notifications') = 'object'
     and (settings -> 'notifications') ? 'wallet'
     and not (settings -> 'notifications') ? 'payments';
  if n > 0 then
    raise exception 'b4_d48_payments_notification_preference did not land: % members still lack payments', n;
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'profiles_notifications_payments'
                   and tgrelid = 'public.profiles'::regclass) then
    raise exception 'b4_d48_payments_notification_preference did not land: the mirror trigger is missing';
  end if;
  if has_function_privilege('anon', 'private.notifications_payments_mirror()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.notifications_payments_mirror()', 'EXECUTE') then
    raise exception 'b4_d48_payments_notification_preference did not land: the trigger function is callable from the API';
  end if;
end $check$;
