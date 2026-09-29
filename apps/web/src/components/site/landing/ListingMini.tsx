import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { MediaFrame } from "@/components/app/MediaFrame";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MiniListing } from "@/lib/site/listing-card";

/**
 * The small floating listing card the landing uses on the hero, in the
 * community stack and on the drawn phone. Photo on the platform's media
 * frame, the badge, the title, the place, the price through <Amount> on
 * integer kobo with the suffix the record dictates.
 *
 * The badge is "Example" on an example listing, `Verified` only when the
 * record says the lister was checked by a person, and otherwise the market
 * ("To rent", "For sale"), which is true of every listing and dresses
 * nothing up.
 */
export function ListingMini({
  listing,
  locale,
  verifiedLabel,
  exampleLabel,
  saveLabel,
  sizes = "(max-width: 640px) 80vw, 248px",
  priority = false,
}: {
  listing: MiniListing;
  locale: Locale;
  verifiedLabel: string;
  /** The word an example listing's badge says: "Example". */
  exampleLabel: string;
  saveLabel?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Link href={listing.href} className="block" prefetch={false}>
      <div className="nf-landing-float-media">
        <MediaFrame hue={listing.hue} kind={listing.kind} drawn={listing.drawn} />
        {listing.photo && (
          <Image
            src={listing.photo}
            alt={listing.title}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
          />
        )}
        {/* THE EXAMPLE DISCLOSURE (UIUX item 6). An example listing says
            "Example" where the market would be, with the same shared
            `nf-badge--example` class the in-app cards use; an example is never
            verified (the database's check constraint), so the two marks
            cannot meet. `example-notice.test.ts` guards this line. */}
        {listing.example ? (
          <span className="nf-badge nf-badge--example nf-landing-float-badge">
            <UiIcon name="info" size={12} aria-hidden />
            {exampleLabel}
          </span>
        ) : (
          <span
            className={`nf-badge ${listing.verified ? "nf-badge--verified" : "nf-badge--info"} nf-landing-float-badge`}
          >
            {listing.verified && <UiIcon name="verified" size={12} aria-hidden />}
            {listing.verified ? verifiedLabel : listing.market}
          </span>
        )}
        {saveLabel && (
          <span className="nf-landing-float-save" aria-hidden="true">
            <span>
              <UiIcon name="heart" size={16} />
            </span>
          </span>
        )}
      </div>
      <div className="nf-landing-float-body">
        <h3 className="nf-landing-float-title" title={listing.title}>
          {listing.title}
        </h3>
        <div className="nf-landing-float-row">
          <span className="nf-landing-float-place">
            <UiIcon name="location" size={12} aria-hidden />
            <span className="line-clamp-2 [overflow-wrap:anywhere]" title={listing.place}>
              {listing.place}
            </span>
          </span>
          <span className="nf-landing-float-price">
            <Amount
              minorUnits={listing.priceMinor}
              locale={locale}
              currency={listing.currency}
              glance
              suffix={listing.suffix}
              className="nf-numeric"
              secondaryClassName="text-[max(0.7em,0.6875rem)] font-semibold opacity-70"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
