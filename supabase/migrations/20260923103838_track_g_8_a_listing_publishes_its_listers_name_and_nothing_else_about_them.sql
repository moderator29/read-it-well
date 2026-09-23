-- TRACK G 8: THE AGENT AND FIRM SENTENCES DRAW NOTHING, BECAUSE THE PUBLIC
-- READ CARRIES NO NAME. ONE PUBLISHED COLUMN FIXES IT.
--
-- ---------------------------------------------------------------------------
-- WHAT IS SHORT
--
-- `LISTING_ROLE_SENTENCE` holds three sentences and two of them name somebody:
--
--   owner  "Listed by the owner"           needs no name, and renders today
--   agent  "Listed by {name}, agent"
--   firm   "Listed by {name}"
--
-- `fillLister` refuses to print a template with `{name}` still showing, which
-- is right, so those two draw NOTHING. And `public.agents` is RLS-bound to the
-- agent themselves and to staff (`agents_select_own`, `agents_select_admin`,
-- and nothing else), which is also right: a stranger has no path from
-- `listings.agent_id` to a display name and must not be given the table.
--
-- ALL 64 LIVE LISTINGS ARE `listing_role = 'agent'`. So on today's data the
-- label appears on zero screens. The half of Track G that was reported closed
-- is the half that nobody can see.
--
-- ---------------------------------------------------------------------------
-- A VIEW, NOT A SECURITY DEFINER FUNCTION, AND HERE IS WHY
--
-- Both would work. The view wins on four counts and the choice is recorded so
-- the next person does not reopen it:
--
--   1. WHAT THE DOOR EXPOSES IS READABLE FROM THE CATALOGUE. A view's columns
--      are rows in `pg_attribute` and its grants are `pg_class.relacl`, so
--      "what does this hand out, and to whom" is answerable by anybody with a
--      catalogue query, for ever. A SECURITY DEFINER function's exposure is
--      whatever its BODY happens to return, and no catalogue query tells you
--      that. An auditor should not have to read a function body to find out
--      what a door gives away.
--   2. NO ARGUMENT SURFACE. An RPC taking `uuid[]` is a call anybody can fuzz
--      and a length I would then have to bound. A view has no arguments.
--   3. THE READ SHAPE DOES NOT CHANGE. PostgREST reads a view like a table, so
--      `supabase-repository.ts` keeps its one batched `.in(...)` call beside
--      `getAgentBadges`, with no RPC and no per-listing round trip.
--   4. IT IS THE PRECEDENT ALREADY IN THAT FILE. `agent_badges` is exactly
--      this: one derived fact about an agent, published, read by the catalogue
--      as a stranger, next to which this now sits.
--
-- RULE 21 HAS AN EXACT TWIN HERE AND IT IS HANDLED THE SAME WAY. There is no
-- EXECUTE to leak, but `pg_default_acl` on this project grants `arwdDxtm` on
-- every NEW RELATION in `public` to `anon` and `authenticated`, which is to say
-- a view is BORN with INSERT, UPDATE and DELETE handed to anonymous callers,
-- and a non-invoker view writes as its OWNER. So: revoke all from `public`,
-- `anon` and `authenticated` in THIS file, grant back only SELECT, and read it
-- back INSIDE this file.
--
-- ---------------------------------------------------------------------------
-- THE GRANT TO `anon` IS DELIBERATE, AND THIS IS THE ARGUMENT FOR IT
--
-- A stranger reading a public listing IS anonymous. There is no other role for
-- them to be, and the sentence is for them more than for anybody. So `anon`
-- gets SELECT on this view, on purpose, named here, and the read-back asserts
-- that NOTHING WIDER than SELECT was granted to either role.
--
-- ---------------------------------------------------------------------------
-- EVERY COLUMN THIS DOOR EXPOSES, AND THE JUSTIFICATION FOR EACH
--
--   `listing_id`   The listing's own id. It is already `listings.id`, already
--                  granted to `anon`, and already the URL of the page the
--                  reader is standing on. It is the join key and nothing else.
--
--   `lister_name`  The display name of whoever put this listing up: the
--                  agent's `display_name` for `agent`, the firm's `name` for
--                  `firm`, and NULL for `owner`, because "Listed by the owner"
--                  names nobody by design and the offer is that there is no
--                  intermediary. A display name is what a listing already
--                  implies: somebody is offering this property and a reader
--                  has to be able to say who. It is the same name that already
--                  appears in a message thread with them.
--
-- AND EVERYTHING THIS DOOR DOES NOT EXPOSE, said explicitly because the
-- read-back below asserts it. NOT the phone number, the email address, the
-- postal address, the NIN or any document number, the `user_id`, the
-- `agent_id`, the `verification_tier`, the `verified` boolean, the agent's
-- `status`, `type`, `role` or `firm_id`, the firm's RC number, TIN,
-- `representative_name` or `representative_phone`. Two columns leave this view
-- and the read-back fails if a third ever does.
--
-- AND IT IS BOUNDED BY PUBLICATION. `where l.status = 'PUBLISHED'`, so the
-- door opens exactly as wide as the listing itself and not one row wider. A
-- draft, a submitted listing and a rejected one publish no name.
--
-- THIS IS NOT A TRUST MARK. It is a name. `agent_badges.verified` is the
-- checked fact and lives somewhere else, and neither implies the other.
--
-- ADDITIVE. One new view, its grants and two comments. Nothing is dropped,
-- altered or revoked from anybody who legitimately held it.
--
-- ---------------------------------------------------------------------------
-- PROBE, `scripts/probes/track_g_name_door.sql`, run through `apply_migration`
-- and rolled back. Result on 2026-09-23:
--
--   PROBE ALL PASS track-g-name-door, 12 assertions, 2 opposite-shape controls
--   green (anon still reads 0 rows of public.agents and is still refused
--   listings.supply_verified_by). anon and a signed-in reader each read 64
--   named rows of public.listing_lister; INSERT, UPDATE and DELETE through the
--   view are all refused to anon; a DRAFT publishes no name; the SAME row
--   publishes no name as owner and a name as agent; anon and authenticated
--   hold SELECT and nothing wider; the view exposes exactly two columns.

