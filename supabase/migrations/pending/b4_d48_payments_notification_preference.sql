-- D48 step 2 (R3-31): the `wallet` notification preference becomes `payments`.
-- Pending: NOT applied.
--
-- profiles.settings.notifications.wallet is copied to
-- profiles.settings.notifications.payments for every member who has the old
-- key and not yet the new one. ADDITIVE: the old key stays, so the current
-- settings page (Session 3 owns the label and the toggle) keeps reading what
-- it reads until it moves to `payments`. A member who already has `payments`
-- keeps their own choice. Members with no notifications object at all are
-- left alone: the default applies to them on both keys. Idempotent: a second
-- run finds nothing to copy. A trigger keeps new writes in step until the
-- settings page writes `payments` itself. No `delete from`, no `drop trigger`.

set local lock_timeout = '5s';

update public.profiles
   set settings = jsonb_set(settings, '{notifications,payments}', settings -> 'notifications' -> 'wallet', true)
 where jsonb_typeof(settings -> 'notifications') = 'object'
   and (settings -> 'notifications') ? 'wallet'
   and not (settings -> 'notifications') ? 'payments';

-- Until the settings page writes `payments` itself, a write that carries only
-- `wallet` (a new member's defaults, or the old toggle) fills `payments` from
-- it. Once `payments` exists the member's own choice is never overwritten.
create or replace function private.notifications_payments_from_wallet()
returns trigger language plpgsql set search_path = '' as $$
begin
  if jsonb_typeof(new.settings -> 'notifications') = 'object'
     and (new.settings -> 'notifications') ? 'wallet'
     and not (new.settings -> 'notifications') ? 'payments' then
    new.settings := jsonb_set(new.settings, '{notifications,payments}', new.settings -> 'notifications' -> 'wallet', true);
  end if;
  return new;
end $$;
revoke all on function private.notifications_payments_from_wallet() from public, anon, authenticated;

create or replace trigger profiles_notifications_payments
  before insert or update of settings on public.profiles
  for each row execute function private.notifications_payments_from_wallet();

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
end $check$;
