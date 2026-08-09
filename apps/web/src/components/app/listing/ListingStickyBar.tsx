"use client";

import { getDictionary, plural, type Locale } from "@naijafinds/i18n";
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
}) {
  // Only a stay has a date picker to read from; the hook is optional so the
  // same bar renders on rental and partner pages with no provider above it.
  const stay = useStayDatesOptional();
  const quoting = variant === "stay" && stay !== null && stay.ready && stay.totalMinor > 0;

  const amount = quoting && stay ? stay.totalMinor : priceMinor;

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
        className="flex w-full items-center gap-2.5 sm:gap-3"
      >
        <p className="flex min-w-0 flex-1 flex-col">
          {amount > 0 ? (
            <>
              {/* No `truncate` on a price: a clipped figure states a wrong
                  number. The bar's own layout gives this column the room. */}
              <span data-testid="sticky-total" className="min-w-0">
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
                  className="text-[1.0625rem] font-bold leading-none tracking-[-0.02em] text-[var(--nf-content-primary)]"
                />
              </span>
              <span className="truncate text-[0.75rem] text-[var(--nf-content-muted)]">
                {caption}
              </span>
            </>
          ) : (
            <span className="truncate text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
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
