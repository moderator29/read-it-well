import Link from "next/link";
import { BrandIcon, type BrandIconProp } from "@/design-system/icons/BrandIcon";
import type { PropertyType } from "@/lib/interests/property-types";
import { orderSpaceTypes, type SpaceTypeKey } from "./space-types";

/**
 * SPACES BY TYPE, PERSONALISED BY WHAT SOMEBODY SAID THEY CAME FOR (Session 3,
 * W2; handoff section 2 "`/home` ignores the interests it collects").
 *
 * The welcome screen asks which markets a person came for and stores the
 * answer in `profiles.interests`; `/search` already orders an unfiltered shelf
 * by it. Home ignored it. This row is home's answer: the space types the
 * person named come first and are marked as theirs, in the order they would
 * meet them, and the rest follow so nothing is hidden from them. With no
 * answer stored, the row is the plain set in the catalogue's own order, which
 * is the generic surface rendered honestly rather than a guess at intent.
 *
 * TIER A OBJECTS (D29). A space type is a real thing a person has seen, so it
 * is drawn as a real place: the apartment block, the gated house, the plot
 * with its survey pegs. Every object here is from the one accepted Tier A set,
 * at one size, so the row reads as a set (a row that mixes materials is the
 * failure D29 names). Hotels, shortlets and restaurants are the Stays side and
 * are not on the Property home, the same rule the featured shelf keeps
 * (UX-04).
 *
 * Every door is a filter on `/search?type=`, the one vocabulary the catalogue
 * is filed under, so a tap lands on the real shelf for that type.
 */
const SPACE_OBJECT: Record<SpaceTypeKey, BrandIconProp> = {
  rental: "midrise-block",
  apartment: "apartment-block",
  home: "family-house-gate",
  villa: "villa-pool",
  land: "land-plot",
  shop: "retail-shop",
  office: "office-tower",
};

export function SpaceTypeRow({
  interests,
  copy,
}: {
  interests: readonly PropertyType[];
  copy: {
    title: string;
    forYou: string;
    label: string;
    mine: string;
    edit: string;
    types: Record<SpaceTypeKey, string>;
  };
}) {
  const ordered = orderSpaceTypes(interests);
  const personal = ordered.some((entry) => entry.mine);
  return (
    <section className="nf-space-types mt-section-tight" data-testid="home-space-types" data-personal={personal || undefined}>
      <div className="nf-feature-head">
        <h2 className="nf-h3">{personal ? copy.forYou : copy.title}</h2>
        {personal ? (
          <Link href="/settings/interests" className="nf-link-quiet nf-body-sm inline-flex min-h-11 items-center text-[var(--nf-content-link)]">
            {copy.edit}
          </Link>
        ) : null}
      </div>
      <nav aria-label={copy.label}>
        <ul className="nf-space-types__row nf-scroll-x nf-scroll-x--gutter">
          {ordered.map(({ type, mine }) => (
            <li key={type} className="nf-space-types__item">
              <Link
                href={`/search?type=${type}`}
                className="nf-space-type"
                data-mine={mine || undefined}
                data-testid={`home-space-type-${type}`}
              >
                <span className="nf-space-type__object" aria-hidden="true">
                  <BrandIcon name={SPACE_OBJECT[type]} size={64} />
                </span>
                <span className="nf-space-type__label">{copy.types[type]}</span>
                {mine ? <span className="nf-space-type__mine">{copy.mine}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
