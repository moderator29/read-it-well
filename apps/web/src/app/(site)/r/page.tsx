import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { normaliseReceiptCode } from "@/lib/receipts/code";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Check a receipt", robots: { index: false, follow: false } };

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
  const copy = getDictionary(await getLocale()).afterTheGate.receipt;
  return (
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-md">
        <h1 className="nf-h2">{copy.pageTitle}</h1>
        <form method="get" action="/r" className="nf-panel nf-panel--card mt-md block p-md">
          <label htmlFor="receipt-code" className="nf-label">
            {copy.formLabel}
          </label>
          <input
            id="receipt-code"
            name="code"
            className="nf-field mt-xs"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="VR-XXXXX-XXXXX"
            required
          />
          <Button type="submit" variant="primary" full className="mt-md">
            {copy.formSubmit}
          </Button>
        </form>
        <p className="nf-caption mt-md">{copy.footnote}</p>
      </div>
    </div>
  );
}
