-- M1 FOLLOW-UP (B13): A SAVED PLACE THAT COMES BACK SAYS SO.
-- 30 September 2026. Reviewer's non-blocking note on
-- 20260930104610_m1_b11_b13_severity_and_saved_changes.
--
-- Applied 30 September 2026 with the founder's approval.
--
-- THE GAP. private.record_listing_change() tells every saver "A place you
-- saved is no longer available" when a live listing leaves PUBLISHED. An
-- agent editing a live listing takes it back to DRAFT (unpublishListing in
-- apps/web/src/lib/agent/listings-actions.ts), fixes it and resubmits; when
-- it is PUBLISHED again the trigger records the availability row and sends
-- nothing, so the saver was told it was gone and never told it was back.
--
-- THE TWO WAYS OUT, AND WHY THIS ONE. (a) Stay quiet when a listing goes to
-- DRAFT. But the database cannot tell "back to draft to edit" from "back to
-- draft and never coming back": unpublishListing is the same call for both,
-- so suppressing it would hide a real takedown from the people who saved the
-- place, and the message ("off the market for now. It stays in Saved.") is
-- already true for an edit. (b) Keep that message and close the loop: when a
-- listing that savers were told had gone is live again, tell them it is
-- back. (b) never says anything untrue and needs no guess about intent, so
-- this does (b).
--
-- WHAT CHANGES. Only the availability branch of the function, and only in
-- one direction: when the listing becomes live again AND an earlier
-- 'availability' row for it says available = false (so the savers were told
-- it went; a listing published for the first time does not notify), each
-- saver (never the lister, never on an example listing) gets, in-app, kind
-- 'listing':
--   title  'A place you saved is available again'
--   body   '<title> is back on the market.'
--   href   '/listing/<id>?change=back'
-- Severity: kind 'listing' with this title falls to 'update' in both
-- public.notification_severity and apps/web/src/lib/notify/severity.ts; no
-- change to either table is needed. The price branch, the gone notice, the
-- 'availability' row, the trigger and the grants are exactly as they were.
--
-- Replaces one function body. Drops nothing, touches no policy, no table
-- shape, no payment path. Safe to run twice.
--
-- APP PATHS THAT GO LIVE AFTER THIS IS APPLIED: none need a change. The
-- notification lands in the bell and the inbox of notifications like any
-- other 'listing' row; the Saved card already reads the availability rows
-- (apps/web/src/lib/saved/changes.ts).

create or replace function private.record_listing_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $f$
declare
  old_price bigint;
  new_price bigint;
  was_live  boolean;
  is_live   boolean;
  lister    uuid;
  saver     uuid;
  amount    text;
  told_gone boolean;
begin
  old_price := case when old.listing_intent::text = 'sale' then old.sale_price_minor
                    else coalesce(old.rent_amount_minor, old.rate_minor) end;
  new_price := case when new.listing_intent::text = 'sale' then new.sale_price_minor
                    else coalesce(new.rent_amount_minor, new.rate_minor) end;
  was_live := old.status::text = 'PUBLISHED' and old.closed_at is null;
  is_live  := new.status::text = 'PUBLISHED' and new.closed_at is null;

  select a.user_id into lister from public.agents a where a.id = new.agent_id;

  if old_price is not null and new_price is not null and old_price <> new_price and is_live then
    insert into public.listing_changes (listing_id, change, old_minor, new_minor)
    values (new.id, 'price', old_price, new_price);

    if not coalesce(new.is_demo, false) then
      amount := '₦' || to_char(new_price / 100, 'FM999,999,999,999');
      for saver in
        select s.user_id from public.saved_items s
         where s.listing_id = new.id and s.user_id is distinct from lister
      loop
        perform private.notify(
          saver,
          'listing'::public.notification_kind,
          case when new_price < old_price then 'Price down on a place you saved'
               else 'Price changed on a place you saved' end,
          new.title || ' is now ' || amount || '.',
          '/listing/' || new.id || '?change=' || case when new_price < old_price then 'price-down' else 'price-up' end
        );
      end loop;
    end if;
  end if;

  if was_live is distinct from is_live then
    -- Read before this transition's own row is written: was a "gone" recorded earlier?
    told_gone := is_live and exists (
      select 1 from public.listing_changes c
       where c.listing_id = new.id
         and c.change = 'availability'
         and c.available = false
    );

    insert into public.listing_changes (listing_id, change, available)
    values (new.id, 'availability', is_live);

    if not is_live and not coalesce(new.is_demo, false) then
      for saver in
        select s.user_id from public.saved_items s
         where s.listing_id = new.id and s.user_id is distinct from lister
      loop
        perform private.notify(
          saver,
          'listing'::public.notification_kind,
          'A place you saved is no longer available',
          new.title || ' is off the market for now. It stays in Saved.',
          '/saved?change=gone'
        );
      end loop;
    end if;

    -- The other half of the notice above: it came back.
    if is_live and told_gone and not coalesce(new.is_demo, false) then
      for saver in
        select s.user_id from public.saved_items s
         where s.listing_id = new.id and s.user_id is distinct from lister
      loop
        perform private.notify(
          saver,
          'listing'::public.notification_kind,
          'A place you saved is available again',
          new.title || ' is back on the market.',
          '/listing/' || new.id || '?change=back'
        );
      end loop;
    end if;
  end if;

  return null;
end;
$f$;

revoke execute on function private.record_listing_change() from public, anon, authenticated;

-- ------------------------------------------------------------- read-back

do $check$
declare
  body text;
begin
  select pg_get_functiondef('private.record_listing_change()'::regprocedure) into body;
  if body not like '%A place you saved is available again%' then
    raise exception 'B13 follow-up: the back-on-market notice is not in private.record_listing_change';
  end if;
  if body not like '%A place you saved is no longer available%'
     or body not like '%Price down on a place you saved%' then
    raise exception 'B13 follow-up: the replacement lost the gone or price notice';
  end if;
  if not (select prosecdef from pg_proc where oid = 'private.record_listing_change()'::regprocedure) then
    raise exception 'B13 follow-up: record_listing_change is no longer SECURITY DEFINER';
  end if;
  if has_function_privilege('anon', 'private.record_listing_change()'::regprocedure, 'execute')
     or has_function_privilege('authenticated', 'private.record_listing_change()'::regprocedure, 'execute') then
    raise exception 'B13 follow-up: record_listing_change is executable by a client role';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'listings_record_change'
                  and tgrelid = 'public.listings'::regclass and not tgisinternal) then
    raise exception 'B13 follow-up: the listings change trigger is missing';
  end if;
  if public.notification_severity('listing'::public.notification_kind, 'A place you saved is available again', '/listing/x?change=back') <> 'update' then
    raise exception 'B13 follow-up: the back-on-market notice would not read as an update';
  end if;
end
$check$;
