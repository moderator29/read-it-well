-- MON-05 backstop, applied AFTER the release in which lib/bookings/settlement.ts
-- calls public.settle_booking_charge (which never writes a second SUCCESSFUL).
create unique index if not exists transactions_one_success_per_booking
  on public.transactions (booking_id) where status = 'SUCCESSFUL';
