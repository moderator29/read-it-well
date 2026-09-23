import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { getFeatureFlags, type SwitchView } from "@/lib/admin/queries";
import { SwitchControl } from "../_components/AdminActions";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { adminUi, type AdminUi } from "../_components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.switches.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

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
  const label = labels[flag.key] ?? flag.key;

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

export default async function AdminSwitchesPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.switches;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const flags = await getFeatureFlags();

  return (
    <div className="nf-console">
      <ui.QueueHeader title={copy.title} lede={copy.lede} />

      <p className="nf-panel nf-panel--card nf-admin-card mb-md flex gap-xs p-md text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
        {/*
          NOT A BELL, AND NOT THE PENDING COLOUR.

          Same defect F2-057 names on `QueueUnavailable` and `CheckRow`, on a
          third object in the same console. `--nf-state-warning` resolves to
          `--nf-cyan-400`, which is the token `--nf-status-pending` is defined
          as, so a standing note about what these controls do was painted in the
          colour this product reserves for "still going through". And a bell
          means "you have a notification" everywhere else on the platform.

          NOT ROSE EITHER, which was the other candidate. Nothing here has
          failed and nothing is in flight: it is a note about the consequence of
          a control the operator has not touched yet. Painting it as an error
          would cry wolf on a screen an operator opens every day. The weight is
          in the sentence, which says the surface goes away from everyone
          immediately, and `info` is the glyph that means exactly this.
        */}
        <UiIcon name="info" size={16} className="mt-3xs shrink-0 text-[var(--nf-content-secondary)]" />
        <span>{copy.warning}</span>
      </p>

      {flags.state !== "ok" ? (
        <ui.QueueUnavailable />
      ) : (
        <ul className="nf-queue-list">
          {flags.data.map((flag) => (
            <SwitchRow key={flag.key} flag={flag} copy={copy} common={common} ui={ui} />
          ))}
        </ul>
      )}
    </div>
  );
}
