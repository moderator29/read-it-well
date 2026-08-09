-- Who lists the example properties.
--
-- `listings.agent_id` is NOT NULL and references `agents`, so illustrative
-- inventory needs a lister. The choice of WHO is a trust decision, not a
-- plumbing one, and there are three options with very different consequences:
--
--   1. Attribute them to the owner's real account. Rejected. It puts a real
--      person's name on properties that do not exist.
--   2. Invent an estate agency with a plausible Nigerian company name, a phone
--      number and a CAC number. Rejected, and it is the worst option: it is
--      exactly the "never a real-looking agent name" rule, and a plausible
--      agency name is one somebody else may actually trade under.
--   3. List them as the platform itself, openly. Taken.
--
-- So the lister is institutional and unmistakably not a person. A reader who
-- looks at who is offering the property sees the platform's own name and the
-- word "example", which is the sanctioned word: the banned strings are "demo",
-- "sample", "preview" and "not live", and the agreed copy for this case is
-- already "This is an example listing".
--
-- The account cannot be signed into. The address is on the RFC 2606 reserved
-- `.invalid` TLD so it can never resolve, never receive mail and never be
-- registered by anybody; there is no usable password hash; and it is banned
-- until the end of the century so GoTrue refuses it outright even if a hash
-- were somehow set later.

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  banned_until,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  'e0000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'example-collection@rentme.invalid',
  '',
  null,
  '2099-12-31 00:00:00+00',
  '{"provider":"none","providers":[]}'::jsonb,
  '{"display_name":"RentMe Example Collection"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

-- The lister row itself.
--
-- APPROVED, because the listing pipeline requires an admitted lister to hold
-- published inventory and pretending otherwise would break the plumbing rather
-- than improve the honesty. NOT verified, and tier 0, because that is the
-- claim that must never be made: `agents.verified` and
-- `agents.verification_tier` are what draw a badge beside the name, and the
-- trigger added in the previous migration refuses any example listing whose
-- lister carries either.
insert into public.agents (id, user_id, display_name, type, status, verified, verification_tier)
values (
  'e0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000001',
  'RentMe Example Collection',
  'business',
  'APPROVED',
  false,
  0
)
on conflict (id) do nothing;

-- Make the account's own profile say the same thing the listings will say, so
-- a reader who taps through to the lister is not told something different from
-- what the listing told them.
update public.profiles
   set display_name = 'RentMe Example Collection',
       first_name = null,
       surname = null,
       nickname = null
 where id = 'e0000000-0000-4000-8000-000000000001';
