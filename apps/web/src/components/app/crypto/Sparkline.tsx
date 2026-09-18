import { linePath } from "./format";

/**
 * A seven-day sparkline, in the blue family whatever the direction. The
 * direction is said by the signed percentage beside it, in emerald or rose;
 * the line itself is one colour so a row of fifty does not become a row of
 * fifty alarms.
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const path = linePath(values, 100, 28, 2);
  if (!path) return <span className={className} aria-hidden="true" />;
  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path d={path.area} fill="currentColor" opacity="0.14" />
      <path
        d={path.line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
