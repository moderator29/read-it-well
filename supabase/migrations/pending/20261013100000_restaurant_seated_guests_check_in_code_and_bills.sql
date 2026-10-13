-- PENDING, NOT APPLIED. Restaurants: seated guests, the check-in code, the
-- diner's answer, reviews only after a seated table, and the bill paid
-- through Vallo (founder decision D).
--
-- What it changes:
--   * public.restaurant_money_settings (new, one row): the fee per seated
--     guest (100000 kobo, 1,000 naira) and the commission on a bill paid
--     through Vallo, left NULL until the founder sets it (pay-the-bill then
--     says "not available yet").
--   * public.reservation_seatings (new): a six-digit check-in code per
--     reservation (made by a trigger on insert, backfilled for open tables),
--     the outcome (SEATED or NO_SHOW), who decided it (code, restaurant,
--     diner, bill, admin), the diner's answer, disputes.
--   * private.guard_reservation_write is replaced with one added line: a
--     write made inside a security definer function (current_user is the
--     owner, not authenticated or anon) passes, since that function already
--     decided who may act. Everything else in it is unchanged.
--   * private.notify_reservation is replaced with one change: a no-show the
--     diner reported themselves does not send them "Marked as not arriving".
--   * RPCs: reservation_seat_by_code, reservation_record_outcome,
--     reservation_diner_answer, reservation_resolve_seating (staff),
--     reservation_review_leave, restaurant_bill_enter, restaurant_bill_confirm,
--     restaurant_bill_open / _checkout_saved / _reopen / _settle (service role
--     only), restaurant_seated_fees (staff).
--   * private.ask_diners_about_unmarked_tables, scheduled hourly with pg_cron
--     when the extension is present: a confirmed table a day past its time
--     that the restaurant never marked asks the diner "Did you dine at X?".
--   * public.reservation_reviews (new): one review per seated reservation.
--   * public.restaurant_bills (new): the bill and its Paystack split.
--
-- MONEY: restaurant_bill_open/settle open and settle a Paystack charge split
-- to the restaurant's own subaccount, the same shape as the table deposit
-- (d75a). Needs the money owner's sign-off. No DROP of any table or function.

