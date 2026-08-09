import { Reveal } from "@/components/site/Reveal";
import { Odometer } from "@/components/site/Odometer";
import { getPlatformStats } from "@/lib/platform-stats";
import { type Locale } from "@naijafinds/i18n";

/**
 * Numbers band.
 *
 * A strip of platform figures whose digits roll into place like a mechanical
 * counter the first time the band scrolls into view. Each figure is an
 * Odometer, which carries its own accessible value and its own reduced motion
 * path, so this component is layout plus one decision: which figures are true.
 *
 * Every number here used to be hardcoded. "Listings 17+" and "Cities 6" were
 * the size of the seed catalogue, not of the platform, and they were rendered
 * with a "+" suffix that implied there were more. Both now come from
 * `public.platform_stats()`, which counts PUBLISHED listings and the distinct
 * cities they sit in.
 *
 * A count of zero is not published, and neither is a count we could not read:
 * an inventory figure is a claim, and the only honest thing to do with a claim
 * you cannot support is to leave it out. The band then carries the two facts
 * that are true on day one, which are true because the product is built that
 * way rather than because anyone has listed anything. Nothing is rounded, and
 * there is no "+" on an exact number.
 */

type Figure = { label: string; value: number; suffix: string };

/** Tailwind needs literal class names, so the widths are chosen, not built. */
const COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

export async function NumbersBand({ locale }: { locale: Locale }) {
  const stats = await getPlatformStats();

  const figures: Figure[] = [];
  if (stats && stats.listings > 0) {
    figures.push({ label: "Listings", value: stats.listings, suffix: "" });
  }
  if (stats && stats.cities > 0) {
    figures.push({ label: "Cities", value: stats.cities, suffix: "" });
  }
  figures.push({ label: "Languages", value: 4, suffix: "" });
  figures.push({ label: "Support", value: 24, suffix: "/7" });

  const columns = COLUMNS[figures.length] ?? COLUMNS[4];

  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal>
        <ul
          className={`nf-card grid ${columns} gap-y-5 px-4 py-6 text-center sm:py-7`}
          data-testid="numbers-band"
        >
          {figures.map((s) => (
            <li key={s.label}>
              <span className="nf-odometer-figure block font-[family-name:var(--nf-font-display)] text-[1.7rem] font-bold leading-none sm:text-[2.1rem]">
                <Odometer value={s.value} locale={locale} suffix={s.suffix} />
              </span>
              <span className="mt-1.5 block text-[0.72rem] text-[var(--nf-content-muted)] sm:text-[0.8125rem]">
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
