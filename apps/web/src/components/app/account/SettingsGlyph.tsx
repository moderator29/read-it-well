import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The four settings-row glyphs `7F96BE6C` draws: the ticked shield (Privacy
 * & Security), the globe (Language), the headset (Help & Support) and the
 * door with an arrow (Log Out).
 *
 * They were hand-drawn here on `UiIcon`'s grid until 29 September 2026, when
 * the set adopted Lucide's drawings of all four; this is now a name map onto
 * `UiIcon`, so the settings rows draw from the one set every other row uses.
 * Kept as a component so `SettingsHub` needs no change.
 */
export type SettingsGlyphName = "shield-check" | "globe" | "headset" | "log-out";

const NAME: Record<SettingsGlyphName, UiIconName> = {
  "shield-check": "shield-check",
  globe: "globe",
  headset: "headset",
  "log-out": "log-out",
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
  return <UiIcon name={NAME[name]} size={size} className={className} />;
}
