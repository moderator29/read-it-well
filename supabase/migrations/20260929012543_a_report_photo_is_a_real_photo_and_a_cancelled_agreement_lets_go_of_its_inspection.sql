/*
 * A REPORT PHOTO IS A REAL PHOTO, AND A CANCELLED AGREEMENT LETS GO OF ITS
 * INSPECTION.
 *
 * 1. THE PHOTO RULE COUNTED ROWS, NOT PHOTOS. Submitting a rental report and
 *    drawing up its agreement both need `money_policy.min_inspection_photos`
 *    rows in `inspection_report_photos` (20260928233552). The insert policy
 *    only asked that the inspection be open and the report unsubmitted, so a
 *    party could insert three rows naming paths that hold nothing and pass
 *    both gates. The policy now also requires the path to sit in the
 *    inspection's own folder (`<inspection_id>/...`, the layout
 *    `private.inspection_photo_path_access` already enforces on the bucket)
 *    and an object to exist at that path in `inspection-photos`. The object
 *    check goes through `private.inspection_photo_object_exists`, SECURITY
 *    DEFINER with an empty search_path, because the caller may not read
 *    `storage.objects` rows for the bucket directly. The app already uploads
 *    the bytes before it inserts the row. The policy moves from PUBLIC to
 *    `authenticated`, which only narrows it: nobody else could pass it.
 *
 * 2. A CANCELLED RENT AGREEMENT BLOCKED ITS INSPECTION FOR GOOD.
 *    `deal_agreements.inspection_id` is unique, and `agreement_open_rent_as`
 *    answered `exists` whatever the existing agreement's status, so once an
 *    agreement was cancelled the renter could never draw up another from the
 *    same report. Cancelled is terminal (no door moves an agreement out of
 *    it), so the door now releases a cancelled agreement's inspection
 *    (`inspection_id` set to null, logged as `released` on that agreement and
 *    in `audit_log` with the inspection id) and draws up a new one. The check
 *    `deal_agreements_rent_has_inspection` allows a null inspection only on a
 *    cancelled agreement, and `released` joins the actions
 *    `deal_agreement_events` accepts. Every reader that looks an agreement
 *    up by inspection still finds at most one row, the live one.
 *
 * 3. `exists` IS ANSWERED ONLY TO A PARTY TO THAT AGREEMENT. The door checked
 *    the caller against the inspection's current parties; if the listing has
 *    since changed hands, the agreement's own parties are the ones who may
 *    learn it exists. Anybody else is told `not_found`.
 *
 * RLS stays on. No grant widens.
 */

/* ------------------------------------------------------------- 1. photos */

create or replace function private.inspection_photo_object_exists(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from storage.objects o
     where o.bucket_id = 'inspection-photos' and o.name = p_path
  );
$$;

comment on function private.inspection_photo_object_exists(text) is
  'True when an object exists at this path in the inspection-photos bucket. Read by the inspection_report_photos insert policy, so a photo row cannot point at nothing.';

revoke all on function private.inspection_photo_object_exists(text) from public, anon;
grant execute on function private.inspection_photo_object_exists(text) to authenticated;

drop policy if exists inspection_report_photos_write_party on public.inspection_report_photos;
create policy inspection_report_photos_write_party on public.inspection_report_photos
  for insert to authenticated
  with check (
    private.inspection_open_for_report(inspection_id)
    and private.inspection_report_unsubmitted(inspection_id)
    and split_part(storage_path, '/', 1) = inspection_id::text
    and private.inspection_photo_object_exists(storage_path)
  );

/* ------------------------------------------------- 2 and 3. the rent door */

alter table public.deal_agreements drop constraint if exists deal_agreements_rent_has_inspection;
alter table public.deal_agreements add constraint deal_agreements_rent_has_inspection
  check (kind <> 'rent' or inspection_id is not null or status = 'cancelled'::public.agreement_status);

/* The release is written to the agreement's own append-only history. */
alter table public.deal_agreement_events drop constraint if exists deal_agreement_events_action_check;
alter table public.deal_agreement_events add constraint deal_agreement_events_action_check
  check (action = any (array['opened', 'amended', 'confirmed', 'submitted', 'approved', 'rejected',
                             'cancelled', 'paid', 'released']));

