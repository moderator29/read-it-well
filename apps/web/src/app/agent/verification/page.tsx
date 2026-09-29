import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { getOwnLadder, type OwnLadder } from "@/lib/agent/verification-queries";
import { ListingPitch } from "../list/ListingPitch";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
import { SuccessFromFlag } from "@/components/ui/SuccessFromFlag";
import { approvedRecently } from "@/lib/ui/recent-approval";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  nextRung,
  TIER_NAME,
  VERIFICATION_ORDER,
  type VerificationTier,
} from "@/lib/trust/verification";

/**
 * /agent/verification: where this agent stands, and what the next rung wants.
 *
 * This was an `AgentComingSoon` stub, and the gap it left was not cosmetic. The
 * ladder behind it has existed and worked for a while: four rungs in
 * `agent_verification_checks`, a tier derived by `private.agent_tier`, and an
 * admin console that awards them. What did not exist was any way for the person
 * being judged to see the judgement. A host climbing the one ladder that decides
 * how much of the platform they can use had to be told over the phone, and a
 * host whose rung was FAILED had no way at all to learn why.
 *
 * Three things this page will not do, each of which was the tempting version:
 *
 * 1. **It does not invent a submission flow.** There is no "upload your ID
 *    here" control, because nothing behind this page accepts one: the evidence
 *    for every rung already arrived with the application, and a rung is a
 *    decision a member of staff records after looking at it. A button that
 *    posted a document nowhere would be a worse lie than silence.
 * 2. **It does not recompute the tier.** `private.agent_tier` owns that, gaps
 *    and all, and a second implementation here would eventually disagree with
 *    the badge on the agent's own listings.
 * 3. **It does not soften a failure.** A failed rung says failed, in the same
 *    weight as a passed one, with the reviewer's note in full underneath.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.nav.verification, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * The ladder itself.
 *
 * Every rung is drawn, including the ones nobody has looked at, because the
 * question this page answers is "what is left" as much as "what is done". A
 * list that showed only decided rungs would leave an agent on tier 1 looking at
 * a single line with no idea that three more exist.
 */
