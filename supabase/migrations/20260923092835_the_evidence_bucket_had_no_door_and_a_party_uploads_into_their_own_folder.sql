-- THE EVIDENCE BUCKET HAD NO DOOR.
--
-- `escrow-evidence` was created private on 22 September with a size limit and
-- a mime list, and NOT ONE POLICY ON `storage.objects` MENTIONED IT. Private
-- plus no policy means the service role could read and write it and nobody
-- else could do either. That was invisible while no client could pick a file.
-- A browser upload would have been refused with a storage error that says
-- nothing, and the person would have watched a spinner stop.
--
-- THE PATH IS THE PERMISSION.
--
--   <escrow id>/<author id>/<uuid>.<ext>
--
-- Two segments, both checked. The first says which agreement the file belongs
-- to and the caller must be a party to it. The second says who uploaded it and
-- must be the caller, so ONE PARTY CANNOT PUT A FILE IN THE OTHER PARTY'S
-- FOLDER. The bucket then records who filed what independently of the table,
-- which is the property that matters if the two ever disagree.
--
-- READING IS NOT WRITING, AND THEY GATE DIFFERENTLY.
--   Writing needs the agreement to be OPEN: HELD, RELEASE_REQUESTED or
--   DISPUTED, exactly the states `escrow_file_evidence_as` accepts. If the
--   policy were looser than the function, bytes would land in the bucket that
--   no row could ever point at.
--   Reading needs only that the caller is a party, in any state. A receipt is
--   read after a ruling, and evidence a person could see on Tuesday and not on
--   Wednesday is how somebody concludes it was taken away.
--
-- THERE IS NO UPDATE POLICY AND NO DELETE POLICY, FOR ANYBODY.
-- `escrow_evidence` is append-only by trigger. Bytes that could be swapped
-- under a row that cannot change would make the row a liar, so the object is
-- append-only too. Only the service role can remove one, and it does that in
-- exactly one place: clearing an upload whose row was refused.

create or replace function private.escrow_evidence_path_access(
  object_name text,
  must_be_open boolean
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, private, pg_catalog
as $fn$
declare
  who uuid := (select auth.uid());
  folders text[];
  target uuid;
begin
  if who is null or object_name is null then
    return false;
  end if;

  folders := storage.foldername(object_name);
  if folders is null or array_length(folders, 1) < 2 then
    return false;
  end if;

  /* A folder that is not a uuid is not an agreement. Checked with a pattern
     rather than a cast inside a where clause, because a cast that raises on a
     crafted object name is a denial of service with extra steps. */
  if folders[1] !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  if folders[2] <> who::text then
    return false;
  end if;

  target := folders[1]::uuid;

  return exists (
    select 1
    from public.escrows e
    where e.id = target
      and (who = e.payer_id or who = e.payee_id)
      and (
        not must_be_open
        or e.state in ('HELD', 'RELEASE_REQUESTED', 'DISPUTED')
      )
  );
end;
$fn$;

comment on function private.escrow_evidence_path_access(text, boolean) is
  'True when the caller may touch this escrow-evidence object. must_be_open adds the states escrow_file_evidence_as will accept a row in.';

-- RULE 21, BORN LOCKED. Revoked from everything first, then granted to the one
-- role that has to evaluate it, which is the role the RLS policy runs as.
revoke all on function private.escrow_evidence_path_access(text, boolean) from public;
revoke all on function private.escrow_evidence_path_access(text, boolean) from anon;
revoke all on function private.escrow_evidence_path_access(text, boolean) from authenticated;
grant execute on function private.escrow_evidence_path_access(text, boolean) to authenticated;

drop policy if exists escrow_evidence_objects_party_read on storage.objects;
create policy escrow_evidence_objects_party_read
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'escrow-evidence'
    and private.escrow_evidence_path_access(name, false)
  );

drop policy if exists escrow_evidence_objects_party_insert on storage.objects;
create policy escrow_evidence_objects_party_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'escrow-evidence'
    and private.escrow_evidence_path_access(name, true)
  );

drop policy if exists escrow_evidence_objects_admin_read on storage.objects;
create policy escrow_evidence_objects_admin_read
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'escrow-evidence'
    and (
      private.has_role((select auth.uid()), 'admin')
      or private.has_role((select auth.uid()), 'super_admin')
    )
  );

-- READ BACK, INSIDE THE MIGRATION.
do $readback$
declare
  n integer;
begin
  if has_function_privilege('anon', 'private.escrow_evidence_path_access(text, boolean)', 'execute') then
    raise exception 'READ BACK FAILED: anon may execute the path helper';
  end if;
  if has_function_privilege('public', 'private.escrow_evidence_path_access(text, boolean)', 'execute') then
    raise exception 'READ BACK FAILED: public may execute the path helper';
  end if;
  if not has_function_privilege('authenticated', 'private.escrow_evidence_path_access(text, boolean)', 'execute') then
    raise exception 'READ BACK FAILED: authenticated cannot execute the helper its own policy calls';
  end if;

  select count(*) into n
  from pg_policy
  where polrelid = 'storage.objects'::regclass
    and polname in (
      'escrow_evidence_objects_party_read',
      'escrow_evidence_objects_party_insert',
      'escrow_evidence_objects_admin_read'
    );
  if n <> 3 then
    raise exception 'READ BACK FAILED: expected 3 escrow-evidence policies, found %', n;
  end if;

  select count(*) into n
  from pg_policy
  where polrelid = 'storage.objects'::regclass
    and polcmd in ('w', 'd')
    and pg_get_expr(coalesce(polqual, polwithcheck), polrelid) like '%escrow-evidence%';
  if n <> 0 then
    raise exception 'READ BACK FAILED: something can update or delete a filed object (% policies)', n;
  end if;

  -- The helper must refuse a path it cannot parse rather than raise on it.
  if private.escrow_evidence_path_access('not-a-uuid/whatever.jpg', false) then
    raise exception 'READ BACK FAILED: a junk path was accepted';
  end if;
  if private.escrow_evidence_path_access('loose.jpg', true) then
    raise exception 'READ BACK FAILED: a path with no folders was accepted';
  end if;
end
$readback$;
