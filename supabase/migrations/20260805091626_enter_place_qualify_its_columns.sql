-- `enter_place` declares an OUT parameter called `name`, and `public.states` has
-- a column called `name`, so `select name from public.states` was ambiguous and
-- the function failed on its FIRST REAL CALL with 42702. The DDL applied green,
-- which is the same shape of trap this project has hit twice before with enum
-- casts: a plpgsql body is only parsed properly when it runs.
--
-- Every table column it reads is aliased now. This file carries the whole
-- function rather than a patch, because a function is replaced, not amended.

create or replace function public.enter_place(p_lga_code text)
returns table (
  id     uuid,
  slug   text,
  name   text,
  status public.area_status
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $fn$
declare
  lga      public.local_governments;
  st_name  text;
  new_slug text;
  found    public.areas;
begin
  select l.* into lga from public.local_governments l where l.code = p_lga_code;
  if lga.code is null then
    raise exception 'That local government does not exist.' using errcode = 'RM030';
  end if;

  select a.* into found from public.areas a where a.lga_code = lga.code;

  if found.id is not null then
    /* A place somebody paused or removed is not reopened by walking into it.
       That decision belongs to a moderator, and the surface says so. */
    return query select found.id, found.slug, found.name, found.status;
    return;
  end if;

  select s.name into st_name from public.states s where s.code = lga.state_code;

  /* `la_eti_osa` becomes `eti-osa-lagos`: readable, stable, and already the
     shape the five seeded slugs use. */
  new_slug := lower(regexp_replace(lga.name, '[^A-Za-z0-9]+', '-', 'g'))
              || '-' || lower(regexp_replace(coalesce(st_name, lga.state_code), '[^A-Za-z0-9]+', '-', 'g'));
  new_slug := regexp_replace(new_slug, '(^-+|-+$)', '', 'g');
  new_slug := regexp_replace(new_slug, '-+', '-', 'g');

  insert into public.areas (slug, kind, name, state_code, city, area, lga_code, status, opened_at, blurb)
  values (
    new_slug, 'AREA', lga.name, lga.state_code, lga.name, lga.name, lga.code, 'ACTIVE', now(),
    'Everything happening in ' || lga.name || ', ' || coalesce(st_name, lga.state_code) || '.'
  )
  on conflict (lga_code) where lga_code is not null do nothing;

  select a.* into found from public.areas a where a.lga_code = lga.code;

  /* The slug could still collide with a curated place of the same name in
     another state, in which case the insert above did nothing and there is no
     row. Say so rather than returning an empty result the caller has to guess
     about. */
  if found.id is null then
    raise exception 'That place could not be opened.' using errcode = 'RM031';
  end if;

  return query select found.id, found.slug, found.name, found.status;
end;
$fn$;

comment on function public.enter_place(text) is
  'Opens the place for one local government, creating it ACTIVE on first entry. Security definer on purpose: a local government is administrative fact, not a proposal somebody has to approve, so it does not go through areas_insert_proposal. It can only ever create a place that public.local_governments already names.';

revoke execute on function public.enter_place(text) from public, anon;
grant  execute on function public.enter_place(text) to authenticated;
