import { motionQuiet } from "@/lib/motion/gate";

/**
 * Whether the landing's 3D objects may float, lean and drift.
 *
 * No when the reader asked for less motion (the operating system, or the
 * in-app Motion setting at Calm or Off), when data saver is on, or when the
 * page marked the device as low end (`data-motion-lite`, two cores or two
 * gigabytes or less; `app/(landing)/page.tsx`). Every one of those means
 * the objects are drawn at rest.
 */
export function objectsMayMove(root?: { dataset: DOMStringMap }): boolean {
  if (typeof window === "undefined") return false;
  if (motionQuiet()) return false;
  const r = root ?? document.documentElement;
  return r.dataset.saveData !== "on" && r.dataset.motionLite !== "on";
}

/**
 * Where a pointer is over a room, as -1 to 1 on each axis from its centre,
 * clamped, so a pointer on the header above the room still reads as "top".
 */
export function pointerOffset(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const clamp = (n: number) => (Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0);
  const x = rect.width > 0 ? ((clientX - rect.left) / rect.width) * 2 - 1 : 0;
  const y = rect.height > 0 ? ((clientY - rect.top) / rect.height) * 2 - 1 : 0;
  return { x: clamp(x), y: clamp(y) };
}
