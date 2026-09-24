-- OPS-11: the keyset walk equals the single read in both catalogue orders (with ties and a
-- null published_at), the per-amenity embeds equal the counted set, and review stats are
-- grouped in SQL under the caller's RLS. Everything is rolled back by the final raise.
do $$
declare
  tmpl public.listings%rowtype;
  n int;
  whole uuid[];
  walked uuid[];
  page uuid[];
  wanted uuid[];
  first boolean;
  cf boolean;
  cp timestamptz;
  cc timestamptz;
  ci uuid;
  ct bigint;
begin
  -- Ties the live catalogue may not have yet: three listings published at the
  -- same instant (created_at is now(), one value per transaction), one with no
  -- published_at, so the cursor has to break ties on id and place nulls last.
  select * into tmpl from public.listings where status = 'PUBLISHED' and listing_intent = 'rent' order by created_at limit 1;
  for n in 1..4 loop
    insert into public.listings (agent_id, title, description, property_type, listing_intent, state_code, city, area,
                                 bedrooms, bathrooms, rent_amount_minor, rent_period, status, featured, published_at)
    values (tmpl.agent_id, 'Probe OPS-11 ' || n, 'Probe', tmpl.property_type, 'rent', tmpl.state_code, tmpl.city, tmpl.area,
            tmpl.bedrooms, tmpl.bathrooms, tmpl.rent_amount_minor, tmpl.rent_period, 'PUBLISHED', false,
            case when n = 4 then null else tmpl.published_at end);
  end loop;
  if (select count(*) from public.listings where title like 'Probe OPS-11 %' and published_at is null) <> 1 then
    raise exception 'PROBE_FAIL ops-11: the null published_at fixture did not stay null';
  end if;

  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  -- 1. Default order: featured, published_at (nulls last), created_at, id, all
  --    descending. Walk it four at a time with the predicate
  --    lib/listings/keyset.ts sends, and compare with the one-read order.
  select array_agg(id order by featured desc, published_at desc nulls last, created_at desc, id desc)
    into whole from public.listings where status = 'PUBLISHED';
  walked := '{}';
  first := true;
  loop
    select array_agg(s.id order by s.featured desc, s.published_at desc nulls last, s.created_at desc, s.id desc)
      into page
      from (
        select l.id, l.featured, l.published_at, l.created_at
          from public.listings l
         where l.status = 'PUBLISHED'
           and (first or
                (cf and not l.featured) or
                (l.featured = cf and (
                  case when cp is not null then
                    l.published_at < cp or l.published_at is null or
                    (l.published_at = cp and (l.created_at < cc or (l.created_at = cc and l.id < ci)))
                  else
                    l.published_at is null and (l.created_at < cc or (l.created_at = cc and l.id < ci))
                  end)))
         order by l.featured desc, l.published_at desc nulls last, l.created_at desc, l.id desc
         limit 4
      ) s;
    exit when page is null;
    walked := walked || page;
    select l.featured, l.published_at, l.created_at, l.id into cf, cp, cc, ci
      from public.listings l where l.id = page[array_length(page, 1)];
    first := false;
  end loop;
  if walked is distinct from whole then
    raise exception 'PROBE_FAIL ops-11: the default-order walk (% rows) differs from the single read (% rows)',
      coalesce(array_length(walked, 1), 0), coalesce(array_length(whole, 1), 0);
  end if;

  -- 2. Move-in order: total_move_in_cost_minor ascending, nulls last, then the
  --    default order as the tiebreak.
  select array_agg(id order by total_move_in_cost_minor asc nulls last, featured desc,
                   published_at desc nulls last, created_at desc, id desc)
    into whole from public.listings where status = 'PUBLISHED';
  walked := '{}';
  first := true;
  loop
    select array_agg(s.id order by s.total_move_in_cost_minor asc nulls last, s.featured desc,
                     s.published_at desc nulls last, s.created_at desc, s.id desc)
      into page
      from (
        select l.id, l.featured, l.published_at, l.created_at, l.total_move_in_cost_minor
          from public.listings l
         where l.status = 'PUBLISHED'
           and (first or (
             case when ct is not null then
               l.total_move_in_cost_minor > ct or l.total_move_in_cost_minor is null or
               (l.total_move_in_cost_minor = ct and ((cf and not l.featured) or (l.featured = cf and (
                  case when cp is not null then
                    l.published_at < cp or l.published_at is null or
                    (l.published_at = cp and (l.created_at < cc or (l.created_at = cc and l.id < ci)))
                  else
                    l.published_at is null and (l.created_at < cc or (l.created_at = cc and l.id < ci))
                  end))))
             else
               l.total_move_in_cost_minor is null and ((cf and not l.featured) or (l.featured = cf and (
                  case when cp is not null then
                    l.published_at < cp or l.published_at is null or
                    (l.published_at = cp and (l.created_at < cc or (l.created_at = cc and l.id < ci)))
                  else
                    l.published_at is null and (l.created_at < cc or (l.created_at = cc and l.id < ci))
                  end)))
             end))
         order by l.total_move_in_cost_minor asc nulls last, l.featured desc,
                  l.published_at desc nulls last, l.created_at desc, l.id desc
         limit 4
      ) s;
    exit when page is null;
    walked := walked || page;
    select l.total_move_in_cost_minor, l.featured, l.published_at, l.created_at, l.id into ct, cf, cp, cc, ci
      from public.listings l where l.id = page[array_length(page, 1)];
    first := false;
  end loop;
  if walked is distinct from whole then
    raise exception 'PROBE_FAIL ops-11: the move-in walk (% rows) differs from the single read (% rows)',
      coalesce(array_length(walked, 1), 0), coalesce(array_length(whole, 1), 0);
  end if;

  -- 3. The amenity filter as the page sends it (one inner embed per amenity:
  --    the row must carry each) is the "has every one" set, counted in SQL.
  select array_agg(a.id order by a.id) into wanted
    from (select la.amenity_id as id from public.listing_amenities la
            join public.listings l on l.id = la.listing_id and l.status = 'PUBLISHED'
           group by la.amenity_id order by count(*) desc limit 2) a;
  if coalesce(array_length(wanted, 1), 0) = 2 then
    select array_agg(l.id order by l.id) into page from public.listings l
     where l.status = 'PUBLISHED'
       and exists (select 1 from public.listing_amenities x where x.listing_id = l.id and x.amenity_id = wanted[1])
       and exists (select 1 from public.listing_amenities x where x.listing_id = l.id and x.amenity_id = wanted[2]);
    select array_agg(g.listing_id order by g.listing_id) into whole from (
      select la.listing_id from public.listing_amenities la join public.listings l on l.id = la.listing_id
       where l.status = 'PUBLISHED' and la.amenity_id = any (wanted)
       group by la.listing_id having count(distinct la.amenity_id) = 2) g;
    if page is distinct from whole then
      raise exception 'PROBE_FAIL ops-11: the per-amenity embeds and the counted set disagree';
    end if;
  end if;

  -- 4. Review stats: callable as a stranger, grouped under the caller's RLS,
  --    and in agreement with the trigger-kept catalogue_entries counts.
  select count(*) into n from public.listing_review_stats(
    (select array_agg(id) from public.listings where status = 'PUBLISHED'));
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if n <> (select count(*) from public.catalogue_entries ce
            where ce.entity_kind = 'listing' and ce.status = 'PUBLISHED' and ce.rating_count > 0) then
    raise exception 'PROBE_FAIL ops-11: review stats disagree with catalogue_entries (% listings rated)', n;
  end if;
  if (select prosecdef from pg_proc where oid = 'public.listing_review_stats(uuid[])'::regprocedure) then
    raise exception 'PROBE_FAIL ops-11: listing_review_stats must run as the caller';
  end if;
  if (select count(*) from public.listing_review_stats(array_fill(gen_random_uuid(), array[1001]))) <> 0 then
    raise exception 'PROBE_FAIL ops-11: more than 1000 ids were accepted';
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'listings_catalogue_keyset_idx')
     or not exists (select 1 from pg_indexes where indexname = 'listings_move_in_keyset_idx') then
    raise exception 'PROBE_FAIL ops-11: a keyset index is missing';
  end if;

  raise exception 'PROBE_OK ops-11';
end $$;
