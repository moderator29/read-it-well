-- DRAFT, not applied. NOTIFICATIONS 4 of 5. Needs nt01.
--
-- Five small gaps, each one event that changed something a person cares about
-- and told them nothing in the app:
--
--   1. PASSWORD CHANGED. An email already goes (enqueue_password_changed_email);
--      the app and the lock screen heard nothing. The one security notice that
--      is wanted on a phone in the next minute and was email only.
--   2. PHONE CONFIRMED. public.confirmed_phones gets a row and the person is
--      told nothing, though the number is what sign-in, referral and payout
--      checks lean on.
--   3. AGREEMENT: BOTH CONFIRMED, AND CANCELLED. The email goes
--      (enqueue_agreement_lifecycle_email); the in-app notice exists for
--      "waiting", "approved" and "sent back" only. Moving to in_review (both
--      parties confirmed) and cancelled said nothing in the app to either side.
--   4. MANDATE DECIDED. Staff approve or reject the ownership proof a lister
--      filed for a listing (public.decide_listing_mandate) and the lister is
--      not told: the listing simply stays held or goes live.
--   5. OWNERSHIP SEEN. When a reviewer first dates ownership_verified_at on a
--      listing the badge appears and nobody says so.
--
-- Each goes through private.notify_once (nt01): once per event, and the person's
-- Bookings switch still applies where the kind is 'booking'. Every trigger
-- swallows its own errors: it hangs off a security-relevant write (the auth
-- schema, a staff decision) and may never be the reason that write fails. No
-- existing function is replaced. Words never say "verified": the first claim
-- here is "Ownership seen", the mark the help centre already defines, and the
-- phone line says "confirmed", which the one-time code backs.
--
-- Additive only, nothing is removed: new functions and five new triggers.
-- Probe: supabase/tests/probes-pending/nt04-account-agreement-and-listing-notices.sql
set lock_timeout = '5s';

/* ---- 1. Password changed ---------------------------------------------- */

create or replace function private.notify_password_changed()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  begin
    perform private.notify_once(
      'password:' || new.id::text || ':' || to_char(now() at time zone 'utc', 'YYYYMMDDHH24MI'),
      new.id, 'system', 'Your password was changed',
      'If this was you, there is nothing to do. If it was not, open Devices to sign out other devices, then reset your password.',
      '/settings/devices');
  exception when others then
    raise warning '[notify] password changed notice failed: %', sqlstate;
  end;
  return new;
end;
$fn$;

create or replace trigger users_zz_notify_password_changed
  after update of encrypted_password on auth.users
  for each row
  when (old.encrypted_password is not null
        and new.encrypted_password is not null
        and (old.encrypted_password)::text is distinct from (new.encrypted_password)::text)
  execute function private.notify_password_changed();

/* ---- 2. Phone confirmed ------------------------------------------------ */

create or replace function private.notify_phone_confirmed()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  last4 text := right(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), 4);
begin
  begin
    perform private.notify_once(
      'phone:' || new.user_id::text || ':' || md5(coalesce(new.phone, '')),
      new.user_id, 'system', 'Phone number confirmed',
      case when length(last4) = 4
        then 'The number ending ' || last4 || ' is now confirmed on your account.'
        else 'Your phone number is now confirmed on your account.' end,
      '/settings/phone');
  exception when others then
    raise warning '[notify] phone confirmed notice failed: %', sqlstate;
  end;
  return new;
end;
$fn$;

create or replace trigger confirmed_phones_zz_notify_confirmed
  after insert or update of phone on public.confirmed_phones
  for each row execute function private.notify_phone_confirmed();

/* ---- 3. Agreement: both confirmed, and cancelled ----------------------- */

create or replace function private.tell_agreement_change(
  p_agreement uuid,
  p_terms_version text,
  p_status text,
  p_place text,
  p_renter uuid,
  p_owner uuid
)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  who uuid;
  href text := '/agreements/' || p_agreement::text;
  base text := 'agreement:' || p_agreement::text || ':' || coalesce(p_terms_version, '0') || ':' || p_status || ':';
begin
  foreach who in array array[p_renter, p_owner] loop
    if p_status = 'in_review' then
      perform private.notify_once(base || who::text, who, 'booking', 'Both of you confirmed',
        p_place || ' is with Vallo for a check before payment opens. We will tell you the moment it is done.',
        href);
    elsif p_status = 'cancelled' then
      perform private.notify_once(base || who::text, who, 'booking', 'Agreement cancelled',
        'The agreement for ' || p_place || ' was cancelled.',
        href);
    end if;
  end loop;
