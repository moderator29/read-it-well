import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { Icon } from "@/design-system/icons/Icon";

export const metadata: Metadata = { title: "Search" };

/**
 * Discovery results.
 *
 * The search engine, map and filters are Phase 2. This route exists now so the
 * hero and home search forms lead somewhere real instead of a 404, and it
 * states plainly what it can and cannot do rather than rendering an empty grid
 * that looks broken. The rail, tab bar and top bar come from the `(app)`
 * layout, so this page renders only its own content.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { q, type } = await searchParams;

  return (
    <div className="nf-card mx-auto max-w-2xl p-10 text-center">
      <Icon name="map" size={76} className="mx-auto" />

      <h1 className="nf-h2 mt-5">
        {q ? `Searching for "${q}"` : "Discovery is on the way"}
      </h1>

      <p className="mx-auto mt-3 max-w-[46ch] text-[var(--nf-content-secondary)]">
        The search engine, live map and category filters arrive in the next phase. Your
        query was received and nothing was lost.
      </p>

      {(q || type) && (
        <dl className="nf-card mx-auto mt-6 max-w-sm space-y-2 p-4 text-left text-[0.875rem]">
          {q && (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--nf-content-muted)]">Query</dt>
              <dd className="font-semibold">{q}</dd>
            </div>
          )}
          {type && (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--nf-content-muted)]">Category</dt>
              <dd className="font-semibold">{type}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/home" className="nf-btn nf-btn--primary">
          {t.nav.home}
        </Link>
        <Link href="/" className="nf-btn nf-btn--glass">
          {t.auth.backToHome}
        </Link>
      </div>
    </div>
  );
}
