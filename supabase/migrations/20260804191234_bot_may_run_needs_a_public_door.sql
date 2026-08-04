-- The summon's gate had no endpoint.
--
-- PostgREST exposes `public` and nothing else, so `.rpc('bot_may_run')` had no
-- door to knock on and every summon would have fallen straight to a refusal.
-- `consume_rate_limit` and `claim_idempotency` work because each already has a
-- thin `public` wrapper over its `private` implementation; `bot_may_run` was
-- written without one.
--
-- Agent 2 found it by reading `pg_proc` rather than trusting the generated
-- types, and it was right that no type could ever have caught this: a missing
-- wrapper is not a typing problem, it is a missing endpoint. The application
-- compiled, the function existed, and the call could never have arrived.
--
-- This matters more than an ordinary outage because of which way the caller
-- fails. The rate limiter fails OPEN, deliberately, since blocking a real
-- person during a wobble is worse than missing a count. The summon fails
-- CLOSED, because behind it sits a paid API and a monthly ceiling, and a gate
-- nobody can reach is a gate that is shut. So this wrapper's absence did not
-- degrade the assistant, it disabled it entirely and silently.
--
-- The wrapper delegates and does nothing else. Every rule stays in one place in
-- `private`, where a rule enforced in two places drifts in one of them.

create or replace function public.bot_may_run(p_user uuid)
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $fn$
  select private.bot_may_run(p_user);
$fn$;

comment on function public.bot_may_run(uuid) is
  'The PostgREST door onto private.bot_may_run. Delegates and decides nothing: the ceiling, the daily and per-person limits and the off switch all live in the private implementation. Returns the reason the summon may not run, or the word for may.';

/*
 * Callable by a signed-in person only. `anon` has no business asking whether
 * the assistant may run, because a signed-out visitor can never summon it, and
 * the answer names the platform's spending state.
 */
revoke execute on function public.bot_may_run(uuid) from public, anon;
grant  execute on function public.bot_may_run(uuid) to authenticated;
