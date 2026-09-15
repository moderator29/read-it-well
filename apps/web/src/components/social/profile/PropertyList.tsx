import Link from "next/link";
import { formatMoney } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { PropertyCard } from "@/lib/social/profile-tabs-queries";

/**
 * An agent's live places, on their own page.
 *
 * A plate rather than a row: somebody looking at an agent's Properties tab is
 * looking for a flat, and a flat is a photograph first. The facts underneath
 * are the four that decide whether to tap: what it is, where it is, how much,
 * and how many rooms.
 *
 * Money goes through `formatMoney` and nothing here divides by 100. The column
 * is integer kobo and it stays that way until the moment it is printed.
 */
export function PropertyList({ properties }: { properties: PropertyCard[] }) {
  return (
    <ul className="flex flex-col gap-[var(--nf-social-gap)]">
      {properties.map((property) => (
        <li key={property.id}>
          <Link href={`/listing/${property.id}`} className="nf-card nf-post nf-post--listing block">
            {property.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={property.photoUrl}
                alt=""
                className="nf-post__plate"
                loading="lazy"
              />
            ) : null}
            <div className="nf-post__under">
              <p className="text-[0.95rem] font-bold tracking-[-0.015em] text-[var(--nf-content-primary)]">
                {property.title}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
                <UiIcon name="location" size={13} />
                {[property.area, property.city].filter(Boolean).join(", ")}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="nf-numeric text-[1.05rem] font-extrabold tracking-[-0.03em] text-[var(--nf-content-primary)]">
                  {formatMoney(property.priceMinor, "en")}{" "}
                  <span className="text-[0.72rem] font-medium tracking-normal text-[var(--nf-content-muted)]">
                    {property.pricePeriod === "year" ? "a year" : "a night"}
                  </span>
                </p>
                <p className="text-[0.78rem] text-[var(--nf-content-muted)]">
                  <span className="nf-numeric">{property.bedrooms}</span>{" "}
                  {property.bedrooms === 1 ? "bedroom" : "bedrooms"}
                  {" · "}
                  <span className="nf-numeric">{property.bathrooms}</span>{" "}
                  {property.bathrooms === 1 ? "bathroom" : "bathrooms"}
                </p>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
