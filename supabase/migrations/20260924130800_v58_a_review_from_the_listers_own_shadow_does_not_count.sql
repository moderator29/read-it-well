-- V-58, THE COLLUSION GRAPH: A REVIEW FROM THE LISTER'S OWN SHADOW DOES NOT COUNT.
--
-- A review, a truth answer (V-05) or a report carries NO WEIGHT when its author
-- shares an identity key with the lister of the listing it is about:
--
--   mailbox       the same canonical mailbox (`account_identities`, recorded at
--                 creation "as an investigative signal and nothing else": this
--                 is its first consumer)
--   phone         the same confirmed mobile (V-50's `confirmed_phones`)
--   card          the same card, by the processor's own card signature
--                 (`payment_methods.signature`)
--   bank_account  the same bank account (bank code and number) on either
--                 side's `bank_accounts` or `payout_accounts`
--
-- NOT A DEVICE. `known_devices.fingerprint` is `left(md5(user_agent), 16)`: a
-- browser model, shared by every person on the same phone model and browser
-- version. As a key it would have withheld the reviews of strangers who happen
-- to own the same handset, so it is not one.
--
-- NOTHING IS REFUSED. Refusing the insert would teach a colluder which key
-- tripped. The row is stored, its author still sees it on every screen that
-- shows them their own review, and it simply does not count: public lists,
-- public averages, the catalogue's rating, the agent band and every V-05 count
-- read only rows with no reason. Staff read the reasons, and staff can clear a
-- stamp (with an audit row) when two accounts turn out to be two people.
--
--   private.shares_identity_with(a, b)  the list of shared keys, or empty.
--   public.weight_withheld              one row per withheld review or report:
--                                       the kind, the id, the reasons. STAFF
--                                       ONLY: a public list of withheld review
--                                       ids would be a public accusation.
--   public.reviews_counted              a definer view: the reviews a reader
--                                       may see (the reviews select policy,
--                                       restated), less the withheld ones, but
--                                       always including the reader's own.
--                                       Every public list reads this.
--   public.weight_withheld_reasons()    staff read the register.
--   public.clear_weight_withheld(...)   staff clear one stamp, audited.
--   inspection_truth.weight_withheld_reason   stamped by a before-insert
--                                       trigger here; the column is V-05's.
--
-- THE REVIEW STAMP IS A BEFORE TRIGGER, so the register row exists before the
-- after-insert catalogue sync and badge award read the reviews, and neither
-- ever counts a self-review, even for the length of one statement.
--
-- REPORT STAMPS ARE RECORDED AND NOT YET READ. Nothing in the moderation desk
-- reads `kind = 'report'` today; the stamp is there for the desk to use.
--
-- ORDER: APPLY AFTER THE CODE, AND AFTER V-21 (20260924130300). This file
-- drops and recreates `public.agent_trust` itself, so it also stands alone.
--
-- THE PAID-BOOKING CONDITION from ONE_PERSON gate 3 is NOT in this file: the
-- reviews insert policy is the audit session's, and the condition is handed
-- to it. This file stops the self-review counting; it does not stop it being
-- written.

create or replace function private.shares_identity_with(a uuid, b uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(k order by k), '{}'::text[]) from (
    select 'mailbox'::text as k where a <> b and exists (
      select 1 from public.account_identities x join public.account_identities y
          on y.email_canonical = x.email_canonical
       where x.user_id = a and y.user_id = b)
    union all
    select 'phone' where a <> b and exists (
      select 1 from public.confirmed_phones x join public.confirmed_phones y on y.phone = x.phone
       where x.user_id = a and y.user_id = b)
    union all
    select 'card' where a <> b and exists (
      select 1 from public.payment_methods x join public.payment_methods y on y.signature = x.signature
       where x.user_id = a and y.user_id = b and x.signature is not null and x.signature <> '')
    union all
    select 'bank_account' where a <> b and exists (
      with accounts as (
        select ba.user_id as owner, ba.bank_code, ba.account_number from public.bank_accounts ba
        union all
        select ag.user_id, pa.bank_code, pa.account_number
          from public.payout_accounts pa join public.agents ag on ag.id = pa.agent_id
      )
      select 1 from accounts x join accounts y
          on y.bank_code = x.bank_code and y.account_number = x.account_number
       where x.owner = a and y.owner = b and x.account_number is not null)
  ) keys;
$$;

comment on function private.shares_identity_with(uuid, uuid) is
  'V-58. The identity keys two accounts share: mailbox, phone, card, bank_account. Empty when they share none, and always empty for a person compared with themselves.';

revoke all on function private.shares_identity_with(uuid, uuid) from public, anon, authenticated;

/* The lister behind a listing, as a user id. */
create or replace function private.listing_lister_user(p_listing uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.user_id from public.listings l join public.agents a on a.id = l.agent_id where l.id = p_listing;
$$;

revoke all on function private.listing_lister_user(uuid) from public, anon, authenticated;

/* ------------------------------------------------------------ the register */

create table if not exists public.weight_withheld (
  kind       text not null check (kind in ('review', 'report')),
  subject_id uuid not null,
  reasons    text[] not null check (cardinality(reasons) > 0),
  stamped_at timestamptz not null default now(),
  primary key (kind, subject_id)
);

comment on table public.weight_withheld is
  'V-58. Reviews and reports written by an account that shares an identity key with the lister. Kept, and not counted. Staff only: public lists read public.reviews_counted instead.';

revoke all on public.weight_withheld from public, anon, authenticated;
alter table public.weight_withheld enable row level security;

drop policy if exists weight_withheld_reviews_are_public on public.weight_withheld;
grant all on public.weight_withheld to service_role;

/* The reviews a reader may see, less the withheld ones, always with their own.
   A definer view so the register stays unreadable; the first condition
   restates `reviews_select`, because a definer view does not run it, and adds
   one arm: a server read as the service role sees every listing's reviews, as
   it does on the table, so a server-side average never loses the ratings of a
   paused or unpublished listing. The withheld filter still applies to it.
   The arm asks the role actually running the query (`current_user`), never
   a claim read from a token. */
create or replace view public.reviews_counted as
  select r.id, r.listing_id, r.booking_id, r.author_id, r.rating, r.body, r.author_label, r.created_at
    from public.reviews r
   where ((exists (select 1 from public.listings l
                    where l.id = r.listing_id and l.status = 'PUBLISHED'::public.listing_status))
          or (select auth.uid()) = r.author_id
          or private.owns_listing(r.listing_id)
          or private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
          or current_user = 'service_role')
     and ((select auth.uid()) = r.author_id
          or not exists (select 1 from public.weight_withheld w
                          where w.kind = 'review' and w.subject_id = r.id));

comment on view public.reviews_counted is
  'V-58. The reviews a reader may see (reviews_select restated) less those written from the lister''s own shadow, always including the reader''s own. A definer view granted to readers, the same recorded exception as public.listing_lister: the register it filters on is staff only.';

revoke all on public.reviews_counted from public, anon, authenticated;
grant select on public.reviews_counted to anon, authenticated;

/* A view's function calls are checked against the reader, and the service
   role has never been granted these two, so without this a server read of the
   view is refused outright. The service role bypasses row security anyway;
   this gives it nothing it could not already read. */
grant execute on function private.owns_listing(uuid) to service_role;
grant execute on function private.has_role(uuid, public.app_role) to service_role;

create or replace function public.weight_withheld_reasons()
returns table (kind text, subject_id uuid, reasons text[], stamped_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role)) then
    return;
  end if;
  return query select w.kind, w.subject_id, w.reasons, w.stamped_at
                 from public.weight_withheld w order by w.stamped_at desc limit 500;
end;
$$;

revoke all on function public.weight_withheld_reasons() from public, anon;
grant execute on function public.weight_withheld_reasons() to authenticated;

/* Staff clear one stamp when two accounts turn out to be two people. The
   review counts again at once: the catalogue row is refreshed here. */
create or replace function public.clear_weight_withheld(p_kind text, p_subject uuid, p_note text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  touched integer := 0;
  lst uuid;
begin
  if actor is null or not (private.has_role(actor, 'admin'::public.app_role)
                           or private.has_role(actor, 'super_admin'::public.app_role)) then
    return 'forbidden';
  end if;
  if p_note is null or length(btrim(p_note)) < 3 then return 'no_note'; end if;
  if p_kind in ('review', 'report') then
    delete from public.weight_withheld w where w.kind = p_kind and w.subject_id = p_subject;
    get diagnostics touched = row_count;
    if p_kind = 'review' and touched > 0 then
      select r.listing_id into lst from public.reviews r where r.id = p_subject;
      if lst is not null then perform private.catalogue_refresh_listing(lst); end if;
    end if;
  elsif p_kind = 'truth' then
    update public.inspection_truth t set weight_withheld_reason = null
     where t.inspection_id = p_subject and t.weight_withheld_reason is not null;
    get diagnostics touched = row_count;
  elsif p_kind = 'tenancy' then
    update public.tenancy_reviews t set weight_withheld_reason = null
     where t.rent_payment_id = p_subject and t.weight_withheld_reason is not null;
    get diagnostics touched = row_count;
  else
    return 'invalid';
  end if;
  if touched = 0 then return 'not_found'; end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'weight_withheld.cleared', p_kind, p_subject::text, jsonb_build_object('note', btrim(p_note)));
  return 'cleared';
end;
$$;

comment on function public.clear_weight_withheld(text, uuid, text) is
  'V-58. Staff clear one withheld-weight stamp (review, report, truth answer or tenancy review) with a note, audited. Refuses anybody else inside the function.';

revoke all on function public.clear_weight_withheld(text, uuid, text) from public, anon;
grant execute on function public.clear_weight_withheld(text, uuid, text) to authenticated;

/* --------------------------------------------------------------- stamping */

create or replace function private.weigh_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shared text[];
begin
  shared := private.shares_identity_with(new.author_id, private.listing_lister_user(new.listing_id));
  if cardinality(shared) > 0 then
    insert into public.weight_withheld (kind, subject_id, reasons) values ('review', new.id, shared)
    on conflict (kind, subject_id) do update set reasons = excluded.reasons, stamped_at = now();
  end if;
  return new;
end;
$$;

revoke all on function private.weigh_review() from public, anon, authenticated;

drop trigger if exists reviews_weigh_against_the_lister on public.reviews;
create trigger reviews_weigh_against_the_lister
  before insert on public.reviews
  for each row execute function private.weigh_review();

create or replace function private.weigh_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shared text[];
begin
  if new.target_type <> 'listing' then return new; end if;
  begin
    shared := private.shares_identity_with(new.reporter_id, private.listing_lister_user(new.target_id::uuid));
  exception when invalid_text_representation then
    return new;
  end;
  if cardinality(shared) > 0 then
    insert into public.weight_withheld (kind, subject_id, reasons) values ('report', new.id, shared)
    on conflict (kind, subject_id) do update set reasons = excluded.reasons, stamped_at = now();
  end if;
  return new;
end;
$$;

revoke all on function private.weigh_report() from public, anon, authenticated;

drop trigger if exists reports_weigh_against_the_lister on public.reports;
create trigger reports_weigh_against_the_lister
  after insert on public.reports
  for each row execute function private.weigh_report();

create or replace function private.weigh_truth_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shared text[];
begin
  shared := private.shares_identity_with(new.respondent_id, private.listing_lister_user(new.listing_id));
  new.weight_withheld_reason := case when cardinality(shared) > 0 then shared else null end;
  return new;
end;
$$;

revoke all on function private.weigh_truth_answer() from public, anon, authenticated;

/* Named to sort after `inspection_truth_fill`, which resets the column and
   fills the listing this trigger reads. */
drop trigger if exists inspection_truth_weigh on public.inspection_truth;
create trigger inspection_truth_weigh
  before insert on public.inspection_truth
  for each row execute function private.weigh_truth_answer();

/* --------------------------- the counts that read reviews leave them out */

/* Dropped first, so this file does not depend on V-21 having changed the
   return type before it. */
drop function if exists public.agent_trust(uuid);
create function public.agent_trust(p_user uuid)
returns table (completed_deals integer, response_minutes integer, review_count integer, average_rating numeric)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with me as (
    select a.id from public.agents a where a.user_id = p_user
  ),
  deals as (
    select count(*)::int as n
      from public.bookings b
      join public.listings l on l.id = b.listing_id
      join me on me.id = l.agent_id
     where b.status in ('CONFIRMED', 'COMPLETED')
       and b.check_out <= (now() at time zone 'Africa/Lagos')::date
  ),
  replies as (
    select percentile_cont(0.5) within group (
             order by extract(epoch from (m.first_reply - c.created_at)) / 60
           ) as minutes
      from public.conversations c
      join lateral (
        select min(created_at) as first_reply
          from public.messages
         where conversation_id = c.id and sender_id = p_user
      ) m on true
     where c.agent_id = p_user and m.first_reply is not null
  ),
  stars as (
    select count(*)::int as n, avg(r.rating)::numeric as avg
      from public.reviews r
      join public.listings l on l.id = r.listing_id
      join me on me.id = l.agent_id
     where not exists (select 1 from public.weight_withheld w where w.kind = 'review' and w.subject_id = r.id)
  )
  select
    (select n from deals),
    round((select minutes from replies))::integer,
    (select n from stars),
    round((select avg from stars), 2)
  where exists (select 1 from me);
$function$;

revoke all on function public.agent_trust(uuid) from public, anon;
grant execute on function public.agent_trust(uuid) to authenticated, service_role;

create or replace function private.catalogue_refresh_listing(p_listing uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l public.listings%rowtype;
begin
  select * into l from public.listings where id = p_listing;
  if not found then
    delete from public.catalogue_entries where entity_kind = 'listing' and entity_id = p_listing;
    return;
  end if;

  insert into public.catalogue_entries as ce (
    entity_kind, entity_id, title, area, city, state_code, kind, source, verified, is_demo, status,
    featured, published_at, headline_price_minor, headline_price_period, price_band, max_sleeps,
    cover_path, latitude, longitude, rating_avg, rating_count, has_breakfast, has_free_cancellation,
    room_categories, amenity_codes
  )
  select
    'listing', l.id, l.title, l.area, l.city, l.state_code, l.property_type::text, 'first_party',
    (not l.is_demo) and coalesce((select ab.verified from public.agent_badges ab where ab.agent_id = l.agent_id), false),
    l.is_demo, l.status,
    false,
    l.published_at,
    case
      when l.rate_period = 'night' and l.rate_minor > 0 then l.rate_minor
      when l.listing_intent = 'sale' then l.sale_price_minor
      else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0))
    end,
    case
      when l.rate_period = 'night' and l.rate_minor > 0 then 'night'
      when l.listing_intent = 'sale' then 'sale'
      when l.total_move_in_cost_minor is not null then 'move_in'
      when l.rent_amount_minor is not null then coalesce(l.rent_period::text, 'year')
      when l.rate_minor > 0 then coalesce(l.rate_period::text, 'night')
      else null
    end,
    null, null,
    (select lp.storage_path from public.listing_photos lp where lp.listing_id = l.id order by lp.position limit 1),
    l.latitude, l.longitude,
    /* V-58: a review that carries no weight is not in the average. */
    (select round(avg(r.rating)::numeric, 2) from public.reviews r where r.listing_id = l.id
       and not exists (select 1 from public.weight_withheld w where w.kind = 'review' and w.subject_id = r.id)),
    (select count(*) from public.reviews r where r.listing_id = l.id
       and not exists (select 1 from public.weight_withheld w where w.kind = 'review' and w.subject_id = r.id)),
    false, false, '{}'::public.room_category[],
    coalesce((select array_agg(a.code order by a.code) from public.listing_amenities la join public.amenities a on a.id = la.amenity_id where la.listing_id = l.id), '{}'::text[])
  on conflict (entity_kind, entity_id) do update set
    title = excluded.title, area = excluded.area, city = excluded.city, state_code = excluded.state_code,
    kind = excluded.kind, source = excluded.source, verified = excluded.verified, is_demo = excluded.is_demo,
    status = excluded.status, featured = excluded.featured, published_at = excluded.published_at,
    headline_price_minor = excluded.headline_price_minor, headline_price_period = excluded.headline_price_period,
    price_band = excluded.price_band, max_sleeps = excluded.max_sleeps, cover_path = excluded.cover_path,
    latitude = excluded.latitude, longitude = excluded.longitude,
    rating_avg = excluded.rating_avg, rating_count = excluded.rating_count,
    has_breakfast = excluded.has_breakfast, has_free_cancellation = excluded.has_free_cancellation,
    room_categories = excluded.room_categories, amenity_codes = excluded.amenity_codes;
end;
$function$;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('anon', 'public.weight_withheld', 'select')
     or has_table_privilege('authenticated', 'public.weight_withheld', 'select') then
    bad := bad || ' [the register is public]';
  end if;
  if has_table_privilege('authenticated', 'public.weight_withheld', 'insert') then
    bad := bad || ' [a member can withhold weight]';
  end if;
  if has_function_privilege('authenticated', 'private.shares_identity_with(uuid,uuid)', 'execute') then
    bad := bad || ' [a member can probe who shares keys]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
