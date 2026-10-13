import "@/app/css/chargebacks.css";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ChargebackHold } from "@/lib/money/chargeback-hold-model";

/**
 * THE LISTER'S CHARGEBACK NOTICE, on every screen where a lister sees their
 * money (/payouts, /agent/earnings, /host/earnings), above everything else.
 *
 * Calm, not an alarm: what happened, what it means, what happens next, and
 * the way to ask. It draws only when `public.lister_chargeback_hold` (or its
 * own-session read `my_chargeback_hold`) says the payout rule applies, or,
 * in the lighter info tone, when a dispute is open on one of their payments
 * and holds nothing. No hold, no notice: the screen is exactly as it was.
 *
 * `id="chargeback"` is where the desk's in-app notices land
 * (`/payouts#chargeback`).
 */
export function ChargebackHoldNotice({
  hold,
  copy,
  locale,
}: {
  hold: ChargebackHold;
  copy: Dictionary["chargebacks"]["hold"];
  locale: Locale;
}) {
  if (hold.state === "none") return null;

  if (hold.state === "open") {
    return (
      <section id="chargeback" className="nf-cb-hold nf-cb-hold--open" role="status" aria-labelledby="nf-cb-hold-title" data-testid="chargeback-open-notice">
        <IconPlate size="md">
          <UiIcon name="info" size={ICON_PLATE_GLYPH.md} />
        </IconPlate>
        <div className="min-w-0">
          <p className="nf-cb-hold__overline">{copy.overline}</p>
          <h2 id="nf-cb-hold-title" className="nf-cb-hold__title">
            {copy.openTitle}
          </h2>
          <p className="nf-cb-hold__body">{copy.openBody}</p>
          {hold.openCount > 1 ? <p className="nf-cb-hold__body">{copy.openMore.replace("{count}", String(hold.openCount))}</p> : null}
          <Link href="/settings/help" className="nf-cb-hold__help">
            {copy.help}
          </Link>
        </div>
      </section>
    );
  }

  const [before, after] = copy.body.split("{amount}");
  return (
    <section id="chargeback" className="nf-cb-hold" role="status" aria-labelledby="nf-cb-hold-title" data-testid="chargeback-hold-notice">
      <IconPlate size="md">
        <UiIcon name="hand-coins" size={ICON_PLATE_GLYPH.md} />
      </IconPlate>
      <div className="min-w-0">
        <p className="nf-cb-hold__overline">{copy.overline}</p>
        <h2 id="nf-cb-hold-title" className="nf-cb-hold__title">
          {copy.title}
        </h2>
        {hold.owedMinor !== null && hold.owedMinor > 0 ? (
          <p className="nf-cb-hold__body" data-testid="chargeback-hold-amount">
            {before}
            <Amount minorUnits={hold.owedMinor} currency={hold.currency} locale={locale} showFraction className="font-bold" />
            {after}
          </p>
        ) : (
          <p className="nf-cb-hold__body">{copy.bodyNoAmount}</p>
        )}
        <div className="nf-cb-hold__pair">
          <div>
            <h3>{copy.meansTitle}</h3>
            <p>{copy.means}</p>
          </div>
          <div>
            <h3>{copy.nextTitle}</h3>
            <p>{copy.next}</p>
          </div>
        </div>
        <Link href="/settings/help" className="nf-cb-hold__help">
          {copy.help}
        </Link>
      </div>
    </section>
  );
}
