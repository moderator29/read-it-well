import { useId } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Highlight } from "./highlights";
import "@/app/css/catalogue.css";

/**
 * The highlights strip (`highlights.ts`): the brand-blue card of the
 * founder's "Property Detail" reference, holding two or three facts the
 * lister answered, each a round plate, the fact, and what it is about. Draws
 * nothing when the builder returned nothing.
 */
export function ListingHighlights({ items, title }: { items: Highlight[]; title: string }) {
  const headingId = useId();
  if (items.length === 0) return null;
  return (
    <section className="nf-highlights" aria-labelledby={headingId} data-testid="listing-highlights">
      <h2 id={headingId} className="nf-highlights__title">
        {title}
      </h2>
      <ul className="nf-highlights__row">
        {items.map((item) => (
          <li key={item.key} className="nf-highlights__item" data-highlight={item.key}>
            <span className="nf-highlights__plate" aria-hidden="true">
              <UiIcon name={item.icon} size={20} />
            </span>
            <span className="nf-highlights__value">{item.value}</span>
            <span className="nf-highlights__label">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
