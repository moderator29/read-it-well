import { motionQuiet } from "@/lib/motion/gate";

/**
 * THE PARTICLE DISSOLVE, as a function, so `ParticleDelete` is the thin wrapper
 * and a list can also call it directly. The founder's `particle-delete.tsx`
 * imported this from a `lib/particle-delete` that was not supplied with the
 * source, so it is written here from the behaviour the component describes:
 * the element breaks into small pieces that drift away and fade, and then it is
 * gone.
 *
 * HOW. A fixed, click-through layer is laid exactly over the element and filled
 * with a grid of small squares. Each square is moved on a CSS keyframe
 * (`nf-particle`, ported.css): a translate, a shrink and a fade, which is
 * transform and opacity only, on a known track, so it is CSS and not
 * framer-motion. The original element is hidden at once (opacity 0), so what the
 * eye sees is the element becoming its own particles. Everything is awaited:
 * the promise resolves when the last piece has finished, the layer is removed,
 * and the caller may then remove the element for real.
 *
 * DETERMINISTIC (MOTION_SYSTEM principle 7). Every piece's direction, distance,
 * delay and tone comes from a seeded generator, never `Math.random`, so the same
 * `seed` gives the same dissolve on every run and a test can prove it. The
 * default seed is fixed.
 *
 * QUIET AND SAVING. Where the system asks for less motion, the motion setting
 * is Calm or Off, or data saver is on, there are no particles: the element
 * simply fades over 160ms and the promise resolves. That is the platform's
 * collapse for every effect.
 *
 * NEVER FOR MONEY. A playful dissolve on a consequential deletion is the wrong
 * emotional register (D34): never a payout method, a transaction record, a
 * ledger entry or an account. See `ParticleDelete` for the rule and where it
 * applies.
 */

export type ParticleDeleteOptions = {
  /** Roughly how many pieces. The grid is chosen to land near this. Default 36. */
  count?: number;
  /** Fixes the dissolve. Same seed, same pieces. Default 1. */
  seed?: number;
};

/** A small seeded generator (mulberry32): 0 to 1, deterministic. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The pieces for a box: where each sits and where it goes. Pure, so testable. */
export function planParticles(
  width: number,
  height: number,
  { count = 36, seed = 1 }: ParticleDeleteOptions = {},
): { x: number; y: number; size: number; dx: number; dy: number; delay: number; duration: number; tone: 0 | 1 | 2 }[] {
  const rand = seeded(seed);
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  /* A grid whose cells are roughly square and whose cell count is near `count`. */
  const cols = Math.max(2, Math.round(Math.sqrt((count * w) / h)));
  const rows = Math.max(2, Math.round(count / cols));
  const cw = w / cols;
  const ch = h / rows;
  const out: ReturnType<typeof planParticles> = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      out.push({
        x: c * cw,
        y: r * ch,
        size: Math.max(cw, ch),
        /* Drifting up and out, a little sideways, further from the left edge. */
        dx: Math.round((rand() - 0.35) * 56),
        dy: Math.round(-(14 + rand() * 46)),
        /* A sweep from the left, with jitter: the dissolve travels. */
        delay: Math.round((c / cols) * 220 + rand() * 90),
        duration: Math.round(420 + rand() * 220),
        tone: (Math.floor(rand() * 3) % 3) as 0 | 1 | 2,
      });
    }
  }
  return out;
}

function saving(): boolean {
  return document.documentElement.dataset.saveData === "on";
}

/**
 * Dissolve `el` into particles. Resolves when it is finished; never rejects.
 * The element is left hidden (opacity 0): remove it in the promise's `then`.
 */
export async function particleDelete(el: HTMLElement, options: ParticleDeleteOptions = {}): Promise<void> {
  if (typeof document === "undefined") return;
  if (motionQuiet() || saving()) {
    /* The quiet answer leaves on `leave` (the exit token), never linear:
       a linear fade reads as a flicker at its end. */
    const exit = getComputedStyle(document.documentElement).getPropertyValue("--nf-ease-exit").trim() || "cubic-bezier(0.4, 0, 1, 1)";
    const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards", easing: exit });
    await fade.finished.catch(() => undefined);
    return;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const layer = document.createElement("div");
  layer.className = "nf-particles";
  layer.setAttribute("aria-hidden", "true");
  layer.style.left = `${rect.left}px`;
  layer.style.top = `${rect.top}px`;
  layer.style.width = `${rect.width}px`;
  layer.style.height = `${rect.height}px`;

  for (const p of planParticles(rect.width, rect.height, options)) {
    const piece = document.createElement("span");
    piece.className = `nf-particle nf-particle--${p.tone}`;
    piece.style.left = `${p.x}px`;
    piece.style.top = `${p.y}px`;
    piece.style.width = `${p.size}px`;
    piece.style.height = `${p.size}px`;
    piece.style.setProperty("--nf-dx", `${p.dx}px`);
    piece.style.setProperty("--nf-dy", `${p.dy}px`);
    piece.style.animationDelay = `${p.delay}ms`;
    piece.style.animationDuration = `${p.duration}ms`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  el.style.opacity = "0";

  await Promise.all(layer.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  layer.remove();
}
