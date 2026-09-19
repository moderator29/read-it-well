import Image from "next/image";
import Link from "next/link";
import { MediaFrame } from "@/components/app/MediaFrame";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ListingKind } from "@/lib/listings/types";
import { shareHref, type SharedRef } from "./share";

/**
 * The card a listing or a booking becomes inside a chat.
 *
 * GOVERNING-chat-booking-card.png, translated: the photograph with the
 * status badge on it, the name, the stars (blue, by rule 8, and only when a
 * rating is real), the place with its pin, the check-in / check-out / guests
 * grid, the room row with a thumbnail, the features, the price and the
 * nights chip, then the primary and the glass action. A listing card is the
 * same object with the stay facts left out, because it has none.
 *
 * Everything on it is data resolved on the server from the row the share
 * points at (see `app/(app)/messages/[id]/cards.ts`), and both actions are
 * real routes. The forward control hands the same reference to the share
 * picker, which lists the reader's real inbox.
 *
 * No hooks, so it renders on the server and inside the client thread alike.
 */

export type ChatCardListing = {
  kind: "listing";
  id: string;
  title: string;
  area: string;
  city: string;
  photo: string | null;
  hue: number;
  listingKind: ListingKind;
  /** The lister's real admission state. Never defaulted. */
  verified: boolean;
  /** Pre-formatted through formatMoney on the server. */
  priceLabel: string;
  /** "per year", "per night", or "" for a sale. */
  periodLabel: string;
  bedrooms: number;
  bathrooms: number;
  /** 0 to 5, or null when nobody has rated it. */
  rating: number | null;
};

export type ChatCardBooking = {
  kind: "booking";
  id: string;
  listingId: string;
  title: string;
  area: string;
  city: string;
  photo: string | null;
  hue: number;
  listingKind: ListingKind;
  status: string;
  statusLabel: string;
  /** "Jun 22, 2025". */
  checkInLabel: string;
  checkOutLabel: string;
  /** "2 adults", "1 child" and so on, each its own line. */
  partyLines: string[];
  /** The room row: what was booked, and what it comes with. */
  roomName: string;
  features: string[];
  totalLabel: string;
  nightsLabel: string;
  rating: number | null;
};

export type ChatCardData = ChatCardListing | ChatCardBooking;

function Stars({ rating }: { rating: number | null }) {
  if (rating === null || rating <= 0) return null;
  const full = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span className="nf-chat-card__stars" aria-label={`Rated ${rating} out of 5`}>
      {/* Solid, the way the render draws a rating. `star` is one of the
          glyphs authored as a closed silhouette, so `filled` is real here
          rather than paint poured into an outline. Blue by rule 8. */}
      {Array.from({ length: full }, (_, i) => (
        <UiIcon key={i} name="star" size={16} filled />
      ))}
    </span>
  );
}

function Photo({
  photo,
  hue,
  kind,
  alt,
}: {
  photo: string | null;
  hue: number;
  kind: ListingKind;
  alt: string;
}) {
  return (
    <div className="nf-chat-card__photo">
      <MediaFrame hue={hue} kind={kind} ghost={Boolean(photo)} />
      {photo && (
        <Image
          src={photo}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 480px"
          className="object-cover"
        />
      )}
    </div>
  );
}

/** The forward affordance, which every card carries in its foot. */
function Forward({ target }: { target: SharedRef }) {
  return (
    <Link
      href={`/messages/share/${target.kind}/${target.id}`}
      className="nf-chat-card__forward"
      aria-label={`Forward this ${target.kind} to another conversation`}
    >
      <UiIcon name="share" size={16} />
      Forward
    </Link>
  );
}

