/**
 * The `reports.target_type` each social report files under (B-7a).
 *
 * LOWER CASE, LIKE EVERY OTHER KIND. The report front door, the "I feel
 * unsafe" path, the admin queue, the reporter's own list (`myReports.target`)
 * and the database's `private.notify_report()` all spell kinds in lower case:
 * `listing`, `message`, `user`, `post`. The social actions wrote `POST`,
 * `STORY_COMMENT` and `SOCIAL_PROFILE`, so the notify trigger's
 * `case new.target_type when 'post'` never matched and a reporter's "Report
 * received" notification linked to `/notifications` instead of the post, and
 * the reporter's own list said "Something on Vallo" instead of "A post".
 *
 * The link goes to the post's own page, which renders the same not found for
 * a post that was removed, is held, or is behind a block (see
 * `app/(app)/post/[id]/page.tsx`), so a reporter learns nothing about a
 * removed post beyond what anybody opening its address would.
 *
 * Rows filed before this change keep their upper-case kind; the migration
 * `20260929120000_b7_report_links_and_own_story_comment_removal.sql` (NOT
 * applied, awaiting approval) lower-cases them and teaches the trigger the two
 * kinds it did not know.
 */
export const SOCIAL_REPORT_KIND = {
  post: "post",
  storyComment: "story_comment",
  profile: "social_profile",
} as const;

export type SocialReportKind = (typeof SOCIAL_REPORT_KIND)[keyof typeof SOCIAL_REPORT_KIND];
