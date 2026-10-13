-- RT02 (pending migration rt02_remove_v100_renter_passport.sql, after pass01
-- and after the deploy): the V-100 renter passport is gone, the Vallo
-- passport settings that replaced it are there and still closed to anon, and
-- the functions that stay (record_vnin_check, shares_identity_with) are
-- still there. The control reads the caller's own passport_settings row as a
-- member, which must work. Read only; the final raise rolls everything back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  n integer;
begin
  if to_regclass('public.passport_settings') is null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 0: public.passport_settings is missing (pass01 not applied)';
  end if;

  -- CONTROL: a member can read their own Vallo passport settings.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  execute 'select count(*) from public.passport_settings where user_id = $1' into n using member;
  if n is null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport control: passport_settings did not answer a member';
  end if;
  reset role;

  -- 1. The V-100 functions are gone.
  if to_regprocedure('public.share_renter_passport(uuid, boolean)') is not null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 1: share_renter_passport is still present';
  end if;
  if to_regprocedure('public.passport_shared_here(uuid)') is not null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 1: passport_shared_here is still present';
  end if;
  if to_regprocedure('public.renter_passport_for_thread(uuid)') is not null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 1: renter_passport_for_thread is still present';
  end if;
  if to_regprocedure('public.set_renter_passport(boolean)') is not null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 1: set_renter_passport is still present';
  end if;
  if to_regprocedure('public.my_renter_passport()') is not null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 1: my_renter_passport is still present';
  end if;
  if to_regprocedure('private.passport_facts(uuid)') is not null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 1: private.passport_facts is still present';
  end if;

  -- 2. The V-100 tables are gone.
  if to_regclass('public.passport_shares') is not null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 2: public.passport_shares is still present';
  end if;
  if to_regclass('public.renter_passports') is not null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 2: public.renter_passports is still present';
  end if;

  -- 3. What stays is still there, and the new settings stay closed to anon.
  if to_regprocedure('public.record_vnin_check(uuid, text, text, text, boolean, text)') is null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 3: public.record_vnin_check is missing';
  end if;
  if to_regprocedure('private.shares_identity_with(uuid, uuid)') is null then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 3: private.shares_identity_with is missing';
  end if;
  if has_table_privilege('anon', 'public.passport_settings', 'select') then
    raise exception 'PROBE_FAIL rt02-remove-v100-renter-passport 3: anon can read passport_settings';
  end if;

  raise exception 'PROBE_OK rt02-remove-v100-renter-passport';
end
$$;
