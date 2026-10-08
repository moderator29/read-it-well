/**
 * stories-schema: the zod schemas the SERVER validates with.
 *
 * Everything a client component may import (the constants, labels, limits,
 * copy and pure helpers) lives in `./stories-model` and is re-exported here, so a server
 * module still imports from this file as before. A client component imports
 * the model, never this file, because this file builds zod schemas at import
 * time and zod's classic API is 64 KB gzipped in every client chunk that
 * reaches it (W13, chunk 2008felnqkn1d).
 */

import { z } from "zod";
import { REPORT_REASONS } from "./posts-model";
import {
  STORY_COMMENT_MAX,
  STORY_HEADLINE_MAX,
  STORY_HEADLINE_MIN,
  STORY_PLACE_MAX,
  STORY_STANDFIRST_MAX,
} from "./stories-model";
export * from "./stories-model";

export const storyInputSchema = z.object({
  areaId: z.string().uuid("Choose the place this story is about."),
  headline: z
    .string()
    .trim()
    .min(STORY_HEADLINE_MIN)
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

/** A report against one story comment. Same reasons and limits as a post's. */
export const reportStoryCommentSchema = z.object({
  commentId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().max(600).optional().or(z.literal("")),
});

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
