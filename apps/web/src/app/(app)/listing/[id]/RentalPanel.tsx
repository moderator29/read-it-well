import { type Locale } from "@naijafinds/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";
import { TYPE } from "@/components/app/Screen";
import { RequestInspection } from "@/components/app/inspections/RequestInspection";
import { readOpenInspectionFor } from "@/lib/inspections/queries";

/**
 * The panel for rental listings, the serious rent market.
 *
 * Annual tenancies carry NO Reserve and NO Check availability control by
 * design (docs/HYBRID_INVENTORY.md sections 1 and 4): the path is message the
 * agent inside the platform, inspect the property, then pay. Per-year price,
 * the three steps stated plainly, and the canonical safety wording from
 * section 6 word for word.
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

export async function RentalPanel({
  listingId,
  priceMinor,
  currency,
  locale,
}: {
  listingId: string;
  priceMinor: number;
  currency: string;
  locale: Locale;
}) {
  const existing = await readOpenInspectionFor(listingId);

  return (
    <div className="nf-card p-5" data-testid="rental-panel">
      <p>
        <Amount
          minorUnits={priceMinor}
          locale={locale}
          currency={currency}
          suffix="/ year"
          className="nf-h3 leading-none tracking-tight text-[var(--nf-content-primary)]"
          secondaryClassName="text-[0.54em] font-semibold opacity-60"
        />
      </p>
      <p className={`mt-1 ${TYPE.rowMeta}`}>
        Annual tenancy, agreed with the agent after an inspection.
      </p>

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
