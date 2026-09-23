-- PUSH, PART TWO: THE PATH FROM AN EVENT TO A HANDSET, AND ITS WITNESS.
--
-- ============================================================================
-- WHY THIS HANGS OFF `notifications` AND NOT OFF THE JUNCTION.
--
-- `lib/notify/junction.ts` is the email and notification junction, written
-- this week, and push is meant to be a third channel hanging off it. It is
-- not edited here, and this is not avoidance: a trigger on
-- `public.notifications` is a STRICTLY WIDER seam than the junction is.
--
-- The junction writes an in-app row by inserting into `public.notifications`.
-- So does `private.notify`, which the junction's own file calls "the one door
-- every in-app notification goes through, from eleven triggers and two
-- service-role call sites". Hooking the TABLE catches both doors and every
-- door built after this one, including the events the junction's own header
-- says it cannot serve because only a database trigger can see them (a new
-- enquiry, a saved search match).
--
-- The junction's header also says "NO OUTBOX, YET", and names a durable
-- outbox as the missing piece for exactly those events. This is that outbox,
-- built for push. Nothing in `lib/notify` or `lib/email` changes; nothing in
-- them needs to know this exists.
--
-- THE CONSEQUENCE, STATED PLAINLY: an event that never writes a
-- `notifications` row will never push. Five events in the gap matrix are in
-- that position today. That is a list, not a hole in this design, and it is
-- recorded in the ledger rather than papered over here.
--
-- ============================================================================
-- TWO TABLES, BECAUSE "SENT TWICE" HAS TWO DIFFERENT CAUSES.
--
-- `push_queue`  one row per EVENT per person. `notification_id` is UNIQUE,
--               so an event cannot be queued twice however many times the
--               trigger fires or a retry runs.
--
-- `push_deliveries`  one row per (event, device). `(queue_id, token_id)` is
--               UNIQUE, so a retry that re-reads the queue cannot send again
--               to a device that already took it.
--
-- One table could not do both. With only the queue, a run that reached two of
-- a person's three handsets and then died would, on retry, either send twice
-- to the first two or never reach the third. The second table is what makes
-- the retry exact instead of approximate.
--
-- ============================================================================
-- WHAT THE DELIVERY ROW IS REALLY FOR, AND IT IS NOT BOOKKEEPING.
--
-- THIS PLATFORM LOST 24 DAYS TO A JOB THAT REPORTED SUCCESS FOR HANDING A
-- PAYLOAD TO SOMETHING IT NEVER READ THE REPLY FROM. `push_deliveries` exists
-- so that cannot happen here. `provider_status` is the HTTP status the push
-- service actually returned, and a delivery is not `sent` because we posted
-- it; it is `sent` because a 201 came back and was written down. A row that
-- reads `state='sending'` with a null `provider_status` is the shape of that
-- exact fault, and `public.push_queue_health` counts those on purpose.
--
-- NO TOKEN EVER LANDS HERE. `push_deliveries` references a token by its id
-- and carries `device_ref` for reading, never the token itself, and
-- `provider_error` holds the provider's error CODE and not its body, because
-- some providers echo the registration token back inside an error message.
--
-- ============================================================================
-- WHAT IS DELIBERATELY NOT IN SQL.
--
-- Quiet hours, the channel preference and the collapsing of a held backlog
-- are NOT decided here. They live in `lib/push/` where they are pure
-- functions with tests. The trigger below asks one question only, and it is
-- the one question SQL is the right place for: is there anywhere to send at
-- all. Everything else is policy, policy changes, and a policy that lives in
-- a migration can only be changed by another migration.
--
-- The trigger therefore queues rows that will sometimes be suppressed a
-- moment later. That is intended: a suppressed row is a recorded decision,
-- and `outcome` says which decision it was.

-- ----------------------------------------------------------------------------
-- STATES.

create type public.push_queue_state as enum (
  /* Waiting for the next drain. */
  'pending',
  /* Inside the person's quiet hours. `not_before` says when it opens. */
  'held',
  /* A drain has claimed it. Stale claims are reaped; see the reaper below. */
  'sending',
  /* Settled, one way or another. `outcome` says which way. */
  'done',
  /* The attempt failed and will be retried. */
  'failed',
  /* Out of attempts. Never retried, kept for the record. */
  'dead'
);

