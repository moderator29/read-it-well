import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Figure } from "@/components/ui/Amount";
import { resolveSession } from "@/lib/actions/session";
import { readMyPassport } from "@/lib/trust/passport-read";
import { factDate, factViews, isFactKey, type FactKey } from "../passport-facts";
import { readPhoneConfirmedAt } from "../passport-reads";
import "@/components/app/account/passport.css";

export async function generateMetadata({ params }: { params: Promise<{ fact: string }> }): Promise<Metadata> {
  const { fact } = await params;
  const copy = getDictionary(await getLocale()).experienceAccount.passport;
  return { title: isFactKey(fact) ? copy.facts[fact].title : copy.credentialLabel, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/** Where the thing the fact is made from lives, so the page is never a dead end. */
const SOURCE: Record<FactKey, string> = {
  identity: "/verification",
  phone: "/settings/phone",
  attended: "/bookings",
  tenancies: "/payments",
  since: "/settings/account",
};

/**
 * ONE FACT'S EVIDENCE: the inner page for a single line of the passport (D25).
 *
 * It answers one question completely: what is this line made from, and when.
 * The date (or the count, where Vallo holds only a count) is the figure; the
 * rest is how it was checked and where a lister sees it, each said in words the
 * records can back (`20260928224733_v100_the_renter_passport`). A fact with
 * nothing behind it is not on the passport, so asking for it says so rather
 * than drawing an empty page.
 */
export default async function PassportFactPage({ params }: { params: Promise<{ fact: string }> }) {
  const { fact } = await params;
  const locale = await getLocale();
  const copy = getDictionary(locale).experienceAccount.passport;
  const back = "/settings/passport";

  const missing = (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.credentialLabel} fallback={back} />
      <EmptyState
        icon="user-verified"
        title={copy.evidenceNotFoundTitle}
        body={copy.evidenceNotFoundBody}
        action={
          <ButtonLink href={back} variant="secondary" size="lg">
            {copy.evidenceBack}
          </ButtonLink>
        }
        data-testid="passport-fact-missing"
      />
    </div>
  );

  if (!isFactKey(fact)) return missing;
  const session = await resolveSession();
  if (session.state !== "signed-in") return missing;
  const [mine, phoneAt] = await Promise.all([readMyPassport(), readPhoneConfirmedAt()]);
  const view = factViews(mine?.facts ?? null, phoneAt).find((v) => v.key === fact);
  if (!view) return missing;

  const words = copy.facts[fact];
  return (
    <div className="mx-auto max-w-2xl" data-testid="passport-fact">
      <PageHeader title={words.title} fallback={back} />
      <div className="space-y-block">
        {view.at || view.count !== null ? (
          <section className="nf-panel nf-panel--card nf-panel--figure nf-evidence">
            <p className="nf-evidence__label">{view.at ? copy.evidenceDateLabel : copy.evidenceCountLabel}</p>
            <p className="nf-evidence__value">
              {view.at ? factDate(view.at, locale) : <Figure value={view.count ?? 0} locale={locale} count />}
            </p>
          </section>
        ) : null}
        <section className="nf-panel nf-panel--card nf-evidence__block">
          <h2 className="nf-evidence__heading">{copy.evidenceCheckedLabel}</h2>
          <p className="nf-evidence__body">{words.checked}</p>
        </section>
        <section className="nf-panel nf-panel--card nf-evidence__block">
          <h2 className="nf-evidence__heading">{copy.evidenceSeenLabel}</h2>
          <p className="nf-evidence__body">{copy.evidenceSeen}</p>
        </section>
        <ButtonLink href={SOURCE[fact]} variant="secondary" size="lg" full trailingIcon="arrow-right">
          {words.open}
        </ButtonLink>
      </div>
    </div>
  );
}
