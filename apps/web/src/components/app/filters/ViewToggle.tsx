"use client";

import { useState } from "react";
import Link from "next/link";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import type { ViewKey } from "@/lib/listings/search-params";

/**
 * List, grid or map (Track M).
 *
 * Three anchors, because the view lives in the query string and a person can
 * open any of them in a new tab. The lit capsule behind the current one is
 * the shared `.nf-segmented__capsule`, placed by index rather than measured:
 * the three segments are equal columns, so the capsule is one column wide
 * and slides `--nf-view-i` columns across in 240ms. It moves on the tap,
 * before the server answers, so the control responds at once and the new
 * view arrives under a capsule that is already there; the prop brings it
 * back into line if the navigation lands somewhere else. Reduced motion: it
 * jumps (buttons.css).
 *
 * The hrefs are computed by the server page and handed in, because a
 * function cannot cross into a client component.
 *
 * `list` in the address is the card grid the shelf has always drawn (so old
 * links keep their meaning), and is labelled Grid here; `rows` is the one
 * card a row list.
 */
export function ViewToggle({
  current,
  hrefs,
  compact = false,
  className,
}: {
  current: ViewKey;
  hrefs: Record<ViewKey, string>;
  compact?: boolean;
  className?: string;
}) {
  const options: { view: ViewKey; label: string; icon: UiIconName }[] = [
    { view: "rows", label: "List", icon: "feed" },
    { view: "list", label: "Grid", icon: "grid" },
    { view: "map", label: "Map", icon: "map" },
  ];
  /* The tapped view, remembered against the view it was tapped from, so it
     stops applying the moment the page's own view changes. */
  const [tap, setTap] = useState<{ from: ViewKey; to: ViewKey } | null>(null);
  const shown = tap && tap.from === current ? tap.to : current;
  const index = Math.max(0, options.findIndex((o) => o.view === shown));

  return (
    <nav
      aria-label="Result view"
      className={`nf-segmented nf-viewtoggle ${compact ? "nf-viewtoggle--compact" : ""} ${className ?? ""}`}
      style={{ "--nf-view-i": index } as React.CSSProperties}
    >
      <span className="nf-segmented__capsule nf-viewtoggle__thumb" aria-hidden="true" />
      {options.map((option) => {
        const active = current === option.view;
        return (
          <Link
            key={option.view}
            href={hrefs[option.view]}
            onClick={() => setTap({ from: current, to: option.view })}
            prefetch
            data-testid={`view-${option.view}`}
            aria-current={active ? "true" : undefined}
            data-on={shown === option.view ? "true" : undefined}
            aria-label={compact ? option.label : undefined}
            className="nf-viewtoggle__link"
          >
            <UiIcon name={option.icon} size={16} className="shrink-0" />
            <span className={compact ? "sr-only" : undefined}>{option.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