end;
$fn$;

create or replace function private.notify_agreement_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  place text;
begin
  begin
    if new.status is not distinct from old.status
       or new.status::text not in ('in_review', 'cancelled') then
      return new;
    end if;
    place := coalesce(
      (select l.title from public.listings l where l.id = new.listing_id),
      (select ac.name from public.accommodations ac where ac.id = new.accommodation_id),
      'Your agreement');
    perform private.tell_agreement_change(
      new.id, new.terms_version::text, new.status::text, place, new.renter_id, new.owner_id);
  exception when others then
    raise warning '[notify] agreement notice failed: %', sqlstate;
  end;
  return new;
end;
$fn$;

create or replace trigger deal_agreements_zz_notify_change
  after update of status on public.deal_agreements
  for each row execute function private.notify_agreement_change();

/* ---- 4. Mandate decided ------------------------------------------------ */

create or replace function private.tell_mandate_decided(
  p_mandate uuid,
  p_listing uuid,
  p_status text,
  p_principal text,
  p_reason text,
  p_lister uuid,
  p_title text
)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  href text := '/agent/listings/' || p_listing::text || '/mandate';
begin
  if p_status = 'approved' then
    perform private.notify_once('mandate:' || p_mandate::text || ':approved', p_lister, 'listing',
      'We confirmed who you are letting for',
      'The mandate from ' || coalesce(p_principal, 'the owner') || ' for ' || coalesce(p_title, 'your listing') || ' is approved.',
      href);
  elsif p_status = 'rejected' then
    perform private.notify_once('mandate:' || p_mandate::text || ':rejected', p_lister, 'listing',
      'Your mandate was not approved',
      coalesce(p_title, 'Your listing') || ': '
        || left(coalesce(nullif(btrim(p_reason), ''), 'Open the mandate page to see what is needed.'), 160),
      href);
  end if;
end;
$fn$;

create or replace function private.notify_mandate_decided()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  lister uuid;
  ttl text;
begin
  begin
    if new.review_status::text is not distinct from old.review_status::text
       or new.review_status::text not in ('approved', 'rejected') then
      return new;
    end if;
    select a.user_id, l.title into lister, ttl
      from public.listings l
      join public.agents a on a.id = l.agent_id
     where l.id = new.listing_id;
    if lister is null then
      return new;
    end if;
    perform private.tell_mandate_decided(
      new.id, new.listing_id, new.review_status::text, new.principal_name, new.rejection_reason, lister, ttl);
  exception when others then
    raise warning '[notify] mandate notice failed: %', sqlstate;
  end;
  return new;
end;
$fn$;

create or replace trigger listing_mandates_zz_notify_decided
  after update of review_status on public.listing_mandates
  for each row execute function private.notify_mandate_decided();

/* ---- 5. Ownership seen ------------------------------------------------- */

create or replace function private.tell_ownership_seen(p_listing uuid, p_lister uuid, p_title text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  perform private.notify_once('ownership:' || p_listing::text, p_lister, 'listing',
    'Ownership seen',
    'A reviewer saw your proof of ownership for ' || coalesce(p_title, 'your listing')
      || '. The mark now shows on the listing with its date. It is not a title search.',
    '/agent/listings');
end;
$fn$;

create or replace function private.notify_ownership_seen()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  lister uuid;
begin
  begin
    if old.ownership_verified_at is not null or new.ownership_verified_at is null then
      return new;
    end if;
    select a.user_id into lister from public.agents a where a.id = new.agent_id;
    perform private.tell_ownership_seen(new.id, lister, new.title);
  exception when others then
    raise warning '[notify] ownership seen notice failed: %', sqlstate;
  end;
  return new;
end;
$fn$;

create or replace trigger listings_zz_notify_ownership_seen
  after update of ownership_verified_at on public.listings
  for each row execute function private.notify_ownership_seen();

revoke all on function
  private.notify_password_changed(),
  private.notify_phone_confirmed(),
  private.tell_agreement_change(uuid, text, text, text, uuid, uuid),
  private.notify_agreement_change(),
  private.tell_mandate_decided(uuid, uuid, text, text, text, uuid, text),
  private.notify_mandate_decided(),
  private.tell_ownership_seen(uuid, uuid, text),
  private.notify_ownership_seen()
  from public, anon, authenticated, service_role;
