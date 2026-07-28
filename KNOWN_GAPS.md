# Known Gaps

Everything deliberately incomplete, with why and what unblocks it. Nothing here
is hidden behind a passing build.

Last updated: 2026-07-28

---

## Blocking a decision from the owner

| Gap | Detail |
|---|---|
| **Admin navigation undecided** | Four incompatible admin rails across references 04, 06, 07 and 09 (15, 13, 14 and 16 items). Master Rule 17 freezes navigation, so no admin surface can be built until one wins. See intake C-10. |
| **NaijaFinds Pro** | A paid tier appears in four references and in no specification document. Recommendation is to defer. Nothing has been built for it. See intake C-11. |
| **Service fee ownership** | Reference 09 confirms the fee is charged to the guest on top of the nightly rate, but who receives it is undefined, and reference 08 advertises "zero service fees" as a Pro perk. The take rate does not exist. Blocks the settlement model. |
| **Listing wizard** | Reference 03 has 7 steps, reference 09 has 6 in a different order. Blocks the agent listing build. |
| **Location model** | Specifications mandate State to LGA to Neighbourhood. No reference contains an LGA field; they use City and Area. Blocks the first migration. |
| **Reference count** | 11 unique recorded against an owner count of 13 with 3 remaining. Needs reconciling. |

---

## Incomplete in the shipped code

**Authentication.** No session layer. Providers are structured and gated on
environment variables, and the email action validates on the server, but no
credential path issues a session. Unconfigured providers render disabled with an
honest message rather than failing silently. The home route is `noindex` and is
not access controlled, because there is nothing yet to control.

**Discovery.** `/search` is a real route that acknowledges the query and states
that the engine is next phase. There is no search, no map, no filters, no
pagination.

**Listing data.** `NF_DATA_SOURCE` defaults to `seed`. Seed results carry a
visible "Sample content" label wherever they render, deliberately not gated on
`NODE_ENV`, so sample inventory can never appear unlabelled.

**Platform statistics.** `getPlatformStats()` returns null on purpose. The
landing reference shows figures like "Hotels 5,130+", which are mockup numbers.
Publishing invented inventory counts is misleading advertising. The hero cards
render label-only until the aggregate endpoint exists, and gain counts with no
redesign.

**Listing imagery.** Cards draw a deterministic gradient with a skyline
silhouette. No stock photography, because it would misrepresent inventory.

---

## Design system

**Light theme is scaffolded, not designed.** Every supplied reference is dark.
Light tokens exist so components stay token driven, but the theme has had no
design pass and must not be exposed to users until it does.

**Icon coverage.** 34 vector glyphs cover the built surfaces. The reference pack
enumerates roughly 192. The rest are authored as needed. See ADR-003 for why the
raster pack is not the production source.

**Motion.** Entrance, float and pulse only. The full motion system for
navigation, sheets, map transitions, booking confirmation and AI states is not
built. Reduced motion is honoured throughout via token collapse.

---

## Localisation

**Yoruba, Hausa and Igbo need native review before launch.** Translations are
functional and use correct diacritics and hooked letters, but marketing copy in
particular should be rewritten by a native speaker rather than translated
literally. Every locale file carries this warning in its header.

**No `Accept-Language` negotiation.** Locale resolves from cookie then falls back
to English. A first time visitor from a Yoruba language browser still sees
English.

**No pluralisation rules yet.** No string currently needs them. `Intl.PluralRules`
should be wired before the first count-dependent string ships.

---

## Security

**No Content Security Policy.** Needs a nonce strategy compatible with Next
streaming. The other headers are set at the edge.

**Nine high severity advisories remain**, all in the ESLint toolchain via
`brace-expansion`. Lint-time only, never in the shipped bundle or request path.
The six that mattered, in `sharp` and `postcss`, are fixed by overrides.

**No rate limiting, bot protection or audit logging.** These arrive with the API.
There is no endpoint to protect yet.

---

## Testing

**No test suite yet.** `vitest` is installed and wired but no specs exist. The
audit currently run before each commit is typecheck plus production build.
Testing must land with the first business logic, which is authentication. Master
Rule 71 is not yet satisfied and this is the largest outstanding compliance gap
in the repository.

---

## Repository

**Branch is named `claude/repo-cleanup-1spitz`**, which conflicts with Master
Rule 1. The name is fixed by the session harness and needs the owner to move the
work to a product appropriate branch.

**Repository is named `read-it-well`**, which does not match the product.
