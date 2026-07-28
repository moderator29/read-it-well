/**
 * Workspace mode constants, shared by server and client.
 *
 * Kept apart from `mode.ts` because that module imports `next/headers`, which
 * cannot be pulled into a client bundle, while the mode switcher needs the
 * cookie name on the client.
 */
export const MODE_COOKIE = "nf_mode";

export type Mode = "personal" | "agent";

export const DEFAULT_MODE: Mode = "personal";

export function isMode(value: string | undefined | null): value is Mode {
  return value === "personal" || value === "agent";
}
