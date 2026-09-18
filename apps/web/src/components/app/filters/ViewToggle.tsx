import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ViewKey } from "@/lib/listings/search-params";

/**
 * List or map. Two links, so the view is part of the address and survives a
 * reload; `compact` keeps the glyphs and hides the words on a phone, where the
 * count line and the sort control share the row.
 */
export function ViewToggle({
  current,
  hrefFor,
  compact = false,
}: {
  current: ViewKey;
  hrefFor: (view: ViewKey) => string;
  compact?: boolean;
}) {
  const options: { view: ViewKey; label: string; icon: "grid" | "map" }[] = [
    { view: "list", label: "List", icon: "grid" },
    { view: "map", label: "Map", icon: "map" },
  ];

  return (
    <nav
      aria-label="Result view"
      className="nf-segmented inline-flex shrink-0 items-center gap-2xs p-2xs"
    >
      {options.map((option) => {
        const active = current === option.view;
        return (
          <Link
            key={option.view}
            href={hrefFor(option.view)}
            prefetch
            data-testid={`view-${option.view}`}
            aria-current={active ? "true" : undefined}
            aria-label={compact ? option.label : undefined}
            className={`nf-segmented__link min-h-11 whitespace-nowrap text-[var(--nf-text-caption)] ${
              compact ? "px-sm" : "px-md"
            } ${active ? "font-bold" : ""}`}
          >
            <UiIcon name={option.icon} size={16} className="shrink-0" />
            <span className={compact ? "sr-only" : undefined}>{option.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