create or replace function public.agreement_open_rent_as(
  p_actor uuid, p_inspection uuid, p_move_in date, p_handover date default null, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  insp public.inspection_requests%rowtype;
  lst public.listings%rowtype;
  lister uuid;
  rep public.inspection_reports%rowtype;
  ticked integer;
  photos integer;
  need_photos integer;
  terms jsonb;
  ag public.deal_agreements%rowtype;
begin
  if p_actor is null or p_inspection is null or p_move_in is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if p_move_in < (now() at time zone 'Africa/Lagos')::date then
    return jsonb_build_object('status', 'move_in_past');
  end if;
  if p_notes is not null and length(p_notes) > 2000 then
    return jsonb_build_object('status', 'notes_too_long');
  end if;
  select * into insp from public.inspection_requests where id = p_inspection;
  if insp.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into lst from public.listings where id = insp.listing_id;
  select a.user_id into lister from public.agents a where a.id = lst.agent_id;
  if p_actor not in (insp.requester_id, coalesce(lister, insp.requester_id)) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if lst.listing_intent is distinct from 'rent' or lst.rent_amount_minor is null then
    return jsonb_build_object('status', 'not_a_rental');
  end if;
  if lister is null or lister = insp.requester_id then
    return jsonb_build_object('status', 'no_lister');
  end if;
  select * into rep from public.inspection_reports where inspection_id = insp.id;
  if rep.inspection_id is null or rep.submitted_at is null then
    return jsonb_build_object('status', 'inspection_not_submitted');
  end if;
  select count(*) filter (where i.checked) into ticked
    from public.inspection_report_items i where i.inspection_id = insp.id;
  if coalesce(ticked, 0) < 8 then
    return jsonb_build_object('status', 'inspection_incomplete', 'ticked', coalesce(ticked, 0));
  end if;
  select count(*) into photos from public.inspection_report_photos p where p.inspection_id = insp.id;
  select m.min_inspection_photos into need_photos from public.money_policy m;
  if photos < need_photos then
    return jsonb_build_object('status', 'inspection_needs_photos', 'photos', photos, 'needed', need_photos);
  end if;
  select * into ag from public.deal_agreements where inspection_id = insp.id for update;
  if ag.id is not null then
    if ag.status = 'cancelled'::public.agreement_status then
      /* Cancelled is terminal, so its hold on the inspection is let go and a
         new agreement is drawn up below. The old one keeps its history. */
      update public.deal_agreements set inspection_id = null, updated_at = now()
       where id = ag.id
      returning * into ag;
      perform private.agreement_log(ag, p_actor, 'released', 'cancelled'::public.agreement_status,
                                    'A new agreement was drawn up from the same inspection.');
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (p_actor, 'agreement.inspection_released', 'deal_agreement', ag.id::text,
              jsonb_build_object('inspection_id', insp.id));
    elsif p_actor not in (ag.renter_id, ag.owner_id) then
      return jsonb_build_object('status', 'not_found');
    else
      return jsonb_build_object('status', 'exists', 'agreement_id', ag.id, 'agreement_status', ag.status);
    end if;
  end if;
  terms := private.rent_terms(lst.id, p_move_in, p_handover, p_notes);
  if coalesce((terms ->> 'total_minor')::bigint, 0) <= 0 then
    return jsonb_build_object('status', 'no_amount');
  end if;
  insert into public.deal_agreements (kind, listing_id, inspection_id, renter_id, owner_id, amount_minor, terms)
  values ('rent', lst.id, insp.id, insp.requester_id, lister, (terms ->> 'total_minor')::bigint, terms)
  returning * into ag;
  perform private.agreement_log(ag, p_actor, 'opened', null, 'Drawn up from the submitted inspection report.');
  perform private.notify(case when p_actor = ag.renter_id then ag.owner_id else ag.renter_id end,
                         'booking', 'Agreement waiting for you',
                         coalesce(lst.title, 'A property') || ' has terms waiting for your confirmation.',
                         '/agreements/' || ag.id::text);
  return jsonb_build_object('status', 'ok', 'agreement_id', ag.id);
end;
$function$;

revoke all on function public.agreement_open_rent_as(uuid, uuid, date, date, text) from public, anon, authenticated;
grant execute on function public.agreement_open_rent_as(uuid, uuid, date, date, text) to service_role;

/* ------------------------------------------------ read-back and probes
   Every fixture lives inside a block that ends in a sentinel exception, so
   all of it (rows, storage objects, notifications, the listing's rent
   figure) rolls back. Every side effect of these triggers is a queue table. */
do $probe$
declare
  lst uuid;
  owner_user uuid;
  asker uuid;
  insp uuid;
  good_path text;
  refused boolean;
  first_ag uuid;
  second_ag uuid;
  answer jsonb;
  move_in date := (now() at time zone 'Africa/Lagos')::date + 7;
begin
  if has_function_privilege('authenticated', 'public.agreement_open_rent_as(uuid, uuid, date, date, text)', 'execute')
     or has_function_privilege('anon', 'private.inspection_photo_object_exists(text)', 'execute')
     or not has_function_privilege('authenticated', 'private.inspection_photo_object_exists(text)', 'execute') then
    raise exception 'probe: execute grants are not as intended';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'inspection_report_photos'
                  and policyname = 'inspection_report_photos_write_party'
                  and with_check like '%inspection_photo_object_exists%' and with_check like '%split_part%') then
    raise exception 'probe: the photo insert policy does not hold both new checks';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.inspection_report_photos'::regclass) then
    raise exception 'probe: RLS is off on inspection_report_photos';
  end if;

  select l.id, a.user_id into lst, owner_user from public.listings l join public.agents a on a.id = l.agent_id
   where l.is_demo = false and l.listing_intent = 'rent' and l.closed_at is null limit 1;
  if lst is null then
    raise notice 'probe: no real rental listing; structural checks only';
    return;
  end if;
  select p.id into asker from public.profiles p where p.id <> owner_user limit 1;

  begin
    update public.listings
       set rent_amount_minor = coalesce(rent_amount_minor, 100000000),
           rent_period = coalesce(rent_period, 'year')
     where id = lst;
    insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at, responded_at)
    values (lst, asker, asker, 'CONFIRMED', now() - interval '1 hour', now() - interval '1 hour', now())
    returning id into insp;
    insert into public.inspection_reports (inspection_id, author_id) values (insp, asker);

    /* --- 1. as the renter, through RLS */
    perform set_config('request.jwt.claim.sub', asker::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', asker, 'role', 'authenticated')::text, true);

    -- a row naming a path with no object behind it
    set local role authenticated;
    refused := false;
    begin
      insert into public.inspection_report_photos (inspection_id, storage_path)
      values (insp, insp::text || '/' || gen_random_uuid()::text || '.jpg');
    exception when insufficient_privilege then refused := true;
    end;
    reset role;
    if not refused then
      raise exception 'probe: a photo row with no object behind it was accepted';
    end if;

    -- a real object, but in another inspection's folder
    good_path := gen_random_uuid()::text || '/' || gen_random_uuid()::text || '.jpg';
    insert into storage.objects (bucket_id, name) values ('inspection-photos', good_path);
    set local role authenticated;
    refused := false;
    begin
      insert into public.inspection_report_photos (inspection_id, storage_path) values (insp, good_path);
    exception when insufficient_privilege then refused := true;
    end;
    reset role;
    if not refused then
      raise exception 'probe: a photo row outside its own folder was accepted';
    end if;

    -- the control: a real object in the inspection's own folder
    for i in 1..3 loop
      good_path := insp::text || '/' || gen_random_uuid()::text || '.jpg';
      insert into storage.objects (bucket_id, name) values ('inspection-photos', good_path);
      set local role authenticated;
      insert into public.inspection_report_photos (inspection_id, storage_path) values (insp, good_path);
      reset role;
    end loop;
    if (select count(*) from public.inspection_report_photos where inspection_id = insp) <> 3 then
      raise exception 'probe: the real photos were not all recorded';
    end if;

    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);

    /* --- 2 and 3. the door */
    insert into public.inspection_report_items (inspection_id, item, checked, checked_at)
    select insp, i, true, now()
      from unnest(array['exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall']) as i;
    update public.inspection_reports set submitted_at = now() where inspection_id = insp;

    answer := public.agreement_open_rent_as(asker, insp, move_in, null, null);
    if answer ->> 'status' <> 'ok' then
      raise exception 'probe: the first agreement was not drawn up (%)', answer;
    end if;
    first_ag := (answer ->> 'agreement_id')::uuid;

    answer := public.agreement_open_rent_as(asker, insp, move_in, null, null);
    if answer ->> 'status' <> 'exists' or (answer ->> 'agreement_id')::uuid <> first_ag then
      raise exception 'probe: a live agreement was not answered as exists (%)', answer;
    end if;

    answer := public.agreement_cancel_as(asker, first_ag, null);
    if answer ->> 'status' <> 'ok' then
      raise exception 'probe: the agreement did not cancel (%)', answer;
    end if;

    answer := public.agreement_open_rent_as(asker, insp, move_in, null, null);
    if answer ->> 'status' <> 'ok' then
      raise exception 'probe: a cancelled agreement still blocks its inspection (%)', answer;
    end if;
    second_ag := (answer ->> 'agreement_id')::uuid;
    if second_ag = first_ag
       or (select inspection_id from public.deal_agreements where id = first_ag) is not null
       or (select status::text from public.deal_agreements where id = first_ag) <> 'cancelled'
       or (select inspection_id from public.deal_agreements where id = second_ag) <> insp
       or not exists (select 1 from public.deal_agreement_events where agreement_id = first_ag and action = 'released') then
      raise exception 'probe: the release did not leave one cancelled and one live agreement';
    end if;

    raise exception 'probe_ok';
  exception when others then
    reset role;
    if sqlerrm <> 'probe_ok' then
      raise;
    end if;
  end;
end;
$probe$;
