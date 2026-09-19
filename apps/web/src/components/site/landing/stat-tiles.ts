import type { Dictionary } from "@vallo/i18n";
import type { PlatformStats } from "@/lib/platform-stats";

/**
 * The three platform figures, and the one rule about them.
 *
 * The founder's render prints "10K+ properties, 5K+ happy clients, 200+
 * agents and partners". Not one of those is a number this platform can
 * stand behind today, and a figure a reader cannot check is the fake social
 * proof the rules forbid outright. So this returns ONLY what
 * `platform_stats()` actually answers: published listings, agents a person
 * has verified, and the distinct cities and states those listings sit in. A
 * count of zero is dropped rather than rounded up, and when the database
 * cannot answer at all the caller gets an empty list and prints no figures,
 * which is the honest version of the render's band.
 *
 * This lived beside a `StatsBand` component that stood between the hero and
 * the feature band. The render has no such band: it prints these figures
 * once, inside the community section, which is the only caller now. The
 * component is gone and the rule it carried is here, where the caller is.
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
