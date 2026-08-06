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
  | "picture"
  /* The overflow menu's own marks. They were borrowed from `UiIcon` - a gear
     stood in for both Delete and Report, a slider for Mute, a person for Block -
     which is four rows of a destructive menu wearing the wrong shape. A menu
     where two different consequences share an icon is a menu people misread,
     and two of these rows cannot be undone. */
  | "link"
  | "report"
  | "mute"
  | "block"
  | "trash";

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
        /*
         * A ring with a node in it read as a radio button, not as a like. An
         * icon that has to be learned is an icon that does not work, and this
         * one sits on every post on the platform.
         *
         * So the SILHOUETTE is the one everybody already knows and the DRAWING
         * is ours: two arcs meeting at a chamfered point rather than a soft
         * curve, a flat cut across the shoulders, and a single weight. That is
         * how a house set is built - a recognisable form drawn in one voice -
         * rather than by inventing a shape nobody can read.
         */
        <path
          d="M12 19.4 5.4 13a4.3 4.3 0 0 1 0-6.1 4.3 4.3 0 0 1 6.1 0l.5.5.5-.5a4.3 4.3 0 0 1 6.1 0 4.3 4.3 0 0 1 0 6.1Z"
          {...STROKE}
          fill={active ? "currentColor" : "none"}
        />
      ) : null}

      {name === "reply" ? (
        /* A bubble, but squared and with the tail CUT from the corner rather
           than hung off the bottom edge - which is the one detail that keeps it
           from being the same speech bubble as everything else, and it reads at
           19px, which the branching stroke it replaces did not. */
        <path
          d="M5.2 9.1a3.4 3.4 0 0 1 3.4-3.4h6.8a3.4 3.4 0 0 1 3.4 3.4v3.6a3.4 3.4 0 0 1-3.4 3.4H10l-4.8 3.2Z"
          {...STROKE}
        />
      ) : null}

      {name === "repost" ? (
        /* Two nodes joined by a stroke that closes back on itself. It carries
           the same words to another place, so the line returns. */
        <>
          {/* Two rails and two chevrons: the same words travelling to another
              place and back. Squared corners rather than the soft recycle loop
              every other product uses, and the heads are open chevrons so the
              direction survives at 19px. */}
          <path d="M7.4 9.2V7.6A1.8 1.8 0 0 1 9.2 5.8h7.4" {...STROKE} />
          <path d="M14.2 3.4 16.8 5.8 14.2 8.2" {...STROKE} />
          <path d="M16.6 14.8v1.6a1.8 1.8 0 0 1-1.8 1.8H7.4" {...STROKE} />
          <path d="M9.8 15.8 7.2 18.2 9.8 20.6" {...STROKE} />
        </>
      ) : null}

      {name === "views" ? (
        /* Three strokes of increasing length: a signal rising. Nothing to do
           with an eye, which is the glyph every other product reaches for and
           which quietly says "we are watching you". */
        <>
          {/* Three strokes rising, the tallest capped with the family's node.
              Nothing to do with an eye, which is the glyph every other product
              reaches for and which quietly says "we are watching you". */}
          <path d="M5.5 17.8v-3.4" {...STROKE} />
          <path d="M12 17.8v-6.8" {...STROKE} />
          <path d="M18.5 17.8V9.2" {...STROKE} />
          <circle cx="18.5" cy="6.4" r="1.8" fill="currentColor" stroke="none" />
        </>
      ) : null}

      {name === "share" ? (
        /* A node with three strokes leaving it. One thing going to several
           places, which is what sharing is. */
        <>
          {/* Not the iOS box-and-arrow, and not the three-node network every
              other set uses. A frame that is OPEN at the top with the thing
              leaving through the opening: the gap is the whole idea, and it is
              the one mark in the family that reads as "out of here". */}
          <path d="M7.6 10.4H6.2A1.8 1.8 0 0 0 4.4 12.2v5.6A1.8 1.8 0 0 0 6.2 19.6h11.6a1.8 1.8 0 0 0 1.8-1.8v-5.6a1.8 1.8 0 0 0-1.8-1.8h-1.4" {...STROKE} />
          <path d="M12 14.2V4.4" {...STROKE} />
          <path d="M8.6 7.6 12 4.2l3.4 3.4" {...STROKE} />
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

      {name === "link" ? (
        /* Two chamfered capsules holding each other. A link is a join, and the
           join is what the mark draws. */
        <>
          <path d="M10.4 13.6a3.6 3.6 0 0 0 5.4.4l2.2-2.2a3.6 3.6 0 0 0-5.1-5.1l-1.3 1.3" {...STROKE} />
          <path d="M13.6 10.4a3.6 3.6 0 0 0-5.4-.4L6 12.2a3.6 3.6 0 0 0 5.1 5.1l1.3-1.3" {...STROKE} />
        </>
      ) : null}

      {name === "report" ? (
        /* A flag on a mast, the cloth cut square. A gear stood here before,
           which is the icon for settings on every screen of this platform. */
        <>
          <path d="M6.6 20.2V4.6" {...STROKE} />
          <path d="M6.6 5.4h9.8l-2.2 3.6 2.2 3.6H6.6" {...STROKE} />
        </>
      ) : null}

      {name === "mute" ? (
        /* A bell with the clapper gone and a cut through it. Muting is not
           blocking: the bell is still there, it just says nothing. */
        <>
          <path d="M8 10.6a4 4 0 0 1 8 0c0 3.4 1.2 4.6 1.2 4.6H6.8S8 14 8 10.6Z" {...STROKE} />
          <path d="M5 5 19 19" {...STROKE} />
        </>
      ) : null}

      {name === "block" ? (
        /* The prohibition sign, and the ONE mark in this set that is
           deliberately universal. An invented glyph for the most permanent
           action in the menu is an invented glyph somebody presses by mistake. */
        <>
          <circle cx="12" cy="12" r="7.6" {...STROKE} />
          <path d="M6.6 6.6 17.4 17.4" {...STROKE} />
        </>
      ) : null}

      {name === "trash" ? (
        /* A lid, a body, and nothing inside it. */
        <>
          <path d="M5.4 7.4h13.2" {...STROKE} />
          <path d="M9.6 7.4V5.8a1.4 1.4 0 0 1 1.4-1.4h2a1.4 1.4 0 0 1 1.4 1.4v1.6" {...STROKE} />
          <path d="M7 7.4l.9 11a1.6 1.6 0 0 0 1.6 1.5h5a1.6 1.6 0 0 0 1.6-1.5l.9-11" {...STROKE} />
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
