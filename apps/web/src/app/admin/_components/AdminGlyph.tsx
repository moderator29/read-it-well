import type { ReactNode } from "react";
import { UiIcon, snapUiIconSize, uiIconStrokeProps, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The console's glyph names: the rail rows and card marks the governing
 * admin renders draw.
 *
 * Until 29 September 2026 every one was hand-drawn here. The shared set
 * then adopted Lucide's drawings of the clipboard, the ticked square, the
 * bar chart, the alert marks, the headset, the shields and the two user
 * marks, so those names now resolve to `UiIcon` (`UI_NAME` below) and the
 * console draws from the one family the rest of the platform uses. Only the
 * marks Lucide has no drawing for stay here, on Lucide's own outlines where
 * one exists (the square is `square`, the hexagon is `hexagon`): the filled
 * home, the two naira marks, the moderation list and the operations hexagon.
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

/** The names that are the shared set's drawings. */
const UI_NAME: Partial<Record<AdminGlyphName, UiIconName>> = {
  clipboard: "clipboard-list",
  "list-doc": "file-text",
  "check-square": "square-check",
  "shield-lock": "shield-lock",
  "shield-check": "shield-check",
  support: "headset",
  bars: "chart-bar",
  "check-circle": "circle-check",
  "info-circle": "info",
  "alert-triangle": "alert-triangle",
  "x-circle": "circle-x",
  "user-check": "user-check",
  "user-edit": "user-pen",
};

/** The console's own marks, where the shared set has no drawing. */
const PATHS: Partial<Record<AdminGlyphName, ReactNode>> = {
  "home-solid": (
    <path
      stroke="none"
      fill="currentColor"
      d="M11.02 3.62a1.5 1.5 0 0 1 1.96 0l7.63 6.64c.4.35.15 1.01-.38 1.01H18.3v7.83a2 2 0 0 1-2 2h-2.9v-4.7a1.4 1.4 0 0 0-2.8 0v4.7H7.7a2 2 0 0 1-2-2v-7.83H3.77c-.53 0-.78-.66-.38-1.01Z"
    />
  ),
  // [square] with the naira drawn inside.
  "naira-square": (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9.2 16.4V7.6l5.6 8.8V7.6M7.8 11h8.4M7.8 13.2h8.4" />
    </>
  ),
  naira: <path d="M7.4 19.2V4.8l9.2 14.4V4.8M4.8 10.2h14.4M4.8 13.6h14.4" />,
  // [square-menu], the last line short: a queue of items to read.
  moderation: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 8h10" />
      <path d="M7 12h10" />
      <path d="M7 16h6" />
    </>
  ),
  // [hexagon] with a hub: the machinery.
  operations: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <circle cx="12" cy="12" r="3" />
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
  const shared = UI_NAME[name];
  if (shared) return <UiIcon name={shared} size={size} className={className} />;
  const edge = snapUiIconSize(size);
  return (
    <svg
      width={edge}
      height={edge}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      {...uiIconStrokeProps(edge)}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `nf-ui-icon ${className}` : "nf-ui-icon"}
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
