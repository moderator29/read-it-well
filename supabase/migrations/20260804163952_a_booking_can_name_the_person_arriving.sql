-- The person paying is not always the person arriving.
--
-- The defining Nigerian case: a sister in London pays for a cousin flying into
-- Lagos. `bookings.guest_id` is one auth user and every email goes to that
-- user, so today the arrival directions and the gate code go to London while
-- the person standing at the security post in Lekki has nothing. The host also
-- has no idea who is actually going to turn up, which is a safety problem
-- before it is a convenience one.
--
-- Three optional columns, not a second identity. The arriving guest gets no
-- account, no row in profiles and no login: they are a name, a number the gate
-- can ring, and optionally an address the arrival details can be sent to. That
-- is deliberately the smallest thing that solves it. A second user record would
-- need consent, a verification path and a deletion story, none of which a
-- cousin who never asked to join RentMe should be dragged through.
--
-- WHO CAN READ THEM. Nobody new. `bookings_guest_select` gives the payer their
-- own rows, `bookings_host_select` gives the host the bookings against their
-- listings, and `bookings_admin_all` covers support. The name and the phone
-- ride on the booking row and are visible to exactly those three, which is the
-- correct set: the host needs it to let somebody through a gate.
--
-- NAMING SOMEBODY MEANS GIVING A WAY TO REACH THEM. A name with no phone is
-- worse than no name at all, because it tells the security desk who to expect
-- and gives the host no way to check. The database refuses that combination
-- rather than leaving it to a form that might one day forget.

alter table public.bookings
  add column if not exists guest_name  text,
  add column if not exists guest_phone text,
  add column if not exists guest_email text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_guest_name_len_chk') then
    alter table public.bookings
      add constraint bookings_guest_name_len_chk
      check (guest_name is null or (length(btrim(guest_name)) >= 2 and length(guest_name) <= 80));
  end if;

  -- Shape only, and canonical. The application normalises 0803..., 234803...
  -- and +234 803 ... into one form before it ever gets here, so a host reading
  -- two bookings sees the same number written the same way.
  if not exists (select 1 from pg_constraint where conname = 'bookings_guest_phone_shape_chk') then
    alter table public.bookings
      add constraint bookings_guest_phone_shape_chk
      check (guest_phone is null or guest_phone ~ '^\+234[7-9][0-9]{9}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_guest_email_shape_chk') then
    alter table public.bookings
      add constraint bookings_guest_email_shape_chk
      check (
        guest_email is null
        or (length(guest_email) <= 160
            and guest_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
      );
  end if;

  -- Either this booking says nothing about a third party, or it names one and
  -- gives a number for them. There is no half state.
  if not exists (select 1 from pg_constraint where conname = 'bookings_arriving_guest_chk') then
    alter table public.bookings
      add constraint bookings_arriving_guest_chk
      check (
        (guest_name is null and guest_phone is null and guest_email is null)
        or (guest_name is not null and guest_phone is not null)
      );
  end if;
end $$;

comment on column public.bookings.guest_name is
  'The person actually arriving, when that is not the payer. Null means the payer is the guest. Read by the payer, the host and an admin, and by nobody else.';
comment on column public.bookings.guest_phone is
  'How the gate reaches the arriving guest. Canonical +234 form, required whenever guest_name is set.';
comment on column public.bookings.guest_email is
  'Where the arrival details and the gate instructions are sent on confirmation. Optional: with no address the payer receives them and passes them on.';
