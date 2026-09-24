# The voice

How Vallo speaks when there is nothing to show, when something is loading, when a
person is offline, when something failed and when something is done. These rules
come from the empty states that were already the best-written screens in the
product. They are written down here so the next writer can follow them without
having to guess the taste behind them.

One component draws all five states: `apps/web/src/components/ui/State.tsx`.
The rules a machine can check are in `apps/web/src/lib/design/voice.ts`, and
`node scripts/design/state-sweep.mjs` holds the source to them.

## The anatomy

Every state has the same four parts, and never more:

1. **A glyph.** Use the commissioned object where the state has one. Otherwise
   use the kind's plate: search for empty, info for offline, a stop for error and
   a tick for done, each on its tone's fill.
2. **One title, under 40 characters.** It fits on two lines at 390px.
3. **One sentence of body, under 180 characters.**
4. **At most two actions: one primary and one quiet secondary.** They are
   stacked and full width.

A loading state has no glyph, body or actions. It shows three lines of skeleton,
and its title becomes the label a screen reader announces.

## The rules

**Second person.** Write "Your bookings will appear here", never "The user has no
bookings". On someone else's page, use the third person and name them.

**Say what will appear, and why it is not here yet.** An empty state is a
sentence, not a shrug. Write "Tap the heart on a listing and it will wait for you
here." Never write "Nothing found."

**One sentence of body.** If it needs two, the second belongs on the screen the
action leads to.

**Never assert what the code cannot prove.** This is the claims rule, applied to
states:
- An error says what did not happen and what is still safe, for example "Nothing
  was moved." It never says "Don't worry" or "All good", because no code checked
  that.
- The 404 does not promise that "every place on Vallo is still where it should
  be".

**No joke that belongs to one side.** Renters, landlords, hosts and staff all see
the same shared screens. "This page has checked out" is a hotel joke on every
404, so it is banned.

**The action names where it goes.** Write "Find a place", "Back to home" or "Open
your wallet". Never write "OK", "Continue", "Go", "Submit" or "Click here".

**No shrugs.** "Oops", "Whoops", "Uh oh" and "Something went wrong" say nothing.
Say what happened instead.

**No promises about the future.** No state says when something will arrive.
The banned-word specs in `lib/copy/banned-phrases.test.ts` already fail those
promises everywhere in the product.

**A state that would leave somebody stuck offers a way onward.** Empty, offline
and error states each carry an action. Loading and done may not need one.

## Tone and announcement

| Kind    | Plate tone | Announced as     |
|---------|------------|------------------|
| loading | none       | `role="status"`  |
| empty   | brand      | nothing: it is the page |
| offline | pending    | nothing: it is the page |
| error   | error      | `role="alert"`   |
| done    | success    | `role="status"`  |

## Where the old families stand

The product grew six families for this. They become thin wrappers over `State`,
their call sites move to it route by route, and the wrappers are then deleted.

| Family | File | Status |
|---|---|---|
| `EmptyState` | `components/app/Screen.tsx` | Now a wrapper over `State`. |
| `EmptyPanel` | `components/social/profile/EmptyPanel.tsx` | Wraps `EmptyState`, so it already draws the kit. |
| `EmptyActions` | `components/app/EmptyActions.tsx` | The kit's action shape, so it stays. |
| `SystemMoment` | `app/offline/SystemMoment.tsx` | To migrate. It is the full-screen brand moment for the 404, offline and error pages. The 404's words are rewritten to these rules. |
| `ResultScreen`, `ResultSheet` | `components/app/ResultSheet.tsx` | To migrate onto `kind="done"` and `kind="error"`. |
| Route `loading.tsx` files | 93 files | To migrate onto `kind="loading"`. |

## The ratchet

On 24 September 2026, ten literal titles and bodies on the wrappers still being
migrated broke the length limits. The seven on agent inspections, host photos,
host reservations, host rooms and the feed were rewritten the same day. The
three left are on the wallet and wallet transactions screens, which belong to
the audit session.

The sweep lists them as owed rather than failing on them. `LEGACY_BUDGET` is
now 3 and may only go down: a new long line on a wrapper fails the sweep. So
does any problem at all on a `<State>` call site.

## What the sweep cannot see

The sweep does not resolve copy passed as an expression, such as
`title={t.wallet.emptyTitle}`. It reads literal props, the 404 and the kit's own
copy in the trustVisible namespace, and those are checked through the dictionary
in `voice.test.ts`. The sweep reads source text only. It proves nothing about
what a browser rendered.
