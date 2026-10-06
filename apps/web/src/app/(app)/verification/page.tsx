import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentContext } from "@/lib/agent/listings-queries";
import { getOwnLadder } from "@/lib/agent/verification-queries";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { KycFlow } from "@/components/verification/KycFlow";
import { VerificationPath } from "@/components/verification/VerificationPath";
import { buildPath } from "@/components/verification/verification-path";
import { SuccessFromFlag } from "@/components/ui/SuccessFromFlag";
import { approvedRecently } from "@/lib/ui/recent-approval";
import { VninPanel } from "@/components/verification/VninPanel";
import { PepQuestionPanel } from "@/components/compliance/PepQuestionPanel";
import { vninIdentityOn } from "@/lib/identity/flag";
import {
  KycStatus,
  type KycStatusView,
} from "@/components/verification/KycStatus";
import { resolveSession } from "@/lib/actions/session";
import { submitVerification } from "./actions";

/**
 * Where the caller's own filed identity and address documents stand: the
 * newest of each kind, read through their RLS-bound client. This is what a
 * person who is not (yet) an agent has instead of a ladder, and it is also
 * the only place a rejection shows: `private.review_kyc_document` records a
 * refused document's rung as pending, never failed, so the ladder alone
 * would leave a rejected applicant looking at "in review" for ever.
 */
async function ownDocumentState(): Promise<
  { state: "none" } | { state: "pending" } | { state: "rejected"; reason: string | null } | { state: "approved" }
> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "none" };
  const { data, error } = await session.supabase
    .from("agent_documents")
    .select("kind, review_status, rejection_reason, uploaded_at")
    .eq("uploader_id", session.user.id)
    .in("kind", ["identity", "address"])
    .order("uploaded_at", { ascending: false })
    .limit(20);
  if (error || !data || data.length === 0) return { state: "none" };
  const latest = new Map<string, { review_status: string; rejection_reason: string | null }>();
  for (const row of data as { kind: string; review_status: string; rejection_reason: string | null }[]) {
    if (!latest.has(row.kind)) latest.set(row.kind, row);
  }
  const rows = [...latest.values()];
  const rejected = rows.find((row) => row.review_status === "rejected");
  if (rejected) return { state: "rejected", reason: rejected.rejection_reason };
  if (rows.some((row) => row.review_status === "pending")) return { state: "pending" };
  return latest.size >= 2 ? { state: "approved" } : { state: "pending" };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return {
    title: t.agent.nav.verification,
    robots: { index: false, follow: false },
  };
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
export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ resubmit?: string | string[] }>;
}) {
  const locale = await getLocale();
  const context = await getAgentContext();
  /* V-49: the vNIN route, only when its flag is on and Vallo's NIMC merchant
     code is configured. Otherwise nothing is drawn and the photo route is the
     only one, exactly as before. */
  const merchantCode = process.env.VALLO_NIMC_MERCHANT_CODE?.trim() ?? "";
  const vnin =
    merchantCode !== "" && (await vninIdentityOn()) ? (
      <VninPanel
        copy={getDictionary(locale).trustVisible.vnin}
        success={getDictionary(locale).success}
        merchantCode={merchantCode}
      />
    ) : null;
  const [ladder, documents] = await Promise.all([getOwnLadder(context), ownDocumentState()]);
  /* THE PATH (W6, reference 7110): four rungs, each naming what is actually
     checked, built only from the reviewers' own decisions and the documents'
     own review state. See `components/verification/verification-path.ts`. */
  const t = getDictionary(locale);
  /* `getOwnLadder` answers "unavailable" both for somebody who is not an agent
     (no ladder exists, which is true and draws the path from their documents)
     and for an agent whose read failed (a ladder exists and could not be read).
     Told apart here by the context: for an agent the read failed, and drawing
     "0 of 4 steps passed" would tell an approved agent they had passed nothing.
     So on a failed read no path is drawn, only a quiet line saying so (auditor
     A2, 6 October 2026). */
  const ladderReadFailed = context.state === "agent" && ladder.state === "unavailable";
  const path = ladderReadFailed ? (
    <p
      role="status"
      className="text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]"
      data-testid="verification-path-unreadable"
    >
      {t.experienceAccount.verification.unreadable}
    </p>
  ) : (
    <VerificationPath
      rungs={buildPath({
        ladder: ladder.state === "ok" ? { rungs: ladder.ladder.rungs } : null,
        documents,
      })}
      copy={t.experienceAccount.verification}
      locale={locale}
    />
  );
  /* SCUML item 20: the PEP question, for listers only (the panel draws
     nothing for anybody without an agents row). */
  const pep = <PepQuestionPanel askedAt="verification" />;
  const params = await searchParams;
  const asked = Array.isArray(params.resubmit)
    ? params.resubmit[0]
    : params.resubmit;

  /*
   * Which status surface applies, if any.
   *
   * A FAILED RUNG WINS over a pending one. Somebody with one rejected document
   * and three still in the queue needs to know about the rejected one today;
   * telling them "in review" would have them waiting on a decision that has
   * already been made against them.
   */
  let status: KycStatusView | null = null;
  if (ladder.state === "ok") {
    const failed = Object.values(ladder.ladder.rungs).find(
      (rung) => rung.status === "failed"
    );
    const agentStatus = context.state === "agent" ? context.agent.status : null;

    if (agentStatus === "SUSPENDED") {
      /* A SUSPENSION OUTRANKS EVERYTHING BELOW IT, including a failed rung.
         A stopped account cannot be fixed by replacing a document, so showing
         the rejection first would send somebody through a whole resubmission
         that could not have worked. */
      status = {
        state: "suspended",
        reason:
          failed?.note ??
          "Our team stopped this account. The reason was not recorded here, so they will have to tell you what it was.",
      };
    } else if (failed) {
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
    } else if (agentStatus === "MORE_INFO_REQUIRED") {
      /*
       * THE ONE STATE THAT REQUIRES THE APPLICANT, AND IT HAD NO SCREEN.
       *
       * This branch used to fall through to `status = null`, which dropped
       * somebody into a blank `KycFlow` with nothing saying what had been asked
       * for. It is checked BEFORE the tier, because a tier above zero and a
       * request outstanding can both be true: an agent can be verified on one
       * rung and still be blocked on another, and the outstanding request is
       * the news.
       *
       * The request is the reviewer's own note where the ladder carries one.
       * There is no other in-scope source: the application's own review note
       * would have to come through `lib/agent/verification-queries.ts`, which
       * belongs to another owner. Where there is no note the copy says so
       * rather than inventing a request nobody made, and sends them to a
       * person, which is the same discipline the rejection already uses.
       */
      const asking = Object.values(ladder.ladder.rungs).find(
        (rung) => rung.note
      );
      status = {
        state: "more_info",
        request:
          asking?.note ??
          "A reviewer has asked for something more before they can finish checking this account. What they asked for was not recorded here, so our team will have to tell you.",
        fix: "Send the document again through the steps below. Anything already approved stays approved.",
      };
    } else if (ladder.ladder.tier > 0) {
      status = { state: "approved" };
    } else if (
      /* The application states that mean "a person is looking at this".
         Spelled from `agent_application_status` rather than guessed: DRAFT is
         deliberately not here, because the ball is with the applicant and
         telling them to wait would be wrong. */
      agentStatus === "SUBMITTED" ||
      agentStatus === "UNDER_REVIEW"
    ) {
      status = { state: "pending" };
    }
  }

  /*
   * THE DOCUMENTS THEMSELVES, WHERE THE LADDER SAYS NOTHING OR ONLY "WAITING".
   *
   * A rejected document outranks "in review" for the same reason a failed
   * rung does: the decision has been made and the person can act on it
   * today. A suspension, a failed rung and a reviewer's request are left as
   * they were. A person with documents in the queue and no agents row used to
   * be shown an empty form again after sending, as if nothing had arrived.
   */
  if (documents.state === "rejected" && (status === null || status.state === "pending" || status.state === "approved")) {
    status = {
      state: "rejected",
      reason:
        documents.reason ??
        "The reviewer did not record a reason. Send the documents again and our team will look at them within one working day.",
      fix: "Replace the document that was refused and send it again. Everything you have already had approved stays approved.",
    };
  } else if (status === null && documents.state === "pending") {
    status = { state: "pending" };
  }

  /*
   * `?resubmit=1` IS HONOURED ONLY WHERE THE APPLICANT CAN ACT.
   *
   * The rejection's one action pointed at `/verification`, and this page
   * renders `KycStatus` whenever a rung has failed, so the recovery link landed
   * on the screen it was recovering from. It was a loop.
   *
   * It is honoured on `rejected` and `more_info` and nowhere else. An approved
   * agent pasting the link does not get dropped back into an identity flow, and
   * a suspended one does not get a form that cannot lift a suspension.
   */
  const resubmitting =
    asked === "1" &&
    (status?.state === "rejected" || status?.state === "more_info");
  const whatWasSaid =
    status?.state === "rejected"
      ? status.reason
      : status?.state === "more_info"
      ? status.request
      : null;

  if (resubmitting) {
    return (
      <div className="mx-auto max-w-2xl">
        {/* The register's brand object behind the first line. The shield is
            the object this screen is about, and it is the same anchor the
            rest of the own-data screens open on. A2. */}
        <div className="relative">
          <PageScene art="shield-check" />
          {/* THE FALLBACK USED TO BE `/verification`, which is this screen.
              It is inert while the route is declared in
              `lib/nav/route-parents.ts`, and it was a loop waiting for the day
              the entry was removed: a back control whose fallback is its own
              address presses into itself. `/profile` is the declared parent and
              is what this now repeats. */}
          <PageHeader title={t.agent.nav.verification} fallback="/profile" />
        </div>
        {/* The reviewer's words travel INTO the flow. Somebody re-photographing
            a document should not have to remember, from the screen before, which
            one was refused and why. */}
        {whatWasSaid && (
          <p className="nf-panel nf-panel--card mb-block block p-card text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            <span className="block font-semibold text-[var(--nf-content-primary)]">
              What the reviewer said
            </span>
            <span className="mt-inline-tight block">{whatWasSaid}</span>
          </p>
        )}
        {pep}
        {vnin}
        <KycFlow submit={submitVerification} success={getDictionary(locale).success} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {status ? (
        <>
          <div className="relative">
            <PageScene art="shield-check" />
            <PageHeader title={t.agent.nav.verification} />
          </div>
          <KycStatus status={status} locale={locale} />
          <div className="mt-block">{path}</div>
          {pep}
          {/* The approval is decided in the staff console and announced by
              the database, where no flag can ride on the link, so it opens
              from the status itself, once per device and once per level: a
              later rung is a new moment (docs/SUCCESS_MOMENTS.md). */}
          {status.state === "approved" &&
          ladder.state === "ok" &&
          approvedRecently(Object.values(ladder.ladder.rungs), requestNow()) ? (
            <SuccessFromFlag
              copy={getDictionary(locale).success}
              show
              moment="verificationApproved"
              seenKey={`verification-approved:tier-${ladder.ladder.tier}`}
              haptic={false}
            />
          ) : null}
        </>
      ) : (
        <>
          {/* THE BRANCH WITH NO WAY OUT, AND IT IS THE ONE MOST PEOPLE MEET.
              Two of this page's three states drew a header and the third drew
              none: somebody who has never sent a document, which includes every
              signed-out visitor, got the flow and nothing above it. Walked in
              Chromium at `/verification`, cold: no back control on the page at
              all. The header is the same one the other two branches draw, and
              the scene is not repeated here because there is no status object
              for it to sit behind. */}
          <PageHeader title={t.agent.nav.verification} fallback="/profile" />
          <div className="mb-block">{path}</div>
          {pep}
          {vnin}
          <KycFlow submit={submitVerification} success={getDictionary(locale).success} />
        </>
      )}
    </div>
  );
}

/** The request's clock, read once, so the page agrees with itself. */
function requestNow(): number {
  return Date.now();
}
