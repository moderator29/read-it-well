-- A stop needs a word to the person it happened to.
--
-- `private.suspend_agent` and `private.reinstate_agent` both shipped in
-- 20260805110426 and both work. Neither said anything to the agent.
--
-- Somebody's account stops trading, every live listing they have comes down,
-- and the first they learn of it is the empty screen. `public.notifications`
-- has carried an `agent` kind since the beginning and nothing was using it.
-- The reason is theirs to read in particular: it is the whole basis on which
-- they can answer it.
--
-- Only the notification is new. Both bodies are otherwise the ones that
-- already shipped, reproduced in full because `create or replace function`
-- takes a whole body and a partial one here would silently drop the rest.
--
-- A note on the first draft of this migration, which is worth keeping because
-- the mistake is an easy one to repeat. It added a second function,
-- `lift_agent_suspension`, doing what `reinstate_agent` already did. The search
-- that went looking for an existing lift tried `lift_agent_suspension`,
-- `lift_agent` and `restore_agent`, and missed the name that was actually
-- there. The duplicate is dropped at the foot of this file for the database it
-- reached; a replay from an empty database never creates it.
--
-- What that near miss did confirm: `agent_suspensions_one_live`, a unique index
-- on `agent_id where lifted_at is null`, means `reinstate_agent` can select the
-- open stop without an order or a limit and still be deterministic. That is the
-- index doing the work, not luck.

