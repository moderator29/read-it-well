/*
 * R-SH4. A LISTING PUBLISHES ITS LISTER'S BADGE TIER, AND STILL NO USER ID.
 *
 * Session B asked for the tier beside `listing_lister`'s name so a listing card
 * and an agent card can draw `TierBadge`. They offered two shapes: a third
 * column on `listing_lister`, or a separate view.
 *
 * IT IS A SEPARATE VIEW, and the reason is written on `listing_lister` itself:
 * "Adding a third column to this view is a decision about privacy and not a
 * convenience", and the things it names as never passing through include a
 * verification tier. A separate view keeps that promise intact and makes this
 * exposure its own decision with its own grants, which is what it is.
 *
 * NO USER ID, DELIBERATELY. `listing_lister` refuses to publish one and so does
 * this. The two joined on `listing_id` must not become a map from a listing to
 * a person, and a tier plus a name is already the most a stranger needs.
 *
 * AGENT LISTINGS ONLY, and this is a judgement rather than an omission:
 *   owner  names nobody by design, so it badges nobody.
 *   firm   names the FIRM. A person badge beside an organisation's name says
 *          the firm is verified when what was checked is its owner. Businesses
 *          carry their own `verification_tier`, and that is the right source if
 *          a firm badge is ever wanted.
 *
 * GRANTS WIDEN NOTHING. `public.person_badge` already holds SELECT for anon and
 * authenticated, and this publishes strictly less about the same people.
 *
 * security_invoker is OFF for the same reason it is off on `listing_lister`:
 * `public.agents` is correctly RLS-bound away from strangers, so an invoker
 * view would join to nothing and publish nothing, for ever, quietly.
 */

create or replace view public.listing_lister_tier
with (security_invoker = false, security_barrier = true) as
select l.id as listing_id,
       pb.tier
  from public.listings l
  join public.agents a  on a.id = l.agent_id
  join public.person_badge pb on pb.user_id = a.user_id
 where l.status = 'PUBLISHED'
   and l.listing_role = 'agent'::public.listing_role;

comment on view public.listing_lister_tier is
  'R-SH4. The lister badge tier for a published listing, so a card can draw TierBadge beside the name that listing_lister already publishes. TWO COLUMNS AND NO USER ID: listing_lister refuses to publish a user id and so does this, because the pair of them joined on listing_id would otherwise map a listing to a person. AGENT LISTINGS ONLY, on purpose. An owner listing names nobody by design so it badges nobody; a firm listing names the FIRM, and a person badge beside an organisation name would say the firm is verified when what was checked is its owner. Businesses carry their own verification_tier and that is the right source if a firm badge is ever wanted.';

revoke all on public.listing_lister_tier from public;
revoke all on public.listing_lister_tier from anon;
revoke all on public.listing_lister_tier from authenticated;

grant select on public.listing_lister_tier to anon;
grant select on public.listing_lister_tier to authenticated;

do $readback$
declare
  bad   text := '';
  cols  text;
  wrong text;
  n     integer;
begin
  select string_agg(attname, ',' order by attnum) into cols
    from pg_attribute
   where attrelid = 'public.listing_lister_tier'::regclass and attnum > 0 and not attisdropped;
  if cols is distinct from 'listing_id,tier' then
    bad := bad || ' [exposes ' || coalesce(cols, 'nothing') || ', not exactly listing_id,tier]';
  end if;

  if not has_table_privilege('anon', 'public.listing_lister_tier', 'select') then
    bad := bad || ' [anon cannot select the view it exists for]';
  end if;

  select string_agg(a.grantee::regrole::text || ':' || a.privilege_type, ' ')
    into wrong
    from aclexplode((select relacl from pg_class where oid = 'public.listing_lister_tier'::regclass)) a
   where a.grantee in ('anon'::regrole, 'authenticated'::regrole)
     and a.privilege_type <> 'SELECT';
  if wrong is not null then
    bad := bad || ' [a reader role holds more than SELECT: ' || wrong || ']';
  end if;

  if coalesce((select array_to_string(reloptions, ' ') from pg_class
                where oid = 'public.listing_lister_tier'::regclass), '') ilike '%security_invoker=true%' then
    bad := bad || ' [security_invoker is on, so the view will publish nothing]';
  end if;

  select count(*) into n
    from public.listing_lister_tier v join public.listings l on l.id = v.listing_id
   where l.status <> 'PUBLISHED';
  if n > 0 then
    bad := bad || ' [' || n || ' rows are for listings that are not published]';
  end if;

  select count(*) into n
    from public.listing_lister_tier v join public.listings l on l.id = v.listing_id
   where l.listing_role <> 'agent'::public.listing_role;
  if n > 0 then
    bad := bad || ' [' || n || ' rows badge an owner or a firm listing]';
  end if;

  if bad <> '' then
    raise exception 'READ-BACK FAILED:%', bad;
  end if;

  raise notice 'READ-BACK OK: listing_lister_tier exposes exactly listing_id and tier, anon and authenticated hold SELECT and nothing wider, security_invoker is off, published agent listings only.';
end $readback$;

/*
 * PROVED AS THE ROLE THAT MATTERS, AND THE MCP ROLE COULD NOT HAVE ANSWERED IT.
 *
 * `person_badge` calls `is_platform_staff`, and the read-only MCP role holds no
 * EXECUTE on it, so a plain `select` from this view fails for that role and
 * would read as a broken view. `anon` and `authenticated` DO hold EXECUTE on
 * all three badge functions, checked in `pg_proc.proacl`, which is the rule 21
 * exception working as intended. Two probes through `apply_migration`, both
 * ending in a deliberate raise so nothing committed:
 *
 *   PROBE ALL PASS listing_lister_tier: anon_tier=0 anon_lister=64
 *   anon_control=64 auth_tier=0 extra_columns=0 (all rolled back)
 *
 *   PROBE badge reach: person_badge=2 agents_with_a_badge=0
 *   published_agent_listings=64 roles[agent=64] (all rolled back)
 *
 * THE VIEW PUBLISHES ZERO ROWS TODAY AND THAT IS CORRECT, NOT BROKEN. Two
 * people hold a badge and both are admins; no AGENT holds one. All 64 published
 * listings belong to the example collection. So there is nothing to badge yet,
 * and the day a real agent is verified the cards light up with no further work.
 * Session B should mount it knowing the empty state is the honest one.
 */
