/*
 * The cold start, answered the way docs/SOCIAL_DESIGN.md section 3 says to
 * answer it: the platform is a participant.
 *
 * A place that opens with nothing in it is a dead room, and a dead room is the
 * fastest way to kill a social product. Seeding invented people is forbidden by
 * the owner's rule 13 and would deserve to be. So the first two entries in
 * every place are written by the platform, in the platform's own voice, with
 * `author_kind = 'SYSTEM'` and no author at all. They are ordinary rows in
 * `posts`: likeable, replyable, reportable, and rendered by the card the layer
 * already has for them. Nothing about them is special cased.
 *
 * Both sentences are TRUE and both are TIMELESS. That second property is the
 * one that is easy to get wrong: a post carries a timestamp for ever, so
 * "nobody has said anything here yet" or "six stays are listed here" would be
 * a lie within a week. The only number either entry carries is the count of
 * local governments in the state, which comes from `public.local_governments`
 * and does not move.
 *
 * The trigger fires on the two ways a place can become live: created ACTIVE,
 * which is what `public.enter_place` does when somebody walks through a door
 * for the first time, and moved to ACTIVE by an administrator approving a
 * suggestion. It is idempotent on both paths, so a place that is paused and
 * reopened does not collect a second set.
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
begin
  if p_area.status <> 'ACTIVE' then return; end if;

  /* Exactly once per place, ever. A pause and a reopen is not a new place. */
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

    opening :=
      p_area.name || ' is open. It is one of ' || coalesce(st_name, p_area.state_code)
      || ' State''s ' || lga_n || ' local governments, and the useful thing to say here is '
      || 'the thing you would tell a friend moving in: what the road is like when it rains, '
      || 'which streets have light, and what a one bedroom really costs.';
  else
    opening :=
      p_area.name || ' is open, in ' || p_area.city || '. The useful thing to say here is '
      || 'the thing you would tell a friend moving in: what the road is like when it rains, '
      || 'which streets have light, and what a one bedroom really costs.';
  end if;

  /* The money rule, which is the one sentence that is true in every place on
     this platform and is worth more than any other to somebody about to lose
     a deposit. Written second so it carries the earlier timestamp and the
     opening entry sits above it in a feed ordered newest first. */
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

comment on function private.open_place_entries(public.areas) is
  'Writes the two SYSTEM entries a place opens with. Idempotent per place.';

create or replace function private.open_place_entries_trg()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if tg_op = 'INSERT' then
    perform private.open_place_entries(new);
  elsif old.status is distinct from new.status then
    perform private.open_place_entries(new);
  end if;
  return null;
end;
$$;

drop trigger if exists areas_open_entries_insert on public.areas;
create trigger areas_open_entries_insert
  after insert on public.areas
  for each row execute function private.open_place_entries_trg();

/*
 * `update of status` rather than a bare `after update`, so the counter bump on
 * `areas.post_count` that the post insert itself causes cannot re-enter this.
 */
drop trigger if exists areas_open_entries_status on public.areas;
create trigger areas_open_entries_status
  after update of status on public.areas
  for each row execute function private.open_place_entries_trg();

/* The places that were already open before this existed. */
do $$
declare a public.areas;
begin
  for a in select * from public.areas where status = 'ACTIVE' loop
    perform private.open_place_entries(a);
  end loop;
end;
$$;
