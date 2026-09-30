import { formatMoney } from "@vallo/i18n/core";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { termsDiff } from "@/lib/agreements/terms-diff";
import { AgreementChanges } from "@/components/app/agreements/AgreementChanges";
import { CancelAgreement, ConfirmTerms } from "@/components/app/agreements/AgreementControls";
import { DecisionCard } from "@/components/app/confirm/DecisionCard";
import { ButtonLink } from "@/components/ui/Button";

/**
 * B9: the "What changed since you confirmed" card and the confirm step that
 * repeats the changed lines. Fixture terms; the diff is the real one.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAgreementChanges() {
  const locale: Locale = await getLocale();
  const kit = getDictionary(locale).memberKit.agreementDiff;
  const v1 = { terms: { move_in: "2026-11-01", rent_minor: 250_000_000, caution_minor: 25_000_000, agency_minor: 25_000_000 }, amountMinor: 300_000_000 };
  const v2 = { terms: { move_in: "2026-11-01", rent_minor: 250_000_000, caution_minor: 50_000_000, agency_minor: 25_000_000, legal_minor: 10_000_000 }, amountMinor: 335_000_000 };
  const worded = termsDiff(v1, v2).map((c) => ({
    key: c.key,
    label: c.label,
    before: typeof c.before === "number" ? formatMoney(c.before, locale) : (c.before ?? kit.notStated),
    after: typeof c.after === "number" ? formatMoney(c.after, locale) : (c.after ?? kit.notStated),
  }));
  return (
    <main className="nf-page nf-md px-gutter pb-section">
      <h1 className="nf-h2">Agreement (Example)</h1>
      <AgreementChanges
        changes={worded}
        copy={kit}
        byLine={kit.by.replace("{who}", kit.other).replace("{date}", "30 Sept, 14:20")}
        versionsLine={kit.versions.replace("{from}", "1").replace("{to}", "2")}
      />
      <AgreementChanges changes={[]} copy={kit} byLine={kit.byUndated} versionsLine={kit.versions.replace("{from}", "2").replace("{to}", "3")} />
      <div className="mt-block">
        <ConfirmTerms agreementId="00000000-0000-4000-8000-0000000ag001" version={2} changes={worded} changesLead={kit.confirmLead} />
      </div>
      {/* Plan item 22: the same confirm step as it opens a live agreement
          page for a party who has not confirmed, on the Awaiting you card.
          Fixture lines; the controls are the page's own. */}
      <DecisionCard
        className="mt-block"
        testId="agreement-awaiting-you"
        label="Awaiting you"
        when="Since 30 Sept"
        title="Confirm version 2 of the terms"
        lines={[
          { label: "Rent", amount: formatMoney(v2.terms.rent_minor, locale) },
          { label: "Caution deposit", amount: formatMoney(v2.terms.caution_minor, locale) },
          { label: "Agency fee", amount: formatMoney(v2.terms.agency_minor, locale) },
          { label: "Legal fee", amount: formatMoney(v2.terms.legal_minor, locale) },
        ]}
        total={{ label: "Total", amount: formatMoney(v2.amountMinor, locale) }}
        primary={<ConfirmTerms agreementId="00000000-0000-4000-8000-0000000ag001" version={2} changes={worded} changesLead={kit.confirmLead} />}
        secondary={[
          <ButtonLink key="terms" variant="secondary" href="#top">
            Read the terms
          </ButtonLink>,
          <CancelAgreement key="cancel" agreementId="00000000-0000-4000-8000-0000000ag001" variant="secondary" />,
        ]}
      />
    </main>
  );
}