export function ChatCard({ card, forwardable = true }: { card: ChatCardData; forwardable?: boolean }) {
  if (card.kind === "listing") {
    return (
      <article className="nf-chat-card" data-testid="chat-card-listing" aria-label={card.title}>
        <Photo photo={card.photo} hue={card.hue} kind={card.listingKind} alt="" />
        <div className="nf-chat-card__body">
          <div className="flex items-start justify-between gap-inline-tight">
            <p className="nf-chat-card__title">{card.title}</p>
            {card.verified && (
              <span className="nf-badge nf-badge--verified shrink-0">
                <UiIcon name="verified" size={12} />
                Verified
              </span>
            )}
          </div>
          <Stars rating={card.rating} />
          <p className="nf-chat-card__place">
            <UiIcon name="location" size={16} className="shrink-0 text-[var(--nf-brand-secondary)]" />
            <span>{[card.area, card.city].filter(Boolean).join(", ")}</span>
          </p>
          <div className="nf-chat-card__features mt-inline-tight">
            <span>{card.bedrooms} bed</span>
            <span>{card.bathrooms} bath</span>
          </div>
          <p className="nf-chat-card__price-row">
            <span className="nf-chat-card__price">{card.priceLabel}</span>
            {card.periodLabel && <span className="nf-chat-card__chip">{card.periodLabel}</span>}
          </p>
          <div className="nf-chat-card__actions">
            <Link href={shareHref({ kind: "listing", id: card.id })} className="nf-btn nf-btn--primary nf-btn--md">
              View listing
              <UiIcon name="chevron-right" size={16} />
            </Link>
            <Link href={`/messages/new?listing=${card.id}`} className="nf-btn nf-btn--glass nf-btn--md">
              <UiIcon name="chat-bubble" size={16} />
              Message agent
            </Link>
          </div>
          {forwardable && (
            <div className="nf-chat-card__foot">
              <span>Listing on Vallo</span>
              <Forward target={{ kind: "listing", id: card.id }} />
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="nf-chat-card" data-testid="chat-card-booking" aria-label={card.title}>
      <Photo photo={card.photo} hue={card.hue} kind={card.listingKind} alt="" />
      <div className="nf-chat-card__badge">
        <StatusPill tone={toneForStatus(card.status)} size="sm">
          {card.statusLabel}
        </StatusPill>
      </div>
      <div className="nf-chat-card__body">
        <p className="nf-chat-card__title">{card.title}</p>
        <Stars rating={card.rating} />
        <p className="nf-chat-card__place">
          <UiIcon name="location" size={16} className="shrink-0 text-[var(--nf-brand-secondary)]" />
          <span>{[card.area, card.city].filter(Boolean).join(", ")}</span>
        </p>

        <dl className="nf-chat-card__facts">
          <div className="nf-chat-card__fact">
            <UiIcon name="calendar-booking" size={16} className="nf-chat-card__fact-glyph" />
            <div className="min-w-0">
              <dt className="nf-chat-card__fact-label">Check in</dt>
              <dd className="nf-chat-card__fact-value">{card.checkInLabel}</dd>
            </div>
          </div>
          <div className="nf-chat-card__fact">
            <UiIcon name="calendar-booking" size={16} className="nf-chat-card__fact-glyph" />
            <div className="min-w-0">
              <dt className="nf-chat-card__fact-label">Check out</dt>
              <dd className="nf-chat-card__fact-value">{card.checkOutLabel}</dd>
            </div>
          </div>
          <div className="nf-chat-card__fact">
            <UiIcon name="user" size={16} className="nf-chat-card__fact-glyph" />
            <div className="min-w-0">
              <dt className="nf-chat-card__fact-label">Guests</dt>
              {card.partyLines.map((line, i) => (
                <dd key={line} className={i === 0 ? "nf-chat-card__fact-value" : "nf-chat-card__fact-sub"}>
                  {line}
                </dd>
              ))}
            </div>
          </div>
        </dl>

        <div className="nf-chat-card__room">
          <div className="nf-chat-card__thumb">
            <div className="relative h-full w-full">
              <MediaFrame hue={card.hue} index={1} kind={card.listingKind} ghost={Boolean(card.photo)} />
              {card.photo && <Image src={card.photo} alt="" fill sizes="96px" className="object-cover" />}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="nf-chat-card__room-name">{card.roomName}</p>
            {card.features.length > 0 && (
              <div className="nf-chat-card__features">
                {card.features.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
            )}
            <p className="nf-chat-card__price-row">
              <span className="nf-chat-card__price">{card.totalLabel}</span>
              <span className="nf-chat-card__chip">{card.nightsLabel}</span>
            </p>
          </div>
        </div>

        <div className="nf-chat-card__actions">
          <Link href={shareHref({ kind: "booking", id: card.id })} className="nf-btn nf-btn--primary nf-btn--md">
            View booking details
            <UiIcon name="chevron-right" size={16} />
          </Link>
          <Link href={`/messages/new?listing=${card.listingId}`} className="nf-btn nf-btn--glass nf-btn--md">
            <UiIcon name="chat-bubble" size={16} />
            Contact host
          </Link>
        </div>
        {forwardable && (
          <div className="nf-chat-card__foot">
            <span>Booking on Vallo</span>
            <Forward target={{ kind: "booking", id: card.id }} />
          </div>
        )}
      </div>
    </article>
  );
}
