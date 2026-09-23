-- THE JUNCTION BETWEEN THE EMAIL LAYER AND THE TRIGGER LAYER.
--
-- WHAT WAS WRONG. This platform has two halves of one idea and only one of
-- them can reach a person who is not looking at their phone. The in-app
-- notification layer is complete and fires from inside the database: every
-- escrow door, every booking change, every wallet movement calls
-- `private.notify` under the same lock as the transition itself. The email
-- layer is complete too: a Resend client, a block renderer, 27 builders in
-- `lib/email/messages.ts` and 8 more in `lib/email/escrow-messages.ts`, all
-- rendered in fixtures, all under test.
--
-- THE TWO HAVE NO PATH BETWEEN THEM. `lib/notify/junction.ts` joins them for
-- one caller, the admin console, and it can only do that because an admin
-- decision is a server action that is already awaiting a database write. A
-- STATE CHANGE THAT A DATABASE FUNCTION MAKES CANNOT REACH THE EMAIL LAYER AT
-- ALL. There is no socket from Postgres to Resend, there should not be one,
-- and so eight escrow emails with fourteen renderings and seventeen tests
-- send to nobody, and a password change leaves the building in silence.
--
-- WHAT THIS IS. One durable table between the two, and the four functions
-- that make it safe. A trigger writes a row in the same transaction as the
-- state change it describes, so the email cannot exist without the event and
-- cannot be lost if the event rolls back. A scheduled job claims the due rows,
-- resolves the address itself, builds the message and settles each row by id.
--
-- THE FIVE PROPERTIES, AND WHERE EACH ONE LIVES.
--
-- 1. ONE EVENT, ONE EMAIL, FOR EVER. `dedupe_key` is unique and the enqueue is
--    `on conflict do nothing`. A trigger that fires twice for one transition,
--    a sweep that revisits a row, a hand-written requeue: all of them land on
--    the same key and the second one writes nothing. The key is composed by
--    the enqueuer from the subject, the event and the recipient, so it is
--    stable across retries and distinct across people.
--
-- 2. NEVER TWICE ON THE WIRE. The claim is a single UPDATE with
--    `for update skip locked`: a row leaves PENDING exactly once, into
--    SENDING, and two workers can never hold the same row. Nothing ever moves
--    a row OUT of SENDING except the worker that claimed it, by id. There is
--    deliberately no lease that returns a stale SENDING row to the queue,
--    because that is the one mechanism that can put a second copy of an email
--    on the wire: a worker that sent and then died would have its row handed
--    to somebody else. A row stuck in SENDING is therefore a fact a person
--    reads, not a retry, and `email_outbox_health` is how they read it.
--
-- 3. A FAILED SEND LOSES NOTHING. `email_outbox_settle(..., 'retry', ...)`
--    puts the row back to PENDING with `available_at` pushed out and
--    `attempts` up by one. Resend being down for an hour costs an hour, not
--    an email. After MAX attempts the row becomes FAILED, which is terminal
--    and loud.
--
-- 4. NOTHING HERE KNOWS AN ADDRESS. The table stores `user_id` and nothing
--    else about a person. The address is resolved at send time by the service
--    role through `lib/email/recipients.ts`, exactly as `announce` resolves
--    it, so a row read by anybody gives up no address, and the rule that an
--    address is never supplied by a caller survives the queue.
--
-- 5. A STUCK QUEUE IS VISIBLE. `email_outbox_health` returns the six numbers
--    the desk needs, in one round trip, and the drain job turns them into an
--    alert. A queue that is filling and not draining is the failure this shape
--    invites, and it is the one the reconciliation incident taught this
--    project to instrument before shipping rather than after.
--
-- WHAT IS NOT HERE. No address, no body, no subject: the payload is the
-- scalars of the event and the message is built in TypeScript at send time
-- from the same builders the fixtures render, so there is exactly one copy of
-- every sentence. No priority column: transactional mail has one priority.

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),

  /* One event, one recipient, one row, for ever. See property 1. */
  dedupe_key text not null,

  /* Which builder renders this, as `lib/notify/templates.ts` names it. */
  template text not null,

  /* WHO, never WHERE. The address is resolved at send time. See property 4. */
  user_id uuid not null references auth.users(id) on delete cascade,

  /* The event's scalars, snapshotted at the instant it happened. Snapshotted
     rather than re-read at send time because the row this describes may have
     moved on: an agreement that went HELD and then RELEASED inside one drain
     interval owes the reader both emails, each true when it was written. */
  payload jsonb not null default '{}'::jsonb,

  status text not null default 'PENDING'
    check (status in ('PENDING', 'SENDING', 'SENT', 'FAILED', 'DROPPED')),

  attempts integer not null default 0 check (attempts >= 0),

  /* Not before this instant. Backoff moves it; nothing else does. */
  available_at timestamptz not null default now(),

  claimed_at timestamptz,
  settled_at timestamptz,

  /* Why the last attempt did not land. A reason code and a trimmed message,
     never a payload and never an address. */
  last_error text check (char_length(last_error) <= 300),

  created_at timestamptz not null default now()
);