create type public.push_queue_outcome as enum (
  /* At least one device took it. */
  'delivered',
  /* The person has push off for this kind. */
  'suppressed_preference',
  /* Every device this person had was retired before the drain reached it. */
  'suppressed_no_device',
  /* Held or stuck past its usefulness. A push about a three-hour-old event
     is noise, and a queue that recovers after an outage must not fire a
     week of backlog at somebody's lock screen. */
  'suppressed_expired',
  /* Folded into another row's summary after quiet hours. `collapsed_into`
     names the row that carried it. */
  'collapsed',
  /* Every device failed and the attempts ran out. */
  'gave_up'
);

create type public.push_delivery_state as enum (
  /* Posted to the provider, no reply read yet. A row sitting here is the
     24-day fault in miniature and the health view counts it. */
  'sending',
  /* The provider answered 2xx and the status is recorded below. */
  'sent',
  /* The provider answered, and it was not 2xx. Retryable. */
  'failed',
  /* The provider said this token is gone. The token has been retired. */
  'gone'
);

-- ----------------------------------------------------------------------------
-- THE QUEUE.

create table public.push_queue (
  id uuid primary key default gen_random_uuid(),

  /* THE IDEMPOTENCY KEY, AND IT IS NOT A HASH OF ANYTHING.
     The event already has an identity: the notification row it wrote. Using
     it directly means the question "have we already queued this event" is
     answered by a unique constraint rather than by a convention two files
     have to agree about. */
  notification_id uuid not null unique
    references public.notifications (id) on delete cascade,

  user_id uuid not null references auth.users (id) on delete cascade,

  state public.push_queue_state not null default 'pending',
  outcome public.push_queue_outcome,

  /* Not before this instant. Quiet hours move it forward; a failed attempt
     moves it forward by a backoff the drain chooses. */
  not_before timestamptz not null default now(),

  /* After this, the row is stale and is settled `suppressed_expired` rather
     than sent. See the note on that outcome. */
  expires_at timestamptz not null default (now() + interval '12 hours'),

  attempts integer not null default 0,

  /* The claim. `claim_token` is a drain's own id, so a reply arriving from a
     drain that has already been reaped cannot settle a row another drain now
     holds. */
  claimed_at timestamptz,
  claim_token uuid,

  /* The row whose summary carried this one, when `outcome = 'collapsed'`. */
  collapsed_into uuid references public.push_queue (id) on delete set null,

  /* Machine tokens only: `provider_500`, `no_credentials`, `timeout`.
     NEVER a provider body, never a token, never anything a person wrote. */
  last_error text,

  created_at timestamptz not null default now(),
  settled_at timestamptz,

  /* A settled row has an outcome and a time; an unsettled row has neither.
     Without this, a row can quietly become `done` with no record of why,
     which is the state that makes a queue impossible to audit. */
  constraint push_queue_settled_pair check (
    (state in ('done', 'dead') and outcome is not null and settled_at is not null)
    or (state not in ('done', 'dead') and outcome is null and settled_at is null)
  ),

  constraint push_queue_collapsed_pair check (
    collapsed_into is null or outcome = 'collapsed'
  )
);

comment on table public.push_queue is
  'One row per event per person, keyed by the notifications row that raised it. Written by a trigger on public.notifications; settled by the drain in lib/push. The unique on notification_id is what makes an event impossible to queue twice.';

/* The drain's claim query, in index order: what is due, oldest first. */
create index push_queue_due_idx
  on public.push_queue (not_before, created_at)
  where state in ('pending', 'held', 'failed');

/* The reaper's query: claims that have gone stale. */
create index push_queue_claimed_idx
  on public.push_queue (claimed_at)
  where state = 'sending';

/* Collapsing reads a person's held backlog together. */
create index push_queue_user_open_idx
  on public.push_queue (user_id, not_before)
  where state in ('pending', 'held', 'failed');

