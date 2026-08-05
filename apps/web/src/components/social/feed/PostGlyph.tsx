/**
 * The marks.
 *
 * An original family, not a borrowed one. No outline heart, no speech bubble,
 * no two-arrow recycle, no eye: those five glyphs are what made an earlier pass
 * read as a dark-mode clone of somebody else's product, and swapping the colour
 * on a copied icon set does not make it ours.
 *
 * Everything here is drawn on a 24 grid from three primitives and nothing else:
 *
 *   a STROKE, a line with a rounded cap
 *   a NODE,   a dot, hollow or filled
 *   a GAP,    a deliberate break in a stroke
 *
 * That constraint is the whole point. Five marks built from three shapes read as
 * one family at a glance, which is what an icon set is for, and it means a sixth
 * mark can be drawn later without a design meeting.
 *
 * Each is a single path or a node plus a path, so the draw-on animation is one
 * `stroke-dashoffset` transition rather than a keyframe rig. Under
 * `prefers-reduced-motion` the token durations already collapse to 1ms, so the
 * mark snaps rather than animating and no separate code path is needed.
 */

export type PostGlyphName =
  | "like"
  | "reply"
  | "repost"
  | "views"
  | "share"
  | "more"
  /* Three controls rather than three reactions, drawn from the same three
     primitives so a sheet's close button and a like belong to one family.
     They live here rather than in `UiIcon` because `UiIcon` carries no plus and
     no cross, and adding to the platform's navigation set is not this layer's
     to do. */
  | "compose"
  | "close"
  | "bookmark"
  /* The sixth mark the note above says can be drawn without a design meeting.
     It is drawn here for the same reason `compose` and `close` are: `UiIcon`
     carries no camera and no picture, and adding to the platform's navigation
     set is not this layer's to do. */
  | "picture";

const STROKE = {
  fill: "none",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PostGlyph({
  name,
  active = false,
  size = 19,
  className,
}: {
  name: PostGlyphName;
  /** Filled state. Only like and repost have one. */
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {name === "like" ? (
        /* A node inside a ring. Marked or not marked, with nothing borrowed
           from a heart, and it fills from the centre outward on tap. */
        <>
          <circle cx="12" cy="12" r="7.2" {...STROKE} />
          <circle
            cx="12"
            cy="12"
            r={active ? 4 : 0}
            fill="currentColor"
            stroke="none"
            style={{ transition: "r var(--nf-duration-fast) var(--nf-ease-spring)" }}
          />
        </>
      ) : null}

      {name === "reply" ? (
        /* A stroke that turns once and ends in a node: the conversation
           branching, rather than a speech bubble. */
        <>
          <path d="M6.5 5.5v6.2a4 4 0 0 0 4 4h5.2" {...STROKE} />
          <circle cx="17.6" cy="15.7" r="2.1" fill="currentColor" stroke="none" />
        </>
      ) : null}

      {name === "repost" ? (
        /* Two nodes joined by a stroke that closes back on itself. It carries
           the same words to another place, so the line returns. */
        <>
          <path d="M8 6.6h5.4a4.6 4.6 0 0 1 4.6 4.6v1.4" {...STROKE} />
          <path d="M16 17.4h-5.4A4.6 4.6 0 0 1 6 12.8v-1.4" {...STROKE} />
          {/* Spread first, then fill. The other way round, STROKE's own
              `fill: none` silently wins and the marked state never fills. */}
          <circle {...STROKE} cx="6" cy="6.6" r={active ? 2.4 : 1.9} fill={active ? "currentColor" : "none"} />
          <circle {...STROKE} cx="18" cy="17.4" r={active ? 2.4 : 1.9} fill={active ? "currentColor" : "none"} />
        </>
      ) : null}

      {name === "views" ? (
        /* Three strokes of increasing length: a signal rising. Nothing to do
           with an eye, which is the glyph every other product reaches for and
           which quietly says "we are watching you". */
        <>
          <path d="M5.5 17.5v-3.2" {...STROKE} />
          <path d="M12 17.5v-6.6" {...STROKE} />
          <path d="M18.5 17.5V7.5" {...STROKE} />
        </>
      ) : null}

      {name === "share" ? (
        /* A node with three strokes leaving it. One thing going to several
           places, which is what sharing is. */
        <>
          <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
          <path d="M12 9.6V4.4" {...STROKE} />
          <path d="M10 13.4 6 17.2" {...STROKE} />
          <path d="M14 13.4 18 17.2" {...STROKE} />
        </>
      ) : null}

      {name === "compose" ? (
        /* Two strokes crossing at a node. Writing something is adding it, and
           the node at the crossing is the same node the other five marks are
           built from, so the button that starts a post belongs to the family
           the post's own actions come from. */
        <>
          <path d="M12 5.6v12.8" {...STROKE} strokeWidth={2} />
          <path d="M5.6 12h12.8" {...STROKE} strokeWidth={2} />
        </>
      ) : null}

      {name === "close" ? (
        /* The same two strokes, turned. A close is a compose that changed its
           mind, and drawing it as the same gesture rotated is cheaper to read
           than a second shape. */
        <>
          <path d="M7.2 7.2 16.8 16.8" {...STROKE} strokeWidth={2} />
          <path d="M16.8 7.2 7.2 16.8" {...STROKE} strokeWidth={2} />
        </>
      ) : null}

      {name === "bookmark" ? (
        /* A stroke folded back on itself. Keeping something is holding one end
           of it, so the mark is one line that turns rather than a tag or a
           ribbon borrowed from somebody else's set. */
        <>
          <path
            d="M7 5.4h10v13.2l-5-3.4-5 3.4z"
            {...STROKE}
            fill={active ? "currentColor" : "none"}
          />
        </>
      ) : null}

      {name === "picture" ? (
        /* A frame, a node and a stroke that turns twice: light above a ridge.
           All three primitives, no camera body and no shutter, because a
           picture in a post is a photograph of a street and not a device. */
        <>
          <rect x="4.2" y="5.8" width="15.6" height="12.4" rx="3.2" {...STROKE} />
          <circle cx="9" cy="10.3" r="1.5" fill="currentColor" stroke="none" />
          <path d="M5.4 16.6 9.8 12.6l2.8 2.5 2.4-1.9 3.4 3" {...STROKE} />
        </>
      ) : null}

      {name === "more" ? (
        /* Three nodes. The owner asked for the three dots by name, so this is
           the one mark in the set that is deliberately conventional: an
           invented affordance for "more actions" is an affordance nobody finds. */
        <>
          <circle cx="5.4" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="18.6" cy="12" r="1.7" fill="currentColor" stroke="none" />
        </>
      ) : null}
    </svg>
  );
}
