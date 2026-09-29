/*
 * TWO INSPECTION DEAD ENDS, CLOSED WHERE THEY START.
 *
 * 1. A VIEWING BOOKED FROM A WINDOW NEVER OPENED THE TRUTH QUESTIONS.
 *    `book_viewing_slot` (V-94) inserts the inspection already CONFIRMED.
 *    `private.freeze_agreed_slot` copies the agreed slot into
 *    `private.inspection_slot_agreed`, and `private.inspection_truth_open`
 *    joins that copy, but the trigger fired only on UPDATE OF state. A row
 *    born CONFIRMED never got its copy, so the renter was shown the four
 *    questions (the screen reads the slot) and every answer was refused by
 *    the insert policy. The trigger now fires on INSERT as well. The function
 *    already handles it: on INSERT `old` is null, so the slot frozen is the
 *    row's own `slot_at`. Rows already stranded are backfilled.
 *
 * 2. A RENTAL REPORT COULD BE SIGNED WITHOUT THE PHOTOS ITS AGREEMENT NEEDS.
 *    `private.inspection_report_submission` required eight ticks and nothing
 *    else. Submitting locks the report (no photo insert past `submitted_at`)
 *    and closes the inspection, while `agreement_open_rent_as` refuses a
 *    report with fewer than `money_policy.min_inspection_photos` photos. A
 *    renter who submitted first could never add the photos and never open
 *    the agreement, which is the only way to pay. For a listing whose intent
 *    is rent, submission now needs that many photos too, so the two rules
 *    agree and the report cannot be locked short. Other listings keep the
 *    eight-tick rule alone.
 *
 * No table, grant or policy changes. RLS is untouched.
 */

create or replace function private.inspection_report_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticked integer;
  photos integer;
  need_photos integer;
  is_rental boolean;
begin
  if new.submitted_at is null or old.submitted_at is not null then
    return new;
  end if;

  select count(*) into ticked
    from public.inspection_report_items i
   where i.inspection_id = new.inspection_id and i.checked;

  if ticked < 8 then
    raise exception 'an inspection report is submitted when all eight rooms are checked, and % of 8 are', ticked
      using errcode = 'check_violation';
  end if;

  /* The agreement is drawn up from this report, and `agreement_open_rent_as`
     needs this many photos. Once submitted, no photo can be added, so the
     same rule is held here or the renter is locked out of paying. */
  select l.listing_intent = 'rent' into is_rental
    from public.inspection_requests r
    join public.listings l on l.id = r.listing_id
   where r.id = new.inspection_id;

  if coalesce(is_rental, false) then
    select coalesce(m.min_inspection_photos, 0) into need_photos from public.money_policy m;
    select count(*) into photos from public.inspection_report_photos p where p.inspection_id = new.inspection_id;
    if photos < coalesce(need_photos, 0) then
      raise exception 'an inspection report for a rental is submitted with at least % photos, and % are attached',
        need_photos, photos
        using errcode = 'check_violation';
    end if;
  end if;

  /* The parent moves in the SAME TRANSACTION, so the existing
     `notify_inspection_change` tells both sides and the report cannot be
     signed without the inspection being closed. `guard_inspection_transition`
     permits CONFIRMED to COMPLETED for either party and refuses it for anybody
     else, so this does not widen who may close an inspection. */
  update public.inspection_requests
     set state = 'COMPLETED'::public.inspection_state
   where id = new.inspection_id
     and state = 'CONFIRMED'::public.inspection_state;

  return new;
end;
$$;

revoke all on function private.inspection_report_submission() from public, anon, authenticated;

drop trigger if exists inspection_requests_freeze_agreed_slot on public.inspection_requests;
create trigger inspection_requests_freeze_agreed_slot
  after insert or update of state on public.inspection_requests
  for each row execute function private.freeze_agreed_slot();

insert into private.inspection_slot_agreed (inspection_id, slot_at, agreed_at)
select r.id, coalesce(r.slot_at, r.requested_at), now()
  from public.inspection_requests r
 where r.state in ('CONFIRMED'::public.inspection_state, 'COMPLETED'::public.inspection_state)
on conflict (inspection_id) do nothing;

/* READ-BACK AND A BEHAVIOURAL PROBE. The probe runs on the one real (non
   example) rental listing, inside a block that always ends in a sentinel
   exception, so every row it writes (and every notification it queues) is
   rolled back. Every side effect of these triggers is a queue table, so
   nothing leaves the transaction. */
do $probe$
declare
  events integer;
  src text;
  lst uuid;
  asker uuid;
  insp uuid;
  refused boolean := false;
  final_state text;
begin
  select t.tgtype into events from pg_trigger t
   where t.tgname = 'inspection_requests_freeze_agreed_slot'
     and t.tgrelid = 'public.inspection_requests'::regclass;
  if events is null or (events & 4) = 0 or (events & 16) = 0 then
    raise exception 'probe: freeze_agreed_slot must fire on INSERT and UPDATE (tgtype %)', events;
  end if;

  select p.prosrc into src from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'inspection_report_submission';
  if src not like '%min_inspection_photos%' then
    raise exception 'probe: inspection_report_submission does not hold the photo rule';
  end if;

  if exists (select 1 from public.inspection_requests r
              where r.state in ('CONFIRMED', 'COMPLETED')
                and not exists (select 1 from private.inspection_slot_agreed a where a.inspection_id = r.id)) then
    raise exception 'probe: an agreed inspection is still missing its frozen slot';
  end if;

  select l.id into lst from public.listings l join public.agents a on a.id = l.agent_id
   where l.is_demo = false and l.listing_intent = 'rent' and l.closed_at is null limit 1;
  if lst is null then
    raise notice 'probe: no real rental listing to probe against; structural checks only';
    return;
  end if;
  select p.id into asker from public.profiles p
   where p.id <> (select a.user_id from public.listings l join public.agents a on a.id = l.agent_id where l.id = lst)
   limit 1;

  begin
    insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at, responded_at)
    values (lst, asker, asker, 'CONFIRMED', now() - interval '1 hour', now() - interval '1 hour', now())
    returning id into insp;

    if not exists (select 1 from private.inspection_slot_agreed a where a.inspection_id = insp) then
      raise exception 'probe: a row born CONFIRMED got no frozen slot';
    end if;

    insert into public.inspection_reports (inspection_id, author_id) values (insp, asker);
    insert into public.inspection_report_items (inspection_id, item, checked, checked_at)
    select insp, i, true, now()
      from unnest(array['exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall']) as i;

    begin
      update public.inspection_reports set submitted_at = now() where inspection_id = insp;
    exception when check_violation then
      refused := sqlerrm like '%photos%';
    end;
    if not refused then
      raise exception 'probe: a rental report with no photos was submitted';
    end if;

    insert into public.inspection_report_photos (inspection_id, storage_path)
    select insp, insp::text || '/' || gen_random_uuid()::text || '.jpg'
      from generate_series(1, (select m.min_inspection_photos from public.money_policy m));
    update public.inspection_reports set submitted_at = now() where inspection_id = insp;
    select r.state::text into final_state from public.inspection_requests r where r.id = insp;
    if final_state <> 'COMPLETED' then
      raise exception 'probe: a report with enough photos did not close the inspection (%)', final_state;
    end if;

    raise exception 'probe_ok';
  exception when others then
    if sqlerrm <> 'probe_ok' then
      raise;
    end if;
  end;
end;
$probe$;