create or replace function private.suspend_agent(
  acting_admin uuid,
  target_agent uuid,
  stop_reason  text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  agent_row     public.agents;
  withdrawable  public.listing_status[] := array[
                  'PUBLISHED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'MORE_INFO_REQUIRED'
                ]::public.listing_status[];
  taken         jsonb;
  ahead         integer;
  record_id     uuid;
begin
  if acting_admin is null or target_agent is null then
    return jsonb_build_object('status', 'bad_request');
  end if;

  if stop_reason is null or length(btrim(stop_reason)) = 0 then
    return jsonb_build_object('status', 'no_reason');
  end if;
  if length(btrim(stop_reason)) > 2000 then
    return jsonb_build_object('status', 'reason_too_long');
  end if;

  -- SECURITY DEFINER means this function is the last gate, so it proves the
  -- role here rather than trusting a caller that says it already did.
  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into agent_row from public.agents where id = target_agent for update;

  if agent_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if agent_row.status = 'SUSPENDED'::public.agent_application_status then
    return jsonb_build_object('status', 'already_suspended');
  end if;
  if agent_row.status <> 'APPROVED'::public.agent_application_status then
    return jsonb_build_object('status', 'not_trading', 'agent_status', agent_row.status);
  end if;

  -- Confirmed stays whose last night is still ahead. Counted, told to the
  -- operator, never cancelled: the guest paid and the guest keeps it.
  select count(*) into ahead
    from public.bookings b
    join public.listings l on l.id = b.listing_id
   where l.agent_id = agent_row.id
     and b.status = 'CONFIRMED'::public.booking_status
     and b.check_out >= (now() at time zone 'Africa/Lagos')::date;

  -- Lock every listing of theirs before reading it, so nothing publishes in the
  -- gap between working out what is live and taking it down.
  perform 1 from public.listings where agent_id = agent_row.id for update;

  select coalesce(
           jsonb_agg(jsonb_build_object('id', l.id, 'from', l.status::text) order by l.created_at),
           '[]'::jsonb
         )
    into taken
    from public.listings l
   where l.agent_id = agent_row.id
     and l.status = any(withdrawable);

  -- The agent goes down FIRST. The listings trigger reads agents.status, and
  -- SUSPENDED is one of the three statuses it always allows, so the order is
  -- safe in this direction and wrong in the other.
  update public.agents
     set status = 'SUSPENDED'::public.agent_application_status
   where id = agent_row.id
     and status = 'APPROVED'::public.agent_application_status;

  if not found then
    raise exception 'agent % could not be suspended from %', agent_row.id, agent_row.status;
  end if;

  update public.listings
     set status = 'SUSPENDED'::public.listing_status
   where agent_id = agent_row.id
     and status = any(withdrawable);

  insert into public.agent_suspensions
    (agent_id, reason, withdrawn, stays_ahead, suspended_by)
  values
    (agent_row.id, btrim(stop_reason), taken, ahead, acting_admin)
  returning id into record_id;

  -- The person this happened to hears it from us, not from an empty screen.
  -- The confirmed stays are named on purpose: an agent whose listings have all
  -- gone should not have to guess whether their booked guests went with them.
  perform private.notify(
    agent_row.user_id,
    'agent'::public.notification_kind,
    'Your account has been stopped',
    btrim(stop_reason)
      || case
           when jsonb_array_length(taken) = 0 then ''
           when jsonb_array_length(taken) = 1 then ' Your listing has come down while this stands.'
           else ' ' || jsonb_array_length(taken)::text
                || ' of your listings have come down while this stands.'
         end
      || case
           when ahead = 0 then ''
           when ahead = 1 then ' One confirmed stay ahead of you is untouched and the guest keeps it.'
           else ' ' || ahead::text
                || ' confirmed stays ahead of you are untouched and those guests keep them.'
         end,
    '/agent'
  );

  return jsonb_build_object(
    'status', 'ok',
    'agent_id', agent_row.id,
    'user_id', agent_row.user_id,
    'display_name', agent_row.display_name,
    'suspension_id', record_id,
    'withdrawn', taken,
    'withdrawn_count', jsonb_array_length(taken),
    'stays_ahead', ahead
  );
end;
$fn$;

create or replace function private.reinstate_agent(
  acting_admin uuid,
  target_agent uuid,
  note         text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  agent_row  public.agents;
  stop_row   public.agent_suspensions;
  item       jsonb;
  back       jsonb := '[]'::jsonb;
begin
  if acting_admin is null or target_agent is null then
    return jsonb_build_object('status', 'bad_request');
  end if;
  if note is not null and length(btrim(note)) > 2000 then
    return jsonb_build_object('status', 'note_too_long');
  end if;

  if not (private.has_role(acting_admin, 'admin'::public.app_role)
          or private.has_role(acting_admin, 'super_admin'::public.app_role)) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into agent_row from public.agents where id = target_agent for update;

  if agent_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if agent_row.status <> 'SUSPENDED'::public.agent_application_status then
    return jsonb_build_object('status', 'not_suspended', 'agent_status', agent_row.status);
  end if;

  -- No order and no limit, and still exactly one row: agent_suspensions_one_live
  -- is a unique index on agent_id where lifted_at is null.
  select * into stop_row
    from public.agent_suspensions
   where agent_id = agent_row.id and lifted_at is null
   for update;

  -- The agent comes back FIRST, or the listings trigger refuses every restore.
  update public.agents
     set status = 'APPROVED'::public.agent_application_status
   where id = agent_row.id
     and status = 'SUSPENDED'::public.agent_application_status;

  if not found then
    raise exception 'agent % could not be reinstated', agent_row.id;
  end if;

  -- Put back exactly what this suspension took down, and only where it is still
  -- where the suspension left it. A listing the agent has since edited into a
  -- draft, or one an admin has rejected in the meantime, stays as it is.
  if stop_row.id is not null then
    for item in select value from jsonb_array_elements(stop_row.withdrawn) loop
      update public.listings
         set status = (item ->> 'from')::public.listing_status
       where id = (item ->> 'id')::uuid
         and agent_id = agent_row.id
         and status = 'SUSPENDED'::public.listing_status;

      if found then
        back := back || jsonb_build_array(item);
      end if;
    end loop;

    update public.agent_suspensions
       set lifted_at = now(),
           lifted_by = acting_admin,
           lift_note = nullif(btrim(coalesce(note, '')), ''),
           restored  = back
     where id = stop_row.id;
  end if;

  -- The same courtesy on the way back. The count is what actually moved, not
  -- what the stop took, because those two can differ and the agent is about to
  -- go and look.
  perform private.notify(
    agent_row.user_id,
    'agent'::public.notification_kind,
    'Your account is trading again',
    case
      when jsonb_array_length(back) = 0 then
        'The stop on your account has been lifted. You can publish again.'
      when jsonb_array_length(back) = 1 then
        'The stop on your account has been lifted and your listing is back where it was.'
      else
        'The stop on your account has been lifted and '
        || jsonb_array_length(back)::text
        || ' of your listings are back where they were.'
    end,
    '/agent'
  );

  return jsonb_build_object(
    'status', 'ok',
    'agent_id', agent_row.id,
    'user_id', agent_row.user_id,
    'display_name', agent_row.display_name,
    'suspension_id', stop_row.id,
    'restored', back,
    'restored_count', jsonb_array_length(back),
    'withdrawn_count', coalesce(jsonb_array_length(stop_row.withdrawn), 0)
  );
end;
$fn$;

-- The duplicate described at the top. `if exists` because a database replayed
-- from empty never had it.
drop function if exists public.lift_agent_suspension(uuid, uuid, text);
drop function if exists private.lift_agent_suspension(uuid, uuid, text);
