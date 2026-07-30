-- Fix: the ON CONFLICT column lists were ambiguous.
--
-- Both functions took parameters named after the very columns they conflict on
-- (bucket, subject, window_start; scope, subject, key). Qualifying the VALUES
-- list was not enough: an ON CONFLICT target is a bare column list, so Postgres
-- could not tell the column from the PL/pgSQL variable and every call raised
-- 42702 at runtime. Creating the function succeeded, which is precisely why a
-- functional probe rather than a successful migration is the proof.
--
-- Parameters are renamed with a p_ prefix so nothing inside either body can
-- collide with a column again. A rename needs a drop, and the public wrappers
-- have string bodies so they hold no hard dependency on these signatures; they
-- pass positionally and their own parameter names, which the application calls
-- by name over RPC, are untouched.

drop function if exists private.consume_rate_limit(text, text, int, int);
drop function if exists private.claim_idempotency(text, text, text, int);
drop function if exists private.record_idempotency_result(text, text, text, jsonb);
drop function if exists private.release_idempotency(text, text, text);

create function private.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit_count int,
  p_window_seconds int
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
  if p_bucket is null or p_subject is null
     or p_limit_count is null or p_limit_count < 1
     or p_window_seconds is null or p_window_seconds < 1 then
    return true;
  end if;

  current_window := to_timestamp(
    (floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds)::double precision
  );

  insert into public.rate_limits as r (bucket, subject, window_start, count)
  values (p_bucket, p_subject, current_window, 1)
  on conflict (bucket, subject, window_start) do update
    set count = r.count + 1
    where r.count < p_limit_count
  returning true into allowed;

  -- No row came back: the conditional update was skipped, so the window is spent.
  return coalesce(allowed, false);
end;
$$;

comment on function private.consume_rate_limit(text, text, int, int) is
  'Atomically consumes one slot in (bucket, subject, current window). True while inside the limit, false once the window is spent.';

revoke execute on function private.consume_rate_limit(text, text, int, int)
  from public, anon, authenticated;

create function private.claim_idempotency(
  p_scope text,
  p_subject text,
  p_key text,
  p_ttl_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ttl integer := greatest(coalesce(p_ttl_seconds, 900), 1);
  existing public.idempotency_records;
begin
  if p_scope is null or p_subject is null or p_key is null then
    return jsonb_build_object('state', 'fresh');
  end if;

  insert into public.idempotency_records (scope, subject, key, expires_at)
  values (p_scope, p_subject, p_key, now() + make_interval(secs => ttl))
  on conflict (scope, subject, key) do nothing;

  if found then
    return jsonb_build_object('state', 'fresh');
  end if;

  select * into existing
  from public.idempotency_records r
  where r.scope = p_scope and r.subject = p_subject and r.key = p_key;

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
    where r.scope = p_scope and r.subject = p_subject and r.key = p_key
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

create function private.record_idempotency_result(
  p_scope text,
  p_subject text,
  p_key text,
  p_result jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.idempotency_records r
    set result = p_result, completed_at = now()
  where r.scope = p_scope and r.subject = p_subject and r.key = p_key
    and r.completed_at is null;
  return found;
end;
$$;

comment on function private.record_idempotency_result(text, text, text, jsonb) is
  'Stores the first attempt''s answer against its idempotency key. False when the key was already completed or has gone.';

revoke execute on function private.record_idempotency_result(text, text, text, jsonb)
  from public, anon, authenticated;

create function private.release_idempotency(
  p_scope text,
  p_subject text,
  p_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.idempotency_records r
  where r.scope = p_scope and r.subject = p_subject and r.key = p_key
    and r.completed_at is null;
  return found;
end;
$$;

comment on function private.release_idempotency(text, text, text) is
  'Drops an uncompleted idempotency claim so a retry can run. Never touches a completed record.';

revoke execute on function private.release_idempotency(text, text, text)
  from public, anon, authenticated;
