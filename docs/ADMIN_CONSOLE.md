# The Vallo admin console: the operations handbook

This is the document a new operations person reads on their first day and can
then run the platform from. Every desk is here: what it shows, where each number
comes from, what each action does, who may take it, what it changes, and what the
desk cannot do. The last part records the options that were considered and
rejected, with the reasons.

Owned by Session B (`docs/SESSION_B_SCOPE.md`). The queries and actions behind
the desks live in `apps/web/src/lib/admin/**`, which the other session owns;
where a desk needs something that layer does not return yet, the gap is named
here and raised as a request in the scope file.

## 1. Before you start

(admin-shell: who can enter the console, how access is checked, roles, what an
operator sees on entry, how to read a panel, the status colours and words, what
"no data yet" means on a chart and why the console never draws a number the
database did not return)

## 2. The shell

(admin-shell: navigation, the platform pulse strip, search, notifications bell,
identity block, keyboard use, narrow screens)

## 3. Overview

(admin-shell)

## 4. Listings: the review queue and the single listing under review

(admin-review)

## 5. Moderation

(admin-review)

## 6. Verification

(admin-review: every verification rung)

## 7. Support

(admin-review)

## 8. Money

(admin-money: every money path)

## 9. Escrow

(admin-money)

## 10. Supply

(admin-money: every supply role)

## 11. Bookings

(admin-money)

## 12. Payments

(admin-money)

## 13. Operations: scheduled jobs, alerts, audit log, notifications

(admin-shell: every scheduled job, every alert, every notification the platform sends)

## 14. Analytics

(admin-shell)

## 15. The other desks

(admin-shell: agents, businesses, examples, fees, flags, reference, reports,
social, standing, stops, switches, and anything else under `app/admin`)

## 16. Everyday procedures

(each worker adds the step by step runbooks for its desks: approving a listing,
asking for more, rejecting, deciding a report, passing or failing a
verification, releasing or refunding an escrow, investigating a failed charge,
reading a reconciliation failure)

## 17. What the console cannot do, and the open requests

(each worker: honest limits, and the scope-file request numbers for data the
console needs and does not have yet)

## 18. Options considered and rejected

(each worker: the alternatives weighed for its desks and why they lost; charting
approach and palette decisions from `docs/research/UI_UNIQUENESS_AND_ADMIN_RESEARCH.md`
part four belong here)