create unique index if not exists email_outbox_dedupe_key
  on public.email_outbox (dedupe_key);

/* The claim's own index: the due queue, oldest first, and nothing else. */
create index if not exists email_outbox_due
  on public.email_outbox (available_at)
  where status = 'PENDING';

/* The stuck watch reads this one. */
create index if not exists email_outbox_in_flight
  on public.email_outbox (claimed_at)
  where status = 'SENDING';

/* The desk's "what is broken" read. */
create index if not exists email_outbox_failed
  on public.email_outbox (created_at)
  where status = 'FAILED';

alter table public.email_outbox enable row level security;

/*
 * NO POLICY, DELIBERATELY, AND THAT IS THE WHOLE ACCESS RULE.
 *
 * RLS on with no policy means nobody reading through PostgREST sees a row,
 * including its own recipient. The queue is machinery: the person's copy of
 * what happened is the `notifications` row and the email itself. Only the
 * service role, which bypasses RLS, touches this table, and it reaches it
 * through the four functions below rather than by selecting it.
 */
revoke all on table public.email_outbox from anon, authenticated;

comment on table public.email_outbox is
  'Durable queue between a database state change and the email layer. Service role only; no RLS policy by design. Drained by /api/cron/email-outbox.';

/* ------------------------------------------------------------------------ */
/* THE ENQUEUE. Called by triggers, inside the transaction they guard.       */
/* ------------------------------------------------------------------------ */

