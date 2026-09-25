import Image from "next/image";
import { panelClass } from "@/components/ui/Panel";
import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { MessageVenue } from "@/components/stays/MessageVenue";
import { ListingAbout } from "./ListingAbout";
import { ICON } from "@/components/app/Screen";

/**
 * THE ONE DETAIL ANATOMY, as B047A0CE draws it.
 *
 * The founder's send-back names five parts in one order, and the stay face and
 * the restaurant face are the same face with different facts in it:
 *
 *   1. a bordered strip of spec pairs under the pin line, hairline-separated;
 *   2. the price in blue with its unit, and the rating on the same row;
 *   3. a row of small amenity capsules, each with its glyph;
 *   4. an About card whose body is followed by a divider and a host row;
 *   5. a titled availability card holding the two date fields and the blue
 *      call to action under them.
 *
 * They live here rather than in either page because two pages drawing the same
 * five shapes from two files is how the two drifted apart in the first place.
 * Every part takes ALREADY-RESOLVED content: a formatted figure, a label a
 * dictionary produced, a href the caller knows is real. Nothing in this file
 * reads a record, formats money, or decides whether a fact is true, so nothing
 * here can invent one.
 *
 * WHAT IS DELIBERATELY NOT HERE. The render's gold star is blue (direction
 * section 1.3, ledger rule 8) and the rating is drawn only when the caller
 * passes one, which the callers only do when real review rows exist. There is
 * no "no rating yet" placeholder and no star outline: an absent rating is an
 * absent row.
 */

export type SpecPair = { key: string; icon: UiIconName; label: string };

/**
 * The spec strip: up to three pairs in a bordered box, separated by hairlines.
 *
 * Three is the render's count and it is also the most that reads at 390
 * without either wrapping or dropping under the type floor. A caller with
 * fewer real facts passes fewer; the cells then share the width evenly, which
 * is what the render does for its three.
 */
