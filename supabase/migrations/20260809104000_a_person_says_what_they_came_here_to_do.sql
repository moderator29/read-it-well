-- What somebody said they came here to do, recorded at signup.
--
-- `public.app_role` already exists and is not this. That enum is
-- ('user', 'agent', 'admin', 'super_admin') and it is an AUTHORISATION fact:
-- what a person is allowed to do, granted by the platform, written to
-- user_roles by a trigger and by the staff grant functions. Nobody chooses
-- their own app_role and nobody should be able to.
--
-- This is a DECLARATION. It is what the person told us on the way in, before
-- they had done anything: I am looking for somewhere to rent, I am buying, I
-- have property to let, I sell, I am an agent. It confers nothing. Saying
-- "I am an agent" here does not make somebody an agent, which still requires
-- the application, the ID and the approval; it decides which welcome email
-- they get, which surfaces are put in front of them first, and what the empty
-- states say.
--
-- Keeping the two apart is the whole design. The moment a self-declared value
-- can widen what somebody may do, a dropdown on a public form becomes a
-- privilege escalation, and this project has already had to close exactly that
-- hole once: see 20260806112848, where making somebody staff turned out to be
-- something a signed-in user could do.
--
-- Nullable, and null is a real answer. Somebody who signed up before this
-- existed, or through a social provider that never showed the question, has
-- not declared anything, and the welcome they receive has to work without it.

begin;

create type public.signup_role as enum (
  -- Looking for somewhere to rent. The largest group by a wide margin.
  'renter',
  -- Looking to buy: a home, land, or commercial space.
  'buyer',
  -- Has property to let. A landlord letting their own flat, not an agency.
  'landlord',
  -- Has property to sell. Frequently the same person as a landlord, which is
  -- why this is one declared answer rather than a set of capabilities.
  'seller',
  -- Does this for a living, for other people's property.
  'agent'
);

comment on type public.signup_role is
  'What somebody SAID they came to RentMe for. A declaration, never a permission. public.app_role is the authorisation fact and is granted by the platform; this is chosen by the person and confers nothing, so selecting "agent" here does not make anybody an agent.';

alter table public.profiles
  add column if not exists signup_role public.signup_role;

comment on column public.profiles.signup_role is
  'The role this person chose at signup. Decides which welcome email they get and which surfaces lead. Null means they were never asked or skipped the question, which is an ordinary state that every reader must handle: the welcome email has a general version for exactly this case.';

/*
 * A person may change their mind about their own answer, and about nothing
 * else.
 *
 * Column-level grants rather than a policy change. The existing
 * `profiles_update_self` policy already restricts the ROW to the caller's own;
 * this restricts the COLUMN, which is the half that stops an update sent
 * straight to PostgREST from carrying a field the product never offered. Same
 * pattern as the `interests` grant in
 * 20260805162027_one_honest_question_at_the_door, for the same reason.
 */
grant select (signup_role), update (signup_role) on public.profiles to authenticated;

commit;
