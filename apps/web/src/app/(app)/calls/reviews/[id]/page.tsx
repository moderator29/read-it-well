import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { reviewCallsOn } from "@/lib/calls/flags";
import { myReviewCalls } from "@/lib/calls/review-actions";
import { SubjectReviewCard } from "@/components/calls/SubjectReviewCard";
import "@/app/css/calls.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.calls.review.listTitle, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * /calls/reviews/[id]: a review call invitation, for the person the case is
 * about. Their reduced view only (`my_call_reviews`): no notes, evidence,
 * scope or staff identity. A ringing call's push carries `?call=`, which the
 * shell's call layer resolves; this page also offers Join while one is live.
 * An id that is not theirs reads exactly like one that does not exist.
 */
export default async function ReviewInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getDictionary(await getLocale());
  const c = t.calls;
  const on = await reviewCallsOn();
  const reviews = on ? await myReviewCalls() : null;
  const review = reviews?.ok ? reviews.data.find((r) => r.id === id) ?? null : null;

  return (
    <div className="mx-auto grid max-w-2xl gap-md px-gutter">
      <PageHeader title={c.review.listTitle} fallback="/calls/reviews" />
      {!on ? (
        <Calm title={c.notAvailable.reviewTitle} body={c.notAvailable.reviewBody} />
      ) : !review ? (
        <Calm title={c.staff.missingTitle} body={c.recovery.goneBody} />
      ) : (
        <SubjectReviewCard review={review} copy={c} />
      )}
    </div>
  );
}

function Calm({ title, body }: { title: string; body: string }) {
  return (
    <div className="nf-review-call__card text-center" data-testid="review-calm">
      <p className="font-semibold">{title}</p>
      <p className="nf-call__note mx-auto">{body}</p>
    </div>
  );
}
