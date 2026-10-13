/**
 * WHERE MY OWN PROFILE LIVES (the founder, 13 October 2026): `/profile`, the
 * page that wears my own identity (cover, counts, posts, belongings, Edit).
 *
 * `/u/<handle>` is how everybody else reaches a person, and the page redirects
 * the owner here (`app/(app)/u/[handle]/page.tsx`), which is the one mechanism
 * that covers every surface that links to a person: feed posts, stories,
 * replies, comments, people lists, chat, a listing's lister card, a shared
 * link opened by its own owner. No call site decides who the reader is.
 */
export const OWN_PROFILE_HREF = "/profile";
