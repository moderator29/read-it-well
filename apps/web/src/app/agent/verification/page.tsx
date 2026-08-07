import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { getOwnLadder, type OwnLadder } from "@/lib/agent/verification-queries";
import { ListingPitch } from "../list/ListingPitch";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
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
function Ladder({ ladder }: { ladder: OwnLadder }) {
  return (
    <ol className="mt-6 flex flex-col gap-3">
      {VERIFICATION_ORDER.map((rung) => {
        const decision = ladder.rungs[rung.kind];
        const reached = ladder.tier >= rung.step;
        const failed = decision?.status === "failed";

        return (
          <li key={rung.kind} className="nf-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.75rem] font-semibold tabular-nums text-[var(--nf-content-muted)]">
                {rung.step}
              </span>
              <span className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">
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

            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {rung.meaning}
            </p>

            {/* Named concretely so a host can go and get it, which is the whole
                point of publishing the ladder rather than describing it. */}
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              <span className="font-semibold">What we look at:</span> {rung.evidence}
            </p>

            {/* The most useful thing on the page. A failed rung with a reason is
                something a host can act on this afternoon; without one it is a
                locked door. */}
            {decision?.note && (
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-[0.8125rem] leading-relaxed ${
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
              <p className="mt-2 text-[0.8125rem] text-[var(--nf-content-muted)]">
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

function Standing({ tier }: { tier: VerificationTier }) {
  const next = nextRung(tier);
  return (
    <div className="nf-card p-5">
      <p className="text-[0.8125rem] text-[var(--nf-content-secondary)]">
        Your standing
      </p>
      <p className="mt-1 text-[1.375rem] font-bold leading-tight text-[var(--nf-content-primary)]">
        {TIER_NAME[tier]}
      </p>
      <p className="mt-1 text-[0.8125rem] tabular-nums text-[var(--nf-content-muted)]">
        {tier} of {VERIFICATION_ORDER.length} checks passed
      </p>

      <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {next
          ? `Next up is ${next.label.toLowerCase()}. ${next.evidence}`
          : "Every check on the ladder is passed. There is nothing further to send."}
      </p>

      {/* No upload control, on purpose. Nothing behind this page accepts a
          document: the evidence arrived with the application and a rung is a
          decision somebody records after reading it. Messaging support is the
          real next step, so it is the one offered. */}
      {next && (
        <ButtonLink href="/support" variant="secondary" full className="mt-4">
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
          <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
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
      <div className="mb-6">
        <h1 className="nf-h1">{t.agent.nav.verification}</h1>
        <p className="mt-1 max-w-[60ch] text-[var(--nf-content-secondary)]">
          Four checks, in order. Each one you pass is shown to guests on every
          listing you have, and none of them is a fee.
        </p>
      </div>

      {read.state === "unavailable" ? (
        /* An honest absence rather than an empty ladder. Drawing four "not
           checked yet" rungs from a failed read would tell an agent who has
           passed three that they have passed none. */
        <p className="nf-card p-5 text-[0.875rem] text-[var(--nf-content-secondary)]">
          Your checks could not be loaded just now. Nothing has changed, and
          reloading usually settles it.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="lg:order-2">
            <Standing tier={read.ladder.tier} />
          </div>
          <div className="lg:order-1">
            <Ladder ladder={read.ladder} />
          </div>
        </div>
      )}
    </AgentShell>
  );
}
