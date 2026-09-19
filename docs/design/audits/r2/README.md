# R2 functionality audit tooling

Four scripts under `scripts/audit/`. Each runs with plain `node`, needs no
install beyond the repo's own `node_modules`, prints a clear PASS or FAIL
summary, and exits non-zero when it fails. They exist so that "is anything a
picture of a feature" stops being one auditor's opinion and becomes a check
somebody can run before a push.

They are deliberately cheap. The first drafts parsed all eleven hundred
TypeScript files with the compiler API and took four and a half minutes on a
loaded box, which means nobody would ever have run them. Only the one check
that genuinely needs a syntax tree still builds one.

---

## 1. Route inventory

```
node scripts/audit/route-inventory.mjs            # every route, with reachability
node scripts/audit/route-inventory.mjs --orphans  # just the problems
node scripts/audit/route-inventory.mjs --json     # machine readable
```

Enumerates every `page.tsx` and `route.ts` under `apps/web/src/app`, resolves
each to its public URL with route groups stripped, and answers three
questions.

**Is it reachable?** It collects every path-shaped string in the tree, turns
each template hole into a wildcard segment (`/u/${handle}/followers` becomes a
three-segment path with an unknown middle), and matches those against the
route table. A route linked only from inside its own folder is `SELF_ONLY`:
you can move around in it once you are there and there is no door from the
rest of the product. A route nothing points at is an `ORPHAN`.

**Does it render?** A page needs a default export; an API route needs at least
one HTTP verb exported.

**Do its links go anywhere?** The reverse question, and the one that finds
real damage. Every path written in a navigation context (`href=`, `href:`,
`router.push`, `router.replace`, `redirect()`, `NextResponse.redirect`) is
checked against the route table. A path the product navigates to and this
build does not serve is a dead link, and the report names the files that
offer it.

The route table includes the `redirects()` and `rewrites()` sources in
`apps/web/next.config.ts`, because those are routes too. It reads those two
blocks and no others: `headers()` uses the same `source:` key and its last
entry is `/:path*`, which matches everything, so a script that reads the whole
config declares every link served and finds nothing. Both failures happened
while this was being written and both are commented in the file.

Exit 1 on an orphan page, a non-rendering route, or a dead link. Orphan API
routes are listed and do not fail the run, because webhooks and cron
endpoints are called from outside the tree by design.

## 2. Dead control sweep

```
node scripts/audit/dead-controls.mjs
node scripts/audit/dead-controls.mjs --all                # include the dev previews
node scripts/audit/dead-controls.mjs --filter components/app/wallet
node scripts/audit/dead-controls.mjs --json
```

This one parses. It builds a real TSX syntax tree for every `.tsx` file and
walks the JSX, because the questions it asks cannot be asked of text: whether
a handler's body is empty, whether a button sits inside a form that has an
action, whether an attribute's value is a literal or an expression.

It flags:

| Code | Meaning |
| --- | --- |
| `DEAD_BUTTON` | a `<button>` or `<Button>` with no `onClick`, no submit type, no `form`, and no enclosing `<form>` carrying an action |
| `NOOP_HANDLER` | an `onClick`/`onSubmit`/`onChange` whose body is empty, or only calls `preventDefault` |
| `HASH_HREF` | `href="#"`, `href=""` or a `javascript:` href |
| `MISSING_HREF` | an `<a>`/`<Link>`/`<ButtonLink>` with no href at all |
| `ALWAYS_DISABLED` | `disabled` or `disabled={true}` as a literal, so the control can never be pressed |
| `DEAD_INPUT` | a controlled field with a `value` but no `onChange` and no `readOnly`, so the user cannot type in it |

It knows about this codebase's shapes so it does not cry wolf: a
`type="hidden"` input carries a value into a submit and is not a field; an
uncontrolled radio or checkbox uses `value` as the submitted datum; a
component taking a spread may be receiving its handler through it, so it is
left alone rather than guessed at.

Exit 1 on any high-severity finding.

**It has no exception list, and that is deliberate.** Its four findings were
all in `app/(site)/styleguide/page.tsx`, and the cheap answer was to exempt the
path on the grounds that a styleguide's buttons are specimens. That answer was
refused: an exemption is a permanent promise never to check a file again, so
the next genuinely broken control added to that page would go unreported
forever. The specimens were given the behaviour they are specimens of instead -
press one and it copies the line that draws it, and the two states have a
switch each rather than a frozen picture - and the argument is written out at
the head of `app/(site)/styleguide/ButtonSpecimens.tsx`. A listed exception is
a job, not a ruling.

## 3. Smoke tests

