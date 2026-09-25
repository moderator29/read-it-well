/**
 * THE MOTION PREFERENCE (Track M, 25 September 2026).
 *
 * The founder asked for motion settings with real choices, "different options
 * to make things naturally amazing". Four levels and three switches:
 *
 *   cinematic  everything, slower and deeper, pages rise into place
 *   standard   the designed default
 *   calm       short fades, no blur or depth, no loops, no splash or doors
 *   off        nothing moves; every screen lands in its final state
 *
 *   splash     the brand assembling when the app opens
 *   doors      the thresholds: verified, signing out, coming back
 *   ambient    the living backgrounds (aurora, drifting light)
 *
 * It is stored on the device in a cookie, so the server paints the root with
 * it and the first frame is already right, and mirrored in local storage. The
 * operating system's "reduce motion" is always obeyed on top of any of this:
 * the stylesheets answer it unconditionally.
 *
 * Shared by the server (parse) and the browser (read, write, apply).
 */
export type MotionLevel = "cinematic" | "standard" | "calm" | "off";

export type MotionPref = {
  level: MotionLevel;
  splash: boolean;
  doors: boolean;
  ambient: boolean;
};

export const MOTION_COOKIE = "nf_motion";
export const MOTION_EVENT = "nf:motion";
export const MOTION_LEVELS: readonly MotionLevel[] = ["cinematic", "standard", "calm", "off"];

export const DEFAULT_MOTION: MotionPref = { level: "standard", splash: true, doors: true, ambient: true };

/** "standard.1.1.1": the level, then splash, doors and ambient as 1 or 0. */
export function serializeMotion(pref: MotionPref): string {
  return [pref.level, pref.splash ? 1 : 0, pref.doors ? 1 : 0, pref.ambient ? 1 : 0].join(".");
}

export function parseMotion(raw: string | undefined | null): MotionPref {
  if (!raw) return DEFAULT_MOTION;
  const [level, splash, doors, ambient] = decodeURIComponent(raw).split(".");
  return {
    level: (MOTION_LEVELS as readonly string[]).includes(level ?? "") ? (level as MotionLevel) : "standard",
    splash: splash !== "0",
    doors: doors !== "0",
    ambient: ambient !== "0",
  };
}

/** The attributes the root element carries for a preference. */
export function motionAttributes(pref: MotionPref): Record<string, string | undefined> {
  return {
    "data-motion": pref.level === "standard" ? undefined : pref.level,
    "data-motion-splash": pref.splash ? undefined : "off",
    "data-motion-doors": pref.doors ? undefined : "off",
    "data-motion-ambient": pref.ambient ? undefined : "off",
    /* Two older readers (the bloom composer and the keyboard lift) ask this
       flag whether to animate; calm and off both mean no. */
    "data-reduce-motion": pref.level === "calm" || pref.level === "off" ? "1" : undefined,
  };
}

/* ------------------------------------------------------------ the browser */

function readCookie(): string | undefined {
  const match = document.cookie.match(/(?:^|; )nf_motion=([^;]*)/);
  return match?.[1];
}

export function readMotion(): MotionPref {
  if (typeof document === "undefined") return DEFAULT_MOTION;
  const fromCookie = readCookie();
  if (fromCookie) return parseMotion(fromCookie);
  try {
    const stored = window.localStorage.getItem(MOTION_COOKIE);
    if (stored) return parseMotion(stored);
    /* Earlier builds kept a lone "reduce motion" switch; it maps to calm. */
    if (window.localStorage.getItem("nf_reduce_motion") === "1") return { ...DEFAULT_MOTION, level: "calm" };
  } catch {
    /* Storage unavailable: the default stands. */
  }
  return DEFAULT_MOTION;
}

export function applyMotion(pref: MotionPref): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(motionAttributes(pref))) {
    if (value === undefined) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
}

export function writeMotion(pref: MotionPref): void {
  const value = serializeMotion(pref);
  document.cookie = `${MOTION_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  try {
    window.localStorage.setItem(MOTION_COOKIE, value);
    window.localStorage.removeItem("nf_reduce_motion");
  } catch {
    /* The cookie above is the one the server reads. */
  }
  applyMotion(pref);
  window.dispatchEvent(new CustomEvent(MOTION_EVENT));
}
