import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { toSearchHref, type DiscoveryQuery } from "@/lib/listings/search-params";

/**
 * List and map, as a segmented control.
 *
 * Two links rather than a toggle button, because the view is part of the
 * address (`view=`) like everything else on this page: a map hunt can be sent
 * to someone and it opens on the map. Stroked control glyphs, never the 3D
 * pack: this is navigation.
 */
export function ViewToggle({ query }: { query: DiscoveryQuery }) {
  const options: { view: "list" | "map"; label: string; icon: "grid" | "map" }[] = [
    { view: "list", label: "List", icon: "grid" },
    { view: "map", label: "Map", icon: "map" },
  ];

  return (
    <nav
      aria-label="Result view"
      className="nf-glass inline-flex shrink-0 items-center gap-1 rounded-[var(--nf-radius-pill)] p-1"
    >
      {options.map((option) => {
        const active = query.view === option.view;
        return (
          <Link
            key={option.view}
            href={toSearchHref({ ...query, view: option.view })}
            prefetch
            data-testid={`view-${option.view}`}
            aria-current={active ? "true" : undefined}
            className={`nf-chip min-h-11 whitespace-nowrap px-3.5 text-[0.8125rem] ${
              active ? "nf-chip--active font-bold text-[var(--nf-content-primary)]" : ""
            }`}
          >
            <UiIcon name={option.icon} size={16} className="shrink-0" />
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
