import { snapUiIconSize, uiIconStrokeWidth } from "@/design-system/icons/UiIcon";

/**
 * The four line glyphs `7F96BE6C` draws on its settings rows that `UiIcon`
 * does not have: the ticked shield (Privacy & Security), the globe (Language),
 * the headset (Help & Support) and the door with an arrow (Log Out).
 *
 * Drawn on `UiIcon`'s own 24 grid and stroke, so beside `user` and `bell` in
 * the same column the six read as one family, each on the shared icon plate
 * (`components/ui/IconPlate.tsx`) the render puts behind every row glyph. If
 * the design system adopts these four, this file goes.
 */
export type SettingsGlyphName = "shield-check" | "globe" | "headset" | "log-out";

const PATHS: Record<SettingsGlyphName, React.ReactNode> = {
  "shield-check": (
    <>
      <path d="M12 2.9 19.2 6v5.3c0 4.3-2.9 8-7.2 9.6-4.3-1.6-7.2-5.3-7.2-9.6V6Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.4c2.3 2.4 3.4 5.3 3.4 8.6s-1.1 6.2-3.4 8.6c-2.3-2.4-3.4-5.3-3.4-8.6s1.1-6.2 3.4-8.6Z" />
    </>
  ),
  headset: (
    <>
      <path d="M4.6 14.5v-2.2a7.4 7.4 0 0 1 14.8 0v2.2" />
      <rect x="3.6" y="13.2" width="3.6" height="5.4" rx="1.4" />
      <rect x="16.8" y="13.2" width="3.6" height="5.4" rx="1.4" />
      <path d="M18.6 18.6c0 1.4-1.4 2.2-3.8 2.2h-1.6" />
    </>
  ),
  "log-out": (
    <>
      <path d="M13.4 4.2H7.2a1.6 1.6 0 0 0-1.6 1.6v12.4a1.6 1.6 0 0 0 1.6 1.6h6.2" />
      <path d="M10.6 12h9.2" />
      <path d="m16.6 8.6 3.4 3.4-3.4 3.4" />
    </>
  ),
};

export function SettingsGlyph({
  name,
  size = 20,
  className,
}: {
  name: SettingsGlyphName;
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
      strokeWidth={uiIconStrokeWidth(edge)}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
