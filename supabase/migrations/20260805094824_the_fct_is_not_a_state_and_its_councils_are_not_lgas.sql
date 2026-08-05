/*
 * "FCT (Abuja) State's 6 local governments" is two errors in one clause. The
 * Federal Capital Territory is not a state, and the six things inside it are
 * Area Councils, which is what Abuja calls them and what anybody in Kuje would
 * say. Nigeria's own phrase is "36 states and the Federal Capital Territory",
 * and the product's copy already uses it, so the entry has to as well.
 *
 * The rest of the function is unchanged.
 */

create or replace function private.open_place_entries(p_area public.areas)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  st_name  text;
  lga_n    integer;
  opening  text;
  place_of text;
begin
  if p_area.status <> 'ACTIVE' then return; end if;

  if exists (
    select 1 from public.posts
     where area_id = p_area.id
       and author_kind = 'SYSTEM'
       and parent_id is null
  ) then
    return;
  end if;

  select s.name into st_name from public.states s where s.code = p_area.state_code;

  if p_area.lga_code is not null then
    select count(*) into lga_n
      from public.local_governments l
     where l.state_code = p_area.state_code;

    if p_area.state_code = 'FC' then
      place_of := 'one of the Federal Capital Territory''s ' || lga_n || ' area councils';
    else
      place_of := 'one of ' || coalesce(st_name, p_area.state_code) || ' State''s '
                  || lga_n || ' local governments';
    end if;

    opening :=
      p_area.name || ' is open. It is ' || place_of
      || ', and the useful thing to say here is the thing you would tell a friend moving in: '
      || 'what the road is like when it rains, which streets have light, and what a one '
      || 'bedroom really costs.';
  else
    opening :=
      p_area.name || ' is open, in ' || p_area.city || '. The useful thing to say here is '
      || 'the thing you would tell a friend moving in: what the road is like when it rains, '
      || 'which streets have light, and what a one bedroom really costs.';
  end if;

  insert into public.posts (area_id, author_kind, kind, body, status, created_at)
  values (
    p_area.id,
    'SYSTEM',
    'SYSTEM',
    'Never send money for a place you have not stood inside. Message the agent, '
      || 'arrange the inspection, see it, and pay after that. RentMe takes no fee at any '
      || 'point, so anybody asking you to pay to view is not us. If a message asks you for '
      || 'an account number, report it and a person will read it.',
    'LIVE',
    now() - interval '1 second'
  );

  insert into public.posts (area_id, author_kind, kind, body, status, created_at)
  values (p_area.id, 'SYSTEM', 'SYSTEM', opening, 'LIVE', now());
end;
$$;
