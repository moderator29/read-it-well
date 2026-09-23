-- P-S1. CAN A SHARE ARTEFACT CARRY AN ADDRESS, AND CAN A STRANGER READ A CARD?
--
-- Run through `mcp__Supabase__apply_migration` against the live project. It
-- ENDS IN A DELIBERATE `raise exception`, so the whole transaction rolls back
-- and nothing reaches a live product table. `execute_sql` cannot run it: that
-- door is `supabase_read_only_user`, which holds no EXECUTE on
-- `create_price_check_share` and could not mint the card the probe reads back.
--
-- WHY IT EXISTS. The share rule is absolute - no share artefact ever carries a
-- specific address, for anybody, including the person who typed it - and it is
-- enforced three ways in the schema rather than by anybody remembering it. A
-- button is the first thing that could put a hole in those three walls, so the
-- walls are read back from outside before the button is believed. And the
-- fourth assertion is the opposite failure: a wall so high that the card
-- cannot be read either, which is what a policy with no grant actually is.
--
-- WHAT IT ASSERTS, in the order it asserts it:
--   1. `price_check_share_scope` has exactly two labels and neither is a
--      property, so a property-scoped card is unrepresentable.
--   2. `price_check_shares` has no `address`, `latitude`, `longitude`,
--      `lat`, `lng` or `listing_id` column, so there is nowhere to put one.
--   3. `create_price_check_share` has no parameter for any of the six, so the
--      one door that writes this table cannot be handed one.
--   4. A card minted through that door is READABLE BY `anon`, which is a
--      stranger following a link, and comes back with its figures intact.
--   5. `created_by` is NOT readable by `anon`. A card says what the area is
--      asking; it never says who asked.
--   6. `anon` cannot INSERT, UPDATE or DELETE a share.
--   7. The address guard refuses a street address in the area field, and
--      still accepts a real Nigerian neighbourhood name.
do $probe$
declare
  v_id uuid;
  v_area text; v_low bigint; v_high bigint; v_count integer; v_beds integer;
  v_err text;
  found_col text;
  labels text;
  args text;
  out text := '';
begin
  /* 1. THE ENUM. */
  select string_agg(e.enumlabel, ',' order by e.enumsortorder) into labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid
   where t.typname = 'price_check_share_scope';
  if labels <> 'area,area_and_type' then
    raise exception 'WALL 1 MOVED: price_check_share_scope is now (%)', labels;
  end if;
  out := out || E'\n 1 enum: (' || labels || ') - no value for a property';

  /* 2. THE COLUMNS THAT ARE NOT THERE. */
  select string_agg(column_name, ',') into found_col
    from information_schema.columns
   where table_schema = 'public' and table_name = 'price_check_shares'
     and column_name in ('address','latitude','longitude','lat','lng','listing_id');
  if found_col is not null then
    raise exception 'WALL 2 BREACHED: price_check_shares now carries (%)', found_col;
  end if;
  out := out || E'\n 2 columns: no address, latitude, longitude, lat, lng or listing_id';

  /* 3. THE DOOR THAT CANNOT BE HANDED ONE. */
  select pg_get_function_identity_arguments(p.oid) into args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'create_price_check_share';
  if args ~* '(p_address|p_lat|p_lng|p_latitude|p_longitude|p_listing_id)' then
    raise exception 'WALL 3 BREACHED: create_price_check_share takes (%)', args;
  end if;
  out := out || E'\n 3 writer: no address, point or listing parameter';

  /* 4. A STRANGER CAN READ A CARD. */
  v_id := public.create_price_check_share(
    'area_and_type', 'LA', null, 'Lekki Phase 1', 'apartment', 'rent', 3,
    750000000, 820000000, 900000000, 9,
    now() - interval '200 days', now() - interval '20 days', null);

  set local role anon;

  select area, low_minor, high_minor, listing_count, bedrooms
    into v_area, v_low, v_high, v_count, v_beds
    from public.price_check_shares where id = v_id;
  if v_area is null or v_low is null then
    raise exception 'THE CARD CANNOT BE READ BY A STRANGER: the grant is missing again';
  end if;
  out := out || format(E'\n 4 anon read: %s, %s bed, %s to %s kobo, from %s listings',
                       v_area, v_beds, v_low, v_high, v_count);

  /* 5. AND LEARNS NOTHING ABOUT WHO MADE IT. */
  begin
    perform created_by from public.price_check_shares where id = v_id;
    raise exception 'created_by IS READABLE BY anon: a card would name whoever made it';
  exception when insufficient_privilege then
    out := out || E'\n 5 anon created_by: refused, so a card never names who made it';
  end;

  /* 6. AND CAN DO NOTHING ELSE. */
  begin
    insert into public.price_check_shares
      (scope, state_code, listing_intent, low_minor, mid_minor, high_minor, listing_count)
      values ('area', 'LA', 'rent', 1, 1, 1, 3);
    raise exception 'anon CAN INSERT A SHARE: the browser can mint its own card';
  exception when insufficient_privilege then
    out := out || E'\n 6a anon insert: refused';
  end;
  begin
    delete from public.price_check_shares where id = v_id;
    raise exception 'anon CAN DELETE A SHARE';
  exception when insufficient_privilege then
    out := out || E'\n 6b anon delete: refused';
  end;
  begin
    update public.price_check_shares set low_minor = 1 where id = v_id;
    raise exception 'anon CAN UPDATE A SHARE';
  exception when insufficient_privilege then
    out := out || E'\n 6c anon update: refused';
  end;

  reset role;

  /* 7. THE ADDRESS GUARD, BOTH WAYS. */
  begin
    perform public.create_price_check_share(
      'area', 'LA', null, '14 Admiralty Way', null, 'rent', null,
      1, 1, 1, 3, null, null, null);
    raise exception 'WALL 4 BREACHED: "14 Admiralty Way" was accepted as an area';
  exception when check_violation then
    out := out || E'\n 7a "14 Admiralty Way": refused by the address guard';
  end;
  begin
    perform public.create_price_check_share(
      'area', 'LA', null, 'Victoria Island', null, 'rent', null,
      1, 1, 1, 3, null, null, null);
    out := out || E'\n 7b "Victoria Island": accepted, so the guard has not eaten real neighbourhoods';
  exception when check_violation then
    raise exception 'THE GUARD IS TOO WIDE: it refused the neighbourhood "Victoria Island"';
  end;

  raise exception E'PROBE PASSED, ROLLING BACK.%', out;
end
$probe$;
