/*
 * V-48, WITH THE FACTS V-31 AND V-37 HANG ON THE LISTING.
 * "LET" IS AN EVENT, AND A LISTING CARRIES FACTS ONLY THE PLATFORM WRITES.
 *
 * TODAY A FLAT THAT IS LET SIMPLY STOPS BEING TALKED ABOUT. `listing_status`
 * runs DRAFT to SUSPENDED and has no way to say "let", so the platform learns
 * nothing when a flat is let, and nothing forces the question. That silence is
 * exactly how the flat let three months ago survives on every portal in Lagos.
 *
 * So a rental is now CLOSED WITH A REASON:
 *
 *   let_through_vallo     linked to the paid `rent_payments` row that proves it
 *   let_elsewhere
 *   owner_withdrew
 *   mandate_ended
 *   let_owner_confirmed   the principal answered "2" to the vacancy question (V-31)
 *   owner_denied_mandate  the principal answered "3": "I never instructed this agent"
 *   let_same_property     another listing of the SAME PROPERTY (V-37) was let
 *
 * A LET ON ANY LISTING OF A PROPERTY TAKES EVERY COPY DOWN IN THE SAME
 * TRANSACTION. Four agents on one flat is four listings on one property; the
 * flat is let once. Everybody following any of the copies (a pending
 * inspection, or the listing saved to their shortlist) is told in that same
 * transaction, through `private.notify`, so a renter does not find out on the
 * Saturday.
 *
 * ---------------------------------------------------------------------------
 * WHY SUSPENDED AND NOT A NEW `CLOSED` VALUE. The file allows either. A new
 * enum value cannot be USED in the transaction that adds it, so the cascade
 * could not be proven by the rolled-back probe this build is required to run,
 * and every exhaustive switch over `listing_status` in the app would need a
 * branch in the same change. `status = 'SUSPENDED'` with `closed_at` and
 * `close_reason` set is a closed listing; `SUSPENDED` with `closed_at` null is
 * still what it always was, a staff suspension. The two can never be confused
 * because the reason is a column, not an inference.
 *
 * ---------------------------------------------------------------------------
 * FACTS ONLY THE PLATFORM WRITES, AND THE HOLE THEY WOULD OTHERWISE HAVE.
 *
 * `listings_owner_all` is a FOR ALL policy: the lister may update any column of
 * their own row. That is fine for a title and fatal for a column whose whole
 * meaning is "somebody other than the lister said this". An agent who could
 * write `availability_confirmed_at` could print "Owner confirmed available
 * today" on their own listing, which is the exact lie V-31 exists to end.
 *
 * So `listing_platform_facts_guard` refuses a change to any of these six
 * columns from `authenticated` or `anon`, including staff through the console:
 *
 *   property_id, availability_confirmed_at, not_reconfirmed_since,
 *   closed_at, close_reason, closed_rent_payment_id
 *
 * They are written only inside the definer functions below and in the next
 * migration, where `current_user` is the function owner. The guard is
 * deliberately SECURITY INVOKER: a definer guard would see its own owner as
 * `current_user` and wave everything through.
 *
 * AND A CLOSED LISTING STAYS CLOSED. The same guard refuses a status change on
 * a row with `closed_at` set, from anybody outside a definer function. "Mark
 * as unavailable" toggles are the reversible bait the file warns about: off
 * during a complaint, on after. A relisting is a new listing.
 */

/* ------------------------------------------------------------- the columns */

alter table public.listings
  add column if not exists availability_confirmed_at timestamptz,
  add column if not exists not_reconfirmed_since     timestamptz,
  add column if not exists closed_at                 timestamptz,
  add column if not exists close_reason              text,
  add column if not exists closed_rent_payment_id    uuid references public.rent_payments(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.listings'::regclass
                  and conname = 'listings_close_reason_known') then
    alter table public.listings
      add constraint listings_close_reason_known
        check (close_reason is null or close_reason in (
          'let_through_vallo', 'let_elsewhere', 'owner_withdrew', 'mandate_ended',
          'let_owner_confirmed', 'owner_denied_mandate', 'let_same_property'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.listings'::regclass
                  and conname = 'listings_closed_has_a_reason') then
    alter table public.listings
      add constraint listings_closed_has_a_reason
        check ((closed_at is null) = (close_reason is null));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.listings'::regclass
                  and conname = 'listings_let_through_vallo_names_the_rent') then
    alter table public.listings
      add constraint listings_let_through_vallo_names_the_rent
        check (close_reason is distinct from 'let_through_vallo' or closed_rent_payment_id is not null);
  end if;
