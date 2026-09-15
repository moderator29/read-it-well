import Link from "next/link";
import type { Locale } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Amount } from "@/components/ui/Amount";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { TYPE } from "@/components/app/Screen";
import { KIND_ICON, KIND_LABEL } from "./kinds";
import type { WalletEntry } from "@/lib/wallet/types";

/**
 * The last few movements, on the wallet home.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACED AND WHY THE FULL LIST LEFT.
 *
 * The whole statement was rendered inline here, under the action deck, with
 * its filters. On a wallet with any use in it that is an unbounded list
 * directly below the two things somebody opens the wallet to do, so adding
 * money sat above a scroll they had to get past to reach anything else.
 *
 * Three rows and a way in. That is what a person wants at a glance - did the
 * money land, did the withdrawal go - and the full record with its filters is
 * one tap away on its own screen.
 *
 * THE COUNT IS THREE AND IT IS STATED, NOT INFERRED. `slice(0, 3)` with a "See
 * all" beside it is honest about being a preview. A list that silently showed
 * "some" of somebody's transactions would be the one screen where a person
 * cannot tell whether a payment is missing or merely below the fold.
 */

const PREVIEW = 3;

export function RecentActivity({
  entries,
  locale,
}: {
  entries: WalletEntry[];
  locale: Locale;
}) {
  const recent = entries.slice(0, PREVIEW);

  return (
    <section aria-labelledby="nf-wallet-recent">
      <div className="mb-heading flex items-baseline justify-between gap-md">
        <h2 id="nf-wallet-recent" className="nf-overline">
          Recent
        </h2>
        {entries.length > 0 && (
          <Link
            href="/wallet/transactions"
            className="nf-tap inline-flex items-center gap-2xs text-[0.8125rem] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
          >
            {/* The number is the reason to tap. "See all" alone does not say
                whether there are four movements behind it or four hundred. */}
            All {entries.length}
            <UiIcon name="arrow-right" size={16} />
          </Link>
        )}
      </div>

      {recent.length > 0 ? (
        <ul className="divide-y divide-[var(--nf-border-subtle)]">
          {recent.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/wallet/transactions/${entry.id}`}
                className="nf-tap flex w-full items-center gap-md rounded-[var(--nf-radius-control)] py-row text-left transition-colors hover:bg-[var(--nf-glass-fill)]"
              >
                <span className="block h-10 w-10 shrink-0">
                  <BrandIcon name={KIND_ICON[entry.kind]} fill />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className={`block truncate ${TYPE.rowTitle}`}>
                    {entry.note ?? KIND_LABEL[entry.kind]}
                  </span>
                  <span className={`mt-inline-tight block truncate ${TYPE.rowMeta}`}>
                    {KIND_LABEL[entry.kind]}
                  </span>
                </span>
                <span className="nf-numeric shrink-0 text-right leading-tight">
                  <span
                    className={`block nf-body font-semibold ${
                      entry.direction === "credit"
                        ? "text-[var(--nf-state-success)]"
                        : "text-[var(--nf-state-error)]"
                    }`}
                  >
                    {entry.direction === "credit" ? "+" : "-"}
                    <Amount
                      minorUnits={entry.amountMinor}
                      locale={locale}
                      showFraction
                      secondaryClassName="text-[0.62em] font-medium opacity-60"
                    />
                  </span>
                  {entry.status !== "COMPLETED" && (
                    <StatusPill
                      tone={toneForStatus(entry.status)}
                      className="mt-inline-tight"
                    >
                      {entry.status.toLowerCase()}
                    </StatusPill>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        /* Not the full `EmptyState`, deliberately. That draws a 112px object
           and a headline, which is a lot of screen to say "nothing yet" in a
           strip that is three rows tall when it has content. */
        <p className={`py-row ${TYPE.rowMeta}`}>
          Nothing has moved through your wallet yet. Add money and it appears
          here.
        </p>
      )}
    </section>
  );
}
