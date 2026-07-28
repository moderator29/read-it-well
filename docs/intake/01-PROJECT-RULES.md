# NaijaFinds: Standing Project Rules

The owner's 80 Master Rules plus the final rule, recorded verbatim in intent as
the operating contract for this repository. Where a rule conflicts with a default
behaviour of the tooling, **this file wins**.

Last updated: 2026-07-28

---

## Rules that change how this repository is operated

These have immediate mechanical effect and are called out because they are easy
to violate silently.

**Rule 1, no AI attribution anywhere.** No mention of the assistant, the vendor,
"AI generated", or any attribution in the application, source comments, commits,
metadata, documentation, UI or public-facing content.

**Rule 2, commit authors.** Only `moderator29` and `guddsuddi`. No other identity.
Currently configured as `moderator29 <moderator29@users.noreply.github.com>`.

**Rule 3, no em dash.** Not in UI text, documentation, code comments, commit
messages or any generated content. Use commas, colons, parentheses or restructure
the sentence.

**Rule 5, never commit to `main`.** Roughly 3 to 4 meaningful feature branches
across the whole build. The owner merges.

**Rule 6, audit before every commit.** Inspect the diff, run relevant tests, type
checking, linting, build and security checks, and verify nothing unrelated
changed.

**Rule 7, always commit working code.** No knowingly broken builds, failing
tests, placeholder implementations, fake integrations or unfinished core
functionality.

### Compliance actions already taken

The first three commits on this branch were authored as the assistant and carried
attribution trailers, violating rules 1 and 2. History was rewritten: all three
commits are now authored by `moderator29` with trailers stripped. The branch was
force pushed. No other branch was affected and `main` was never touched.

Rule 3 was also violated by the first draft of `00-INTAKE-STATUS.md`, which used
em dashes throughout. That file has been rewritten without them.

---

## Autonomy and the build gate

**Rule 4** requires working autonomously without stopping for permission on
obvious implementation decisions.

**This does not override the build gate.** Master Execution Instruction §1 and
§59, and the owner's own closing note, require that all design references are
received, the design system and information architecture are settled, the
repository is audited, and the roadmap, recommendations and architecture records
exist, before implementation begins.

The distinction applied here: routine decisions are made and documented, not
escalated. Decisions that would be expensive to reverse and that only the owner
can make, such as which of four conflicting navigation rails is canonical, are
escalated. See `00-INTAKE-STATUS.md` §7.

---

## Rule index by theme

### Engineering discipline
4 autonomy, 6 pre-commit audit, 7 working code only, 8 no fake functionality,
25 no spaghetti architecture, 26 reusable components, 51 image optimisation,
52 performance, 53 query design for scale, 54 never load whole tables,
71 testing mandatory, 72 end to end tests on critical workflows,
73 production readiness audit per phase, 74 no TODOs for core functionality,
75 no shortcuts because MVP is small, 79 no premature optimisation.

### Security
9 never expose secrets, 10 production security mandatory, 11 admin security
stronger than user access, 48 never trust the frontend for financial
calculations, 49 idempotent webhooks, 50 audit trail on every important action,
70 server-side API keys.

### Roles, agents and moderation
12 agent mode is a real role based system, 13 listing approval mandatory,
14 complete listing lifecycle, 15 production ready 10 image system,
18 agent mode must be discoverable, 19 three separated experiences,
20 admin panel is a core product, 57 never lose agent listing drafts.

### Design system
16 references are the visual source of truth, 17 navigation consistent across
every screen, 27 centralised design system, 28 use the 3D icon family,
29 no random colours, 30 motion is part of the product, 31 respect reduced
motion, 55 loading, empty, error, offline and success states, 56 polished forms,
58 optimistic UI only where safe, 59 accessibility mandatory, 60 usability over
effects, 61 exceptional landing page, 64 one design system across categories.

### Product and market
35 no hardcoded Nigerian locations, 36 scalable location architecture,
37 real maps, 38 intelligent search, 44 multilingual from the beginning,
45 scalable translation, 46 configurable currency, 62 not an Airbnb clone,
63 subtle premium cultural identity, 65 design for expansion.

### AI
39 AI understands real platform data, 40 AI respects permissions, 41 AI support
connects to admin, 42 AI knows when it does not know, 43 AI recommendations
explainable.

### Booking and payments
47 transactional booking and payment logic, 48 server-side financial validation,
49 webhook idempotency.

### Integrations
66 abstract API integrations behind adapters, 67 failure handling for every
third party, 68 maintain an API inventory, 69 never assume an API stays free.

### Platform reach
32 mobile is first class, 33 premium responsive web, 34 app store and play store
quality.

### Records to maintain
21 `RECOMMENDATIONS.md`, 22 `ARCHITECTURE_DECISIONS.md`, 23 build roadmap,
24 never delete a working feature to make a new one easier,
76 references are a starting point not a ceiling, 77 implement better solutions
and document them, 78 think in five year horizons,
80 full system review before every major milestone.

---

## Final rule

Treat NaijaFinds as a co-founder responsible for its success, not as a coding
task. Do not follow instructions literally. Understand the product, think ahead,
identify what is missing, make intelligent recommendations, protect the users,
protect the business, and continuously improve the architecture and experience.

The objective is not a website that technically works. The objective is a
world-class Nigerian discovery, property, hospitality, booking and AI platform
that can eventually compete internationally.

---

## Tension log

Places where two rules pull against each other, resolved or awaiting resolution.

**Rule 16 versus itself.** Rule 16 makes the references the visual source of
truth. Rule 17 requires navigation consistency. The references contain six
mutually incompatible navigation rails, so rules 16 and 17 cannot both be
satisfied. Escalated as C-10. Unresolved.

**Rule 4 versus the build gate.** Resolved above.

**Rule 8 versus phased delivery.** No fake functionality, yet early phases ship UI
before payment and provider integrations exist. Resolution is the one both
documents already prescribe: real integration structure with environment
variables and documented setup requirements, with mock implementations isolated
behind adapters and never presented as working.

**Rule 15 versus reference 09.** The 10 image cap versus a media manager showing
videos, virtual tours and documents. Escalated as C-12.

**Rule 62 versus reference 08.** "Not an Airbnb clone" versus a consumer rail and
property detail that closely follow the standard marketplace pattern. Worth a
deliberate look during the design system phase rather than an accident.
