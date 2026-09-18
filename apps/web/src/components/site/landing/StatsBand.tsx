import type { Dictionary, Locale } from "@vallo/i18n";
import { formatNumber } from "@vallo/i18n";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import type { PlatformStats } from "@/lib/platform-stats";

/**
 * The trusted-stats band under the hero.
 *
 * The render says "10K+ properties, 200+ agents, 6+ cities, 100% verified".
 * None of those is a number this platform can stand behind, so the band
 * prints ONLY what `platform_stats()` returns: published listings, agents a
 * person has verified, and the distinct cities and states those listings
 * sit in. A count of zero is dropped rather than rounded, and when the
 * database cannot answer the band keeps its sentence and shows no tiles.
 * "100% verified" is gone; what verification means here is a sentence in
 * the how-it-works band.
 */
export function statTiles(stats: PlatformStats | null, t: Dictionary) {
  if (!stats) return [];
  const s = t.landing.face.stats;
  return [
    { key: "listings", value: stats.listings, label: s.listings, icon: "home-check" as const },
    { key: "agents", value: stats.agents, label: s.agents, icon: "user-verified" as const },
    { key: "cities", value: stats.cities, label: s.cities, icon: "map-spot" as const },
    { key: "states", value: stats.states, label: s.states, icon: "globe-pin" as const },
  ].filter((tile) => tile.value > 0);
}

export function StatsBand({
  t,
  locale,
  stats,
}: {
  t: Dictionary;
  locale: Locale;
  stats: PlatformStats | null;
}) {
  const tiles = statTiles(stats, t);
  const s = t.landing.face.stats;

  return (
    <section className="nf-shell nf-landing-stats-wrap pt-section-tight" aria-labelledby="nf-landing-stats-title">
      <div className="nf-landing-stats">
        <div className="nf-landing-stats-lead">
          <span className="nf-landing-orb">
            <BrandIcon name="shield-check" fill />
          </span>
          <div>
            <p className="nf-overline text-[var(--nf-content-primary)]">{s.overline}</p>
            <h2 id="nf-landing-stats-title" className="nf-body-sm mt-inline-tight text-[var(--nf-content-secondary)]">
              {s.title}
            </h2>
          </div>
        </div>
        {tiles.length > 0 && (
          <ul className="nf-landing-stats-grid">
            {tiles.map((tile) => (
              <li key={tile.key} className="nf-landing-stat">
                <span className="nf-landing-orb">
                  <BrandIcon name={tile.icon} fill />
                </span>
                <span className="min-w-0">
                  <span className="nf-landing-stat-figure nf-numeric block">
                    {formatNumber(tile.value, locale)}
                  </span>
                  <span className="nf-landing-stat-label block">{tile.label}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
