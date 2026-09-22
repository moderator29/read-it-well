-- TRACK G: THE SCHEMA PROBE. IT ROLLS ITSELF BACK.
--
-- Run against the live project (`uccixoonmbhrnyczyigt`). It ends in
-- `raise exception 'PROBE ALL PASS ...'`, so the whole transaction is thrown
-- away: the writes below are how six rules are PROVED BY REFUSAL, and not one
-- of them survives the run. No test row is ever left in a live product table.
--
-- WHY THE WRITES ARE HERE AT ALL. Twelve of these assertions read a catalogue,
-- and a catalogue assertion proves that a rule was DECLARED. It does not prove
-- the rule BITES. That distinction is the whole reason this stint existed:
-- `LISTING_ROLE_SENTENCE` had a green unit test and zero consumers, and the
-- three listing badges were believed shipped. So every constraint that matters
-- is proved by writing a row that must be refused and catching the refusal.
--
-- LAST RUN: 22 September 2026, against the live project.
--   PROBE ALL PASS: Track G schema, 20 assertions, six migrations live,
--   rule 21 read back on five SECURITY DEFINER functions, six rules proved by
--   refusal rather than by catalogue. Rolled back, nothing written.
--
-- Note that `execute_sql` over the management API runs read only, so this has
-- to go through the migration path to get a writable transaction. It never
-- commits one.

do $$
declare
  n int;
  v text;
  demo_listing uuid;
  live_agent uuid;
  not_an_agency uuid;
  fails text := '';
  passes int := 0;
