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
  | "arrow-left"
  | "sparkle"
  | "home"
  | "compass"
  | "building-hotel"
  | "building-apartment"
  | "house"
  | "utensils"
  | "ticket"
  | "calendar-booking"
  | "chat-bubble"
  | "bell"
  | "wallet"
  | "user"
  | "settings-gear"
  | "heart"
  | "grid";

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
  "arrow-left": (
    <>
      <path d="M19.5 12h-15" />
      <path d="m10.5 6-6 6 6 6" />
    </>
  ),
  sparkle: (
    <path d="M12 3.4 13.6 8l4.6 1.6-4.6 1.6L12 15.8l-1.6-4.6L5.8 9.6 10.4 8Z" />
  ),
  /* ------------------------------------------------ navigation glyphs.
     Drawn for the rail and tab bar: quiet, organic geometry that reads at
     22 to 24px beside a label, with round caps softening every terminal. */
  home: (
    <>
      <path d="m4.2 10.9 7-6.1a1.2 1.2 0 0 1 1.6 0l7 6.1" />
      <path d="M6.2 9.4V19a1.7 1.7 0 0 0 1.7 1.7h8.2a1.7 1.7 0 0 0 1.7-1.7V9.4" />
      <path d="M10 20.7v-4.9a1.3 1.3 0 0 1 1.3-1.3h1.4a1.3 1.3 0 0 1 1.3 1.3v4.9" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m15.7 8.3-1.9 5.5-5.5 1.9 1.9-5.5Z" />
    </>
  ),
  "building-hotel": (
    <>
      <path d="M6.2 20.6V5.3a1.8 1.8 0 0 1 1.8-1.8h8a1.8 1.8 0 0 1 1.8 1.8v15.3" />
      <path d="M3.6 20.6h16.8" />
      <path d="M9.4 7.2h1.3M13.3 7.2h1.3M9.4 10.7h1.3M13.3 10.7h1.3M9.4 14.2h1.3M13.3 14.2h1.3" />
      <path d="M10.6 20.6v-2.4a1.4 1.4 0 0 1 2.8 0v2.4" />
    </>
  ),
  "building-apartment": (
    <>
      <path d="M9.5 20.6V5.2a1.7 1.7 0 0 1 1.7-1.7h6.3a1.7 1.7 0 0 1 1.7 1.7v15.4" />
      <path d="M9.5 9.6H6.5a1.7 1.7 0 0 0-1.7 1.7v9.3" />
      <path d="M3 20.6h18" />
      <path d="M12.6 7.4h1.2M15.7 7.4h1.2M12.6 10.9h1.2M15.7 10.9h1.2M12.6 14.4h1.2M15.7 14.4h1.2M6.9 13.1h.01M6.9 16.6h.01" />
    </>
  ),
  house: (
    <>
      <path d="m4 11.2 6.9-6a1.7 1.7 0 0 1 2.2 0l1.7 1.5V5.2h2.6v3.8l2.6 2.2" />
      <path d="M6.1 9.6v9.3a1.8 1.8 0 0 0 1.8 1.8h8.2a1.8 1.8 0 0 0 1.8-1.8V9.6" />
      <path d="M10.1 20.7v-4.2a1.9 1.9 0 0 1 3.8 0v4.2" />
    </>
  ),
  utensils: (
    <>
      <path d="M6.8 3.4v4.9a2.4 2.4 0 0 0 4.8 0V3.4" />
      <path d="M9.2 10.7v9.9" />
      <path d="M17.2 12.7h-2.5c0-4.6.8-7.7 2.5-9.3v17.2" />
    </>
  ),
  ticket: (
    <>
      <path d="M3.5 13.8v1.9a1.9 1.9 0 0 0 1.9 1.9h13.2a1.9 1.9 0 0 0 1.9-1.9v-1.9a1.8 1.8 0 0 1 0-3.6V8.3a1.9 1.9 0 0 0-1.9-1.9H5.4a1.9 1.9 0 0 0-1.9 1.9v1.9a1.8 1.8 0 0 1 0 3.6Z" />
      <path d="M14.8 7.6v1.1M14.8 11.5v1.1M14.8 15.4v1.1" />
    </>
  ),
  "calendar-booking": (
    <>
      <rect x="3.6" y="5" width="16.8" height="15.4" rx="2.2" />
      <path d="M3.6 9.9h16.8" />
      <path d="M8.1 3.1v3.3M15.9 3.1v3.3" />
      <path d="m9.4 14.9 1.9 1.9 3.6-3.7" />
    </>
  ),
  "chat-bubble": (
    <path d="M4 7.1a2.9 2.9 0 0 1 2.9-2.9h10.2A2.9 2.9 0 0 1 20 7.1v6.6a2.9 2.9 0 0 1-2.9 2.9H9.8l-3.9 3.2c-.6.5-1.9.1-1.9-.7Z" />
  ),
  bell: (
    <>
      <path d="M12 3.9a5.5 5.5 0 0 0-5.5 5.5c0 2.9-.9 4.5-1.8 5.5-.4.5-.1 1.2.5 1.2h13.6c.6 0 .9-.7.5-1.2-.9-1-1.8-2.6-1.8-5.5A5.5 5.5 0 0 0 12 3.9Z" />
      <path d="M9.9 19.4a2.2 2.2 0 0 0 4.2 0" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6.1v11.6a2.6 2.6 0 0 0 2.6 2.6h11.2a2.2 2.2 0 0 0 2.2-2.2v-7.5a2.2 2.2 0 0 0-2.2-2.2H6.2A2.2 2.2 0 0 1 4 6.1a2.2 2.2 0 0 1 2.2-2.2H17" />
      <circle cx="15.9" cy="14.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.1" r="3.7" />
      <path d="M5.3 20.2a6.9 6.9 0 0 1 13.4 0" />
    </>
  ),
  "settings-gear": (
    <>
      <path d="M12.22 2.6h-.44a1.9 1.9 0 0 0-1.9 1.9v.17a1.9 1.9 0 0 1-.95 1.64l-.41.24a1.9 1.9 0 0 1-1.9 0l-.14-.08a1.9 1.9 0 0 0-2.59.7l-.21.36a1.9 1.9 0 0 0 .69 2.59l.15.1a1.9 1.9 0 0 1 .94 1.63v.48a1.9 1.9 0 0 1-.94 1.65l-.15.09a1.9 1.9 0 0 0-.69 2.59l.21.36a1.9 1.9 0 0 0 2.59.7l.14-.08a1.9 1.9 0 0 1 1.9 0l.41.24a1.9 1.9 0 0 1 .95 1.64v.17a1.9 1.9 0 0 0 1.9 1.9h.44a1.9 1.9 0 0 0 1.9-1.9v-.17a1.9 1.9 0 0 1 .95-1.64l.41-.24a1.9 1.9 0 0 1 1.9 0l.14.08a1.9 1.9 0 0 0 2.59-.7l.21-.37a1.9 1.9 0 0 0-.69-2.58l-.15-.09a1.9 1.9 0 0 1-.94-1.65v-.48a1.9 1.9 0 0 1 .94-1.64l.15-.09a1.9 1.9 0 0 0 .69-2.59l-.21-.36a1.9 1.9 0 0 0-2.59-.7l-.14.08a1.9 1.9 0 0 1-1.9 0l-.41-.24a1.9 1.9 0 0 1-.95-1.64v-.17a1.9 1.9 0 0 0-1.9-1.9Z" />
      <circle cx="12" cy="12" r="3.1" />
    </>
  ),
  heart: (
    <path d="M12 20.2S4 15.4 4 9.9a4.5 4.5 0 0 1 4.5-4.5c1.5 0 2.8.7 3.5 1.9a4.2 4.2 0 0 1 3.5-1.9A4.5 4.5 0 0 1 20 9.9c0 5.5-8 10.3-8 10.3Z" />
  ),
  grid: (
    <>
      <rect x="3.8" y="3.8" width="7" height="7" rx="1.9" />
      <rect x="13.2" y="3.8" width="7" height="7" rx="1.9" />
      <rect x="3.8" y="13.2" width="7" height="7" rx="1.9" />
      <rect x="13.2" y="13.2" width="7" height="7" rx="1.9" />
    </>
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