create or replace function private.guard_reservation_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  is_host boolean;
begin
  if coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon') then
    return new;
  end if;
  /* The seating functions below are security definer: inside them the
     write runs as the function's owner, which already decided who may act. */
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if private.has_role(me, 'admin'::public.app_role) or private.has_role(me, 'super_admin'::public.app_role) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'PENDING'::public.booking_status then
      raise exception 'reservation_starts_pending: a new reservation waits for the venue'
        using errcode = '42501';
    end if;
    new.responded_at := null;
    new.created_at := now();
    new.conversation_id := null;
    return new;
  end if;

  if new.guest_id is distinct from old.guest_id
     or new.business_id is distinct from old.business_id
     or new.listing_id is distinct from old.listing_id
     or new.party_size is distinct from old.party_size
     or new.reserved_for is distinct from old.reserved_for
     or new.created_at is distinct from old.created_at then
    raise exception 'reservation_fixed: who, where, when and how many do not change; make a new reservation'
      using errcode = '42501';
  end if;
  if new.conversation_id is distinct from old.conversation_id then
    if old.conversation_id is not null
       or not exists (select 1 from public.conversations c
                       where c.id = new.conversation_id and c.reservation_id = old.id) then
      raise exception 'reservation_conversation: a reservation carries its own thread, attached once'
        using errcode = '42501';
    end if;
  end if;

  is_host := old.guest_id is distinct from me
             and ((old.business_id is not null and private.owns_business(old.business_id))
                  or (old.listing_id is not null and exists (
                        select 1 from public.listings l
                         where l.id = old.listing_id and private.listing_agent_is_me(l.agent_id))));

  if is_host then
    if new.note is distinct from old.note then
      raise exception 'reservation_note_is_the_guests: the venue answers in the thread'
        using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and not ((old.status = 'PENDING' and new.status in ('CONFIRMED', 'CANCELLED'))
                or (old.status = 'CONFIRMED' and new.status = 'CANCELLED')
                or (old.status = 'CONFIRMED' and new.status in ('COMPLETED', 'NO_SHOW')
                    and old.reserved_for <= now())) then
      raise exception 'reservation_transition: the venue cannot move this reservation from % to % now', old.status, new.status
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     and not ((old.status = 'PENDING' and new.status = 'CANCELLED')
              or (old.status = 'CONFIRMED' and new.status = 'CANCELLED' and old.reserved_for > now())) then
    raise exception 'reservation_is_the_venues_to_answer: a guest can cancel a request, or a confirmed table that is still ahead'
      using errcode = '42501';
  end if;
  if new.responded_at is distinct from old.responded_at
     and not (new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED') then
    raise exception 'reservation_answer_is_the_venues: only the venue answers a request'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.notify_reservation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  host_user uuid;
  venue     text;
  guest     text;
  party     text;
  at_local  text;
  host_href text := '/agent/bookings';
begin
  if new.listing_id is not null then
    select a.user_id, l.title
      into host_user, venue
    from public.listings l
    join public.agents a on a.id = l.agent_id
    where l.id = new.listing_id;
  else
    select b.owner_id, b.name
      into host_user, venue
    from public.businesses b
    where b.id = new.business_id;
    host_href := '/host/reservations';
  end if;

  /* Rendered in Lagos, never in the server's zone, so the hour in the
     notification is the hour the kitchen will serve it. */
  at_local := to_char(new.reserved_for at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI');
  party := new.party_size || case when new.party_size = 1 then ' guest' else ' guests' end;
  guest := coalesce(
    (select p.display_name from public.profiles p where p.id = new.guest_id),
    'A guest'
  );

  if tg_op = 'INSERT' then
    perform private.notify(
      host_user,
      'booking',
      'Table requested at ' || coalesce(venue, 'your restaurant'),
      guest || ' asked for ' || party || ' on ' || at_local || '. Nothing is held until you accept.',
      host_href
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      perform private.notify(
        new.guest_id,
        'booking',
        'Your table is confirmed',
        coalesce(venue, 'The restaurant') || ' is expecting ' || party || ' on ' || at_local || '.',
        '/bookings'
      );
    elsif new.status = 'CANCELLED' then
      perform private.notify(
        new.guest_id,
        'booking',
        'Your table is not going ahead',
        coalesce(venue, 'The restaurant') || ' on ' || at_local || ' is cancelled. Message them if you want to try another time.',
        '/bookings'
      );
    elsif new.status = 'NO_SHOW'
          and coalesce(current_setting('vallo.seating_by', true), '') <> 'diner' then
      perform private.notify(
        new.guest_id,
        'booking',
        'Marked as not arriving',
        coalesce(venue, 'The restaurant') || ' recorded that nobody arrived for the table on ' || at_local
          || '. If you were there, reply in the thread and they can put it right.',
        '/bookings'
      );
    end if;
  end if;

  return new;
end;
$function$;

-- ============================================================ 1. the numbers
-- One row. The fee per seated guest is the founder's (1,000 naira). The
-- commission on a bill paid through Vallo is left NULL on purpose: until the
-- founder sets it, paying the bill through Vallo says "not available yet".
create table if not exists public.restaurant_money_settings (
  id boolean primary key default true check (id),
  seated_fee_minor bigint not null default 100000 check (seated_fee_minor >= 0),
  bill_commission_bps integer check (bill_commission_bps between 0 and 5000),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.restaurant_money_settings (id) values (true) on conflict (id) do nothing;
alter table public.restaurant_money_settings enable row level security;
create policy restaurant_money_settings_read on public.restaurant_money_settings
  for select to anon, authenticated using (true);
revoke all on public.restaurant_money_settings from anon, authenticated;
grant select on public.restaurant_money_settings to anon, authenticated;

-- ============================================================ 2. the seating
create table if not exists public.reservation_seatings (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  check_in_code text not null check (check_in_code ~ '^[0-9]{6}$'),
  outcome text check (outcome in ('SEATED', 'NO_SHOW')),
  outcome_by text check (outcome_by in ('code', 'restaurant', 'diner', 'bill', 'admin')),
  outcome_at timestamptz,
  seated_guests integer check (seated_guests > 0),
  restaurant_answer text check (restaurant_answer in ('SEATED', 'NO_SHOW')),
  restaurant_answered_at timestamptz,
  diner_asked_at timestamptz,
  diner_answer text check (diner_answer in ('dined', 'did_not_dine')),
  diner_answered_at timestamptz,
  disputed_at timestamptz,
  dispute_resolved_at timestamptz,
  dispute_resolved_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists reservation_seatings_seated_idx
  on public.reservation_seatings (business_id, outcome_at) where outcome = 'SEATED';
create index if not exists reservation_seatings_code_idx on public.reservation_seatings (check_in_code);
create index if not exists reservation_seatings_disputed_idx
  on public.reservation_seatings (disputed_at) where disputed_at is not null and dispute_resolved_at is null;

alter table public.reservation_seatings enable row level security;
create policy reservation_seatings_guest on public.reservation_seatings for select to authenticated
  using (exists (select 1 from public.reservations r
                  where r.id = reservation_seatings.reservation_id and r.guest_id = (select auth.uid())));
create policy reservation_seatings_host on public.reservation_seatings for select to authenticated
  using (exists (select 1 from public.reservations r
                  where r.id = reservation_seatings.reservation_id
                    and ((r.business_id is not null and private.owns_business(r.business_id))
                         or (r.listing_id is not null and exists (
                               select 1 from public.listings l
                                where l.id = r.listing_id and private.listing_agent_is_me(l.agent_id))))));
create policy reservation_seatings_staff on public.reservation_seatings for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
revoke all on public.reservation_seatings from anon, authenticated;
grant select on public.reservation_seatings to authenticated;

-- A short code the diner shows at the door: six digits, made with the row.
create or replace function private.new_check_in_code()
returns text language sql volatile set search_path to '' as $$
  select lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 8))::bit(32)::bigint % 1000000))::text, 6, '0');
