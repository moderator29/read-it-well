import type { SwitchView } from "@/lib/admin/queries";
import { SwitchControl } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import type { AdminUi } from "../_components/ui";

/**
 * The kill switches.
 *
 * One row per switchable surface. The app treats a missing table, a missing row
 * or an unreachable database as enabled, so these switches can only ever turn
 * something off, never break it on. That is the whole design: an incident can
 * be contained in seconds without a deploy, and turning the switch back on
 * restores the surface exactly as it was.
 *
 * The flag keys are the contract with `feature_flags`, so both the name and the
 * consequence are looked up by key. A key the dictionary has not met yet keeps
 * its raw name and gets the generic consequence, which is still honest about
 * what switching off does.
 */
export function SwitchRow({
  flag,
  copy,
  common,
  ui,
}: {
  flag: SwitchView;
  copy: AdminCopy["switches"];
  common: AdminCommon;
  ui: AdminUi;
}) {
  const labels = copy.labels as Record<string, string | undefined>;
  const consequences = copy.consequences as Record<string, string | undefined>;
  /* A key the dictionary has not met yet is still drawn in sentence case
     ("room_bookings" reads "Room bookings"), never as a raw lower-case column
     value beside the named switches (C1 sweep, checklist point 6). */
  const spoken = flag.key.replace(/_/g, " ");
  const label = labels[flag.key] ?? spoken.charAt(0).toUpperCase() + spoken.slice(1);

  return (
    /*
      THE SWITCH TAKES ITS OWN LINE ON A PHONE.

      The row is a text column and a control, and the control is `shrink-0`
      while the text was `flex-1`, so at 390px the text had about half the
      card and every consequence sentence broke over seven lines beside a
      button sitting alone in the other half. `basis-full` puts the switch
      under the words where the words need the width, and `sm:basis-0` gives
      the original row back the moment there is room for it.
    */
    <li className="nf-panel nf-panel--card nf-admin-card flex flex-wrap items-start gap-md p-md sm:p-lg">
      <span className="min-w-0 flex-1 basis-full sm:basis-0">
        <span className="flex flex-wrap items-center gap-xs">
          <span className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">{label}</span>
          <ui.StatusChip
            label={flag.enabled ? copy.on : copy.off}
            tone={flag.enabled ? "success" : "danger"}
          />
        </span>
        <span className="mt-2xs block text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
          {flag.note ?? copy.defaultNote}
        </span>
        <span className="mt-2xs block text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          {fill(copy.switchingOff, {
            consequence: consequences[flag.key] ?? copy.consequences.generic,
          })}
        </span>
        <span className="mt-2xs block text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {fill(copy.lastChanged, { when: ui.when(flag.updatedAt) })}
        </span>
      </span>

      <SwitchControl
        flagKey={flag.key}
        label={label}
        enabled={flag.enabled}
        copy={copy}
        common={common}
      />
    </li>
  );
}
