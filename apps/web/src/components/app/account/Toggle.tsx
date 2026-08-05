"use client";

import { Switch } from "@/components/ui/Switch";

/**
 * Switch row for settings groups.
 *
 * This is now a thin adapter over the `Switch` primitive. It exists so the
 * eight call sites that already speak `onChange` keep working unchanged; the
 * control, its motion and its accessibility all come from the primitive.
 *
 * What that swap fixes, in a control that appears on every settings screen:
 *
 *   - The thumb was `bg-white` with `shadow-[0_2px_6px_rgb(0_0_0/0.35)]`. Both
 *     are raw literals, in a codebase whose token file opens by saying nothing
 *     below it may introduce a raw colour - and pure white on a light-theme
 *     track is the wrong colour regardless. The primitive uses
 *     `--nf-content-on-brand` and the elevation ladder's own shadow.
 *   - Track and thumb ran on the same flat 200ms. The primitive moves the
 *     thumb on the spring easing and the track fill on the standard one, so
 *     the thumb arrives with some weight instead of sliding like a decal.
 *   - The 44pt target and the reduced-motion behaviour move into one place
 *     rather than being re-derived per control.
 *
 * The row layout stays here, because that is genuinely this file's job: label
 * and description on the left, control on the right, dividers handled by the
 * group around it.
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
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        /*
         * The visible label is rendered above by this row, not by the
         * primitive, so the control is named explicitly rather than pointed at
         * an element it does not own. The description is deliberately NOT wired
         * to `aria-describedby`: it is help text for the row, and re-reading it
         * on every state change would bury the state itself.
         */
        aria-label={label}
      />
    </div>
  );
}
