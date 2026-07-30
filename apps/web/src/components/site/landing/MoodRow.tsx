import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Words } from "@/components/site/Words";

/**
 * Find your vibe.
 *
 * A horizontal snap row of small glass mood cards, each pairing a 3D icon with
 * a feeling rather than a category, linking straight into search for that
 * mood. Phones swipe the row; wider screens see most of it at once and can
 * still scroll for the rest. Pure CSS scroll snap, no client code.
 */

const MOODS: { label: string; icon: BrandIconName; q: string }[] = [
  { label: "Beach weekend", icon: "luggage-check", q: "beach weekend" },
  { label: "City lights", icon: "homes-sparkle", q: "city lights" },
  { label: "Detty December", icon: "gift", q: "detty december" },
  { label: "Romantic escape", icon: "heart-home", q: "romantic escape" },
  { label: "Family time", icon: "house-sparkle", q: "family time" },
  { label: "Foodie tour", icon: "gift", q: "foodie tour" },
];

export function MoodRow() {
  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal className="mb-6 max-w-[52ch] sm:mb-8">
        <span className="nf-overline">Moods</span>
        <h2 className="nf-h1 mt-3">
          <Words text="Find your vibe" accentFrom={2} />
        </h2>
        <p className="mt-3 text-[var(--nf-content-secondary)]">
          Start from a feeling and let search do the rest.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <ul
          aria-label="Browse by mood"
          className="nf-snap-x -mx-5 gap-4 px-5 pb-1 sm:mx-0 sm:px-0 sm:pb-0"
        >
          {MOODS.map((m) => (
            <li key={m.label} className="w-[11.5rem] sm:w-[13rem]">
              <Link
                href={`/search?q=${encodeURIComponent(m.q)}`}
                className="nf-glass nf-card--interactive flex h-full flex-col items-start gap-3 rounded-[var(--nf-radius-lg)] p-4 sm:p-5"
              >
                <span className="h-13 w-13 sm:h-12 sm:w-12">
                  <BrandIcon name={m.icon} fill />
                </span>
                <span className="text-[0.875rem] font-semibold text-[var(--nf-content-primary)] sm:text-[0.9375rem]">
                  {m.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
