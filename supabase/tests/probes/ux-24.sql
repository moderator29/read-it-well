-- UX-24: a signed-out caller (anon, the publishable key) must not read a
-- member's occupation, local government, state or home area from
-- public.social_profiles. The display columns stay readable to anon, and a
-- signed-in member still reads all of them (the /u directory runs signed in).
do $$
declare
  n int;
  col text;
begin
  -- CONTROL (anon): the still-granted columns read without error.
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from (select user_id, handle, display_label, avatar_path, bio from public.social_profiles) s;
  exception when others then
    raise exception 'PROBE_FAIL ux-24: anon control read of display columns failed: % %', sqlstate, sqlerrm;
  end;

  -- REFUSALS (anon): each protected column, and select *, is refused 42501.
  foreach col in array array['occupation_code','lga_code','state_code','home_area_id'] loop
    begin
      execute format('select count(%I) from public.social_profiles', col) into n;
      raise exception 'PROBE_FAIL ux-24: anon read %', col;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    execute 'select count(*) from (select * from public.social_profiles) s' into n;
    raise exception 'PROBE_FAIL ux-24: anon select * succeeded';
  exception when insufficient_privilege then null;
  end;

  -- CONTROL (authenticated member): the directory columns still read.
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"957b3bd2-cce3-425d-bba9-5cd876ca3d62","role":"authenticated"}', true);
  begin
    select count(*) into n from (select user_id, handle, occupation_code, lga_code, state_code, home_area_id from public.social_profiles) s;
  exception when others then
    raise exception 'PROBE_FAIL ux-24: member read of directory columns failed: % %', sqlstate, sqlerrm;
  end;

  raise exception 'PROBE_OK ux-24';
end
$$;
