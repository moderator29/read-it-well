import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { walletWords } from "./kinds";
import { EntryRow } from "./EntryRow";
import type { WalletEntry } from "@/lib/wallet/types";
import { panelClass } from "@/components/ui/Panel";

/**
 * The last few movements, on the wallet home, as the governing render draws
 * them: one glass card, a heading with "See all", five rows.
 *
 * Five and a way in. The full record with its filters is one tap away on its
 * own screen, and the count is stated on the link so a person can tell
 * whether four movements or four hundred sit behind it. A list that silently
 * showed "some" of somebody's transactions would be the one screen where a
 * missing payment is indistinguishable from one below the fold.
 */

const PREVIEW = 5;

export function RecentActivity({
  entries,
  locale,
  copy,
  title,
  empty,
}: {
  entries: WalletEntry[];
  locale: Locale;
  copy: Dictionary["wallet"]["home"];
  /** The card's heading. The wallet home says "Recent Transactions"; the
      receive page passes the entries that came in and names them so. */
  title?: string;
  /** What to say when there is nothing, where the default is not true of the
      slice being shown. */
  empty?: string;
}) {
  const recent = entries.slice(0, PREVIEW);
  const words = walletWords(locale);

  return (
    <section aria-labelledby="nf-wallet-recent" className={panelClass({ variant: "card", className: "nf-tx-panel p-0" })}>
      <div className="nf-tx-card__head">
        <h2 id="nf-wallet-recent" className="nf-wallet-section__title">
          {title ?? copy.recentTitle}
        </h2>
        {entries.length > 0 && (
          <Link href="/wallet/transactions" className="nf-wallet-link nf-tap">
            {copy.seeAll}
            <span className="sr-only"> ({entries.length})</span>
            <UiIcon name="arrow-right" size={16} />
          </Link>
        )}
      </div>

      {recent.length > 0 ? (
        <ul className="nf-tx-list">
          {recent.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              locale={locale}
              words={words}
              completedLabel={copy.completed}
            />
          ))}
        </ul>
      ) : (
        <p className={`px-card-sm pb-card-sm pt-row ${TYPE.rowMeta}`}>{empty ?? copy.recentEmpty}</p>
      )}
    </section>
  );
}
