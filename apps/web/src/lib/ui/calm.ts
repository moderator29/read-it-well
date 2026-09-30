/**
 * Whether this reader asked for less motion: the system's reduce-motion, or
 * the in-app Motion setting at Calm or Off (which writes `data-reduce-motion`
 * on the root; `lib/motion/motion-pref.ts`). One question for the small
 * things that move by script (a smooth scroll, a pull), since CSS already
 * answers it for everything that moves by stylesheet.
 */
export function prefersCalm(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
    return document.documentElement.getAttribute("data-reduce-motion") === "1";
  } catch {
    return false;
  }
}
