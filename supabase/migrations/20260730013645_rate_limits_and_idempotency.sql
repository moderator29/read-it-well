-- Durable rate limits (and the retry-safe write records that share their shape).
--
-- PENDING: this file is deliberately not in supabase/migrations/. The lead
-- applies it, then regenerates apps/web/src/lib/supabase/database.types.ts, and
-- moves it into supabase/migrations/ with a timestamp prefix.
--
-- Why this exists at all. The assistant route has been throttling callers with
-- a module-level Map in one Node process (RECOMMENDATIONS R-43). On any
-- deployment that runs more than one instance, or recycles instances on cold
-- start and redeploy, each instance keeps its own allowance: a scripted caller
-- gets one full allowance per instance rather than one in total, and every
-- redeploy hands everybody a fresh one. A limit that resets on deploy is not a
-- limit. The only store every instance already shares is Postgres, so the
-- counter belongs here, next to the data it protects.
--
-- Two objects, one purpose: stopping cheap repetition from being free.
--   Part 1  public.rate_limits         how many times a subject did a thing in
--                                     the current window (R-36, R-43, R-44,
--                                     R-52).
--   Part 2  public.idempotency_records what a mutating action answered the
--                                     first time, so a retry of the same
--                                     submit replays that answer instead of
--                                     doing the work twice (R-27 groundwork).
-- They live in one file because they are one decision: durable, service-role
-- only, atomic in a single statement, and safe to split later if the lead
-- prefers two migrations.
--
-- Neither table has a single client policy. RLS is enabled and left empty on
-- purpose: anon and authenticated must never read another subject's counters
-- (they are an abuse map) and must never write their own (they would simply
-- reset them). The service role bypasses RLS, so the app reaches both tables
-- through the narrow function surface below and nothing else can.

/* ------------------------------------------------------------------ part 1 */

create table public.rate_limits (
  bucket       text        not null,
  subject      text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (bucket, subject, window_start)
);

comment on table public.rate_limits is
  'Durable fixed-window counters. bucket is the guarded action, subject is who is doing it (user:<uuid> or ip:<addr>), window_start is the floored window. Service role only.';
comment on column public.rate_limits.bucket is
  'The guarded action, e.g. assistant, conversation_new, booking_reserve, support_ticket.';
comment on column public.rate_limits.subject is
  'Namespaced actor key, e.g. user:<uuid>, ip:<addr>, email:<hash>. Never a bare id, so two namespaces can never collide.';

-- The primary key already serves every lookup the limiter makes. This index
-- exists purely so the cleanup below can delete a day's stale windows with a
-- range scan instead of reading the whole table.
create index rate_limits_window_start_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

-- Belt and braces on top of the empty-policy RLS above. Supabase's default
-- privileges hand anon and authenticated table grants on anything new in
-- public; RLS already refuses them every row, and revoking the grants means a
-- policy added here by mistake one day still opens nothing.
revoke all on table public.rate_limits from anon, authenticated;

/**
 * Consume one slot and say whether the caller is still inside the limit.
 *
 * Atomic by construction. The count is raised by the same statement that
 * decides, so two concurrent requests can never both take the last slot: the
 * second one blocks on the first one's row lock, then re-evaluates the DO
 * UPDATE against the committed count. A read-then-write version of this
 * function would pass both, which is exactly the hole a scripted caller
 * hammering a serverless deployment finds first.
 *
 * The WHERE on DO UPDATE is the whole trick. Inside the limit the row is
 * updated and RETURNING yields a row, so the function returns true. Once the
 * count has reached limit_count the update is skipped, RETURNING yields
 * nothing, and the function returns false without touching the row again, so an
 * exhausted subject cannot inflate its own counter for ever.
 *
 * Windows are fixed, not sliding: window_start is the caller's clock floored to
 * window_seconds. A fixed window is a rounder promise to a person ("you can try
 * again at the top of the hour") and lets the app work out the retry moment
 * itself, with no second round trip.
 */
