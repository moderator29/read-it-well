"use client";

import { useState } from "react";
import {
  RECENT_RECIPIENTS_KEY,
  type RecentRecipient,
} from "@/components/app/wallet/recent-recipients";

/**
 * The send render shows a row of recent-recipient chips, and the real ones
 * are this DEVICE's: `recent-recipients.ts` keeps the last five sends in
 * browser storage, because the ledger carries no recipient address to build
 * them from. A screenshot taken in a fresh browser therefore has none, and
 * the element the governing image is judged on would be missing from its own
 * proof.
 *
 * So the harness seeds the storage it would have had. This file lives under
 * `(dev)/preview`, which 404s in production and ships to nobody; no seam of
 * any kind is added to `SendFlow`, which reads storage exactly as it does on
 * a real phone. The names are the catalogue's invented people.
 *
 * WHY A STATE INITIALISER RATHER THAN AN EFFECT. `SendFlow` reads storage in
 * its own mount effect, and a parent's effect runs AFTER its children's, so
 * an effect here would seed the key a beat too late and the chips would be
 * absent from the very shot they are needed in. An initialiser runs during
 * this component's render, which happens before the sibling below it mounts.
 */

const SEED: RecentRecipient[] = [
  { email: "adeola.o@example.com", name: "Adeola Okonkwo", at: 1_758_000_000_000 },
  { email: "tunde.k@example.com", name: "Tunde Kalu", at: 1_757_900_000_000 },
  { email: "michael.b@example.com", name: "Michael Bassey", at: 1_757_800_000_000 },
  { email: "sola.o@example.com", name: "Sola Oyelaran", at: 1_757_700_000_000 },
];

export function SeedRecents() {
  useState(() => {
    try {
      window.localStorage.setItem(RECENT_RECIPIENTS_KEY, JSON.stringify(SEED));
    } catch {
      /* Storage refused; the harness simply shows the chipless state. */
    }
    return true;
  });
  return null;
}
