/*
 * Trigger functions stop being callable over the REST API.
 *
 * PostgREST publishes every function in `public` that the caller may execute,
 * as `/rest/v1/rpc/<name>`. Postgres grants EXECUTE to the PUBLIC role by
 * default when a function is created, and `anon` and `authenticated` inherit
 * it. The result is that six trigger functions, the ones enforcing that an
 * example listing cannot wear a badge or be transacted against, were sitting on
 * the public API surface. Five of them were callable by a signed-out stranger.
 *
 * WHAT THIS IS AND IS NOT. Postgres refuses to run a trigger function called
 * directly ("trigger functions can only be called as triggers"), so this is not
 * a hole somebody was going to climb through, and it is not being written up as
 * one. It is the API surface telling the truth about itself. Every name on that
 * surface is a name an attacker enumerates and a reviewer has to account for,
 * and a guard rail that enforces our demo-listing rules has no business
 * appearing in the same list as the endpoints we meant to publish.
 *
 * THE TRIGGERS ARE UNAFFECTED, and that is the one thing worth being sure of
 * before running this. Postgres checks EXECUTE on a trigger function when the
 * trigger is CREATED, not each time it fires; at fire time the function runs
 * without a privilege check on the calling role.
 *
 * Verified against this database after applying, rather than reasoned about:
 * an insert of a `first_listing` badge for the example lister was attempted and
 * still raised check_violation from `refuse_badge_for_example_lister`, inside a
 * block that rolled back. All 21 triggers remain attached and enabled, no
 * trigger function is executable by `anon` or `authenticated` any more, and no
 * badge row was written.
 *
 * Written as a loop over the catalogue rather than as six named revokes, so a
 * trigger function added next month is covered by the same rule instead of
 * quietly reopening this. `service_role` is not mentioned because it bypasses
 * these grants and needs no help from us.
 */

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and pg_get_function_result(p.oid) = 'trigger'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.signature);
  end loop;
end;
$$;
