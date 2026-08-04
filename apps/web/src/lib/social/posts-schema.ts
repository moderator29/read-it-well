/**
 * Around: the shapes and words for posts.
 *
 * Client safe. A constant exported from a `"use server"` file cannot be
 * imported by a client component, and the failure only shows at build time,
 * never at typecheck, so everything a form or a card needs lives here.
 *
 * The database is the authority for every bound below. These schemas exist so a
 * person gets a useful sentence before the round trip, not to be the check.
 */

import { z } from "zod";

export const POST_KINDS = ["GIST", "ASK", "REPLY", "SHOWCASE", "SYSTEM"] as const;
export type PostKind = (typeof POST_KINDS)[number];

/** What a person may actually choose to write. The other two are the platform's. */
export const COMPOSABLE_KINDS = ["GIST", "ASK"] as const;
export type ComposableKind = (typeof COMPOSABLE_KINDS)[number];

export const KIND_LABEL: Record<ComposableKind, string> = {
  GIST: "Say something",
  ASK: "Ask a question",
};

export const KIND_HINT: Record<ComposableKind, string> = {
  GIST: "Anything worth knowing about the place.",
  ASK: "Something you want an answer to. People who know the area will see it.",
};

export const KIND_PLACEHOLDER: Record<ComposableKind, string> = {
  GIST: "What is happening?",
  ASK: "What do you want to know?",
};

export const POST_MAX = 2000;
export const POST_MEDIA_MAX = 4;
/** The window the database allows an edit in. Kept in step with posts_update_own. */
export const EDIT_WINDOW_MINUTES = 15;

export const dropPostSchema = z.object({
  areaId: z.string().uuid("Choose a place to post in."),
  kind: z.enum(COMPOSABLE_KINDS),
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(POST_MAX, `Keep it under ${POST_MAX} characters.`),
});

export const replySchema = z.object({
  parentId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write your reply first.")
    .max(POST_MAX, `Keep it under ${POST_MAX} characters.`),
});

export const postIdSchema = z.object({ postId: z.string().uuid() });

export const markSchema = z.object({
  postId: z.string().uuid(),
  mark: z.enum(["LIKE", "SAVE"]),
});

/*
 * Reporting.
 *
 * `public.reports.reason` is text, so this list is our own decision rather than
 * a database constraint. It is still an enum here, because a triage queue where
 * every row says "Something else" cannot be worked, and free text as the only
 * signal is exactly what produces that queue.
 *
 * One vocabulary, two subsets. A post can be nothing to do with the place it
 * was written in; an account cannot. An account can be pretending to be
 * somebody; a single post rarely is on its own. Offering a reason that cannot
 * apply is how a report ends up filed as the nearest wrong thing.
 */
export const REPORT_REASONS = [
  "SCAM",
  "OFF_PLATFORM_PAYMENT",
  "HARASSMENT",
  "MISLEADING",
  "IMPERSONATION",
  "NOT_ABOUT_THIS_PLACE",
  "OTHER",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

const reasonEnum = z.enum(REPORT_REASONS);

export const reportPostSchema = z.object({
  postId: z.string().uuid(),
  reason: reasonEnum,
  detail: z.string().trim().max(600).optional().or(z.literal("")),
});

export const reportProfileSchema = z.object({
  userId: z.string().uuid(),
  reason: reasonEnum,
  detail: z.string().trim().max(600).optional().or(z.literal("")),
});

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  SCAM: "It looks like a scam",
  OFF_PLATFORM_PAYMENT: "Asking for payment outside RentMe",
  HARASSMENT: "Harassment or abuse",
  MISLEADING: "It is not true",
  IMPERSONATION: "Pretending to be somebody else",
  NOT_ABOUT_THIS_PLACE: "Nothing to do with this place",
  OTHER: "Something else",
};

/** What you may say about a post. */
export const POST_REPORT_REASONS: readonly ReportReason[] = [
  "SCAM",
  "OFF_PLATFORM_PAYMENT",
  "HARASSMENT",
  "MISLEADING",
  "NOT_ABOUT_THIS_PLACE",
  "OTHER",
];

/** What you may say about an account. */
export const PROFILE_REPORT_REASONS: readonly ReportReason[] = [
  "SCAM",
  "OFF_PLATFORM_PAYMENT",
  "HARASSMENT",
  "IMPERSONATION",
  "OTHER",
];

export const blockSchema = z.object({ userId: z.string().uuid() });

export const muteSchema = z.object({
  targetKind: z.enum(["USER", "POST", "AREA"]),
  targetId: z.string().uuid(),
});

/* ------------------------------------------------------------------ *
 * Copy, in one place, so a page and a toast cannot drift apart.
 * ------------------------------------------------------------------ */

export const POST_COPY = {
  held:
    "This mentions something we check by hand. Somebody is reading it before it goes up, and only you can see it until then.",
  removed: "This post was removed.",
  removedWithReplies:
    "This post was removed. The replies under it are still here.",
  emptyFeed:
    "Nothing has been said here yet. What you say will be the first thing anybody arriving reads.",
  emptyFeedSignedOut: "Nothing has been said here yet.",
  endOfSession: "That is everything for today.",
  blockedDone:
    "Blocked. You will not see each other anywhere on RentMe, and they are not told.",
  mutedDone: "Muted. You will not see their posts. They are not told.",
  reportedDone:
    "Thank you. Somebody will look at this. We do not tell them who reported it.",
  copied: "Link copied.",
  deleteConfirm:
    "Delete this post? Replies under it stay, with a note where it was.",
} as const;

export const POST_FAILURE = {
  down: "We could not do that just now. Please try again in a moment.",
  gone: "That post is no longer there.",
  notInArea: "Join this place before you post in it.",
  tooDeep:
    "This thread is as deep as it goes. Reply higher up so people can follow it.",
  editWindowClosed:
    "The fifteen minutes for editing has passed. You can delete it and post again.",
  signedOutLike: "Sign in to like this.",
} as const;

/**
 * Rate limits. The numbers are argued in docs/SOCIAL_DESIGN.md section 8.4, and
 * the limiter is the durable Postgres one, which fails open by design, so these
 * price abuse rather than wall it off.
 */
export const POST_LIMITS = {
  post: { bucket: "social:post", limit: 5, windowSeconds: 3600 },
  postDaily: { bucket: "social:post-day", limit: 20, windowSeconds: 86_400 },
  reply: { bucket: "social:reply", limit: 10, windowSeconds: 300 },
  mark: { bucket: "social:mark", limit: 200, windowSeconds: 86_400 },
  repost: { bucket: "social:repost", limit: 30, windowSeconds: 86_400 },
  report: { bucket: "social:report", limit: 20, windowSeconds: 86_400 },
  block: { bucket: "social:block", limit: 50, windowSeconds: 86_400 },
} as const;
