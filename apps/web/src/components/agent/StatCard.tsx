import { Icon, type IconName } from "@/design-system/icons/Icon";

/**
 * Agent dashboard stat tile.
 *
 * Icon, label, value, and a signed month-over-month delta. The delta is
 * coloured and arrowed so direction reads without parsing the number, and it
 * carries a sign so it is never ambiguous.
 */
export function StatCard({
  icon,
  label,
  value,
  deltaPct,
  deltaLabel,
}: {
  icon: IconName;
  label: string;
  value: string;
  deltaPct: number;
  deltaLabel: string;
}) {
  const up = deltaPct >= 0;
  return (
    <div className="nf-card flex items-start gap-3 p-4">
      <Icon name={icon} size={42} />
      <div className="min-w-0">
        <p className="truncate text-[0.75rem] font-medium text-[var(--nf-content-muted)]">{label}</p>
        <p className="nf-numeric mt-0.5 text-[1.375rem] font-bold leading-none text-[var(--nf-content-primary)]">
          {value}
        </p>
        <p
          className="nf-numeric mt-1.5 inline-flex items-center gap-1 text-[0.75rem] font-semibold"
          style={{ color: up ? "var(--nf-state-success)" : "var(--nf-state-error)" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d={up ? "M12 5v14M6 11l6-6 6 6" : "M12 19V5M6 13l6 6 6-6"}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {up ? "+" : ""}
          {deltaPct}% <span className="font-normal text-[var(--nf-content-muted)]">{deltaLabel}</span>
        </p>
      </div>
    </div>
  );
}
