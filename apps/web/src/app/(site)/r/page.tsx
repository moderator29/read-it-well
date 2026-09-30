import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/i18n/public-metadata";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { normaliseReceiptCode } from "@/lib/receipts/code";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";

/* A7: the lookup form itself is a public tool and is indexed (it is in the
   sitemap); each `/r/[code]` answer keeps its own metadata. */
/* A10: the title and description in the page's own language, with its
   canonical and hreflang (lib/i18n/public-metadata.ts; words in publicMeta). */
export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("receiptCheck");
}

/**
 * V-55. Type a receipt code. A plain GET form, so it works with no script at
 * all; a code that reads as one goes straight to its check page.
 */
export default async function ReceiptLookupPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (typeof code === "string" && code.trim()) {
    const normal = normaliseReceiptCode(code);
    redirect(`/r/${normal ?? encodeURIComponent(code.trim().slice(0, 24))}`);
  }
  const t = getDictionary(await getLocale());
  const copy = t.afterTheGate.receipt;
  /* The twin of `/check`: the same card, label, heading and foot, so the two
     checks a stranger can run read as one tool. */
  return (
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-xl pt-block">
        <section className="nf-panel nf-panel--card block p-lg">
          <p className="nf-overline text-[var(--nf-content-muted)]">{t.publicDoors.checkCard.label}</p>
          <h1 className="nf-h2 mt-xs">{copy.pageTitle}</h1>
          <form method="get" action="/r" className="mt-md grid gap-sm">
            <label htmlFor="receipt-code" className="nf-label">
              {copy.formLabel}
            </label>
            <input
              id="receipt-code"
              name="code"
              className="nf-field"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="VR-XXXXX-XXXXX"
              required
            />
            <Button type="submit" variant="primary" size="md" full>
              {copy.formSubmit}
            </Button>
          </form>
          <Link href="/check" className="nf-caption mt-md inline-flex min-h-11 items-center gap-xs font-semibold text-[var(--nf-brand-primary)]">
            <UiIcon name="shield-check" size={16} aria-hidden />
            {t.publicDoors.nav.checkAgent}
          </Link>
        </section>
        <p className="nf-caption mt-md text-center text-[var(--nf-content-muted)]">{copy.footnote}</p>
      </div>
    </div>
  );
}
