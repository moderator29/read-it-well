import Link from "next/link";
import { WholePrefetchLink } from "@/components/app/WholePrefetchLink";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { panelClass } from "@/components/ui/Panel";

/**
 * The category row, to `GOVERNING-01` screen one and `GOVERNING-09` screen
 * one: each category a 3D glass object standing on its own rounded plate with
 * its label underneath.
 *
 * FOUR, NOT FIVE, ON THE PROPERTY SIDE. The render draws Buy, Rent, Manage,
 * Short Let, Invest. "Short Let" does not ship here, because a shortlet is the
 * Stays side and putting the door on both sides is the same inconsistency
 * Track E exists to remove (roles README, translation 5).
 *
 * NO COUNTS. The render prints none, and the product rule is that the
 * tiles drop their counts rather than print a figure `platform_stats()` cannot
 * yet produce honestly. The render and the honesty rule agree, which is the
 * easiest kind of decision there is.
 *
 * EVERY DOOR IS A CONTAINER NOW (the founder, 25 September 2026): the shared
 * panel card with the glass object standing in it and the word under it, on
 * both sides. The four across on the property side used to be a lit icon
 * plate with the word outside it; that plate turned into a navy square on
 * white paper in light mode. In light the doors are also a little smaller,
 * and the object stands on the card alone with no ground behind it
 * (home.css).
 *
 * THE SHAPE LAW: the card is a rounded rectangle on the container radius and
 * the object inside it is artwork rather than a control, so nothing here is a
 * capsule however it is measured.
 */
export type HomeCategory = {
  key: string;
  label: string;
  /** The supporting line under the label, where the render draws one. */
  meaning?: string;
  href: string;
  icon: BrandIconName;
  /** Fetch the page whole before the tap (`WholePrefetchLink`); for light pages only. */
  whole?: boolean;
};

export function CategoryRow({
  categories,
  label,
  columns = 4,
}: {
  categories: readonly HomeCategory[];
  /** The accessible name of the row, because it is navigation. */
  label: string;
  /** Four across on the property side, two across on the Stays side. */
  columns?: 2 | 4;
}) {
  return (
    <nav aria-label={label} className="nf-rise nf-rise-4 mt-md">
      <ul className="nf-cat-row" data-columns={columns} data-testid="home-categories">
        {categories.map((category) => {
          const Door = category.whole ? WholePrefetchLink : Link;
          return (
            <li key={category.key} className="min-w-0">
              <Door
                href={category.href}
                className={panelClass({ variant: "card", className: "nf-cat-tile nf-tap" })}
                data-testid={`home-category-${category.key}`}
              >
                <span className="nf-cat-tile__plate" aria-hidden="true">
                  <BrandIcon name={category.icon} fill drawn={64} />
                </span>
                <span className="nf-cat-tile__label">{category.label}</span>
                {category.meaning && (
                  <span className="nf-cat-tile__meaning">{category.meaning}</span>
                )}
              </Door>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
