import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { rankingProse } from "@/lib/listings/ranking";

/**
 * "RECOMMENDED", STATED IN PUBLIC (V-06).
 *
 * Every sentence here is produced by `rankingProse` from the constants the
 * search sort itself uses, so the page cannot describe an order the code does
 * not run. The last line is the promise, and it is the reason the section
 * exists: nobody can pay to be higher, and Vallo does not sell placement.
 *
 * Mounted on /standards under the anchor `#ranking`, which the search shelf
 * links to from its Recommended line: one tap from the sort to the formula.
 */
export async function RankingExplained() {
  const t = getDictionary(await getLocale());
  const copy = t.trustVisible.ranking;
  const prose = rankingProse(copy);
  return (
    <section className="mt-section scroll-mt-16" aria-labelledby="ranking">
      <h2 id="ranking" className="nf-h2 scroll-mt-16 text-[length:var(--nf-text-h3)]">
        {copy.title}
      </h2>
      <p className="nf-body mt-inline leading-relaxed text-[var(--nf-content-secondary)]">{prose.intro}</p>
      <ol className="mt-group space-y-row" data-testid="ranking-inputs">
        {prose.inputs.map((line) => (
          <li key={line} className="nf-panel nf-panel--card nf-body-sm block p-card-sm text-[var(--nf-content-secondary)]">
            {line}
          </li>
        ))}
      </ol>
      <p className="nf-body-sm mt-row text-[var(--nf-content-muted)]">{prose.order}</p>
      <p className="nf-body mt-row font-semibold text-[var(--nf-content-primary)]" data-testid="no-paid-placement">
        {prose.promise}
      </p>
    </section>
  );
}
