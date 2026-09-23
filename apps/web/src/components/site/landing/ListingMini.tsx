import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@vallo/i18n";
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
 * The badge is `Verified` only when the record says the lister was checked
 * by a person. Otherwise it is the market ("To rent", "For sale"), which is
 * true of every listing and dresses nothing up.
 */
export function ListingMini({
  listing,
  locale,
  verifiedLabel,
  saveLabel,
  sizes = "(max-width: 640px) 80vw, 248px",
  priority = false,
}: {
  listing: MiniListing;
  locale: Locale;
  verifiedLabel: string;
  saveLabel?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Link href={listing.href} className="block" prefetch={false}>
      <div className="nf-landing-float-media">
        <MediaFrame hue={listing.hue} kind={listing.kind} />
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
        <span
          className={`nf-badge ${listing.verified ? "nf-badge--verified" : "nf-badge--info"} nf-landing-float-badge`}
        >
          {listing.verified && <UiIcon name="verified" size={12} aria-hidden />}
          {listing.verified ? verifiedLabel : listing.market}
        </span>
        {saveLabel && (
          <span className="nf-landing-float-save" aria-hidden="true">
            <span>
              <UiIcon name="heart" size={14} />
            </span>
          </span>
        )}
      </div>
      <div className="nf-landing-float-body">
        <h3 className="nf-landing-float-title">{listing.title}</h3>
        <div className="nf-landing-float-row">
          <span className="nf-landing-float-place">
            <UiIcon name="location" size={12} aria-hidden />
            <span className="truncate">{listing.place}</span>
          </span>
          <span className="nf-landing-float-price">
            <Amount
              minorUnits={listing.priceMinor}
              locale={locale}
              currency={listing.currency}
              glance
              suffix={listing.suffix}
              className="nf-numeric"
              secondaryClassName="text-[0.7em] font-semibold opacity-70"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