end $$;

comment on column public.listings.availability_confirmed_at is
  'V-31. When the PRINCIPAL named on this listing''s mandate last said the flat is still available, by answering the vacancy question from their own number or their own single-use link. Never written by the lister. A null renders nothing.';
comment on column public.listings.not_reconfirmed_since is
  'V-31. Set by private.sweep_not_reconfirmed when a vacancy question to the principal has gone 21 days unanswered. Silence is not a negative before that. The listing sorts last and takes no new inspection requests while set.';
comment on column public.listings.closed_at is
  'V-48. When the listing was closed with a reason. Closed listings have status SUSPENDED and stay closed.';
comment on column public.listings.close_reason is
  'V-48. How it was closed. let_same_property means another listing of the same property (V-37) was let.';
comment on column public.listings.closed_rent_payment_id is
  'V-48. The paid rent_payments row behind a let_through_vallo close. Required for that reason, so "let through Vallo" is never a claim without the payment.';

create index if not exists listings_closed_idx on public.listings (closed_at) where closed_at is not null;

/* --------------------------------------------------------------- the guard */

create or replace function private.listing_platform_facts_guard()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.property_id := null;
    new.availability_confirmed_at := null;
    new.not_reconfirmed_since := null;
    new.closed_at := null;
    new.close_reason := null;
    new.closed_rent_payment_id := null;
    return new;
  end if;

  if new.property_id is distinct from old.property_id
     or new.availability_confirmed_at is distinct from old.availability_confirmed_at
     or new.not_reconfirmed_since is distinct from old.not_reconfirmed_since
     or new.closed_at is distinct from old.closed_at
     or new.close_reason is distinct from old.close_reason
     or new.closed_rent_payment_id is distinct from old.closed_rent_payment_id then
    raise exception 'these facts are written by the platform, never by editing a listing'
      using errcode = 'insufficient_privilege';
  end if;

  if old.closed_at is not null and new.status is distinct from old.status then
    raise exception 'a closed listing stays closed; list the property again as a new listing'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$;

revoke all on function private.listing_platform_facts_guard() from public, anon, authenticated;

drop trigger if exists listings_platform_facts_guard on public.listings;
create trigger listings_platform_facts_guard
  before insert or update on public.listings
  for each row execute function private.listing_platform_facts_guard();

/* ------------------------------------ no new inspection on a closed listing */

create or replace function private.inspection_needs_an_open_listing()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l record;
begin
  select closed_at, not_reconfirmed_since into l from public.listings where id = new.listing_id;
  if l.closed_at is not null then
    raise exception 'This listing has been closed, so it is not taking inspections.'
      using errcode = 'check_violation';
  end if;
  if l.not_reconfirmed_since is not null then
    raise exception 'The owner has not reconfirmed this listing is available, so it is not taking new inspections.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

revoke all on function private.inspection_needs_an_open_listing() from public, anon, authenticated;

drop trigger if exists inspection_requests_need_an_open_listing on public.inspection_requests;
create trigger inspection_requests_need_an_open_listing
  before insert on public.inspection_requests
  for each row execute function private.inspection_needs_an_open_listing();

/* ------------------------------------------------------------ the closing */

/* "2 bedroom flat in Ikeja GRA": the words a notification may use. Area and
   city only, never the address, the landmark or the estate. */