/* -------------------------------------------------------------- the door */

create or replace view public.listing_lister
  with (security_invoker = false, security_barrier = true) as
select
  l.id as listing_id,
  /* NULLIF so a blank display name publishes NULL rather than an empty
     string. `fillLister` treats a blank as no name and draws no line, and
     the two layers must agree about what "no name" is. */
  case l.listing_role
    when 'owner' then null::text
    when 'firm'  then nullif(btrim(b.name), '')
    else              nullif(btrim(a.display_name), '')
  end as lister_name
from public.listings l
  left join public.agents a     on a.id = l.agent_id
  left join public.businesses b on b.id = l.firm_id
where l.status = 'PUBLISHED';

comment on view public.listing_lister is
  'THE ONE FACT ABOUT A LISTER THAT A LISTING ALREADY IMPLIES: their name. Two columns, published listings only, and NULL for an owner because "Listed by the owner" names nobody by design. security_invoker is deliberately OFF so this reads public.agents and public.businesses as the owner; that is the whole point, because both are correctly RLS-bound away from strangers. Nothing else about a lister passes through here: not a phone number, an email address, an address, a document number, a user id, a verification tier or a status. Adding a third column to this view is a decision about privacy and not a convenience.';

comment on column public.listing_lister.lister_name is
  'The agent display_name for listing_role = agent, the firm name for firm, NULL for owner. Fills {name} in LISTING_ROLE_SENTENCE. Blank publishes as NULL so that no surface prints a template with its placeholder showing.';

/* --------------------------------------------------------- born locked */

revoke all on public.listing_lister from public;
revoke all on public.listing_lister from anon;
revoke all on public.listing_lister from authenticated;

grant select on public.listing_lister to anon;
grant select on public.listing_lister to authenticated;

/* ---------------------------------------------- read back, in this file */