create or replace function private.email_outbox_enqueue(
  p_user uuid,
  p_template text,
  p_dedupe_key text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if p_user is null or coalesce(btrim(p_template), '') = ''
     or coalesce(btrim(p_dedupe_key), '') = '' then
    return null;
  end if;

  insert into public.email_outbox (user_id, template, dedupe_key, payload)
  values (p_user, btrim(p_template), btrim(p_dedupe_key), coalesce(p_payload, '{}'::jsonb))
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  /* Null when the key was already there, which is a success: the email this
     row describes is already queued, sent, or deliberately given up on. */
  return v_id;
end;
$$;

revoke all on function private.email_outbox_enqueue(uuid, text, text, jsonb)
  from public, anon, authenticated;

/* ------------------------------------------------------------------------ */
/* THE CLAIM. One row leaves PENDING exactly once. See property 2.           */
/* ------------------------------------------------------------------------ */

create or replace function public.email_outbox_claim(p_limit integer default 50)
returns setof public.email_outbox
language sql
security definer
set search_path to 'public'
as $$
  update public.email_outbox o
     set status = 'SENDING',
         attempts = o.attempts + 1,
         claimed_at = now()
   where o.id in (
     select c.id
       from public.email_outbox c
      where c.status = 'PENDING'
        and c.available_at <= now()
      order by c.available_at, c.created_at
      limit greatest(1, least(coalesce(p_limit, 50), 200))
      for update skip locked
   )
  returning o.*;
$$;

revoke all on function public.email_outbox_claim(integer)
  from public, anon, authenticated;
grant execute on function public.email_outbox_claim(integer) to service_role;

/* ------------------------------------------------------------------------ */
/* THE SETTLE. The only way out of SENDING, and only by id.                  */
/* ------------------------------------------------------------------------ */

create or replace function public.email_outbox_settle(
  p_id uuid,
  /* 'sent' it went; 'retry' it did not and may; 'drop' it never can. */
  p_result text,
  p_error text default null,
  p_retry_seconds integer default 300,
  p_max_attempts integer default 5
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.email_outbox;
  v_next text;
begin
  if p_id is null then
    return null;
  end if;

  select * into v_row from public.email_outbox where id = p_id for update;
  if v_row.id is null then
    return null;
  end if;

  /* Only a claimed row settles. A settle against anything else is a bug
     upstream and must not silently rewrite a terminal row. */
  if v_row.status <> 'SENDING' then
    return v_row.status;
  end if;

  v_next := case
    when p_result = 'sent' then 'SENT'
    when p_result = 'drop' then 'DROPPED'
    /* Out of attempts is terminal and it is the loud kind. */
    when v_row.attempts >= greatest(1, coalesce(p_max_attempts, 5)) then 'FAILED'
    else 'PENDING'
  end;

  update public.email_outbox
     set status = v_next,
         last_error = left(nullif(btrim(coalesce(p_error, '')), ''), 300),
         settled_at = case when v_next = 'PENDING' then null else now() end,
         claimed_at = case when v_next = 'PENDING' then null else claimed_at end,
         available_at = case
           when v_next = 'PENDING'
             then now() + make_interval(secs => greatest(30, least(coalesce(p_retry_seconds, 300), 86400)))
           else available_at
         end
   where id = p_id;

  return v_next;
end;
$$;

revoke all on function public.email_outbox_settle(uuid, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.email_outbox_settle(uuid, text, text, integer, integer) to service_role;

/* ------------------------------------------------------------------------ */
/* THE HEALTH. Six numbers, one round trip. See property 5.                  */
/* ------------------------------------------------------------------------ */

create or replace function public.email_outbox_health(p_stuck_minutes integer default 30)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'pending', count(*) filter (where status = 'PENDING'),
    'due', count(*) filter (where status = 'PENDING' and available_at <= now()),
    'in_flight', count(*) filter (where status = 'SENDING'),
    /* Claimed and never settled: a worker died mid-send, or a send is hanging.
       Never retried automatically; see property 2. */
    'stuck', count(*) filter (
      where status = 'SENDING'
        and claimed_at < now() - make_interval(mins => greatest(5, coalesce(p_stuck_minutes, 30)))
    ),
    'failed', count(*) filter (where status = 'FAILED'),
    'oldest_due_seconds', coalesce(
      extract(epoch from (now() - min(available_at) filter (
        where status = 'PENDING' and available_at <= now()
      )))::bigint, 0)
  )
  from public.email_outbox;
$$;

revoke all on function public.email_outbox_health(integer)
  from public, anon, authenticated;
grant execute on function public.email_outbox_health(integer) to service_role;

/* ------------------------------------------------------------------------ */
/* RULE 21. BORN LOCKED, AND READ BACK RATHER THAN ASSUMED.                  */
/* ------------------------------------------------------------------------ */

do $$
declare
  v_open int;
  v_service int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where ((n.nspname = 'private' and p.proname = 'email_outbox_enqueue')
       or (n.nspname = 'public' and p.proname in
           ('email_outbox_claim', 'email_outbox_settle', 'email_outbox_health')))
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: % outbox function(s) are executable by anon or authenticated', v_open;
  end if;

  /* The other half of born locked: locked to the wrong roles is still broken.
     The drain runs as service_role and must be able to call all three. */
  select count(*) into v_service
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('email_outbox_claim', 'email_outbox_settle', 'email_outbox_health')
     and has_function_privilege('service_role', p.oid, 'EXECUTE');
  if v_service <> 3 then
    raise exception 'the drain cannot call its own functions: % of 3 executable by service_role', v_service;
  end if;

  if has_table_privilege('anon', 'public.email_outbox', 'SELECT')
     or has_table_privilege('authenticated', 'public.email_outbox', 'SELECT')
     or has_table_privilege('anon', 'public.email_outbox', 'INSERT')
     or has_table_privilege('authenticated', 'public.email_outbox', 'INSERT') then
    raise exception 'the outbox table is readable or writable by anon or authenticated';
  end if;
end
$$;
