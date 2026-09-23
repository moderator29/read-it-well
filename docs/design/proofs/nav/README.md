# The back control, walked

`scripts/design/proof-nav.mjs` writes everything in this folder. Nothing here
is written by hand, and nothing here is a screenshot: the question these files
answer is not what a screen looks like, it is whether the back control DREW and
where pressing it LANDED.

## Why the walk exists

`apps/web/src/lib/nav/route-parents.ts` declares a parent for 143 routes.
Twenty-two of them drew no back control at all, so from the reader's side those
screens had a hierarchy written down and nothing on the glass. The founder's
sentence for it: "I can be inside the Console, press back, and land on the login
page. History is not hierarchy."

The gap list was first produced by reading the import graph, and that read was
wrong in both directions:

- it credited `/around` with a control, because the page imports `SocialPaused`,
  which imports `PageHeader`, which calls `useBack`. Every link in that chain is
  real and the running feed has no back control, because `SocialPaused` is the
  social kill switch's notice and nobody sees it;
- it would have credited any page whose control sits behind a signed-in branch.

An import is not a render. So the list is only trustworthy once a browser has
been down all of it, which is what these files are.

## The files

| file | what it holds |
|---|---|
| `walk.json` / `walk.md` | the twenty-two subjects, SIGNED OUT against the live Supabase keys, so the proxy's product gate is doing what it does to a stranger |
| `open/walk.json` / `open/walk.md` | the same twenty-two with the gate lifted (see the last section), which is where `/settings`, `/styleguide`, `/search` and `/around` can be pressed all the way to their parents |
| `survey.json` / `survey.md` | every static non-root route in the map (110 of 140), cold press only. This is the check on the gap list itself |
| `shots/*.png` | the control in place, 390 dark, top 420px, eight of the nineteen. A control that lands correctly and sits on top of the title is still wrong, and no landed path can show that. Eight rather than all of them because the fourteen public pages share one mount and therefore one placement: `_about` and `_docs_what-vallo-is` stand for the group, and the rest are the screens that each got their own placement |

## What the two tables say together

With the gate lifted, nineteen of the twenty-two draw a control and every press
lands on the declared parent, cold and warm. The other three draw nothing on
purpose and `lib/nav/route-parents.ts` says why: `/crypto` and `/crypto/[id]`
are `notFound()` by the store ruling, and `/offline` is the service worker's
fallback whose way up is the brand lockup.

**`/search` and `/around` signed out are a finding, and it is not the control's.**
Both declare `/home`, the control pushes `/home`, and `/home` is a gated
product segment, so the proxy answers a signed-out visitor with `/sign-in`,
which the first-run gate then turns into `/welcome`. The symptom is the
founder's own sentence - press back, arrive at the login page - and the cause is
a different one: the hierarchy is correct and the parent is behind the wall.
Browsing is deliberately open on this product while `/home` is not, so the two
public shelves hang under a private root. That is a decision about
`PRODUCT_SEGMENTS`, not about `route-parents.ts`, and it is written down here
rather than smoothed over, because a green row for `/search` would have hidden
it.

`cold` is the route opened directly, so there is no history behind it: the deep
link and the push notification case, where `chooseBack` must PUSH the declared
parent. `warm` is the parent loaded first and then the child, so the entry
behind really is the parent and history may be walked. Both must land on the
same place, and that place is the declared parent. A route where the two
disagree is a defect, not a nuance.

## The five guards, and what each one cost

The script refuses a row rather than scoring it whenever:

1. the HTTP status is not a 2xx;
2. the browser ended somewhere other than the URL asked for, **checked after the
   page settles and not the instant `goto` returns**. `/messages/new` with no
   listing in the query and `/around/manage` both redirect CLIENT SIDE, so the
   early check saw the route it asked for and the walk inspected somebody else's
   screen. It wrote `/messages`'s control down under `/messages/new` and then
   called a correct control a mismatch. That is `verify-shots.mjs` writing five
   PNGs of the sign-in screen under five other route names, one layer in;
3. the page carries `[data-nf-not-found]`, because a layout `notFound()` answers
   **200** with the not-found body, which is how `/crypto` and `/gallery` answer;
4. the page **rendered blank**;
5. the control is in the markup but **never hydrated**. Rebuilding into the dist
   directory a running server was serving from made every chunk answer 500, so
   no JavaScript loaded and every back control on the site was a server-rendered
   corpse: present, 20 by 20, and dead. Without this the rows would have blamed
   the control for "the URL never changed".

The blank guard is the one to keep. Without it a blank page scores: status 200,
landed correctly, no not-found marker, and no `[data-nav-back]` in the DOM, so
the row would read "no back control drawn". That sentence is true and the report
is false, because nothing drew at all. A blank page is its own finding.

Measuring "blank" honestly took three attempts. `innerText` needs layout and
reports 29 characters for the Around feed, whose content is real and below the
fold, so a working page read as blank. `textContent` counts the RSC flight
payload in the `<script>` tags, a hundred kilobytes on every route, so a page
that rendered nothing read as full. The measure is the body cloned with the
script, style and template nodes removed: the text a person would have in front
of them.

## The instrument proves itself before it reports

`selfTest()` runs first and the walk exits non-zero if any of it fails:

1. `/` is a declared ROOT and must draw **no** control. If the selector matched
   anything loosely, every row below would pass for the wrong reason.
2. A route nobody has ever written must be refused, not reported.
3. A page emptied by hand must be reported BLANK, not as a missing control.
4. Pressing the control on a known-good route must really change the URL, so
   "landed nowhere" means the control did nothing rather than that the script
   never waited.

## Running it

```
cd apps/web
NEXT_DIST_DIR=.next-nav npx next build
NEXT_DIST_DIR=.next-nav npx next start -p 3377 &
PROOF_BASE=http://127.0.0.1:3377 node ../../scripts/design/proof-nav.mjs
PROOF_SURVEY=1 PROOF_BASE=http://127.0.0.1:3377 node ../../scripts/design/proof-nav.mjs
```

`next start`, never `next dev`: dev does not hydrate reliably on this machine,
and an unhydrated button is a dead button, which the script would correctly and
uselessly report as a dead control.

`/settings` and `/styleguide` are behind the proxy's product gate and there is
no seeded session on this machine, so they are walked against a build made with
the Supabase keys absent, where `isSupabaseConfigured()` is false and the proxy
is a pass-through. That reaches the page and its chrome; what it cannot reach is
anything the page would draw only for a signed-in reader. Said here rather than
implied by a green row.
