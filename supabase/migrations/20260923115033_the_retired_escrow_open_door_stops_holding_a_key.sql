-- LEDGER SECTION 63.5. `public.escrow_open` was retired in section 59 and has
-- held `service_role=X/postgres` ever since. ESCROW4 left it alone and said
-- why: "it is a revoke of something somebody may legitimately hold". Nobody
-- had established whether anybody holds it FOR anything, so that was the
-- question rather than the answer.
--
-- ESTABLISHED, FOUR WAYS, BEFORE THIS REVOKE:
--   * `pg_proc.prosrc` across every function in the database: 0 bodies mention
--     `escrow_open`, so no `execute` inside another function reaches it.
--   * `cron.job`: 14 jobs, 0 mention it.
--   * the application tree: the only occurrences are the generated
--     `database.types.ts` and the WANTED list in
--     `scripts/probes/escrow_concurrency.sh`, neither of which calls it.
--   * every `.rpc("escrow*")` in the repository: exactly one, and it is
--     `escrow_admin_resolve`.
--
-- So nothing reaches it, and the estate already has the precedent: when
-- `escrow_fund_from_wallet` and `escrow_fund_from_wallet_as` were retired they
-- were left at `{postgres=X/postgres}`. This puts the last retired verb on the
-- same footing rather than leaving a money door unlocked behind another door,
-- which is the distance rule 21 exists to keep.
--
-- RULE 21 IS RESTATED HERE, not assumed, and read back below.

revoke execute on function public.escrow_open(uuid, uuid, uuid, public.escrow_purpose, bigint) from public, anon, authenticated, service_role;

do $readback$
declare
  live text[] := array[
    'public.escrow_propose_as(uuid,uuid,uuid,escrow_purpose,bigint,boolean)',
    'public.escrow_fund_proposal_as(uuid,uuid,integer)',
    'public.escrow_cancel_as(uuid,uuid,text)',
    'public.escrow_confirm_as(uuid,uuid)',
    'public.escrow_request_release_as(uuid,uuid)',
    'public.escrow_raise_dispute_as(uuid,uuid,text)',
    'public.escrow_admin_resolve(uuid,text,text)',
    'public.escrow_hold(uuid,uuid,bigint,text,text,integer)',
    'public.escrow_release(uuid,uuid,text,text)',
    'public.escrow_refund(uuid,uuid,text,text)'
  ];
  sig text;
  bad text := '';
  acl text;
begin
  select coalesce(p.proacl::text, '(default)') into acl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'escrow_open';

  if has_function_privilege('service_role', 'public.escrow_open(uuid,uuid,uuid,escrow_purpose,bigint)', 'execute') then
    bad := bad || ' [service_role still holds escrow_open]';
  end if;
  if has_function_privilege('anon', 'public.escrow_open(uuid,uuid,uuid,escrow_purpose,bigint)', 'execute') then
    bad := bad || ' [anon holds escrow_open]';
  end if;
  if has_function_privilege('authenticated', 'public.escrow_open(uuid,uuid,uuid,escrow_purpose,bigint)', 'execute') then
    bad := bad || ' [authenticated holds escrow_open]';
  end if;

  -- THE CONTROL, and it is the reason this migration is safe to run. A revoke
  -- that also took a live door with it would read as a clean sweep. Every verb
  -- the escrow product actually funds, cancels, confirms, disputes, releases
  -- and refunds through must still hold `service_role` when this commits.
  foreach sig in array live loop
    if not has_function_privilege('service_role', sig, 'execute') then
      bad := bad || ' [LIVE DOOR LOST ITS KEY: ' || sig || ']';
    end if;
  end loop;

  if bad <> '' then
    raise exception 'READ BACK FAILED on escrow_open (acl now %):%', acl, bad;
  end if;
  raise notice 'escrow_open acl is now %', acl;
end;
$readback$;
