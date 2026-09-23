/*
 * I1. THE INSPECTION REPORT HAD NOWHERE TO LIVE.
 *
 * `F6A8A482` draws eight ticked rows, a notes field and Add Photos, all
 * belonging to one inspection. Production had `inspection_requests` and
 * `inspection_confirmations` and no table, column or bucket for any of the
 * three, so the screen has been showing the four rung ladder the parent row
 * can prove and the two notes read only.
 *
 * Requested by Session B in `docs/SESSION_B_SCOPE.md` under "Requests from
 * inspection". Its screen is wired to these exact shapes behind one flag.
 *
 * THE RULE THIS PUTS IN THE DATABASE RATHER THAN IN A BUTTON. The render
 * disables Submit until all eight items are ticked. A disabled button is a
 * courtesy, not a rule: anything that can reach the API can submit anyway. So
 * the completion trigger refuses a submission with fewer than eight ticks, and
 * the button becomes the polite half of a rule the database actually holds.
 *
 * TWO TRAPS THIS MIGRATION WALKED INTO AND ITS OWN READ-BACK CAUGHT.
 *
 * One: under `search_path = ''` a TYPE NAME IN A CAST must be qualified too.
 * `'CONFIRMED'::inspection_state` raised 42704. A `language sql` body parses
 * eagerly so it refused at creation; a plpgsql body would have waited until a
 * person tried to file a report. Every type here is schema qualified.
 *
 * Two, and it is the one worth remembering: `pg_default_acl` grants
 * `arwdDxtm` on every NEW relation in `public` to `anon` and `authenticated`.
 * So `create table` handed a stranger full rights to every inspection report
 * on the platform, and the tables would have shipped that way had the
 * read-back only checked that RLS was enabled. RLS on a table a role can
 * select from still needs a policy to refuse; belt and braces is to take the
 * grant away as well, which is what the revokes below do before anything is
 * granted back.
 */

