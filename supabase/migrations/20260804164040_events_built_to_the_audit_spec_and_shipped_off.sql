-- Events, built to section 6 of docs/SOCIAL_AUDIT.md.
--
-- This is the one social feature where the product puts two strangers in the
-- same physical room, and the audit is explicit that the unblocker is not a
-- schema: it is slice 4 proven in production and a named person watching a
-- queue. So it ships behind its own flag, OFF, and the launch condition is
-- written into the flag's own note rather than into somebody's memory.
--
-- Building it now is not the same as turning it on. Every rule the audit says
-- must live in the database rather than in code lives here, and each one is
-- probed. What is left is the human part, which no migration can supply.
--
-- THERE IS NO PRICE COLUMN, and that is the decision rather than an omission.
-- The platform charges no fees anywhere, and a ticketed event is a payment
-- surface with a refund policy, a chargeback path and a dispute process behind
-- it. A nullable price would be the first thing somebody filled in.

create type public.event_venue_kind as enum ('PUBLIC_VENUE', 'ESTATE_COMMON', 'ONLINE');
create type public.event_status     as enum ('DRAFT', 'LIVE', 'HELD', 'CANCELLED', 'REMOVED');
create type public.event_attendance as enum ('GOING', 'WAITLIST', 'WITHDRAWN');

comment on type public.event_venue_kind is
  'A private residence is deliberately not an option. The enum is what makes that unarguable, rather than a policy somebody has to remember.';

create table public.events (
  id             uuid primary key default gen_random_uuid(),
  area_id        uuid not null references public.areas (id) on delete cascade,
  host_id        uuid not null references auth.users (id) on delete cascade,
  post_id        uuid references public.posts (id) on delete set null,

  title          text not null check (length(btrim(title)) between 3 and 120),
  blurb          text check (blurb is null or length(blurb) <= 600),

  starts_at      timestamptz not null,
  ends_at        timestamptz,

  venue_label    text not null check (length(btrim(venue_label)) between 3 and 120),
  venue_kind     public.event_venue_kind not null,

  capacity       integer check (capacity is null or capacity between 2 and 500),
  attending_count integer not null default 0 check (attending_count >= 0),

  status         public.event_status not null default 'LIVE',
  hold_reason    text,
  hidden_by      uuid references auth.users (id) on delete set null,

  cancelled_at   timestamptz,
  cancel_reason  text,

  created_at     timestamptz not null default now(),
  edited_at      timestamptz,

  constraint events_ends_after_starts_chk check (ends_at is null or ends_at > starts_at),
  constraint events_cancelled_has_reason_chk check (
    status <> 'CANCELLED' or (cancelled_at is not null and coalesce(btrim(cancel_reason), '') <> '')
  )
);

comment on table public.events is
  'One named host, a place, a public venue in words, and no money. host_id is never null and never a group: somebody is accountable, and that is the whole safety model.';
comment on column public.events.venue_label is
  'A public place named in words. Never coordinates and never an address field, because a precise home address on a public row is the harm.';

create index events_area_idx     on public.events (area_id, starts_at) where status = 'LIVE';
create index events_host_idx     on public.events (host_id, starts_at desc);
create index events_post_idx     on public.events (post_id);
create index events_hidden_idx   on public.events (hidden_by);
create index events_upcoming_idx on public.events (starts_at) where status = 'LIVE';

create table public.event_attendees (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  state      public.event_attendance not null default 'GOING',
  joined_at  timestamptz not null default now(),
  decided_at timestamptz,
  primary key (event_id, user_id)
);

comment on table public.event_attendees is
  'Never public. A list of who is going where and when is a stalking surface, and there is no version of this feature where publishing it is worth it.';

create index event_attendees_user_idx on public.event_attendees (user_id, joined_at desc);

/*
 * A verified phone, an account older than thirty days, and no upheld report in
 * ninety. Anything softer and the first abuse case is a throwaway account made
 * that morning.
 */
