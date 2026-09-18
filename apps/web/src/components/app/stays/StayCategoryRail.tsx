import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { STAY_CATEGORIES } from "./model";

/**
 * Six doors, each a glass object over a name, each a preset search.
 *
 * Exactly the home page's category grammar (`nf-cat`: the hover lift, the
 * accent on the object, the press collapse, the staggered rise), so somebody
 * who flips sides finds the same shape of shortcut in the same place. A swipe
 * rail on a phone, a grid of three from `sm` and six from `lg`.
 */
export function StayCategoryRail({ t }: { t: Dictionary }) {
  return (
    <ul className="nf-scroll-x -mx-gutter flex snap-x snap-mandatory gap-lg px-gutter pb-3xs scroll-pl-gutter sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-xl sm:px-0 sm:pb-0 lg:grid-cols-6">
      {STAY_CATEGORIES.map((category, index) => (
        <li
          key={category.key}
          className="nf-rise-seq w-[6rem] shrink-0 snap-start sm:w-auto"
          style={{ "--nf-rise-i": index } as React.CSSProperties}
        >
          <Link href={category.href} className="nf-cat nf-tap h-full">
            <span className="nf-cat__glyph h-19 w-19 sm:h-22 sm:w-22">
              <BrandIcon name={category.icon} fill />
            </span>
            <span className="nf-cat__label">{t.stays[category.key]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