-- ----------------------------------------------------------------------------
-- THE WITNESS.

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),

  queue_id uuid not null references public.push_queue (id) on delete cascade,
  token_id uuid not null references public.push_tokens (id) on delete cascade,

  /* Copied at attempt time so the record survives the token's retirement and
     so nothing joining to this table ever has to touch `push_tokens`. This
     is the safe handle, never the capability. */
  device_ref text not null,
  platform public.push_platform not null,

  state public.push_delivery_state not null default 'sending',
  attempts integer not null default 1,

  /* THE PROVIDER'S OWN REPLY, READ AND WRITTEN DOWN. A null here on a row
     that is not `sending` would mean we settled without reading, and the
     check below refuses that. */
  provider_status integer,
  /* The provider's message identifier when it gives one. Opaque, theirs. */
  provider_message_id text,
  /* The provider's error CODE, not its body. Bodies echo tokens back. */
  provider_error text,

  attempted_at timestamptz not null default now(),
  settled_at timestamptz,

  /* ONE ATTEMPT PER EVENT PER DEVICE. The retry safety net. */
  constraint push_deliveries_once unique (queue_id, token_id),

  /* A settled delivery must carry the status that settled it. This is the
     constraint that makes "we posted it and called it sent" impossible. */
  constraint push_deliveries_read_the_reply check (
    state = 'sending' or provider_status is not null
  )
);

comment on table public.push_deliveries is
  'One row per (event, device). provider_status is the status the push service actually returned; a settled row without one is refused by a check constraint, because this platform has already lost 24 days to a job that reported success for a reply it never read.';

comment on column public.push_deliveries.provider_error is
  'The provider error CODE only. Never the response body: FCM and APNs both echo the registration token back inside some error payloads, and a token must never leave push_tokens.';

create index push_deliveries_queue_idx on public.push_deliveries (queue_id);
create index push_deliveries_token_idx on public.push_deliveries (token_id);
/* "Is this device failing repeatedly", and the health view's unread count. */
create index push_deliveries_state_idx on public.push_deliveries (state, attempted_at);

-- ----------------------------------------------------------------------------
-- THE TRIGGER. ONE QUESTION, AND IT CANNOT BREAK THE EVENT THAT RAISED IT.

create or replace function private.push_enqueue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  /* NOTHING IN HERE MAY THROW.
     This fires inside the transaction that confirms a booking, moves money
     or posts a message. A push that fails to queue costs a notification; an
     exception escaping here costs the write. The whole body is wrapped, and
     the wrap is the point of the function rather than a precaution. */
  begin
    if new.user_id is null then
      return new;
    end if;

    /* THE ONE QUESTION SQL IS THE RIGHT PLACE FOR. Everything else is policy
       and policy lives in lib/push. Without this test a person who has never
       granted the permission, which is most people, would accumulate a queue
       row for every notification they ever receive, forever. */
    if not exists (
      select 1
        from public.push_tokens t
       where t.user_id = new.user_id
         and t.revoked_at is null
    ) then
      return new;
    end if;

    insert into public.push_queue (notification_id, user_id)
    values (new.id, new.user_id)
    on conflict (notification_id) do nothing;
  exception
    when others then
      /* Deliberately swallowed, deliberately not logged: the only context
         available here is the notification row, and that is a person's
         content. The health view is how a queue that stopped filling becomes
         visible, not a log line nobody reads. */
      return new;
  end;

  return new;
end;
$$;

comment on function private.push_enqueue() is
  'AFTER INSERT on public.notifications: queues a push when the person has at least one live device. Never throws; a push that cannot be queued must never cost the write that raised it.';

create trigger notifications_push_enqueue
  after insert on public.notifications
  for each row
  execute function private.push_enqueue();

-- ----------------------------------------------------------------------------
-- THE REAPER. A DRAIN THAT DIED MID FLIGHT MUST NOT STRAND ITS ROWS.
--
-- A claim is not a lock. If a drain is killed between claiming and settling,
-- its rows sit in `sending` forever and the queue silently stops moving for
-- them. This hands them back. The delivery rows already written keep their
-- `(queue_id, token_id)` uniqueness, so the retry resumes rather than
-- repeats.

