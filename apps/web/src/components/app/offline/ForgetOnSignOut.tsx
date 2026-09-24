"use client";

import { useEffect } from "react";
import { clearPacks } from "@/lib/offline/pack-store";
import { clearShelf } from "@/lib/offline/shelf-store";

/**
 * THE WAY IN FORGETS WHAT THE LAST PERSON LEFT ON THE PHONE. V-35, V-77.
 *
 * Mounted in the sign-in layout. A phone showing the way in is a phone whose
 * session has ended, whichever way it ended (the settings sign-out, an
 * expiry, "sign out everywhere else" from another device, "this was not me"),
 * so the gate packs and the shortlist copy are cleared here as well as on
 * the settings sign-out. Renders nothing.
 */
export function ForgetOnSignOut() {
  useEffect(() => {
    void clearPacks();
    void clearShelf();
  }, []);
  return null;
}
