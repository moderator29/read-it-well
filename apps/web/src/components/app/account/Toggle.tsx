"use client";

import { useId } from "react";
import { Switch } from "./rows";

/**
 * A labelled switch outside a settings group.
 *
 * The settings screens use `RowSwitch`, which draws the same control inside the
 * grouped-row rhythm. This one exists for the places that are not lists of
 * preferences and should not pretend to be: today that is the reservation
 * panel, where "Someone else is arriving" sits inside a booking form.
 *
 * What it no longer does is draw its own switch. It had a hand-rolled 28px pill
 * with its own colours and its own knob transition, which meant the platform
 * had two switches that were nearly the same, and "nearly" is the part a person
 * notices when they move between two screens. The visual now comes from
 * `Switch`, so there is one.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const labelId = useId();

  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-[0.9375rem] font-medium">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">{description}</p>
        )}
      </div>
      <Switch checked={checked} onChange={onChange} labelledBy={labelId} disabled={disabled} />
    </div>
  );
}
