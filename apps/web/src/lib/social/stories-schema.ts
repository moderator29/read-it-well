/**
 * Stories.
 *
 * Client safe, because both the composer and the viewer need these and a
 * constant exported from a `"use server"` file cannot be imported by a client
 * component. That failure only shows at build time, never at typecheck, and
 * this codebase has been caught by it before.
 *
 * **A story is not a post.** It was one for an afternoon, as
 * `post_kind = 'STORY'`, and that was wrong: it made a piece of writing into a
 * variant of a feed item. It now has its own table, its own reactions, its own
 * comments with their own likes, its own views, its own moderation and its own
 * counters:
 *
 *   `public.stories`                 the piece itself
 *   `public.story_reactions`         LIKE and SAVE
 *   `public.story_comments`          with `parent_id` for ONE level of nesting
 *   `public.story_comment_reactions` a like on a comment
 *   `public.story_views`             the same salted daily bucket posts use
 *
 * The single most important column is `image_path not null`. **The picture is
 * the story.** Making it a column rather than a second row is what removed the
 * deferred constraint trigger the previous shape needed, which failed at COMMIT
 * with an error no write path could see coming. One insert, one rule, no
 * deferral.
 *
 * **Comments are one level deep and the database enforces it.** A reply aimed
 * at a reply is silently re-pointed at its parent, so the sheet is built for
 * exactly two levels and can never receive a third. That is why the connector
 * it draws needs no depth arithmetic: a comment either has a parent in the
 * sheet or it does not.
 *
 * It is not ephemeral. Nothing expires it and nothing counts twenty-four hours.
 * A story here is an editorial piece with a headline, and the whole point is
 * that it is still there next month.
 */

import { z } from "zod";

export const STORY_HEADLINE_MIN = 3;
export const STORY_HEADLINE_MAX = 120;
export const STORY_STANDFIRST_MAX = 400;
export const STORY_PLACE_MAX = 80;
export const STORY_COMMENT_MAX = 1000;

/** The longest edge a story image is stored at. Full bleed on a phone, and
    still sensible on a laptop, without shipping a 4MB photograph over 3G. */
export const STORY_IMAGE_MAX_EDGE = 1600;
export const STORY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Where a story's picture lives. Private, read through the story's own
    visibility, exactly as post media is. */
export const STORY_BUCKET = "social-media";

export const storyInputSchema = z.object({
  areaId: z.string().uuid("Choose the place this story is about."),
  headline: z
    .string()
    .trim()
    .min(STORY_HEADLINE_MIN, "Give it a headline.")
    .max(STORY_HEADLINE_MAX, `Keep the headline under ${STORY_HEADLINE_MAX} characters.`),
  standfirst: z
    .string()
    .trim()
    .max(STORY_STANDFIRST_MAX, `Keep it under ${STORY_STANDFIRST_MAX} characters.`)
    .optional()
    .or(z.literal("")),
  placeLabel: z
    .string()
    .trim()
    .max(STORY_PLACE_MAX, "That place name is too long.")
    .optional()
    .or(z.literal("")),
  /** The uploaded object path, already EXIF stripped by a canvas re-encode. */
  imagePath: z.string().trim().min(1, "Choose a picture first."),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type StoryInput = z.infer<typeof storyInputSchema>;

export const storyIdSchema = z.object({ storyId: z.string().uuid() });
export const storyCommentIdSchema = z.object({ commentId: z.string().uuid() });

export const storyMarkSchema = z.object({
  storyId: z.string().uuid(),
  mark: z.enum(["LIKE", "SAVE"]),
});

export const storyCommentSchema = z.object({
  storyId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  body: z
    .string()
    .trim()
    .min(1, "Write your comment first.")
    .max(STORY_COMMENT_MAX, `Keep it under ${STORY_COMMENT_MAX} characters.`),
});

export const STORY_COPY = {
  chip: "STORY",
  publishing: "Publishing",
  publish: "Publish story",
  headlinePlaceholder: "What happened?",
  standfirstPlaceholder: "The paragraph under the headline. Two sentences is plenty.",
  placePlaceholder: "Lekki Phase 1, Lagos",
  imagePrompt: "Choose the picture",
  imageNote:
    "Pictures are re-encoded on your phone before they are uploaded, so the location tag a camera writes never leaves it.",
  needsImage: "The picture is the story. Choose one and it will publish.",
  held:
    "Your story mentions something we check by hand. Somebody is reading it before it goes up, and only you can see it until then.",
  emptyMine:
    "A story is a picture, a headline and a line or two. It stays up, so it is worth writing the ones people will still want next month.",
  addComment: "Add a comment...",
  updates: "Updates",
  stories: "Stories",
  removed: "This story was removed.",
} as const;

export const STORY_FAILURE = {
  down: "We could not publish that just now. Please try again in a moment.",
  upload: "That upload did not go through. Check your connection and try again.",
  reencode:
    "We could not prepare that picture safely, so it was not uploaded. Try a different one.",
  tooBig: "That picture is over 10MB. Please choose a smaller one.",
  wrongType: "Choose a JPG, PNG or WebP picture.",
  notInArea: "Join this place before you write a story about it.",
  gone: "That story is no longer there.",
  /*
   * 42P01 is "no such table", which is the honest answer while the migration is
   * on its way. It is a platform state, not something the person did, and it
   * says so rather than blaming them or claiming a network problem.
   */
  notYet:
    "Stories switch on shortly. Everything else you can do here works as normal.",
  signedOutLike: "Sign in to like this story.",
} as const;

/** The SQLSTATEs the story paths turn into sentences. */
export function messageForStoryError(code: string | undefined): string {
  switch (code) {
    case "42P01":
    case "PGRST205":
      return STORY_FAILURE.notYet;
    case "42501":
      return STORY_FAILURE.notInArea;
    case "23503":
      return STORY_FAILURE.gone;
    case "23514":
      return "That will not publish. Check the headline and try again.";
    default:
      return STORY_FAILURE.down;
  }
}
