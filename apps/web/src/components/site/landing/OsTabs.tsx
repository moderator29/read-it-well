"use client";

import { useId, useState, type ReactNode } from "react";
import { Segmented } from "@/components/ui/Segmented";
import type { UiIconName } from "@/design-system/icons/UiIcon";

export type OsLayer = { key: string; label: string; icon: UiIconName; panel: ReactNode };

/**
 * The platform band's switch: one layer of the platform at a time, on the
 * shared segmented control (north star motion 6: the thumb springs to the
 * chosen layer, `drift` 240ms, arrow keys move it).
 *
 * The panels are server rendered and passed in, so this is the only script
 * the band costs: which one is shown. Every panel is in the page (a crawler
 * and a screen reader get all six). The shown one is in the flow at full
 * opacity; the rest are laid over its top, faded out and `inert`, so a
 * change is a crossfade with a 12px lift (motion 3, `glide` 240ms) and the
 * band is only as tall as the layer chosen. Nothing advances on its own:
 * the reader chooses.
 *
 * On a phone the six labels are wider than the screen, so the track sits in
 * its own sideways scroller; only the track scrolls, never the page.
 */
export function OsTabs({ layers, label }: { layers: OsLayer[]; label: string }) {
  const [shown, setShown] = useState(layers[0]?.key ?? "");
  const base = useId();
  return (
    <div className="nf-os__tabs-wrap">
      <div className="nf-os__track">
        <Segmented
          options={layers.map((l) => ({ value: l.key, label: l.label, icon: l.icon }))}
          value={shown}
          onChange={setShown}
          label={label}
          itemIdPrefix={`${base}-tab`}
          panelIdPrefix={`${base}-panel`}
          className="nf-os__seg"
        />
      </div>
      <div className="nf-os__stage">
        {layers.map((l) => (
          <div
            key={l.key}
            id={`${base}-panel-${l.key}`}
            role="tabpanel"
            aria-labelledby={`${base}-tab-${l.key}`}
            className="nf-os__panel"
            data-shown={shown === l.key ? "true" : "false"}
            inert={shown !== l.key}
          >
            {l.panel}
          </div>
        ))}
      </div>
    </div>
  );
}
