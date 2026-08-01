import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * Agent dashboard stat tile.
 *
 * Icon, label, value, and a signed month-over-month delta. The delta is
 * coloured and arrowed so direction reads without parsing the number, and it
 * carries a sign so it is never ambiguous. `className` lets the grid control
 * spans (the odd fifth tile goes full width on phones).
 *
 * WHY THE PHONE LAYOUT STACKS. Beside a 56px icon in a two-up grid at 390px the
 * text column is about 110px wide, and the label was set to truncate into it.
 * That produced "Total E...", "Active ..." and "Occup..." on the agent's own
 * dashboard: the label IS the meaning of a stat tile, so truncating it leaves a
 * number with nothing to say what it counts. The delta was worse, wrapping
 * "vs last month" underneath the percentage and colliding with it. So on phones
 * the icon takes its own row, the label wraps freely, and the delta gets a line
 * to itself. From `sm` up there is room, and the original row returns.
 */
export function StatCard({
  icon,
  label,
  value,
  deltaPct,
  deltaLabel,
  className,
}: {
  icon: BrandIconName;
  label: string;
  value: string;
  deltaPct: number;
  deltaLabel: string;
  className?: string;
}) {
  const up = deltaPct >= 0;
  return (
    <div
      className={[
        "nf-card flex flex-col gap-2 p-3.5 sm:flex-row sm:items-start sm:gap-4 sm:p-4",
        className ?? "",
      ].join(" ")}
    >
      <span className="h-11 w-11 shrink-0 sm:h-[42px] sm:w-[42px]">
        <BrandIcon name={icon} fill />
      </span>
      <div className="min-w-0">
        <p className="text-[0.75rem] font-medium leading-snug text-[var(--nf-content-muted)]">
          {label}
        </p>
        <p className="nf-numeric mt-1 text-[1.25rem] font-bold leading-none text-[var(--nf-content-primary)] sm:text-[1.375rem]">
          {value}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.75rem] leading-snug">
          <span
            className="nf-numeric inline-flex items-center gap-1 font-semibold"
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
            {deltaPct}%
          </span>
          <span className="text-[var(--nf-content-muted)]">{deltaLabel}</span>
        </p>
      </div>
    </div>
  );
}
