import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readMyPepAnswer } from "@/lib/compliance/pep-queries";
import { PepQuestion } from "./PepQuestion";

/**
 * SCUML item 20: the PEP question where a lister meets it (verification and
 * payout account setup). Draws nothing for a member looking for a home, and a
 * failed read says so rather than hiding the question.
 */
export async function PepQuestionPanel({ askedAt }: { askedAt: "verification" | "payout" }) {
  const read = await readMyPepAnswer();
  if (read.state === "not-asked") return null;
  const locale = await getLocale();
  const copy = getDictionary(locale).compliancePep.question;
  if (read.state === "unavailable") {
    return (
      <p role="alert" className="nf-panel nf-panel--card mb-block block p-card nf-body-sm text-[var(--nf-state-warning)]">
        {copy.unavailable}
      </p>
    );
  }
  return <PepQuestion copy={copy} locale={locale} answeredAt={read.answeredAt} askedAt={askedAt} />;
}
