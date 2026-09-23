-- PUBLIC.BUSINESSES: WHAT `anon` MAY READ, COLUMN BY COLUMN, PROVED AS THE ROLE.
--
-- WHY IT EXISTS. Ledger section 68. `public.businesses` handed `anon` a
-- TABLE-WIDE select (`pg_class.relacl` read `anon=arwdDxtm/postgres`) and its
-- only read policy is `status = 'PUBLISHED'`, so an anonymous caller could read
-- every column of every published business: `cac_number`, `tin`,
-- `representative_name`, `representative_phone`, `email`, `phone`, `address`,
-- `review_notes`, `reviewer_id`, `consents`, `registered_name` and
-- `verification_tier`. Nothing was leaking on 23 September because all seven
-- published rows were null in those columns, counted rather than assumed. The
-- exposure was the day a real firm registered through the Track G firm door.
--
-- AND WHY IT IS DANGEROUS TO FIX. A MISSING COLUMN PRIVILEGE FAILS THE WHOLE
-- SELECT, not just that column. That is the second half of the eleven hour
-- outage of 23 September (ledger section 67): `listings` gained `listing_role`
-- without its anon column grant and the signed-out catalogue read would have
-- died on the one new column. So this probe does not only prove the refusals.
-- IT RUNS THE PRODUCT'S OWN SELECT LISTS AS CONTROLS IN THE SAME TRANSACTION,
-- and a column of refusals with no control beside it is not evidence, it is a
-- table nobody can read any more.
--
-- HOW TO RUN. Through `mcp__Supabase__apply_migration` on project
-- `uccixoonmbhrnyczyigt`. It ends in a deliberate `raise exception` either way,
-- so it rolls back and writes nothing. `mcp__Supabase__execute_sql` CANNOT do
-- this job: it runs as a role with `rolbypassrls` and with privileges of its
-- own, so it answers every question of this kind with a success.
--
-- WHAT IT ASSERTS.
--   1. `anon` is REFUSED on each of the twelve withheld columns, one statement
--      per column, so one column cannot hide behind another.
--   2. `anon` SUCCEEDS on the four select lists the product actually issues
--      anonymously. These are the controls.
--   3. `authenticated` SUCCEEDS on the admin console's own column list, which
--      is every withheld column at once. `authenticated` keeps the table-wide
--      grant on purpose: `businesses_owner_all` and `businesses_admin_all` are
--      permissive policies over the same table, an owner reads its own RC
--      number and its own representative through them and a reviewer reads
--      `review_notes`, and a column privilege cannot be made row-conditional.
--      Narrowing `authenticated` would strand the host workspace and the KYC
--      desk, which is the same fault in the other direction.
--
-- RUN BEFORE THE NARROWING and it fails naming every column `anon` could still
-- read, which is the exposure stated as evidence. Run after and it passes.
--
-- LAST RUN: 2026-09-23, live project, after migration 20260923113850, with
-- this file's own text and not a variant of it:
--   PROBE ALL PASS businesses-columns: 12 of 12 withheld columns refused to
--   anon, 5 of 5 control select lists succeeded (4 as anon, 1 as authenticated
--   over every withheld column at once). Rolled back on purpose.
--
-- The run immediately BEFORE migration 20260923113850, same file, same
-- project, is the exposure stated as evidence:
--   0 of 12 withheld columns refused to anon, 5 of 5 controls succeeded.
--   [anon STILL READS address] [phone] [email] [cac_number] [registered_name]
--   [tin] [representative_name] [representative_phone] [consents]
--   [reviewer_id] [review_notes] [verification_tier]

