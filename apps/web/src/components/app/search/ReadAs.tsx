import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UNIT_SHAPES } from "@/lib/listings/unit-shape";
import { toShelfHref, type ShelfQuery } from "./shelf-query";

type Chip = { key: string; label: string; href: string };

/**
 * What the search box read out of the words, as chips each of which removes
 * itself (V-66).
 *
 * The shapes, the BQ and the areas have no capsule on the bar above, so they
 * are always shown here while they narrow the shelf. When the words were just
 * read (`said` is set), the line also names what they were read as, with the
 * bedrooms, the budget, the market and Owner direct among the chips, so
 * "2br under 2m yaba" is visibly three filters and a place, each removable.
 *
 * Renders nothing when there is nothing to show.
 */
export function ReadAs({
  query,
  said,
  locale,
  copy,
}: {
  query: ShelfQuery;
  said: string | null;
  locale: Locale;
  copy: Dictionary["shape"]["unit"];
}) {
  const without = (patch: Partial<ShelfQuery>, drop: (keyof ShelfQuery)[] = []): string => {
    const next: ShelfQuery = { ...query, ...patch };
    for (const key of drop) delete next[key];
    return toShelfHref(next);
  };
  const chips: Chip[] = [];

  if (said) {
    if (query.intent) {
      chips.push({ key: "market", label: query.intent === "sale" ? copy.forSale : copy.toRent, href: without({}, ["intent"]) });
    }
    if (query.bedrooms !== undefined) {
      chips.push({ key: "beds", label: copy.beds.replace("{n}", String(query.bedrooms)), href: without({}, ["bedrooms"]) });
    }
    if (query.maxMinor !== undefined) {
      chips.push({
        key: "max",
        label: copy.upTo.replace("{amount}", formatMoney(query.maxMinor, locale)),
        href: without({}, ["maxMinor"]),
      });
    }
    if (query.minMinor !== undefined) {
      chips.push({
        key: "min",
        label: copy.from.replace("{amount}", formatMoney(query.minMinor, locale)),
        href: without({}, ["minMinor"]),
      });
    }
  }
  if (query.listerRoles.includes("owner") && (said || query.listerRoles.length === 1)) {
    chips.push({
      key: "owner",
      label: copy.ownerDirect,
      href: without({ listerRoles: query.listerRoles.filter((role) => role !== "owner") }),
    });
  }
  for (const shape of UNIT_SHAPES) {
    if (!query.shapes?.includes(shape)) continue;
    const rest = query.shapes.filter((s) => s !== shape);
    chips.push({
      key: `shape-${shape}`,
      label: copy.shapes[shape],
      href: rest.length > 0 ? without({ shapes: rest }) : without({}, ["shapes"]),
    });
  }
  if (query.withBq) chips.push({ key: "bq", label: copy.filterBq, href: without({}, ["withBq"]) });
  if (said && query.servicedOnly) {
    chips.push({ key: "serviced", label: copy.serviced, href: without({ servicedOnly: false }) });
  }
  for (const area of query.areas ?? []) {
    const rest = (query.areas ?? []).filter((a) => a !== area);
    const label = area.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
    chips.push({ key: `area-${area}`, label, href: rest.length > 0 ? without({ areas: rest }) : without({}, ["areas"]) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mx-auto mt-sm max-w-3xl" data-testid="read-as">
      {said && (
        <p className="nf-caption break-words text-[var(--nf-content-secondary)]">
          {copy.readAs.replace("{said}", said)}
        </p>
      )}
      <ul className="nf-scroll-x mt-2xs flex items-center gap-xs" aria-label={said ? copy.readAs.replace("{said}", said) : copy.filterTitle}>
        {chips.map((chip) => (
          <li key={chip.key} className="shrink-0">
            <Link
              href={chip.href}
              prefetch={false}
              data-testid={`read-as-${chip.key}`}
              className="nf-chip min-h-11 whitespace-nowrap py-xs pr-sm text-[length:var(--nf-text-caption)]"
            >
              <span>{chip.label}</span>
              <span className="sr-only">{copy.removeLabel.replace("{what}", chip.label)}</span>
              {/* The same drawn cross as the other removable chips. */}
              <span aria-hidden="true" className="relative block h-4 w-4 rounded-full bg-[var(--nf-surface-inset)]">
                <span className="absolute left-1/2 top-1/2 h-[1.5px] w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
                <span className="absolute left-1/2 top-1/2 h-[1.5px] w-2 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
