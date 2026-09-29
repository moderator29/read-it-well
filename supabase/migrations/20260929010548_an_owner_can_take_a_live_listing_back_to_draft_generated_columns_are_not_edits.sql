-- Found 29 September 2026 by database probe new-a4-01, the first probe run
-- since CI stopped starting jobs on 23 September.
--
-- A PRODUCT REGRESSION: an owner could not take their own live listing back
-- to a draft. `v68_serviced_defined` (28 September) added the GENERATED
-- column listings.is_serviced. Inside a BEFORE trigger a generated column in
-- NEW is still null while OLD holds its value, and guard_owner_write compares
-- the whole row minus a hand-kept `bookkeeping` list that did not name the new
-- column. So every owner update of a listing past review read as a content
-- change and was refused ("this listing has been through review; take it back
-- to a draft to change it"), the unpublish included.
--
-- Fixed at the cause, not by adding one more name: every generated column of
-- the guarded table is read from the catalogue and left out of the
-- comparison. That is safe because PostgreSQL refuses a direct write to a
-- generated column, and the columns it is derived from are still compared.
-- Everything else in the function is unchanged.
CREATE OR REPLACE FUNCTION private.guard_owner_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  uid uuid := auth.uid();
  editable constant text[] := array['DRAFT', 'MORE_INFO_REQUIRED', 'REJECTED'];
  bookkeeping constant text[] := array['status', 'updated_at', 'submitted_at', 'latitude_public', 'longitude_public', 'location_public'];
  generated text[];
  protected text[];
  reset_on_insert jsonb;
  col text;
  old_status text;
  new_status text;
  parent_status text;
  row_editable boolean;
  new_row jsonb;
  old_row jsonb;
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;
  if uid is not null
     and (private.has_role(uid, 'admin'::public.app_role)
          or private.has_role(uid, 'super_admin'::public.app_role)) then
    return coalesce(new, old);
  end if;

  case tg_table_name
    when 'businesses' then
      protected := array['verification_tier', 'verified', 'source', 'is_demo',
        'reviewed_at', 'reviewer_id', 'review_notes', 'published_at',
        'owner_id', 'agent_id'];
      reset_on_insert := jsonb_build_object(
        'verification_tier', 0, 'verified', false, 'source', 'first_party',
        'is_demo', false, 'reviewed_at', null, 'reviewer_id', null,
        'review_notes', null, 'published_at', null, 'agent_id', null);
    when 'listings' then
      protected := array['featured', 'published_at', 'reviewed_at', 'reviewer_id',
        'review_notes', 'address_verified_at', 'physically_inspected_at',
        'ownership_verified_at', 'mandate_verified_at', 'verified_by',
        'supply_verified_by', 'listing_fee_minor', 'listing_fee_rate_id',
        'listing_fee_charged_at', 'is_demo', 'demo_retire_after', 'reference',
        'listing_role', 'firm_id', 'agent_id'];
      -- listing_role goes back to null so listings_fill_listing_role derives
      -- it from the lister's declared supply role.
      reset_on_insert := jsonb_build_object(
        'featured', false, 'published_at', null, 'reviewed_at', null,
        'reviewer_id', null, 'review_notes', null, 'address_verified_at', null,
        'physically_inspected_at', null, 'ownership_verified_at', null,
        'mandate_verified_at', null, 'verified_by', null,
        'supply_verified_by', null, 'listing_fee_minor', null,
        'listing_fee_rate_id', null, 'listing_fee_charged_at', null,
        'is_demo', false, 'demo_retire_after', null, 'reference', null,
        'listing_role', null);
    when 'accommodations' then
      -- source and is_demo are copied from the business by
      -- accommodations_sync_from_business, which fires after this guard.
      protected := array['featured', 'is_demo', 'source', 'reviewed_at',
        'reviewer_id', 'review_notes', 'published_at', 'business_id'];
      reset_on_insert := jsonb_build_object(
        'featured', false, 'reviewed_at', null, 'reviewer_id', null,
        'review_notes', null, 'published_at', null);
    when 'room_types' then
      -- is_demo is copied from the accommodation by
      -- room_types_sync_from_accommodation, which fires after this guard.
      protected := array['is_demo', 'accommodation_id'];
      reset_on_insert := '{}'::jsonb;
    else
      raise exception 'guard_owner_write is not configured for %', tg_table_name;
  end case;

  if tg_op = 'INSERT' then
    new_row := to_jsonb(new);
    new_status := new_row ->> 'status';
    if new_status not in ('DRAFT', 'SUBMITTED') then
      raise exception '% may only be created as a draft or a submission', tg_table_name
        using errcode = '42501';
    end if;
    if tg_table_name = 'listings' and new_row ->> 'firm_id' is not null then
      raise exception 'a listing is attached to a firm by Vallo staff'
        using errcode = '42501';
    end if;
    -- jsonb_populate_record ignores keys the table does not have, so the
    -- submitted_at stamp is harmless on room_types.
    new := jsonb_populate_record(new, reset_on_insert || jsonb_build_object(
      'submitted_at', case when new_status = 'SUBMITTED' then to_jsonb(now()) else 'null'::jsonb end));
    return new;
  end if;

  old_row := to_jsonb(old);
  old_status := old_row ->> 'status';

  -- Whether the owner may still change this row's content (and delete it).
  if tg_table_name in ('listings', 'businesses') then
    row_editable := old_status = any (editable);
  else
    if tg_table_name = 'accommodations' then
      select b.status::text into parent_status
        from public.businesses b where b.id = (old_row ->> 'business_id')::uuid;
    else
      select b.status::text into parent_status
        from public.accommodations a join public.businesses b on b.id = a.business_id
       where a.id = (old_row ->> 'accommodation_id')::uuid;
    end if;
    row_editable := coalesce(parent_status = any (editable), false);
  end if;

  if tg_op = 'DELETE' then
    if old_status = 'DRAFT' and tg_table_name in ('listings', 'businesses') then
      return old;
    end if;
    if tg_table_name in ('accommodations', 'room_types') and (old_status = 'DRAFT' or row_editable) then
      return old;
    end if;
    raise exception 'take this % back to a draft before deleting it', tg_table_name
      using errcode = '42501';
  end if;

  new_row := to_jsonb(new);
  new_status := new_row ->> 'status';

  foreach col in array protected loop
    if (new_row -> col) is distinct from (old_row -> col) then
      raise exception '%.% is set by Vallo staff, not by the owner', tg_table_name, col
        using errcode = '42501';
    end if;
  end loop;

  -- Generated columns are null in NEW inside a BEFORE trigger and cannot be
  -- written directly, so they are never an owner's change.
  select coalesce(array_agg(a.attname::text), '{}'::text[]) into generated
    from pg_catalog.pg_attribute a
   where a.attrelid = tg_relid and a.attnum > 0 and not a.attisdropped and a.attgenerated <> '';

  if not row_editable
     and (new_row - bookkeeping - generated) is distinct from (old_row - bookkeeping - generated) then
    raise exception 'this % has been through review; take it back to a draft to change it', tg_table_name
      using errcode = '42501';
  end if;

  if new_status is distinct from old_status then
    if old_status = 'SUSPENDED' then
      raise exception 'a suspended % is released by Vallo staff', tg_table_name
        using errcode = '42501';
    elsif new_status = 'DRAFT' then
      null;
    elsif new_status = 'SUBMITTED' and old_status = any (editable) then
      null;
    else
      raise exception 'an owner cannot move % from % to %', tg_table_name, old_status, new_status
        using errcode = '42501';
    end if;
  end if;

  new := jsonb_populate_record(new, jsonb_build_object('submitted_at',
    case when new_status = 'SUBMITTED' and old_status is distinct from 'SUBMITTED'
         then to_jsonb(now())
         else old_row -> 'submitted_at' end));
  return new;
end;
$function$;
