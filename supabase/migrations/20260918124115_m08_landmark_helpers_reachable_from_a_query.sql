-- The M8 probe, run as anon, failed with "permission denied for schema
-- private" on the alias search. RLS policy expressions are stored resolved,
-- so a policy may call private.* for anon; a QUERY typed by anon may not name
-- the schema at all, because anon has no USAGE on it (live nspacl:
-- postgres=UC, authenticated=U). A pure text join used in an index and in the
-- search that uses that index therefore belongs in public, where it is not an
-- API risk: no data, no side effects, invoker security.
--
-- The alias index is rebuilt on the public helper. private.join_text_array
-- was created minutes earlier by M8, has no other dependant, and goes.
--
-- And the resolver the search actually needs: given what a person typed,
-- the best landmark by trigram over name and aliases, optionally scoped to a
-- state. Invoker security, so RLS decides visibility (landmarks are public).
-- `operator(extensions.%)` because search_path is pinned empty.

create or replace function public.join_text_array(items text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array_to_string(items, ' ');
$$;

comment on function public.join_text_array(text[]) is
  'Immutable join of a text array with spaces, so an array can sit under a trigram index and be searched with the same expression.';

drop index if exists public.landmarks_aliases_trgm_idx;
create index landmarks_aliases_trgm_idx
  on public.landmarks using gin ((public.join_text_array(aliases)) extensions.gin_trgm_ops);

drop function if exists private.join_text_array(text[]);

create or replace function public.landmarks_resolve(
  p_term  text,
  p_state text default null,
  p_limit integer default 5
)
returns table (
  id         uuid,
  name       text,
  slug       text,
  kind       public.landmark_kind,
  state_code text,
  city       text,
  latitude   double precision,
  longitude  double precision,
  score      real
)
language sql
stable
set search_path = ''
as $$
  select
    l.id, l.name, l.slug, l.kind, l.state_code, l.city, l.latitude, l.longitude,
    greatest(
      extensions.similarity(l.name, p_term),
      extensions.similarity(public.join_text_array(l.aliases), p_term)
    ) as score
  from public.landmarks l
  where length(btrim(coalesce(p_term, ''))) >= 2
    and (p_state is null or l.state_code = p_state)
    and (
      l.name operator(extensions.%) p_term
      or public.join_text_array(l.aliases) operator(extensions.%) p_term
      or l.name ilike '%' || p_term || '%'
      or exists (select 1 from unnest(l.aliases) a where a ilike p_term)
    )
  order by score desc, l.name
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

comment on function public.landmarks_resolve(text, text, integer) is
  'The best landmarks for what a person typed: trigram over name and aliases, plus a plain substring match so short names like VI still resolve. Not security definer; landmarks are world-readable anyway.';

grant execute on function public.landmarks_resolve(text, text, integer) to anon, authenticated, service_role;
