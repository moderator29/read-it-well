"use client";

import { getDictionary, isGlanceCompact, plural, type Locale } from "@vallo/i18n";
import { useStayDatesOptional } from "./StayDates";
import { ButtonLink } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { ActionBar } from "@/components/ui/ActionBar";
import { Amount } from "@/components/ui/Amount";

/**
 * The listing's pinned action bar.
 *
 * This was a floating `nf-card` that sat in the document flow with
 * `sticky bottom-…` and `lg:hidden`, which produced two failures the audit
 * calls P0. It read as a card hovering over the page rather than as the
 * blurred footer every reference screen ends with, and from `lg` up it was not
 * rendered at all, so the widest viewport - the one a listing gets shared to on
 * a desktop - had no call to action anywhere on the screen.
 *
 * It is now the `ActionBar` primitive, which the audit found shipped and used
 * zero times. That primitive owns the three things this file kept getting
 * wrong: the blur (so the content reads as passing beneath the bar rather than
 * stopping at a seam), the home-indicator inset, and the stacking level. This
 * file is left with what is genuinely local: what the bar quotes, and which
 * actions the market allows.
 *
 * Reference 3 ends on a PAIR - a hairline ghost pill beside the solid one - and
 * so does this, where a second action honestly exists. A stay pairs Message
 * agent with Check availability; a partner restaurant pairs its menu with
 * directions. A rental has exactly one path (message the agent, inspect, then
 * pay) so it carries one full-strength button and no invented companion.
 *
 * What it quotes is never a guess: once real dates are picked it shows the very
 * total the reserve panel is about to submit, in integer kobo through
 * `<Amount>`, beside the nights it covers. Until then it shows the listing's
 * own rate and what that rate buys.
 */

export type StickyAction = {
  label: string;
  href: string;
  /** Off-platform destinations open in a new tab. */
  external?: boolean;
};

