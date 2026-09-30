import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ListingCard } from "@/components/app/ListingCard";
import { EmptyState } from "@/components/app/Screen";
import { Unreachable } from "@/components/app/Unreachable";
import { EmptyActions } from "@/components/app/EmptyActions";
import { SHELF } from "../f3/fixtures";
import { DetailsDeck } from "./DetailsDeck";

/**
 * The details pass on one page, from fixtures: the one toast (swipe it), the
 * done check, the late spinner, blur validation and the counter, the naira
 * field, the phone field, the connection line, the card menu (hold a card),
 * pull to refresh and back to top (scroll down, then up).
 */
export default async function PreviewDetails() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">The small things</h1>
      <DetailsDeck />
      <h2 className="nf-section-label mt-section">Hold a card</h2>
      <div className="mt-sm grid grid-cols-2 gap-sm">
        {SHELF.slice(0, 4).map((listing, i) => (
          <ListingCard key={listing.id} listing={listing} locale={locale} t={t} index={i} dense />
        ))}
      </div>
      <h2 className="nf-section-label mt-section">Empty and unreachable</h2>
      <EmptyState
        icon="contract-sign"
        title="No agreements yet"
        body="An agreement is drawn up after an inspection report is submitted, or when a host accepts your stay."
        action={<EmptyActions primary={{ label: "Find a place", href: "/search" }} />}
      />
      <Unreachable noun="agreements" icon="contract-sign" />
      {/* Long enough for back to top to be offered. */}
      <div aria-hidden="true" style={{ height: "300vh" }} />
    </main>
  );
}
