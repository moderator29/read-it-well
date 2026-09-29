/**
 * THE SCROLL REVEAL, ONE SYSTEM (UIUX item 25, 29 September 2026).
 *
 * This file used to be a second reveal with its own offset, its own easing
 * and an uncapped `delay` (the landing's category tiles waited `i * 40`ms,
 * so the eighth tile started 280ms after the first and a longer list would
 * have waited longer still). The landing's rooms and the app's pages now
 * share `MotionReveal`: rise 16px and fade on the entrance curve, children
 * staggered 60ms with the sixth as the last step, triggered once when the
 * block crosses 8 per cent above the foot of the viewport, and never hidden
 * under reduced motion, Calm or Off (`lib/motion/gate.ts`).
 *
 * `Reveal` stays as a name so the pages that import it keep working; it is
 * `MotionReveal`, with the same `as`, `className` and `delay` (now capped).
 * The guarantees the old component carried (visible in the server markup,
 * only a block below the fold is ever hidden, no observer means no hiding)
 * are `MotionReveal`'s, and `reveal.test.ts` beside this file holds them.
 */
export { MotionReveal as Reveal } from "@/components/motion/Reveal";
