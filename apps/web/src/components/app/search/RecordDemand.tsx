"use client";

import { useEffect } from "react";
import { recordDemand } from "@/lib/demand/actions";
import { cellKey, type DemandCell } from "@/lib/demand/cell";

/**
 * V-10: counts this search once per tab, as a cell. The cell is decided on
 * the server from the parsed query (no typed words survive it); this only
 * remembers, in the tab's own storage, that it has already been counted, so a
 * refresh or a back-and-forth is one search and not five. Draws nothing.
 */
export function RecordDemand({ cell }: { cell: DemandCell | null }) {
  const key = cell ? cellKey(cell) : null;
  useEffect(() => {
    if (!cell || !key) return;
    const storageKey = `vallo_demand_counted:${key}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* No storage: count it, once for this mount. */
    }
    void recordDemand(cell);
  }, [cell, key]);
  return null;
}
