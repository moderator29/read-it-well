-- DB-04: a signed-out (anon) read of storage.objects must return rows or an
-- empty set, never 42501.
--
-- The Storage API lists and signs objects by selecting from storage.objects as
-- the caller's role, so every SELECT policy on the table is evaluated for anon
-- unless it is scoped `to authenticated`. When one of them calls a helper anon
-- cannot execute, every anon list/sign in EVERY bucket fails with "permission
-- denied for function ...", public buckets included. This is the behavioural
-- twin of db-20 (which checks the grants for every policy in the database).
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  n bigint;
begin
  -- CONTROL: a signed-in member can evaluate every storage.objects policy.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    select count(*) into n from storage.objects;
  exception when others then
    raise exception 'PROBE_FAIL db-04-anon-storage-read: control failed, authenticated read of storage.objects raised % %', sqlstate, sqlerrm;
  end;

  -- The Storage API's list shape for a public bucket, as anon.
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from storage.objects where bucket_id = 'avatars';
    select count(*) into n from storage.objects where bucket_id = 'social-media' and name = 'probe/none.jpg';
  exception
    when insufficient_privilege then
      raise exception 'PROBE_FAIL db-04-anon-storage-read: anon read of storage.objects refused (%): every signed-out list/sign in every bucket fails', sqlerrm;
  end;

  raise exception 'PROBE_OK db-04-anon-storage-read: anon and authenticated both evaluate every storage.objects SELECT policy';
end;
$$;
