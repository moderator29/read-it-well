"use client";

import { useEffect } from "react";
import { forgetPacksKeepQueue } from "@/lib/offline/pack-store";
import { clearShelf } from "@/lib/offline/shelf-store";
import { clearOutbox, rememberedOutboxUser, sessionUserId } from "@/lib/offline/outbox";
import { forgetWidget } from "@/lib/native/widget";
import { clearAllInflight } from "@/lib/offline/inflight";
import { clearRecentListings, clearRecentSearches } from "@/lib/search/memory";

/**
 * THE WAY IN FORGETS WHAT THE LAST PERSON LEFT ON THE PHONE. V-35, V-77.
 *
 * Mounted in the sign-in layout, which also holds `/reset-password`, reached
 * WHILE signed in. So it acts only when this browser holds no session (read
 * locally, no network): a session that ended some other way (an expiry,
 * "sign out everywhere else" from another device, "this was not me") is
 * cleared the next time the phone shows the way in, and a signed-in person
 * changing their password loses nothing.
 *
 * What it clears: the gate packs (codes) and the shortlist copy. What it
 * keeps: the queue of unsent gate check-ins, and the record of whose they
 * are. Those are what happened at a gate, waiting for signal; if the same
 * person signs back in they still go, and if somebody else saves a pack on
 * this phone `savePack` clears them first. The settings sign-out and account
 * deletion clear everything. Renders nothing.
 */
export function ForgetOnSignOut() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      /* Before the session is asked (which forgets it on a clean "nobody"). */
      const hadUser = rememberedOutboxUser() !== null;
      /* V-40: an expired token with no signal is "could not tell", not a
         sign-out: nothing is cleared until the session answers cleanly. */
      const who = await sessionUserId();
      if (cancelled || who !== null) return;
      await forgetPacksKeepQueue();
      await clearShelf();
      /* V-40: somebody signed out on this phone, so their queued taps and
         payment notes go. A guest who never signed in keeps their own saves. */
      if (hadUser) await clearOutbox();
      /* B2: the recent searches and the places looked at are that person's
         too, and Home and the search fields offer them back. */
      if (hadUser) {
        clearRecentSearches();
        clearRecentListings();
      }
      await forgetWidget();
      clearAllInflight();
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
