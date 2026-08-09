import type { Listing } from "@/lib/listings/types";
import { TENURE_LABEL, SALE_STATUS_LABEL } from "@/lib/listings/pricing";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "@/components/app/Screen";

/**
 * What you would actually be buying: the title.
 *
 * On a Nigerian sale this is the single most consequential fact on the page and
 * the page did not carry it. "Certificate of Occupancy" and "Governor's
 * Consent" are not decoration, they are the difference between a transaction
 * and a dispute, and every buyer in this market asks for them by name.
 *
 * THE VOCABULARY IS THE REAL ONE. `TENURE_LABEL` mirrors `public.land_tenure`
 * exactly, so the words on this page are the words in the database and the
 * words a lawyer would use. Nothing is paraphrased into something friendlier.
 *
 * SILENCE IS STATED, NOT SMOOTHED OVER. A sale listing whose lister named no
 * title renders the absence as its own plain sentence rather than hiding the
 * row. Omitting it would let a reader assume a title exists, which is exactly
 * the assumption that costs people money here. This is the same rule the
 * utilities block already follows for light and water: an unanswered question
 * is rendered as unanswered and points at the one control that gets a real
 * answer.
 *
 * Rendered for sale listings only. A tenancy conveys no title, so on a rental
 * this component is not asked for at all.
 */
export function ListingTenure({ listing }: { listing: Listing }) {
  const tenure = listing.tenure ? TENURE_LABEL[listing.tenure] : null;
  const status = listing.saleStatus ? SALE_STATUS_LABEL[listing.saleStatus] : null;

  return (
    <div data-testid="listing-tenure">
      <div className="flex items-start gap-3">
        <UiIcon
          name={tenure ? "document" : "info"}
          size={ICON.section}
          className="mt-0.5 shrink-0 text-[var(--nf-content-muted)]"
        />
        <div className="min-w-0">
          <p className={TYPE.label}>Title</p>
          {tenure ? (
            <>
              <p className="mt-1 text-[1.125rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
                {tenure}
              </p>
              <p className={`mt-1.5 ${TYPE.body}`}>
                The title the seller states they hold. Have your own solicitor
                verify it at the land registry before any money changes hands.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[1.125rem] font-semibold leading-snug text-[var(--nf-content-primary)]">
                No title stated
              </p>
              <p className={`mt-1.5 ${TYPE.body}`}>
                The seller has not said what title comes with this property. That
                is not the same as there being none, and it is not the same as
                there being one. Ask them directly, and have a solicitor check
                the registry before you commit to anything.
              </p>
            </>
          )}
        </div>
      </div>

      {status && (
        <p className={`mt-4 ${TYPE.body}`}>
          <span className="font-semibold text-[var(--nf-content-primary)]">{status}</span>
          {listing.saleStatus === "under_offer" &&
            " - an offer has been accepted, but the sale has not completed."}
          {listing.saleStatus === "sold" && " - this property is no longer available."}
        </p>
      )}
    </div>
  );
}
