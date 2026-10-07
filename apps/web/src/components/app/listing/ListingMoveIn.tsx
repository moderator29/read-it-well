import type { Dictionary, Locale } from "@vallo/i18n/core";
import type { Listing } from "@/lib/listings/types";
import { Amount } from "@/components/ui/Amount";
import { Money } from "@/components/ui/Money";
import { TrueCostActions } from "./TrueCostActions";
import { TYPE } from "@/components/app/Screen";
import { moveInLines } from "./move-in-lines";
import { unexplainedRemainder } from "@/lib/rent/ledger";
import type { PayeeContext } from "@/lib/listings/money-map";
import { feeShares, formatBps, type FeeKey } from "@/lib/listings/fee-share";
import { feeRuleFor } from "@/lib/trust/fee-rules";
import { formatMoney } from "@vallo/i18n/core";
import { Unfold } from "@/components/ui/Unfold";
import "@/app/css/catalogue.css";

/* The fees on a bill: every cost that is neither the rent nor money that comes back. */
const FEE_KEYS = new Set(["agency", "legal", "agreement", "service"]);

/**
 * What it actually costs to move in.
 *
 * THE NUMBER EVERY NIGERIAN RENTER SHOPS ON, and until 22 September 2026 the
 * listing page did not show it at all. A 4.5m yearly rent routinely means 7m at
 * the door once caution, agency, legal, agreement and service charge are
 * counted, so a listing page that leads with the rent alone is quoting a figure
 * nobody actually pays. The schema has carried these columns for a while
 * (`total_move_in_cost_minor` and the five parts); this is the first surface to
 * print them.
 *
 * THIS COMPONENT EXISTED, WAS CORRECT, AND NOTHING IMPORTED IT. It is on the
 * screen now, at `listing/[id]/page.tsx`, and the disclosure it used to hide
 * behind is gone: the breakdown is the point, so the breakdown is open.
 *
 * THE ANATOMY IS `GOVERNING-08` SCREEN TWO, "What will a tenant actually pay?":
 * one row per cost, each carrying a bold line glyph on a plate, the cost's
 * name with its period or basis beneath, the figure on the right, and a quiet
 * note saying who keeps it. The total sits in its own lit panel under them with
 * the coins glyph beside it. Every capsule in that render ships as a
 * rounded rectangle on `--nf-radius-control`, per the roles README.
 *
 * WHAT IT WILL NOT DO.
 *
 *   - It never recomputes the total from the parts. The database holds the
 *     lister's own total at or above the sum of whatever parts they named,
 *     precisely because agents fold fees into each other. When no total was
 *     stated the sum of the named parts is the honest FLOOR, and the figure is
 *     labelled "from" so it cannot read as a quote.
 *   - IT NEVER DRAWS AN UNDECLARED COST AS ZERO. The product rule:
 *     "a cost the lister has not declared is drawn as not declared, with the
 *     words, never as zero. Zero is a claim." So an undeclared line is still
 *     LISTED, because the tenant will meet it whether or not the lister named
 *     it, and it is drawn with the words "Not declared" and never with a
 *     figure. It contributes nothing to the total.
 *   - A STATED ZERO IS A DIFFERENT FACT AND IS DRAWN AS ONE. "No agency fee"
 *     on an owner's own listing is the entire argument of this handoff made
 *     visible in one line, so a declared zero agency fee gets the words rather
 *     than a ₦0 nobody reads.
 *   - It renders nothing at all when the lister named neither a total nor a
 *     single part, rather than showing a zero or an empty breakdown.
 *
 * REFERENCE 7073, ITEMISED (Session 3, Stage 5). The bill in 7073 is one
 * card: each charge's name with its basis on a quiet line beneath it, the
 * figure on the right, and "Total payable" closing the same card under a
 * heavier rule. So the total no longer floats in its own glowing panel below
 * the list (a second container, and a second glow on a screen that allows
 * one): it is the card's last row, at display size, always visible. What sits
 * behind the one `Unfold` is only the reading notes (how a stated or summed
 * total is meant, the state's published fee limits): every cost, every fee,
 * its share of a year's rent, the gaps and the total stay on the page, because
 * price, fees and money state are never behind a disclosure.
 */