create or replace function private.listing_place_words(p_listing uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select concat_ws(' ',
           case when l.bedrooms > 0 then l.bedrooms::text || ' bedroom' end,
           replace(l.property_type::text, '_', ' '),
           'in',
           coalesce(nullif(btrim(l.area), ''), nullif(btrim(l.city), ''), 'your area'))
    from public.listings l
   where l.id = p_listing;
$function$;

revoke all on function private.listing_place_words(uuid) from public, anon, authenticated;

/*
 * THE ONE CLOSING PATH, used by the lister's door below and by the principal's
 * answers in the next migration. Returns how many listings it closed.
 */
create or replace function private.close_listings(
  p_listing uuid,
  p_reason text,
  p_rent_payment uuid,
  p_actor uuid
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me public.listings%rowtype;
  t record;
  follower uuid;
  lister uuid;
  words text;
  n integer := 0;
  is_let boolean := p_reason in ('let_through_vallo', 'let_elsewhere', 'let_owner_confirmed');
  let_words boolean;
begin
  select * into me from public.listings where id = p_listing for update;
  if not found then
    raise exception 'no such listing' using errcode = 'no_data_found';
  end if;
  if me.closed_at is not null then
    return 0;
  end if;

  for t in
    select l.id, l.agent_id
      from public.listings l
     where l.closed_at is null
       and (l.id = p_listing
            or (is_let and me.property_id is not null and l.property_id = me.property_id
                and l.status in ('PUBLISHED', 'APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED')))
     order by (l.id = p_listing) desc
     for update
  loop
    update public.listings
       set status = 'SUSPENDED'::public.listing_status,
           closed_at = now(),
           close_reason = case when t.id = p_listing then p_reason else 'let_same_property' end,
           closed_rent_payment_id = case when t.id = p_listing then p_rent_payment end
     where id = t.id;
    n := n + 1;

    words := private.listing_place_words(t.id);
    let_words := is_let or t.id <> p_listing;
    select a.user_id into lister from public.agents a where a.id = t.agent_id;

    /* Everybody following this copy: a pending inspection, or the shortlist. */
    for follower in
      select distinct x.uid
        from (
          select r.requester_id as uid
            from public.inspection_requests r
           where r.listing_id = t.id
             and r.state in ('REQUESTED', 'CONFIRMED', 'PROPOSED')
          union
          select s.user_id
            from public.saved_items s
           where s.listing_id = t.id
        ) x
       where x.uid is distinct from lister
    loop
      perform private.notify(
        follower, 'listing'::public.notification_kind,
        case when let_words then 'A flat you were following has been let'
             else 'A listing you were following has closed' end,
        'The ' || words || ' is no longer available. Here are others nearby.',
        '/search?q=' || replace(coalesce(nullif(btrim((select area from public.listings where id = t.id)), ''), ''), ' ', '+')
      );
    end loop;

    /* The lister of a copy that came down because another copy was let. */
    if t.id <> p_listing then
      perform private.notify(
        lister, 'listing'::public.notification_kind,
        'Your listing was closed because the flat has been let',
        'Another listing of the same ' || words || ' was marked let, so every listing of it came down together.',
        '/agent/listings'
      );
    end if;

    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (p_actor, 'listing.close', 'listing', t.id::text,
            jsonb_build_object('reason', case when t.id = p_listing then p_reason else 'let_same_property' end,
                               'closed_with', p_listing, 'property_id', me.property_id));
  end loop;

  return n;
end;
$function$;

revoke all on function private.close_listings(uuid, text, uuid, uuid) from public, anon, authenticated;

/*
 * THE LISTER'S DOOR. A rental that is live or approved is closed with one of
 * the four reasons a lister can give. "Let through Vallo" must name, or find,
 * a PAID rent charge on this listing: the reason is a claim about a payment and
 * the payment is the proof. With none, the close is refused and says so.
 */
create or replace function public.close_listing(
  p_listing uuid,
  p_reason text,
  p_rent_payment uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  me public.listings%rowtype;
  paid uuid;
  n integer;
begin
  if (select auth.uid()) is null then
    raise exception 'sign in to close a listing' using errcode = 'insufficient_privilege';
  end if;
  if not (private.owns_listing(p_listing) or private.is_staff()) then
    raise exception 'only the lister may close this listing' using errcode = 'insufficient_privilege';
  end if;
  if p_reason not in ('let_through_vallo', 'let_elsewhere', 'owner_withdrew', 'mandate_ended') then
    raise exception 'choose how the listing ended' using errcode = 'check_violation';
  end if;

  select * into me from public.listings where id = p_listing;
  if me.listing_intent <> 'rent'::public.listing_intent then
    raise exception 'only a rental is closed with a reason' using errcode = 'check_violation';
  end if;
  if me.closed_at is not null then
    return jsonb_build_object('closed', 0, 'already', true);
  end if;
  if me.status not in ('PUBLISHED', 'APPROVED') then
    raise exception 'only a live or approved listing can be closed' using errcode = 'check_violation';
  end if;

  if p_reason = 'let_through_vallo' then
    select rp.id into paid
      from public.rent_payments rp
     where rp.listing_id = p_listing
       and (p_rent_payment is null or rp.id = p_rent_payment)
       and exists (select 1 from public.transactions tx
                    where tx.booking_id = rp.booking_id
                      and tx.status = 'SUCCESSFUL'::public.transaction_status)
     order by rp.created_at desc
     limit 1;
    if paid is null then
      raise exception 'no rent has been paid through Vallo for this listing, so it cannot be closed as let through Vallo'
        using errcode = 'check_violation';
    end if;
  end if;

  n := private.close_listings(p_listing, p_reason, paid, (select auth.uid()));
  return jsonb_build_object('closed', n, 'already', false);
end;
$function$;

revoke all on function public.close_listing(uuid, text, uuid) from public, anon;
grant execute on function public.close_listing(uuid, text, uuid) to authenticated;

/* ---------------------------------------- the renter's reads, fail soft */

/*
 * THE RENTER'S HALF OF V-37: every published offer on this listing's property.
 *
 * Signed in only (the sign-in wall of 23 September), published and real only,
 * and nothing about the principal. Returns nothing when the listing is on no
 * property, which the page renders as nothing.
 */
create or replace function public.property_offers(p_listing uuid)
returns table (
  listing_id uuid,
  is_this_listing boolean,
  title text,
  listing_role public.listing_role,
  lister_name text,
  rent_amount_minor bigint,
  rent_period public.rent_period,
  move_in_total_minor bigint,
  availability_confirmed_at timestamptz
)
language sql
stable
security definer
set search_path to ''
as $function$
  select o.id, o.id = p_listing, o.title, o.listing_role, ll.lister_name,
         o.rent_amount_minor, o.rent_period, o.total_move_in_cost_minor,
         o.availability_confirmed_at
    from public.listings me
    join public.listings o on o.property_id = me.property_id
    left join public.listing_lister ll on ll.listing_id = o.id
   where me.id = p_listing
     and me.property_id is not null
     and me.status = 'PUBLISHED'::public.listing_status
     and me.is_demo = false
     and o.status = 'PUBLISHED'::public.listing_status
     and o.is_demo = false
     and (select auth.uid()) is not null
   order by o.total_move_in_cost_minor nulls last, o.published_at;
$function$;

revoke all on function public.property_offers(uuid) from public, anon;
grant execute on function public.property_offers(uuid) to authenticated;

/*
 * THE LANDLORD FACTS FOR A PAGE OF CARDS, in one call.
 *
 * Kept OUT of the catalogue select on purpose. The catalogue read is the one
 * query whose failure empties the whole product (ledger section 67), and a
 * select naming a column the live database does not have yet fails exactly
 * that way. This read is separate: if it errors, the cards show no landlord
 * line and keep their order, and nothing else changes.
 *
 * Published, real listings only; examples never carry a trust signal.
 */
create or replace function public.listing_landlord_facts(p_listings uuid[])
returns table (
  listing_id uuid,
  owner_confirmed_at timestamptz,
  not_reconfirmed boolean,
  offer_count integer
)
language sql
stable
security definer
set search_path to ''
as $function$
  select l.id,
         l.availability_confirmed_at,
         l.not_reconfirmed_since is not null,
         case when l.property_id is null then 1
              else (select count(*)::integer from public.listings o
                     where o.property_id = l.property_id
                       and o.status = 'PUBLISHED'::public.listing_status
                       and o.is_demo = false) end
    from public.listings l
   where l.id = any(p_listings[1:200])
     and l.status = 'PUBLISHED'::public.listing_status
     and l.is_demo = false
     and (select auth.uid()) is not null;
$function$;

revoke all on function public.listing_landlord_facts(uuid[]) from public, anon;
grant execute on function public.listing_landlord_facts(uuid[]) to authenticated;
