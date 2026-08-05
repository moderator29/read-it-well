"use client";

import { useEffect, useState } from "react";
import { loadSettings } from "@/components/app/account/settings-store";

/**
 * Is this person on a connection worth conserving?
 *
 * One answer, in one place, so that everything which could spend somebody's
 * data goes through the same decision instead of each surface inventing its
 * own. Right now that is the listing prefetch and the media the gallery asks
 * for; anything added later reads the same function rather than a second
 * heuristic that will disagree with this one within a month.
 *
 * THREE INPUTS, AND THE PERSON'S OWN CHOICE OUTRANKS BOTH THE OTHERS.
 *
 *   1. The stored setting. An explicit choice, and it wins outright in both
 *      directions: on means on even over a fast link, and off means off even
 *      when the browser is nervous. Overruling somebody's explicit instruction
 *      because we think we know better is not a saving, it is a bug.
 *   2. `navigator.connection.saveData`. Android Chrome sets this from the
 *      operating system's Data Saver switch. This matters a great deal in
 *      Nigeria specifically, where a very large share of sessions are on
 *      metered mobile data and that switch is genuinely used.
 *   3. `effectiveType`. A round-trip estimate the browser maintains. `2g` and
 *      `slow-2g` mean loading a full listing page speculatively is taking
 *      something from the person rather than giving it.
 *
 * NEITHER 2 NOR 3 EXISTS ON SAFARI, which is most iPhones. Absent means
 * absent, never "assume the worst": defaulting to data-saver on iOS would
 * quietly downgrade the platform's biggest single audience on the strength of
 * an API they do not implement.
 */

/** The setting's key inside the `nf_settings` document. */
export const DATA_SAVER_SETTING = "dataSaver" as const;

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

function connection(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as unknown as { connection?: NetworkInformation }).connection;
}

/** True when the browser itself says the link is slow or metered. */
export function connectionIsFrugal(): boolean {
  const link = connection();
  if (!link) return false;
  if (link.saveData === true) return true;
  return link.effectiveType === "2g" || link.effectiveType === "slow-2g";
}

/**
 * The whole answer. Safe on the server, where it is always false: nothing
 * rendered on the server spends anybody's data speculatively.
 */
export function isDataSaver(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = loadSettings().dataSaver;
    if (stored === true) return true;
  } catch {
    /* Storage can be unavailable. Fall through to what the browser knows. */
  }
  return connectionIsFrugal();
}

/**
 * The same answer for a component that has to re-render when it changes.
 *
 * Starts false on both the server and the first client render so the markup
 * agrees, then settles on the truth. A surface must therefore be written so
 * that data-saver REMOVES something rather than adds it: the first paint is
 * always the full version, and a moment later the saving applies.
 */
export function useDataSaver(): boolean {
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const read = () => setSaving(isDataSaver());
    read();

    const link = connection() as (NetworkInformation & EventTarget) | undefined;
    link?.addEventListener?.("change", read);
    /* Another tab changing the setting counts straight away. */
    window.addEventListener("storage", read);
    return () => {
      link?.removeEventListener?.("change", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return saving;
}
