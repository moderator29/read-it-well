-- PUBLIC-REPO HARDENING, ROUND 1 (29 September 2026).
--
-- The repository is public, so every rule below assumes the attacker has read
-- the schema. Each closes a way in that the app layer alone was holding shut,
-- or not holding at all:
--
--  1. A reviewer never decides their own listing or agent application. Scoped
--     staff write through the service role, so no owner guard was in the way;
--     a kyc_review holder could approve their own agent application and a
--     listing_approval holder could publish their own listing. Enforced on the
--     write itself, whoever the caller is. Rows decided before today are left.
--  2. A story's picture is the author's own. `private.social_media_access`
--     serves an object to anybody who can see ANY story naming it, so a story
--     pointing at somebody else's followers-only picture made it public.
--  3. A KYC document row names a file in its uploader's own folder. Without it
--     a person could file somebody else's ID as their own.
--  4. A photo row stores a path, never a URL. An absolute or protocol-relative
--     value made the server fetch, and every viewer load, an address the
--     lister chose. Site-relative demo paths (/brand/...) stay valid.
--  5. The accommodation-photos bucket stops being listable by anybody. Public
--     URLs keep working (the bucket is public); only the owner lists and
--     manages their own folder, as listing-photos already does.
--  6. The admin bootstrap grants only an unclaimed row. The founder's address
--     is in a public migration; if that account were ever purged, the next
--     person to sign up with the address would have become super admin.
--  7. Staff-assisted email recovery refuses any account holding a staff role
--     or a live staff grant. Staff accounts are recovered out of band by the
--     founder, never through the member desk.

-- 1 ---------------------------------------------------------------------------
create or replace function private.refuse_self_review()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  subject uuid;
begin
  -- A decision is the moment a reviewer's name or review time is written.
  -- Status alone moving (an owner closing or resubmitting) is not a decision.
  if new.reviewer_id is null
     or (new.reviewer_id is not distinct from old.reviewer_id
         and new.reviewed_at is not distinct from old.reviewed_at) then
    return new;
  end if;
  if tg_table_name = 'listings' then
    select a.user_id into subject from public.agents a where a.id = new.agent_id;
    if subject is null and new.assigned_agent_id is not null then
      select a.user_id into subject from public.agents a where a.id = new.assigned_agent_id;
    end if;
  else
    subject := new.user_id;
  end if;
  if subject is not null and subject = new.reviewer_id then
    raise exception 'Nobody reviews their own %. Leave it for another reviewer.',
      case when tg_table_name = 'listings' then 'listing' else 'application' end
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.refuse_self_review() from public, anon, authenticated;

drop trigger if exists listings_01_no_self_review on public.listings;
create trigger listings_01_no_self_review
  before update of reviewer_id, reviewed_at on public.listings
  for each row execute function private.refuse_self_review();

drop trigger if exists agent_applications_01_no_self_review on public.agent_applications;
create trigger agent_applications_01_no_self_review
  before update of reviewer_id, reviewed_at on public.agent_applications
  for each row execute function private.refuse_self_review();

-- 2 ---------------------------------------------------------------------------
create or replace function private.story_picture_is_the_authors()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.author_id::text then
    raise exception 'A story picture is stored in its author''s own folder.' using errcode = 'RM014';
  end if;
  return new;
end;
$function$;

revoke all on function private.story_picture_is_the_authors() from public, anon, authenticated;

drop trigger if exists stories_00_picture_is_the_authors on public.stories;
create trigger stories_00_picture_is_the_authors
  before insert or update of image_path, author_id on public.stories
  for each row execute function private.story_picture_is_the_authors();

-- 3 ---------------------------------------------------------------------------
create or replace function private.document_is_in_uploaders_folder()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if split_part(coalesce(new.storage_path, ''), '/', 1) <> coalesce(new.uploader_id::text, '') then
    raise exception 'A document is filed from its uploader''s own folder.' using errcode = '42501';
  end if;
  return new;
end;
$function$;

revoke all on function private.document_is_in_uploaders_folder() from public, anon, authenticated;

drop trigger if exists agent_documents_01_own_folder on public.agent_documents;
create trigger agent_documents_01_own_folder
  before insert or update of storage_path, uploader_id on public.agent_documents
  for each row execute function private.document_is_in_uploaders_folder();

-- 4 ---------------------------------------------------------------------------
alter table public.listing_photos drop constraint if exists listing_photos_path_not_url;
alter table public.listing_photos add constraint listing_photos_path_not_url
  check (storage_path !~ '^[A-Za-z][A-Za-z0-9+.-]*:' and storage_path !~ '^//' and position('\' in storage_path) = 0
         and position('..' in storage_path) = 0);
alter table public.accommodation_photos drop constraint if exists accommodation_photos_path_not_url;
alter table public.accommodation_photos add constraint accommodation_photos_path_not_url
  check (storage_path !~ '^[A-Za-z][A-Za-z0-9+.-]*:' and storage_path !~ '^//' and position('\' in storage_path) = 0
         and position('..' in storage_path) = 0);
alter table public.business_photos drop constraint if exists business_photos_path_not_url;
alter table public.business_photos add constraint business_photos_path_not_url
  check (storage_path !~ '^[A-Za-z][A-Za-z0-9+.-]*:' and storage_path !~ '^//' and position('\' in storage_path) = 0
         and position('..' in storage_path) = 0);

-- 5 ---------------------------------------------------------------------------
drop policy if exists "accommodation photos public read" on storage.objects;
drop policy if exists "accommodation photos owner read" on storage.objects;
create policy "accommodation photos owner read" on storage.objects for select
  using (bucket_id = 'accommodation-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 6 ---------------------------------------------------------------------------
do $$
declare
  src text := pg_get_functiondef('public.handle_new_user'::regproc);
  fixed text;
begin
  fixed := replace(src,
    'where lower(b.email) = lower(trim(coalesce(new.email, '''')))
  limit 1;',
    'where lower(b.email) = lower(trim(coalesce(new.email, '''')))
    and b.claimed_at is null
  limit 1;');
  if fixed = src then
    raise exception 'handle_new_user: bootstrap lookup not found, nothing changed';
  end if;
  execute fixed;
end $$;

-- 7 ---------------------------------------------------------------------------
do $$
declare
  src text := pg_get_functiondef('public.admin_open_email_recovery(uuid, text, text, text)'::regprocedure);
  fixed text;
begin
  fixed := replace(src,
    '  select u.email into old from auth.users u where u.id = p_user and u.deleted_at is null;',
    '  -- A staff account is never re-addressed through this desk.
  if private.has_role(p_user, ''admin''::public.app_role)
     or private.has_role(p_user, ''super_admin''::public.app_role)
     or exists (select 1 from public.staff_grants g where g.user_id = p_user and g.revoked_at is null) then
    raise exception ''This account holds staff access. Staff accounts are recovered by the founder directly, never here.''
      using errcode = ''42501'';
  end if;

  select u.email into old from auth.users u where u.id = p_user and u.deleted_at is null;');
  if fixed = src then
    raise exception 'admin_open_email_recovery: anchor not found, nothing changed';
  end if;
  execute fixed;
end $$;

-- Read back ---------------------------------------------------------------------
do $$
begin
  if pg_get_functiondef('public.handle_new_user'::regproc) not like '%b.claimed_at is null%' then
    raise exception 'bootstrap guard missing';
  end if;
  if pg_get_functiondef('public.admin_open_email_recovery(uuid, text, text, text)'::regprocedure) not like '%holds staff access%' then
    raise exception 'recovery staff guard missing';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'accommodation photos public read') then
    raise exception 'public list policy still present';
  end if;
end $$;
