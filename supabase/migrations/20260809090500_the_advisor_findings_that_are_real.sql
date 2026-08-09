-- Four findings from the security advisor, each answered on its own merits.
--
-- An advisory list is not a to-do list. Two of the five things flagged here
-- are deliberate and stay exactly as they are, and saying so in the migration
-- is the point: the next person to run the linter should find the reasoning
-- rather than assume an oversight and "fix" a design decision. Everything
-- below was checked against the live database before it was written, and each
-- section says what was found.

begin;

/* -------------------------------------------------------------------------
   1. public.platform_stats()  -  LEFT ALONE, ON PURPOSE

   Flagged as anon-executable. It is, and that was decided in
   20260804142715_platform_stats_public_by_design, which put the reasoning in
   a COMMENT rather than making a change. That reasoning still holds: it
   returns four integers, every one of them an aggregate over rows an
   anonymous visitor can already read one at a time through the catalogue, and
   the landing page counts are drawn for signed-out visitors. Revoking it
   would blank the numbers band and disclose nothing in exchange.

   No statement here. This paragraph is the change.
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   2. public.agent_trust(uuid)  -  LEFT ALONE, ON PURPOSE, NOW SAID OUT LOUD

   Flagged for the same reason and, unlike platform_stats, never documented.

   It is SECURITY DEFINER and takes an arbitrary user uuid, which reads
   alarming until you follow where it is called from: readAgentTrust in
   lib/social/profile-extras.ts, on the public profile page at /u/<handle>.
   `social_profiles_select` is granted to the `public` role, so that page
   renders for signed-out visitors, and the trust band on it is the whole
   point of an agent having a public profile. Revoke anon and the band goes
   blank for exactly the audience it is meant to persuade.

   What it discloses to an anonymous caller is what that page already prints:
   a trust score, completed deals, a median reply time, a review count and an
   average rating. The uuid needed to call it is already readable from
   social_profiles by the same anonymous role.

   So the grant stays and the reason is recorded on the function, following
   the precedent platform_stats set.
   ------------------------------------------------------------------------- */
comment on function public.agent_trust(uuid) is
  'An agent''s public numbers: trust score, completed deals, median first-reply minutes, review count and average rating. Returns NO ROW for somebody who is not an agent, which is how the profile page decides whether to draw the band at all. Executable by anon BY DESIGN, and flagged by the security linter for exactly that reason: the public profile at /u/<handle> renders for signed-out visitors and prints every one of these figures, and the user uuid this takes is already readable from social_profiles by the same anonymous role. Security definer so the counts do not require granting anon a read over bookings, reviews or messages.';

/* -------------------------------------------------------------------------
   3. public.current_agent_id()  -  REVOKED FROM anon

   This one is genuinely pointless for anon and is revoked.

   It resolves `auth.uid()` to an agent id. For an anonymous caller auth.uid()
   is null, so it returns null every time, which is why this is a tidy-up
   rather than a fix for a leak. It is worth doing anyway: a SECURITY DEFINER
   function on the public REST surface that no anonymous caller has any use
   for is noise in the audit, and noise is what a real finding hides in.

   CHECKED BEFORE REVOKING, because this is the shape of change that breaks a
   product quietly:

     - It appears in no RLS policy. Verified against pg_policies: no `qual` or
       `with_check` anywhere in the database mentions it. That matters because
       a policy expression is evaluated as the CALLING role, so a helper used
       in a policy must be executable by every role that reads the table, and
       revoking one is how you turn a filtered row into a 42501 that fails the
       whole query. That is not a hypothetical here: it is exactly what
       20260730021956_anon_execute_on_rls_helpers had to undo.

     - It is used as one column default, review_responses.agent_id. An
       anonymous caller cannot insert into that table under its RLS, so the
       default is only ever evaluated for `authenticated`, whose grant is
       untouched below.
   ------------------------------------------------------------------------- */
revoke execute on function public.current_agent_id() from anon;

comment on function public.current_agent_id() is
  'The agent id belonging to auth.uid(), or null. Used as the default for review_responses.agent_id so an agent never has to state their own id on a write. EXECUTE is granted to authenticated and service_role only: for anon, auth.uid() is null and this can only ever return null, so the grant bought nothing and was revoked. It is deliberately used in NO row level security policy; a helper that appears in a policy must stay executable by every role that reads the table, or the policy raises 42501 and fails the whole query instead of filtering a row.';

/* -------------------------------------------------------------------------
   4. private.handle_seed(text)  -  search_path PINNED

   Flagged for a mutable search_path. Found NOT security definer, which makes
   this the mildest version of the finding: it runs with the caller's own
   privileges, so a hijacked search_path cannot be used to escalate.

   Pinned anyway, and not as box-ticking. It is called from
   private.claim_default_handle, which is called from public.handle_new_user,
   which is the AFTER INSERT trigger on auth.users. That is the one code path
   in this database that runs for every person who ever signs up, and it runs
   inside the transaction that creates their auth row. A resolution surprise
   there does not degrade, it refuses the signup.

   `search_path = ''` rather than a named schema, which is the strictest form:
   every object the body touches must be schema-qualified. The body is pure
   text manipulation over built-ins, so there is nothing to qualify and
   nothing to break. pg_temp is deliberately excluded so a temporary object
   cannot shadow a built-in.
   ------------------------------------------------------------------------- */
alter function private.handle_seed(text) set search_path = '';

/* -------------------------------------------------------------------------
   5. Three service-role-only tables  -  GRANTS REVOKED EXPLICITLY

   idempotency_records, places_cache and rate_limits have RLS enabled and zero
   policies. The advisor flags that shape, and here it is CORRECT
   construction: RLS with no policy denies every role that is subject to RLS,
   and service_role bypasses RLS, so "deny everyone except the service role"
   is exactly what was built.

   Measured on the live database: anon and authenticated currently hold no
   table-level grant on any of the three, so on production these statements
   are a no-op.

   They are written anyway, because the risk is not the current state of
   production, it is the next database built from these files. This project
   carries the Supabase default `alter default privileges in schema public
   grant all on tables to anon, authenticated` (confirmed in pg_default_acl),
   so any table created by postgres in public is born with ALL privileges for
   both roles. These three escaped that, and nothing in the migration history
   says why or guarantees the next one will. An explicit revoke makes the
   intent survive a rebuild instead of depending on it.

   RLS would still deny the read. Defence in depth is the point: a policy
   added later for one narrow purpose would otherwise arrive on top of a full
   table grant, and the grant is the thing nobody re-reads.

   places_cache is dropped outright by
   20260809090000_nothing_here_came_from_somewhere_else, so its statements are
   wrapped in a guard and the two migrations may be applied in either order.
   ------------------------------------------------------------------------- */
revoke all on table public.idempotency_records from anon, authenticated;
revoke all on table public.rate_limits from anon, authenticated;

do $$
begin
  if to_regclass('public.places_cache') is not null then
    execute 'revoke all on table public.places_cache from anon, authenticated';
  end if;
end
$$;

commit;
