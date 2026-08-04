-- The notification switches now actually switch something off.
--
-- /settings has offered four switches (Bookings, Messages, Wallet, Ideas and
-- offers) since the settings page shipped. They wrote to profiles.settings
-- under RLS, the card said "Saved to your account", and nothing anywhere read
-- the value. A person could turn Bookings off and keep receiving every booking
-- notification and every booking email, which is worse than not offering the
-- switch at all.
--
-- private.notify is the one door every in-app notification goes through, from
-- eleven triggers and two service-role call sites, so it is the only place
-- this has to be enforced. A kind the switches do not name is always
-- delivered.
--
-- Two deliberate exceptions:
--
--   Wallet stays in-app whatever the switch says. A reversed withdrawal or a
--   failed transfer is money at risk, and a product that silently swallows
--   that because of a preference is not being respectful, it is being
--   negligent. The switch still silences wallet EMAIL, which is where the
--   noise actually is, and the settings copy says so plainly.
--
--   Absent or malformed settings mean "deliver". jsonb can hold anything an
--   older version of the app wrote, and the failure direction for a
--   notification is to send it.

create or replace function private.notify(
  target_user uuid,
  n_kind      notification_kind,
  n_title     text,
  n_body      text,
  n_href      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pref_key text;
  wanted   boolean;
begin
  if target_user is null then
    return;
  end if;

  -- Only these two are silenced in app. Everything else, including wallet,
  -- listing, agent, support, system and social, is always delivered.
  pref_key := case n_kind
    when 'booking' then 'bookings'
    when 'message' then 'messages'
    else null
  end;

  if pref_key is not null then
    -- The typeof guard is not decoration: profiles.settings is jsonb, so the
    -- value could be a string or a number written by an older client, and a
    -- bare ::boolean cast on that raises 22P02 inside a trigger and takes the
    -- whole booking write down with it.
    select case
             when jsonb_typeof(p.settings -> 'notifications' -> pref_key) = 'boolean'
             then (p.settings -> 'notifications' ->> pref_key)::boolean
             else null
           end
      into wanted
    from public.profiles p
    where p.id = target_user;

    -- Only an explicit false silences. Null, missing, or a value that is not a
    -- boolean all mean the person never chose, so we deliver.
    if wanted is not null and wanted = false then
      return;
    end if;
  end if;

  insert into public.notifications (user_id, kind, title, body, href)
  values (target_user, n_kind, n_title, n_body, n_href);
end;
$$;

comment on function private.notify(uuid, notification_kind, text, text, text) is
  'The one door for in-app notifications. Honours profiles.settings.notifications for booking and message kinds; wallet and every other kind are always delivered.';
