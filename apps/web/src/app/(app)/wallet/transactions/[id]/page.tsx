import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/Screen";
import { Receipt } from "@/components/app/wallet/Receipt";
import { readWalletEntry } from "@/lib/wallet/repository";

/** Never indexed, and never in a browser tab title beside somebody's amount. */
export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * One movement's receipt.
 *
 * The id is in the URL, so the ONLY thing standing between a stranger and
 * somebody else's receipt is that `readWalletEntry` reads through the
 * signed-in session's client and lets RLS answer. It is not this page's job to
 * check ownership and it deliberately does not try: a second check here would
 * be a second place for the rule to be written, and the weaker of two rules is
 * the one that ends up being enforced.
 *
 * Signed out, not found and not yours all land on the same panel. Telling them
 * apart would confirm to somebody guessing that a reference exists.
 */
export default async function WalletReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const entry = await readWalletEntry(id);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Receipt" fallback="/wallet/transactions" />

      {entry ? (
        <Reveal>
          <Receipt entry={entry} locale={locale} />
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState
            icon="wallet-secure"
            title="No such receipt"
            body="This receipt does not exist, or it is not yours to read. Open your transactions and pick the movement you are looking for."
            action={
              <ButtonLink href="/wallet/transactions" variant="primary">
                My transactions
              </ButtonLink>
            }
          />
        </Reveal>
      )}
    </div>
  );
}
