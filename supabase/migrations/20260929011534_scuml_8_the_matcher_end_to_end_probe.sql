/*
 * SCUML item 8: THE NAME MATCHER, END TO END, AGAINST THE LIVE TABLES.
 *
 * A probe and nothing else: it changes no schema and leaves no row. It proves
 * that what the app's matcher writes is what the database accepts and acts on.
 *
 * How the rows below were made. A small synthetic list (invented names, the UN
 * Consolidated List's XML shape: two individuals and one entity) was uploaded
 * through the REAL lib/compliance/sanctions/ingest.ts, and four queued people
 * were screened by the REAL drainScreenQueue in screen.ts (the matcher in
 * match.ts), each against a recording client. Every row the app wrote is
 * replayed here verbatim, AS THE SERVICE ROLE, the role the job and the upload
 * route use, so the grants are tested too. The matcher's verdicts:
 *   "Temidayo Okonkwo-Balogun Zinderu"  exact  1.000   (the listed name)
 *   "Temidayo Okonkwo Balogun Zinderoo" fuzzy  0.999   (a transliteration)
 *   "Ibrahim Musa"                      exact  1.000   common name
 *   "Chiamaka Eze-Obi"                  clear
 *
 * Then, through the database: the upload waits for a second staff member,
 * whose activation queues everyone; the job claims the queue; the desk shows
 * three hits, the common-name one last; the risk hook reads true for the exact
 * match, false for the fuzzy, the common name and the clean person; a fuzzy
 * match confirmed by two people holds money under the plain reason and turns
 * the risk hook true. Rolled back; the residue check fails the migration if
 * anything is left.
 */

do $probe$
declare
  v_staff uuid := '2f42c30e-b705-43b5-97f6-675151cd258a';
  v_staff2 uuid := gen_random_uuid();
  v_version uuid := 'cb9965b7-8cbc-4ce7-aede-121dfceefe03';
  v_exact uuid := 'b322df2e-1648-4dea-870c-f2d41c5f9e37';
  v_fuzzy uuid := '52f7f84c-c051-4434-9b80-876890902aad';
  v_common uuid := '5a6f154e-4676-4338-affa-67bca9b05519';
  v_clean uuid := '93b26d91-92ae-4958-95fe-bebc7ccbc9b3';
  v_ans jsonb;
  v_desk jsonb;
  v_claimed int;
  v_dec uuid;
  v_fuzzy_hit uuid;
  v_hits_before bigint;
  v_screens_before bigint;
  v_versions_before bigint;
