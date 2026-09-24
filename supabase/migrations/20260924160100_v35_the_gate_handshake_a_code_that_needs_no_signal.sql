/*
 * V-35. THE GATE HANDSHAKE: A CODE THAT NEEDS NO SIGNAL ON EITHER PHONE.
 *
 * "The agent who is not the agent" happens at a gate, and the gate is the
 * moment of worst connectivity: estate basements, new blocks with no
 * coverage, data finished by Saturday. Every trust check that asks a server
 * fails exactly there. So this one does not ask a server at the gate.
 *
 * For each CONFIRMED inspection the database mints one random seed. It is
 * released, by `public.inspection_handshake`, to the two people on the
 * inspection and to nobody else: the lister (or the delegate the lister has
 * named AND who has accepted) as the one who SHOWS, the requester as the one
 * who CHECKS. Each phone keeps the seed in its own inspection pack while it
 * has signal, and at the gate both compute the same RFC 6238 six-digit code
 * from it and the clock (`apps/web/src/lib/offline/totp.ts`). When either
 * phone next has signal, what happened is recorded in
 * `public.inspection_checkins`.
 *
 * WHAT A MATCH PROVES, SAID EXACTLY. The code the person at the gate showed
 * is the one Vallo gave, for this inspection, to the account it has showing
 * it. Not that the person is verified (the verification ladder is a separate
 * fact), and not that the phone is in its owner's hand. The screen says "The
 * code matches the one Vallo gave {name} for this inspection", and no more.
 *
 * DELEGATES, BECAUSE LAGOS AGENTS SEND RUNNERS, AND ONLY WITH THEIR CONSENT.
 * The lister names one person by email. That person must have confirmed a
 * phone number or be an active member of a firm the lister is an active
 * member of (`firm_members`). Every refusal is the same answer, the name is
 * never echoed back, and naming is throttled (ten an hour per lister), so the
 * door is not an email-to-name lookup. The person named is asked, and the
 * seed reaches them only after they ACCEPT (`accept_inspection_delegation`).
 * Accepting, or clearing an accepted delegate, rotates the seed so a replaced
 * runner's pack proves nothing; because that makes the renter's saved pack
 * stale, the renter is notified to open Vallo once with signal, and no change
 * is allowed inside the three hours before the slot, when the renter may
 * already be on the road.
 *
 * "THIS WAS NOT ME" ROTATES TOO. When `report_not_me` (V-19) writes its audit
 * row, every seed on an inspection that person is party to is deleted, so a
 * pack copied onto a thief's phone stops matching the next time either party
 * refreshes.
 *
 * THE ENTRY NAMED TWO COLUMNS ON `inspection_requests` (`delegate_user_id`,
 * `handshake_secret`). Both are tables here instead: the seed in `private`,
 * which no API role can read, and the delegate as a row with its basis, who
 * named it and when it was accepted. Nothing on `inspection_requests` changes.
 *
 * THE WINDOW. The seed is released from confirmation until 24 hours after the
 * slot, and the pack on each phone deletes itself at the same moment.
 *
 * NO LOCATION IS RECORDED, and the pack carries the listing's area and state
 * only, never its free-text title, which a lister can fill with a street.
 */

-- ----------------------------------------------------------------------------
-- THE SEED. PRIVATE SCHEMA, NO API ROLE CAN READ IT.

create table if not exists private.inspection_handshake_seeds (
  inspection_id uuid primary key references public.inspection_requests(id) on delete cascade,
  seed bytea not null check (octet_length(seed) = 20),
  created_at timestamptz not null default now()
);

revoke all on table private.inspection_handshake_seeds from public, anon, authenticated;

comment on table private.inspection_handshake_seeds is
  'V-35. One random 160-bit seed per inspection, released only by public.inspection_handshake to the parties. Rotated when a delegate accepts or an accepted one is replaced or cleared, and after the person reports a sign-in was not them.';

-- ----------------------------------------------------------------------------
-- THE DELEGATE. WHO, ON WHAT BASIS, NAMED BY WHOM.

create table if not exists public.inspection_delegates (
  inspection_id uuid primary key references public.inspection_requests(id) on delete cascade,
  delegate_user_id uuid not null references auth.users(id) on delete cascade,
  basis text not null check (basis in ('phone_confirmed', 'firm_member')),
  named_by uuid not null references auth.users(id) on delete cascade,
  named_at timestamptz not null default now(),
  /* Null until the person named says yes. Only then does the seed reach them. */
  accepted_at timestamptz
);

