-- B4. A refund tells the guest what came back.
--
-- THE GAP. The refund desk (lib/admin/bookings-actions.ts, cancelBookingAsAdmin)
-- moves the money inside private.refund_and_cancel_booking, writes the
-- audit_log line, and sends the guest an email carrying the amount and the
-- reason, which is what /cancellations promises in writing. In the product
-- itself the guest gets one line, from private.notify_booking_change:
-- "Your stay has been cancelled." Not one word about money. A person whose
-- deposit has just come back learns it from an email that may be in a spam
-- folder, on a handset where the inbox is a second application, in a market
-- where email is the channel people trust least. The one surface that is
-- certain to be opened says nothing.
--
-- So the money event gets its own line, written where the money lands rather
-- than where the booking changes: one AFTER INSERT trigger on
-- public.booking_refunds. That table is append only by trigger already
-- (booking_refunds_no_update, booking_refunds_no_delete), so one row is one
-- decision and the notification cannot be written twice for one refund. It is
-- written inside the refund transaction, exactly as notify_booking_change is
-- written inside the booking transaction, so a refund that committed and a
-- guest who was told are the same event.
--
-- THE KIND IS 'wallet', DELIBERATELY. 20260804134543 makes private.notify
-- honour the four notification switches, and wallet is one of two kinds that
-- is delivered in app whatever the switch says, because money at risk is not
-- something a preference should silently swallow. A refund is money. The
-- switch still silences the wallet EMAIL, which is where the noise is.
--
-- THE AMOUNT IS FORMATTED THE WAY THE WALLET ALREADY FORMATS IT. The
-- expression is copied character for character from
-- 20260729112606_notifications.sql and 20260729172743_wallet_notify_failures.sql
-- so a refund line and a wallet line cannot print the same kobo two ways. The
-- platform rule is that money is integer kobo and is displayed through
-- formatMoney; this is the one established exception, because a notification
-- body is composed in the database and there is no renderer between here and
-- the person. If that ever moves into one helper, these three call sites move
-- together.
--
-- A ZERO REFUND IS ALSO TOLD. The schedule returning nothing is a real
-- outcome, and a guest who paid and got nothing back is the person most owed
-- an explanation. The line says what happened, names no schedule it cannot
-- keep, and points at support without promising an outcome. It carries the
-- 'booking' kind, because that one IS a preference the person may switch off.
--
-- THE HREF OBEYS THE SIDE LAW. A refund lands in the wallet, and /wallet is a
-- shared route that keeps whichever shell the person is in. A zero refund
-- points at the booking's own shelf, /trips for a place let by the night and
-- /bookings for a tenancy, the same rule
-- 20260919101500_b4_a_stay_notification_lands_on_the_stays_side.sql applies.
--
-- ADDITIVE. One new function in private, one new trigger. No table, column or
-- policy changes, no existing function replaced, no row rewritten. Dropping
-- the trigger is the whole of the undo.
--
-- THE ONE REVOKE, AND WHY IT IS NOT THE STOP LIST'S KIND. The file ends with
-- `revoke execute ... from public, anon, authenticated` on the function it has
-- just created three lines earlier. That takes nothing away from anybody:
-- Supabase's default privileges hand EXECUTE on every new function to both
-- client roles, so without this line the function would be born reachable over
-- PostgREST by a stranger. It is part of creating the object safely and it is
-- exactly what private.notify itself carries (20260729112606) and what B4's
-- own private.inventory_drift carries (20260918151100). The revokes the stop
-- list means are the ones that remove access somebody currently has, like the
-- B5 file parked in pending/.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the lead, through the Supabase MCP, as ONE statement batch that
-- ends in ROLLBACK. NOT RUN FROM THE SANDBOX, which holds no database
-- credentials, so nothing below has been executed by its author.
--
-- It proves that a refund with money writes one wallet line carrying the exact
-- kobo, that a zero refund writes the honest line instead, that neither is
-- written twice, and that THE CROSS-USER READ FAILS: a second account reads
-- none of the first account's refund rows and none of their notifications.
--
--   begin;
--
--   insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
--   values
--     ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rf-probe-host@example.invalid',  'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
--     ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rf-probe-guest@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
--     ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rf-probe-third@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');
--
--   insert into public.agents (id, user_id, display_name)
--   values ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000f1', 'RF probe host');
--
--   insert into public.listings (id, agent_id, title, property_type, is_demo, status, rate_period)
--   values ('00000000-0000-4000-8000-0000000000f5', '00000000-0000-4000-8000-0000000000f4', 'RF probe hotel room', 'hotel', false, 'PUBLISHED', 'night');
--
--   do $probe$
--   declare
--     guest uuid := '00000000-0000-4000-8000-0000000000f2';
--     third uuid := '00000000-0000-4000-8000-0000000000f3';
--     today date := (now() at time zone 'Africa/Lagos')::date;
--     price bigint := 5000000;
--     n     integer;
--     line  text;
--   begin
--     insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
--     values ('00000000-0000-4000-8000-0000000000f6', '00000000-0000-4000-8000-0000000000f5', guest, today + 10, today + 12, 2, price, price * 2, price * 2, 'PENDING'),
--            ('00000000-0000-4000-8000-0000000000f7', '00000000-0000-4000-8000-0000000000f5', guest, today + 20, today + 22, 2, price, price * 2, price * 2, 'PENDING');
--
--     -- 1. A refund with money in it.
--     insert into public.booking_refunds (booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, wallet_reference)
--     values ('00000000-0000-4000-8000-0000000000f6', guest, 10000000, 10000000, 0, 'host_cancelled', 'rm-refund-probe-1');
--     select count(*) into n from public.notifications where user_id = guest and title = 'Refund received';
--     if n <> 1 then raise exception 'FAIL 1: % refund notifications, expected exactly 1', n; end if;
--     select note.body into line from public.notifications note where note.user_id = guest and note.title = 'Refund received';
--     if line not like '%NGN 100,000.00%' then raise exception 'FAIL 1: the amount is not in the line: %', line; end if;
--     if line not like '%RF probe hotel room%' then raise exception 'FAIL 1: the place is not named: %', line; end if;
--     raise notice 'PASS 1: one wallet line carrying NGN 100,000.00 and the place it came from';
--
--     -- 2. A refund the schedule returned nothing on.
--     insert into public.booking_refunds (booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason)
--     values ('00000000-0000-4000-8000-0000000000f7', guest, 10000000, 0, 10000000, 'guest_choice');
--     select count(*) into n from public.notifications where user_id = guest and title = 'Cancellation recorded';
--     if n <> 1 then raise exception 'FAIL 2: % zero-refund notifications, expected exactly 1', n; end if;
--     select count(*) into n from public.notifications where user_id = guest and title = 'Refund received';
--     if n <> 1 then raise exception 'FAIL 2: the zero refund also wrote a Refund received line'; end if;
--     raise notice 'PASS 2: a zero refund says so and does not claim money came back';
--
--     -- 3. THE CROSS-USER READ, WHICH MUST FAIL.
--     perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
--     set local role authenticated;
--     select count(*) into n from public.booking_refunds;
--     if n <> 2 then raise exception 'FAIL 3: the guest reads % of their own refunds, expected 2', n; end if;
--     reset role;
--
--     perform set_config('request.jwt.claims', json_build_object('sub', third, 'role', 'authenticated')::text, true);
--     set local role authenticated;
--     select count(*) into n from public.booking_refunds;
--     if n <> 0 then raise exception 'FAIL 3: A STRANGER READ % REFUND ROWS', n; end if;
--     select count(*) into n from public.notifications where user_id = guest;
--     if n <> 0 then raise exception 'FAIL 3: A STRANGER READ % OF THE GUEST''S NOTIFICATIONS', n; end if;
--     reset role;
--     perform set_config('request.jwt.claims', '', true);
--     raise notice 'PASS 3: the guest reads 2 refunds; a third account reads 0 refunds and 0 notifications';
--
--     raise notice 'ALL PASS. Rolling back.';
--   end $probe$;
--
--   rollback;
-- ---------------------------------------------------------------------------

