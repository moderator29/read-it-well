import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * THE FEED'S FOUR LINE GLYPHS: a pencil on Post, a camera on Story, two
 * people on Following and a repost as a LEVEL loop (two arrows chasing round
 * a wide rectangle), as the founder's feed image draws them.
 *
 * They were hand-drawn here until 29 September 2026 (request FEED-1), when
 * `UiIcon` adopted Lucide's `pencil`, `camera`, `users-round` (as `users`)
 * and `repeat` (as `repost-loop`). This is now a name map onto the one set.
 */
export type LineGlyphName = "pencil" | "camera" | "people" | "repost";

const NAME: Record<LineGlyphName, UiIconName> = {
  pencil: "pencil",
  camera: "camera",
  people: "users",
  repost: "repost-loop",
};

export function LineGlyph({
  name,
  size = 20,
  className,
}: {
  name: LineGlyphName;
  size?: number;
  className?: string;
}) {
  return <UiIcon name={NAME[name]} size={size} className={className} />;
}
