"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The eye on the balance card, remembered on this device.
 *
 * The wallet home and the send page both draw the balance with an eye beside
 * it, and a person who hid their balance on one should not find it shown on
 * the other, or shown again on the next visit. The choice is a per-device
 * convenience, so it lives in this browser's storage and nowhere else: it is
 * not state anybody else needs and not state the server should hold.
 *
 * Storage can be missing or throw (a private window, blocked site data), so
 * every read and write is guarded and the default is "shown". The first
 * render is always "shown" so the server render and the first client render
 * agree; the stored choice is applied straight after mount.
 */

export const BALANCE_MASK_KEY = "nf_wallet_balance_hidden";

export function readBalanceMask(): boolean {
  try {
    return window.localStorage.getItem(BALANCE_MASK_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeBalanceMask(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(BALANCE_MASK_KEY, "1");
    else window.localStorage.removeItem(BALANCE_MASK_KEY);
  } catch {
    /* A browser that will not store it still honours it for this visit. */
  }
}

export function useBalanceMask(): [boolean, () => void] {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(readBalanceMask());
  }, []);
  const toggle = useCallback(() => {
    setHidden((was) => {
      writeBalanceMask(!was);
      return !was;
    });
  }, []);
  return [hidden, toggle];
}
