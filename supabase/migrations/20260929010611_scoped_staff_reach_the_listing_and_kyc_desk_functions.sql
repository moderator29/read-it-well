-- Scoped staff can use the listing desk's evidence and decisions, and the
-- KYC desk's credential form, that their scope already puts in front of them.
--
-- A member holding the listing_approval scope (public.staff_grants) reaches
-- /admin/listings and decides listings, but every function behind the rest of
-- that desk checked the ADMIN role only, so for them the duplicate-photo panel
-- (V-45) read as failed and principal consent, property matching, reopening
-- and mandate decisions were refused. The same held for record_credential on
-- the KYC desk (kyc_review). Each function's single gate is changed from
-- "admin or super admin" (private.is_staff(), or the two has_role calls) to
-- private.staff_can(<caller>, '<scope>'), which is true for an admin or super
-- admin exactly as before, and for a staff member only while their grant is
-- live, holds that scope and the current handbook is acknowledged.
--
-- Nothing else in any body changes. Each body is the live definition
-- (pg_get_functiondef at apply time) with that one gate replaced; the block
-- refuses to continue unless it found exactly one gate. CREATE OR REPLACE
-- keeps every grant. A caller with no auth.uid() (the service role) is
-- refused as before, since staff_can(null, ...) is false.

do $$
declare
  f record;
  def text;
  changed text;
begin
  for f in
    select * from (values
      ('public.listing_photo_matches(uuid)', 'listing_approval'),
      ('public.listing_photo_hash_coverage(uuid)', 'listing_approval'),
      ('public.record_principal_consent(uuid,text,text,text)', 'listing_approval'),
      ('public.property_join(uuid,uuid)', 'listing_approval'),
      ('public.property_keep_apart(uuid,uuid)', 'listing_approval'),
      ('public.property_split(uuid)', 'listing_approval'),
      ('public.reopen_listing(uuid,text)', 'listing_approval'),
      ('public.decide_listing_mandate(uuid,text,text,text,text,text,text)', 'listing_approval'),
      ('public.record_credential(uuid,text,text,text,text,text)', 'kyc_review')
    ) as v(sig, scope)
  loop
    def := pg_get_functiondef(f.sig::regprocedure);
    if (select count(*) from regexp_matches(def, 'private\.is_staff\(\)', 'g'))
       + (select count(*) from regexp_matches(def, '\(private\.has_role\(([^,]+), ''admin''::public\.app_role\)\s+or private\.has_role\(\1, ''super_admin''::public\.app_role\)\)', 'g')) <> 1 then
      raise exception 'staff scopes: % does not have exactly one admin gate', f.sig;
    end if;
    changed := regexp_replace(def, 'private\.is_staff\(\)',
                              'private.staff_can((select auth.uid()), ''' || f.scope || ''')');
    changed := regexp_replace(changed,
                              '\(private\.has_role\(([^,]+), ''admin''::public\.app_role\)\s+or private\.has_role\(\1, ''super_admin''::public\.app_role\)\)',
                              'private.staff_can(\1, ''' || f.scope || ''')');
    execute changed;
  end loop;
end;
$$;

-- Read back: every function now gates on its scope and no longer on the admin role alone.
do $$
declare
  f record;
  def text;
begin
  for f in
    select * from (values
      ('public.listing_photo_matches(uuid)', 'listing_approval'),
      ('public.listing_photo_hash_coverage(uuid)', 'listing_approval'),
      ('public.record_principal_consent(uuid,text,text,text)', 'listing_approval'),
      ('public.property_join(uuid,uuid)', 'listing_approval'),
      ('public.property_keep_apart(uuid,uuid)', 'listing_approval'),
      ('public.property_split(uuid)', 'listing_approval'),
      ('public.reopen_listing(uuid,text)', 'listing_approval'),
      ('public.decide_listing_mandate(uuid,text,text,text,text,text,text)', 'listing_approval'),
      ('public.record_credential(uuid,text,text,text,text,text)', 'kyc_review')
    ) as v(sig, scope)
  loop
    def := pg_get_functiondef(f.sig::regprocedure);
    if position('private.staff_can(' in def) = 0 or position('''' || f.scope || '''' in def) = 0 then
      raise exception 'staff scopes: % does not gate on %', f.sig, f.scope;
    end if;
    if position('private.is_staff()' in def) > 0
       or def ~ 'private\.has_role\([^,]+, ''super_admin''::public\.app_role\)\)\s+then' then
      raise exception 'staff scopes: % still carries the admin-only gate', f.sig;
    end if;
    if not (select p.prosecdef from pg_proc p where p.oid = f.sig::regprocedure) then
      raise exception 'staff scopes: % is no longer security definer', f.sig;
    end if;
  end loop;
end;
$$;
