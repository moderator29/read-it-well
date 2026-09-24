-- V-54: THE INSPECTION REPORT GETS ITS TENANCY STAGES: MOVE-IN AND MOVE-OUT.
--
-- The viewing report already exists (`inspection_reports`, migration
-- 20260923135847): eight rooms to tick, notes, photos, a submission the
-- database refuses with fewer than eight ticks. The entry proposed adding a
-- `stage` to that table and widening its primary key to (inspection_id,
-- stage). That table is existing schema the audit session owns, and its key,
-- policies and submission trigger all assume one report per inspection, so
-- this file does NOT alter it. It adds the two tenancy stages beside it, in
-- the same vocabulary: the same eight items, the same eight-tick rule on
-- submission, photos in a private bucket whose path is the permission. The
-- viewing report stays the first page of the tenancy file's evidence.
--
-- WHAT IS NEW IS THE SECOND SIGNATURE. Each party writes their own report of
-- each stage (one per author, so whoever opens first cannot take the stage
-- from the other), and each report can be countersigned by the other party.
-- Submitting one tells the other party. A report the other side has not
-- countersigned seven days after submission is shown as "not answered" with
-- the date, derived at read time (`lib/tenancy/reports.ts`).
--
-- WINDOWS. The move-in report opens on the tenancy's move-in day; the move-out
-- report opens 30 days before tenancy end. Both stay open to the author until
-- submitted. After submission a report is frozen.
--
-- WRITES ARE THROUGH DEFINER DOORS ONLY. A party has no direct write grant on
-- any of the three tables; `save_tenancy_report`, `add_tenancy_report_photo`
-- and `countersign_tenancy_report` check who is calling and what may change.

create table if not exists public.tenancy_reports (
  id               uuid primary key default gen_random_uuid(),
  rent_payment_id  uuid not null references public.rent_payments(id) on delete cascade,
  stage            text not null check (stage in ('move_in', 'move_out')),
  author_id        uuid not null,
  notes            text check (notes is null or length(notes) <= 4000),
  submitted_at     timestamptz,
  countersigned_at timestamptz,
  countersigned_by uuid,
  created_at       timestamptz not null default now(),
  unique (rent_payment_id, stage, author_id),
  check (countersigned_at is null or (submitted_at is not null and countersigned_by is not null)),
  check (countersigned_by is null or countersigned_by <> author_id)
);

comment on table public.tenancy_reports is
  'V-54. The move-in and move-out reports of a tenancy, one per stage per party, in the same eight-item vocabulary as the viewing report. Each is written by its author and may be countersigned by the other party. Frozen once submitted, apart from the countersignature.';