create or replace function private.push_reap_stale_claims(p_older_than interval default interval '10 minutes')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reaped integer;
begin
  update public.push_queue
     set state = 'failed',
         claim_token = null,
         claimed_at = null,
         last_error = 'claim_expired',
         not_before = now()
   where state = 'sending'
     and claimed_at is not null
     and claimed_at < now() - p_older_than;
  get diagnostics v_reaped = row_count;
  return v_reaped;
end;
$$;

comment on function private.push_reap_stale_claims(interval) is
  'Hands back queue rows whose drain died mid flight. Without it a killed drain stops the queue for its claimed rows and nothing says so.';

-- ----------------------------------------------------------------------------
-- THE DESK. A STUCK OR FAILING QUEUE HAS TO BE VISIBLE WITHOUT ANYBODY
-- KNOWING TO GO AND LOOK.
--
-- Two halves. This view is the one somebody reads on purpose. The alert rows
-- the drain and the scheduler write into `risk_alerts` are the half that
-- comes and finds them, and `/admin/alerts` already carries a badge in the
-- rail, so push failures arrive on a desk that exists rather than needing a
-- new one built.

create or replace view public.push_queue_health
with (security_invoker = true)
as
select
  count(*) filter (where q.state = 'pending')                            as pending,
  count(*) filter (where q.state = 'held')                               as held,
  count(*) filter (where q.state = 'sending')                            as sending,
  count(*) filter (where q.state = 'failed')                             as failed,
  count(*) filter (where q.state = 'dead')                               as dead,

  /* THE NUMBER THAT MATTERS MOST. How long the oldest thing nobody has sent
     has been waiting. A queue that is failing shows here before it shows
     anywhere else, and a queue that is merely busy does not. */
  coalesce(
    extract(epoch from (now() - min(q.not_before)
      filter (where q.state in ('pending', 'failed') and q.not_before <= now()))),
    0
  )::bigint                                                              as oldest_due_seconds,

  /* Claims older than the reaper's window that the reaper has not yet run
     on: a drain that is dying rather than merely slow. */
  count(*) filter (
    where q.state = 'sending' and q.claimed_at < now() - interval '10 minutes'
  )                                                                      as stale_claims,

  count(*) filter (
    where q.state = 'done' and q.outcome = 'delivered' and q.settled_at > now() - interval '1 hour'
  )                                                                      as delivered_last_hour,
  count(*) filter (
    where q.state = 'dead' and q.settled_at > now() - interval '1 hour'
  )                                                                      as gave_up_last_hour
from public.push_queue q;

comment on view public.push_queue_health is
  'One row. What the push queue is doing right now. security_invoker, so it is filtered by the row level security on push_queue and shows figures to staff only.';

-- ----------------------------------------------------------------------------
-- BORN LOCKED. RULE 21.
--
-- Restated in full, because it is the rule this migration could most easily
-- get wrong: A TABLE IS BORN LOCKED, NEVER BORN PUBLIC. Row level security on
-- before anything else, every grant revoked from `public`, `anon` and
-- `authenticated`, and then only what a named surface genuinely needs handed
-- back, to a named role, under a named policy.
--
-- Neither of these tables is a person's content. They are the machinery that
-- carries somebody else's content, and the only human who has any business
-- reading them is a member of staff looking at why the queue is stuck. So:
-- staff read, nobody writes, and the service role does the work.

alter table public.push_queue enable row level security;
alter table public.push_deliveries enable row level security;

revoke all on table public.push_queue from public, anon, authenticated;
revoke all on table public.push_deliveries from public, anon, authenticated;
revoke all on public.push_queue_health from public, anon, authenticated;

grant select on table public.push_queue to authenticated;
grant select on table public.push_deliveries to authenticated;
grant select on public.push_queue_health to authenticated;

/* The same predicate `risk_alerts` uses, so the push desk and the alerts desk
   are open to exactly the same people and there is no second answer to the
   question of who is staff. */
create policy push_queue_staff_read on public.push_queue
  for select
  to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::app_role)
    or private.has_role((select auth.uid()), 'super_admin'::app_role)
  );

