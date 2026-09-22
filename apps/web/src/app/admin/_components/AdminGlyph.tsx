import type { ReactNode } from "react";
import { UI_ICON_STROKE_PX, UiIcon, snapUiIconSize, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The console's own line glyphs: the rail rows and card marks the governing
 * admin renders draw that the shared `UiIcon` set does not carry (a clipboard,
 * a ticked square, the naira square, a bar chart, the alert marks).
 *
 * Drawn in the same house style as `UiIcon` so they sit beside it without a
 * seam: a 24 unit box, round caps and joins, and the same 1.5px on-screen
 * stroke at every size. They live here rather than in the design system
 * because the design system is not this worker's to change; if they earn a
 * place in the shared set, they move there whole.
 */
export type AdminGlyphName =
  | "home-solid"
  | "clipboard"
  | "list-doc"
  | "check-square"
  | "naira-square"
  | "naira"
  | "shield-lock"
  | "shield-check"
  | "moderation"
  | "support"
  | "operations"
  | "bars"
  | "check-circle"
  | "info-circle"
  | "alert-triangle"
  | "x-circle"
  | "user-check"
  | "user-edit";

const PATHS: Record<AdminGlyphName, ReactNode> = {
  "home-solid": (
    <path
      stroke="none"
      fill="currentColor"
      d="M11.02 3.62a1.5 1.5 0 0 1 1.96 0l7.63 6.64c.4.35.15 1.01-.38 1.01H18.3v7.83a2 2 0 0 1-2 2h-2.9v-4.7a1.4 1.4 0 0 0-2.8 0v4.7H7.7a2 2 0 0 1-2-2v-7.83H3.77c-.53 0-.78-.66-.38-1.01Z"
    />
  ),
  clipboard: (
    <>
      <path d="M9 4.6H7.4a2 2 0 0 0-2 2v12.2a2 2 0 0 0 2 2h9.2a2 2 0 0 0 2-2V6.6a2 2 0 0 0-2-2H15" />
      <rect x="9" y="3.2" width="6" height="3.2" rx="1.1" />
      <path d="M8.8 11h6.4M8.8 14.4h6.4M8.8 17.6h3.8" />
    </>
  ),
  "list-doc": (
    <>
      <rect x="5.2" y="3.4" width="13.6" height="17.2" rx="2" />
      <path d="M8.6 7.6h6.8M8.6 11.2h2.2M13 11.2h2.4M8.6 14.8h6.8M8.6 18h2.2" />
    </>
  ),
  "check-square": (
    <>
      <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.6" />
      <path d="m8.4 12.2 2.5 2.5 4.9-5.2" />
    </>
  ),
  "naira-square": (
    <>
      <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.6" />
      <path d="M9.2 16.4V7.6l5.6 8.8V7.6M7.8 11h8.4M7.8 13.2h8.4" />
    </>
  ),
  naira: <path d="M7.4 19.2V4.8l9.2 14.4V4.8M4.8 10.2h14.4M4.8 13.6h14.4" />,
  "shield-lock": (
    <>
      <path d="M12 3.2 5.2 6v5.4c0 4.3 2.9 7.8 6.8 9.4 3.9-1.6 6.8-5.1 6.8-9.4V6Z" />
      <circle cx="12" cy="11.4" r="2.4" />
      <path d="M12 13.8v2.4" />
    </>
  ),
  "shield-check": (
    <>
      <path d="M12 3.2 5.2 6v5.4c0 4.3 2.9 7.8 6.8 9.4 3.9-1.6 6.8-5.1 6.8-9.4V6Z" />
      <path d="m9.2 12 2 2 3.8-4" />
    </>
  ),
  moderation: (
    <>
      <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.6" />
      <path d="M8.2 9h7.6M8.2 12.2h7.6M8.2 15.4h4.4" />
    </>
  ),
  support: (
    <>
      <path d="M5.6 11.2a6.4 6.4 0 0 1 12.8 0v3.2a2 2 0 0 1-2 2h-.8v-5.6h2.8M5.6 11.2v3.2a2 2 0 0 0 2 2h.8v-5.6H5.6" />
      <path d="M15.6 16.4c0 1.8-1.5 3.2-3.6 3.2h-1.2" />
    </>
  ),
  operations: (
    <>
      <path d="M12 2.9 19.8 7.4v9.2L12 21.1l-7.8-4.5V7.4Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bars: <path d="M5.2 19.6h13.6M7.6 16.4v-4M11 16.4V7.6M14.4 16.4v-6.2M17.8 16.4V5.4" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m8.6 12.2 2.3 2.3 4.6-4.8" />
    </>
  ),
  "info-circle": (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11v5M12 8v.1" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="M10.4 4.8a1.8 1.8 0 0 1 3.2 0l6.6 11.6a1.8 1.8 0 0 1-1.6 2.7H5.4a1.8 1.8 0 0 1-1.6-2.7Z" />
      <path d="M12 9.6v3.8M12 16.2v.1" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m9.4 9.4 5.2 5.2M14.6 9.4l-5.2 5.2" />
    </>
  ),
  "user-check": (
    <>
      <circle cx="10" cy="8.4" r="3.4" />
      <path d="M4.2 19.2c.6-3.2 3-5.2 5.8-5.2 1.2 0 2.3.3 3.2.9M14.8 17.4l1.8 1.8 3.4-3.6" />
    </>
  ),
  "user-edit": (
    <>
      <circle cx="10" cy="8.4" r="3.4" />
      <path d="M4.2 19.2c.6-3.2 3-5.2 5.8-5.2M14.2 19.6l.4-2.2 3.8-3.8 1.8 1.8-3.8 3.8Z" />
    </>
  ),
};

export function AdminGlyph({
  name,
  size = 20,
  className,
}: {
  name: AdminGlyphName;
  size?: number;
  className?: string;
}) {
  const edge = snapUiIconSize(size);
  return (
    <svg
      width={edge}
      height={edge}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={(UI_ICON_STROKE_PX * 24) / edge}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export type AdminIcon =
  | { tier: "ui"; name: UiIconName }
  | { tier: "admin"; name: AdminGlyphName };

/** Either tier, one call: the shared stroked set or the console's own. */
export function NavIcon({ icon, size = 20 }: { icon: AdminIcon; size?: number }) {
  return icon.tier === "ui" ? (
    <UiIcon name={icon.name} size={size} className="shrink-0" />
  ) : (
    <AdminGlyph name={icon.name} size={size} className="shrink-0" />
  );
}
