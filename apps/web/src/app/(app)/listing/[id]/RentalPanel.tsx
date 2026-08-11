import { type Locale } from "@naijafinds/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { TYPE } from "@/components/app/Screen";
import { RequestInspection } from "@/components/app/inspections/RequestInspection";
import { readOpenInspectionFor } from "@/lib/inspections/queries";
import { PERIOD_SUFFIX, PERIOD_SUFFIX_SLASH, type RentPeriod } from "@/lib/listings/pricing";
import { TenancyTerm } from "./TenancyTerm";

/**
 * The panel for rental listings, the serious rent market.
 *
 * Annual tenancies carry NO Reserve and NO Check availability control by
 * design (docs/HYBRID_INVENTORY.md sections 1 and 4): the path is message the
 * agent inside the platform, inspect the property, then pay. The price in the
 * term the row states, the three steps stated plainly, and the canonical safety
 * wording from section 6 word for word.
 *
 * It serves SALES as well as tenancies, which is easy to miss and was the cause
 * of one of the two price bugs this file used to carry. See `period` below.
 *
 * ---------------------------------------------------------------------------
 * STEP TWO IS NOW A CONTROL RATHER THAN A SENTENCE.
 * ---------------------------------------------------------------------------
 *
 * This panel has always listed "Inspect the property" as the middle step of
 * three and then offered exactly one thing to press: message the agent. So the
 * step that decides every rental in this market was prose, and the arrangement
 * lived in a chat thread that both sides had to scroll to reconstruct.
 *
 * `RequestInspection` files a real request against a real time, which appears
 * as a row with a state on the agent's own home screen and on the asker's
 * bookings screen. Messaging stays, beside it and below it, because a viewing
 * needs a conversation around it - what changed is that the conversation is no
 * longer the only place the arrangement exists.
 *
 * Still a server component, and it reads whether this person already has a
 * live request so the control can say where that one stands instead of quietly
 * filing a second identical one.
 */

const STEPS = [
  { label: "Message the agent", detail: "Ask your questions inside RentMe." },
  { label: "Inspect the property", detail: "Arrange a viewing before anything is agreed." },
  { label: "Pay through RentMe", detail: "Only once you have seen the place." },
];

/** A minimum stated in months, in this listing's own unit. */
const MONTHS_PER_TERM: Record<RentPeriod, number> = { month: 1, quarter: 3, year: 12 };

export async function RentalPanel({
  listingId,
  priceMinor,
  currency,
  locale,
  period = "year",
  minimumTenancyMonths,
}: {
  listingId: string;
  priceMinor: number;
  currency: string;
  locale: Locale;
  /**
   * What the figure above is, from the row rather than assumed.
   *
   * The panel printed "/ year" flat and it is rendered for TWO intents, so it
   * was wrong in two different ways at once. A listing the database said was
   * priced monthly showed its monthly rent labelled as a year's - on the same
   * screen where the hero above it, which resolves the period properly, said
   * "per month". And a property FOR SALE, which also lands on this panel,
   * printed its asking price as though it were annual rent.
   */
  period?: RentPeriod | "sale";
  /** What the agent set as the shortest tenancy they will take, in months. */
  minimumTenancyMonths?: number | undefined;
}) {
  const existing = await readOpenInspectionFor(listingId);
  const forSale = period === "sale";

  /* Months into terms, rounding UP: a listing priced yearly with an 18 month
     minimum takes two years, not one. Rounding down would offer a tenancy
     shorter than the one the agent said they would accept. */
  const minimumTerms =
    !forSale && minimumTenancyMonths
      ? Math.max(1, Math.ceil(minimumTenancyMonths / MONTHS_PER_TERM[period]))
      : 1;

  return (
    <div className="nf-card p-5" data-testid="rental-panel">
      <p>
        <Amount
          minorUnits={priceMinor}
          locale={locale}
          currency={currency}
          suffix={forSale ? PERIOD_SUFFIX.sale : PERIOD_SUFFIX_SLASH[period]}
          className="nf-h3 leading-none tracking-tight text-[var(--nf-content-primary)]"
          secondaryClassName="text-[0.54em] font-semibold opacity-60"
        />
      </p>
      <p className={`mt-1 ${TYPE.rowMeta}`}>
        {forSale
          ? "Agreed with the agent after an inspection."
          : period === "year"
            ? "Annual tenancy, agreed with the agent after an inspection."
            : "Tenancy agreed with the agent after an inspection."}
      </p>

      {/* A sale has no term to lengthen. Nothing is bought by the year. */}
      {!forSale && (
        <TenancyTerm
          priceMinor={priceMinor}
          period={period}
          currency={currency}
          locale={locale}
          minimumTerms={minimumTerms}
        />
      )}

      <ol className="mt-4 space-y-3 border-t border-[var(--nf-border-subtle)] pt-4">
        {STEPS.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3">
            <span className="nf-numeric nf-caption mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--nf-border-subtle)] font-bold text-[var(--nf-content-secondary)]">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block ${TYPE.rowTitle}`}>{step.label}</span>
              <span className={`block ${TYPE.rowMeta}`}>{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      {/*
        TWO CONTROLS, IN THE ORDER THE STEPS ARE IN.

        Message is the primary because step one is still step one: most people
        want to ask something before they name a Saturday. The inspection
        request is the secondary directly under it, which is the first time
        step two has had anything to press at all.
      */}
      <ButtonLink
        href={`/messages/new?listing=${listingId}`}
        variant="primary"
        full
        className="mt-4"
        leadingIcon="chat-bubble"
      >
        Message agent
      </ButtonLink>

      <div className="mt-2">
        <RequestInspection listingId={listingId} existing={existing} locale={locale} />
      </div>

      {/* The trust block: an object large enough to read as content, so this is
          the one place on the panel that takes a 3D brand icon. */}
      <div className="mt-4 flex items-start gap-3 border-t border-[var(--nf-border-subtle)] pt-4">
        <span className="block h-11 w-11 shrink-0">
          <BrandIcon name="shield-check" fill />
        </span>
        <p className={TYPE.rowMeta}>
          For your safety, keep every chat and payment inside RentMe. Deals made outside the
          platform are not protected by us. Pay only after you have inspected the property.
        </p>
      </div>
    </div>
  );
}