export function Ladder({ ladder }: { ladder: OwnLadder }) {
  return (
    <ol className="mt-lg flex flex-col gap-sm">
      {VERIFICATION_ORDER.map((rung) => {
        const decision = ladder.rungs[rung.kind];
        const reached = ladder.tier >= rung.step;
        const failed = decision?.status === "failed";

        return (
          <li key={rung.kind} className="nf-panel nf-panel--card block p-md sm:p-panel">
            <div className="flex flex-wrap items-center gap-xs">
              <span className="text-[length:var(--nf-text-overline)] font-semibold tabular-nums text-[var(--nf-content-muted)]">
                {rung.step}
              </span>
              <span className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
                {rung.label}
              </span>
              {/* Three states, and the third is the honest one that a two-state
                  badge would have to lie about: not yet looked at is not the
                  same as failed, and telling an agent otherwise would have them
                  ringing support about a rung nobody has reached. */}
              {decision ? (
                <StatusPill tone={failed ? "danger" : "success"}>
                  {failed ? "Not passed" : "Passed"}
                </StatusPill>
              ) : (
                <StatusPill tone="neutral">Not checked yet</StatusPill>
              )}
            </div>

            <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              {rung.meaning}
            </p>

            {/* Named concretely so a host can go and get it, which is the whole
                point of publishing the ladder rather than describing it. */}
            <p className="mt-xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
              <span className="font-semibold">What we look at:</span> {rung.evidence}
            </p>

            {/* The most useful thing on the page. A failed rung with a reason is
                something a host can act on this afternoon; without one it is a
                locked door. */}
            {decision?.note && (
              <p
                className={`mt-sm rounded-[var(--nf-container-radius)] px-sm py-xs text-[length:var(--nf-text-caption)] leading-relaxed ${
                  failed
                    ? "bg-[var(--nf-state-error-surface)] text-[var(--nf-content-primary)]"
                    : "bg-[var(--nf-surface-raised)] text-[var(--nf-content-secondary)]"
                }`}
              >
                {decision.note}
              </p>
            )}

            {!decision && reached && (
              /* Tier says this rung is behind them but no row records it. That
                 is a real state: the tier is recomputed by trigger and a row can
                 be removed. Said plainly rather than papered over. */
              <p className="mt-xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
                Counted towards your standing, with no decision recorded against
                it.
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Standing({ tier }: { tier: VerificationTier }) {
  const next = nextRung(tier);
  return (
    <div className="nf-panel nf-panel--card block p-panel">
      <p className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
        Your standing
      </p>
      <p className="mt-2xs text-[length:var(--nf-text-h3)] font-bold leading-tight text-[var(--nf-content-primary)]">
        {TIER_NAME[tier]}
      </p>
      <p className="mt-2xs text-[length:var(--nf-text-caption)] tabular-nums text-[var(--nf-content-muted)]">
        {tier} of {VERIFICATION_ORDER.length} checks passed
      </p>

      {/*
        THE SENTENCE IS NOT SPLICED OUT OF THE REVIEWER'S WORDS ANY MORE.

        It read "Next up is bank account in their own name. The payout account
        resolved through the payment processor, with the returned account name
        matching the identity on file." Both halves come from
        `lib/trust/verification.ts`, which is written for the member of staff
        making the decision: it says "this agent", "they" and "them" about the
        very person reading this page. Lower-casing a label into the middle of
        a second-person sentence made it worse. The rung's own card below
        carries the reviewer's words under "What we look at", where third
        person is correct because it is quoting the check.
      */}
      <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
        {next
          ? `Next on the ladder: ${next.label}. What that check looks at is on its card below.`
          : "Every check on the ladder is passed. There is nothing further to send."}
      </p>

      {/* No upload control, on purpose. Nothing behind this page accepts a
          document: the evidence arrived with the application and a rung is a
          decision somebody records after reading it. Messaging support is the
          real next step, so it is the one offered. */}
      {next && (
        <ButtonLink href="/support" variant="secondary" full className="mt-md">
          Ask about this check
        </ButtonLink>
      )}
    </div>
  );
}

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/verification" profile={null}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/verification" profile={null}>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name="shield-check" fill />
          </span>
          <h1 className="nf-h2 mt-5">{t.agent.nav.verification}</h1>
          <p className="mx-auto mt-sm max-w-[42ch] text-[var(--nf-content-secondary)]">
            {t.agentBookings.unconfigured}
          </p>
        </div>
      </AgentShell>
    );
  }

  const read = await getOwnLadder(context);

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/verification"
      profile={agentProfileFrom(context.agent)}
    >
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agent.nav.verification}</h1>
        <p className="mt-2xs max-w-[60ch] text-[var(--nf-content-secondary)]">
          Four checks, in order. Each one you pass is shown to guests on every
          listing you have, and none of them is a fee.
        </p>
      </div>

      {read.state === "unavailable" ? (
        /* An honest absence rather than an empty ladder. Drawing four "not
           checked yet" rungs from a failed read would tell an agent who has
           passed three that they have passed none. */
        <p className="nf-panel nf-panel--card block p-panel text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
          Your checks could not be loaded just now. Nothing has changed, and
          reloading usually settles it.
        </p>
      ) : (
        <div className="grid gap-lg lg:grid-cols-[1fr_20rem]">
          <div className="lg:order-2">
            <Standing tier={read.ladder.tier} />
          </div>
          {/* Where the reviewer's decision notice lands. The same key as
              /verification, so a level is celebrated once on this device
              whichever door it is seen through (docs/SUCCESS_MOMENTS.md). */}
          <SuccessFromFlag
            show={read.ladder.tier > 0 && approvedRecently(Object.values(read.ladder.rungs), requestNow())}
            moment="verificationApproved"
            seenKey={`verification-approved:tier-${read.ladder.tier}`}
            haptic={false}
          />
          <div className="lg:order-1">
            <Ladder ladder={read.ladder} />
          </div>
        </div>
      )}
    </AgentShell>
  );
}

/** The request's clock, read once, so the page agrees with itself. */
function requestNow(): number {
  return Date.now();
}
