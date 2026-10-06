import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { ButtonLink } from "@/components/ui/Button";
import { PromotionResults } from "@/components/promotion/PromotionResults";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { measurementRows } from "@/lib/promotion/measurement";
import { readPromotionMeasurement } from "@/lib/promotion/measurement-read";
import { gateFirstRun } from "@/components/app/feature-onboarding/first-run-store";
import { ListingPitch } from "../../../list/ListingPitch";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.experienceFeatures.promotion.measure.title, robots: { index: false, follow: false } };
}

/**
 * `/agent/listings/<id>/promotion`: A LISTING'S PROMOTION RESULTS (D3, D60;
 * `VALLO_PROMOTION.md`, "The measurement surface"; F4's ten figures).
 *
 * NOT LINKED FROM ANYWHERE, ON PURPOSE (the rewards pattern). Promotion
 * cannot be sold until the company payment account exists (D38), and Session
 * 2's inventory, purchase and metrics reads do not exist, so the read is
 * `not-live` and this page says so, with all ten figures reading "No data":
 * never a zero standing in for nothing (`lib/promotion/measurement.test.ts`
 * holds both, and that nothing links here). When the read lands, this page
 * draws its counts with no change here.
 *
 * It never says what a promotion "will get you": no projection, average or
 * "listings like yours" figure is computed anywhere, so none can be printed.
 * The first visit shows promotion's first run once (`gateFirstRun`).
 */
export default async function PromotionResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ listingId }, query] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const t = getDictionary(locale);
  const p = t.experienceFeatures.promotion;
  const context = await getAgentContext();

  if (context.state !== "agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/listings" profile={null}>
        {context.state === "unconfigured" ? (
          <p className="nf-body mx-auto max-w-md py-section text-center text-[var(--nf-content-secondary)]">
            {t.agentAnalytics.unconfigured}
          </p>
        ) : (
          <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
        )}
      </AgentShell>
    );
  }

  await gateFirstRun("promotion", `/agent/listings/${encodeURIComponent(listingId)}/promotion`, query);
  const read = await readPromotionMeasurement(listingId);

  return (
    <AgentShell t={t} locale={locale} active="/agent/listings" profile={agentProfileFrom(context.agent)}>
      <div className="mx-auto flex max-w-2xl flex-col gap-group py-lg" data-testid="promotion-page">
        <div>
          <h1 className="nf-h2">{p.measure.title}</h1>
          <p className="mt-inline nf-body-sm text-[var(--nf-content-secondary)]">{p.measure.lede}</p>
        </div>
        <PromotionResults rows={measurementRows(read)} notLive={read.state === "not-live"} copy={p} locale={locale} />
        <div>
          <ButtonLink href="/agent/listings" variant="secondary">
            {p.measure.back}
          </ButtonLink>
        </div>
      </div>
    </AgentShell>
  );
}