begin
  /* 1 and 2: the two enums, with exactly the values ruled. Two and three, not
     three and three: a firm is an organisation on the person axis. */
  select string_agg(e.enumlabel, ',' order by e.enumsortorder) into v
    from pg_type t join pg_enum e on e.enumtypid = t.oid
    join pg_namespace ns on ns.oid = t.typnamespace
   where ns.nspname = 'public' and t.typname = 'supply_role';
  if v is distinct from 'owner,agent' then fails := fails || ' [1 supply_role=' || coalesce(v,'MISSING') || ']'; else passes := passes + 1; end if;

  select string_agg(e.enumlabel, ',' order by e.enumsortorder) into v
    from pg_type t join pg_enum e on e.enumtypid = t.oid
    join pg_namespace ns on ns.oid = t.typnamespace
   where ns.nspname = 'public' and t.typname = 'listing_role';
  if v is distinct from 'owner,agent,firm' then fails := fails || ' [2 listing_role=' || coalesce(v,'MISSING') || ']'; else passes := passes + 1; end if;

  /* 3 and 4: the person axis. */
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='agents' and column_name='role'
     and is_nullable='NO' and column_default like '%agent%';
  if n <> 1 then fails := fails || ' [3 agents.role]'; else passes := passes + 1; end if;

  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='agents' and column_name='firm_id';
  if n <> 1 then fails := fails || ' [4 agents.firm_id]'; else passes := passes + 1; end if;

  /* 5 and 6: the pair axis, which is what makes the founder's own example
     representable and what makes supplyPrimer()'s third sentence true. */
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='listings'
     and column_name in ('listing_role','firm_id','ownership_verified_at','mandate_verified_at','supply_verified_by');
  if n <> 5 then fails := fails || ' [5 listings pair axis n=' || n || ']'; else passes := passes + 1; end if;

  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='listings' and column_name='listing_role' and is_nullable='NO';
  if n <> 1 then fails := fails || ' [6 listing_role nullable]'; else passes := passes + 1; end if;

  /* 7 to 9: the two new tables, with RLS ON, and NO bare write policy on
     membership, because admission and revocation are audited functions. */
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
   where ns.nspname='public' and c.relname in ('firm_members','listing_mandates') and c.relrowsecurity;
  if n <> 2 then fails := fails || ' [7 new tables with rls n=' || n || ']'; else passes := passes + 1; end if;

  select count(*) into n from pg_policies where schemaname='public' and tablename='firm_members';
  if n < 3 then fails := fails || ' [8 firm_members policies n=' || n || ']'; else passes := passes + 1; end if;

  select count(*) into n from pg_policies
   where schemaname='public' and tablename='firm_members' and cmd in ('INSERT','UPDATE')
     and policyname <> 'firm_members_staff_all';
  if n <> 0 then fails := fails || ' [9 membership has a bare write policy]'; else passes := passes + 1; end if;

  /* 10 to 12: the document that finally knows which property it is about, the
     two new kinds WITHOUT losing the five that were there, and the nine
     subtypes a Nigerian ownership claim actually comes in. */
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='agent_documents' and column_name='listing_id';
  if n <> 1 then fails := fails || ' [10 agent_documents.listing_id]'; else passes := passes + 1; end if;

  select pg_get_constraintdef(oid) into v from pg_constraint
   where conrelid='public.agent_documents'::regclass and conname='agent_documents_kind_known';
  if v not like '%ownership%' or v not like '%mandate%' or v not like '%selfie%' then
    fails := fails || ' [11 kinds not widened, or an old kind lost]'; else passes := passes + 1; end if;

  select count(*) into n from pg_type t join pg_enum e on e.enumtypid=t.oid
    join pg_namespace ns on ns.oid=t.typnamespace
   where ns.nspname='public' and t.typname='document_subtype'
     and e.enumlabel in ('certificate_of_occupancy','deed_of_assignment','governors_consent',
       'survey_plan','land_use_charge_receipt','gazette','mandate_letter',
       'lasrera_certificate','esvarbon_certificate');
  if n <> 9 then fails := fails || ' [12 subtypes n=' || n || ']'; else passes := passes + 1; end if;

  /* 13: the firm arm on owns_listing, which widens six policies at once. */
  select pg_get_functiondef(p.oid) into v from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='private' and p.proname='owns_listing';
  if v not like '%firm_members%' then fails := fails || ' [13 owns_listing has no firm arm]'; else passes := passes + 1; end if;

  /* 14 to 16: RULE 21, BORN LOCKED. Every SECURITY DEFINER function this set
     defines is unreachable by anon and by authenticated. READ BACK, never
     assumed: `create or replace` keeps the grants the old definition carried,
     so a function that was once public stays public through a replace. */
  for v in select p.oid::regprocedure::text from pg_proc p
             join pg_namespace ns on ns.oid=p.pronamespace
            where ns.nspname='private' and p.prosecdef
              and p.proname in ('agents_firm_must_be_an_agency','admit_firm_member',
                                'revoke_firm_member','owns_listing','listing_supply_proof_gate')
  loop
    if has_function_privilege('anon', v, 'EXECUTE') then fails := fails || ' [14 anon can execute ' || v || ']'; end if;
    if has_function_privilege('authenticated', v, 'EXECUTE') then fails := fails || ' [15 authenticated can execute ' || v || ']'; end if;
  end loop;
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='private' and p.prosecdef
     and p.proname in ('agents_firm_must_be_an_agency','admit_firm_member','revoke_firm_member',
                       'owns_listing','listing_supply_proof_gate');
  if n <> 5 then fails := fails || ' [16 expected 5 secdef fns, found ' || n || ']'; else passes := passes + 1; end if;

  /* 17 to 22: SIX RULES PROVED BY REFUSAL. Each writes and each must fail. */
  select id into demo_listing from public.listings where is_demo limit 1;

  begin
    update public.listings set listing_role = 'firm' where id = demo_listing;
    fails := fails || ' [17 a firm listing was allowed with no firm_id]';
  exception when check_violation then passes := passes + 1;
  end;

  begin
    update public.listings set mandate_verified_at = now(), supply_verified_by = null where id = demo_listing;
    fails := fails || ' [18 a dated stamp was allowed with nobody behind it]';
  exception when check_violation then passes := passes + 1;
  end;

  begin
    update public.listings set listing_role = 'owner', mandate_verified_at = now(),
      supply_verified_by = (select id from auth.users limit 1) where id = demo_listing;
    fails := fails || ' [19 an owner listing was allowed to prove a mandate]';
  exception when check_violation then passes := passes + 1;
  end;

  begin
    insert into public.agent_documents (kind, storage_path, uploader_id)
    values ('ownership', 'probe/never-committed', (select id from auth.users limit 1));
    fails := fails || ' [20 an ownership document was allowed to name no listing]';
  exception when check_violation then passes := passes + 1;
  end;

  begin
    insert into public.listing_mandates (listing_id, kind, principal_name, principal_phone)
    values (demo_listing, 'letting', 'A Probe', '08031234567');
    fails := fails || ' [21 a non +234 principal phone was accepted]';
  exception when check_violation then passes := passes + 1;
  end;

  select id into not_an_agency from public.businesses where kind <> 'agency' limit 1;
  select id into live_agent from public.agents limit 1;
  begin
    update public.agents set firm_id = not_an_agency where id = live_agent;
    fails := fails || ' [22 a non agency was accepted as a firm]';
  exception when check_violation then passes := passes + 1;
  end;

  if fails <> '' then
    raise exception 'PROBE FAILED after % passes:%', passes, fails;
  end if;
  raise exception 'PROBE ALL PASS: Track G schema, % assertions, six migrations live, rule 21 read back on five SECURITY DEFINER functions, six rules proved by refusal rather than by catalogue. Rolled back, nothing written.', passes;
end$$;
