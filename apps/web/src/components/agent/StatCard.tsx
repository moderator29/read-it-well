import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * Agent dashboard stat tile.
 *
 * Icon, label, value, and a signed month-over-month delta. The delta is
 * coloured and arrowed so direction reads without parsing the number, and it
 * carries a sign so it is never ambiguous. The icon and value step down a size
 * on phones so a two-up grid stays airy rather than cramped; `className` lets
 * the grid control spans (the odd fifth tile goes full width on phones).
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
    <div className={["nf-card flex items-start gap-2.5 p-3.5 sm:gap-3 sm:p-4", className ?? ""].join(" ")}>
      <span className="h-12 w-12 shrink-0 sm:h-[42px] sm:w-[42px]">
        <BrandIcon name={icon} fill />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.75rem] font-medium text-[var(--nf-content-muted)]">{label}</p>
        <p className="nf-numeric mt-0.5 text-[1.25rem] font-bold leading-none text-[var(--nf-content-primary)] sm:text-[1.375rem]">
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
