import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { compoundFacts, type Compound, type CompoundFact } from "@/lib/listings/compound";

/**
 * The compound, on the listing page (V-28): the lister's answers to the five
 * questions asked at every Lagos viewing, as a row of tiles in the spec
 * tiles' own style.
 *
 * Only what was answered is drawn. An unanswered question draws nothing,
 * never "not stated" and never a cross: the claims rule, and the pattern the
 * spec chips above already follow. With nothing answered the whole block is
 * absent, which is the state every example listing is in today.
 */
const ICON_OF: Record<CompoundFact["key"], UiIconName> = {
  parking: "parking",
  flats: "building-apartment",
  landlord: "house",
  waste: "trash",
  car: "key",
};

export function ListingCompound({
  compound,
  copy,
}: {
  compound: Compound | undefined;
  copy: Dictionary["shape"]["compound"];
}) {
  const facts = compoundFacts(compound, copy);
  if (facts.length === 0) return null;
  return (
    <section aria-label={copy.title} data-testid="listing-compound">
      <p className="nf-overline text-[var(--nf-content-muted)]">{copy.title}</p>
      {/* Whose answers these are, said once: the lister's, not Vallo's. */}
      <p className="nf-caption mt-2xs text-[var(--nf-content-secondary)]">{copy.lede}</p>
      <ul className="nf-spec-row nf-scroll-x mt-inline">
        {facts.map((fact) => (
          <li key={fact.key} className="nf-spec-tile" data-fact={fact.key}>
            <UiIcon name={ICON_OF[fact.key]} size={ICON.inline} />
            <span>{fact.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