create table if not exists public.tenancy_report_items (
  report_id  uuid not null references public.tenancy_reports(id) on delete cascade,
  item       text not null check (item in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall')),
  checked    boolean not null default false,
  note       text check (note is null or length(note) <= 500),
  checked_at timestamptz,
  primary key (report_id, item)
);

create table if not exists public.tenancy_report_photos (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.tenancy_reports(id) on delete cascade,
  item         text check (item is null or item in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall')),
  storage_path text not null unique,
  created_at   timestamptz not null default now()
);

create index if not exists tenancy_report_photos_report_idx on public.tenancy_report_photos (report_id);

-- A caution deduction names a move-out photo from here.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'caution_deductions_photo_fk') then
    alter table public.caution_deductions
      add constraint caution_deductions_photo_fk
      foreign key (photo_id) references public.tenancy_report_photos(id) on delete restrict;
  end if;
end $$;

alter table public.tenancy_reports enable row level security;
alter table public.tenancy_report_items enable row level security;
alter table public.tenancy_report_photos enable row level security;
revoke all on public.tenancy_reports, public.tenancy_report_items, public.tenancy_report_photos
  from public, anon, authenticated;
grant select on public.tenancy_reports, public.tenancy_report_items, public.tenancy_report_photos to authenticated;
grant all on public.tenancy_reports, public.tenancy_report_items, public.tenancy_report_photos to service_role;

create policy tenancy_reports_read on public.tenancy_reports for select to authenticated
  using (private.tenancy_party(rent_payment_id) or private.is_staff());
create policy tenancy_report_items_read on public.tenancy_report_items for select to authenticated
  using (exists (select 1 from public.tenancy_reports r where r.id = report_id));
create policy tenancy_report_photos_read on public.tenancy_report_photos for select to authenticated
  using (exists (select 1 from public.tenancy_reports r where r.id = report_id));

/* ------------------------------------------------------------ the doors */

/* Is this stage open for writing today? Lagos days. */
create or replace function private.tenancy_stage_open(p_rent_payment uuid, p_stage text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select case p_stage
    when 'move_in' then rp.move_in <= (now() at time zone 'Africa/Lagos')::date
    when 'move_out' then private.tenancy_end(rp.move_in, rp.rent_period) - 30 <= (now() at time zone 'Africa/Lagos')::date
    else false
  end
  from public.rent_payments rp
  where rp.id = p_rent_payment;
$function$;

revoke all on function private.tenancy_stage_open(uuid, text) from public, anon, authenticated;

/* Is this rent charge paid? A tenancy only exists once the money settled. */
create or replace function private.tenancy_paid(p_rent_payment uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.rent_payments rp
      join public.transactions t on t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL'
     where rp.id = p_rent_payment
  );
$function$;

revoke all on function private.tenancy_paid(uuid) from public, anon, authenticated;

create or replace function public.save_tenancy_report(
  p_rent_payment uuid, p_stage text, p_items jsonb default '[]'::jsonb,
  p_notes text default null, p_submit boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  caller uuid := (select auth.uid());
  rep    public.tenancy_reports%rowtype;
  rp     public.rent_payments%rowtype;
  entry  jsonb;
  ticked int;
begin
  if caller is null or not private.tenancy_party(p_rent_payment) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if p_stage not in ('move_in', 'move_out') then
    return jsonb_build_object('status', 'bad_stage');
  end if;
  if not private.tenancy_paid(p_rent_payment) then
    return jsonb_build_object('status', 'not_paid');
  end if;
  if not coalesce(private.tenancy_stage_open(p_rent_payment, p_stage), false) then
    return jsonb_build_object('status', 'not_open_yet');
  end if;

  select * into rep from public.tenancy_reports
   where rent_payment_id = p_rent_payment and stage = p_stage and author_id = caller for update;
  if rep.id is null then
    insert into public.tenancy_reports (rent_payment_id, stage, author_id)
    values (p_rent_payment, p_stage, caller)
    on conflict (rent_payment_id, stage, author_id) do nothing
    returning * into rep;
    if rep.id is null then
      select * into rep from public.tenancy_reports
       where rent_payment_id = p_rent_payment and stage = p_stage and author_id = caller for update;
    end if;
  end if;
  if rep.submitted_at is not null then
    return jsonb_build_object('status', 'submitted', 'report_id', rep.id);
  end if;

  if jsonb_typeof(p_items) = 'array' then
    for entry in select * from jsonb_array_elements(p_items) loop
      if (entry ->> 'item') in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall') then
        insert into public.tenancy_report_items (report_id, item, checked, note, checked_at)
        values (rep.id, entry ->> 'item', coalesce((entry ->> 'checked')::boolean, false),
                left(nullif(btrim(coalesce(entry ->> 'note', '')), ''), 500),
                case when coalesce((entry ->> 'checked')::boolean, false) then now() end)
        on conflict (report_id, item) do update
          set checked = excluded.checked, note = excluded.note, checked_at = excluded.checked_at;
      end if;
    end loop;
  end if;

  update public.tenancy_reports set notes = left(nullif(btrim(coalesce(p_notes, '')), ''), 4000)
   where id = rep.id;

  if p_submit then
    select count(*) into ticked from public.tenancy_report_items where report_id = rep.id and checked;
    if ticked < 8 then
      return jsonb_build_object('status', 'needs_all_eight', 'report_id', rep.id, 'ticked', ticked);
    end if;
    update public.tenancy_reports set submitted_at = now() where id = rep.id;
    select * into rp from public.rent_payments where id = p_rent_payment;
    perform private.tenancy_tell(
      case when caller = rp.tenant_id then rp.lister_id else rp.tenant_id end,
      case when p_stage = 'move_in' then 'A move-in report was submitted' else 'A move-out report was submitted' end,
      'Read it and countersign it in the tenancy file.', p_rent_payment);
  end if;
  return jsonb_build_object('status', 'ok', 'report_id', rep.id);
end;
$function$;

create or replace function public.add_tenancy_report_photo(p_report uuid, p_item text, p_path text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rep public.tenancy_reports%rowtype;
  new_id uuid;
begin
  select * into rep from public.tenancy_reports where id = p_report;
  if rep.id is null or rep.author_id <> (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if rep.submitted_at is not null then
    return jsonb_build_object('status', 'submitted');
  end if;
  -- The path is the permission: <rent_payment_id>/<report_id>/<file>.
  if p_path is null or split_part(p_path, '/', 1) <> rep.rent_payment_id::text
     or split_part(p_path, '/', 2) <> rep.id::text then
    return jsonb_build_object('status', 'bad_path');
  end if;
  -- The photograph must already be in the bucket. A row naming a file that
  -- was never uploaded would be evidence of nothing.
  if not exists (select 1 from storage.objects so
                  where so.bucket_id = 'tenancy-evidence' and so.name = p_path) then
    return jsonb_build_object('status', 'no_such_file');
  end if;
  if p_item is not null and p_item not in ('exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall') then
    return jsonb_build_object('status', 'bad_item');
  end if;
  insert into public.tenancy_report_photos (report_id, item, storage_path)
  values (rep.id, p_item, p_path)
  on conflict (storage_path) do nothing
  returning id into new_id;
  return jsonb_build_object('status', 'ok', 'photo_id', new_id);
end;
$function$;

create or replace function public.countersign_tenancy_report(p_report uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rep public.tenancy_reports%rowtype;
  caller uuid := (select auth.uid());
begin
  select * into rep from public.tenancy_reports where id = p_report for update;
  if rep.id is null or not private.tenancy_party(rep.rent_payment_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if rep.author_id = caller then
    return jsonb_build_object('status', 'own_report');
  end if;
  if rep.submitted_at is null then
    return jsonb_build_object('status', 'not_submitted');
  end if;
  if rep.countersigned_at is not null then
    return jsonb_build_object('status', 'already_countersigned');
  end if;
  update public.tenancy_reports set countersigned_at = now(), countersigned_by = caller where id = rep.id;
  perform private.tenancy_tell(rep.author_id, 'Your report was countersigned',
                               'The other party signed your tenancy report.', rep.rent_payment_id);
  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.save_tenancy_report(uuid, text, jsonb, text, boolean) from public, anon;
revoke all on function public.add_tenancy_report_photo(uuid, text, text) from public, anon;
revoke all on function public.countersign_tenancy_report(uuid) from public, anon;
grant execute on function public.save_tenancy_report(uuid, text, jsonb, text, boolean) to authenticated;
grant execute on function public.add_tenancy_report_photo(uuid, text, text) to authenticated;
grant execute on function public.countersign_tenancy_report(uuid) to authenticated;

/* Once submitted, only the countersignature may change. */
create or replace function private.tenancy_report_is_frozen_once_submitted()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if old.submitted_at is not null
     and (new.notes is distinct from old.notes
          or new.submitted_at is distinct from old.submitted_at
          or new.author_id is distinct from old.author_id
          or new.stage is distinct from old.stage
          or new.rent_payment_id is distinct from old.rent_payment_id) then
    raise exception 'a submitted tenancy report is frozen' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.tenancy_report_is_frozen_once_submitted() from public, anon, authenticated;

drop trigger if exists tenancy_reports_frozen on public.tenancy_reports;
create trigger tenancy_reports_frozen before update on public.tenancy_reports
  for each row execute function private.tenancy_report_is_frozen_once_submitted();

/* ------------------------------------------------------------ the bucket */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenancy-evidence', 'tenancy-evidence', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/* The first path segment is the rent payment, and the party rule decides. */
create or replace function private.tenancy_evidence_path_access(p_name text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when p_name is null or position('/' in p_name) = 0 then false
    when split_part(p_name, '/', 1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then false
    else private.tenancy_party(split_part(p_name, '/', 1)::uuid)
  end;
$function$;

revoke all on function private.tenancy_evidence_path_access(text) from public, anon;
grant execute on function private.tenancy_evidence_path_access(text) to authenticated;

/* An upload lands only in a report the caller wrote and has not submitted:
   <rent_payment_id>/<report_id>/<file>. */
create or replace function private.tenancy_evidence_upload_access(p_name text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when p_name is null or split_part(p_name, '/', 3) = '' then false
    when split_part(p_name, '/', 1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then false
    when split_part(p_name, '/', 2) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then false
    else exists (
      select 1 from public.tenancy_reports r
       where r.id = split_part(p_name, '/', 2)::uuid
         and r.rent_payment_id = split_part(p_name, '/', 1)::uuid
         and r.author_id = (select auth.uid())
         and r.submitted_at is null
    )
  end;
$function$;

revoke all on function private.tenancy_evidence_upload_access(text) from public, anon;
grant execute on function private.tenancy_evidence_upload_access(text) to authenticated;

drop policy if exists tenancy_evidence_objects_party_read on storage.objects;
create policy tenancy_evidence_objects_party_read on storage.objects
  for select to authenticated
  using (bucket_id = 'tenancy-evidence' and private.tenancy_evidence_path_access(name));

drop policy if exists tenancy_evidence_objects_party_insert on storage.objects;
create policy tenancy_evidence_objects_party_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tenancy-evidence' and private.tenancy_evidence_upload_access(name));

drop policy if exists tenancy_evidence_objects_admin_read on storage.objects;
create policy tenancy_evidence_objects_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'tenancy-evidence' and private.is_staff());

/* No update and no delete policy: a photograph of a flat on a day is evidence. */
