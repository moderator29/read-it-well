/**
 * The two tab sets, and which one a person gets.
 *
 * **This is a plain module on purpose, and the reason is a real crash.** These
 * constants used to live in `ProfileTabs.tsx`, which carries `"use client"`.
 * A server component importing a non-function value from a client module does
 * not get the value: it gets a client reference proxy, so `MEMBER_TABS.includes`
 * was not a function and `/u/[handle]?tab=replies` answered 200 with an empty
 * shell and a `TypeError` in the log. It typechecks perfectly.
 *
 * That is the mirror image of the trap already written down in the handover,
 * where a client component importing from a server-only module typechecks and
 * fails the build. Same rule, both directions: shared constants live in a
 * module that belongs to neither side.
 */

export type TabKey =
  | "posts"
  | "replies"
  | "media"
  | "activity"
  | "properties"
  | "stories"
  | "reviews";

/** Somebody renting. Never offered a Properties tab. */
export const MEMBER_TABS: TabKey[] = ["posts", "replies", "media", "activity"];

/**
 * An agent whose listings can actually be resolved.
 *
 * What a stranger wants from an agent's page is the flats, the writing, and
 * what other guests said, in that order.
 */
export const AGENT_TABS: TabKey[] = ["properties", "stories", "reviews", "activity"];

export const ALL_TABS: TabKey[] = [
  "posts",
  "replies",
  "media",
  "activity",
  "properties",
  "stories",
  "reviews",
];

export const TAB_LABEL: Record<TabKey, string> = {
  posts: "Posts",
  replies: "Replies",
  media: "Media",
  activity: "Activity",
  properties: "Properties",
  stories: "Stories",
  reviews: "Reviews",
};