alter table public.inspection_delegates enable row level security;
/* BORN LOCKED, and it stays locked: every read goes through the definer
   function below, which decides what each party may see. */
revoke all on table public.inspection_delegates from public, anon, authenticated;

comment on table public.inspection_delegates is
  'V-35. The one person a lister has named to show an inspection in their place. Read and written only through inspection_handshake and name_inspection_delegate.';

-- ----------------------------------------------------------------------------
-- WHAT HAPPENED AT THE GATE, RECORDED WHEN A PHONE NEXT HAD SIGNAL.

create table if not exists public.inspection_checkins (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspection_requests(id) on delete cascade,
  recorded_by uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('shower', 'checker')),
  result text not null check (result in ('shown', 'match', 'mismatch', 'skipped')),
  /* When it happened on the phone, which may be hours before it arrived. */
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  constraint inspection_checkins_role_result check (
    (role = 'shower' and result = 'shown')
    or (role = 'checker' and result in ('match', 'mismatch', 'skipped'))
  ),
  /* A phone that retries its queue after a dropped reply lands on the same
     row rather than a second one. */
  unique (inspection_id, recorded_by, result, observed_at)
);

create index if not exists inspection_checkins_inspection_idx
  on public.inspection_checkins (inspection_id, observed_at desc);

alter table public.inspection_checkins enable row level security;
revoke all on table public.inspection_checkins from public, anon, authenticated;
grant select on table public.inspection_checkins to authenticated;

/* The two parties to the inspection read its check-ins. The subquery runs
   under the caller's own RLS on inspection_requests, which already limits a
   person to the inspections they are on. */
drop policy if exists inspection_checkins_select_party on public.inspection_checkins;
create policy inspection_checkins_select_party on public.inspection_checkins
  for select to authenticated
  using (
    recorded_by = (select auth.uid())
    or exists (
      select 1 from public.inspection_requests r
       where r.id = inspection_checkins.inspection_id
         and (r.requester_id = (select auth.uid()) or r.lister_id = (select auth.uid()))
    )
  );

comment on table public.inspection_checkins is
  'V-35. What each phone recorded at the gate: the shower showed a code, the checker matched it, did not, or was shown none. Written only by record_inspection_checkin. No location, ever.';

-- ----------------------------------------------------------------------------
-- A PERSON'S NAME, AS THE PRODUCT ALREADY PRINTS IT.

create or replace function private.person_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(
    nullif(btrim(p.display_name), ''),
    nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.surname, '')), '')
  )
    from public.profiles p
   where p.id = p_user;
$$;

