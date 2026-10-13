# The cross-session contract

**From Session 1, 6 October 2026.** Founder directive D19: not two sessions building
the same thing.

**The rule.** One owner per concern, declared before work starts. A session that finds
itself about to build something another session owns **stops and writes it into its
response file** rather than building it. The other session reads that file and picks
it up.

This is not bureaucracy. Three sessions working the same 200-page codebase in parallel
without a boundary produces merge conflicts, duplicated components, two state machines
for one flow, and a fortnight spent reconciling them.

---

## 1. The boundary, in one line each

| Session | Owns | Does not own |
|---|---|---|
| **2 Backend** | Everything behind the server boundary: schema, migrations, RLS, server actions, provider adapters, money logic, state machines, jobs, webhooks | Anything a person sees |
| **3 Experience** | Everything a person sees: layout, structure, components, motion, copy placement, icons, themes | Anything that decides what is true |
| **4 QA and release** | Proving it, the device and store lanes, legal pages, documentation | Feature work of any kind |

**The test that resolves almost every case:** ask whether the thing **decides what is
true** or **presents what is true**. Deciding is Session 2. Presenting is Session 3.
Proving is Session 4.

## 2. The cases that actually cause collisions

Each of these has been assigned deliberately because each one is where two sessions
would otherwise both reach.

| Concern | Owner | The other session's part |
|---|---|---|
| **A new screen needing new data** | 2 builds the query and action, 3 builds the screen | 3 builds against the real query; if it does not exist, 3 writes the route and the shape it needs into its response file and moves on. **3 never invents a query** |
| **A state machine** | 2 | 3 renders its states and may say a state is missing or unclear, in its response file |
| **Money wording** | 2 drafts it in `lib/money/copy.ts`, flagged for the founder and counsel | 3 places it and may not write a new money sentence |
| **Entitlements** | 2 owns the check and the plan table | 3 owns the **presence rule**: whether the Pro switch appears at all |
| **The Space rename** | 3, in one deliberate change, together with the i18n keys and the terminology test | 2 provides the model and enums and does not rename the user-facing vocabulary |
| **Feature onboarding** | 3 owns the system and the screens | 2 owns the server-side seen-state so it survives a device change |
| **Streaks (D17)** | 2 owns the counting, the pause rule and the ledger | 3 owns the display and the earned moment |
| **Charts** | 3 owns the chart system and the components | 2 owns the aggregation queries and the privacy floor |
| **Empty states** | 3 | 2 ensures the query distinguishes "none" from "failed", because they are different screens |
| **Navigation audit** | 3 performs it | 4 verifies it on devices |
| **Startup animation** | 3 | 2 lands the `/open` deadline first. **3 does not start until it is in** |
| **Admin desks** | 2 builds queries and actions, 3 builds the surface | Neither ships half: a desk without a query is not done, a query without a desk is not done |
| **Test repair** | 4 | 3 records which specs it knowingly broke |
| **Migrations** | 2 only | Nobody else writes one, ever |
| **Legal and policy pages** | 4 | 2 and 3 name what needs saying and do not draft legal text |
| **Documentation** | Whoever contradicted a document fixes it in the same change | 4 owns consolidation and the broken-link sweep |

## 3. Shared files, with a single named owner

Two agents touching one of these at once is the most common cause of a bad merge.

| File or area | Owner | Everyone else |
|---|---|---|
| `supabase/migrations/` | Session 2, agent A1 orders them | Requests |
| `database.types.ts` | Session 2, A1 regenerates | Requests a regeneration |
| `lib/money/copy.ts` | Session 2 | Reads only |
| `packages/i18n/src/locales/*` | Session 3, agent B3 | Requests keys |
| `app/globals.css` and the token files | Session 3, agent B1 | Requests |
| `components/ui/*` | Session 3, agent B1 | Uses, never edits |
| `apps/web/tests/*` | Session 4 | Reports breakage |
| `docs/sessions/*-RESPONSE.md` | Each session writes only its own | Reads all |

## 4. The handshake

1. **Before work starts**, each session writes its agent ownership table into its
   response file. Two agents never hold one file.
2. **When a session needs something another owns**, it writes a numbered request into
   its response file: what it needs, the exact shape, the route or component that
   consumes it, and whether it is blocking.
3. **The owning session answers in its own response file**, by number, saying built,
   changed, or refused with a reason.
4. **Nobody waits idly.** A blocked item is recorded and work continues elsewhere.
   Session 3 builds against a stub it clearly marks, and records it, rather than
   stopping.
5. **Verify, never assume.** A session reads the previous response file and then
   **checks the code**. A session that claims something was done is not evidence it
   was done.

## 5. Order and overlap

The sessions are not strictly serial. What is strictly ordered:

```
2: /open deadline ─────────────► 3: startup animation
2: entitlement check ──────────► 3: Pro switch presence
2: analytics queries ──────────► 3: chart screens
2: financial schema ───────────► 3: wallet, escrow, receipt screens
2: streak counting ────────────► 3: streak display and earned moment
3: the full redesign ──────────► 4: test repair
3: navigation audit ───────────► 4: device verification
2 and 3 both complete ─────────► 4: store submission
```

Everything else can run in parallel. **Session 3 does not wait for all of Session 2**:
the foundations, navigation, Get Started, onboarding, landing, discovery, social and
admin material passes depend on nothing Session 2 is building.

## 6. Connective work (D20)

Every session is expected to find and build the things that connect new features to
old ones, make a flow whole, or add a tool that makes a named feature actually work.
This is encouraged, and it is the most likely source of accidental duplication, so:

- It must **connect or complete** something, not start an unrelated area.
- It must be **inside your own boundary** under sections 1 to 3.
- It must be **recorded** in your response file: what it connects, why, and what it
  touched.
- If it crosses a boundary, **write the request instead of building it**.

**Session 3 carries this most heavily**, per the founder: the frontend design and
sweep session should make legendary decisions, and it has explicit authority over how
surfaces work, not only how they look.
