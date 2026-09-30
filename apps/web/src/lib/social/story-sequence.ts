/**
 * B16: STORIES AS A SEQUENCE, AS PURE RULES. Client-safe.
 *
 * The viewer already receives the recent stories (`more`) beside the one on
 * screen. These rules turn that list into a run the reader can tap through:
 * where this story sits, what comes before and after, and whether the run
 * may advance on a timer.
 *
 * AUTO-ADVANCE (the founder's default from the write-up): on under the
 * Standard and Cinematic motion levels, and never under Calm, Off or the
 * system's reduced motion. Six seconds a story.
 */
import type { MotionLevel } from "@/lib/motion/motion-pref";

export const STORY_SECONDS = 6;
/** A press held this long pauses rather than taps. */
export const HOLD_MS = 250;
/** A downward drag this far closes the viewer. */
export const CLOSE_DRAG_PX = 90;

export type StoryRef = { id: string; imageUrl: string | null; authorLabel: string };

export type Sequence = {
  ids: string[];
  index: number;
  total: number;
  prev: StoryRef | null;
  next: StoryRef | null;
};

/**
 * The run this story belongs to. When the recent list does not contain the
 * story on screen (an older story opened from a link), it leads the run.
 */
export function storySequence(current: StoryRef, more: readonly StoryRef[]): Sequence {
  const seen = new Set<string>();
  const list: StoryRef[] = [];
  const found = more.some((s) => s.id === current.id);
  for (const s of found ? more : [current, ...more]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    list.push(s.id === current.id ? current : s);
  }
  const index = list.findIndex((s) => s.id === current.id);
  return {
    ids: list.map((s) => s.id),
    index,
    total: list.length,
    prev: index > 0 ? list[index - 1]! : null,
    next: index < list.length - 1 ? list[index + 1]! : null,
  };
}

export function autoAdvanceAllowed(level: MotionLevel, reducedMotion: boolean): boolean {
  return !reducedMotion && (level === "standard" || level === "cinematic");
}

/** "Story 2 of 5, from Tunde". */
export function positionLabel(seq: Sequence, author: string, template = "Story {n} of {total}, from {name}"): string {
  return template
    .replace("{n}", String(seq.index + 1))
    .replace("{total}", String(seq.total))
    .replace("{name}", author);
}

/** Which third of the stage a tap landed in. */
export function tapZone(x: number, width: number): "prev" | "next" | "middle" {
  if (width <= 0) return "middle";
  if (x < width / 3) return "prev";
  if (x > (width * 2) / 3) return "next";
  return "middle";
}