do $readback$
declare
  bad  text := '';
  cols text;
  wrong text;
  n integer;
begin
  /* 1. EXACTLY TWO COLUMNS, NAMED. */
  select string_agg(attname, ',' order by attnum) into cols
    from pg_attribute where attrelid = 'public.listing_lister'::regclass and attnum > 0 and not attisdropped;
  if cols is distinct from 'listing_id,lister_name' then
    bad := bad || ' [the view exposes ' || coalesce(cols,'nothing') || ' and not exactly listing_id,lister_name]';
  end if;

  /* 2. SELECT, FOR BOTH READER ROLES, WHICH IS THE DELIBERATE GRANT. */
  if not has_table_privilege('anon','public.listing_lister','select') then
    bad := bad || ' [anon cannot select the view it exists for]';
  end if;
  if not has_table_privilege('authenticated','public.listing_lister','select') then
    bad := bad || ' [authenticated cannot select the view]';
  end if;

  /* 3. AND NOTHING WIDER, read from pg_class.relacl through aclexplode, never
        from information_schema, which only returns rows where the querying
        role is grantor or grantee and so answers about the observer. */
  select string_agg(a.grantee::regrole::text || ':' || a.privilege_type, ' ')
    into wrong
    from aclexplode((select relacl from pg_class where oid = 'public.listing_lister'::regclass)) a
   where a.grantee in ('anon'::regrole, 'authenticated'::regrole)
     and a.privilege_type <> 'SELECT';
  if wrong is not null then
    bad := bad || ' [a reader role holds more than SELECT on the view: ' || wrong || ']';
  end if;

  /* 4. security_invoker MUST BE OFF. If it were on, the view would read
        public.agents as the caller, RLS would filter every row, and this whole
        door would silently return NULL for ever. That is the exact shape of
        failure this build keeps calling a blind light, so it is asserted. */
  if coalesce((select array_to_string(reloptions, ' ') from pg_class where oid = 'public.listing_lister'::regclass), '')
       ilike '%security_invoker=true%' then
    bad := bad || ' [security_invoker is on, so the view will publish nothing]';
  end if;

  /* 5. NOT VACUOUS. At least one published agent listing resolves to a name.
        Without this, a view returning NULL for everything would pass 1 to 4. */
  select count(*) into n from public.listing_lister where lister_name is not null;
  if n < 1 then
    bad := bad || ' [the view resolves a name for 0 listings, so it proves nothing]';
  end if;

  /* 6. AN OWNER LISTING PUBLISHES NO NAME. Vacuous today, because no live row
        is an owner listing, so it is asserted over a count rather than
        claimed: if an owner row ever appears carrying a name, this fails. */
  select count(*) into n
    from public.listing_lister v join public.listings l on l.id = v.listing_id
   where l.listing_role = 'owner' and v.lister_name is not null;
  if n <> 0 then
    bad := bad || ' [' || n || ' owner listings published a name]';
  end if;

  /* 7. THE VIEW IS BOUNDED BY PUBLICATION. */
  select count(*) into n from public.listing_lister v
   where not exists (select 1 from public.listings l where l.id = v.listing_id and l.status = 'PUBLISHED');
  if n <> 0 then
    bad := bad || ' [' || n || ' rows of the view are not published listings]';
  end if;

  /* 8. AND THE TABLE UNDERNEATH DID NOT OPEN. */
  if has_table_privilege('anon','public.agents','select')
     and (select count(*) from pg_policy where polrelid = 'public.agents'::regclass and polcmd in ('r','*')) < 2 then
    bad := bad || ' [public.agents lost its select policies]';
  end if;

  if bad <> '' then
    raise exception 'READ-BACK FAILED, the migration did not do what it says:%', bad;
  end if;
  raise notice 'READ-BACK OK: public.listing_lister exposes exactly listing_id and lister_name, anon and authenticated hold SELECT and nothing wider, security_invoker is off, it resolves a real name for at least one published listing, publishes no name for an owner listing, and carries published listings only.';
end;
$readback$;