export function DetailSpecStrip({ pairs }: { pairs: SpecPair[] }) {
  const shown = pairs.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <ul className="nf-spec-strip" data-testid="spec-strip">
      {shown.map((pair) => (
        <li key={pair.key} className="nf-spec-strip__cell">
          <UiIcon name={pair.icon} size={ICON.inline} />
          <span className="min-w-0">{pair.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The price row: the figure in brand blue with its unit, and the rating.
 *
 * `figure` arrives already formatted, because money is only ever formatted by
 * `formatMoney` and only ever by the caller that owns the record.
 */
export function DetailPriceRow({
  figure,
  unit,
  rating,
}: {
  figure: ReactNode;
  /** What the figure buys: "a night", "/ year", "a head". */
  unit: string;
  /**
   * The guest rating, ONLY where real review rows stand behind it: the
   * average as the locale writes it, and the count already in its brackets.
   */
  rating?: { average: string; reviews: string } | null;
}) {
  return (
    <div className="nf-detail-price-row" data-testid="detail-price-row">
      <p className="nf-detail-price">
        <span className="nf-detail-price__figure">{figure}</span>
        <span className="nf-detail-price__unit">{unit}</span>
      </p>
      {rating && (
        <p className="nf-detail-rating" data-testid="detail-rating">
          {/* Blue. The renders draw this star gold and the direction is
              explicit that a warm hue becomes its blue-family equivalent. */}
          <UiIcon name="star" size={14} filled />
          <span className="nf-numeric font-semibold">{rating.average}</span>
          <span className="nf-detail-rating__count">{rating.reviews}</span>
        </p>
      )}
    </div>
  );
}

/** The small capsule row: a glyph and a word per capsule, four at most. */
export function DetailCapsules({
  items,
  label,
}: {
  items: { key: string; icon: UiIconName; label: string }[];
  /** What the row is, for a screen reader; the capsules carry no heading. */
  label: string;
}) {
  const shown = items.slice(0, 4);
  if (shown.length === 0) return null;
  return (
    /* DOC-21: the row scrolls sideways when the capsules do not fit, so it is
       focusable (axe `scrollable-region-focusable`); it is already named. */
    <ul className="nf-detail-capsules nf-scroll-x" aria-label={label} tabIndex={0} data-testid="detail-capsules">
      {shown.map((item) => (
        <li key={item.key} className="nf-detail-capsule">
          <UiIcon name={item.icon} size={14} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export type DetailHost = {
  /** The host's own name: a business, an agency, a person who was checked. */
  name: string;
  /** The line under the name. What they are to this property, never invented. */
  role: string;
  /** Drawn only where a human was checked (ledger rule 12). */
  verified: boolean;
  verifiedLabel: string;
  /** The host's own photograph, where the read carries one. */
  photoUrl?: string | null;
  /**
   * Where the Message button goes, and NULL where there is nowhere for it to
   * go. `startConversation` binds a thread to a listing, so a business-grade
   * venue (M7, no listing row) has no thread to open: the host row then draws
   * the name and the shield and no button, because a control that cannot act
   * is never drawn. It is not a reason to hide the host.
   */
  messageHref?: string | null;
  /**
   * A hotel or restaurant with no listing row: the Message control opens the
   * first-message sheet keyed on the BUSINESS instead (`MessageVenue`). Used
   * only where `messageHref` is null; a listing-backed venue keeps its link.
   */
  messageVenue?: { businessId: string; venueName: string } | null;
  messageLabel: string;
};

/**
 * The About card: the body, a divider, and the host row beneath it.
 *
 * The host row is the render's: a round photograph, the shield with
 * "Verified host", the name, and a glass Message button on the right. The
 * button is the real conversation bridge, gated like every other action a
 * signed-out reader may look at but not take.
 */
export function DetailAboutCard({
  title,
  paragraphs,
  host,
}: {
  title: string;
  paragraphs: string[];
  host?: DetailHost | null;
}) {
  if (paragraphs.length === 0 && !host) return null;
  return (
    <section className={panelClass({ variant: "card", className: "nf-detail-lead" })} data-testid="about-card">
      <h2 className="nf-detail-panel__title">{title}</h2>
      {paragraphs.length > 0 && (
        <div className="mt-row">
          <ListingAbout paragraphs={paragraphs} />
        </div>
      )}
      {host && (
        <>
          <hr className="nf-detail-hairline" />
          <div className="nf-host-row" data-testid="host-row">
            <span className="nf-host-row__avatar">
              {host.photoUrl ? (
                <Image src={host.photoUrl} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                /* UX-09: the person-with-a-tick is the verified mark's own
                   shape, so an unchecked host gets the plain person card. */
                <BrandIcon name={host.verified ? "user-check" : "person-card"} fill />
              )}
            </span>
            <span className="nf-host-row__body">
              {host.verified ? (
                <span className="nf-host-row__title">
                  <UiIcon name="verified" size={14} />
                  {host.verifiedLabel}
                </span>
              ) : (
                <span className="nf-host-row__title nf-host-row__title--plain">{host.role}</span>
              )}
              <span className="nf-host-row__name">{host.name}</span>
            </span>
            {!host.messageHref && host.messageVenue && (
              <AuthGate action="message">
                <MessageVenue
                  businessId={host.messageVenue.businessId}
                  venueName={host.messageVenue.venueName}
                  label={host.messageLabel}
                />
              </AuthGate>
            )}
            {host.messageHref && (
              <AuthGate action="message">
                <ButtonLink
                  href={host.messageHref}
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  data-testid="host-message"
                >
                  {host.messageLabel}
                </ButtonLink>
              </AuthGate>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export type DetailDateField = {
  key: string;
  /** "Check in", "Check out". */
  label: string;
  /** The picked date as the locale writes it, or the "Select date" prompt. */
  value: string;
  href: string;
  /** The glyph. The calendar unless the field is not about a date. */
  icon?: UiIconName;
};

/**
 * The availability card: the titled box holding the two date fields side by
 * side and the full-width call to action under them.
 *
 * Each field is a link rather than a control that opens a popover, because the
 * dates ride the URL on this platform: the picker IS a page, so a link is the
 * honest affordance and it works with no script at all.
 */
export function DetailAvailabilityCard({
  title,
  fields,
  action,
  note,
}: {
  title: string;
  fields: DetailDateField[];
  action: { label: string; href: string; gate?: "pay" | "message" | null };
  /** One line under the button where the caller has something true to add. */
  note?: string;
}) {
  const button = (
    <ButtonLink
      href={action.href}
      variant="primary"
      size="lg"
      full
      className="nf-detail-availability__action"
      data-testid="detail-book"
    >
      {action.label}
    </ButtonLink>
  );
  return (
    <section className={panelClass({ variant: "card", className: "nf-detail-lead" })} data-testid="availability-card">
      <h2 className="nf-detail-panel__title">{title}</h2>
      {fields.length > 0 && (
        <div className="nf-detail-fields mt-row">
          {fields.map((field) => (
            <Link key={field.key} href={field.href} className="nf-detail-field">
              <UiIcon name={field.icon ?? "calendar-booking"} size={ICON.inline} />
              <span className="min-w-0">
                <span className="nf-detail-field__label">{field.label}</span>
                <span className="nf-detail-field__value">{field.value}</span>
              </span>
              <UiIcon name="chevron-right" size={16} />
            </Link>
          ))}
        </div>
      )}
      <div className="mt-row">
        {action.gate ? <AuthGate action={action.gate}>{button}</AuthGate> : button}
      </div>
      {note && <p className="nf-detail-availability__note">{note}</p>}
    </section>
  );
}
