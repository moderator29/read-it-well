"use client";

import { useState } from "react";
import { formatDate, formatMoney, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { ShelfItem } from "@/lib/offline/shelf";
import { Button } from "@/components/ui/Button";

/**
 * THE SHORTLIST, DRAWN FROM THE PHONE. V-77.
 *
 * Used by the offline page. Every row says when the phone stored it and that
 * prices may have changed, because a copy is a copy: it is dated, and it
 * never pretends to be live. A figure the listing did not state is simply
 * absent, never "not stated" and never a grey cross (the claims rule).
 *
 * COMPARE. Tick up to three and they sit side by side: move-in total, rent,
 * area, rooms, power. The `/saved` empty state has long promised "ready to
 * compare side by side"; this is the first place it is kept, and it works
 * with no signal.
 *
 * SESSION 3 (W13). The move-in total leads each copy as its figure (the
 * whole cost first, the rent beneath), the two actions are the one Button
 * primitive, and the Example mark is gone: D24 took the visible example
 * labelling off the listing card, and a copy of the card on the phone
 * follows the card. What D24 keeps is the part that matters, and the shelf
 * never had it to lose: no copy here carries a Verified mark at all, so an
 * example can never look checked offline either.
 */

type Copy = Dictionary["platform"]["shelf"];

/** A copy's name: its rooms and area, never the lister's own title. */
export function shelfName(item: { bedrooms: number; place: string }, copy: Copy, locale: Locale): string {
  const beds = plural(item.bedrooms, copy.beds, locale);
  return item.place ? copy.name.replace("{beds}", beds).replace("{place}", item.place) : copy.nameNoPlace.replace("{beds}", beds);
}

function storedWhen(iso: string, locale: Locale, copy: Copy, now: number): string {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) return "";
  const day = (d: Date) => formatDate(d, "en", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });
  const time = formatDate(at, locale, { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
  const when =
    day(at) === day(new Date(now))
      ? copy.storedToday.replace("{time}", time)
      : copy.storedOn.replace("{date}", formatDate(at, locale, { day: "numeric", month: "short", timeZone: "Africa/Lagos" }));
  return copy.storedAt.replace("{when}", when);
}

export function priceLines(item: ShelfItem, locale: Locale, copy: Copy): { lead: string; rent: string | null } {
  if (item.lead === "none" || item.minor === null) return { lead: copy.noPrice, rent: null };
  const amount = formatMoney(item.minor, locale);
  if (item.lead === "moveIn") {
    return {
      lead: (item.approximate ? copy.moveInFrom : copy.moveIn).replace("{amount}", amount),
      rent:
        item.rentMinor !== null
          ? copy.rentLine.replace("{amount}", formatMoney(item.rentMinor, locale)).replace("{suffix}", item.suffix)
          : null,
    };
  }
  return { lead: copy.priceLine.replace("{amount}", amount).replace("{suffix}", item.suffix), rent: null };
}

export function ShelfView({
  items,
  copy,
  locale,
  now,
}: {
  items: ShelfItem[];
  copy: Copy;
  /**
   * Retired by D24 with the card's own Example mark; still accepted so the
   * offline page's call compiles until its owner drops it. Never drawn.
   */
  exampleLabel?: string;
  locale: Locale;
  /** Read by the caller outside render. */
  now: number;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  if (items.length === 0) return null;

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : current.length >= 3 ? current : [...current, id],
    );
  const chosen = items.filter((item) => picked.includes(item.id));

  return (
    <section className="mx-auto mt-section w-full max-w-lg space-y-row text-left" aria-label={copy.offlineHeading} data-testid="offline-shelf">
      <h2 className="nf-h3 text-content">{copy.offlineHeading}</h2>
      <p className="nf-caption text-muted">{copy.compareHint}</p>

      {comparing && chosen.length > 1 && (
        <div className="nf-panel nf-panel--card block overflow-x-auto p-card" data-testid="shelf-compare">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="nf-caption text-muted" scope="col" />
                {chosen.map((item) => (
                  <th key={item.id} scope="col" className="nf-caption px-2xs align-top font-semibold text-content">
                    {shelfName(item, copy, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="nf-body-sm text-content-2">
              <tr>
                <th scope="row" className="nf-caption py-3xs text-muted">{copy.compareMoveIn}</th>
                {chosen.map((item) => (
                  <td key={item.id} className="px-2xs py-3xs tabular-nums">
                    {item.lead === "moveIn" && item.minor !== null ? formatMoney(item.minor, locale) : ""}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="nf-caption py-3xs text-muted">{copy.compareRent}</th>
                {chosen.map((item) => {
                  const rent = item.lead === "moveIn" ? item.rentMinor : item.lead === "headline" ? item.minor : null;
                  return (
                    <td key={item.id} className="px-2xs py-3xs tabular-nums">
                      {rent !== null ? `${formatMoney(rent, locale)}${item.suffix}` : ""}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row" className="nf-caption py-3xs text-muted">{copy.comparePlace}</th>
                {chosen.map((item) => (
                  <td key={item.id} className="px-2xs py-3xs">{item.place}</td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="nf-caption py-3xs text-muted">{copy.compareRooms}</th>
                {chosen.map((item) => (
                  <td key={item.id} className="px-2xs py-3xs">
                    {plural(item.bedrooms, copy.beds, locale)}, {plural(item.bathrooms, copy.baths, locale)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="nf-caption py-3xs text-muted">{copy.comparePower}</th>
                {chosen.map((item) => (
                  <td key={item.id} className="px-2xs py-3xs">{item.power ?? ""}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <Button variant="secondary" size="sm" full className="mt-group" onClick={() => setComparing(false)}>
            {copy.compareClose}
          </Button>
        </div>
      )}

      <ul className="space-y-row">
        {items.map((item) => {
          const lines = priceLines(item, locale, copy);
          const checked = picked.includes(item.id);
          return (
            <li key={item.id} className="nf-panel nf-panel--card block p-card" data-testid="shelf-item">
              <label className="flex cursor-pointer items-start gap-inline">
                <input
                  type="checkbox"
                  className="mt-3xs size-5 shrink-0"
                  checked={checked}
                  disabled={!checked && picked.length >= 3}
                  onChange={() => toggle(item.id)}
                />
                <span className="min-w-0">
                  <span className="nf-body block font-semibold text-content">{shelfName(item, copy, locale)}</span>
                  {item.place && <span className="nf-caption block text-muted">{item.place}</span>}
                  {/* The figure leads the copy: the whole cost first. */}
                  <span className="nf-body mt-row block font-semibold tabular-nums text-content">{lines.lead}</span>
                  {lines.rent && <span className="nf-caption block tabular-nums text-content-2">{lines.rent}</span>}
                  <span className="nf-caption block text-content-2">
                    {plural(item.bedrooms, copy.beds, locale)}, {plural(item.bathrooms, copy.baths, locale)}
                    {item.power ? `, ${item.power}` : ""}
                  </span>
                  <span className="nf-caption mt-row block text-muted">{storedWhen(item.storedAt, locale, copy, now)}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {picked.length > 1 && !comparing && (
        <Button variant="primary" full onClick={() => setComparing(true)} data-testid="shelf-compare-open">
          {copy.compare}
        </Button>
      )}
    </section>
  );
}
