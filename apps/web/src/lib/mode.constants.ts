/**
 * Workspace mode constants, shared by server and client.
 *
 * Kept apart from `mode.ts` because that module imports `next/headers`, which
 * cannot be pulled into a client bundle, while the mode switcher needs the
 * cookie name on the client.
 *
 * ---------------------------------------------------------------------------
 * THREE AXES, AND THEY MUST NEVER BE CONFUSED
 *
 *   SIDE   property or stays   what you are browsing. The coin. `nf_side`.
 *   MODE   personal or working whether you are using the platform or running
 *                              a business on it. This file.
 *   ROLE   owner, agent, host  who you are when working.
 *
 * ROLE IS NOT A FOURTH SWITCH. It is what MODE resolves into, against what the
 * account actually holds, which `roleStateFrom` has always done. What was
 * missing is one bit of state: WHICH workspace, when a person has more than
 * one. That is `nf_workspace` below.
 *
 * ---------------------------------------------------------------------------
 * THE VALUE WAS CALLED `agent` AND THAT WAS THE MODEL BEING WRONG
 *
 * `agent` is a ROLE's name on an axis that is not about roles. It made the
 * cookie unable to say anything about an owner, a host or a firm, and it is
 * the reason the one switch surface in the product knew about two of the
 * platform's three supply shapes.
 *
 * `agent` IS STILL ACCEPTED ON READ, for one release, and it normalises to
 * `working`. Nobody signed in is thrown back to personal mode by a deploy.
 * `isMode` is therefore deliberately wider than `Mode`: it answers "is this a
 * value this product has ever written", and `normaliseMode` answers "what does
 * it mean now". Two questions, two functions, so widening the first cannot
 * quietly widen the second.
 */
export const MODE_COOKIE = "nf_mode";

/**
 * The workspace key.
 *
 * OPAQUE AND NEVER AUTHORITATIVE. The server re-resolves it against the
 * caller's own RLS bound reads on every request, and a key that does not
 * resolve falls back to their single workspace or to personal. A hand edited
 * cookie changes what a control displays and nothing else, which is the
 * doctrine `side.constants.ts` states for the side and `mode.ts` for the mode.
 *
 * Meaningful only while `nf_mode` is `working`. Left in place across a switch
 * to personal on purpose, so flipping back to working lands where the person
 * last was rather than on a chooser.
 */
export const WORKSPACE_COOKIE = "nf_workspace";

export type Mode = "personal" | "working";

/** Everything this product has ever written into `nf_mode`. */
export type StoredMode = Mode | "agent";

export const DEFAULT_MODE: Mode = "personal";

export const MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** True for any value this product has ever written, legacy included. */
export function isMode(value: string | undefined | null): value is StoredMode {
  return value === "personal" || value === "working" || value === "agent";
}

/** What a stored value means today. The one place `agent` is read as legacy. */
export function normaliseMode(value: string | undefined | null): Mode {
  if (value === "working" || value === "agent") return "working";
  return DEFAULT_MODE;
}

/**
 * A workspace key, as the cookie carries it.
 *
 * `supply:<agents.id>`, `firm:<businesses.id>`, `stays:<businesses.id>` or
 * `admin`. Shaped rather than parsed here: this module is the spelling, and
 * `lib/supply/workspaces.ts` is the resolution, because resolving needs the
 * database and spelling must not.
 */
export function workspaceKey(kind: "supply" | "firm" | "stays", id: string): string {
  return `${kind}:${id}`;
}

export const ADMIN_WORKSPACE_KEY = "admin";

/** The cookie writes, in one place, so two controls cannot spell them apart. */
export function writeModeCookie(mode: Mode): void {
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=${MODE_COOKIE_MAX_AGE}; samesite=lax`;
}

export function writeWorkspaceCookie(key: string | null): void {
  if (key === null) {
    document.cookie = `${WORKSPACE_COOKIE}=; path=/; max-age=0; samesite=lax`;
    return;
  }
  document.cookie = `${WORKSPACE_COOKIE}=${encodeURIComponent(key)}; path=/; max-age=${MODE_COOKIE_MAX_AGE}; samesite=lax`;
}
