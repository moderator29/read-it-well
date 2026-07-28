/**
 * Tier one icons: the functional set for dense controls.
 *
 * The design direction calls for two icon tiers. Tier two is the 3D signature
 * object family, which carries a lit tile and reads beautifully from about 32px
 * up. Below that the tile collapses into an unreadable coloured square, so
 * dense UI needs a different instrument.
 *
 * These are crisp stroked glyphs on a 24 grid. They inherit `currentColor`, so
 * they take the colour of whatever they sit beside, and they stay legible at
 * 12px where a rendered 3D object cannot.
 */

export type UiIconName =
  | "search"
  | "star"
  | "bed"
  | "bath"
  | "pool"
  | "wifi"
  | "parking"
  | "kitchen"
  | "verified"
  | "location"
  | "chevron-down"
  | "arrow-right"
  | "sparkle";

const PATHS: Record<UiIconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.6" />
      <path d="m16 16 4.4 4.4" />
    </>
  ),
  star: (
    <path d="M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.62l-5.1 2.68.98-5.68L3.75 9.6l5.7-.83Z" />
  ),
  bed: (
    <>
      <path d="M3 18v-6.2A1.8 1.8 0 0 1 4.8 10H21v8" />
      <path d="M3 7v11M21 14H3" />
      <path d="M7.5 10V8.2A1.2 1.2 0 0 1 8.7 7h8.1a1.2 1.2 0 0 1 1.2 1.2V10" />
    </>
  ),
  bath: (
    <>
      <path d="M3 11.5h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z" />
      <path d="M6 11.5V6.2A2.2 2.2 0 0 1 8.2 4c1.1 0 2 .8 2.16 1.85" />
      <path d="M7 18.5 6 21M17 18.5l1 2.5" />
    </>
  ),
  pool: (
    <>
      <path d="M2.6 16.4c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5" />
      <path d="M2.6 20.2c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5" />
      <path d="M7.6 15.4V5.6a2.2 2.2 0 0 1 4.4 0v9.2M16.4 15.4V5.6a2.2 2.2 0 0 0-4.4 0" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.6 8.4a14 14 0 0 1 18.8 0" />
      <path d="M5.9 12a9.4 9.4 0 0 1 12.2 0" />
      <path d="M9.2 15.5a4.8 4.8 0 0 1 5.6 0" />
      <circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  parking: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.2" />
      <path d="M9.4 16.6V7.4h3.4a2.9 2.9 0 0 1 0 5.8H9.4" />
    </>
  ),
  kitchen: (
    <>
      <rect x="4" y="3.2" width="16" height="17.6" rx="2.4" />
      <path d="M4 9.4h16" />
      <circle cx="7.4" cy="6.3" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.9" cy="6.3" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  verified: (
    <>
      <path d="M12 2.9 19.2 6v5.3c0 4.3-2.9 8-7.2 9.6-4.3-1.6-7.2-5.3-7.2-9.6V6Z" />
      <path d="m8.7 11.8 2.3 2.3 4.3-4.4" />
    </>
  ),
  location: (
    <>
      <path d="M12 21.4s7-5.9 7-11.4a7 7 0 1 0-14 0c0 5.5 7 11.4 7 11.4Z" />
      <circle cx="12" cy="9.8" r="2.6" />
    </>
  ),
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "arrow-right": (
    <>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </>
  ),
  sparkle: (
    <path d="M12 3.4 13.6 8l4.6 1.6-4.6 1.6L12 15.8l-1.6-4.6L5.8 9.6 10.4 8Z" />
  ),
};

export function UiIcon({
  name,
  size = 16,
  strokeWidth = 1.8,
  className,
  label,
}: {
  name: UiIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  );
}
