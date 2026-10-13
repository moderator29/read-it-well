set lock_timeout = '5s';

-- --------------------------------------------------------------------- 2
create or replace function private.notify_inspection_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  property  text;
  asker     text;
  asked_at  text;
  slot_at   text;
  actor     uuid := auth.uid();
  video     boolean := new.visit_mode = 'video';  -- visit_mode
begin
  select l.title into property from public.listings l where l.id = new.listing_id;
  property := coalesce(property, 'the property');

  asked_at := to_char(new.requested_at at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  slot_at  := to_char(coalesce(new.slot_at, new.requested_at) at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI') || ' Lagos time';
  asker := coalesce(
    (select p.display_name from public.profiles p where p.id = new.requester_id),
    'Somebody'
  );

  if tg_op = 'INSERT' then
    if new.state = 'CONFIRMED' then
      perform private.notify(
        new.requester_id,
        'listing',
        case when video then 'Video visit booked' else 'Viewing booked' end,
        property || ' on ' || slot_at || '. The lister is expecting you.' ||
          case when video then ' Join the video call from your visit.' else '' end,
        '/inspections'
      );
      perform private.notify(
        new.lister_id,
        'listing',
        case when video then 'Video visit booked' else 'Viewing booked' end,
        asker || ' booked ' || slot_at || ' to see ' || property || '.' ||
          case when video then ' It is a video visit: call them in the conversation at that time.' else '' end,
        '/agent/inspections'
      );
      return new;
    end if;
    perform private.notify(
      new.lister_id,
      'listing',
      case when video then 'Video visit requested' else 'Inspection requested' end,
      asker || case when video then ' wants a video visit of ' else ' wants to see ' end ||
        property || ' on ' || asked_at || '. Confirm, offer another time, or decline.',
      '/agent/inspections'
    );
    return new;
  end if;

  if new.state is distinct from old.state then
    if new.state = 'CONFIRMED' then
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
  end if;

  return new;
end;
$fn$;