export function ListingMoveIn({
  listing,
  locale,
  t,
  records = { mandateVerified: false, ownershipVerified: false },
  actions,
}: {
  listing: Listing;
  locale: Locale;
  t: Dictionary;
  /** V-46: whether staff dated the ownership or the mandate. Absent reads as neither. */
  records?: Pick<PayeeContext, "mandateVerified" | "ownershipVerified">;
  /**
   * The three equal tiles under the total (Ledger, Share, Ask). The listing
   * page passes them; a harness or a surface with nowhere to send them leaves
   * them out and the bill ends at its total.
   */
  actions?: { ledgerHref: string; messageHref: string; shareTitle: string };
}) {
  const copy = t.moveIn;
  const lines = moveInLines(listing, copy, {
    ctx: { listerRole: listing.listerRole, listerName: listing.listerName, ...records },
    copy: t.afterTheGate.moneyMap,
  });
  const declared = lines.filter((line) => line.minor !== undefined && line.minor !== null);
  const stated = listing.moveInCostStated === true;
  const total =
    listing.moveInCostMinor ?? declared.reduce((sum, line) => sum + (line.minor ?? 0), 0);

  // Nobody named a total and nobody named a part. There is no honest figure to
  // print, so none is printed.
  if (total <= 0 && declared.length === 0) return null;

  const undeclared = lines.length - declared.length;
  /* V-13. A stated total above the parts beside it has a gap nobody named.
     It is its own row, in words, never folded silently into the total. */
  const remainder = unexplainedRemainder(
    total,
    declared.map((line) => line.minor ?? 0),
    stated,
  );
  const gateCopy = t.afterTheGate.remainder;
  /* V-12: each fee paid to the agent as a share of a year's rent, the three
     together, and the published state rule beside them as a fact. Integer
     basis points; never red, never a verdict. */
  const shares = feeShares(listing);
  const feeCopy = t.trustVisible.fees;
  const rule = feeRuleFor(listing.stateCode);
  /* A declared zero agency fee is the direct-from-owner argument in one line,
     so it gets said in words rather than left as a ₦0 in a column. */
  const noAgencyFee = listing.agencyFeeMinor === 0;
  const gateTitle = t.experienceDetail.breakdown.howRead;
  const gateHint = t.experienceDetail.breakdown.howReadHint;
  const sx = t.experienceDetail.breakdown;

  /*
   * THE BILL, TO PREMIUM-STANDARD REFERENCE 8 (the founder's bill breakdown,
   * 7 October): three small figures over the lines, then one card of lines
   * whose amounts sit right aligned and tabular with a muted line under each
   * label that says what the figure is made of, then a heavier total, then
   * three equal action tiles. The plates that stood at the start of every row
   * came off: the reference draws none, and at 390 they cost the label column
   * 56px, which is why a two-word cost wrapped onto four lines.
   *
   * WHO EACH COST IS PAID TO stays on its row, under the arithmetic, because
   * "no landlord is on record" is a trust fact and the rule above holds:
   * money facts are never behind a disclosure.
   */
  const rentMinor = lines.find((line) => line.key === "rent")?.minor ?? 0;
  const feesMinor = lines
    .filter((line) => FEE_KEYS.has(line.key))
    .reduce((sum, line) => sum + (line.minor ?? 0), 0);
  const backMinor = lines.find((line) => line.key === "caution")?.minor ?? 0;
  const strip = [
    rentMinor > 0 ? { key: "rent", label: sx.stripRent, minor: rentMinor } : null,
    feesMinor > 0 ? { key: "fees", label: sx.stripFees, minor: feesMinor } : null,
    backMinor > 0 ? { key: "back", label: sx.stripBack, minor: backMinor } : null,
  ].filter((cell): cell is { key: string; label: string; minor: number } => cell !== null);

  return (
    <div data-testid="move-in-cost" className="nf-movein nf-movein--bill">
      {/* A strip of one figure says nothing the total does not, so it needs two. */}
      {strip.length > 1 && (
        <dl className="nf-bill-strip" aria-label={sx.stripLabel} data-testid="move-in-strip">
          {strip.map((cell) => (
            <div key={cell.key} className="nf-bill-strip__cell" data-cell={cell.key}>
              <dt className="nf-bill-strip__label">{cell.label}</dt>
              <dd className="nf-bill-strip__figure">
                <Money minor={cell.minor} locale={locale} currency={listing.currency} mode="glance" />
              </dd>
            </div>
          ))}
        </dl>
      )}
      <ul className="nf-movein__list">
        {lines.map((line) => {
          const isDeclared = line.minor !== undefined && line.minor !== null;
          const share = shares?.each[line.key as FeeKey];
          const sub = [
            line.basis,
            share ? feeCopy.shareOfRent.replace("{share}", formatBps(share.bps, locale)) : undefined,
          ].filter(Boolean);
          return (
            <li
              key={line.key}
              className="nf-movein__row"
              data-declared={isDeclared || undefined}
              data-testid={`move-in-line-${line.key}`}
            >
              <span className="nf-movein__name">
                <span className="nf-movein__label">{line.label}</span>
                {sub.length > 0 && (
                  <span
                    className="nf-movein__basis nf-numeric"
                    {...(share ? { "data-testid": `fee-share-${line.key}` } : {})}
                  >
                    {sub.join(" · ")}
                  </span>
                )}
                {/* A declared zero has nobody to be paid; "No agency fee" over
                    "Paid to the agent" would contradict itself. */}
                {isDeclared && line.minor !== 0 && line.keeper && (
                  <span className="nf-movein__keeper">{line.keeper}</span>
                )}
              </span>
              <span className="nf-movein__figure">
                {isDeclared ? (
                  line.key === "agency" && line.minor === 0 ? (
                    <span className="nf-movein__free">{copy.noAgencyFee}</span>
                  ) : (
                    <Amount
                      minorUnits={line.minor as number}
                      locale={locale}
                      currency={listing.currency}
                    />
                  )
                ) : (
                  <span className="nf-movein__undeclared">{copy.notDeclared}</span>
                )}
              </span>
            </li>
          );
        })}
        {remainder > 0 && (
          <li className="nf-movein__row" data-declared data-testid="move-in-line-remainder">
            <span className="nf-movein__name">
              <span className="nf-movein__label text-[var(--nf-state-warning)]">{gateCopy.line}</span>
              <span className="nf-movein__basis">{gateCopy.note}</span>
            </span>
            <span className="nf-movein__figure text-[var(--nf-state-warning)]">
              <Amount minorUnits={remainder} locale={locale} currency={listing.currency} />
            </span>
          </li>
        )}
        {/* The total: the lister's stated figure, or the floor of the parts
            they named, labelled "from". Never computed into something else. */}
        <li className="nf-movein__row nf-movein__row--total" data-declared data-testid="move-in-total">
          <span className="nf-movein__total-label">{stated ? copy.totalStated : copy.totalFrom}</span>
          <span className="nf-movein__total-figure">
            <Amount minorUnits={total} locale={locale} currency={listing.currency} />
          </span>
        </li>
      </ul>

      {shares?.total && shares.total.minor > 0 && (
        <p className={`mt-row ${TYPE.body}`} data-testid="fee-share-total">
          {feeCopy.toAgent
            .replace("{amount}", formatMoney(shares.total.minor, locale, listing.currency))
            .replace("{share}", formatBps(shares.total.bps, locale))}
        </p>
      )}
      {undeclared > 0 && (
        <p className={`mt-inline-tight ${TYPE.caption} leading-relaxed`} data-testid="move-in-gaps">
          {(undeclared === 1 ? copy.undeclaredOne : copy.undeclaredMany).replace(
            "{count}",
            String(undeclared),
          )}
        </p>
      )}
      {actions && (
        <TrueCostActions
          listingId={listing.id}
          title={actions.shareTitle}
          ledgerHref={actions.ledgerHref}
          messageHref={actions.messageHref}
          copy={{
            label: sx.actionsLabel,
            ledger: sx.ledger,
            ledgerLabel: sx.ledgerLabel,
            share: sx.share,
            shareLabel: sx.shareLabel,
            ask: sx.ask,
            askLabel: sx.askLabel,
          }}
        />
      )}
      <Unfold
        className="mt-row"
        data-testid="move-in-notes"
        items={[
          {
            id: "how-read",
            icon: "info",
            title: gateTitle,
            hint: gateHint,
            content: (
              <div className="grid gap-inline-tight">
                {shares && rule && (
                  <p className={`${TYPE.caption} leading-relaxed`} data-testid="fee-state-rule">
                    {feeCopy.stateRule
                      .replace("{state}", rule.stateName)
                      .replace("{agency}", formatBps(rule.agencyMaxBps, locale))
                      .replace("{legal}", formatBps(rule.legalMaxBps, locale))
                      .replace("{source}", rule.source)}{" "}
                    {feeCopy.noCap}
                  </p>
                )}
                <p className={`${TYPE.caption} leading-relaxed`}>
                  {stated ? copy.statedNote : copy.summedNote}
                </p>
                {noAgencyFee && (
                  <p className={`${TYPE.caption} leading-relaxed`} data-testid="move-in-direct">
                    {copy.noAgencyFeeNote}
                  </p>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
