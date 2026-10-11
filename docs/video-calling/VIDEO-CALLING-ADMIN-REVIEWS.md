# Video calling: admin review calls

Stage two of the brief, on the same infrastructure as Messages calls. An
authorised staff member asks the person a case is about (an agent applicant,
a business owner, a person under an identity check, a listing's lister, a
person with a support request) for a video or voice call; the person accepts,
declines or proposes another time; the call happens inside Vallo; staff record
attendance, notes, evidence references and an outcome.

**A review call verifies nothing by itself.** Seeing someone on video is not
proof of identity, ownership, licensing or authenticity. The outcome feeds the
existing verification workflow the case belongs to; it does not replace it,
and nothing in VC1 changes a verification, a badge or a listing status.

## Reuse, not a second case system

| Case kind | The existing record | Subject (read from the record, never typed) | Scope |
|---|---|---|---|
| `agent_application` | `agent_applications` | `user_id` | `kyc_review` |
| `business_verification` | `businesses` | `owner_id` | `kyc_review` |
| `identity_verification` | `identity_verifications` | `subject_id` | `kyc_review` |
| `listing` | `listings` (via `agents`) | the lister's `user_id` | `listing_approval` |
| `support_ticket` | `support_tickets` | `user_id` | `support` |

Reports (`reports`) are not a case kind yet: the "subject" of a report is
ambiguous (reporter or reported), see the open questions. One open review per
case at a time (unique index).

## Permissions

Least privilege, no "any staff can call anyone":

- Request, reschedule, start, note, complete, cancel: `private.staff_can(me,
  scope)` for the case's scope, which requires the console's security-key
  proof for this session (admins and super admins hold every scope). Checked
  again at every join token.
- Reading reviews and entries: the same scope, through RLS.
- The subject: their own reduced view only (`my_call_reviews`): purpose, case
  words, status, times, "Vallo review team". Never notes, evidence, scope,
  outcome reasoning or the staff member's identity.
- Staff cannot request a review of their own case.
- Every step writes `audit_log` (actor, action, review, time, reason).

## Lifecycle of a review

| Status | Means | Next |
|---|---|---|
| REQUESTED | asked, no time set | ACCEPTED, DECLINED, RESCHEDULE_REQUESTED (subject); SCHEDULED (staff); CANCELLED; EXPIRED after 72 h |
| SCHEDULED | a time is set (5 min to 30 days ahead) | ACCEPTED, DECLINED, RESCHEDULE_REQUESTED; IN_CALL when started from 10 min before to 30 min after; EXPIRED after |
| RESCHEDULE_REQUESTED | the subject proposed `proposed_for` | SCHEDULED (staff), CANCELLED, EXPIRED |
| ACCEPTED | the subject said yes (or a call ended without an outcome) | IN_CALL, SCHEDULED, COMPLETED, CANCELLED |
| DECLINED | the subject said no | SCHEDULED, COMPLETED (for example NO_SHOW or MORE_INFORMATION_REQUIRED), CANCELLED |
| IN_CALL | a review call is ringing or live | back to ACCEPTED when the call ends; COMPLETED |
| EXPIRED | nobody answered in time | COMPLETED (NO_SHOW), SCHEDULED, CANCELLED |
| COMPLETED | an outcome is recorded | closed |
| CANCELLED | staff cancelled, with a reason | closed |

**An unanswered request is not consent to be rung**: a call can only be
started when the subject accepted, or at a time they were told about.

## Outcomes

`REVIEW_COMPLETED`, `MORE_INFORMATION_REQUIRED`, `FOLLOW_UP_REQUIRED` (needs a
due date), `ESCALATED`, `NO_SHOW` (through `completeReviewCall`, with a summary)
and `CANCELLED` (through `cancelReviewCall`, with a reason). The subject is
told plainly for the first three; ESCALATED and NO_SHOW write nothing to the
subject.

## Notes, evidence, attendance

`call_review_entries`, append-only:

- `NOTE`: staff's own words.
- `EVIDENCE`: a typed reference to a record that already exists
  (`kyc_document:<uuid>`, `listing:<uuid>`), never an uploaded file.
- `CORRECTION`: points at the entry it corrects; history is never edited.
- `ATTENDANCE`: written by the system when the subject answers and when each
  call ends (state, whether the subject joined, connected seconds).
- `OUTCOME`: the summary that closed the review.

## The staff desk (for the frontend)

A review list per scope (`call_reviews` under RLS) with the case link, status,
time and outcome; a review page with the subject's case summary (only what
the existing desk for that case already shows this staff member), the
invitation state, start button when `reviewActions().canStart`, the call
screen (same component as Messages, role REVIEWER), the notes stream and the
outcome form. The subject's page lives at `/calls/reviews/<id>`; the staff
page at `/admin/review-calls/<id>` (notification links already point there).
