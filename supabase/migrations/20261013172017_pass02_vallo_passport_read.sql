-- Applied 13 October 2026. VALLO PASSPORT 2 of 2. Apply after pass01.
--
-- The read model behind the Vallo passport: one private assembler and three
-- doors. Based on the LIVE definitions read on 13 October 2026:
-- private.passport_facts and public.my_renter_passport (V-100, unchanged and
-- left in place), private.blocked_between, private.badge_tier_for,
-- public.person_badge, public.lister_reply_band (B7) and public.agent_trust
-- (whose "stays hosted" rule the stays count follows).
--
--   private.passport_all(subject)   every fact Vallo recorded, from real rows,
--                                   with nothing hidden. Not callable by any
--                                   API role.
--   public.passport_read(subject)   ANOTHER member's passport, for a signed-in
--                                   viewer only. Returns no row when the viewer
--                                   is signed out, the passport is off, or
--                                   either has blocked the other; otherwise the
--                                   row, with every line the owner switched off
--                                   returned as NULL. A hidden line never leaves
--                                   the database.
--   public.passport_open(subject)   the same three refusals as a boolean, for
--                                   the "View passport" button.
--   public.my_passport()            the caller's own, every line, with their
--                                   switches, for the owner's page and its live
--                                   preview.
--
-- WHAT IS RECORDED, AND WHERE IT COMES FROM. Only rows Vallo itself wrote:
--   photo, name   social_profiles (projected from profiles by trigger)
--   role          agents.role of an APPROVED agents row (owner = landlord), and
--                 the kind of each PUBLISHED business; none of those = renter
--   joined        auth.users.created_at, the exact moment
--   verification  private.badge_tier_for (none, gold, platinum): gold only where
--                 a named member of staff passed the identity rung
--   rentals       rent_payments on a CONFIRMED or COMPLETED booking, as tenant
--                 or as lister
--   stays         bookings CONFIRMED or COMPLETED and checked out, as guest or
--                 as host (a listing's agent, or a hotel's business owner), and
--                 never a booking a rent payment already counts
--   reviews       reviews (on published listings and published accommodations)
--                 and reservation_reviews on what they list; hidden reviews and
--                 reviews whose weight is withheld are left out
--   response      public.lister_reply_band: only with 8 counted conversations
--                 in 90 days, and never a slow band
--   languages     social_profiles.pidgin_ok, the one language a member states
-- NEVER READ HERE: phone, email, ID document numbers, date of birth, address.
-- No column of any of those is selected, so no function below can return one.
-- Probe: supabase/tests/probes-pending/pass02-vallo-passport-read.sql
set lock_timeout = '5s';