create or replace function private.may_host_event(p_user uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $fn$
  select exists (
    select 1
      from auth.users u
      join public.profiles p on p.id = u.id
     where u.id = p_user
       and u.phone_confirmed_at is not null
       and p.created_at <= now() - interval '30 days'
       and not exists (
         select 1 from public.reports r
          where r.target_type = 'user' and r.target_id = p_user::text
            and r.status = 'resolved'
            and r.resolved_at >= now() - interval '90 days'
       )
  );
$fn$;
revoke execute on function private.may_host_event(uuid) from public;
grant  execute on function private.may_host_event(uuid) to authenticated;

create or replace function private.can_see_event(p_event uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.events e join public.areas a on a.id = e.area_id
     where e.id = p_event
       and (e.status in ('LIVE', 'CANCELLED') or e.host_id = (select auth.uid()))
       and a.status in ('ACTIVE', 'PAUSED')
       and not private.blocked_with(e.host_id)
  );
$fn$;
revoke execute on function private.can_see_event(uuid) from public;
grant  execute on function private.can_see_event(uuid) to anon, authenticated;

create or replace function private.guard_event_write()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare slow boolean;
begin
  if pg_trigger_depth() > 1 then return new; end if;

  if tg_op = 'INSERT' then
    if not private.may_host_event(new.host_id) then
      raise exception 'You cannot host an event yet. Confirm your phone number, and come back when your account is thirty days old.'
        using errcode = 'RM030';
    end if;
    select slow_mode into slow from public.areas where id = new.area_id;
    if slow then
      raise exception 'This place is in slow mode, so events are paused here for now.'
        using errcode = 'RM031';
    end if;
    if new.starts_at <= now() then
      raise exception 'An event has to start in the future.' using errcode = 'RM032';
    end if;
    return new;
  end if;

  new.id         := old.id;
  new.host_id    := old.host_id;
  new.area_id    := old.area_id;
  new.created_at := old.created_at;
  new.attending_count := old.attending_count;

  if not (private.has_role((select auth.uid()), 'admin')
          or private.has_role((select auth.uid()), 'super_admin')) then
    if old.status in ('HELD', 'REMOVED') then new.status := old.status; end if;
    new.hidden_by   := old.hidden_by;
    new.hold_reason := old.hold_reason;

    /* An event in the past is read only. The night it happened is a fact now. */
    if old.starts_at <= now() and new.status <> 'CANCELLED' then
      raise exception 'That event has already started, so it cannot be changed.'
        using errcode = 'RM033';
    end if;
  end if;

  if new.status = 'CANCELLED' and old.status <> 'CANCELLED' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  if (new.title is distinct from old.title or new.blurb is distinct from old.blurb
      or new.starts_at is distinct from old.starts_at
      or new.venue_label is distinct from old.venue_label) then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;

  return new;
end;
$fn$;
revoke execute on function private.guard_event_write() from public, anon, authenticated;
create trigger events_zz_guard before insert or update on public.events
  for each row execute function private.guard_event_write();

create or replace function private.scan_event()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  keyword_pattern constant text := '(payment|transfer|pay me|account number|acct|bank)';
  words text; reason text; sev public.alert_severity;
begin
  if tg_op = 'UPDATE'
     and new.title is not distinct from old.title
     and new.blurb is not distinct from old.blurb then
    return new;
  end if;

  words := coalesce(new.title, '') || ' ' || coalesce(new.blurb, '');

  if words ~ '\d{10}' then
    reason := 'an account number'; sev := 'high';
  elsif words ~* keyword_pattern then
    reason := 'payment language'; sev := 'medium';
  end if;

  if reason is not null then
    new.status      := 'HELD';
    new.hold_reason := 'This mentions ' || reason || '. Somebody is reading it before it goes up.';
    insert into public.risk_alerts (severity, title, description, entity_type, entity_id)
    values (sev, 'Event held for review',
      'An event contained ' || reason || ' and was held before it became public.',
      'event', new.id::text);
  end if;

  return new;
end;
$fn$;
revoke execute on function private.scan_event() from public, anon, authenticated;
create trigger events_scan before insert or update on public.events
  for each row execute function private.scan_event();

/*
 * Capacity is decided INSIDE the insert, never by reading a count first. Two
 * people tapping at the same moment both read the same number and both take the
 * last place; the row lock here means the second one becomes a waitlist row
 * instead of an overbooking.
 */
create or replace function private.place_event_attendee()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare e public.events; taken integer;
begin
  select * into e from public.events where id = new.event_id for update;

  if e.id is null then
    raise exception 'That event is gone.' using errcode = 'RM034';
  end if;
  if e.status <> 'LIVE' then
    raise exception 'That event is not taking people right now.' using errcode = 'RM035';
  end if;
  if e.starts_at <= now() then
    raise exception 'That event has already started.' using errcode = 'RM033';
  end if;
  if private.blocked_with(e.host_id) then
    raise exception 'That event is not available to you.' using errcode = 'RM036';
  end if;

  if new.state = 'GOING' and e.capacity is not null then
    select count(*) into taken from public.event_attendees
     where event_id = new.event_id and state = 'GOING';
    if taken >= e.capacity then
      new.state := 'WAITLIST';
    end if;
  end if;

  return new;
end;
$fn$;
revoke execute on function private.place_event_attendee() from public, anon, authenticated;
create trigger event_attendees_place before insert on public.event_attendees
  for each row execute function private.place_event_attendee();

create or replace function private.bump_event_attending()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' then
    if new.state = 'GOING' then
      update public.events set attending_count = attending_count + 1 where id = new.event_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.state = 'GOING' then
      update public.events set attending_count = greatest(attending_count - 1, 0) where id = old.event_id;
    end if;
  else
    if old.state = 'GOING' and new.state <> 'GOING' then
      update public.events set attending_count = greatest(attending_count - 1, 0) where id = new.event_id;
    elsif old.state <> 'GOING' and new.state = 'GOING' then
      update public.events set attending_count = attending_count + 1 where id = new.event_id;
    end if;
  end if;
  return null;
end;
$fn$;
revoke execute on function private.bump_event_attending() from public, anon, authenticated;
create trigger event_attendees_count after insert or delete or update of state on public.event_attendees
  for each row execute function private.bump_event_attending();

/*
 * The most important notification in the feature. Somebody has arranged their
 * evening around this, and a cancellation they only discover by turning up is
 * the failure the whole feature is judged on. It fires in the same trigger that
 * writes `cancelled_at`, so no code path can cancel quietly.
 */
create or replace function private.notify_event_change()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare a record;
begin
  if new.status = 'CANCELLED' and old.status <> 'CANCELLED' then
    for a in select user_id from public.event_attendees
              where event_id = new.id and state in ('GOING', 'WAITLIST') loop
      perform private.notify(a.user_id, 'social', 'An event you were going to is cancelled',
        new.title || ': ' || coalesce(nullif(btrim(new.cancel_reason), ''), 'the host called it off.'),
        '/events/' || new.id);
    end loop;

  elsif new.status = 'HELD' and old.status <> 'HELD' then
    perform private.notify(new.host_id, 'social', 'Your event is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      '/events/' || new.id);

  elsif new.status = 'LIVE' and old.status = 'HELD' then
    perform private.notify(new.host_id, 'social', 'Your event is live',
      'The check finished and it is showing again.', '/events/' || new.id);

  elsif new.status = 'REMOVED' and new.hidden_by is not null then
    perform private.notify(new.host_id, 'social', 'Your event was removed',
      coalesce(nullif(btrim(new.hold_reason), ''), 'It broke the rules of the place it was posted in.'),
      '/events/' || new.id);

  elsif new.starts_at is distinct from old.starts_at or new.venue_label is distinct from old.venue_label then
    for a in select user_id from public.event_attendees
              where event_id = new.id and state = 'GOING' loop
      perform private.notify(a.user_id, 'social', 'An event you are going to has changed',
        new.title || ' is now at ' || new.venue_label || '.', '/events/' || new.id);
    end loop;
  end if;

  return new;
end;
$fn$;
revoke execute on function private.notify_event_change() from public, anon, authenticated;
create trigger events_notify after update on public.events
  for each row execute function private.notify_event_change();

create or replace function private.notify_event_insert()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'HELD' then
    perform private.notify(new.host_id, 'social', 'Your event is being checked',
      'It is not showing publicly while somebody looks at it. Most checks finish quickly.',
      '/events/' || new.id);
  end if;
  return new;
end;
$fn$;
revoke execute on function private.notify_event_insert() from public, anon, authenticated;
create trigger events_notify_insert after insert on public.events
  for each row execute function private.notify_event_insert();

alter table public.events          enable row level security;
alter table public.event_attendees enable row level security;

create policy events_select on public.events for select
  using (
    (status in ('LIVE', 'CANCELLED') or host_id = (select auth.uid()))
    and exists (select 1 from public.areas a where a.id = area_id and a.status in ('ACTIVE', 'PAUSED'))
    and not private.blocked_with(host_id)
  );

create policy events_insert_self on public.events for insert to authenticated
  with check (
    host_id = (select auth.uid())
    and status in ('LIVE', 'HELD')
    and exists (select 1 from public.areas a where a.id = area_id and a.status = 'ACTIVE')
  );

create policy events_update_own on public.events for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy events_admin_write on public.events for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

/*
 * Your own row, the host's view of their own event, and staff. Nobody else,
 * ever. This is the policy the whole feature's safety rests on.
 */
create policy event_attendees_select on public.event_attendees for select
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.events e where e.id = event_id and e.host_id = (select auth.uid()))
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

create policy event_attendees_insert_self on public.event_attendees for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_see_event(event_id));

create policy event_attendees_update_self on public.event_attendees for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy event_attendees_delete_self on public.event_attendees for delete to authenticated
  using (user_id = (select auth.uid()));

insert into public.feature_flags (key, enabled, note) values
  ('events', false,
   'Meetups. Built to SOCIAL_AUDIT section 6 and OFF until slice 4 safety is proven in production and a named person is watching the moderation queue. That is the unblocker, not this schema.')
on conflict (key) do update set note = excluded.note;
