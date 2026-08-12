import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { toViewHref, type DiscoveryQuery } from "@/lib/listings/search-params";

/**
 * List and map, as a segmented control.
 *
 * Two links rather than a toggle button, because the view is part of the
 * address (`view=`) like everything else on this page: a map hunt can be sent
 * to someone and it opens on the map. Stroked control glyphs, never the 3D
 * pack: this is navigation.
 *
 * Both links state the view explicitly, including `view=list`, which the
 * general href builder leaves out as a default. See `toViewHref`: without it,
 * switching back to List handed the page an address with no view in it and the
 * remembered-view cookie put the map straight back.
 */
export function ViewToggle({ query }: { query: DiscoveryQuery }) {
  const options: { view: "list" | "map"; label: string; icon: "grid" | "map" }[] = [
    { view: "list", label: "List", icon: "grid" },
    { view: "map", label: "Map", icon: "map" },
  ];

  return (
    <nav
      aria-label="Result view"
      className="nf-glass inline-flex shrink-0 items-center gap-1 rounded-[var(--nf-radius-control)] p-1"
    >
      {options.map((option) => {
        const active = query.view === option.view;
        return (
          <Link
            key={option.view}
            href={toViewHref(query, option.view)}
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