create or replace function private.passport_all(p_subject uuid)
returns table (
  subject_id uuid,
  handle text,
  display_name text,
  photo text,
  roles text[],
  joined_at timestamptz,
  verification text,
  rentals integer,
  stays integer,
  review_count integer,
  review_average numeric,
  reply_band text,
  pidgin_ok boolean
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    u.id,
    sp.handle,
    coalesce(nullif(btrim(sp.display_label), ''), nullif(btrim(p.display_name), '')),
    coalesce(nullif(btrim(sp.avatar_path), ''), nullif(btrim(p.avatar_url), '')),
    coalesce(
      nullif(
        array(
          select r.word
            from (
              select 1 as ord, 'landlord'::text as word
                from public.agents a
               where a.user_id = u.id and a.status::text = 'APPROVED' and a.role::text = 'owner'
              union all
              select 2, 'agent'
                from public.agents a
               where a.user_id = u.id and a.status::text = 'APPROVED' and a.role::text = 'agent'
              union all
              select 2 + array_position(
                       array['hotel','serviced_apartments','guest_house','resort','shortlet_operator','restaurant','agency']::text[],
                       b.kind::text),
                     case b.kind::text
                       when 'hotel' then 'hotel'
                       when 'serviced_apartments' then 'servicedApartments'
                       when 'guest_house' then 'guestHouse'
                       when 'resort' then 'resort'
                       when 'shortlet_operator' then 'shortletHost'
                       when 'restaurant' then 'restaurant'
                       when 'agency' then 'agency'
                     end
                from public.businesses b
               where b.owner_id = u.id and b.status::text = 'PUBLISHED'
            ) r
           where r.word is not null
           group by r.word
           order by min(r.ord)
        ),
        '{}'::text[]),
      array['renter']::text[]),
    u.created_at,
    private.badge_tier_for(u.id)::text,
    (select count(*)::integer
       from public.rent_payments rp
       join public.bookings b on b.id = rp.booking_id
      where (rp.tenant_id = u.id or rp.lister_id = u.id)
        and b.status in ('CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status)),
    (select count(*)::integer
       from public.bookings b
      where b.status in ('CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status)
        and b.check_out <= (now() at time zone 'Africa/Lagos')::date
        and not exists (select 1 from public.rent_payments rp where rp.booking_id = b.id)
        and (b.guest_id = u.id
             or exists (select 1 from public.listings l
                          join public.agents a on a.id = l.agent_id
                         where l.id = b.listing_id and a.user_id = u.id)
             or exists (select 1 from public.accommodations ac
                          join public.businesses bz on bz.id = ac.business_id
                         where ac.id = b.accommodation_id and bz.owner_id = u.id))),
    rv.n,
    rv.mean,
    public.lister_reply_band(u.id),
    coalesce(sp.pidgin_ok, false)
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.social_profiles sp on sp.user_id = u.id
  cross join lateral (
    select count(*)::integer as n, round(avg(x.rating)::numeric, 1) as mean
      from (
        select rw.rating::integer as rating
          from public.reviews rw
         where rw.hidden_at is null
           and not exists (select 1 from public.weight_withheld w where w.kind = 'review' and w.subject_id = rw.id)
           and (exists (select 1 from public.listings l
                          join public.agents a on a.id = l.agent_id
                         where l.id = rw.listing_id and a.user_id = u.id and l.status = 'PUBLISHED'::public.listing_status)
                or exists (select 1 from public.accommodations ac
                             join public.businesses bz on bz.id = ac.business_id
                            where ac.id = rw.accommodation_id and bz.owner_id = u.id and ac.status = 'PUBLISHED'::public.listing_status))
        union all
        select rr.rating::integer
          from public.reservation_reviews rr
          join public.businesses bz on bz.id = rr.business_id
         where bz.owner_id = u.id and rr.hidden_at is null
      ) x
  ) rv
  where u.id = p_subject;
$fn$;

revoke all on function private.passport_all(uuid) from public, anon, authenticated;

/* Another member's passport: the lines left on, to a signed-in viewer, or nothing. */
create or replace function public.passport_read(p_subject uuid)
returns table (
  subject_id uuid,
  handle text,
  display_name text,
  photo text,
  roles text[],
  joined_at timestamptz,
  verification text,
  rentals integer,
  stays integer,
  review_count integer,
  review_average numeric,
  reply_band text,
  pidgin_ok boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  me uuid := (select auth.uid());
  st public.passport_settings%rowtype;
  hidden text[] := '{}'::text[];
begin
  /* Signed out: refused. */
  if me is null or p_subject is null then return; end if;
  /* A block in either direction: refused, and indistinguishable from "off". */
  if me <> p_subject and private.blocked_between(me, p_subject) then return; end if;

  select * into st from public.passport_settings s where s.user_id = p_subject;
  if found then
    if not st.enabled then return; end if;
    hidden := st.hidden_lines;
  end if;

  return query
  select a.subject_id,
         a.handle,
         a.display_name,
         case when 'photo' = any(hidden) then null else a.photo end,
         case when 'role' = any(hidden) then null else a.roles end,
         case when 'joined' = any(hidden) then null else a.joined_at end,
         case when 'verification' = any(hidden) then null else a.verification end,
         case when 'rentals' = any(hidden) then null else a.rentals end,
         case when 'stays' = any(hidden) then null else a.stays end,
         case when 'reviews' = any(hidden) then null else a.review_count end,
         case when 'reviews' = any(hidden) then null else a.review_average end,
         case when 'response' = any(hidden) then null else a.reply_band end,
         case when 'languages' = any(hidden) then null else a.pidgin_ok end
    from private.passport_all(p_subject) a;
end;
$fn$;

comment on function public.passport_read(uuid) is
  'Vallo passport (13 Oct 2026). Another member''s passport for a signed-in viewer: no row when signed out, when it is off, or when a block touches either; otherwise every line the owner left on, and NULL for every line switched off.';

revoke all on function public.passport_read(uuid) from public, anon;
grant execute on function public.passport_read(uuid) to authenticated;

/* The "View passport" button: the same refusals, as a yes or no. */
create or replace function public.passport_open(p_subject uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select (select auth.uid()) is not null
     and p_subject is not null
     and exists (select 1 from auth.users u where u.id = p_subject)
     and ((select auth.uid()) = p_subject or not private.blocked_between((select auth.uid()), p_subject))
     and coalesce((select s.enabled from public.passport_settings s where s.user_id = p_subject), true);
$fn$;

revoke all on function public.passport_open(uuid) from public, anon;
grant execute on function public.passport_open(uuid) to authenticated;

/* The owner's own: every line, and the switches. */
create or replace function public.my_passport()
returns table (
  subject_id uuid,
  handle text,
  display_name text,
  photo text,
  roles text[],
  joined_at timestamptz,
  verification text,
  rentals integer,
  stays integer,
  review_count integer,
  review_average numeric,
  reply_band text,
  pidgin_ok boolean,
  enabled boolean,
  hidden_lines text[]
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select a.subject_id, a.handle, a.display_name, a.photo, a.roles, a.joined_at, a.verification,
         a.rentals, a.stays, a.review_count, a.review_average, a.reply_band, a.pidgin_ok,
         coalesce(s.enabled, true),
         coalesce(s.hidden_lines, '{}'::text[])
    from private.passport_all((select auth.uid())) a
    left join public.passport_settings s on s.user_id = a.subject_id
   where (select auth.uid()) is not null;
$fn$;

revoke all on function public.my_passport() from public, anon;
grant execute on function public.my_passport() to authenticated;

do $readback$
declare bad text := '';
begin
  if has_function_privilege('authenticated', 'private.passport_all(uuid)', 'execute') then bad := bad || ' [any member can read any passport in full]'; end if;
  if has_function_privilege('anon', 'public.passport_read(uuid)', 'execute') then bad := bad || ' [anon can read a passport]'; end if;
  if has_function_privilege('anon', 'public.passport_open(uuid)', 'execute') then bad := bad || ' [anon can ask]'; end if;
  if has_function_privilege('anon', 'public.my_passport()', 'execute') then bad := bad || ' [anon can read my_passport]'; end if;
  if not has_function_privilege('authenticated', 'public.passport_read(uuid)', 'execute') then bad := bad || ' [members cannot read]'; end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