```
# from apps/web, one dev server only, and stop it when you are done
NEXT_DIST_DIR=.next-r2 npx next dev -p 3111

node scripts/audit/smoke.mjs
node scripts/audit/smoke.mjs --base http://127.0.0.1:3111
node scripts/audit/smoke.mjs --only stays
node scripts/audit/smoke.mjs --json
```

Walks the critical journeys against a running dev server. This sandbox reaches
no database and holds no session, so the script is explicit about which of two
kinds each row is: a `product` row is a real route served signed out, and a
`fixture` row is a preview route under `app/(dev)/preview` that renders the
real components on fixtures. A signed-in journey against live data cannot be
walked here and the report does not pretend otherwise.

Per URL it checks the status, that the body is not Next's error overlay or a
"page could not be found", that a `<main>` was rendered at all, that no
rendered anchor carries a dead href, and that banned copy (rule 13) did not
reach the page. Rows marked `mustExist` are there to prove a link the product
actually offers resolves rather than 404s: `/agents` (it does, through a
next.config redirect), `/reviews` and `/support` (they do not).

`R2_TIMEOUT_MS` raises the per-request timeout. On a loaded box a first
compile can take minutes, and a request that times out is a machine fault, not
a product fault. **Do not believe a red smoke run taken above load 80.** Wait
and run it again.

## 4. States checklist

```
node scripts/audit/states-checklist.mjs
node scripts/audit/states-checklist.mjs --gaps   # only surfaces with a hole
node scripts/audit/states-checklist.mjs --json
```

For every product surface it asks whether there is a loading state, an empty
state, an error state and a signed-out state, and whether each is designed or
accidental.

- **designed** means a named state object: `EmptyState`, `EmptyActions`,
  `ResultScreen`, `Unreachable`, `QueueEmpty`, `Tombstone`, a `loading.tsx`, an
  `error.tsx`, an `AuthGate` or an `AccessScreen` - or a ternary whose empty
  side DRAWS, which is how most of this tree writes it.
- **accidental** means the section simply vanishes: a `.length` check that
  omits rather than draws, a `<Suspense>` with a bare fallback.

Two deliberate narrowings keep the report worth reading. A surface only needs
an empty state if it RENDERS A COLLECTION; a settings form or a sign-in screen
has no empty state to design, and listing those buried the surfaces that
genuinely do. And a signed-out gate is looked for up the whole layout chain,
because the admin and agent consoles gate in a layout rather than in the page.

**What a surface is, corrected 19 September.** The first cut took a surface to
be every file at or below the page's folder, and matched a fixed list of names
anywhere in that text. Both halves misreported, and the script was failing five
surfaces of which four were already correct:

- a nested route (`/profile/setup/[role]`) was being read as part of its parent,
  so the parent was called a data surface for its child's queries;
- a view filed under `components/` (`ListingReviews.tsx`) or one folder up
  (`SharePicker.tsx`) was invisible, so surfaces that draw a full `EmptyState`
  were reported as drawing nothing;
- `xs.length > 0 ? <list/> : <what to say instead/>` matched nothing at all;
- `interests.map(...).join(", ")` counted as rendering a collection.

So: the walk stops at the next `page.tsx`; the surface also carries what the
page DIRECTLY imports, one hop, project files only, where the component must be
RENDERED rather than merely defined (two hops reaches `Screen.tsx` and every
page that imports it for the type scale would pass); a `.map` counts as a
collection only when its callback returns JSX; and whether a length ternary
draws or omits is read off a syntax tree, because the question is which branch
is the empty one and text cannot answer it. The condition must be an emptiness
test against zero or one-or-more and nothing else: `accounts.length === 1` is a
plural, and it passed the first cut.

Marketing pages, legal pages, the auth screens and the offline shell are
public by design and are not asked for a signed-out state.

Exit 1 when any collection surface draws nothing when empty.

---

## Running the lot

```
node scripts/audit/route-inventory.mjs --orphans
node scripts/audit/dead-controls.mjs
node scripts/audit/states-checklist.mjs --gaps
# then, with one dev server up:
node scripts/audit/smoke.mjs
```

The first three take about a second each on an idle box and need nothing
running. Only the fourth needs a server.

## What these do not check

Said plainly, so nobody reads a green run as more than it is.

- **Nothing signed in.** No session exists here, so every gate, every RLS read
  and every write path is unwalked. The preview harness proves the components
  render on fixtures; it does not prove the data reaches them.
- **No writes.** Whether a form actually saves is a database question and this
  sandbox has no database.
- **Runtime handlers.** The dead control sweep sees that an `onClick` exists
  and that its body is not empty. A handler that sets state nothing reads, or
  calls an action that returns early, still reads as live.
- **The side law.** Which shell an object opens in depends on the href a card
  is given, and no script here knows a listing's kind at the call site. That
  one is still read by a person; the findings list says where it broke.
