-- ROLLBACK for rd01: the table deposit notice trigger switched off (disabled,
-- not removed). It calls a function that only writes notices; with it
-- disabled nobody is told of a refund or a kept deposit and nothing else
-- changes. The function and the notice keys already told stay.
--
-- A trigger change on public.reservation_deposits takes a short lock on the
-- table; lock_timeout makes it give up rather than queue behind a payment.
set lock_timeout = '5s';

alter table public.reservation_deposits disable trigger reservation_deposits_zz_notify;
