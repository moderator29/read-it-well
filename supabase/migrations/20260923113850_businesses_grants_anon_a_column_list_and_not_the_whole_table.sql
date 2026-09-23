-- LEDGER SECTION 68. `public.businesses` handed `anon` a TABLE-WIDE select.
--
-- `pg_class.relacl` read `anon=arwdDxtm/postgres` and the only read policy on
-- the table is `businesses_select_published`, which is `status = 'PUBLISHED'`.
-- So an anonymous caller could read EVERY COLUMN of every published business:
-- `cac_number`, `tin`, `representative_name`, `representative_phone`, `email`,
-- `phone`, `address`, `review_notes`, `reviewer_id`, `consents`,
-- `registered_name` and `verification_tier`.
--
-- Nothing was leaking on 23 September. All seven published rows were null in
-- every one of those columns, counted rather than assumed. The exposure was
-- the day a real firm registered through the Track G firm door, at which
-- moment its RC number, its TIN and its representative's telephone number
-- became world readable.
--
-- `public.listings` on this same estate has always shown the correct pattern:
-- granted to `anon` COLUMN BY COLUMN with `address`, `landmark`, `reviewer_id`,
-- `review_notes`, `verified_by`, `firm_id` and the fee columns left out. This
-- is the same narrowing on the same principle.
--
-- WHY THIS IS THE DANGEROUS KIND OF FIX, AND WHAT WAS DONE ABOUT IT.
-- A MISSING COLUMN PRIVILEGE FAILS THE WHOLE SELECT, not just that column.
-- That is precisely how the entire public catalogue was refused to everybody
-- for eleven and a half hours on 23 September (ledger section 67): `listings`
-- gained `listing_role` without its anon grant and the signed-out read would
-- have died on the one new column. So before this migration was written every
-- read of `businesses` in the tree was enumerated, by role, including PostgREST
-- embeds through a foreign key. Two anonymous reads asked for withheld
-- columns: `getStayDetail` selected `phone, email` (drawn on no screen) and
-- `getRestaurantDetail` selected `*`. BOTH WERE NARROWED AND SHIPPED FIRST, in
-- commit 14a92247, so the deployed product had already stopped asking for them
-- when this landed.
--
-- `authenticated` KEEPS THE TABLE-WIDE GRANT, AND THAT IS DELIBERATE.
-- `businesses_owner_all` and `businesses_admin_all` are permissive policies on
-- the same table. An owner reads its own RC number and its own representative
-- through the first; the KYC desk reads `review_notes` and `reviewer_id`
-- through the second; both run as `authenticated`. A column privilege cannot
-- be made row-conditional, so narrowing `authenticated` would strand the host
-- workspace and the admin console, which is the same fault in the other
-- direction. The residual fact, recorded rather than hidden, is that any
-- signed-in account can read a published firm's personal columns. Closing that
-- needs a view or a redacting function and it is a product decision, not a
-- grant. It is written up in `docs/security/GRANT_STATE.md`.
--
-- THE WRITE BITS ARE NOT TOUCHED. `anon` keeps `awdDxtm` on this table, which
-- is Supabase's own default grant on `public`. Every write is gated by the two
-- policies above, both of which test `owner_id = auth.uid()` or a staff role,
-- and `auth.uid()` is null for `anon`, so no row is ever writable by it. A
-- revoke there would be a change to something nobody has shown is reachable.

revoke select on public.businesses from anon;

-- THE TWENTY FIVE. Everything that is not personal data, not a document or tax
-- number, not a firm's legal registration identity and not an internal
-- reviewer's note. `owner_id` and `agent_id` are here for the same reason
-- `listings.agent_id` is: they are the join keys a PostgREST embed needs, and
-- they are pseudonymous identifiers rather than personal data.
grant select (
  id,
  owner_id,
  agent_id,
  kind,
  name,
  slug,
  description,
  source,
  status,
  state_code,
  city,
  area,
  latitude,
  longitude,
  location,
  is_demo,
  submitted_at,
  reviewed_at,
  published_at,
  created_at,
  updated_at,
  host_type,
  hygiene_attested_at,
  licence_attested_at,
  verified
) on public.businesses to anon;

-- READ BACK INSIDE THE MIGRATION, from `pg_attribute.attacl` through
-- `has_column_privilege`, never `information_schema` (whose privilege views
-- answer about the observer rather than about the object). This migration
-- fails and rolls itself back if the estate is not what it says it is.
do $readback$
declare
  withheld text[] := array[
    'address', 'phone', 'email',
    'cac_number', 'registered_name', 'tin',
    'representative_name', 'representative_phone', 'consents',
    'reviewer_id', 'review_notes', 'verification_tier'
  ];
  granted text[] := array[
    'id', 'owner_id', 'agent_id', 'kind', 'name', 'slug', 'description',
    'source', 'status', 'state_code', 'city', 'area', 'latitude', 'longitude',
    'location', 'is_demo', 'submitted_at', 'reviewed_at', 'published_at',
    'created_at', 'updated_at', 'host_type', 'hygiene_attested_at',
    'licence_attested_at', 'verified'
  ];
  col text;
  bad text := '';
  total integer := 0;
begin
  select count(*) into total
    from pg_attribute a
   where a.attrelid = 'public.businesses'::regclass and a.attnum > 0 and not a.attisdropped;
  if total <> array_length(withheld, 1) + array_length(granted, 1) then
    raise exception 'READ BACK FAILED: public.businesses has % columns, and this migration accounts for %. A column was added or dropped and nobody said which side it belongs on.',
      total, array_length(withheld, 1) + array_length(granted, 1);
  end if;

  if has_table_privilege('anon', 'public.businesses', 'select') then
    raise exception 'READ BACK FAILED: anon still holds a TABLE-WIDE select on public.businesses.';
  end if;

  foreach col in array withheld loop
    if has_column_privilege('anon', 'public.businesses', col, 'select') then
      bad := bad || ' [anon can still read ' || col || ']';
    end if;
  end loop;

  -- THE CONTROL, and it is the half that matters. A column of refusals with
  -- nothing succeeding beside it is a table nobody can read any more.
  foreach col in array granted loop
    if not has_column_privilege('anon', 'public.businesses', col, 'select') then
      bad := bad || ' [anon LOST ' || col || ', which it is meant to keep]';
    end if;
    if not has_column_privilege('authenticated', 'public.businesses', col, 'select') then
      bad := bad || ' [authenticated LOST ' || col || ']';
    end if;
  end loop;

  foreach col in array withheld loop
    if not has_column_privilege('authenticated', 'public.businesses', col, 'select') then
      bad := bad || ' [authenticated LOST ' || col || ', which strands the owner workspace and the KYC desk]';
    end if;
  end loop;

  if bad <> '' then
    raise exception 'READ BACK FAILED on public.businesses:%', bad;
  end if;
end;
$readback$;
