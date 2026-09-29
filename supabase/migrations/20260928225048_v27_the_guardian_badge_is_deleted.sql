/*
 * V-27. THE GUARDIAN BADGE IS DELETED.
 *
 * `guardian` ("Three reports upheld by a moderator") was awarded by
 * `private.award_report_badges`, an AFTER UPDATE trigger on `public.reports`,
 * and shown on the member's profile like any other badge.
 *
 * WHY IT GOES. The report sheet promises "The person you report is never told
 * who reported them". A public badge that says "this member's reports get
 * people removed" tells everybody in a small estate, or in a Place in Around,
 * who does the reporting, which is the first thing somebody who has just been
 * reported wants to know. It also rewards reporting volume, which invites
 * malicious reports between rival agents. A reporter's record is a moderation
 * input, not a public ornament.
 *
 * WHAT IS KEPT. Nothing is lost for triage: the count of a reporter's upheld
 * reports is `count(*) from public.reports where reporter_id = ? and status =
 * 'resolved'`, which the queue can read whenever it wants to weight a report
 * (V-89). The trigger only ever copied that count into a public badge.
 *
 * WHAT HAPPENS TO ANYBODY WHO HOLDS IT. Measured on 24 September 2026: nobody
 * does (`user_badges` has zero `guardian` rows). The rows are still dealt with
 * rather than assumed away. `user_badges.badge_code` references
 * `badges(code) ON DELETE CASCADE`, so deleting the definition removes every
 * held row with it; they are marked revoked first, with the reason, in the
 * same transaction, so that anything replicating `user_badges` sees a revoke
 * and not an unexplained disappearance.
 *
 * Order matters: the trigger goes first, so no report resolved while this runs
 * can award the badge between the delete and the drop.
 */

begin;

drop trigger if exists reports_award_badges_after_update on public.reports;
drop function if exists private.award_report_badges();

update public.user_badges
   set revoked_at = coalesce(revoked_at, now()),
       reason = 'The Guardian badge was retired: a public mark of who reports others broke the promise that reporters are never named (V-27).'
 where badge_code = 'guardian';

delete from public.badges where code = 'guardian';

commit;
