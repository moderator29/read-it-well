-- DB-01 / DB-02: an owner cannot publish, verify, feature or stamp their own
-- business, listing, property or room.
--
-- The owner policies (businesses_owner_all, listings_owner_all,
-- accommodations_owner_all, room_types_write) are FOR ALL and the API roles
-- hold table-wide INSERT and UPDATE, so without this the owner writes every
-- moderator column. Column grants cannot close it: staff decide as
-- `authenticated` through their own client (requireAdmin), so a grant revoke
-- would stop every admin decision too (SEC-P2-03). This guard asks who the
-- caller is instead.
--
-- Who passes untouched:
--   * any role other than the two API roles (postgres, service_role, and every
--     SECURITY DEFINER function or trigger, which runs as its owner). This is
--     why the function itself is SECURITY INVOKER: a definer would always see
--     its owner in current_user.
--   * an API caller holding admin or super_admin (private.has_role).
--
-- Everybody else (the owner writing through their own client):
--   INSERT  status must be DRAFT or SUBMITTED; every moderator-owned column is
--           reset to its unreviewed value; firm_id is refused (no owner path
--           creates a firm listing, and a firm is attached by staff).
--   UPDATE  a moderator-owned column that changes is refused 42501. status may
--           stay, move to DRAFT (unpublish, close, withdraw) from anything but
--           SUSPENDED, or move DRAFT / MORE_INFO_REQUIRED / REJECTED to
--           SUBMITTED. submitted_at is stamped by the guard on submit and is
--           otherwise left as it was.
--           Content changes only while the row is still the owner's to edit:
--           a listing or business in DRAFT / MORE_INFO_REQUIRED / REJECTED,
--           and a property or room whose BUSINESS is in one of those. On
--           anything further along (submitted, approved, live) the only
--           change an owner may make is taking it back to DRAFT; the app
--           says the same ("Return it to a draft to change it"). Properties
--           and rooms follow their business rather than their own status
--           because closing a business leaves its rooms PUBLISHED while the
--           host edits them again as a draft.
--   DELETE  a listing or business only while DRAFT; a property or room only
--           while it is DRAFT or its business is editable.
--
-- rate_plans, restaurant_profiles and service_windows carry no status or
-- moderator column: what they show the public follows their parent's status,
-- which this guard now holds. They need no guard of their own.

create or replace function private.guard_owner_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  editable constant text[] := array['DRAFT', 'MORE_INFO_REQUIRED', 'REJECTED'];
  bookkeeping constant text[] := array['status', 'updated_at', 'submitted_at'];
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

  if not row_editable and (new_row - bookkeeping) is distinct from (old_row - bookkeeping) then
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
$$;

revoke all on function private.guard_owner_write() from public, anon, authenticated;

-- Named with 00 so each fires before every other BEFORE trigger on its table
-- (they fire in name order): the badge, reference and role triggers then
-- derive from the values this guard has already settled.
create trigger businesses_00_guard_owner_write
  before insert or update or delete on public.businesses
  for each row execute function private.guard_owner_write();
create trigger listings_00_guard_owner_write
  before insert or update or delete on public.listings
  for each row execute function private.guard_owner_write();
create trigger accommodations_00_guard_owner_write
  before insert or update or delete on public.accommodations
  for each row execute function private.guard_owner_write();
create trigger room_types_00_guard_owner_write
  before insert or update or delete on public.room_types
  for each row execute function private.guard_owner_write();
