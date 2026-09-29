import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Section, TYPE } from "@/components/app/Screen";
import { planCount, type PlanGroups, type PlanItem, type PlanKind } from "./plans";

/**
 * Coming up: the one dated list at the top of Plans (V-76).
 *
 * Today, This week, Later, and every kind of commitment on it together, which
 * is the answer to "what am I doing this weekend" that three separate lists
 * never gave. Each row names its kind in words (never by icon alone) and
 * links to the place its controls live. When nothing is ahead it says so in
 * one line and the sections below still show the record.
 */
const KIND_ICON: Record<PlanKind, UiIconName> = {
  inspection: "verified",
  tenancy: "key",
  stay: "bed",
  table: "utensils",
};

/** British order in every locale: dates are written in English words (`intlTag`). */
function when(item: PlanItem): string {
  const tag = "en-GB";
  if (item.at) {
    const at = new Date(item.at);
    if (!Number.isNaN(at.getTime())) {
      return new Intl.DateTimeFormat(tag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Lagos",
      }).format(at);
    }
  }
  return new Intl.DateTimeFormat(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${item.on}T12:00:00Z`));
}

export function ComingUp({
  groups,
  copy,
  partial = false,
}: {
  groups: PlanGroups;
  copy: Dictionary["shape"]["plans"];
  /** True when a read behind the list failed: an empty list is then unknown, not empty. */
  partial?: boolean;
}) {
  if (planCount(groups) === 0) {
    /* A failed read is said where it failed, below; "nothing ahead" here
       would be a claim this page cannot make (V-76 review). */
    if (partial) return null;
    return (
      <p className={`mb-block ${TYPE.rowMeta}`} data-testid="plans-nothing-ahead">
        {copy.nothingAhead}
      </p>
    );
  }
  const bands: { key: keyof PlanGroups; label: string }[] = [
    { key: "today", label: copy.today },
    { key: "week", label: copy.thisWeek },
    { key: "later", label: copy.later },
  ];
  return (
    <Section title={copy.comingUp} className="mb-block">
      <div data-testid="plans-coming-up" className="flex flex-col gap-md">
        {bands.map((band) =>
          groups[band.key].length === 0 ? null : (
            <div key={band.key}>
              <p className="nf-overline text-[var(--nf-content-muted)]">{band.label}</p>
              <ul className="mt-inline-tight divide-y divide-[var(--nf-panel-hair)]">
                {groups[band.key].map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link href={item.href} className="flex min-h-11 items-center gap-md py-sm">
                      <UiIcon name={KIND_ICON[item.kind]} size={20} className="shrink-0 text-[var(--nf-brand-secondary)]" />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className={`block ${TYPE.rowTitle}`}>{item.title}</span>
                        <span className={`mt-3xs block ${TYPE.rowMeta}`}>
                          {copy.kinds[item.kind]}
                          {item.where ? `, ${item.where}` : ""}
                        </span>
                      </span>
                      <span className={`nf-numeric shrink-0 text-right ${TYPE.rowMeta}`}>{when(item)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </div>
    </Section>
  );
}
