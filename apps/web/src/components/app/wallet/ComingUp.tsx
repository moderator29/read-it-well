import Link from "next/link";
import { formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { formatMoneyDate } from "@/lib/money/dates";
import { UPCOMING_SHOWN, type UpcomingItem } from "@/lib/wallet/upcoming-model";

/**
 * V-84. "Coming up": what the money in this wallet is for, next. A rent
 * renewal, a caution owed back, a payment set aside, a paid stay, each dated
 * and linked to its page, soonest first; three shown and the rest behind
 * "See all". Nothing at all renders when nothing is coming up, and a failed
 * read says so in one line rather than claiming there is nothing.
 */
export function ComingUp({ items, locale }: { items: UpcomingItem[] | null; locale: Locale }) {
  const copy = getDictionary(locale).afterTheGate.comingUp;
  if (items === null) {
    return (
      <p className="nf-caption" data-testid="coming-up-failed">
        {copy.failed}
      </p>
    );
  }
  if (items.length === 0) return null;
  const line = (item: UpcomingItem) => (
    <li key={item.id}>
      <Link href={item.href} className="nf-card flex items-baseline justify-between gap-md p-card">
        <span className="nf-body-sm min-w-0">
          {copy.kinds[item.kind].replace("{date}", formatMoneyDate(item.on, locale) ?? item.on)}
        </span>
        <span className="nf-body-sm nf-numeric shrink-0 font-semibold">{formatMoney(item.amountMinor, locale)}</span>
      </Link>
    </li>
  );
  const shown = items.slice(0, UPCOMING_SHOWN);
  const rest = items.slice(UPCOMING_SHOWN);
  return (
    <section aria-label={copy.heading} data-testid="coming-up">
      <h2 className="nf-h4">{copy.heading}</h2>
      <ul className="mt-xs grid gap-xs">{shown.map(line)}</ul>
      {rest.length > 0 && (
        <details className="mt-xs">
          <summary className="nf-body-sm cursor-pointer text-[var(--nf-content-link)]">
            {copy.seeAll.replace("{count}", String(items.length))}
          </summary>
          <ul className="mt-xs grid gap-xs">{rest.map(line)}</ul>
        </details>
      )}
    </section>
  );
}