do $probe$
declare
  col text;
  sel text;
  refused integer := 0;
  expected integer := 0;
  controls_ok integer := 0;
  controls_total integer := 0;
  bad text := '';
  n bigint;

  -- THE TWELVE `anon` MUST NOT READ. Personal data, a document or tax number,
  -- a firm's legal registration identity, or an internal reviewer's note.
  withheld text[] := array[
    'address', 'phone', 'email',
    'cac_number', 'registered_name', 'tin',
    'representative_name', 'representative_phone', 'consents',
    'reviewer_id', 'review_notes', 'verification_tier'
  ];

  -- THE CONTROLS. Every select list the product issues against `businesses`
  -- through a client that may be anonymous, copied from the source.
  --   1 `lib/stays/queries.ts` getStayDetail, the business behind a stay
  --   2 `lib/stays/queries.ts` listRestaurants, the restaurant shelf
  --   3 `lib/stays/queries.ts` getRestaurantDetail, the restaurant page
  --   4 the bare existence read every embed and count reduces to
  anon_lists text[] := array[
    'id, name, slug, kind, source, is_demo',
    'id, name, slug, area, city, state_code, source, is_demo, latitude, longitude',
    'id, name, slug, kind, status, description, area, city, state_code, latitude, longitude, source, is_demo, verified, published_at, host_type, hygiene_attested_at, licence_attested_at',
    'id, status'
  ];

  -- `authenticated` KEEPS EVERYTHING, and this is the list that proves it:
  -- `BUSINESS_COLUMNS` from `lib/admin/business-queries.ts`, unedited.
  auth_list text :=
    'id, name, slug, kind, status, host_type, city, area, state_code, address, phone, email, cac_number, registered_name, tin, representative_name, representative_phone, consents, hygiene_attested_at, licence_attested_at, owner_id, verification_tier, verified, submitted_at, reviewed_at, review_notes, created_at';
begin
  ---------------------------------------------------------------- as `anon`
  set local role anon;

  -- The harness control FIRST. If this fails the run says nothing about
  -- grants, because a column of refusals and an unreachable table look alike.
  begin
    execute 'select count(*) from public.businesses' into n;
  exception when others then
    reset role;
    raise exception 'PROBE HARNESS BROKEN: anon cannot reach public.businesses at all (%), so every refusal below would be meaningless.', sqlerrm;
  end;

  foreach col in array withheld loop
    expected := expected + 1;
    begin
      execute format('select count(%I) from public.businesses', col) into n;
      bad := bad || ' [anon STILL READS ' || col || ']';
    exception when insufficient_privilege then
      refused := refused + 1;
    end;
  end loop;

  foreach sel in array anon_lists loop
    controls_total := controls_total + 1;
    begin
      execute format('select count(*) from (select %s from public.businesses) s', sel) into n;
      controls_ok := controls_ok + 1;
    exception when others then
      bad := bad || ' [CONTROL STRANDED as anon: (' || sel || ') -> ' || sqlerrm || ']';
    end;
  end loop;

  ------------------------------------------------------- as `authenticated`
  set local role authenticated;
  controls_total := controls_total + 1;
  begin
    execute format('select count(*) from (select %s from public.businesses) s', auth_list) into n;
    controls_ok := controls_ok + 1;
  exception when others then
    bad := bad || ' [CONTROL STRANDED as authenticated: the admin console column list -> ' || sqlerrm || ']';
  end;

  reset role;

  if controls_ok < controls_total then
    raise exception 'PROBE FAILED businesses-columns: % of % control select lists were STRANDED, which is the 23 September outage on another table.%', controls_total - controls_ok, controls_total, bad;
  end if;
  if refused < expected then
    raise exception 'PROBE FAILED businesses-columns: % of % withheld columns are still readable by anon.%', expected - refused, expected, bad;
  end if;
  raise exception 'PROBE ALL PASS businesses-columns: % of % withheld columns refused to anon, % of % control select lists succeeded (4 as anon, 1 as authenticated over every withheld column at once). A missing column privilege fails the whole select, so the controls are the half that matters. Rolled back on purpose.', refused, expected, controls_ok, controls_total;
end;
$probe$;
