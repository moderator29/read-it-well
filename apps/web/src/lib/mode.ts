import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_MODE, isMode, MODE_COOKIE, type Mode } from "./mode.constants";

export { MODE_COOKIE };
export type { Mode };

/**
 * Resolve the active workspace mode for the current request.
 *
 * A cookie only, because there is no session yet. When auth lands this must
 * additionally verify the user is an approved agent before honouring "agent",
 * so the mode is a view preference, never an authorisation. Tracked in
 * KNOWN_GAPS: the server must gate agent routes on approved status, not on this
 * cookie alone.
 */
export async function getMode(): Promise<Mode> {
  const store = await cookies();
  const value = store.get(MODE_COOKIE)?.value;
  return isMode(value) ? value : DEFAULT_MODE;
}
