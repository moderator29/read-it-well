import type { Metadata } from "next";
import { formatDate, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusTrack, type TrackStep } from "@/components/app/status/StatusTrack";
import { trackStates } from "@/components/app/status/tracks";
import { readReferral, type ReferralStage } from "../../referral-reads";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceAccount.invite.referralsTitle };
}

export const dynamic = "force-dynamic";

/** The stages in the order a referral moves through them. */
const ORDER: readonly Exclude<ReferralStage, "reversed">[] = ["joined", "confirmed", "qualified", "rewarded"];

/**
 * ONE REFERRAL, AND WHERE IT STANDS: the inner page for a single referral
 * (D25), on the shared status track. A reversed reward stops the track at the
 * reward step and names what Vallo recorded, as a refusal always carries its
 * reason. Only the join has a time of its own; no other step is given one,
 * because none is stored.
 */
export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const copy = getDictionary(locale).experienceAccount.invite.referrals;
  const row = await readReferral(id);

  if (!row) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={copy.notFoundTitle} fallback="/settings/invite/referrals" />
        <EmptyState
          icon="gift"
          art="envelope"
          title={copy.notFoundTitle}
          body={copy.notFoundBody}
          action={
            <ButtonLink href="/settings/invite/referrals" variant="secondary" size="lg">
              {copy.emptyAction}
            </ButtonLink>
          }
          data-testid="invite-referral-missing"
        />
      </div>
    );
  }

  const reversed = row.stage === "reversed";
  const reached = reversed ? ORDER.length - 1 : ORDER.indexOf(row.stage as (typeof ORDER)[number]);
  const states = trackStates(ORDER.length, reached, reversed ? "failed" : row.stage === "rewarded" ? "complete" : "open");
  const joined = formatDate(new Date(row.joinedAt), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
  const steps: TrackStep[] = ORDER.map((stage, index) => ({
    key: stage,
    label: reversed && stage === "rewarded" ? copy.steps.reversed : copy.steps[stage],
    when: stage === "joined" ? joined : null,
    state: states[index]!,
    ...(reversed && stage === "rewarded" && row.note ? { note: row.note } : {}),
  }));

  return (
    <div className="mx-auto max-w-2xl" data-testid="invite-referral">
      <PageHeader
        title={row.firstName ?? copy.someone}
        subtitle={copy.joinedOn.replace("{date}", joined)}
        fallback="/settings/invite/referrals"
      />
      <section className="nf-panel nf-panel--card block p-lg">
        <StatusTrack label={copy.stageLabel} title={copy.stageLabel} steps={steps} />
        {!reversed && row.note ? (
          <p className="mt-md text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
            <span className="font-semibold text-[var(--nf-content-primary)]">{copy.noteLabel} </span>
            {row.note}
          </p>
        ) : null}
      </section>
    </div>
  );
}
