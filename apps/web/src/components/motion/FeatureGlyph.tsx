import { uiIconStrokeProps } from "@/design-system/icons/UiIcon";

/**
 * Feature icons that move once (Track M).
 *
 * THE DRAWINGS ARE THE UiIcon ONES, path for path: the shield is `verified`,
 * the key is `key`, the bubble is `chat-bubble`, the pin is `location`, the
 * page is `document`, the house is `home`. Nothing is redrawn and nothing is
 * restyled. What is new is that each glyph is split into the part that moves
 * and the part that holds still, which `UiIcon` cannot do because it renders a
 * glyph as one fragment.
 *
 * ONE MICRO-MOTION EACH, 620ms (deliberate), played when the host scrolls
 * into view and again on hover (app/css/motion-kit.css). Every motion is a
 * transform or an opacity:
 *
 *   shield    the tick is wiped in from its elbow by a clip whose rect scales
 *   key       the key turns a quarter and back, as if in a lock
 *   chat      three dots type inside the bubble
 *   pin       the pin drops onto its shadow and settles
 *   document  the lines are written in, one after the other
 *   home      the roof settles onto the walls
 *
 * The host is whatever element carries `nf-fx-host` (a card, a row); the
 * glyph reads its `data-reveal` or `:hover`. Reduced motion: static glyph.
 *
 * `id` must be unique on the page; the shield's clip path is addressed by it.
 */
export type FeatureGlyphName = "shield" | "key" | "chat" | "pin" | "document" | "home";

export function FeatureGlyph({
  name,
  id,
  size = 28,
  className,
}: {
  name: FeatureGlyphName;
  id: string;
  /** 28 is the feature-icon size on the Track M scale. */
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      {...uiIconStrokeProps(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`nf-ui-icon nf-fx nf-fx--${name} ${className ?? ""}`.trim()}
    >
      {name === "shield" && (
        <>
          <defs>
            <clipPath id={`${id}-wipe`}>
              <rect className="nf-fx-wipe" x="7.4" y="8.2" width="9.4" height="7.4" />
            </clipPath>
          </defs>
          <path d="M12 2.9 19.2 6v5.3c0 4.3-2.9 8-7.2 9.6-4.3-1.6-7.2-5.3-7.2-9.6V6Z" />
          <path clipPath={`url(#${id}-wipe)`} d="m8.7 11.8 2.3 2.3 4.3-4.4" />
        </>
      )}
      {name === "key" && (
        <g className="nf-fx-turn">
          <circle cx="7.6" cy="15.6" r="3.6" />
          <path d="m10.3 12.9 8.6-8.6" />
          <path d="m15.6 4.9 3 3" />
          <path d="m12.9 8.3 2.4 2.4" />
        </g>
      )}
      {name === "chat" && (
        <>
          <path d="M4 7.1a2.9 2.9 0 0 1 2.9-2.9h10.2A2.9 2.9 0 0 1 20 7.1v6.6a2.9 2.9 0 0 1-2.9 2.9H9.8l-3.9 3.2c-.6.5-1.9.1-1.9-.7Z" />
          <g fill="currentColor" stroke="none">
            <circle className="nf-fx-dot" cx="8.6" cy="10.4" r="1" />
            <circle className="nf-fx-dot" cx="12" cy="10.4" r="1" />
            <circle className="nf-fx-dot" cx="15.4" cy="10.4" r="1" />
          </g>
        </>
      )}
      {name === "pin" && (
        <>
          <ellipse className="nf-fx-shadow" cx="12" cy="21.4" rx="3.2" ry="0.7" fill="currentColor" stroke="none" />
          <g className="nf-fx-drop">
            <path d="M12 20.4s6.4-5.4 6.4-10.4a6.4 6.4 0 1 0-12.8 0c0 5 6.4 10.4 6.4 10.4Z" />
            <circle cx="12" cy="9.8" r="2.4" />
          </g>
        </>
      )}
      {name === "document" && (
        <>
          <path d="M13.6 3.4H7.2A2 2 0 0 0 5.2 5.4v13.2a2 2 0 0 0 2 2h9.6a2 2 0 0 0 2-2V8.6Z" />
          <path d="M13.6 3.4v3.4a1.8 1.8 0 0 0 1.8 1.8h3.4" />
          <path className="nf-fx-line" d="M8.8 13h6.4" />
          <path className="nf-fx-line" d="M8.8 16.4h4.2" />
        </>
      )}
      {name === "home" && (
        <>
          <path className="nf-fx-roof" d="m4.2 10.9 7-6.1a1.2 1.2 0 0 1 1.6 0l7 6.1" />
          <path d="M6.2 9.4V19a1.7 1.7 0 0 0 1.7 1.7h8.2a1.7 1.7 0 0 0 1.7-1.7V9.4" />
          <path d="M10 20.7v-4.9a1.3 1.3 0 0 1 1.3-1.3h1.4a1.3 1.3 0 0 1 1.3 1.3v4.9" />
        </>
      )}
    </svg>
  );
}