create function private.consume_rate_limit(
  bucket text,
  subject text,
  limit_count int,
  window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz;
  allowed boolean;
begin
  -- A nonsensical call must never lock a real person out of a working
  -- platform, so it is treated as "no limit configured" rather than "denied".
  if consume_rate_limit.bucket is null or consume_rate_limit.subject is null
     or consume_rate_limit.limit_count is null or consume_rate_limit.limit_count < 1
     or consume_rate_limit.window_seconds is null or consume_rate_limit.window_seconds < 1 then
    return true;
  end if;

  current_window := to_timestamp(
    (floor(extract(epoch from now()) / consume_rate_limit.window_seconds)
      * consume_rate_limit.window_seconds)::double precision
  );

  insert into public.rate_limits as r (bucket, subject, window_start, count)
  values (
    consume_rate_limit.bucket,
    consume_rate_limit.subject,
    current_window,
    1
  )
  on conflict (bucket, subject, window_start) do update
    set count = r.count + 1
    where r.count < consume_rate_limit.limit_count
  returning true into allowed;

  -- No row came back: the conditional update was skipped, so the window is
  -- spent.
  return coalesce(allowed, false);
end;
$$;

comment on function private.consume_rate_limit(text, text, int, int) is
  'Atomically consumes one slot in (bucket, subject, current window). True while inside limit_count, false once the window is spent.';

revoke execute on function private.consume_rate_limit(text, text, int, int)
  from public, anon, authenticated;

/**
 * Delete windows nobody can be inside any more.
 *
 * A day is the longest window the app uses (the per-guest daily cap on new
 * conversations, R-36), so anything older than a day plus a margin is dead
 * weight. Called from the same place the stale-hold release will be called from
 * once pg_cron is enabled on the project; until then the service layer or an
 * admin can invoke it directly. Returns the row count so a caller can log it.
 */
create function private.purge_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.rate_limits
  where window_start < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function private.purge_rate_limits() is
  'Deletes rate-limit windows older than a day. Safe to run at any time because nobody can be inside a window that old.';

revoke execute on function private.purge_rate_limits() from public, anon, authenticated;

/* ------------------------------------------------------------------ part 2 */

-- Retry-safe writes. Nigerian mobile networks drop mid-request as a matter of
-- routine, so a person who taps Reserve, loses signal and taps again must get
-- the first answer back, not a second booking. This table remembers what an
-- action answered, keyed by the client-generated key, for long enough to cover
-- a human retry (minutes, not days).
create table public.idempotency_records (
  scope        text        not null,
  subject      text        not null,
  key          text        not null,
  result       jsonb,
  completed_at timestamptz,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  primary key (scope, subject, key)
);

comment on table public.idempotency_records is
  'Short-lived record of what a mutating action answered, so a retried submit replays the original answer. Keyed (scope, subject, key). Service role only.';
comment on column public.idempotency_records.subject is
  'The acting user, namespaced like rate_limits.subject, so one person''s key can never collide with another''s.';
comment on column public.idempotency_records.completed_at is
  'Null while the first attempt is still in flight. Set when the result lands.';

create index idempotency_records_expires_at_idx on public.idempotency_records (expires_at);

alter table public.idempotency_records enable row level security;

revoke all on table public.idempotency_records from anon, authenticated;

/**
 * Claim a key, or report what the first attempt did with it.
 *
 * Returns jsonb, one of:
 *   {"state":"fresh"}                  the caller owns this key and should do
 *                                      the work, then call
 *                                      private.record_idempotency_result.
 *   {"state":"replay","result":<json>} the work already ran; answer with this.
 *   {"state":"in_flight"}              another attempt with this key is still
 *                                      running, so the honest answer is "your
 *                                      earlier attempt is still going through",
 *                                      never a second write.
 *
 * The claim is the insert itself, so two simultaneous retries cannot both come
 * back fresh. An expired record is reclaimable: a first attempt killed by a
 * crash before it recorded anything must not wedge that key for ever.
 */
create function private.claim_idempotency(
  scope text,
  subject text,
  key text,
  ttl_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ttl integer := greatest(coalesce(ttl_seconds, 900), 1);
  existing public.idempotency_records;
begin
  if claim_idempotency.scope is null
     or claim_idempotency.subject is null
     or claim_idempotency.key is null then
    -- Nothing to key on: tell the caller to just do the work.
    return jsonb_build_object('state', 'fresh');
  end if;

  insert into public.idempotency_records (scope, subject, key, expires_at)
  values (
    claim_idempotency.scope,
    claim_idempotency.subject,
    claim_idempotency.key,
    now() + make_interval(secs => ttl)
  )
  on conflict (scope, subject, key) do nothing;

  if found then
    return jsonb_build_object('state', 'fresh');
  end if;

  select * into existing
  from public.idempotency_records r
  where r.scope = claim_idempotency.scope
    and r.subject = claim_idempotency.subject
    and r.key = claim_idempotency.key;

  if not found then
    -- Vanished between the insert and the read (a purge landing exactly here).
    -- Doing the work again is the safe reading of an absent record.
    return jsonb_build_object('state', 'fresh');
  end if;

  if existing.completed_at is not null then
    return jsonb_build_object('state', 'replay', 'result', existing.result);
  end if;

  if existing.expires_at <= now() then
    -- The first attempt never finished and its window has passed. Take the key
    -- over, atomically, and only if nobody else just did.
    update public.idempotency_records r
      set expires_at = now() + make_interval(secs => ttl),
          created_at = now(),
          result = null,
          completed_at = null
    where r.scope = claim_idempotency.scope
      and r.subject = claim_idempotency.subject
      and r.key = claim_idempotency.key
      and r.completed_at is null
      and r.expires_at <= now();
    if found then
      return jsonb_build_object('state', 'fresh');
    end if;
  end if;

  return jsonb_build_object('state', 'in_flight');
end;
$$;

comment on function private.claim_idempotency(text, text, text, int) is
  'Claims an idempotency key, or reports the first attempt''s result. Returns {state: fresh | replay | in_flight}.';

revoke execute on function private.claim_idempotency(text, text, text, int)
  from public, anon, authenticated;

/** Record what the owning attempt answered, so every later retry replays it. */
create function private.record_idempotency_result(
  scope text,
  subject text,
  key text,
  result jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.idempotency_records r
    set result = record_idempotency_result.result,
        completed_at = now()
  where r.scope = record_idempotency_result.scope
    and r.subject = record_idempotency_result.subject
    and r.key = record_idempotency_result.key
    and r.completed_at is null;
  return found;
end;
$$;

comment on function private.record_idempotency_result(text, text, text, jsonb) is
  'Stores the first attempt''s answer against its idempotency key. False when the key was already completed or has gone.';

revoke execute on function private.record_idempotency_result(text, text, text, jsonb)
  from public, anon, authenticated;

/**
 * Give a claimed key back.
 *
 * The owning attempt failed outright, or answered with something not worth
 * replaying (a validation refusal, say). Releasing the key immediately is what
 * keeps an honest retry from being told "still in flight" until the TTL runs
 * out. A completed record is never touched, so a real answer can never be
 * released by a late caller.
 */
create function private.release_idempotency(
  scope text,
  subject text,
  key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.idempotency_records r
  where r.scope = release_idempotency.scope
    and r.subject = release_idempotency.subject
    and r.key = release_idempotency.key
    and r.completed_at is null;
  return found;
end;
$$;

comment on function private.release_idempotency(text, text, text) is
  'Drops an uncompleted idempotency claim so a retry can run. Never touches a completed record.';

revoke execute on function private.release_idempotency(text, text, text)
  from public, anon, authenticated;

/** Delete idempotency records past their window. Same reasoning as the rate-limit purge. */
create function private.purge_idempotency_records()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.idempotency_records
  where expires_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function private.purge_idempotency_records() is
  'Deletes idempotency records more than a day past expiry.';

revoke execute on function private.purge_idempotency_records() from public, anon, authenticated;

/* ------------------------------------------------------- the reachable door */

-- Why these four wrappers exist. Migration 20260728151336 moved helpers into
-- the private schema precisely because PostgREST does not expose it, which is
-- also why the service-role client cannot call anything in private over the
-- REST API. The implementations stay private; these thin wrappers are the only
-- door, and they are granted to service_role alone. Each is security definer so
-- it can reach the private implementation without granting anyone usage on the
-- private schema, and each has a pinned search_path so the resolution of every
-- name inside it is fixed at definition time.
--
-- An anon or authenticated caller hitting /rest/v1/rpc/consume_rate_limit gets
-- a permission error, not a counter it can drive.

create function public.consume_rate_limit(
  bucket text,
  subject text,
  limit_count int,
  window_seconds int
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select private.consume_rate_limit(bucket, subject, limit_count, window_seconds);
$$;

comment on function public.consume_rate_limit(text, text, int, int) is
  'Service-role door to private.consume_rate_limit. True while inside the limit.';

revoke execute on function public.consume_rate_limit(text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, int, int) to service_role;

create function public.claim_idempotency(
  scope text,
  subject text,
  key text,
  ttl_seconds int
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.claim_idempotency(scope, subject, key, ttl_seconds);
$$;

comment on function public.claim_idempotency(text, text, text, int) is
  'Service-role door to private.claim_idempotency.';

revoke execute on function public.claim_idempotency(text, text, text, int)
  from public, anon, authenticated;
grant execute on function public.claim_idempotency(text, text, text, int) to service_role;

create function public.release_idempotency(
  scope text,
  subject text,
  key text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select private.release_idempotency(scope, subject, key);
$$;

comment on function public.release_idempotency(text, text, text) is
  'Service-role door to private.release_idempotency.';

revoke execute on function public.release_idempotency(text, text, text)
  from public, anon, authenticated;
grant execute on function public.release_idempotency(text, text, text) to service_role;

create function public.record_idempotency_result(
  scope text,
  subject text,
  key text,
  result jsonb
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select private.record_idempotency_result(scope, subject, key, result);
$$;

comment on function public.record_idempotency_result(text, text, text, jsonb) is
  'Service-role door to private.record_idempotency_result.';

revoke execute on function public.record_idempotency_result(text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_idempotency_result(text, text, text, jsonb) to service_role;
