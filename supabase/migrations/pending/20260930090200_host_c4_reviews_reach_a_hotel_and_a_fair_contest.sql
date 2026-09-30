-- HOST C4: REVIEWS THAT CAN REACH A HOTEL, AND A FAIR WAY TO CONTEST ONE
-- (30 September 2026). PENDING: written by the host build team, applied by
-- the lead. Idempotent and additive: no row is rewritten or deleted, no
-- column dropped. Must land before `room_bookings` is switched on, or no
-- hotel stay can ever be reviewed.
--
-- WHY, IN THREE GAPS (docs/recs/RECS_C_2026-09-30.md, C4)
--   1. `reviews.listing_id` is NOT NULL and a hotel room booking has
--      `listing_id` null (`bookings_one_spine_chk`), so a hotel stay could
--      never be reviewed.
--   2. `review_responses.agent_id` is NOT NULL and its stamp trigger refuses
--      anybody without an agents row, so a hotel owner could never answer.
--   3. A review had no hidden state, so staff could only leave it or delete
--      it, and the lister had no fair way to ask.
--
-- WHAT THIS DOES
--   reviews            + accommodation_id (the bookings table's second spine),
--                      listing_id nullable, exactly one of the two
--                      (`reviews_one_subject_chk`); + hidden_at, hidden_note
--                      (the public words, e.g. "Removed by Vallo: personal
--                      information"). Who decided is kept on the contest,
--                      which only staff and the lister read, never on the
--                      review, which the public reads.
--                      A member can never write either column: the insert
--                      policy requires both to be null.
--                      Insert: the eligibility rule is unchanged, one review
--                      per completed stay, by its guest, after check-out, not a
--                      tenancy; now for either spine, and the subject must be
--                      the booking's own.
--                      Select: a HIDDEN review leaves the public read. Its
--                      author, its lister and staff still see it.
--   review_responses   + responder_id; agent_id nullable; a hotel's owner may
--                      answer a review of their own hotel. Policies unchanged:
--                      they read `private.owns_review_listing`, which now also
--                      answers for an accommodation the caller owns.
--   review_contests    the lister's "Ask Vallo to look at this review": one
--                      open contest per review, a published criterion and a
--                      note, linked to a `reports` row so it lands in the
--                      existing Reports lane. The review stays up while it is
--                      looked at: a contest is a request, not a takedown.
--   contest_review()           the lister's door (authenticated).
--   decide_review_contest()    staff with the moderation scope: KEEP (the
--                      review stays, or comes back if it was hidden) or HIDE
--                      with a public note. Never delete. Both sides are told.
--   Ratings: a hidden review stops counting (the founder's recommended
--   default): `listing_review_stats` and the catalogue's listing rating skip
--   it, and an accommodation's catalogue rating is now computed from its
--   visible reviews instead of being left empty.
--
-- THE APP SIDE: the guest's review form (`lib/reviews/actions.ts`) writes
-- `accommodation_id` for a hotel stay; `/host/reviews` lists, answers and
-- contests. Until this file is applied a hotel review is refused in words and
-- `/host/reviews` says reviews of hotel stays open soon.

-- ------------------------------------------------------------- reviews

alter table public.reviews add column if not exists accommodation_id uuid references public.accommodations (id) on delete cascade;
alter table public.reviews add column if not exists hidden_at timestamptz;
alter table public.reviews add column if not exists hidden_note text;
alter table public.reviews alter column listing_id drop not null;

alter table public.reviews drop constraint if exists reviews_one_subject_chk;
alter table public.reviews add constraint reviews_one_subject_chk
  check ((listing_id is null) <> (accommodation_id is null)) not valid;
alter table public.reviews validate constraint reviews_one_subject_chk;
alter table public.reviews drop constraint if exists reviews_hidden_note_chk;
alter table public.reviews add constraint reviews_hidden_note_chk
  check (hidden_note is null or char_length(hidden_note) between 1 and 200);

create index if not exists reviews_accommodation_idx on public.reviews (accommodation_id) where accommodation_id is not null;

grant insert (accommodation_id) on public.reviews to authenticated;
grant select (accommodation_id, hidden_at, hidden_note) on public.reviews to anon, authenticated;

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and hidden_at is null
    and hidden_note is null
    and exists (
      select 1 from public.bookings b
       where b.id = reviews.booking_id
         and b.guest_id = (select auth.uid())
         and b.status = any (array['CONFIRMED'::public.booking_status, 'COMPLETED'::public.booking_status])
         and b.check_out <= ((now() at time zone 'Africa/Lagos'))::date
         and not private.booking_is_tenancy(b.id)
         and ((reviews.listing_id is not null and reviews.accommodation_id is null and b.listing_id = reviews.listing_id)
           or (reviews.accommodation_id is not null and reviews.listing_id is null and b.accommodation_id = reviews.accommodation_id))));

drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select
  using (
    (hidden_at is null and (
       exists (select 1 from public.listings l where l.id = reviews.listing_id and l.status = 'PUBLISHED'::public.listing_status)
       or exists (select 1 from public.accommodations ac where ac.id = reviews.accommodation_id and ac.status = 'PUBLISHED'::public.listing_status)))
    or (select auth.uid()) = author_id
    or (listing_id is not null and listing_id in (select private.my_listing_ids()))
    or (accommodation_id is not null and private.owns_accommodation(accommodation_id))
    or (select private.has_role((select auth.uid()), 'admin'::public.app_role))
    or (select private.has_role((select auth.uid()), 'super_admin'::public.app_role)));

-- The lister of a review, whichever spine it hangs on.
create or replace function private.review_lister_user(p_review uuid)
returns uuid
language sql
stable security definer
set search_path = ''
as $function$
  select coalesce(
    (select a.user_id from public.reviews r join public.listings l on l.id = r.listing_id
       join public.agents a on a.id = l.agent_id where r.id = p_review),
    (select bu.owner_id from public.reviews r join public.accommodations ac on ac.id = r.accommodation_id
       join public.businesses bu on bu.id = ac.business_id where r.id = p_review));
$function$;
revoke all on function private.review_lister_user(uuid) from public, anon, authenticated;

-- Used by the review_responses policies: now true for a hotel's owner too.
create or replace function private.owns_review_listing(p_review uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null and private.review_lister_user(p_review) = (select auth.uid());
$function$;

create or replace function private.review_response_visible(p_review uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.reviews r
      left join public.listings l on l.id = r.listing_id
      left join public.accommodations ac on ac.id = r.accommodation_id
     where r.id = p_review
       and (
         (r.hidden_at is null and (l.status = 'PUBLISHED' or ac.status = 'PUBLISHED'))
         or r.author_id = (select auth.uid())
         or private.owns_review_listing(p_review)
         or private.has_role((select auth.uid()), 'admin')
         or private.has_role((select auth.uid()), 'super_admin')));
$function$;

-- Identity overlap is weighed against whoever is being reviewed.
create or replace function private.weigh_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  shared text[];
begin
  shared := private.shares_identity_with(new.author_id,
    coalesce(private.listing_lister_user(new.listing_id), private.booking_host(new.booking_id)));
  if cardinality(shared) > 0 then
    insert into public.weight_withheld (kind, subject_id, reasons) values ('review', new.id, shared)
    on conflict (kind, subject_id) do update set reasons = excluded.reasons, stamped_at = now();
  end if;
  return new;
end;
$function$;

create or replace function private.notify_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  host_user uuid;
  title     text;
  href      text;
begin
  if new.listing_id is not null then
    select a.user_id, l.title into host_user, title
      from public.listings l join public.agents a on a.id = l.agent_id where l.id = new.listing_id;
    href := '/agent/reviews';
  else
    select bu.owner_id, ac.name into host_user, title
      from public.accommodations ac join public.businesses bu on bu.id = ac.business_id where ac.id = new.accommodation_id;
    href := '/host/reviews';
  end if;
  perform private.notify(host_user, 'listing'::public.notification_kind, 'New review',
    'A guest rated ' || coalesce(title, 'your listing') || ' ' || new.rating || ' out of 5.', href);
  return new;
end;
$function$;

create or replace function private.notify_review_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  r      public.reviews%rowtype;
  title  text;
  href   text;
begin
  select * into r from public.reviews where id = new.review_id;
  if r.id is null then return new; end if;
  if r.listing_id is not null then
    select l.title into title from public.listings l where l.id = r.listing_id;
    href := '/listing/' || r.listing_id::text;
  else
    select ac.name into title from public.accommodations ac where ac.id = r.accommodation_id;
    href := '/stay/' || r.accommodation_id::text;
  end if;
  perform private.notify(r.author_id, 'listing'::public.notification_kind, 'The host answered your review',
    'Your review of ' || coalesce(title, 'a stay') || ' has a reply.', href);
  return new;
end;
$function$;

-- ----------------------------------------------------- review_responses

alter table public.review_responses add column if not exists responder_id uuid references auth.users (id) on delete cascade;
alter table public.review_responses alter column agent_id drop not null;
alter table public.review_responses drop constraint if exists review_responses_author_chk;
alter table public.review_responses add constraint review_responses_author_chk
  check (agent_id is not null or responder_id is not null) not valid;
alter table public.review_responses validate constraint review_responses_author_chk;
create index if not exists review_responses_responder_idx on public.review_responses (responder_id) where responder_id is not null;

create or replace function private.stamp_review_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_agent uuid;
  on_hotel     boolean;
begin
  select (r.accommodation_id is not null) into on_hotel from public.reviews r
   where r.id = case when tg_op = 'INSERT' then new.review_id else old.review_id end;

  if coalesce(on_hotel, false) then
    -- A hotel's owner answers as themselves; the policy has already checked
    -- that the review is of their own hotel.
    if (select auth.uid()) is null then
      raise exception 'Only the host can answer a review' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.agent_id := null;
      new.responder_id := (select auth.uid());
      new.created_at := now();
    else
      new.agent_id := old.agent_id;
      new.responder_id := old.responder_id;
      new.review_id := old.review_id;
      new.created_at := old.created_at;
    end if;
    new.updated_at := now();
    return new;
  end if;

  select a.id into caller_agent from public.agents a where a.user_id = (select auth.uid());
  if caller_agent is null then
    raise exception 'Only an agent can answer a review' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.agent_id := caller_agent;
    new.responder_id := (select auth.uid());
    new.created_at := now();
  else
    new.agent_id := old.agent_id;
    new.responder_id := old.responder_id;
    new.review_id := old.review_id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

-- --------------------------------------------------------------- ratings

create or replace function public.listing_review_stats(p_listing_ids uuid[])
returns table (listing_id uuid, rating_avg numeric, review_count integer)
language sql
stable
set search_path = ''
as $function$
  select r.listing_id,
         round(avg(r.rating)::numeric, 4) as rating_avg,
         count(*)::integer                as review_count
    from public.reviews r
   where r.listing_id = any (p_listing_ids)
     and r.hidden_at is null
     and cardinality(p_listing_ids) <= 1000
   group by r.listing_id
$function$;

do $$
declare
  def text := pg_get_functiondef('private.catalogue_refresh_listing(uuid)'::regprocedure);
  a1  text := 'from public.reviews r where r.listing_id = l.id';
begin
  if position('r.hidden_at is null' in def) > 0 then
    return;  -- already applied
  end if;
  if position(a1 in def) = 0 then
    raise exception 'catalogue_refresh_listing: review anchor not found';
  end if;
  def := replace(def, a1, a1 || ' and r.hidden_at is null');
  execute def;
end $$;

do $$
declare
  def text := pg_get_functiondef('private.catalogue_refresh_accommodation(uuid)'::regprocedure);
  a1  text := E'coalesce(a.latitude, b.latitude), coalesce(a.longitude, b.longitude),\n    null, 0,';
  b1  text := E'coalesce(a.latitude, b.latitude), coalesce(a.longitude, b.longitude),\n'
           || E'    (select round(avg(r.rating)::numeric, 2) from public.reviews r where r.accommodation_id = a.id and r.hidden_at is null\n'
           || E'       and not exists (select 1 from public.weight_withheld w where w.kind = ''review'' and w.subject_id = r.id)),\n'
           || E'    (select count(*) from public.reviews r where r.accommodation_id = a.id and r.hidden_at is null\n'
           || E'       and not exists (select 1 from public.weight_withheld w where w.kind = ''review'' and w.subject_id = r.id)),';
begin
  if position('r.accommodation_id = a.id and r.hidden_at is null' in def) > 0 then
    return;  -- already applied
  end if;
  if position(a1 in def) = 0 then
    raise exception 'catalogue_refresh_accommodation: rating anchor not found';
  end if;
  def := replace(def, a1, b1);
  execute def;
end $$;

create or replace function private.catalogue_on_accommodation_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op <> 'DELETE' and new.accommodation_id is not null then
    perform private.catalogue_refresh_accommodation(new.accommodation_id);
  end if;
  if tg_op <> 'INSERT' and old.accommodation_id is not null
     and (tg_op = 'DELETE' or old.accommodation_id is distinct from new.accommodation_id) then
    perform private.catalogue_refresh_accommodation(old.accommodation_id);
  end if;
  return null;
end;
$function$;
revoke all on function private.catalogue_on_accommodation_review() from public, anon, authenticated;
drop trigger if exists reviews_catalogue_sync_accommodation on public.reviews;
create trigger reviews_catalogue_sync_accommodation after insert or delete or update on public.reviews
  for each row execute function private.catalogue_on_accommodation_review();

-- -------------------------------------------------------------- contests

create table if not exists public.review_contests (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references public.reviews (id) on delete cascade,
  lister_id    uuid not null references auth.users (id) on delete cascade,
  criterion    text not null,
  note         text,
  status       text not null default 'open',
  public_note  text,
  report_id    uuid references public.reports (id) on delete set null,
  decided_by   uuid references auth.users (id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint review_contests_criterion_chk check (criterion in
    ('off_topic', 'personal_data', 'threats', 'not_about_the_stay', 'conflict_of_interest')),
  constraint review_contests_status_chk check (status in ('open', 'kept', 'hidden')),
  constraint review_contests_note_chk check (note is null or char_length(note) <= 1000),
  constraint review_contests_public_note_chk check (public_note is null or char_length(public_note) between 1 and 200)
);
create unique index if not exists review_contests_one_open_key on public.review_contests (review_id) where status = 'open';
create index if not exists review_contests_review_idx on public.review_contests (review_id);
create index if not exists review_contests_lister_idx on public.review_contests (lister_id);
create index if not exists review_contests_report_idx on public.review_contests (report_id) where report_id is not null;
create index if not exists review_contests_decided_by_idx on public.review_contests (decided_by) where decided_by is not null;

alter table public.review_contests enable row level security;
revoke all on public.review_contests from anon, authenticated;
grant select on public.review_contests to authenticated;

drop policy if exists review_contests_lister_select on public.review_contests;
create policy review_contests_lister_select on public.review_contests for select to authenticated
  using (lister_id = (select auth.uid()));
-- Staff read through private.is_staff() (admin or super admin), the policy-side
-- staff predicate the repo uses. NOT private.staff_can: it is revoked from
-- authenticated (track_k), and a policy helper the role cannot execute turns
-- every select on this table into 42501, the lister's included (probe db-20).
-- Moderation-scope staff act through decide_review_contest, which checks
-- private.staff_can inside the definer.
drop policy if exists review_contests_staff_select on public.review_contests;
create policy review_contests_staff_select on public.review_contests for select to authenticated
  using ((select private.is_staff()));
-- No insert, update or delete policy: the two functions below are the doors.

create or replace function public.contest_review(p_review uuid, p_criterion text, p_note text default null)
returns jsonb
language plpgsql
volatile security definer
set search_path = ''
as $function$
declare
  me       uuid := (select auth.uid());
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
  words    text;
  rep      uuid;
  contest  uuid;
begin
  if me is null then return jsonb_build_object('status', 'signed_out'); end if;
  if p_review is null or private.review_lister_user(p_review) is distinct from me then
    return jsonb_build_object('status', 'not_yours');
  end if;
  words := case p_criterion
    when 'off_topic' then 'Off topic'
    when 'personal_data' then 'Shares personal information'
    when 'threats' then 'Threats or abuse'
    when 'not_about_the_stay' then 'Not about the stay'
    when 'conflict_of_interest' then 'Conflict of interest'
  end;
  if words is null then return jsonb_build_object('status', 'bad_criterion'); end if;
  if v_note is not null and char_length(v_note) > 1000 then return jsonb_build_object('status', 'note_too_long'); end if;
  if exists (select 1 from public.review_contests c where c.review_id = p_review and c.status = 'open') then
    return jsonb_build_object('status', 'already_open');
  end if;
  if (select count(*) from public.review_contests c where c.lister_id = me and c.created_at > now() - interval '1 day') >= 10 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason, category)
  values (me, 'review', p_review::text,
          left('The lister asks Vallo to look at this review. ' || words || coalesce('. ' || v_note, ''), 2000), 'other')
  returning id into rep;

  insert into public.review_contests (review_id, lister_id, criterion, note, report_id)
  values (p_review, me, p_criterion, v_note, rep)
  returning id into contest;

  return jsonb_build_object('status', 'ok', 'contest_id', contest);
end;
$function$;
revoke all on function public.contest_review(uuid, text, text) from public, anon;
grant execute on function public.contest_review(uuid, text, text) to authenticated;

create or replace function public.decide_review_contest(p_contest uuid, p_outcome text, p_public_note text default null)
returns jsonb
language plpgsql
volatile security definer
set search_path = ''
as $function$
declare
  me     uuid := (select auth.uid());
  c      public.review_contests%rowtype;
  r      public.reviews%rowtype;
  v_note   text := nullif(btrim(coalesce(p_public_note, '')), '');
  title  text;
begin
  if me is null or not private.staff_can(me, 'moderation') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into c from public.review_contests where id = p_contest for update;
  if c.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if c.status <> 'open' then return jsonb_build_object('status', 'already_decided'); end if;
  if p_outcome not in ('keep', 'hide') then return jsonb_build_object('status', 'bad_outcome'); end if;
  if p_outcome = 'hide' and (v_note is null or char_length(v_note) > 200) then
    return jsonb_build_object('status', 'public_note_needed');
  end if;
  select * into r from public.reviews where id = c.review_id for update;
  if r.author_id = me or private.review_lister_user(r.id) = me then
    return jsonb_build_object('status', 'conflict_of_interest');
  end if;

  if p_outcome = 'hide' then
    update public.reviews set hidden_at = now(), hidden_note = v_note where id = r.id;
  else
    update public.reviews set hidden_at = null, hidden_note = null where id = r.id and hidden_at is not null;
  end if;
  update public.review_contests
     set status = case p_outcome when 'hide' then 'hidden' else 'kept' end,
         public_note = case p_outcome when 'hide' then v_note else null end,
         decided_by = me, decided_at = now()
   where id = c.id;
  if c.report_id is not null then
    update public.reports set status = 'resolved', resolved_by = me, resolved_at = now()
     where id = c.report_id and status in ('open', 'reviewing');
  end if;

  select coalesce(l.title, ac.name) into title from public.reviews x
    left join public.listings l on l.id = x.listing_id
    left join public.accommodations ac on ac.id = x.accommodation_id where x.id = r.id;

  perform private.notify(c.lister_id, 'listing'::public.notification_kind,
    case p_outcome when 'hide' then 'We hid the review you asked about' else 'We looked at the review and kept it' end,
    case p_outcome
      when 'hide' then 'The review of ' || coalesce(title, 'your place') || ' is hidden and no longer counts toward your rating. Its public note reads: ' || v_note
      else 'The review of ' || coalesce(title, 'your place') || ' meets the review standards, so it stays up. You can still answer it publicly.'
    end,
    case when r.listing_id is not null then '/agent/reviews' else '/host/reviews' end);
  perform private.notify(r.author_id, 'listing'::public.notification_kind,
    case p_outcome when 'hide' then 'Your review was hidden' else 'Your review stays up' end,
    case p_outcome
      when 'hide' then 'Your review of ' || coalesce(title, 'a stay') || ' is hidden from others. The note shown in its place reads: ' || v_note
      else 'The host asked us to look at your review of ' || coalesce(title, 'a stay') || '. It meets the review standards and stays up.'
    end,
    '/bookings');

  return jsonb_build_object('status', 'ok', 'outcome', p_outcome);
end;
$function$;
revoke all on function public.decide_review_contest(uuid, text, text) from public, anon;
grant execute on function public.decide_review_contest(uuid, text, text) to authenticated;

-- ------------------------------------------------------------ read-back

do $$
declare
  nn text;
begin
  select is_nullable into nn from information_schema.columns
   where table_schema = 'public' and table_name = 'reviews' and column_name = 'listing_id';
  if nn <> 'YES' then raise exception 'host c4: reviews.listing_id is still NOT NULL'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'accommodation_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'hidden_at') then
    raise exception 'host c4: a reviews column is missing';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_one_subject_chk' and convalidated) then
    raise exception 'host c4: reviews_one_subject_chk is missing or not validated';
  end if;
  if to_regclass('public.review_contests') is null
     or not (select relrowsecurity from pg_class where oid = 'public.review_contests'::regclass) then
    raise exception 'host c4: review_contests is missing or has RLS off';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reviews' and policyname = 'reviews_select' and qual like '%hidden_at IS NULL%') then
    raise exception 'host c4: reviews_select does not keep hidden reviews from the public';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reviews' and policyname = 'reviews_insert_own'
                  and with_check like '%hidden_at IS NULL%' and with_check like '%hidden_note IS NULL%') then
    raise exception 'host c4: a member could write a hidden review';
  end if;
  if position('r.hidden_at is null' in pg_get_functiondef('private.catalogue_refresh_listing(uuid)'::regprocedure)) = 0
     or position('r.accommodation_id = a.id' in pg_get_functiondef('private.catalogue_refresh_accommodation(uuid)'::regprocedure)) = 0 then
    raise exception 'host c4: the catalogue ratings were not rewritten';
  end if;
  if to_regprocedure('public.contest_review(uuid,text,text)') is null
     or to_regprocedure('public.decide_review_contest(uuid,text,text)') is null then
    raise exception 'host c4: a contest function is missing';
  end if;
end $$;
