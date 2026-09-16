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
 * ONE CONTAINER, NOT THREE. This was an `.nf-glass` track holding two
 * `.nf-chip`s, and a chip carries its own brand border, an outer glow and an
 * inner glow. So a control with two states painted three bordered boxes inside
 * each other, which is the clearest instance in the product of the thing the
 * founder called a box in a box. The track is now the segmented track that
 * already exists for exactly this, and the states are a label that either sits
 * on the raised capsule or does not.
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
      className="nf-segmented inline-flex shrink-0 items-center gap-1 p-1"
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
            className={`nf-segmented__link min-h-11 whitespace-nowrap px-3.5 text-[0.8125rem] ${
              active ? "font-bold" : ""
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
