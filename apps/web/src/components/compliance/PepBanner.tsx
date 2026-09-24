import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readMyPepAnswer } from "@/lib/compliance/pep-queries";

/**
 * SCUML item 20: a lister who has not yet answered the PEP question (every
 * lister from before it existed) sees this across agent mode until they do.
 * It asks; it never blocks anything, payouts included. Draws nothing once
 * answered, for anybody who is not asked, and on a failed read (the question
 * panel itself says the check could not run).
 */
export async function PepBanner() {
  const read = await readMyPepAnswer();
  if (read.state !== "ready" || read.answeredAt !== null) return null;
  const copy = getDictionary(await getLocale()).compliancePep.question;
  return (
    <div className="nf-panel nf-panel--card mb-block flex flex-wrap items-center gap-sm p-card" role="status" data-testid="pep-banner">
      <p className="nf-body-sm min-w-0 flex-1 text-[var(--nf-content-secondary)]">{copy.banner}</p>
      <Link href="/verification" className="nf-btn nf-btn--primary min-h-[44px]">
        {copy.bannerLink}
      </Link>
    </div>
  );
}