$$;
revoke all on function private.new_check_in_code() from public, anon, authenticated;

create or replace function private.reservation_gets_a_code()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  insert into public.reservation_seatings (reservation_id, business_id, check_in_code)
  values (new.id, new.business_id, private.new_check_in_code())
  on conflict (reservation_id) do nothing;
  return new;
end $$;
revoke all on function private.reservation_gets_a_code() from public, anon, authenticated;

create trigger reservations_50_check_in_code
  after insert on public.reservations
  for each row execute function private.reservation_gets_a_code();

-- Every table still ahead, or waiting for its answer, gets its code now.
insert into public.reservation_seatings (reservation_id, business_id, check_in_code)
select r.id, r.business_id, private.new_check_in_code()
  from public.reservations r
 where r.status in ('PENDING', 'CONFIRMED')
on conflict (reservation_id) do nothing;

-- ============================================================ 3. who answers
create or replace function private.reservation_is_mine_to_host(p_reservation uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.reservations r
     where r.id = p_reservation
       and r.guest_id is distinct from auth.uid()
       and ((r.business_id is not null and private.owns_business(r.business_id))
            or (r.listing_id is not null and exists (
                  select 1 from public.listings l
                   where l.id = r.listing_id and private.listing_agent_is_me(l.agent_id)))));
$$;
revoke all on function private.reservation_is_mine_to_host(uuid) from public, anon;
grant execute on function private.reservation_is_mine_to_host(uuid) to authenticated;

-- Record an outcome on the reservation and its seating, in one place.
create or replace function private.settle_seating(p_reservation uuid, p_outcome text, p_by text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
begin
  select * into r from public.reservations where id = p_reservation for update;
  insert into public.reservation_seatings (reservation_id, business_id, check_in_code)
  values (r.id, r.business_id, private.new_check_in_code())
  on conflict (reservation_id) do nothing;
  if p_by = 'diner' then
    perform set_config('vallo.seating_by', 'diner', true);
  end if;
  update public.reservations
     set status = case when p_outcome = 'SEATED' then 'COMPLETED' else 'NO_SHOW' end::public.booking_status,
         updated_at = now()
   where id = p_reservation
     and status is distinct from (case when p_outcome = 'SEATED' then 'COMPLETED' else 'NO_SHOW' end)::public.booking_status;
  update public.reservation_seatings
     set outcome = p_outcome,
         outcome_by = p_by,
         outcome_at = now(),
         seated_guests = case when p_outcome = 'SEATED' then r.party_size else null end
   where reservation_id = p_reservation;
  perform set_config('vallo.seating_by', '', true);
end $$;
revoke all on function private.settle_seating(uuid, text, text) from public, anon, authenticated;

-- ============================================================ 4. the restaurant
-- The guest shows the code; the restaurant types it. Matched among this
-- host's confirmed tables from three hours before to a day after the time.
create or replace function public.reservation_seat_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  hits uuid[];
  r public.reservations%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'signed_out');
  end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then
    return jsonb_build_object('status', 'bad_code');
  end if;
  select array_agg(r2.id) into hits
    from public.reservation_seatings s
    join public.reservations r2 on r2.id = s.reservation_id
   where s.check_in_code = p_code
     and r2.status = 'CONFIRMED'
     and r2.reserved_for between now() - interval '24 hours' and now() + interval '3 hours'
     and private.reservation_is_mine_to_host(r2.id);
  if hits is null or cardinality(hits) = 0 then
    return jsonb_build_object('status', 'no_match');
  end if;
  if cardinality(hits) > 1 then
    return jsonb_build_object('status', 'ambiguous');
  end if;
  perform private.settle_seating(hits[1], 'SEATED', 'code');
  update public.reservation_seatings
     set restaurant_answer = 'SEATED', restaurant_answered_at = now()
   where reservation_id = hits[1];
  select * into r from public.reservations where id = hits[1];
  return jsonb_build_object('status', 'seated', 'reservation_id', r.id, 'party_size', r.party_size);
