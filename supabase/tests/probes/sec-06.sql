-- SEC-06: a tenant preference by ethnicity, religion, marital status or gender
-- is HELD FOR REVIEW with the reason shown to the lister (review_notes), never
-- refused; ordinary copy is untouched. Rolls back always.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  rec    record;
  got    text;
  agent  uuid;
  held   uuid;
  clean  uuid;
  st     text;
  note   text;
  n      int;
begin
  -- A. The detector, positive and negative.
  for rec in select * from (values
    ('No Igbo tenants', true), ('Muslims only', true), ('Christians only please', true),
    ('Married couples only', true), ('No Hausa, no Fulani', true), ('Yoruba only', true),
    ('no bachelors', true), ('Ladies only, shared flat', true), ('Strictly no singles', true),
    ('only married couples', true), ('NO IGBOS', true), ('N0 1gbo', true),
    ('Near the mosque', false), ('Close to the church and market', false),
    ('Igbo Efon, Lekki', false), ('No smoking, no pets', false), ('No agency fee', false),
    ('Only 2 units left', false), ('Benin, Edo State, no caution fee', false),
    ('No family land dispute', false), ('Family house, 4 bedrooms', false),
    ('Men''s salon downstairs', false), ('Yoruba-speaking caretaker on site', false),
    ('Muslim prayer room in the estate', false), ('no single room available', false)
  ) as t(txt, want) loop
    if (private.discriminatory_phrase(rec.txt) is not null) <> rec.want then
      raise exception 'PROBE_FAIL sec-06: "%" gave %, expected %',
        rec.txt, private.discriminatory_phrase(rec.txt), rec.want;
    end if;
  end loop;

  -- The member as an ordinary approved agent, inside this transaction only.
  insert into public.agents (user_id, display_name) values (member, 'Probe Agent')
  returning id into agent;

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- (RETURNING needs the owner SELECT policy, which cannot see the row being
  -- inserted in the same statement; each row is read back as the owner.)
  clean := gen_random_uuid();
  held  := gen_random_uuid();

  -- CONTROL: ordinary copy is saved as written, with no note.
  insert into public.listings (id, agent_id, title, description, property_type, status)
  values (clean, agent, '2 bed flat near the mosque', 'Quiet street, 24 hour power.', 'apartment', 'DRAFT');

  -- A preference is saved (not refused), stays a DRAFT, and carries the reason.
  insert into public.listings (id, agent_id, title, description, property_type, status)
  values (held, agent, 'Self contain in Surulere', 'No Igbo tenants. Water and light.', 'apartment', 'DRAFT');

  reset role;
  select status::text, review_notes into st, note from public.listings where id = clean;
  if st <> 'DRAFT' or note is not null then
    raise exception 'PROBE_FAIL sec-06: clean listing got status % note %', st, note;
  end if;
  select status::text, review_notes into st, note from public.listings where id = held;
  if st <> 'DRAFT' or note is null or note not like 'Held for review:%no igbo%' then
    raise exception 'PROBE_FAIL sec-06: preference listing got status % note %', st, note;
  end if;

  -- Going live with it lands in the review queue instead.
  set local role authenticated;
  update public.listings set status = 'PUBLISHED' where id = held;
  reset role;
  select status::text into st from public.listings where id = held;
  if st <> 'SUBMITTED' then
    raise exception 'PROBE_FAIL sec-06: preference listing went live as %', st;
  end if;
  select count(*) into n from public.risk_alerts
   where entity_type = 'listing' and entity_id = held::text and status = 'open';
  if n <> 1 then
    raise exception 'PROBE_FAIL sec-06: % open alerts for the held listing', n;
  end if;

  -- Rewording clears the note the scanner wrote.
  set local role authenticated;
  update public.listings set description = 'Water and light. Everyone welcome.' where id = held;
  reset role;
  select review_notes into note from public.listings where id = held;
  if note is not null then
    raise exception 'PROBE_FAIL sec-06: reworded listing kept note %', note;
  end if;

  -- An admin, through their own authenticated client, is the reviewer and is
  -- not held.
  set local role authenticated;
  update public.listings set description = 'Ladies only, shared flat.' where id = held;
  perform set_config('request.jwt.claims',
    json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  update public.listings set status = 'PUBLISHED' where id = held;
  reset role;
  select status::text into st from public.listings where id = held;
  if st <> 'PUBLISHED' then
    raise exception 'PROBE_FAIL sec-06: admin publish became %', st;
  end if;

  reset role;
  raise exception 'PROBE_OK sec-06';
end $$;
