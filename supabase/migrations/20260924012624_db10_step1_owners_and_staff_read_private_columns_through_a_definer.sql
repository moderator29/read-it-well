-- DB-10 STEP 1 of 2 (additive; before the release). A signed-in member is
-- not entitled to every published listing's street address, landmark and
-- moderator note, or every business's contact, registration and tax
-- details: sign-up is free, so "signed in" is effectively "public".
--
-- Step 1 adds the owners' and staff's door to those columns: two SECURITY
-- DEFINER functions that return them only for the caller's own listings
-- (as lister, or active member of the listing's firm) and own businesses,
-- or for anything when the caller is staff. The release reads the private
-- columns through them. Step 2 (after the release is deployed) withdraws
-- the columns from `authenticated`.

create or replace function public.listing_private_fields(p_ids uuid[])
returns table (id uuid, address text, landmark text, review_notes text, reviewer_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  -- One screen's worth of ids per call; the caller sends larger sets in chunks.
  if cardinality(p_ids) > 500 then
    raise exception 'listing_private_fields takes at most 500 ids' using errcode = '22023';
  end if;
  return query
  select l.id, l.address, l.landmark, l.review_notes, l.reviewer_id
    from public.listings l
   where l.id = any (p_ids)
     and (private.listing_agent_is_me(l.agent_id)
          or private.firm_member_is_me(l.firm_id)
          or private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
end
$$;

create or replace function public.business_private_fields(p_ids uuid[])
returns table (
  id uuid, address text, phone text, email text, cac_number text, registered_name text, tin text,
  representative_name text, representative_phone text, consents jsonb, review_notes text,
  reviewer_id uuid, verification_tier smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if cardinality(p_ids) > 500 then
    raise exception 'business_private_fields takes at most 500 ids' using errcode = '22023';
  end if;
  return query
  select b.id, b.address, b.phone, b.email, b.cac_number, b.registered_name, b.tin,
         b.representative_name, b.representative_phone, b.consents, b.review_notes,
         b.reviewer_id, b.verification_tier
    from public.businesses b
   where b.id = any (p_ids)
     and (b.owner_id = (select auth.uid())
          or private.has_role((select auth.uid()), 'admin'::public.app_role)
          or private.has_role((select auth.uid()), 'super_admin'::public.app_role));
end
$$;

revoke all on function public.listing_private_fields(uuid[]), public.business_private_fields(uuid[])
  from public, anon;
grant execute on function public.listing_private_fields(uuid[]), public.business_private_fields(uuid[])
  to authenticated, service_role;

notify pgrst, 'reload schema';
