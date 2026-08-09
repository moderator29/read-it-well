import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The social marks, now drawn by `UiIcon`.
 *
 * ---------------------------------------------------------------------------
 * THIS FILE NO LONGER DRAWS ANYTHING. It used to hold fifteen glyphs on their
 * own 24 grid with their own `strokeWidth: 1.7`, their own default size of 19,
 * and their own `active` semantics - a complete second icon family, private to
 * the social layer, sitting beside a platform family that already had a heart,
 * a chat bubble, a share tray and a close.
 *
 * Two families is two answers to every question. The weight disagreed (1.7 here
 * against the platform's derived-per-size stroke), the sizes disagreed (19 is
 * not on any scale), and the same idea was drawn twice: this file's `close` and
 * `UiIcon`'s `close` were two different crosses on two different diagonals,
 * rendered a hundred pixels apart inside the same sheet.
 *
 * Every drawing here has moved into `UiIcon`, unchanged where it was good -
 * the repost rails, the rising-signal views mark, the square-cut reply bubble
 * are all still the family they were designed as - and what is left is a NAME
 * MAP. Thirty call sites keep their vocabulary (`name="like"`, `active`), and
 * there is exactly one set of paths on the platform.
 *
 * The five names that map onto glyphs the platform already had are the point of
 * the exercise: `like` is the platform heart, `reply` the platform chat bubble,
 * `share` the platform tray, `close` the platform cross, `compose` the platform
 * plus. Those five were drawn twice.
 *
 * DELETING THIS FILE is the finish, and it is a mechanical rename of thirty
 * `<PostGlyph name="x">` to `<UiIcon name="y">`. It is left as an adapter
 * rather than done here because a rename that touches thirteen files belongs in
 * its own change, where a reviewer can see it.
 */

export type PostGlyphName =
  | "like"
  | "reply"
  | "repost"
  | "views"
  | "share"
  | "more"
  | "compose"
  | "close"
  | "bookmark"
  | "picture"
  | "link"
  | "report"
  | "mute"
  | "block"
  | "trash";

/** The whole of what was private about this set: which platform glyph it is. */
const AS_UI: Record<PostGlyphName, UiIconName> = {
  like: "heart",
  reply: "chat-bubble",
  repost: "repost",
  views: "views",
  share: "share",
  more: "more",
  compose: "plus",
  close: "close",
  bookmark: "bookmark",
  picture: "picture",
  link: "link",
  report: "flag",
  mute: "mute",
  block: "block",
  trash: "trash",
};

export function PostGlyph({
  name,
  active = false,
  size = 20,
  className,
}: {
  name: PostGlyphName;
  /** Filled state. Only like, repost and bookmark have one. */
  active?: boolean;
  size?: number;
  className?: string;
}) {
  /* `active` is the social layer's word for what the platform calls `filled`.
     `UiIcon` ignores it for any glyph that is not drawn as a closed silhouette,
     so asking for it on a repost is silently correct rather than a blob. */
  return <UiIcon name={AS_UI[name]} size={size} filled={active} className={className} />;
}
