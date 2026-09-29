-- V-03, THE PROOF STRIP: THE TWO DATES, AND NOT THE PERSON WHO SET THEM.
--
-- `listings.ownership_verified_at` and `listings.mandate_verified_at` are the
-- two dated facts about a property that a member of staff sets by hand (Track
-- G migration 3). They are the "Authority" line of the proof strip:
--
--   "Title document seen in the lister's name, 14 Aug 2026"
--   "Owner's instruction seen and owner spoken to, 14 Aug 2026"
--
-- `public.listings` is granted to `anon` COLUMN BY COLUMN (see
-- 20260923103430_track_g_7), and a missing column privilege fails the WHOLE
-- select rather than the column. So the moment `LISTING_SELECT` names either
-- date, every signed-out read of the catalogue raises 42501 unless `anon`
-- holds it. `authenticated` already holds the table and needs nothing here.
--
-- WHY A DATE IS SAFE TO PUBLISH AND THE COLUMN BESIDE IT IS NOT. A date says
-- that a check happened and when. It is not personal data about the principal:
-- it names nobody, carries no document and no phone number, and the mandate
-- row that does hold the principal's name and number (`listing_mandates`)
-- stays locked exactly as it is. `supply_verified_by` NAMES THE MEMBER OF
-- STAFF who made the decision, and a stranger has no business with that, so it
-- stays dark. So does `firm_id`, an internal key. The read-back below asserts
-- both are still refused, so this file cannot widen by accident.
--
-- THE SIGN-IN WALL (23 September) means a signed-out visitor cannot open a
-- listing today anyway. This grant is not a reopening: it keeps the one public
-- read path that still exists (share cards, the sitemap's own reader, and any
-- future door the founder opens) from failing outright on two columns the card
-- now selects.
--
-- ADDITIVE. Two column grants. Nothing is created, altered, dropped or revoked.

grant select (ownership_verified_at, mandate_verified_at) on public.listings to anon;

do $readback$
declare
  bad text := '';
  col text;
begin
  foreach col in array array['ownership_verified_at','mandate_verified_at'] loop
    if not has_column_privilege('anon','public.listings',col,'select') then
      bad := bad || ' [anon still cannot read listings.' || col || ']';
    end if;
    if not has_column_privilege('authenticated','public.listings',col,'select') then
      bad := bad || ' [authenticated cannot read listings.' || col || ']';
    end if;
  end loop;

  /* The person who decided, and the internal key, stay dark. */
  foreach col in array array['supply_verified_by','firm_id','address','landmark','reviewer_id','verified_by'] loop
    if has_column_privilege('anon','public.listings',col,'select') then
      bad := bad || ' [this file exposed listings.' || col || ' to anon]';
    end if;
  end loop;

  /* A column grant must not have become a table grant. */
  if has_table_privilege('anon','public.listings','select') then
    bad := bad || ' [anon now holds a TABLE-WIDE select on listings]';
  end if;

  if bad <> '' then
    raise exception 'READ-BACK FAILED:%', bad;
  end if;
end;
$readback$;
