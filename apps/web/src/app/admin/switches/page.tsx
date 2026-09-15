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
function SwitchRow({
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
    <li className="nf-card flex flex-wrap items-start gap-4 p-4 sm:p-5">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">{label}</span>
          <ui.StatusChip
            label={flag.enabled ? copy.on : copy.off}
            tone={flag.enabled ? "success" : "danger"}
          />
        </span>
        <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {flag.note ?? copy.defaultNote}
        </span>
        <span className="mt-1 block text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
          {fill(copy.switchingOff, {
            consequence: consequences[flag.key] ?? copy.consequences.generic,
          })}
        </span>
        <span className="mt-1 block text-[0.6875rem] text-[var(--nf-content-muted)]">
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

      <p className="nf-card mb-4 flex gap-2.5 p-3.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
        <UiIcon name="bell" size={16} className="mt-0.5 shrink-0 text-[var(--nf-state-warning)]" />
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