revoke all on function private.person_name(uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- WHO SHOWS IT: THE LISTER, OR AN ACCEPTED DELEGATE.

create or replace function private.active_delegate(p_inspection uuid)
returns uuid
language sql
stable
security definer
set search_path to ''
as $$
  select d.delegate_user_id from public.inspection_delegates d
   where d.inspection_id = p_inspection and d.accepted_at is not null;
$$;

revoke all on function private.active_delegate(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- THE PACK'S SECRET HALF, FOR THE TWO PARTIES ONLY.

create or replace function public.inspection_handshake(p_inspection uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
  r public.inspection_requests%rowtype;
  d public.inspection_delegates%rowtype;
  v_active uuid;
  v_role text;
  v_seed bytea;
  v_expires timestamptz;
  v_area text;
  v_state text;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into r from public.inspection_requests where id = p_inspection;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into d from public.inspection_delegates where inspection_id = p_inspection;
  v_active := case when d.accepted_at is not null then d.delegate_user_id else null end;
  select l.area, l.state_code into v_area, v_state from public.listings l where l.id = r.listing_id;

  /* Named and not yet accepted: the person may see the invitation and
     nothing else. No seed until they say yes. */
  if d.delegate_user_id is not null and actor = d.delegate_user_id and d.accepted_at is null then
    /* Only while the inspection can still be shown: an invitation to a
       cancelled or finished inspection is not one. */
    if r.state not in ('REQUESTED'::public.inspection_state, 'PROPOSED'::public.inspection_state,
                       'CONFIRMED'::public.inspection_state)
       or (r.slot_at is not null and now() >= r.slot_at + interval '24 hours') then
      return jsonb_build_object('status', 'not_found');
    end if;
    return jsonb_build_object(
      'status', 'invite',
      'principal_name', private.person_name(r.lister_id),
      'slot_at', r.slot_at,
      'area', v_area,
      'state', v_state
    );
  end if;

  v_role := case
    when actor = r.requester_id then 'checker'
    when actor = r.lister_id or actor = v_active then 'shower'
    else null
  end;
  /* A stranger is told the same as for an inspection that does not exist. */
  if v_role is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if r.state <> 'CONFIRMED'::public.inspection_state or r.slot_at is null then
    return jsonb_build_object('status', 'not_ready');
  end if;

  v_expires := r.slot_at + interval '24 hours';
  if now() >= v_expires then
    return jsonb_build_object('status', 'expired');
  end if;

  insert into private.inspection_handshake_seeds (inspection_id, seed)
  values (p_inspection, extensions.gen_random_bytes(20))
  on conflict (inspection_id) do nothing;
  select s.seed into v_seed from private.inspection_handshake_seeds s where s.inspection_id = p_inspection;

  return jsonb_build_object(
    'status', 'ok',
    'viewer', actor,
    'role', v_role,
    'seed', encode(v_seed, 'hex'),
    'slot_at', r.slot_at,
    'expires_at', v_expires,
    /* The area and state only: the free-text title can carry a street. */
    'area', v_area,
    'state', v_state,
    'shown_by_name', private.person_name(coalesce(v_active, r.lister_id)),
    'principal_name', private.person_name(r.lister_id),
    'is_delegate', v_active is not null,
    'can_name_delegate', actor = r.lister_id
  );
end;
$$;

revoke all on function public.inspection_handshake(uuid) from public, anon, authenticated;
grant execute on function public.inspection_handshake(uuid) to authenticated;

comment on function public.inspection_handshake(uuid) is
  'V-35. Releases the per-inspection TOTP seed to the requester (checker) and to the lister or an ACCEPTED delegate (shower), only while CONFIRMED and until 24 hours after the slot. A delegate who has not accepted sees an invitation only.';

-- ----------------------------------------------------------------------------
-- NAMING WHO SHOWS IT. THROTTLED, NEVER ECHOES A NAME, ASKS FIRST.

create or replace function public.name_inspection_delegate(p_inspection uuid, p_email text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
  r public.inspection_requests%rowtype;
  d public.inspection_delegates%rowtype;
  v_delegate uuid;
  v_basis text;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;

  select * into r from public.inspection_requests where id = p_inspection;
  if not found or r.lister_id <> actor then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.state not in ('REQUESTED'::public.inspection_state, 'PROPOSED'::public.inspection_state,
                     'CONFIRMED'::public.inspection_state) then
    return jsonb_build_object('status', 'closed');
  end if;
  /* Inside three hours of a confirmed slot the renter may already be on the
     road with the pack they have; a change now would make it stop matching. */
  if r.state = 'CONFIRMED'::public.inspection_state and r.slot_at is not null
     and r.slot_at - now() < interval '3 hours' then
    return jsonb_build_object('status', 'too_late');
  end if;
  if not private.consume_rate_limit('inspection_delegate', actor::text, 10, 3600) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  select * into d from public.inspection_delegates where inspection_id = p_inspection;

  if v_email = '' then
    /* Nobody named: nothing to clear, nothing to write down. */
    if d.inspection_id is null then
      return jsonb_build_object('status', 'cleared', 'rotated', false);
    end if;
    delete from public.inspection_delegates where inspection_id = p_inspection;
    if d.accepted_at is not null then
      /* A delegate who could show it no longer can: rotate, and tell the
         renter their pack needs signal once. */
      delete from private.inspection_handshake_seeds where inspection_id = p_inspection;
      perform private.notify(
        r.requester_id, 'listing'::public.notification_kind,
        'Your inspection code has changed',
        'The person showing your inspection has changed. Open the inspection once while you have signal so your gate code matches.',
        '/inspections'
      );
    end if;
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'inspection.delegate_cleared', 'inspection', p_inspection::text, '{}'::jsonb);
    return jsonb_build_object('status', 'cleared', 'rotated', d.accepted_at is not null);
  end if;

  select u.id into v_delegate from auth.users u where lower(u.email) = v_email and u.deleted_at is null;

  /* Nor the renter's own shadow (V-58's identity keys, V-100's review): a
     delegate who shares a mailbox, phone, card or bank account with the
     renter could record "shown" for them and hand their passport an
     inspection nobody attended. Answered "asked" like every other refusal. */
  if v_delegate is not null and v_delegate <> actor and v_delegate <> r.requester_id
     and cardinality(private.shares_identity_with(v_delegate, r.requester_id)) = 0 then
    select 'phone_confirmed' into v_basis
      from auth.users u where u.id = v_delegate and u.phone_confirmed_at is not null;
    if v_basis is null then
      select 'firm_member' into v_basis
        from public.firm_members fd
        join public.agents ad on ad.id = fd.agent_id
       where ad.user_id = v_delegate and fd.status = 'active'
         and fd.firm_id in (
           select fl.firm_id from public.firm_members fl
             join public.agents al on al.id = fl.agent_id
            where al.user_id = actor and fl.status = 'active')
       limit 1;
    end if;
  end if;

  /* ONE ANSWER, "asked", whether or not the address belongs to somebody who
     may show it: "no account", "that is you", "that is the renter", "not
     eligible" and success all read the same, with no name, so this cannot be
     used to learn who holds an email address. Only an eligible person is
     written down and notified. */
  if v_basis is null then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'inspection.delegate_not_named', 'inspection', p_inspection::text, '{}'::jsonb);
    return jsonb_build_object('status', 'asked');
  end if;

  insert into public.inspection_delegates (inspection_id, delegate_user_id, basis, named_by, named_at, accepted_at)
  values (p_inspection, v_delegate, v_basis, actor, now(), null)
  on conflict (inspection_id) do update
    set delegate_user_id = excluded.delegate_user_id,
        basis = excluded.basis,
        named_by = excluded.named_by,
        named_at = now(),
        accepted_at = null;

  /* A previously ACCEPTED delegate is replaced: their pack must stop working. */
  if d.accepted_at is not null and d.delegate_user_id is distinct from v_delegate then
    delete from private.inspection_handshake_seeds where inspection_id = p_inspection;
    perform private.notify(
      r.requester_id, 'listing'::public.notification_kind,
      'Your inspection code has changed',
      'The person showing your inspection has changed. Open the inspection once while you have signal so your gate code matches.',
      '/inspections'
    );
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'inspection.delegate_named', 'inspection', p_inspection::text,
          jsonb_build_object('delegate', v_delegate, 'basis', v_basis));

  perform private.notify(
    v_delegate,
    'agent'::public.notification_kind,
    'You have been asked to show an inspection',
    coalesce(private.person_name(actor), 'A lister') || ' asked you to show an inspection for them. Open it to say yes or no.',
    '/inspections/gate/' || p_inspection::text
  );

  return jsonb_build_object('status', 'asked');
end;
$$;

revoke all on function public.name_inspection_delegate(uuid, text) from public, anon, authenticated;
grant execute on function public.name_inspection_delegate(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- THE PERSON NAMED SAYS YES OR NO.

create or replace function public.answer_inspection_delegation(p_inspection uuid, p_accept boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
  r public.inspection_requests%rowtype;
  d public.inspection_delegates%rowtype;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into d from public.inspection_delegates where inspection_id = p_inspection for update;
  if not found or d.delegate_user_id <> actor or d.accepted_at is not null then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into r from public.inspection_requests where id = p_inspection;
  /* Saying yes (or no) to an inspection that can no longer be shown ends it. */
  if r.state not in ('REQUESTED'::public.inspection_state, 'PROPOSED'::public.inspection_state,
                     'CONFIRMED'::public.inspection_state) then
    delete from public.inspection_delegates where inspection_id = p_inspection;
    return jsonb_build_object('status', 'not_found');
  end if;

  if not coalesce(p_accept, false) then
    delete from public.inspection_delegates where inspection_id = p_inspection;
    perform private.notify(
      r.lister_id, 'listing'::public.notification_kind,
      'The person you asked said no',
      'They will not show this inspection. You are showing it yourself unless you ask somebody else.',
      '/agent/inspections'
    );
    return jsonb_build_object('status', 'declined');
  end if;

  if r.state = 'CONFIRMED'::public.inspection_state and r.slot_at is not null
     and r.slot_at - now() < interval '3 hours' then
    return jsonb_build_object('status', 'too_late');
  end if;

  update public.inspection_delegates set accepted_at = now() where inspection_id = p_inspection;
  /* The shower changed: rotate, and tell the renter to refresh once. */
  delete from private.inspection_handshake_seeds where inspection_id = p_inspection;
  perform private.notify(
    r.requester_id, 'listing'::public.notification_kind,
    'Your inspection code has changed',
    coalesce(private.person_name(actor), 'Somebody') || ' will show your inspection for ' || coalesce(private.person_name(r.lister_id), 'the lister') || '. Open the inspection once while you have signal so your gate code matches.',
    '/inspections'
  );
  perform private.notify(
    r.lister_id, 'listing'::public.notification_kind,
    'The person you asked said yes',
    coalesce(private.person_name(actor), 'They') || ' will show this inspection for you.',
    '/agent/inspections'
  );
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'inspection.delegate_accepted', 'inspection', p_inspection::text, '{}'::jsonb);
  return jsonb_build_object('status', 'accepted');
end;
$$;

revoke all on function public.answer_inspection_delegation(uuid, boolean) from public, anon, authenticated;
grant execute on function public.answer_inspection_delegation(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- RECORDING THE GATE, LATER.

create or replace function public.record_inspection_checkin(
  p_inspection uuid,
  p_result text,
  p_observed_at timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  actor uuid := (select auth.uid());
  r public.inspection_requests%rowtype;
  v_role text;
begin
  if actor is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select * into r from public.inspection_requests where id = p_inspection;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  v_role := case
    when actor = r.requester_id then 'checker'
    when actor = r.lister_id or actor = private.active_delegate(p_inspection) then 'shower'
    else null
  end;
  if v_role is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.slot_at is null then
    return jsonb_build_object('status', 'not_ready');
  end if;

  /* A phone's clock is a claim. Accept it inside the window the pack was
     valid for (a day either side of the slot) and not from the future. */
  if p_observed_at is null
     or p_observed_at > now() + interval '5 minutes'
     or p_observed_at < r.slot_at - interval '24 hours'
     or p_observed_at > r.slot_at + interval '24 hours' then
    return jsonb_build_object('status', 'out_of_window');
  end if;

  begin
    insert into public.inspection_checkins (inspection_id, recorded_by, role, result, observed_at)
    values (p_inspection, actor, v_role, p_result, p_observed_at)
    on conflict (inspection_id, recorded_by, result, observed_at) do nothing;
  exception when check_violation then
    return jsonb_build_object('status', 'bad_result');
  end;

  return jsonb_build_object('status', 'ok', 'role', v_role);
end;
$$;

revoke all on function public.record_inspection_checkin(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_inspection_checkin(uuid, text, timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- "THIS WAS NOT ME" ROTATES EVERY SEED THE PERSON COULD HOLD.

create or replace function private.rotate_handshakes_after_not_me()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.action = 'security.not_me' and new.actor_id is not null then
    delete from private.inspection_handshake_seeds s
     using public.inspection_requests r
     where s.inspection_id = r.id
       and (r.requester_id = new.actor_id
            or r.lister_id = new.actor_id
            or private.active_delegate(r.id) = new.actor_id);
  end if;
  return new;
exception when others then
  /* Never let a rotation failure undo the audit row or the hold. */
  raise warning '[v35] handshake rotation after not_me failed: %', sqlstate;
  return new;
end;
$$;

revoke all on function private.rotate_handshakes_after_not_me() from public, anon, authenticated;

drop trigger if exists audit_log_rotate_handshakes_after_not_me on public.audit_log;
create trigger audit_log_rotate_handshakes_after_not_me
  after insert on public.audit_log
  for each row
  when (new.action = 'security.not_me')
  execute function private.rotate_handshakes_after_not_me();

-- ----------------------------------------------------------------------------
-- READ BACK.

do $$
begin
  if has_table_privilege('authenticated', 'private.inspection_handshake_seeds', 'SELECT')
     or has_table_privilege('anon', 'private.inspection_handshake_seeds', 'SELECT') then
    raise exception 'the handshake seeds are readable by an API role';
  end if;
  /* has_table_privilege answers for the named role (a grant to PUBLIC
     included); information_schema's grant views answer only for the
     observer, and pass by seeing nothing. */
  if has_table_privilege('anon', 'public.inspection_delegates', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.inspection_delegates', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'inspection_delegates is not born locked';
  end if;
  if has_table_privilege('anon', 'public.inspection_checkins', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.inspection_checkins',
                            'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'inspection_checkins grants more than select to authenticated';
  end if;
  if has_function_privilege('anon', 'public.inspection_handshake(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.name_inspection_delegate(uuid, text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.record_inspection_checkin(uuid, text, timestamptz)', 'EXECUTE')
     or has_function_privilege('anon', 'public.answer_inspection_delegation(uuid, boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.person_name(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.active_delegate(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.rotate_handshakes_after_not_me()', 'EXECUTE') then
    raise exception 'a V-35 function is executable by a role that should not hold it';
  end if;
end
$$;
