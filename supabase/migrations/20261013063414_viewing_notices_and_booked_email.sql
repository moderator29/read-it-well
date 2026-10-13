-- Applied 13 October 2026, part of the viewing no-show and both-sides reminders migration (founder decisions, round 2).
-- Dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

create or replace function private.notify_inspection_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  property  text;
  asker     text;
  asked_at  text;
  slot_at   text;
  actor     uuid := auth.uid();
begin
  select l.title into property from public.listings l where l.id = new.listing_id;
  property := coalesce(property, 'the property');

  /* Rendered in Lagos, never in the server's zone, and said as such, so the
     hour in the notification is the hour somebody has to be at the gate,
     whichever zone their phone is in. */
  asked_at := to_char(new.requested_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  slot_at  := to_char(coalesce(new.slot_at, new.requested_at) at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  asker := coalesce(
    (select p.display_name from public.profiles p where p.id = new.requester_id),
    'Somebody'
  );

  if tg_op = 'INSERT' then
    if new.state = 'CONFIRMED' then
      /* V-94: a slot booked from a viewing window. Nothing to answer; both
         sides only need to know where to be and when. */
      perform private.notify(
        new.requester_id,
        'listing',
        'Viewing booked',
        property || ' on ' || slot_at || '. The lister is expecting you.',
        '/inspections'
      );
      perform private.notify(
        new.lister_id,
        'listing',
        'Viewing booked',
        asker || ' booked ' || slot_at || ' to see ' || property || '.',
        '/agent/inspections'
      );
      return new;
    end if;
    perform private.notify(
      new.lister_id,
      'listing',
      'Inspection requested',
      asker || ' wants to see ' || property || ' on ' || asked_at || '. Confirm, offer another time, or decline.',
      '/agent/inspections'
    );
    return new;
  end if;

  -- Only a change of state is news. A note edited, a slot re-saved with the
  -- same state, or an update that changes nothing stays silent.
  if new.state is distinct from old.state then
    if new.state = 'CONFIRMED' then
      /* The renter hears unless the renter is the one who moved it (taking
         the lister's offered time); then the lister is the one to tell. */
      if actor is distinct from new.requester_id then
        perform private.notify(
          new.requester_id,
          'listing',
          'Inspection confirmed',
          property || ' on ' || slot_at || '. The lister is expecting you.',
          '/inspections'
        );
      end if;
      if old.state = 'PROPOSED' and actor is distinct from new.lister_id then
        perform private.notify(
          new.lister_id,
          'listing',
          'Inspection time accepted',
          asker || ' will see ' || property || ' on ' || slot_at || '.',
          '/agent/inspections'
        );
      end if;
    elsif new.state = 'PROPOSED' then
      perform private.notify(
        new.requester_id,
        'listing',
        case when old.state = 'CONFIRMED' then 'Viewing moved' else 'Another time offered' end,
        'The lister of ' || property || ' can do ' || slot_at || ' instead. Accept it, or reply in the thread.',
        '/inspections'
      );
    elsif new.state = 'DECLINED' then
      if old.state = 'CONFIRMED' then
        perform private.notify(
          new.requester_id,
          'listing',
          'Viewing cancelled',
          'The lister cancelled the viewing of ' || property || ' on ' ||
            to_char(old.slot_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time.' ||
            case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
                 then ' ' || left(btrim(new.lister_note), 120) else '' end,
          '/inspections'
        );
      else
        perform private.notify(
          new.requester_id,
          'listing',
          'Inspection declined',
          property || ' is not available to view on ' || asked_at || '.' ||
            case when new.lister_note is not null and length(btrim(new.lister_note)) > 0
                 then ' ' || left(btrim(new.lister_note), 120) else '' end,
          '/inspections'
        );
      end if;
    elsif new.state = 'WITHDRAWN' then
      perform private.notify(
        new.lister_id,
        'listing',
        case when old.state = 'CONFIRMED' then 'Viewing cancelled' else 'Inspection withdrawn' end,
        asker || ' no longer needs to see ' || property || ' on ' || slot_at || '.',
        '/agent/inspections'
      );
    elsif new.state = 'COMPLETED' then
      perform private.notify(
        new.requester_id,
        'listing',
        'Inspection complete',
        'Your visit to ' || property || ' is recorded as done.',
        '/inspections'
      );
      perform private.notify(
        new.lister_id,
        'listing',
        'Inspection complete',
        'The visit to ' || property || ' by ' || asker || ' is recorded as done.',
        '/agent/inspections'
      );
    end if;
    /* NO_SHOW is announced by report_inspection_no_show, which knows who
       reported it and who is said to have stayed away. */
  end if;

  return new;
end;
$function$;

create or replace function private.enqueue_inspection_booked_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE' and old.state is not distinct from new.state then
    return new;
  end if;
  if new.state <> 'CONFIRMED' then
    return new;
  end if;
  /* Without a time there is nothing to put in the email, and the message is
     entirely about where to be and when. */
  if new.slot_at is null then
    return new;
  end if;

  perform private.email_outbox_enqueue(
    new.requester_id,
    'inspection.scheduled',
    'inspection:' || new.id::text || ':CONFIRMED:' || new.requester_id::text || ':' || extract(epoch from new.slot_at)::bigint::text,
    jsonb_build_object(
      'inspection_id', new.id,
      'listing_id', new.listing_id,
      'audience', 'viewer',
      'counterparty_id', new.lister_id,
      'slot_at', new.slot_at
    )
  );

  if new.lister_id is not null then
    perform private.email_outbox_enqueue(
      new.lister_id,
      'inspection.scheduled',
      'inspection:' || new.id::text || ':CONFIRMED:' || new.lister_id::text || ':' || extract(epoch from new.slot_at)::bigint::text,
      jsonb_build_object(
        'inspection_id', new.id,
        'listing_id', new.listing_id,
        'audience', 'lister',
        'counterparty_id', new.requester_id,
        'slot_at', new.slot_at
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_inspection_booked_email() from public, anon, authenticated;
