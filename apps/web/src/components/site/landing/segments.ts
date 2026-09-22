/**
 * THE THREE SEGMENTS OF THE LANDING SEARCH CONTROL, AND THE COUPLING THEY
 * CARRY. READ THIS BEFORE YOU CHANGE EITHER ONE.
 *
 * `ORDER` is the whole truth about how many segments the control has and what
 * order they sit in. Two other things read it and neither may be edited alone:
 *
 *   1. `SearchPill.tsx` drives `--nf-seg-count` from `ORDER.length`, so the
 *      stylesheet's track count can never again disagree with the segment
 *      count. It did for weeks: the CSS hardcoded four tracks after the Invest
 *      segment was removed from the component, and a quarter of the product's
 *      primary control was dead space on every phone.
 *
 *   2. THE LANDING HEADLINE NAMES THESE SAME THREE ACTIONS IN THIS SAME ORDER.
 *      "Rent, buy or stay. Without the runaround." is the founder's approved
 *      line (HANDOFF 09 section 2.1), and the reason it uses the control's own
 *      verbs is that the headline teaches the control and the control proves
 *      the headline. IF ONE CHANGES, THE OTHER CHANGES IN THE SAME COMMIT.
 *      The headline lives at `landing.face.hero.title1` in
 *      `packages/i18n/src/locales/en.ts`, the segment labels at
 *      `landing.face.search`, and `headline-coupling.test.ts` beside this file
 *      fails if the two ever drift apart.
 *
 * There is no fourth segment and there was one once. Invest pointed at
 * `/search?type=land`, which is a land listing and not an investment product,
 * so the control was naming a capability Vallo does not have. Land is still
 * reachable from the category grid and from the filter drawer. Vallo sells no
 * investment product; do not put it back.
 *
 * This module holds no JSX and imports nothing, so the coupling can be proved
 * by a plain node test without rendering a client component.
 */

export type Segment = "buy" | "rent" | "stay";

/** The segments, in the order they are drawn and the order the headline says. */
export const ORDER: readonly Segment[] = ["buy", "rent", "stay"] as const;
