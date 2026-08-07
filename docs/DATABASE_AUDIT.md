# Database audit

Run 2026-08-07 against the live project `uccixoonmbhrnyczyigt`, Postgres 17.6,
eu-west-1, using Supabase's own security and performance linters.

**This is the first time this has been possible.** `docs/HANDOFF.md` section 3.3
records that the sandbox could not reach the Supabase host, so the data layer
had only ever been reasoned about from migrations. It can be reached now, and
the results are below in full.

**The headline: one real item, and ten that are correct by design.** Eleven
advisories were returned. Ten are either correct by design or a generic lint
that does not apply here. The eleventh, in section 1.1, is a genuine setting
worth turning on. Section 1 says why for each, and it says it at length on
purpose, because the obvious reading of that list is "eleven security problems"
and acting on that reading breaks the product. Section 4 is the list of things
that must NOT be changed.

---

## 1. Security: 11 advisories, 1 worth acting on

### 1.1 Leaked password protection is off, WARN

> Supabase Auth can check a new password against HaveIBeenPwned and refuse one
> that appears in a known breach. It is currently disabled.

**This is the one item on the whole list that is not correct-by-design**, and it
was missed on the first pass of this document, which claimed ten advisories and
cleared all of them. The platform has email and password sign-up, so the setting
applies directly, and it is a single toggle in the Supabase dashboard under
Authentication, Policies. Nothing in the repository can turn it on.

**Owner action:** enable it before the platform carries real accounts. Credential
stuffing against a property marketplace with a naira wallet behind it is the
attack this prevents, and the reset flow is already written to be an unhelpful
oracle, so the account-existence half is closed already.

### 1.2 The ten that are correct by design

### RLS enabled with no policy, 3 tables, INFO

`idempotency_records`, `places_cache`, `rate_limits`.

**Correct, and deliberately so.** RLS enabled with zero policies denies every
row to every role that is not the service role. That is fail-closed, and these
three tables are service-role-only by design: an idempotency ledger, a provider
response cache, and the durable rate limiter's counters. A policy on any of
them would be the defect, because it would hand a signed-in user a way to read
or forge the record that stops a payment being taken twice.

The linter cannot tell "no policy because nobody thought about it" apart from
"no policy because the answer is no". Here it is the second.

### SECURITY DEFINER functions callable by anon or authenticated, 7 warnings

Four functions, counted twice where both roles can reach them. Each was read in
full before being cleared, and the definitions are quoted in the git history of
this file's commit.

| Function | Reachable by | Verdict |
|---|---|---|
| `platform_stats()` | anon, authenticated | **Correct.** Returns four counts: published listings, distinct cities, distinct states, approved agents. All four are aggregates over already-public catalogue data, and the landing page's numbers band reads them for a signed-out visitor. Revoking anon breaks the front door |
| `agent_trust(p_user uuid)` | anon, authenticated | **Correct, and it was the one worth checking properly.** It takes a user id as an argument, which is the shape of the worst bug this project has shipped (`grant_staff_role` authorised off its own argument rather than the caller). This one does not authorise anything. It returns trust score, completed deals, median response minutes, review count and average rating, and it carries `where exists (select 1 from me)`, so a person who is not an agent yields NO ROW at all. Every field is the public reputation an agent's own profile page displays, aggregate, with no identities and nothing private. Signed-out visitors read agent profiles, so anon access is the feature |
| `current_agent_id()` | anon, authenticated | **Correct, and it is the pattern to copy.** `select id from public.agents where user_id = (select auth.uid())`. It authorises off the CALLER and takes no argument, so there is nothing to forge. anon receives null |
| `enter_place(p_lga_code text)` | authenticated | **Correct.** A mutation, signed-in only, and the only thing that turns a local government code into membership. `places-schema.ts` documents it as the single door |

**The pattern worth naming:** three of the four take no argument at all, or take
one that identifies public data. The dangerous shape is a SECURITY DEFINER
function that takes an identifier and then acts with the definer's authority on
behalf of whoever was named. None of these do that.

---

## 2. Performance: 274 advisories, 1 fixed, 273 assessed and left

### Fixed: the last unindexed foreign key

`admin_bootstrap.added_by` referenced `auth.users(id) ON DELETE SET NULL` with
no covering index. `docs/HANDOFF.md` section 6 requires a covering index on
every foreign key, and this was the only one missing.

Worth more than the rule: the constraint runs toward account deletion, so the
scan is not on reading `admin_bootstrap`, it is on deleting a person, inside
that transaction, holding a lock. That path already has history here, in the
`on delete set null` plus UPDATE-refusing trigger note that locked somebody out
of deleting their own account.

Applied as `20260807101114_the_last_foreign_key_without_a_covering_index` and
mirrored into `supabase/migrations/`. Verified live: the index exists.

### Left: 239 multiple permissive policies, WARN

Worst offenders: `listing_access` and `listings` at 20 each, `area_members` 12,
then `agent_applications`, `bookings`, `reports` and `support_tickets` at 10.

A representative one: `agent_applications` has both
`agent_applications_select_admin` and `agent_applications_select_own` as
permissive SELECT policies. Postgres ORs them, so both are evaluated.

**That is the correct way to express "an admin sees all, an owner sees their
own", and it is not going to be changed.** Collapsing 239 of these into single
policies means rewriting the access rules of the entire platform, on a live
database, to buy planner time that nobody has measured, on a database holding
zero rows. Master Rule 79 forbids premature optimisation, and the risk here is
not a slow query, it is a policy rewrite getting one row visibility wrong.

Revisit if and only if a real query is measured slow under real load, and then
one table at a time with a probe under `set local role authenticated`.

### Left: 34 unused indexes, INFO

**Meaningless today.** The catalogue is empty: zero listings, zero agents, zero
bookings. An index is reported unused because nothing has ever queried it, not
because it is redundant. Dropping indexes on this evidence would delete exactly
the indexes the platform needs the day it has traffic.

Re-run this linter after the platform has carried real load for a month. That
is the first point at which the list means anything.

---

## 3. The caveat that governs everything above

**The database is empty.** Both linters were run against a schema with no data
in it. That is fine for the security list, which is about grants, policies and
function definitions and does not depend on rows. It makes most of the
performance list unreadable, which is why only the one structural finding was
acted on.

Re-run both after the first real month:

```
get_advisors(project_id, "security")      # expect the same eleven, ten cleared here
get_advisors(project_id, "performance")   # expect the unused-index list to become real
```

---

## 4. Do not "fix" these

A future reader running the linter will see the same list and reasonably try to
clear it. Each of these breaks something:

- **Revoking anon EXECUTE on `platform_stats`** turns the landing page's numbers
  band into an error state for every signed-out visitor.
- **Revoking anon EXECUTE on `agent_trust`** empties the trust panel on every
  agent profile read by somebody who is not signed in, which is most readers.
- **Adding an RLS policy to `rate_limits`, `idempotency_records` or
  `places_cache`** hands a signed-in user reach into the machinery that stops a
  payment being taken twice. The absence of a policy is the control.
- **Consolidating the permissive policies** rewrites the platform's access
  rules for an unmeasured gain. Section 2 has the reasoning.
- **Dropping the unused indexes** removes what an empty database has simply not
  had occasion to use yet.

And one thing that SHOULD be changed, so it is not lost among them: leaked
password protection in section 1.1. That one is a real setting, not a lint.
