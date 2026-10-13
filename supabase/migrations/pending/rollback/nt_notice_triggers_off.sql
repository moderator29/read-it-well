-- ROLLBACK for nt02 to nt04 and nt06: the ten notice triggers switched off
-- (disabled, not removed). Each calls a function that only writes a notice;
-- with the trigger disabled nothing is told and nothing else changes. The
-- functions, private.notice_keys and the notice keys already told stay.
-- Run it before nt05_send_member_reminders.sql when undoing the whole set.
--
-- A trigger on public.transactions or public.bookings takes a short lock on the
-- table; lock_timeout makes it give up rather than queue behind a payment.
set lock_timeout = '5s';

alter table public.transactions disable trigger transactions_zz_notify_payment_received;
alter table public.provider_arrangements disable trigger provider_arrangements_zz_notify_change;
alter table public.referrals disable trigger referrals_zz_notify_referrer;
alter table public.rewards_payouts disable trigger rewards_payouts_zz_notify_member;
alter table auth.users disable trigger users_zz_notify_password_changed;
alter table public.confirmed_phones disable trigger confirmed_phones_zz_notify_confirmed;
alter table public.deal_agreements disable trigger deal_agreements_zz_notify_change;
alter table public.listing_mandates disable trigger listing_mandates_zz_notify_decided;
alter table public.listings disable trigger listings_zz_notify_ownership_seen;
alter table public.bookings disable trigger bookings_zz_notify_request_closed;