create table if not exists public.inspection_reports (
  inspection_id uuid primary key references public.inspection_requests(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  notes text check (char_length(notes) <= 2000),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_report_items (
  inspection_id uuid not null references public.inspection_reports(inspection_id) on delete cascade,
  item text not null check (item in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall')),
  checked boolean not null default false,
  note text check (char_length(note) <= 400),
  checked_at timestamptz,
  primary key (inspection_id, item)
);

create table if not exists public.inspection_report_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspection_reports(inspection_id) on delete cascade,
  item text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists inspection_report_photos_inspection_idx
  on public.inspection_report_photos (inspection_id, created_at);

drop trigger if exists inspection_reports_set_updated_at on public.inspection_reports;
create trigger inspection_reports_set_updated_at
  before update on public.inspection_reports
  for each row execute function public.set_updated_at();

/* BORN LOCKED. The default ACL gave these away at creation; take it back
   before a single policy is written, then grant only what a party needs. */
revoke all on public.inspection_reports from public, anon, authenticated;
revoke all on public.inspection_report_items from public, anon, authenticated;
revoke all on public.inspection_report_photos from public, anon, authenticated;

/*
 * ONE PREDICATE, ASKED BY EVERY POLICY ON ALL THREE TABLES.
 *
 * RULE 21 HAS AN EXCEPTION AND THIS FUNCTION IS INSIDE IT. An RLS policy is
 * evaluated AS THE QUERYING ROLE, so a `private` helper a policy calls must
 * keep EXECUTE for that role. Revoking it is what refused the entire public
 * catalogue to everybody for eleven hours on 23 September, ledger section 67.
 * `authenticated` is therefore granted deliberately and read back below, and
 * `anon` is refused.
 */
create or replace function private.inspection_party(p_inspection uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.inspection_requests r
     where r.id = p_inspection
       and (r.requester_id = (select auth.uid()) or r.lister_id = (select auth.uid()))
  );
$function$;

create or replace function private.inspection_open_for_report(p_inspection uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.inspection_requests r
     where r.id = p_inspection
       and r.state = 'CONFIRMED'::public.inspection_state
       and (r.requester_id = (select auth.uid()) or r.lister_id = (select auth.uid()))
  );
$function$;

create or replace function private.inspection_report_unsubmitted(p_inspection uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.inspection_reports rep
     where rep.inspection_id = p_inspection and rep.submitted_at is null
  );
$function$;

revoke all on function private.inspection_party(uuid) from public, anon;
revoke all on function private.inspection_open_for_report(uuid) from public, anon;
revoke all on function private.inspection_report_unsubmitted(uuid) from public, anon;
grant execute on function private.inspection_party(uuid) to authenticated;
grant execute on function private.inspection_open_for_report(uuid) to authenticated;
grant execute on function private.inspection_report_unsubmitted(uuid) to authenticated;

alter table public.inspection_reports enable row level security;
alter table public.inspection_report_items enable row level security;
alter table public.inspection_report_photos enable row level security;

drop policy if exists inspection_reports_select_party on public.inspection_reports;
create policy inspection_reports_select_party on public.inspection_reports
  for select using (private.inspection_party(inspection_id));
drop policy if exists inspection_reports_select_admin on public.inspection_reports;
create policy inspection_reports_select_admin on public.inspection_reports
  for select using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );
drop policy if exists inspection_reports_insert_party on public.inspection_reports;
create policy inspection_reports_insert_party on public.inspection_reports
  for insert with check (
    private.inspection_open_for_report(inspection_id)
    and author_id = (select auth.uid())
  );
drop policy if exists inspection_reports_update_party on public.inspection_reports;
create policy inspection_reports_update_party on public.inspection_reports
  for update
  using (private.inspection_open_for_report(inspection_id) and submitted_at is null)
  with check (private.inspection_open_for_report(inspection_id));

drop policy if exists inspection_report_items_select_party on public.inspection_report_items;
create policy inspection_report_items_select_party on public.inspection_report_items
  for select using (private.inspection_party(inspection_id));
drop policy if exists inspection_report_items_select_admin on public.inspection_report_items;
create policy inspection_report_items_select_admin on public.inspection_report_items
  for select using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );
drop policy if exists inspection_report_items_write_party on public.inspection_report_items;
create policy inspection_report_items_write_party on public.inspection_report_items
  for insert with check (
    private.inspection_open_for_report(inspection_id)
    and private.inspection_report_unsubmitted(inspection_id)
  );
drop policy if exists inspection_report_items_update_party on public.inspection_report_items;
create policy inspection_report_items_update_party on public.inspection_report_items
  for update
  using (
    private.inspection_open_for_report(inspection_id)
    and private.inspection_report_unsubmitted(inspection_id)
  )
  with check (private.inspection_open_for_report(inspection_id));

drop policy if exists inspection_report_photos_select_party on public.inspection_report_photos;
create policy inspection_report_photos_select_party on public.inspection_report_photos
  for select using (private.inspection_party(inspection_id));
drop policy if exists inspection_report_photos_select_admin on public.inspection_report_photos;
create policy inspection_report_photos_select_admin on public.inspection_report_photos
  for select using (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  );
drop policy if exists inspection_report_photos_write_party on public.inspection_report_photos;
create policy inspection_report_photos_write_party on public.inspection_report_photos
  for insert with check (
    private.inspection_open_for_report(inspection_id)
    and private.inspection_report_unsubmitted(inspection_id)
  );

/* `anon` gets nothing at all: there is no anonymous read of somebody's
   inspection. No DELETE anywhere, and no delete policy exists either. */
grant select, insert, update on public.inspection_reports to authenticated;
grant select, insert, update on public.inspection_report_items to authenticated;
grant select, insert on public.inspection_report_photos to authenticated;
grant all on public.inspection_reports to service_role;
grant all on public.inspection_report_items to service_role;
grant all on public.inspection_report_photos to service_role;

create or replace function private.inspection_report_submission()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ticked integer;
begin
  if new.submitted_at is null or old.submitted_at is not null then
    return new;
  end if;

  select count(*) into ticked
    from public.inspection_report_items i
   where i.inspection_id = new.inspection_id and i.checked;

  if ticked < 8 then
    raise exception 'an inspection report is submitted when all eight rooms are checked, and % of 8 are', ticked
      using errcode = 'check_violation';
  end if;

  /* The parent moves in the SAME TRANSACTION, so the existing
     `notify_inspection_change` tells both sides and the report cannot be
     signed without the inspection being closed. `guard_inspection_transition`
     permits CONFIRMED to COMPLETED for either party and refuses it for anybody
     else, so this does not widen who may close an inspection. */
  update public.inspection_requests
     set state = 'COMPLETED'::public.inspection_state
   where id = new.inspection_id
     and state = 'CONFIRMED'::public.inspection_state;

  return new;
end;
$function$;

revoke all on function private.inspection_report_submission() from public, anon, authenticated;

drop trigger if exists inspection_reports_submission on public.inspection_reports;
create trigger inspection_reports_submission
  before update of submitted_at on public.inspection_reports
  for each row execute function private.inspection_report_submission();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-photos', 'inspection-photos', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/*
 * THE PATH IS THE PERMISSION, as it is for escrow evidence. The first segment
 * of the object name is the inspection id, and the same party rule decides. A
 * private bucket with no policy is service role only, which is how the escrow
 * bucket shipped with no door on 23 September, so these are written now rather
 * than discovered later.
 */
create or replace function private.inspection_photo_path_access(p_name text, p_must_be_open boolean)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when p_name is null or position('/' in p_name) = 0 then false
    when p_must_be_open then private.inspection_open_for_report(
      nullif(split_part(p_name, '/', 1), '')::uuid)
    else private.inspection_party(
      nullif(split_part(p_name, '/', 1), '')::uuid)
  end;
$function$;

revoke all on function private.inspection_photo_path_access(text, boolean) from public, anon;
grant execute on function private.inspection_photo_path_access(text, boolean) to authenticated;

drop policy if exists inspection_photos_objects_party_read on storage.objects;
create policy inspection_photos_objects_party_read on storage.objects
  for select using (
    bucket_id = 'inspection-photos'
    and private.inspection_photo_path_access(name, false)
  );

drop policy if exists inspection_photos_objects_party_insert on storage.objects;
create policy inspection_photos_objects_party_insert on storage.objects
  for insert with check (
    bucket_id = 'inspection-photos'
    and private.inspection_photo_path_access(name, true)
  );

drop policy if exists inspection_photos_objects_admin_read on storage.objects;
create policy inspection_photos_objects_admin_read on storage.objects
  for select using (
    bucket_id = 'inspection-photos'
    and (
      private.has_role((select auth.uid()), 'admin'::public.app_role)
      or private.has_role((select auth.uid()), 'super_admin'::public.app_role)
    )
  );

/* No update and no delete policy on the objects, for the same reason the rows
   have none: a photograph of a property on a day is evidence. */

do $$
declare
  n integer;
begin
  if has_function_privilege('anon', 'private.inspection_party(uuid)', 'EXECUTE') then
    raise exception 'inspection_party is reachable by anon';
  end if;
  if not has_function_privilege('authenticated', 'private.inspection_party(uuid)', 'EXECUTE') then
    raise exception 'inspection_party lost the grant its own RLS policies need';
  end if;
  if not has_function_privilege('authenticated', 'private.inspection_open_for_report(uuid)', 'EXECUTE') then
    raise exception 'inspection_open_for_report lost the grant its own RLS policies need';
  end if;
  if not has_function_privilege('authenticated', 'private.inspection_photo_path_access(text, boolean)', 'EXECUTE') then
    raise exception 'inspection_photo_path_access lost the grant its own storage policy needs';
  end if;
  if has_function_privilege('authenticated', 'private.inspection_report_submission()', 'EXECUTE') then
    raise exception 'the submission trigger function is reachable by authenticated';
  end if;

  if has_table_privilege('anon', 'public.inspection_reports', 'SELECT')
     or has_table_privilege('anon', 'public.inspection_report_items', 'SELECT')
     or has_table_privilege('anon', 'public.inspection_report_photos', 'SELECT') then
    raise exception 'part of a report is readable by anon';
  end if;

  if not has_table_privilege('authenticated', 'public.inspection_reports', 'SELECT') then
    raise exception 'a party cannot read the report at all, which is the other way to be wrong';
  end if;

  if has_table_privilege('authenticated', 'public.inspection_reports', 'DELETE')
     or has_table_privilege('authenticated', 'public.inspection_report_items', 'DELETE')
     or has_table_privilege('authenticated', 'public.inspection_report_photos', 'DELETE') then
    raise exception 'a party can delete part of a report';
  end if;

  select count(*) into n from pg_class
   where oid in ('public.inspection_reports'::regclass,
                 'public.inspection_report_items'::regclass,
                 'public.inspection_report_photos'::regclass)
     and relrowsecurity;
  if n <> 3 then
    raise exception 'row level security is not enabled on all three tables, only %', n;
  end if;

  select count(*) into n from storage.buckets where id = 'inspection-photos' and not public;
  if n <> 1 then
    raise exception 'the inspection-photos bucket is missing or public';
  end if;

  select count(*) into n from pg_policy
   where polrelid = 'storage.objects'::regclass
     and polname in ('inspection_photos_objects_party_read',
                     'inspection_photos_objects_party_insert',
                     'inspection_photos_objects_admin_read');
  if n <> 3 then
    raise exception 'the bucket has % of its 3 policies', n;
  end if;

  select count(*) into n from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where c.relname = 'inspection_reports' and t.tgname = 'inspection_reports_submission'
     and not t.tgisinternal and t.tgenabled = 'O';
  if n <> 1 then
    raise exception 'the submission trigger is not installed and enabled';
  end if;
end $$;

comment on table public.inspection_reports is
  'One report per inspection, by one party, while the inspection is CONFIRMED. '
  'Setting submitted_at closes the parent to COMPLETED in the same transaction '
  'and is refused unless all eight items are checked. Nothing here is '
  'deletable and nothing is editable once submitted.';
comment on table public.inspection_report_items is
  'The eight rooms F6A8A482 draws. The item list is a check constraint rather '
  'than an enum so a ninth room is a migration and not a silent new value.';
comment on table public.inspection_report_photos is
  'Rows pointing into the private inspection-photos bucket at '
  '<inspection_id>/<uuid>.<ext>. The first path segment is the permission.';

/*
 * PROVED BY DOING IT, AS A REAL PARTY, AND ROLLED BACK.
 * `scripts/probes/inspection_report_rules.sql`, run through apply_migration
 * ending in a deliberate raise:
 *
 *   PROBE ALL PASS i1: party_sees=1 empty_submit=refused (23514)
 *   full_submit=accepted parent_now=COMPLETED
 *   edit_after_submit=refused (no row visible) own_folder=accepted
 *   other_folder=refused outsider_sees=0
 *
 * Two of the platform's own constraints refused earlier runs of that probe and
 * both were right: `refuse_transaction_on_demo_listing`, because all 64
 * published listings are examples, and `inspection_requests_slot_when_confirmed`,
 * because a confirmed inspection has a time. `outsider_sees=0` is the
 * opposite-shape control: a column of refusals proves nothing unless somebody
 * who should see the row does.
 */
