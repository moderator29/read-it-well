"use client";

import { useId, useState, type ReactNode } from "react";
import { Segmented } from "@/components/ui/Segmented";

/**
 * A PLACE'S TWO VIEWS (the travel-app reference: a Map sub-tab inside a
 * listing). "The stay" (or the restaurant) is the page as it was; "Map" is
 * the area, getting there and the photo tour. One switch, one panel at a
 * time, the same segmented control every view switch uses.
 *
 * The main panel stays mounted while hidden, so a chosen rate or a half-filled
 * table form is still there on the way back. The map panel mounts the first
 * time it is opened: a map laid out inside a hidden panel measures nothing.
 */
export function PlaceTabs({
  label,
  labels,
  main,
  map,
}: {
  label: string;
  labels: { main: string; map: string };
  main: ReactNode;
  map: ReactNode;
}) {
  const base = useId().replace(/:/g, "");
  const [tab, setTab] = useState<"main" | "map">("main");
  const [mapSeen, setMapSeen] = useState(false);
  return (
    /* One column that may shrink: a wide child (the table form's scrolling
       day row) must scroll inside its card, not widen the page. */
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-block">
      <Segmented
        options={[
          { value: "main" as const, label: labels.main },
          { value: "map" as const, label: labels.map, icon: "map" as const },
        ]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          if (next === "map") setMapSeen(true);
        }}
        semantics="tabs"
        label={label}
        full
        itemIdPrefix={`${base}-tab`}
        panelIdPrefix={`${base}-panel`}
      />
      <div id={`${base}-panel-main`} role="tabpanel" aria-labelledby={`${base}-tab-main`} hidden={tab !== "main"} className="min-w-0">
        {main}
      </div>
      <div id={`${base}-panel-map`} role="tabpanel" aria-labelledby={`${base}-tab-map`} hidden={tab !== "map"} className="min-w-0">
        {mapSeen ? map : null}
      </div>
    </div>
  );
}
