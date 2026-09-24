-- V-58, THE COLLUSION GRAPH: A REVIEW FROM THE LISTER'S OWN SHADOW DOES NOT COUNT.
--
-- A review, a truth answer (V-05) or a report carries NO WEIGHT when its author
-- shares an identity key with the lister of the listing it is about:
--
--   mailbox       the same canonical mailbox (`account_identities`, recorded at
--                 creation "as an investigative signal and nothing else": this
--                 is its first consumer)
--   phone         the same confirmed mobile (V-50's `confirmed_phones`)
--   device        a device fingerprint both accounts have signed in from
--                 (`known_devices`)
--   card          the same card, by the processor's own card signature
--                 (`payment_methods.signature`)
--   bank_account  the same bank account (bank code and number) on either
--                 side's `bank_accounts` or `payout_accounts`
--
-- NOTHING IS REFUSED. Refusing the insert would teach a colluder which key
-- tripped. The row is stored, its author sees it written, and it simply does
-- not count: public averages, the catalogue's rating, the agent band and every
-- V-05 count read only rows with no reason. Staff read the reasons.
--
--   private.shares_identity_with(a, b)  the list of shared keys, or empty.
--   public.weight_withheld              one row per withheld review or report:
--                                       the kind, the id, and the reasons. The
--                                       review ids are readable by anybody
--                                       (a public list must be able to leave
--                                       them out); the REASONS are staff only,
--                                       through `public.weight_withheld_reasons`.
--   inspection_truth.weight_withheld_reason   stamped by a before-insert
--                                       trigger here; the column is V-05's.
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
    select 'device' where a <> b and exists (
      select 1 from public.known_devices x join public.known_devices y on y.fingerprint = x.fingerprint
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
  'V-58. The identity keys two accounts share: mailbox, phone, device, card, bank_account. Empty when they share none, and always empty for a person compared with themselves.';

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
  'V-58. Reviews and reports written by an account that shares an identity key with the lister. Kept, and not counted. Review ids are public so a public list can leave them out; the reasons are staff only.';

revoke all on public.weight_withheld from public, anon, authenticated;
alter table public.weight_withheld enable row level security;

drop policy if exists weight_withheld_reviews_are_public on public.weight_withheld;
create policy weight_withheld_reviews_are_public on public.weight_withheld
  for select to anon, authenticated
  using (kind = 'review');

grant select (kind, subject_id) on public.weight_withheld to anon, authenticated;
grant all on public.weight_withheld to service_role;

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
  after insert on public.reviews
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

create or replace function public.agent_trust(p_user uuid)
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
     where b.status = 'CONFIRMED'
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
  if has_column_privilege('anon', 'public.weight_withheld', 'reasons', 'select')
     or has_column_privilege('authenticated', 'public.weight_withheld', 'reasons', 'select') then
    bad := bad || ' [the reasons are public]';
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