begin
  select count(*) into v_hits_before from public.sanctions_hits;
  select count(*) into v_screens_before from public.sanctions_screenings;
  select count(*) into v_versions_before from public.sanctions_list_versions;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scuml8e2e-probe-' || n || '@example.invalid', 'x', now(), now(), '{"provider":"email","providers":["email"]}', '{}'
      from (values (v_staff, 'staff1'), (v_staff2, 'staff2'), (v_exact, 'exact'), (v_fuzzy, 'fuzzy'), (v_common, 'common'), (v_clean, 'clean')) x(u, n);
    insert into public.user_roles (user_id, role) values (v_staff, 'admin'), (v_staff2, 'admin');
    update public.profiles set first_name = 'Temidayo', surname = 'Okonkwo-Balogun Zinderu' where id = v_exact;
    update public.profiles set first_name = 'Temidayo', surname = 'Okonkwo Balogun Zinderoo' where id = v_fuzzy;
    update public.profiles set first_name = 'Ibrahim', surname = 'Musa' where id = v_common;
    update public.profiles set first_name = 'Chiamaka', surname = 'Eze-Obi' where id = v_clean;

    -- 1. The upload, as ingest.ts wrote it, as the service role.
    perform set_config('role', 'service_role', true);
    insert into public.sanctions_list_versions (id, source, sha256, origin, loaded_by)
    values (v_version, 'un', 'baa114cab1134df4bd06f9b4732d8b0841c82f3755b1071332abc84e422f5a8b', 'upload', v_staff);
    insert into public.sanctions_entries (id, version_id, source, reference, kind, primary_name, aliases, names_normalised, dates_of_birth, nationalities, listed_on)
    values ('550e4bfb-bcb0-4836-adc7-12f28a4b641b', v_version, 'un', 'SYNi.001', 'individual', 'TEMIDAYO OKONKWO-BALOGUN ZINDERU', array['Temi Zinderu']::text[], array['balogun okonkwo temidayo zinderu', 'temi zinderu']::text[], array['1974-05-06']::text[], array['Nigeria']::text[], '2021-02-03'::date)
    on conflict (version_id, reference) do nothing;
    insert into public.sanctions_entries (id, version_id, source, reference, kind, primary_name, aliases, names_normalised, dates_of_birth, nationalities, listed_on)
    values ('2b46f68a-67e7-4956-bc67-f8372373904d', v_version, 'un', 'SYNi.002', 'individual', 'IBRAHIM MUSA', '{}'::text[], array['ibrahim musa']::text[], '{}'::text[], '{}'::text[], '2022-07-08'::date)
    on conflict (version_id, reference) do nothing;
    insert into public.sanctions_entries (id, version_id, source, reference, kind, primary_name, aliases, names_normalised, dates_of_birth, nationalities, listed_on)
    values ('bfb0e7b6-a253-4dc2-a136-9da6f73522c8', v_version, 'un', 'SYNe.001', 'entity', 'QUARVELLE PROBE HOLDINGS', '{}'::text[], array['holdings probe quarvelle']::text[], '{}'::text[], '{}'::text[], '2020-01-01'::date)
    on conflict (version_id, reference) do nothing;
    update public.sanctions_list_versions set entry_count = 3, previous_entries = null::integer, complete = true
     where id = v_version and activated_at is null;
    perform set_config('role', 'none', true);

    -- 2. The loader cannot activate an upload; a second staff member does, which queues everyone.
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    if public.sanctions_list_activate(v_version)->>'status' <> 'own_upload' then
      raise exception 'PROBE FAILED: the loader activated their own upload';
    end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff2, 'role', 'authenticated')::text, true);
    v_ans := public.sanctions_list_activate(v_version);
    if v_ans->>'status' <> 'ok' then raise exception 'PROBE FAILED: activation answered %', v_ans; end if;
    if (select count(*) from public.sanctions_screen_queue q
         where q.person_id in (v_exact, v_fuzzy, v_common, v_clean) and q.trigger = 'list_change' and q.done_at is null) <> 4 then
      raise exception 'PROBE FAILED: activation did not queue the four people';
    end if;
    perform set_config('request.jwt.claims', '', true);

    -- 3. The run, as screen.ts wrote it, as the service role.
    perform set_config('role', 'service_role', true);
    select count(*) into v_claimed from public.sanctions_claim_queue(1000);
    if v_claimed < 4 then raise exception 'PROBE FAILED: the job could not claim the queue'; end if;
    insert into public.sanctions_screenings (id, subject_kind, person_id, transaction_kind, transaction_id, trigger, names_screened, un_version_id, ng_version_id, outcome, best_score, matches)
    values ('a9bb7b7a-81e6-4983-9f58-93da8498b96b', 'person', 'b322df2e-1648-4dea-870c-f2d41c5f9e37', null, null, 'list_change', array['Temidayo Okonkwo-Balogun Zinderu']::text[], v_version, null, 'exact', 1, '[{"entryId": "550e4bfb-bcb0-4836-adc7-12f28a4b641b", "source": "un", "reference": "SYNi.001", "kind": "exact", "score": 1, "screenedName": "Temidayo Okonkwo-Balogun Zinderu", "matchedName": "TEMIDAYO OKONKWO-BALOGUN ZINDERU", "raise": true, "common": false, "personId": "b322df2e-1648-4dea-870c-f2d41c5f9e37"}]'::jsonb);
    insert into public.sanctions_screenings (id, subject_kind, person_id, transaction_kind, transaction_id, trigger, names_screened, un_version_id, ng_version_id, outcome, best_score, matches)
    values ('c20b6888-2810-4af1-8f10-7dbc9fb3f9da', 'person', '52f7f84c-c051-4434-9b80-876890902aad', null, null, 'list_change', array['Temidayo Okonkwo Balogun Zinderoo']::text[], v_version, null, 'fuzzy', 0.999, '[{"entryId": "550e4bfb-bcb0-4836-adc7-12f28a4b641b", "source": "un", "reference": "SYNi.001", "kind": "fuzzy", "score": 0.999, "screenedName": "Temidayo Okonkwo Balogun Zinderoo", "matchedName": "TEMIDAYO OKONKWO-BALOGUN ZINDERU", "raise": true, "common": false, "personId": "52f7f84c-c051-4434-9b80-876890902aad"}]'::jsonb);
    insert into public.sanctions_screenings (id, subject_kind, person_id, transaction_kind, transaction_id, trigger, names_screened, un_version_id, ng_version_id, outcome, best_score, matches)
    values ('b1aabec9-1d36-49c0-afc9-1e5da674ea0f', 'person', '5a6f154e-4676-4338-affa-67bca9b05519', null, null, 'list_change', array['Ibrahim Musa']::text[], v_version, null, 'exact', 1, '[{"entryId": "2b46f68a-67e7-4956-bc67-f8372373904d", "source": "un", "reference": "SYNi.002", "kind": "exact", "score": 1, "screenedName": "Ibrahim Musa", "matchedName": "IBRAHIM MUSA", "raise": true, "common": true, "personId": "5a6f154e-4676-4338-affa-67bca9b05519"}]'::jsonb);
    insert into public.sanctions_screenings (id, subject_kind, person_id, transaction_kind, transaction_id, trigger, names_screened, un_version_id, ng_version_id, outcome, best_score, matches)
    values ('ed314962-e211-4737-af95-6ae8f06fe56d', 'person', '93b26d91-92ae-4958-95fe-bebc7ccbc9b3', null, null, 'list_change', array['Chiamaka Eze-Obi']::text[], v_version, null, 'clear', 0, '[]'::jsonb);
    insert into public.sanctions_hits (screening_id, person_id, source, entry_id, entry_reference, match_kind, score, screened_name, matched_name, common_name)
    values ('a9bb7b7a-81e6-4983-9f58-93da8498b96b', 'b322df2e-1648-4dea-870c-f2d41c5f9e37', 'un', '550e4bfb-bcb0-4836-adc7-12f28a4b641b', 'SYNi.001', 'exact', 1, 'Temidayo Okonkwo-Balogun Zinderu', 'TEMIDAYO OKONKWO-BALOGUN ZINDERU', false)
    on conflict (person_id, source, entry_reference, screened_name) do nothing;
    insert into public.sanctions_hits (screening_id, person_id, source, entry_id, entry_reference, match_kind, score, screened_name, matched_name, common_name)
    values ('c20b6888-2810-4af1-8f10-7dbc9fb3f9da', '52f7f84c-c051-4434-9b80-876890902aad', 'un', '550e4bfb-bcb0-4836-adc7-12f28a4b641b', 'SYNi.001', 'fuzzy', 0.999, 'Temidayo Okonkwo Balogun Zinderoo', 'TEMIDAYO OKONKWO-BALOGUN ZINDERU', false)
    on conflict (person_id, source, entry_reference, screened_name) do nothing;
    insert into public.sanctions_hits (screening_id, person_id, source, entry_id, entry_reference, match_kind, score, screened_name, matched_name, common_name)
    values ('b1aabec9-1d36-49c0-afc9-1e5da674ea0f', '5a6f154e-4676-4338-affa-67bca9b05519', 'un', '2b46f68a-67e7-4956-bc67-f8372373904d', 'SYNi.002', 'exact', 1, 'Ibrahim Musa', 'IBRAHIM MUSA', true)
    on conflict (person_id, source, entry_reference, screened_name) do nothing;
    update public.sanctions_screen_queue set done_at = now()
     where person_id in (v_exact, v_fuzzy, v_common, v_clean) and done_at is null;
    perform set_config('role', 'none', true);

    -- 4. What the database makes of the matcher's verdicts.
    if (select count(*) from public.sanctions_hits where person_id in (v_exact, v_fuzzy, v_common, v_clean)) <> 3 then
      raise exception 'PROBE FAILED: not exactly three hits were raised';
    end if;
    if private.sanctions_hit_for(v_exact) is not true then raise exception 'PROBE FAILED: an exact match does not move the risk hook'; end if;
    if private.sanctions_hit_for(v_fuzzy) is not false then raise exception 'PROBE FAILED: an open fuzzy match moved the risk hook'; end if;
    if private.sanctions_hit_for(v_common) is not false then raise exception 'PROBE FAILED: an open common-name match moved the risk hook'; end if;
    if private.sanctions_hit_for(v_clean) is not false then raise exception 'PROBE FAILED: a clean screening is not read as clean'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    v_desk := public.sanctions_desk();
    if (select array_agg(h->>'screenedName' order by o) from jsonb_array_elements(v_desk->'hits') with ordinality x(h, o)
         where (h->>'personId')::uuid in (v_exact, v_fuzzy, v_common))
       <> array['Temidayo Okonkwo-Balogun Zinderu', 'Temidayo Okonkwo Balogun Zinderoo', 'Ibrahim Musa'] then
      raise exception 'PROBE FAILED: the desk does not order exact, fuzzy, then the common name: %', v_desk->'hits';
    end if;
    if not exists (select 1 from jsonb_array_elements(v_desk->'hits') h
                    where (h->>'personId')::uuid = v_exact and h->'datesOfBirth' = '["1974-05-06"]'::jsonb
                      and h->'nationalities' = '["Nigeria"]'::jsonb) then
      raise exception 'PROBE FAILED: the desk does not carry the listing''s identifiers';
    end if;

    -- 5. A fuzzy match confirmed by two people holds money and moves the class.
    select id into v_fuzzy_hit from public.sanctions_hits where person_id = v_fuzzy;
    v_ans := public.sanctions_hit_propose(v_fuzzy_hit, 'confirm', 'Transliteration of the listed name; identifiers agree.');
    v_dec := (v_ans->>'decisionId')::uuid;
    perform set_config('request.jwt.claims', json_build_object('sub', v_staff2, 'role', 'authenticated')::text, true);
    if public.sanctions_hit_approve(v_dec)->>'status' <> 'ok' then raise exception 'PROBE FAILED: the confirmation was not approved'; end if;
    if private.sanctions_hit_for(v_fuzzy) is not true then raise exception 'PROBE FAILED: a confirmed fuzzy match does not move the risk hook'; end if;
    if not exists (select 1 from public.account_money_holds h where h.user_id = v_fuzzy and h.reason = 'plain' and h.hold_until > now()) then
      raise exception 'PROBE FAILED: a confirmed match holds no money';
    end if;

    raise exception 'PROBE_OK';
  exception when others then
    if sqlerrm <> 'PROBE_OK' then raise; end if;
  end;
  perform set_config('request.jwt.claims', '', true);
  if (select count(*) from public.sanctions_hits) <> v_hits_before
     or (select count(*) from public.sanctions_screenings) <> v_screens_before
     or (select count(*) from public.sanctions_list_versions) <> v_versions_before
     or exists (select 1 from auth.users where id in (v_staff, v_staff2, v_exact, v_fuzzy, v_common, v_clean)) then
    raise exception 'PROBE FAILED: residue left behind';
  end if;
end;
$probe$;
