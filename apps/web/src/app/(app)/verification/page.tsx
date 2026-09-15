import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentContext } from "@/lib/agent/listings-queries";
import { getOwnLadder } from "@/lib/agent/verification-queries";
import { PageHeader } from "@/components/app/PageHeader";
import { KycFlow } from "@/components/verification/KycFlow";
import { KycStatus, type KycStatusView } from "@/components/verification/KycStatus";
import { submitVerification } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.nav.verification, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * /verification: prove who you are.
 *
 * ONE ROUTE FOR BOTH ROLES. A landlord listing their own flat and an agency
 * running a book of properties are asked for the same identity documents and
 * differ only in whether the business step appears, which the flow already
 * branches on. Two routes would be two flows to keep in step.
 *
 * THIS SCREEN NEVER SHOWS ITSELF TO A RENTER, because nothing links a renter
 * here and nothing ever should. Verification is required for sellers and agents
 * only; browsing, saving, messaging and renting are not behind it and must not
 * become so. A renter who types the address gets the flow rather than a
 * refusal, which is the right failure mode for a page whose whole job is to
 * accept documents from somebody who wants to be checked.
 *
 * WHAT IT SHOWS DEPENDS ON WHERE THEY ALREADY ARE. Somebody with a decision
 * against them sees the decision, and a rejection carries the reviewer's own
 * words plus what to do about it. Somebody with nothing on file sees the flow.
 *
 * The status is read from `agent_verification_checks` through the person's own
 * RLS-bound client, which has carried a select-own policy since it was created.
 * The tier is `agents.verification_tier`, computed by `private.agent_tier`, and
 * is not recomputed here: a second implementation would eventually disagree
 * with the badge on the agent's own listings.
 */
export default async function VerificationPage() {
  const context = await getAgentContext();
  const ladder = await getOwnLadder(context);

  /*
   * Which of the three status surfaces applies, if any.
   *
   * A FAILED RUNG WINS over a pending one. Somebody with one rejected document
   * and three still in the queue needs to know about the rejected one today;
   * telling them "in review" would have them waiting on a decision that has
   * already been made against them.
   */
  let status: KycStatusView | null = null;
  if (ladder.state === "ok") {
    const failed = Object.values(ladder.ladder.rungs).find((rung) => rung.status === "failed");
    if (failed) {
      status = {
        state: "rejected",
        /* The reviewer's own words, in full. A rung recorded without a note is
           the one case this cannot fill in, and it says so plainly rather than
           inventing a reason nobody wrote. */
        reason:
          failed.note ??
          "The reviewer did not record a reason. Send the documents again and our team will look at them within one working day.",
        fix: "Replace the document that was refused and send it again. Everything you have already had approved stays approved.",
      };
    } else if (ladder.ladder.tier > 0) {
      status = { state: "approved" };
    } else if (
      context.state === "agent" &&
      /* The three application states that mean "a person is looking at this".
         Spelled from `agent_application_status` rather than guessed: DRAFT and
         MORE_INFO_REQUIRED are deliberately NOT here, because in both of those
         the ball is with the applicant and telling them to wait would be wrong. */
      (context.agent.status === "SUBMITTED" || context.agent.status === "UNDER_REVIEW")
    ) {
      status = { state: "pending" };
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {status ? (
        <>
          <PageHeader title="Verification" />
          <KycStatus status={status} />
        </>
      ) : (
        <KycFlow submit={submitVerification} />
      )}
    </div>
  );
}
