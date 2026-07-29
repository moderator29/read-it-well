import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import { PageHeader } from "@/components/app/PageHeader";
import { ListingCard } from "@/components/app/ListingCard";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = { title: "Saved" };

/**
 * The shortlist this account has hearted, resolved from the live catalogue so
 * the grid carries real photography and pricing. Falls back to the first
 * stays in the catalogue if any id ever leaves the seed.
 */
const SAVED_IDS = ["seed-1", "seed-3", "seed-8", "seed-16"];

async function getSavedListings(): Promise<Listing[]> {
  const repo = getListingRepository();
  const picked = await Promise.all(SAVED_IDS.map((id) => repo.byId(id)));
  const saved = picked.filter((l): l is Listing => l !== null);
  if (saved.length >= SAVED_IDS.length) return saved;
  const pool = (await repo.search()).filter(
    (l) => !saved.some((s) => s.id === l.id),
  );
  return [...saved, ...pool].slice(0, SAVED_IDS.length);
}

/**
 * Saved.
 *
 * The shortlist: every place the guest has hearted, kept together and ready
 * to compare or book. Cards are the same `ListingCard` used across discovery,
 * so saving never changes how a place reads.
 */
export default async function SavedPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const saved = await getSavedListings();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.nav.saved} />

      <Reveal>
        <p className="mb-4 flex items-center gap-2 text-[0.875rem] text-[var(--nf-content-secondary)]">
          <UiIcon
            name="heart"
            size={16}
            className="shrink-0 text-[var(--nf-electric-300)]"
          />
          <span>
            <span className="font-semibold text-[var(--nf-content-primary)]">
              {saved.length} {saved.length === 1 ? "place" : "places"} saved
            </span>{" "}
            &middot; ready to compare or book
          </span>
        </p>
      </Reveal>

      <Reveal delay={60}>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {saved.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} locale={locale} t={t} />
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