export function ListingStickyBar({
  variant,
  priceMinor,
  currency,
  locale,
  perLabel,
  action,
  secondary,
  fallbackLabel,
  moveInMinor,
  moveInStated,
}: {
  variant: "stay" | "rental" | "partner";
  priceMinor: number;
  currency: string;
  locale: Locale;
  /** What the rate buys, e.g. "per night" or "per year". */
  perLabel: string;
  action: StickyAction | null;
  /**
   * The ghost half of the pair. Rendered only when the market actually has a
   * second thing to do; never a decorative twin of the primary.
   */
  secondary?: StickyAction | null;
  /** Shown instead of a price when the listing carries no real rate. */
  fallbackLabel: string;
  /**
   * The move-in total in kobo, on a tenancy that states one.
   *
   * WHY THE PINNED BAR QUOTES IT RATHER THAN THE RENT. This bar is the last
   * figure a person reads before they act, and on a Nigerian tenancy the rent
   * is not the figure they have to find: `PRODUCT.md` section 5 makes the
   * move-in total the number the product leads with, the card now does, and a
   * bar quoting 4.5m under a page whose own panel says 6.8m is the product
   * disagreeing with itself in the two places a reader compares.
   *
   * Absent on a stay, on a sale, and on the 24 rows in 64 whose lister named
   * neither a total nor a part. In all of those the rate is the honest figure
   * and nothing changes.
   */
  moveInMinor?: number;
  /** False when the total is a floor summed from the parts, so it reads "from". */
  moveInStated?: boolean;
}) {
  // Only a stay has a date picker to read from; the hook is optional so the
  // same bar renders on rental and partner pages with no provider above it.
  const stay = useStayDatesOptional();
  const quoting = variant === "stay" && stay !== null && stay.ready && stay.totalMinor > 0;

  /* A picked set of dates outranks everything: it is the very total the
     reserve panel is about to submit. Otherwise a tenancy quotes what it costs
     to move in and everything else quotes its own rate. */
  const moveIn = variant === "rental" && (moveInMinor ?? 0) > 0 ? moveInMinor! : null;
  const amount = quoting && stay ? stay.totalMinor : (moveIn ?? priceMinor);

  /* The caption once dates are picked. It was built by gluing an English
     ternary onto an English preposition, so a Yoruba reader was quoted a total
     in their own currency format under an English sentence. Both the sentence
     and the night count come from the dictionary now, and the count picks its
     form from `Intl.PluralRules` rather than from an assumption that every
     language has a singular and a plural. */
  const t = getDictionary(locale);
  const caption =
    quoting && stay
      ? t.reserve.totalForNights.replace("{nights}", plural(stay.nights, t.counts.nights, locale))
      : moveIn
        ? "to move in"
        : perLabel;

  const external = (a: StickyAction) =>
    a.external ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};

  return (
    /*
     * `aboveTabBar` is off because `/listing/[id]` is not one of
     * `TAB_BAR_ROUTES`, so there is no floating tab bar on this screen to lift
     * clear of. The bar sits on the edge itself, which is where reference 3
     * puts it.
     */
    <ActionBar>
      <div
        data-testid="listing-sticky-bar"
        className="flex w-full items-center gap-2.5 sm:gap-sm"
      >
        <p className="flex min-w-0 flex-1 flex-col">
          {amount > 0 ? (
            <>
              {/* No `truncate` on a price: a clipped figure states a wrong
                  number. The bar's own layout gives this column the room. */}
              <span data-testid="sticky-total" className="min-w-0">
                {/* "from" sits before the figure rather than in the caption
                    after it. The caption tried to carry it as "to move in, from
                    the parts named" and at 390px, in a column the two buttons
                    have already narrowed, that wrapped to four lines and made
                    the bar taller than the decision on it. Four characters in
                    front of the number say the same thing and the card says it
                    the same way. */}
                {moveIn && moveInStated !== true && (
                  <span className="text-[var(--nf-text-overline)] font-semibold text-[var(--nf-content-muted)]">
                    from{" "}
                  </span>
                )}
                <Amount
                  minorUnits={amount}
                  locale={locale}
                  currency={currency}
                  /*
                   * The glance rule, so a yearly rent reads ₦4.5m in a bar
                   * that also has to hold two buttons on a 390px screen,
                   * while a nightly rate keeps the full figure somebody is
                   * comparing against the listing below it.
                   */
                  glance
                  className="text-[var(--nf-text-body-lg)] font-bold leading-none tracking-[-0.02em] text-[var(--nf-content-primary)]"
                  /* A compacted figure's fraction is a SIGNIFICANT DIGIT, not
                     kobo: ₦6,750,000 splits into "₦6", ".8" and "m", and the
                     default muted tail draws that ".8" at 0.62em, so the bar
                     read as ₦6 on a figure worth ₦6.8m. It keeps the figure's
                     own size whenever the glance rule has compacted. Same rule,
                     same reason, as the card. */
                  secondaryClassName={
                    isGlanceCompact(amount) ? "" : "text-[0.62em] font-semibold opacity-60"
                  }
                />
              </span>
              {/* No `truncate`. A caption that reads "to move in, from the p..."
                  is a promise trimmed into a different promise, and this column
                  has the room to wrap. */}
              <span className="text-[var(--nf-text-overline)] leading-snug text-[var(--nf-content-muted)]">
                {caption}
              </span>
            </>
          ) : (
            /* The property's name, on the bar a person acts from, and it was
               clipped. This is the branch where the listing carries no real
               rate, so the title is the ONLY thing the bar says about what the
               button is for: "Five bedroom villa for sale in Oniru Vict..." is
               the one sentence on the screen, cut. It wraps, and the bar grows
               by a line on the few rows that need it. */
            <span className="text-[var(--nf-text-body-sm)] font-semibold leading-snug text-[var(--nf-content-primary)] [overflow-wrap:anywhere]">
              {fallbackLabel}
            </span>
          )}
        </p>

        {/*
          The ghost half. On a 390px screen the pair plus a price does not fit
          three labels wide, so the ghost keeps its glyph and drops its label
          until there is room for it - the label stays in the accessible name
          throughout, so the control is never unlabelled to a screen reader.
        */}
        {/*
          BOTH HALVES GATE, and they gate to different verbs.

          A guest reaching this bar is allowed to be here - the property page is
          open to anybody - so these controls are drawn at full strength rather
          than hidden or disabled. What they do differs: with a session they go
          where they say, and without one they open sign-up carrying this
          listing's URL and the verb, so signing in lands the person back on
          this property with the same button under their thumb.

          The verbs are inferred from the market rather than passed in, because
          they are already determined by it: the ghost half is always the
          conversation, and the solid half is the inspection on a rental and the
          payment on a stay. A fourth combination would mean a new market, and a
          new market has to be described here anyway.
        */}
        {secondary && (
          <AuthGate action="message">
            <ButtonLink
              href={secondary.href}
              {...external(secondary)}
              variant="ghost"
              leadingIcon={variant === "partner" ? "arrow-right" : "chat-bubble"}
              aria-label={secondary.label}
              className="shrink-0"
            >
              <span className="nf-btn__label hidden sm:inline">{secondary.label}</span>
            </ButtonLink>
          </AuthGate>
        )}

        {action && (
          <AuthGate action={variant === "rental" ? "inspect" : "pay"}>
            <ButtonLink
              href={action.href}
              {...external(action)}
              variant="primary"
              className="shrink-0"
            >
              {action.label}
            </ButtonLink>
          </AuthGate>
        )}
      </div>
    </ActionBar>
  );
}
