# The founder's component library: the source, as supplied

**This directory is reference material. Nothing in it ships, and nothing in it
compiles.** It is here because Session 3 reported, correctly, that the component
code did not exist in the repository and only a description of it did. Now the
code is here, so no session has to build from a paraphrase of a paraphrase.

The founder supplied nine pieces on 5 October: an unfolding accordion, a sliding
pagination indicator, a drag to confirm control, a hover-layered call button, a
dynamic island, a particle delete, a payment status, a payment receipt printer,
and four `shadcn` registry commands.

## Read this before you touch any of it

**`docs/design/COMPONENT_LIBRARY.md` is the specification. These files are the
evidence.** Where the two disagree, the specification wins, and its twelve point
porting checklist is what a ported component passes before it ships.

The extensions are `.tsx` so the files read as code in an editor. They are under
`docs/`, which is outside every gate in this repository: the typecheck's include
globs are relative to `apps/web`, `check-css-tokens.mjs` walks `apps/web/src`,
`eslint` runs in the `@vallo/web` workspace, and `check-no-em-dash.mjs` reads only
`.md` under `docs/`. **That is the only reason this code can sit in the repository
at all.** Copy a line of it into `apps/web/src` unchanged and the build stops.

## What is wrong with it, concretely

Every file. Not a criticism of the founder's taste, which is the point of keeping
them: a list of the edits a port makes.

1. **Imports this repository does not have.** `framer-motion`, `lucide-react`,
   `../../lib/utils` for `cn`, `../../lib/motion-tokens` for `motionTransitions`.
   The first is authorised and installed per D34. The rest are not: Vallo has its
   own icon system and its own motion tokens, and the port maps to them.
2. **Raw colour.** Hex and Tailwind palette literals throughout, including a lime
   `#82ff22` that is not a Vallo colour in any theme. `check-css-tokens.mjs` fails
   the build on raw colour, by design, so every one becomes a token.
3. **Invented data.** "EasyUI Store", `tx_9842a8d11c7f`, "AUTH #99824", a drawn
   barcode, invented amounts. A fabricated transaction on a payments screen is the
   one thing this repository refuses most firmly. Every value comes from a prop,
   and the empty state is drawn rather than filled with a plausible fake.
4. **Infinite spinners.** Vallo does not ship a spinner that can spin forever. A
   wait has a deadline and a failure has words.
5. **No reduced-motion path in some pieces**, where others have one.

## The four `shadcn` commands: do not run them

`shadcn-installs.txt` holds four commands that pull `button`,
`batch-gesture-tray`, `ai-response` and `glass-navbar` from the
`Surajmaurya1/easyui` registry. **No session runs them.** `shadcn add` writes
arbitrary code from a third-party registry straight into the source tree, the
registry is one individual's and is not pinned to a version or a hash, and this
application takes card payments. That is a supply chain decision, not a styling
one, and it is not a session's to make.

What the founder wants from those four is in the specification instead: the glass
navigation and its hamburger pull, which he wants in **inner** areas and never as
the primary navigation; the gesture tray; the streaming response treatment; and
the button, which Vallo already has and which D2 made a rectangle by default. The
founder's own note, kept verbatim at the end of `shadcn-installs.txt`, says the
rest plainly: "all this should be upgraded to our style and our vibes".

If a piece of those four is genuinely wanted as code rather than as a reference,
the founder can paste it here the way he pasted these, and it gets read and
ported like the rest.
