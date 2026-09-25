/**
 * ONE SCROLL LOOP FOR EVERYTHING THAT FOLLOWS THE SCROLL (Track M).
 *
 * The horizontal reel, the kinetic type and the film HUD all read the scroll
 * position. Three listeners each scheduling their own frame would read layout
 * three times a frame; this is one passive listener and one animation frame,
 * and every subscriber is called inside it with the same numbers.
 *
 * Client only.
 */
export type ScrollFrame = { y: number; vh: number; vw: number };
/**
 * A subscriber READS in its body and returns what to WRITE. Every read in the
 * frame happens before any write, so one subscriber's transform can never
 * force layout for the next one's measurement.
 */
type Subscriber = (frame: ScrollFrame) => void | (() => void);

const subscribers = new Set<Subscriber>();
let frame = 0;
let listening = false;

function run() {
  frame = 0;
  const snapshot: ScrollFrame = { y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth };
  const writes: (() => void)[] = [];
  for (const fn of subscribers) {
    const write = fn(snapshot);
    if (write) writes.push(write);
  }
  for (const write of writes) write();
}

function schedule() {
  if (frame === 0) frame = window.requestAnimationFrame(run);
}

export function onScrollFrame(fn: Subscriber): () => void {
  subscribers.add(fn);
  if (!listening) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    listening = true;
  }
  schedule();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && listening) {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      listening = false;
      if (frame !== 0) window.cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/** How far an element has travelled through the viewport, 0 to 1. */
export function travel(rect: DOMRect, vh: number): number {
  const total = rect.height + vh;
  return Math.min(1, Math.max(0, (vh - rect.top) / total));
}
