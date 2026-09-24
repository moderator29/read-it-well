-- V-59, THE RENTAL REVIEW ASKS THE QUESTION THAT MATTERS: WERE YOU ASKED FOR
-- ANYTHING MORE AT THE DOOR?
--
-- The racket in this market is not the declared agency fee, which the move-in
-- breakdown already exposes; it is the UNDECLARED extra at the door: an
-- "agreement fee", "caretaker's money", "key money". Only a tenant who paid the
-- declared total through Vallo can say whether they were asked for more, and
-- `rent_payments` freezes exactly what was declared.
--
-- A month after moving in, the tenant answers, before any stars:
--
--   paid_extra     did you pay anything to anybody for this flat beyond what
--                  you paid on Vallo? 'no' or 'yes', and if yes how much and
--                  to whom (agent, caretaker, landlord, other)
--   as_listed      was the flat as listed (light, water, gate)?
--   agent_on_time  did the agent show up when agreed?
--   again          would you rent through this agent again?
--   rating, body   then the stars and an optional sentence
--
-- WHY A TABLE OF ITS OWN AND NOT A SECOND ARM ON `reviews_insert_own`. That
-- policy and the `reviews` table are the audit session's, and a stay review
-- and a tenancy review ask different questions. This table has its own
-- insert policy: the tenant on the rent charge, the booking that carries it
-- CONFIRMED (paid), and thirty days since the move-in date.
--
-- WHAT IS PUBLIC. One number per listing, once five tenants have said it:
-- how many said NOTHING more was asked at the door ("Moved in for the Vallo
-- price: 9 tenants"). How many answered in all is never published. The "yes" answers are private: two different tenants of one
-- lister saying yes open a HIGH risk alert for staff, naming no tenant. A
-- tenancy review from the lister's own shadow (V-58) is stamped and counted
-- nowhere.

create table if not exists public.tenancy_reviews (
  rent_payment_id uuid primary key references public.rent_payments(id) on delete cascade,
  tenant_id       uuid not null references auth.users(id) on delete cascade,
  listing_id      uuid not null references public.listings(id) on delete cascade,
  lister_id       uuid not null references auth.users(id) on delete cascade,
  paid_extra      text not null check (paid_extra in ('no', 'yes')),
  extra_minor     bigint check (extra_minor is null or extra_minor > 0),
  extra_to        text check (extra_to is null or extra_to in ('agent', 'caretaker', 'landlord', 'other')),
  as_listed       text not null check (as_listed in ('yes', 'no', 'not_sure')),
  agent_on_time   text not null check (agent_on_time in ('yes', 'no', 'not_sure')),
  again           text not null check (again in ('yes', 'no', 'not_sure')),
  rating          smallint not null check (rating between 1 and 5),
  body            text check (body is null or char_length(body) <= 2000),
  answered_at     timestamptz not null default now(),
  weight_withheld_reason text[],
  /* How much and to whom belong to a yes, and only to a yes. */
  constraint tenancy_reviews_extra_only_on_yes check (
    (paid_extra = 'yes') or (extra_minor is null and extra_to is null)
  )
);

comment on table public.tenancy_reviews is
  'V-59. A tenant''s review a month after moving in, led by whether anything more was paid at the door than was paid on Vallo. Written once by the tenant. Public: only the count of tenants who paid nothing more.';

create index if not exists tenancy_reviews_listing_idx on public.tenancy_reviews (listing_id);
create index if not exists tenancy_reviews_lister_idx on public.tenancy_reviews (lister_id);

revoke all on public.tenancy_reviews from public, anon, authenticated;
alter table public.tenancy_reviews enable row level security;

create or replace function private.tenancy_review_open(p_payment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.rent_payments rp
      join public.bookings b on b.id = rp.booking_id
     where rp.id = p_payment
       and rp.tenant_id = (select auth.uid())
       and b.status in ('CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status)
       and rp.move_in <= ((now() at time zone 'Africa/Lagos')::date - 30)
  );
$$;

revoke all on function private.tenancy_review_open(uuid) from public, anon;
grant execute on function private.tenancy_review_open(uuid) to authenticated;

drop policy if exists tenancy_reviews_select_own on public.tenancy_reviews;
create policy tenancy_reviews_select_own on public.tenancy_reviews
  for select to authenticated using (tenant_id = (select auth.uid()));

drop policy if exists tenancy_reviews_select_staff on public.tenancy_reviews;
create policy tenancy_reviews_select_staff on public.tenancy_reviews
  for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

drop policy if exists tenancy_reviews_insert_tenant on public.tenancy_reviews;
create policy tenancy_reviews_insert_tenant on public.tenancy_reviews
  for insert to authenticated
  with check (tenant_id = (select auth.uid()) and private.tenancy_review_open(rent_payment_id));

grant select, insert on public.tenancy_reviews to authenticated;
grant all on public.tenancy_reviews to service_role;

/* The row fills its own facts from the charge, and V-58 weighs it. */
create or replace function private.tenancy_review_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shared text[];
begin
  select rp.listing_id, rp.lister_id into new.listing_id, new.lister_id
    from public.rent_payments rp where rp.id = new.rent_payment_id;
  if new.listing_id is null then
    raise exception 'no such rent charge' using errcode = 'foreign_key_violation';
  end if;
  new.answered_at := now();
  shared := private.shares_identity_with(new.tenant_id, new.lister_id);
  new.weight_withheld_reason := case when cardinality(shared) > 0 then shared else null end;
  return new;
end;
$$;

revoke all on function private.tenancy_review_fill() from public, anon, authenticated;

drop trigger if exists tenancy_reviews_fill on public.tenancy_reviews;
create trigger tenancy_reviews_fill
  before insert on public.tenancy_reviews
  for each row execute function private.tenancy_review_fill();

/* Two different tenants of one lister said yes: staff are told. */
create or replace function private.tenancy_review_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenants integer;
begin
  if new.paid_extra <> 'yes' or new.weight_withheld_reason is not null then return new; end if;
  select count(distinct t.tenant_id) into tenants
    from public.tenancy_reviews t
   where t.lister_id = new.lister_id and t.paid_extra = 'yes' and t.weight_withheld_reason is null;
  if tenants >= 2 and not exists (
       select 1 from public.risk_alerts a
        where a.entity_type = 'user' and a.entity_id = new.lister_id::text
          and a.status = 'open'::public.alert_status and a.title = 'Tenants report paying more at the door')
  then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high'::public.alert_severity, 'open'::public.alert_status,
            'Tenants report paying more at the door',
            tenants::text || ' different tenants of this lister said they paid something beyond what they paid on Vallo. Their answers are in tenancy_reviews; no tenant is named here.',
            'user', new.lister_id::text);
  end if;
  return new;
end;
$$;

revoke all on function private.tenancy_review_alert() from public, anon, authenticated;

drop trigger if exists tenancy_reviews_alert on public.tenancy_reviews;
create trigger tenancy_reviews_alert
  after insert on public.tenancy_reviews
  for each row execute function private.tenancy_review_alert();

/* ------------------------------------------------------ the public count */

/* Per listing, N only, and only once N is five or more. The spec's
   rule: the count of tenants who paid nothing more is the public number, and
   how many answered in all is never published, so the yes answers stay
   private even as a difference. No lister id: r_sh4 stopped publishing raw
   user ids, and this view must not start again. */
create or replace view public.door_honesty as
  select t.listing_id,
         (count(*) filter (where t.paid_extra = 'no'))::integer as nothing_more
    from public.tenancy_reviews t
    join public.listings l on l.id = t.listing_id
   where t.weight_withheld_reason is null and not l.is_demo
   group by t.listing_id
  /* FIVE WHO SAID "NOTHING MORE", not five answers. With five answers and
     a published N of three, anyone can subtract: two tenants said they paid
     extra. Only once N is itself five or more does the number stop pointing
     at the few who said yes. */
  having count(*) filter (where t.paid_extra = 'no') >= 5;

comment on view public.door_honesty is
  'V-59. Per listing, how many tenants said they paid nothing beyond what they paid on Vallo, published only once at least five of them said so. The total is never published. No user id. A definer view granted to readers, recorded as the same deliberate exception as public.listing_lister: aggregate columns only, and an invoker view would need a policy letting strangers read the rows.';

revoke all on public.door_honesty from public, anon, authenticated;
grant select on public.door_honesty to anon, authenticated;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('anon', 'public.tenancy_reviews', 'select') then bad := bad || ' [anon reads tenancy reviews]'; end if;
  if has_table_privilege('authenticated', 'public.tenancy_reviews', 'update')
     or has_table_privilege('authenticated', 'public.tenancy_reviews', 'delete') then
    bad := bad || ' [a tenancy review can be edited]';
  end if;
  if has_table_privilege('anon', 'public.door_honesty', 'insert') then bad := bad || ' [the count can be written]'; end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'door_honesty' and column_name = 'lister_id') then
    bad := bad || ' [the view publishes a user id]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
