import { useEffect } from "react";
import { motionQuiet } from "./gate";

/**
 * A CHIP OR TILE THAT HAS JUST BEEN CHOSEN GIVES A SMALL PUSH BACK (Session 3,
 * R2; MOTION_SYSTEM "Chip select": scale 1.0 to 1.03, `land` 160ms).
 *
 * It answers the tap, not the page: a tile that arrives already chosen (the
 * drawer opening on a search with filters on) must not pop, so this cannot be
 * an `[aria-pressed="true"]` keyframe in a stylesheet, which would play for
 * every chosen tile at mount. Instead one delegated listener on the panel
 * watches clicks, waits a frame for React to apply the new state, and plays a
 * Web Animations pop on the control that was tapped only if it is now chosen.
 * A tile being turned OFF does nothing. Transform only, from the tokens, and
 * `motionQuiet()` (reduced motion, Calm, Off) draws nothing at all.
 *
 * Not a payoff: it is 1.03, the chip's own number, and it never carries a
 * haptic or sits on a money figure.
 */

/** The controls that pop: the filter sheets' tiles, and any `.nf-choice` or `.nf-chip`. */
const CHOOSABLE = ".nf-filters__tile, .nf-choice, .nf-chip, .nf-stays-tile, .nf-icon-tile-option";

/** A panel opts in by carrying this attribute; only controls inside one pop. */
const SELECT_POP_ATTR = "data-select-pop";

function chosen(el: Element): boolean {
  return el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-checked") === "true";
}

/** Reads a token's duration in ms, with the spec's number as the floor of belief. */
function tokenMs(root: HTMLElement, name: string, fallback: number): number {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return raw.endsWith("ms") ? value : raw.endsWith("s") ? value * 1000 : fallback;
}

export function popOnce(el: HTMLElement): void {
  if (motionQuiet() || typeof el.animate !== "function") return;
  const root = document.documentElement;
  const duration = tokenMs(root, "--nf-duration-fast", 160);
  const easing = getComputedStyle(root).getPropertyValue("--nf-ease-entrance").trim() || "cubic-bezier(0.16, 1, 0.3, 1)";
  /* `scale`, the individual property, so it composes with a press or a hover
     that is using `transform` on the same control. */
  el.animate([{ scale: "1" }, { scale: "1.03" }, { scale: "1" }], { duration, easing });
}

/**
 * Mount once in the component that owns a panel whose root carries
 * `data-select-pop`. The listener sits on the document, not on the panel,
 * because a sheet's body is portalled and mounts after its owner does.
 */
export function useSelectPop(): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(CHOOSABLE) : null;
      if (!target || !target.closest(`[${SELECT_POP_ATTR}]`)) return;
      const wasChosen = chosen(target);
      /* One frame: React has applied the new `aria-pressed` by then. */
      requestAnimationFrame(() => {
        if (target.isConnected && !wasChosen && chosen(target)) popOnce(target);
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