create or replace function private.notify_booking_refund()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  listing_title text;
  night_rate    public.rate_period;
  amount_txt    text;
begin
  select l.title, l.rate_period
    into listing_title, night_rate
  from public.bookings b
  join public.listings l on l.id = b.listing_id
  where b.id = new.booking_id;

  if new.refund_minor > 0 then
    -- The same expression the wallet notifiers use, so one kobo figure never
    -- prints two ways across two notifications about the same money.
    amount_txt := 'NGN ' || to_char((new.refund_minor::numeric) / 100, 'FM999,999,999,990.00');
    perform private.notify(
      new.guest_id,
      'wallet',
      'Refund received',
      amount_txt || ' is back in your Vallo wallet for ' || coalesce(listing_title, 'a cancelled stay')
        || '. It is there to spend or to withdraw.',
      '/wallet'
    );
  else
    perform private.notify(
      new.guest_id,
      'booking',
      'Cancellation recorded',
      coalesce(listing_title, 'Your stay') || ' is cancelled and the published schedule returned nothing on this one. '
        || 'If you could not get in, or the place was not what was listed, reply to support and a person will look at the booking again.',
      case when night_rate = 'night' then '/trips' else '/bookings' end
    );
  end if;

  return new;
end;
$function$;

comment on function private.notify_booking_refund() is
  'One line to the guest when a refund decision is filed, written inside the same transaction the money moved in. Money back carries the wallet kind, which no preference silences, and the exact kobo. Nothing back says so plainly and points at support without promising an outcome.';

revoke execute on function private.notify_booking_refund() from public, anon, authenticated;

drop trigger if exists booking_refunds_notify_guest on public.booking_refunds;
create trigger booking_refunds_notify_guest
  after insert on public.booking_refunds
  for each row execute function private.notify_booking_refund();
