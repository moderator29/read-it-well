import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { reviewCallsOn } from "@/lib/calls/flags";
import type { ReviewCaseKind } from "@/lib/calls/types";
import { RequestReviewCall } from "./RequestReviewCall";

/**
 * The "Request a review call" action on an existing case desk (an agent
 * application, a business, a listing, a support request). A server
 * component: it draws nothing while either switch (`video_calls`,
 * `admin_review_calls`) is off, and the database still decides whether
 * THIS staff member may ask about THIS case.
 */
export async function ReviewCallAction({ caseKind, caseId }: { caseKind: ReviewCaseKind; caseId: string }) {
  if (!(await reviewCallsOn())) return null;
  const t = getDictionary(await getLocale());
  return (
    <div className="mt-sm" data-testid="review-call-action">
      <RequestReviewCall caseKind={caseKind} caseId={caseId} copy={t.calls} />
    </div>
  );
}
