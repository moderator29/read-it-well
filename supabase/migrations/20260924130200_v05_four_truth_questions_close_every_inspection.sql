-- V-05, FOUR TRUTH QUESTIONS CLOSE EVERY INSPECTION.
--
-- The inspection is the one moment a real person stands in front of the real
-- property. The report built by 20260923135847_i1 asks eight condition
-- questions copied from a rental-inspection template; it does not ask the four
-- that decide whether the LISTING was honest:
--
--   agent_matched     Was the person who showed you the flat the agent on
--                     Vallo, or the delegate they named?
--   property_matched  Was it the flat in the photos?
--   available         Is it still available to you?
--   off_platform_ask  Did anybody ask you for money outside Vallo?
--
-- Each is 'yes', 'no' or 'not_sure'. One row per inspection, written ONCE by
-- the renter who requested it, never edited, never deleted, and private: the
-- renter reads their own row, staff read all rows, the lister reads NOTHING
-- row by row. What leaves this table leaves as a count.
--
-- WHEN IT MAY BE ANSWERED. The renter who requested the inspection, once the
-- lister has accepted it (CONFIRMED) or it has closed (COMPLETED), and only
-- after the agreed time has passed. A lister-confirmed slot is the proof this
-- platform holds today that a viewing was arranged with the lister; V-35's
-- gate handshake will prove attendance, and the pause below waits for it.
--
-- THREE CONSEQUENCES, EACH WRITTEN IN THE DATABASE:
--
--   1. "Asked for money outside Vallo: yes" OPENS A REPORT in the
--      `off_platform_payment` category against the listing, as the renter,
--      naming the inspection. Automatically, because the renter who was just
--      asked for a transfer at a gate should not also have to go looking for
--      a small link. `reports_one_open_per_target` keeps it to one.
--
--   2. THE BAIT-LISTING PAUSE, BEHIND A FLAG THAT IS OFF. Two different
--      renters answering "not available" or "not the flat in the photos"
--      within 30 days moves a PUBLISHED listing to MORE_INFO_REQUIRED, writes
--      an audit row naming the rule, and tells the lister without names. It is
--      off (`feature_flags.truth_autopause`, fail closed: no row, no pause)
--      because a pause on two accounts' word is a lever a competitor can pull
--      until attendance is proven (V-35) and reputation counts per confirmed
--      phone (V-50). Turning it on is one statement; see the report.
--
--   3. A PUBLIC COUNT for the proof strip: how many renters answered and how
--      many found the agent AND the flat as listed. Only on published real
--      listings, and only from TWO answers up, so a lister who had one viewer
--      cannot read one person's answer off their own listing page.

create table if not exists public.inspection_truth (
  inspection_id    uuid primary key references public.inspection_requests(id) on delete cascade,
  listing_id       uuid not null references public.listings(id) on delete cascade,
  respondent_id    uuid not null references auth.users(id) on delete cascade,
  agent_matched    text not null check (agent_matched in ('yes', 'no', 'not_sure')),
  property_matched text not null check (property_matched in ('yes', 'no', 'not_sure')),
  available        text not null check (available in ('yes', 'no', 'not_sure')),
  off_platform_ask text not null check (off_platform_ask in ('yes', 'no', 'not_sure')),
  answered_at      timestamptz not null default now()
);

comment on table public.inspection_truth is
  'V-05. Four one-tap answers a renter gives after an inspection: was it the agent, was it the flat, is it available, was money asked for outside Vallo. Written once by the requester, never edited. Private: counts leave, rows do not.';

create index if not exists inspection_truth_listing_idx on public.inspection_truth (listing_id, answered_at);
create index if not exists inspection_truth_respondent_idx on public.inspection_truth (respondent_id);

revoke all on public.inspection_truth from public, anon, authenticated;

/* May THIS caller answer for THIS inspection? Requester, accepted or closed,
   the agreed time passed. Called by the insert policy, so it keeps EXECUTE
   for `authenticated` (the 23 September outage is why that is deliberate). */
create or replace function private.inspection_truth_open(p_inspection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.inspection_requests r
     where r.id = p_inspection
       and r.requester_id = (select auth.uid())
       and r.state in ('CONFIRMED'::public.inspection_state, 'COMPLETED'::public.inspection_state)
       and coalesce(r.slot_at, r.requested_at) <= now()
  );
$$;

revoke all on function private.inspection_truth_open(uuid) from public, anon;
grant execute on function private.inspection_truth_open(uuid) to authenticated;

alter table public.inspection_truth enable row level security;

drop policy if exists inspection_truth_select_own on public.inspection_truth;
create policy inspection_truth_select_own on public.inspection_truth
  for select to authenticated
  using (respondent_id = (select auth.uid()));

drop policy if exists inspection_truth_select_admin on public.inspection_truth;
create policy inspection_truth_select_admin on public.inspection_truth
  for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );

drop policy if exists inspection_truth_insert_requester on public.inspection_truth;
create policy inspection_truth_insert_requester on public.inspection_truth
  for insert to authenticated
  with check (
    respondent_id = (select auth.uid())
    and private.inspection_truth_open(inspection_id)
  );

/* Insert and read only. No update, no delete: an answer is final. */
grant select, insert on public.inspection_truth to authenticated;
grant all on public.inspection_truth to service_role;

/* ---------------------------------------------- the row fills its own facts */

create or replace function private.inspection_truth_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  /* The listing comes from the inspection, never from the caller, and the
     time is the server's. */
  select r.listing_id into new.listing_id from public.inspection_requests r where r.id = new.inspection_id;
  if new.listing_id is null then
    raise exception 'no such inspection' using errcode = 'foreign_key_violation';
  end if;
  new.answered_at := now();
  return new;