end $$;
revoke all on function public.reservation_seat_by_code(text) from public, anon;
grant execute on function public.reservation_seat_by_code(text) to authenticated;

-- Seated or No-show, tapped by the restaurant. Seated from three hours
-- before the time; No-show only once the time has passed. A restaurant that
-- disagrees with what the diner already said opens a dispute for Vallo.
create or replace function public.reservation_record_outcome(p_reservation uuid, p_outcome text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  s public.reservation_seatings%rowtype;
begin
  if p_outcome not in ('SEATED', 'NO_SHOW') then
    return jsonb_build_object('status', 'bad_outcome');
  end if;
  if not private.reservation_is_mine_to_host(p_reservation) then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into r from public.reservations where id = p_reservation for update;
  select * into s from public.reservation_seatings where reservation_id = p_reservation for update;
  if p_outcome = 'NO_SHOW' and r.reserved_for > now() then
    return jsonb_build_object('status', 'too_early');
  end if;
  if p_outcome = 'SEATED' and r.reserved_for > now() + interval '3 hours' then
    return jsonb_build_object('status', 'too_early');
  end if;
  if s.outcome_by in ('diner', 'bill', 'admin') then
    if s.outcome is distinct from p_outcome and s.outcome_by = 'diner' then
      update public.reservation_seatings
         set restaurant_answer = p_outcome, restaurant_answered_at = now(), disputed_at = coalesce(disputed_at, now())
       where reservation_id = p_reservation;
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (auth.uid(), 'reservation.seating_disputed', 'reservation', p_reservation::text,
              jsonb_build_object('restaurant', p_outcome, 'diner', s.diner_answer));
      return jsonb_build_object('status', 'disputed');
    end if;
    return jsonb_build_object('status', 'already', 'outcome', s.outcome);
  end if;
  if r.status not in ('CONFIRMED', 'COMPLETED', 'NO_SHOW') then
    return jsonb_build_object('status', 'not_open');
  end if;
  perform private.settle_seating(p_reservation, p_outcome, 'restaurant');
  update public.reservation_seatings
     set restaurant_answer = p_outcome, restaurant_answered_at = now()
   where reservation_id = p_reservation;
  return jsonb_build_object('status', 'recorded', 'outcome', p_outcome);
end $$;
revoke all on function public.reservation_record_outcome(uuid, text) from public, anon;
grant execute on function public.reservation_record_outcome(uuid, text) to authenticated;

-- ============================================================ 5. the diner
-- "Did you dine at X?" The diner answers once the restaurant has had a day.
-- A yes with no answer from the restaurant counts as seated. A diner who
-- disagrees with the restaurant opens a dispute for Vallo.
create or replace function public.reservation_diner_answer(p_reservation uuid, p_dined boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  s public.reservation_seatings%rowtype;
  said text := case when p_dined then 'dined' else 'did_not_dine' end;
  wanted text := case when p_dined then 'SEATED' else 'NO_SHOW' end;
begin
  select * into r from public.reservations where id = p_reservation for update;
  if r.id is null or r.guest_id is distinct from auth.uid() then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into s from public.reservation_seatings where reservation_id = p_reservation for update;
  if s.reservation_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if s.diner_answer is not null then
    return jsonb_build_object('status', 'already', 'answer', s.diner_answer);
  end if;
  if s.restaurant_answer is null and s.diner_asked_at is null and r.reserved_for > now() - interval '24 hours' then
    return jsonb_build_object('status', 'too_early');
  end if;
  update public.reservation_seatings
     set diner_answer = said, diner_answered_at = now()
   where reservation_id = p_reservation;
  if s.restaurant_answer is not null then
    if s.restaurant_answer is distinct from wanted then
      update public.reservation_seatings set disputed_at = coalesce(disputed_at, now())
       where reservation_id = p_reservation;
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (auth.uid(), 'reservation.seating_disputed', 'reservation', p_reservation::text,
              jsonb_build_object('restaurant', s.restaurant_answer, 'diner', said));
      return jsonb_build_object('status', 'disputed');
    end if;
    return jsonb_build_object('status', 'agreed');
  end if;
  if r.status <> 'CONFIRMED' then
    return jsonb_build_object('status', 'not_open');
  end if;
  perform private.settle_seating(p_reservation, wanted, 'diner');
  return jsonb_build_object('status', 'recorded', 'outcome', wanted);
end $$;
revoke all on function public.reservation_diner_answer(uuid, boolean) from public, anon;
grant execute on function public.reservation_diner_answer(uuid, boolean) to authenticated;

-- Hourly: a confirmed table a day past its time that the restaurant never
-- marked asks the diner. Once per table, and only for the last 30 days.
create or replace function private.ask_diners_about_unmarked_tables()
returns integer language plpgsql security definer set search_path to '' as $$
declare
  row record;
  asked integer := 0;
begin
  for row in
    select r.id, r.guest_id, r.reserved_for, coalesce(b.name, l.title, 'the restaurant') as venue
      from public.reservations r
      join public.reservation_seatings s on s.reservation_id = r.id
      left join public.businesses b on b.id = r.business_id
      left join public.listings l on l.id = r.listing_id
     where r.status = 'CONFIRMED'
       and r.reserved_for <= now() - interval '24 hours'
       and r.reserved_for > now() - interval '30 days'
       and s.outcome is null
       and s.diner_asked_at is null
     limit 500
  loop
    update public.reservation_seatings set diner_asked_at = now() where reservation_id = row.id;
    begin
      perform private.notify(row.guest_id, 'booking'::public.notification_kind,
        'Did you dine at ' || row.venue || '?',
        'Tell us whether you had your table on '
          || to_char(row.reserved_for at time zone 'Africa/Lagos', 'FMDay DD FMMon') || '. It takes one tap.',
        '/bookings?side=stays');
    exception when others then
      null;
    end;
    asked := asked + 1;
  end loop;
  return asked;
end $$;
revoke all on function private.ask_diners_about_unmarked_tables() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('vallo_ask_diners_unmarked_tables', '17 * * * *',
                          'select private.ask_diners_about_unmarked_tables();');
  end if;
end $$;

-- Vallo decides a dispute. Staff only.
create or replace function public.reservation_resolve_seating(p_reservation uuid, p_outcome text)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  if not (private.has_role(auth.uid(), 'admin'::public.app_role)
          or private.has_role(auth.uid(), 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'not_staff');
  end if;
  if p_outcome not in ('SEATED', 'NO_SHOW') then
    return jsonb_build_object('status', 'bad_outcome');
  end if;
  perform private.settle_seating(p_reservation, p_outcome, 'admin');
  update public.reservation_seatings
     set dispute_resolved_at = now(), dispute_resolved_by = auth.uid()
   where reservation_id = p_reservation;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'reservation.seating_resolved', 'reservation', p_reservation::text,
          jsonb_build_object('outcome', p_outcome));
  return jsonb_build_object('status', 'resolved', 'outcome', p_outcome);
end $$;
revoke all on function public.reservation_resolve_seating(uuid, text) from public, anon;
grant execute on function public.reservation_resolve_seating(uuid, text) to authenticated;

-- ============================================================ 6. reviews
-- Only a diner whose table was seated, and not under dispute, can review it.
create table if not exists public.reservation_reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  author_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 2000),
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.reservation_reviews enable row level security;
create policy reservation_reviews_read on public.reservation_reviews for select to anon, authenticated
  using (hidden_at is null or author_id = (select auth.uid()));
revoke all on public.reservation_reviews from anon, authenticated;
grant select on public.reservation_reviews to anon, authenticated;

create or replace function public.reservation_review_leave(p_reservation uuid, p_rating integer, p_body text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  s public.reservation_seatings%rowtype;
begin
  select * into r from public.reservations where id = p_reservation;
  if r.id is null or r.guest_id is distinct from auth.uid() then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into s from public.reservation_seatings where reservation_id = p_reservation;
  if s.outcome is distinct from 'SEATED' or (s.disputed_at is not null and s.dispute_resolved_at is null) then
    return jsonb_build_object('status', 'not_seated');
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    return jsonb_build_object('status', 'bad_rating');
  end if;
  insert into public.reservation_reviews (reservation_id, business_id, listing_id, author_id, rating, body)
  values (r.id, r.business_id, r.listing_id, r.guest_id, p_rating, nullif(btrim(coalesce(p_body, '')), ''))
  on conflict (reservation_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already');
  end if;
  return jsonb_build_object('status', 'saved');
end $$;
revoke all on function public.reservation_review_leave(uuid, integer, text) from public, anon;
grant execute on function public.reservation_review_leave(uuid, integer, text) to authenticated;

-- ============================================================ 7. the bill
-- Entered by the restaurant (ready to pay at once) or by the diner (the
-- restaurant confirms it). Paid by the diner through Paystack, split straight
-- to the restaurant's own subaccount with Vallo's commission kept by Vallo.
-- A paid bill marks the table seated.
create table if not exists public.restaurant_bills (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete set null,
  guest_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 1000000000),
  currency text not null default 'NGN' check (currency = 'NGN'),
  entered_by text not null check (entered_by in ('restaurant', 'diner')),
  status text not null check (status in ('awaiting_restaurant', 'awaiting_payment', 'pending', 'paid', 'cancelled')),
  confirmed_at timestamptz,
  provider_ref text unique,
  paystack_mode text,
  payee_user_id uuid,
  payee_subaccount_code text,
  commission_bps integer,
  commission_minor bigint,
  restaurant_share_minor bigint,
  authorization_url text,
  access_code text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists restaurant_bills_one_live
  on public.restaurant_bills (reservation_id) where status <> 'cancelled';
alter table public.restaurant_bills enable row level security;
create policy restaurant_bills_guest on public.restaurant_bills for select to authenticated
  using (guest_id = (select auth.uid()));
create policy restaurant_bills_host on public.restaurant_bills for select to authenticated
  using (private.reservation_is_mine_to_host(reservation_id));
create policy restaurant_bills_staff on public.restaurant_bills for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
revoke all on public.restaurant_bills from anon, authenticated;
grant select on public.restaurant_bills to authenticated;

create or replace function public.restaurant_bill_enter(p_reservation uuid, p_amount_minor bigint)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  r public.reservations%rowtype;
  b public.restaurant_bills%rowtype;
  host boolean;
begin
  select * into r from public.reservations where id = p_reservation;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  host := private.reservation_is_mine_to_host(p_reservation);
  if not host and r.guest_id is distinct from auth.uid() then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 1000000000 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if r.status not in ('CONFIRMED', 'COMPLETED')
     or r.reserved_for > now() + interval '3 hours'
     or r.reserved_for < now() - interval '3 days' then
    return jsonb_build_object('status', 'not_open');
  end if;
  select * into b from public.restaurant_bills
   where reservation_id = p_reservation and status <> 'cancelled' for update;
  if b.id is not null then
    if b.status in ('pending', 'paid') then
      return jsonb_build_object('status', 'locked');
    end if;
    if not host and b.entered_by = 'restaurant' then
      return jsonb_build_object('status', 'locked');
    end if;
    update public.restaurant_bills
       set amount_minor = p_amount_minor,
           entered_by = case when host then 'restaurant' else 'diner' end,
           status = case when host then 'awaiting_payment' else 'awaiting_restaurant' end,
           confirmed_at = case when host then now() else null end,
           updated_at = now()
     where id = b.id;
    return jsonb_build_object('status', 'saved', 'bill_id', b.id);
  end if;
  insert into public.restaurant_bills (reservation_id, business_id, guest_id, amount_minor, entered_by, status, confirmed_at)
  values (r.id, r.business_id, r.guest_id, p_amount_minor,
          case when host then 'restaurant' else 'diner' end,
          case when host then 'awaiting_payment' else 'awaiting_restaurant' end,
          case when host then now() else null end)
  returning * into b;
  return jsonb_build_object('status', 'saved', 'bill_id', b.id);
end $$;
revoke all on function public.restaurant_bill_enter(uuid, bigint) from public, anon;
grant execute on function public.restaurant_bill_enter(uuid, bigint) to authenticated;

create or replace function public.restaurant_bill_confirm(p_bill uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  b public.restaurant_bills%rowtype;
begin
  select * into b from public.restaurant_bills where id = p_bill for update;
  if b.id is null or not private.reservation_is_mine_to_host(b.reservation_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if b.status <> 'awaiting_restaurant' then
    return jsonb_build_object('status', 'already', 'bill_status', b.status);
  end if;
  update public.restaurant_bills set status = 'awaiting_payment', confirmed_at = now(), updated_at = now()
   where id = p_bill;
  return jsonb_build_object('status', 'confirmed');
end $$;
revoke all on function public.restaurant_bill_confirm(uuid) from public, anon;
grant execute on function public.restaurant_bill_confirm(uuid) to authenticated;

-- Service role only: the server opens the checkout after this answers ok.
create or replace function public.restaurant_bill_open(p_bill uuid, p_guest uuid, p_mode text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  b public.restaurant_bills%rowtype;
  owner uuid;
  sub text;
  bps integer;
  commission bigint;
begin
  select * into b from public.restaurant_bills where id = p_bill for update;
  if b.id is null or b.guest_id is distinct from p_guest then
    return jsonb_build_object('status', 'not_found');
  end if;
  if b.status = 'pending' and b.provider_ref is not null then
    return jsonb_build_object('status', 'pending', 'reference', b.provider_ref, 'amount_minor', b.amount_minor,
                              'authorization_url', b.authorization_url, 'access_code', b.access_code);
  end if;
  if b.status = 'paid' then
    return jsonb_build_object('status', 'already_paid');
  end if;
  if b.status <> 'awaiting_payment' then
    return jsonb_build_object('status', 'awaiting_restaurant');
  end if;
  select s.bill_commission_bps into bps from public.restaurant_money_settings s where s.id;
  if bps is null then
    return jsonb_build_object('status', 'not_priced');
  end if;
  select bz.owner_id into owner from public.businesses bz where bz.id = b.business_id;
  if owner is null then
    select a.user_id into owner
      from public.reservations r join public.listings l on l.id = r.listing_id join public.agents a on a.id = l.agent_id
     where r.id = b.reservation_id;
  end if;
  sub := private.payee_subaccount(owner);
  if sub is null then
    return jsonb_build_object('status', 'payee_not_set_up');
  end if;
  commission := (b.amount_minor * bps) / 10000;
  update public.restaurant_bills
     set status = 'pending', provider_ref = 'rm-bill-' || gen_random_uuid()::text, paystack_mode = p_mode,
         payee_user_id = owner, payee_subaccount_code = sub, commission_bps = bps,
         commission_minor = commission, restaurant_share_minor = b.amount_minor - commission,
         authorization_url = null, access_code = null, updated_at = now()
   where id = b.id
  returning * into b;
  return jsonb_build_object('status', 'ok', 'reference', b.provider_ref, 'amount_minor', b.amount_minor,
                            'payee_subaccount_code', b.payee_subaccount_code,
                            'restaurant_share_minor', b.restaurant_share_minor, 'commission_minor', b.commission_minor);
end $$;
revoke all on function public.restaurant_bill_open(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.restaurant_bill_open(uuid, uuid, text) to service_role;

create or replace function public.restaurant_bill_checkout_saved(p_reference text, p_url text, p_code text)
returns void language sql security definer set search_path to '' as $$
  update public.restaurant_bills set authorization_url = p_url, access_code = p_code, updated_at = now()
   where provider_ref = p_reference and status = 'pending';
$$;
revoke all on function public.restaurant_bill_checkout_saved(text, text, text) from public, anon, authenticated;
grant execute on function public.restaurant_bill_checkout_saved(text, text, text) to service_role;

-- A checkout that failed or was abandoned goes back to waiting for payment.
create or replace function public.restaurant_bill_reopen(p_reference text)
returns text language sql security definer set search_path to '' as $$
  with moved as (
    update public.restaurant_bills
       set status = 'awaiting_payment', provider_ref = null, authorization_url = null, access_code = null, updated_at = now()
     where provider_ref = p_reference and status = 'pending'
    returning 1)
  select case when exists (select 1 from moved) then 'changed' else 'unchanged' end;
$$;
revoke all on function public.restaurant_bill_reopen(text) from public, anon, authenticated;
grant execute on function public.restaurant_bill_reopen(text) to service_role;

-- Service role only: called once Paystack has confirmed the charge.
create or replace function public.restaurant_bill_settle(p_reference text, p_amount_minor bigint, p_currency text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  b public.restaurant_bills%rowtype;
  r public.reservations%rowtype;
  s public.reservation_seatings%rowtype;
  venue text;
begin
  select * into b from public.restaurant_bills where provider_ref = p_reference for update;
  if b.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if b.status = 'paid' then
    return jsonb_build_object('outcome', 'duplicate');
  end if;
  if p_amount_minor is distinct from b.amount_minor or p_currency is distinct from b.currency then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A restaurant bill was paid with the wrong amount',
            format('Reference %s took %s kobo for a bill of %s kobo (reservation %s). Check and refund by hand.',
                   p_reference, p_amount_minor, b.amount_minor, b.reservation_id),
            'reservation', b.reservation_id::text);
    return jsonb_build_object('outcome', 'mismatch');
  end if;
  update public.restaurant_bills set status = 'paid', paid_at = now(), updated_at = now() where id = b.id;
  if coalesce(b.commission_minor, 0) > 0 then
    perform private.ledger_append(
      'vallo_revenue', 'restaurant_bill:' || b.id::text, 'FEE_CHARGED', 'in', b.commission_minor, b.currency,
      'paystack', p_reference, null, 'direct', 'confirmed',
      jsonb_build_object('kind', 'restaurant_bill', 'bill_id', b.id, 'reservation_id', b.reservation_id,
                         'commission_bps', b.commission_bps, 'gross_minor', b.amount_minor),
      null, b.guest_id);
  end if;
  select * into r from public.reservations where id = b.reservation_id;
  select * into s from public.reservation_seatings where reservation_id = b.reservation_id;
  if s.outcome is distinct from 'SEATED' then
    perform private.settle_seating(b.reservation_id, 'SEATED', 'bill');
  end if;
  select bz.name into venue from public.businesses bz where bz.id = b.business_id;
  begin
    perform private.notify(b.guest_id, 'booking'::public.notification_kind, 'Bill paid',
      'Your bill at ' || coalesce(venue, 'the restaurant') || ' is paid. Thank you.', '/bookings?side=stays');
    if b.payee_user_id is not null then
      perform private.notify(b.payee_user_id, 'booking'::public.notification_kind, 'A bill was paid through Vallo',
        'A table''s bill was paid and goes to your bank account.', '/host/reservations');
    end if;
  exception when others then
    null;
  end;
  return jsonb_build_object('outcome', 'settled');
end $$;
revoke all on function public.restaurant_bill_settle(text, bigint, text) from public, anon, authenticated;
grant execute on function public.restaurant_bill_settle(text, bigint, text) to service_role;

-- ============================================================ 8. what is owed
-- Staff only: per restaurant per Lagos month, the seated tables and guests,
-- the fee owed at the current fee per seated guest, and the bills paid
-- through Vallo with the commission they carried. A seating under an open
-- dispute is left out until it is decided.
create or replace function public.restaurant_seated_fees(p_months integer default 6)
returns table (
  business_id uuid,
  business_name text,
  month date,
  seated_tables integer,
  seated_guests integer,
  fee_minor bigint,
  bills_paid integer,
  bill_commission_minor bigint
)
language plpgsql stable security definer set search_path to '' as $$
declare
  fee bigint;
begin
  if not (private.has_role(auth.uid(), 'admin'::public.app_role)
          or private.has_role(auth.uid(), 'super_admin'::public.app_role)) then
    return;
  end if;
  select s.seated_fee_minor into fee from public.restaurant_money_settings s where s.id;
  return query
  with seated as (
    select s.business_id,
           date_trunc('month', s.outcome_at at time zone 'Africa/Lagos')::date as month,
           count(*)::integer as tables,
           coalesce(sum(s.seated_guests), 0)::integer as guests
      from public.reservation_seatings s
     where s.outcome = 'SEATED'
       and s.business_id is not null
       and (s.disputed_at is null or s.dispute_resolved_at is not null)
       and s.outcome_at >= date_trunc('month', now() at time zone 'Africa/Lagos') - make_interval(months => greatest(p_months, 1) - 1)
     group by 1, 2
  ), bills as (
    select b.business_id,
           date_trunc('month', b.paid_at at time zone 'Africa/Lagos')::date as month,
           count(*)::integer as paid,
           coalesce(sum(b.commission_minor), 0)::bigint as commission
      from public.restaurant_bills b
     where b.status = 'paid' and b.business_id is not null
     group by 1, 2
  )
  select coalesce(se.business_id, bi.business_id),
         bz.name,
         coalesce(se.month, bi.month),
         coalesce(se.tables, 0),
         coalesce(se.guests, 0),
         coalesce(se.guests, 0)::bigint * coalesce(fee, 0),
         coalesce(bi.paid, 0),
         coalesce(bi.commission, 0)
    from seated se
    full join bills bi on bi.business_id = se.business_id and bi.month = se.month
    left join public.businesses bz on bz.id = coalesce(se.business_id, bi.business_id)
   order by 3 desc, 2;
end $$;
revoke all on function public.restaurant_seated_fees(integer) from public, anon;
grant execute on function public.restaurant_seated_fees(integer) to authenticated;