create policy push_deliveries_staff_read on public.push_deliveries
  for select
  to authenticated
  using (
    private.has_role((select auth.uid()), 'admin'::app_role)
    or private.has_role((select auth.uid()), 'super_admin'::app_role)
  );

/* No write policy on either table, for any role but the service role. */

/* The two functions are private and nothing outside the database calls them.
   `push_enqueue` is a trigger function, which PostgreSQL fires without
   consulting EXECUTE on the invoking role, so revoking costs nothing and
   keeps it off the list of private functions carrying a grant they do not
   need. */
revoke all on function private.push_enqueue() from public, anon, authenticated;
revoke all on function private.push_reap_stale_claims(interval) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- READ THE LOCK BACK, AND READ IT BACK WITH THE RIGHT INSTRUMENT.
--
-- THE PREVIOUS MIGRATION IN THIS SERIES GOT THIS WRONG AND IT IS WORTH THE
-- PARAGRAPH. `20260923092729_push_one_...` asserted its grants against
-- `information_schema.role_table_grants`. That view only shows rows where the
-- CURRENT role is the grantor, the grantee, or a member of the grantee, so
-- under the migration role it came back EMPTY and the assertion passed by
-- finding nothing rather than by finding nothing wrong. It was the same shape
-- of fault as a job that reports success for a reply it never read, in the
-- very block written to prevent it.
--
-- `has_table_privilege` asks the server the question directly and cannot come
-- back empty. Everything below uses it, and it re-checks `push_tokens` too,
-- so the previous migration's claim is finally proved rather than assumed.

do $$
declare
  v_rel text;
  v_bad text := '';
begin
  foreach v_rel in array array['public.push_tokens', 'public.push_queue', 'public.push_deliveries']
  loop
    /* anon must hold nothing on any of them. */
    if has_table_privilege('anon', v_rel, 'SELECT')
      or has_table_privilege('anon', v_rel, 'INSERT')
      or has_table_privilege('anon', v_rel, 'UPDATE')
      or has_table_privilege('anon', v_rel, 'DELETE') then
      v_bad := v_bad || format('%s: anon holds a privilege. ', v_rel);
    end if;

    /* authenticated may read and may do nothing else. */
    if not has_table_privilege('authenticated', v_rel, 'SELECT') then
      v_bad := v_bad || format('%s: authenticated lost SELECT. ', v_rel);
    end if;
    if has_table_privilege('authenticated', v_rel, 'INSERT')
      or has_table_privilege('authenticated', v_rel, 'UPDATE')
      or has_table_privilege('authenticated', v_rel, 'DELETE') then
      v_bad := v_bad || format('%s: authenticated holds a write. ', v_rel);
    end if;

    /* And the read has to be gated by a policy, or the grant is the whole
       story and every signed-in person reads the table. */
    if not (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = split_part(v_rel, '.', 1) and c.relname = split_part(v_rel, '.', 2)) then
      v_bad := v_bad || format('%s: row level security is off. ', v_rel);
    end if;
  end loop;

  if v_bad <> '' then
    raise exception 'REFUSING, not born locked: %', v_bad;
  end if;
end $$;

do $$
declare
  v_write_policies int;
begin
  select count(*) into v_write_policies
    from pg_policies
   where schemaname = 'public'
     and tablename in ('push_tokens', 'push_queue', 'push_deliveries')
     and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  if v_write_policies <> 0 then
    raise exception 'REFUSING: % write policies across the push tables; every write is service role only', v_write_policies;
  end if;
end $$;

do $$
begin
  if has_function_privilege('anon', 'private.push_enqueue()', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.push_enqueue()', 'EXECUTE')
    or has_function_privilege('anon', 'private.push_reap_stale_claims(interval)', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.push_reap_stale_claims(interval)', 'EXECUTE') then
    raise exception 'REFUSING: a push function is still executable by anon or authenticated';
  end if;
end $$;

/* And prove the trigger is actually attached, because every line above is
   decoration if the one line that connects this to the product is missing. */
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'notifications_push_enqueue'
       and tgrelid = 'public.notifications'::regclass
       and not tgisinternal
  ) then
    raise exception 'REFUSING: the enqueue trigger is not attached to public.notifications';
  end if;
end $$;
