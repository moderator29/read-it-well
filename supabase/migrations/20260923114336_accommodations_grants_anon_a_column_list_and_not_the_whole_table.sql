-- THE SECOND TABLE WITH THE `businesses` SHAPE, found by the block 2 sweep.
--
-- `businesses` was found by accident, so every table in `public` was swept
-- from `pg_class.relacl` and `pg_attribute.attacl` for the same shape: a
-- table-wide SELECT held by `anon` over a table whose read policy is broad
-- rather than bound to `auth.uid()`, carrying personal or internal columns.
-- Seventeen tables hold personal data and a grant to `anon` or
-- `authenticated`. SIXTEEN OF THEM ARE CLOSED BY RLS, because every read
-- policy on them tests `auth.uid()` or a staff role and `auth.uid()` is null
-- for `anon`, so the wide grant reaches no row. Those are written up with a
-- verdict each in `docs/security/GRANT_STATE.md` and NOT revoked, because a
-- revoke of something with no demonstrated reach is the mistake in the other
-- direction.
--
-- `public.accommodations` is the exception. `accommodations_select_published`
-- is `status = 'PUBLISHED'` and applies to PUBLIC, exactly like
-- `businesses_select_published`, and the row carries `address` (the exact
-- street address of a property), `reviewer_id` and `review_notes` (who
-- moderated it and what they wrote). `public.listings` withholds all three
-- from `anon` and always has. This is that same narrowing.
--
-- PROVED BEFORE THIS LANDED, as `anon`, through `apply_migration` with
-- `set local role` in a transaction ending in a deliberate raise:
--   PROBE BEFORE accommodations-columns: 0 of 3 withheld columns refused to
--   anon, 4 of 4 controls succeeded.
--
-- A MISSING COLUMN PRIVILEGE FAILS THE WHOLE SELECT. The one anonymous read of
-- this table, `getStayDetail` in `lib/stays/queries.ts`, asked for `select("*")`
-- and was narrowed and shipped FIRST, so the deployed product had already
-- stopped asking. `authenticated` keeps the table-wide grant for the same
-- reason it does on `businesses`: `accommodations_owner_all` and
-- `accommodations_admin_all` are permissive policies over the same table, the
-- host workspace reads its own address and the desk reads its own notes
-- through them, and a column privilege cannot be made row-conditional.

revoke select on public.accommodations from anon;

grant select (
  id,
  business_id,
  name,
  slug,
  description,
  source,
  fulfilment,
  star_rating,
  check_in_from,
  check_out_by,
  house_rules,
  cancellation_policy_id,
  status,
  state_code,
  city,
  area,
  latitude,
  longitude,
  location,
  featured,
  is_demo,
  submitted_at,
  reviewed_at,
  published_at,
  created_at,
  updated_at
) on public.accommodations to anon;

do $readback$
declare
  withheld text[] := array['address', 'reviewer_id', 'review_notes'];
  granted text[] := array[
    'id','business_id','name','slug','description','source','fulfilment',
    'star_rating','check_in_from','check_out_by','house_rules',
    'cancellation_policy_id','status','state_code','city','area','latitude',
    'longitude','location','featured','is_demo','submitted_at','reviewed_at',
    'published_at','created_at','updated_at'
  ];
  col text; bad text := ''; total integer := 0;
begin
  select count(*) into total
    from pg_attribute a
   where a.attrelid = 'public.accommodations'::regclass and a.attnum > 0 and not a.attisdropped;
  if total <> array_length(withheld,1) + array_length(granted,1) then
    raise exception 'READ BACK FAILED: public.accommodations has % columns and this migration accounts for %.',
      total, array_length(withheld,1) + array_length(granted,1);
  end if;
  if has_table_privilege('anon', 'public.accommodations', 'select') then
    raise exception 'READ BACK FAILED: anon still holds a TABLE-WIDE select on public.accommodations.';
  end if;
  foreach col in array withheld loop
    if has_column_privilege('anon','public.accommodations',col,'select') then
      bad := bad || ' [anon can still read ' || col || ']';
    end if;
    if not has_column_privilege('authenticated','public.accommodations',col,'select') then
      bad := bad || ' [authenticated LOST ' || col || ', which strands the host workspace and the desk]';
    end if;
  end loop;
  foreach col in array granted loop
    if not has_column_privilege('anon','public.accommodations',col,'select') then
      bad := bad || ' [anon LOST ' || col || ', which it is meant to keep]';
    end if;
    if not has_column_privilege('authenticated','public.accommodations',col,'select') then
      bad := bad || ' [authenticated LOST ' || col || ']';
    end if;
  end loop;
  if bad <> '' then
    raise exception 'READ BACK FAILED on public.accommodations:%', bad;
  end if;
end;
$readback$;
