/*
 * V-40. AN IDEMPOTENCY CLAIM IS A SHORT LEASE; ONLY A RESULT IS KEPT LONG.
 *
 * The outbox replays a message, a request, a review or a post under the UUID
 * minted at the tap, possibly days later, so its answer must be replayable
 * for days. Claiming with a days-long ttl made that ttl the IN-FLIGHT lease
 * too: a function killed mid-work, or a result that failed to record, left
 * the key "in flight" for days.
 *
 * So the claim goes through the audit's `claim_idempotency` unchanged, with a
 * two-minute ttl, which is the lease: a claim that never finishes is free
 * again after two minutes. This function records the answer AND extends the
 * row to the keep period, so a finished tap is replayed for as long as the
 * outbox can hold it. The audit's functions are not edited.
 */

create or replace function private.record_idempotency_result_kept(
  p_scope text,
  p_subject text,
  p_key text,
  p_result jsonb,
  p_keep_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep integer := least(greatest(coalesce(p_keep_seconds, 900), 60), 7 * 86400);
begin
  update public.idempotency_records r
     set result = p_result,
         completed_at = now(),
         expires_at = now() + make_interval(secs => keep)
   where r.scope = p_scope and r.subject = p_subject and r.key = p_key
     and r.completed_at is null;
  return found;
end;
$$;

comment on function private.record_idempotency_result_kept(text, text, text, jsonb, int) is
  'V-40. Stores the first attempt''s answer and keeps it replayable for p_keep_seconds (one minute to seven days), independent of the short claim lease.';

revoke all on function private.record_idempotency_result_kept(text, text, text, jsonb, int)
  from public, anon, authenticated;

create or replace function public.record_idempotency_result_kept(
  scope text,
  subject text,
  key text,
  result jsonb,
  keep_seconds int
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.record_idempotency_result_kept(scope, subject, key, result, keep_seconds);
$$;

comment on function public.record_idempotency_result_kept(text, text, text, jsonb, int) is
  'Service-role door to private.record_idempotency_result_kept.';

revoke all on function public.record_idempotency_result_kept(text, text, text, jsonb, int)
  from public, anon, authenticated;
grant execute on function public.record_idempotency_result_kept(text, text, text, jsonb, int) to service_role;

do $$
begin
  if has_function_privilege('anon', 'public.record_idempotency_result_kept(text, text, text, jsonb, int)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_idempotency_result_kept(text, text, text, jsonb, int)', 'EXECUTE') then
    raise exception 'record_idempotency_result_kept is callable by an API role';
  end if;
end
$$;