end;
$$;

revoke all on function private.inspection_truth_fill() from public, anon, authenticated;

drop trigger if exists inspection_truth_fill on public.inspection_truth;
create trigger inspection_truth_fill
  before insert on public.inspection_truth
  for each row execute function private.inspection_truth_fill();

/* --------------------------------------------------- the three consequences */

create or replace function private.inspection_truth_consequences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  witnesses integer;
  lister uuid;
  property text;
  pause_on boolean;
begin
  /* 1. Money asked for outside Vallo: a report, as the renter, once. */
  if new.off_platform_ask = 'yes' then
    insert into public.reports (reporter_id, target_type, target_id, category, reason)
    values (
      new.respondent_id, 'listing', new.listing_id::text, 'off_platform_payment',
      'Filed automatically from the questions after inspection ' || new.inspection_id::text ||
      ': the renter was asked for money outside Vallo.'
    )
    on conflict do nothing;
  end if;

  /* 2. The bait-listing pause, only when its flag says true. */
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'truth_autopause'), false)
    into pause_on;
  if pause_on and (new.available = 'no' or new.property_matched = 'no') then
    select count(distinct t.respondent_id) into witnesses
      from public.inspection_truth t
     where t.listing_id = new.listing_id
       and t.answered_at > now() - interval '30 days'
       and (t.available = 'no' or t.property_matched = 'no');

    if witnesses >= 2 then
      update public.listings
         set status = 'MORE_INFO_REQUIRED'::public.listing_status
       where id = new.listing_id
         and status = 'PUBLISHED'::public.listing_status
      returning (select a.user_id from public.agents a where a.id = listings.agent_id), title
        into lister, property;

      if lister is not null then
        insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
        values (
          null, 'listing.paused_by_truth_answers', 'listing', new.listing_id::text,
          jsonb_build_object(
            'rule', 'two different renters said not available or not the flat in the photos within 30 days',
            'witnesses', witnesses
          )
        );
        perform private.notify(
          lister,
          'listing',
          'Listing paused: please reconfirm it',
          witnesses::text || ' renters who inspected ' || coalesce(property, 'this listing') ||
            ' in the last 30 days said it was not available or not the flat in the photos. ' ||
            'It is off search until you reconfirm it.',
          '/agent/listings'
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.inspection_truth_consequences() from public, anon, authenticated;

drop trigger if exists inspection_truth_consequences on public.inspection_truth;
create trigger inspection_truth_consequences
  after insert on public.inspection_truth
  for each row execute function private.inspection_truth_consequences();

/* --------------------------------------------------------- the public count */

create or replace view public.listing_truth_summary as
  select t.listing_id,
         count(*)::integer as attended,
         (count(*) filter (where t.agent_matched = 'yes' and t.property_matched = 'yes'))::integer as as_listed,
         max(t.answered_at) as last_at
    from public.inspection_truth t
    join public.listings l on l.id = t.listing_id
   where l.status = 'PUBLISHED'::public.listing_status
     and not l.is_demo
   group by t.listing_id
  having count(*) >= 2;

comment on view public.listing_truth_summary is
  'V-05 and V-03. How many renters answered the truth questions for a published real listing, and how many found the agent and the flat as listed. Counts only, from two answers up, so no single renter''s answer can be read off a listing.';

/* A non-invoker view writes as its owner, so it is born able to write. Take
   everything back and grant SELECT only (the person_badge lesson). */
revoke all on public.listing_truth_summary from public, anon, authenticated;
grant select on public.listing_truth_summary to anon, authenticated;

/* ----------------------------------------------- what the lister may know */

create or replace function public.listing_truth_for_lister(p_listing uuid)
returns table (attended integer, not_available integer, not_the_flat integer, not_the_agent integer, money_asked integer)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer,
         (count(*) filter (where t.available = 'no'))::integer,
         (count(*) filter (where t.property_matched = 'no'))::integer,
         (count(*) filter (where t.agent_matched = 'no'))::integer,
         (count(*) filter (where t.off_platform_ask = 'yes'))::integer
    from public.inspection_truth t
   where t.listing_id = p_listing
     and t.answered_at > now() - interval '30 days'
     and private.owns_listing(p_listing);
$$;

comment on function public.listing_truth_for_lister(uuid) is
  'V-05. The lister of a listing, and nobody else, reads the last 30 days of truth answers as five counts, never as rows and never with a name.';

revoke all on function public.listing_truth_for_lister(uuid) from public, anon;
grant execute on function public.listing_truth_for_lister(uuid) to authenticated;

insert into public.feature_flags (key, enabled, note)
values ('truth_autopause', false,
        'V-05. When true, two different renters answering "not available" or "not the flat" within 30 days pauses a published listing. Off until V-35 proves attendance and V-50 counts per phone.')
on conflict (key) do nothing;

do $readback$
declare bad text := '';
begin
  if has_table_privilege('anon', 'public.inspection_truth', 'select') then bad := bad || ' [anon reads truth rows]'; end if;
  if has_table_privilege('authenticated', 'public.inspection_truth', 'update')
     or has_table_privilege('authenticated', 'public.inspection_truth', 'delete') then
    bad := bad || ' [an answer can be edited]';
  end if;
  if has_table_privilege('anon', 'public.listing_truth_summary', 'insert')
     or has_table_privilege('authenticated', 'public.listing_truth_summary', 'update') then
    bad := bad || ' [the summary view can be written]';
  end if;
  if not has_table_privilege('anon', 'public.listing_truth_summary', 'select') then bad := bad || ' [the count is not public]'; end if;
  if not has_function_privilege('authenticated', 'private.inspection_truth_open(uuid)', 'execute') then
    bad := bad || ' [the insert policy cannot evaluate its helper]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
