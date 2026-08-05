import { type Locale } from "@naijafinds/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Amount } from "@/components/ui/Amount";

/**
 * The panel for rental listings, the serious rent market.
 *
 * Annual tenancies carry NO Reserve and NO Check availability control by
 * design (docs/HYBRID_INVENTORY.md sections 1 and 4): the path is message the
 * agent inside the platform, inspect the property, then pay. Per-year price,
 * one primary call to action, the three steps stated plainly, and the
 * canonical safety wording from section 6 word for word.
 *
 * A server component on purpose: nothing here needs JavaScript.
 */

const STEPS = [
  { label: "Message the agent", detail: "Ask your questions inside RentMe." },
  { label: "Inspect the property", detail: "Arrange a viewing before anything is agreed." },
  { label: "Pay through RentMe", detail: "Only once you have seen the place." },
];

export function RentalPanel({
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
  return (
    <div className="nf-card p-5" data-testid="rental-panel">
      <p>
        <Amount
          minorUnits={priceMinor}
          locale={locale}
          currency={currency}
          suffix="/ year"
          className="text-[1.5rem] font-bold leading-none tracking-tight text-[var(--nf-content-primary)]"
          secondaryClassName="text-[0.54em] font-semibold opacity-60"
        />
      </p>
      <p className="mt-1 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        Annual tenancy, agreed with the agent after an inspection.
      </p>

      <ol className="mt-4 space-y-3 border-t border-[var(--nf-border-subtle)] pt-4">
        {STEPS.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3">
            <span className="nf-numeric mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--nf-border-subtle)] text-[0.75rem] font-bold text-[var(--nf-content-secondary)]">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
                {step.label}
              </span>
              <span className="block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                {step.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <ButtonLink
        href={`/messages/new?listing=${listingId}`}
        variant="primary"
        full
        className="mt-4"
        leadingIcon="chat-bubble"
      >
        <UiIcon name="chat-bubble" size={16} />
        Message agent
      </ButtonLink>

      {/* The trust block: an object large enough to read as content, so this is
          the one place on the panel that takes a 3D brand icon. */}
      <div className="mt-4 flex items-start gap-3 border-t border-[var(--nf-border-subtle)] pt-4">
        <span className="block h-11 w-11 shrink-0">
          <BrandIcon name="shield-check" fill />
        </span>
        <p className="text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
          For your safety, keep every chat and payment inside RentMe. Deals made outside the
          platform are not protected by us. Pay only after you have inspected the property.
        </p>
      </div>
    </div>
  );
}
