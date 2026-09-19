"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatMoney, formatNumber, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { hasBackupPower, matchesFacts, type ListingFacts } from "@/lib/listings/filter";
import {
  WATER_SOURCES,
  type ListingIntent,
  type ListingKind,
  type WaterSupply,
} from "@/lib/listings/types";
import {
  KIND_NOUN,
  KIND_ORDER,
  SORTS,
  kindLabel,
  koboToNaira,
  nairaToKobo,
  WATER_LABEL,
  type SortKey,
} from "@/lib/listings/search-params";
import {
  clearedShelf,
  shelfActiveCount,
  shelfFilter,
  toShelfHref,
  type ShelfQuery,
} from "@/components/app/search/shelf-query";
import { amenityLabel, sortAmenityCodes } from "./amenities";
import { ICON } from "@/components/app/Screen";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { useClientMount } from "@/lib/ui/client-mount";

/**
 * The filter sheet, to the right-hand panel of 3EB3E2A9.
 *
 * Property type as a row of tiles, the market as Buy and Rent, the price
 * range on the two-handled slider, Bedrooms and Bathrooms as Any 1+ 2+ 3+
 * 4+, the amenities as switches, then the location and sort rows and the
 * Reset and Apply pair with the live count on Apply.
 *
 * THE POOL LOGIC IS UNCHANGED. Every option is offered only where the pool
 * (the whole catalogue for the current text) can answer it, and the count on
 * Apply is computed in the browser from the same `matchesFacts` the server
 * uses, so the number a person presses is the number they get.
 */

/** The three markets the Market group offers; see `marketOptions`. */
type Market = ListingIntent | "shortlet";

type Draft = {
  q: string;
  kind?: ListingKind;
  intent?: ListingIntent;
  sort: SortKey;
  minNaira: string;
  maxNaira: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  amenities: string[];
  instantBook: boolean;
  verifiedOnly: boolean;
  powerBackup: boolean;
  powerBandA: boolean;
  waterSupply: WaterSupply[];
};

function draftFrom(query: ShelfQuery): Draft {
  return {
    q: query.q ?? "",
    ...(query.kind !== undefined ? { kind: query.kind } : {}),
    ...(query.intent !== undefined ? { intent: query.intent } : {}),
    sort: query.sort,
    minNaira: query.minMinor === undefined ? "" : String(koboToNaira(query.minMinor)),
    maxNaira: query.maxMinor === undefined ? "" : String(koboToNaira(query.maxMinor)),
    bedrooms: query.bedrooms ?? 0,
    bathrooms: query.bathrooms ?? 0,
    guests: query.guests ?? 0,
    amenities: query.amenities,
    instantBook: query.instantBook,
    verifiedOnly: query.verifiedOnly,
    powerBackup: query.powerBackup,
    powerBandA: query.powerBandA,
    waterSupply: query.waterSupply,
  };
}

function digits(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 9);
}

function nairaOf(value: string): number | undefined {
  const clean = digits(value);
  if (clean.length === 0) return undefined;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function queryFrom(base: ShelfQuery, draft: Draft): ShelfQuery {
  let min = nairaOf(draft.minNaira);
  let max = nairaOf(draft.maxNaira);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  const next: ShelfQuery = {
    sort: draft.sort,
    view: base.view,
    amenities: draft.amenities,
    instantBook: draft.instantBook,
    verifiedOnly: draft.verifiedOnly,
    powerBackup: draft.powerBackup,
    powerBandA: draft.powerBandA,
    waterSupply: draft.waterSupply,
  };
  const q = draft.q.trim();
  if (q.length > 0) next.q = q;
  if (draft.kind) next.kind = draft.kind;
  if (draft.intent) next.intent = draft.intent;
  if (min !== undefined) next.minMinor = nairaToKobo(min);
  if (max !== undefined) next.maxMinor = nairaToKobo(max);
  if (draft.bedrooms > 0) next.bedrooms = draft.bedrooms;
  if (draft.bathrooms > 0) next.bathrooms = draft.bathrooms;
  if (draft.guests > 0) next.guests = draft.guests;
  return next;
}

/* Any, then 1+ to 4+. Zero is "any", which the query does not carry. */
const ROOM_STEPS: number[] = [0, 1, 2, 3, 4];

function sliderScale(high: number | undefined) {
  const floor = 0;
  const ceiling = high !== undefined && high > 0 ? Math.ceil(koboToNaira(high) / 1000) * 1000 : 5_000_000;
  const span = Math.max(1, ceiling - floor);
  // A hundred stops across the range, rounded to something a person would
  // type, so dragging lands on round numbers rather than on 187,431.
  const raw = Math.max(1, Math.round(span / 100));
  const magnitude = 10 ** Math.max(0, String(Math.floor(raw)).length - 1);
  const step = Math.max(1, Math.round(raw / magnitude) * magnitude);
  return { floor, ceiling, span, step };
}

const AMENITY_ICON: Record<string, UiIconName> = {
  pool: "pool",
  gym: "bolt",
  security: "verified",
  generator: "bolt",
  furnished: "home",
  parking: "parking",
  wifi: "wifi",
  kitchen: "kitchen",
  ac: "sparkle",
  water: "sparkle",
};

function Group({
  id,
  title,
  onClear,
  clearLabel,
  hint,
  children,
}: {
  id: string;
  title: string;
  onClear?: () => void;
  clearLabel: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="nf-filters__group">
      <div className="nf-filters__group-head">
        <h2 id={id} className="nf-filters__group-title">
          {title}
        </h2>
        {/*
          ALWAYS DRAWN, DISABLED WHEN THERE IS NOTHING TO CLEAR.

          3EB3E2A9 shows "Clear" beside every group heading. It used to appear
          only once the group had a value, which made every heading in the
          sheet jump sideways as a person touched the controls under it. It is
          drawn at rest now and genuinely disabled - the attribute, so the
          browser refuses the press, skips it in the tab order and announces it
          - rather than a live-looking control that does nothing. Its
          accessible name names its group, because nine controls all called
          "Clear" are nine identical announcements.
        */}
        <button
          type="button"
          onClick={onClear}
          disabled={!onClear}
          aria-label={`${clearLabel}: ${title}`}
          data-testid={`${id}-clear`}
          className="nf-filters__clear"
        >
          {clearLabel}
        </button>
      </div>
      {hint && <p className="nf-filters__hint">{hint}</p>}
      {children}
    </section>
  );
}

function Tiles<T extends string | number>({
  options,
  value,
  onPick,
  testPrefix,
  columns,
}: {
  options: { value: T; label: string; icon?: UiIconName }[];
  value: T | undefined;
  onPick: (next: T) => void;
  testPrefix: string;
  columns: 3 | 5;
}) {
  return (
    <div className={`nf-filters__grid nf-filters__grid--${columns}`} role="group">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={on}
            data-testid={`${testPrefix}-${String(option.value)}`}
            onClick={() => onPick(option.value)}
            className="nf-filters__tile"
          >
            {option.icon && <UiIcon name={option.icon} size={16} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SwitchRow({
  icon,
  label,
  hint,
  checked,
  onChange,
  testId,
}: {
  icon: UiIconName;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  testId: string;
}) {
  return (
    <div className="nf-filters__switch">
      <span className="nf-filters__switch-label">
        <UiIcon name={icon} size={ICON.inline} />
        <span className="min-w-0">
          {label}
          {hint && <span className="nf-filters__switch-hint">{hint}</span>}
        </span>
      </span>
      <span data-testid={testId} className="shrink-0">
        <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      </span>
    </div>
  );
}

export function FilterDrawer({
  query,
  facts,
  locale,
  copy,
  openOnMount = false,
}: {
  query: ShelfQuery;
  openOnMount?: boolean;
  facts: ListingFacts[];
  locale: Locale;
  copy: Dictionary["catalogue"]["filters"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnMount);
  const mounted = useClientMount();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(query));
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setDraft(draftFrom(query));
  }

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  useOverlay({ open, onClose: close, panelRef, autoFocus: false });

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  const activeCount = shelfActiveCount(query);

  const kindOptions = useMemo(() => {
    const present = new Set<ListingKind>();
    for (const fact of facts) present.add(fact.kind);
    if (draft.kind) present.add(draft.kind);
    return KIND_ORDER.filter((kind) => present.has(kind));
  }, [facts, draft.kind]);

  /*
   * BUY, RENT, SHORTLET, as the target render draws the Market group.
   *
   * Two of the three are `listing_intent` values and the third is not:
   * a shortlet is rented, by the night, and the column that tells it apart
   * from a tenancy is `kind`. So the control answers in markets and writes
   * whichever pair of columns that market means, which is the same shape
   * the card's own `cardMarket` uses to read them back. Each option is
   * offered only where the pool holds something it could return.
   */
  const marketOptions = useMemo(() => {
    const sale = facts.some((fact) => fact.intent === "sale") || draft.intent === "sale";
    const shortlet = facts.some((fact) => fact.kind === "shortlet") || draft.kind === "shortlet";
    const options: { value: Market; label: string; icon: UiIconName }[] = [];
    if (sale) options.push({ value: "sale", label: "Buy", icon: "key" });
    options.push({ value: "rent", label: "Rent", icon: "home" });
    if (shortlet) options.push({ value: "shortlet", label: "Shortlet", icon: "calendar-booking" });
    return options;
  }, [facts, draft.intent, draft.kind]);

  /* Which of the three the draft currently stands on. A shortlet is a rent
     with a kind, so it is read before the bare intent. */
  const market: Market | undefined =
    draft.kind === "shortlet" ? "shortlet" : draft.intent === undefined ? undefined : draft.intent;

  const amenityOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const fact of facts) for (const code of fact.amenities) codes.add(code);
    for (const code of draft.amenities) codes.add(code);
    return sortAmenityCodes([...codes]);
  }, [facts, draft.amenities]);

  const utilityOptions = useMemo(() => {
    let backup = draft.powerBackup;
    let bandA = draft.powerBandA;
    const water = new Set<WaterSupply>(draft.waterSupply);
    for (const fact of facts) {
      if (hasBackupPower(fact)) backup = true;
      if (fact.utilities?.powerGrid === "BAND_A") bandA = true;
      const source = fact.utilities?.waterSupply;
      if (source !== undefined && source !== "NONE") water.add(source);
    }
    return { backup, bandA, water: WATER_SOURCES.filter((value) => water.has(value)) };
  }, [facts, draft.powerBackup, draft.powerBandA, draft.waterSupply]);
  const showUtilities =
    utilityOptions.backup || utilityOptions.bandA || utilityOptions.water.length > 0;

  const pending = useMemo(() => queryFrom(query, draft), [query, draft]);
  const matchCount = useMemo(() => {
    const filter = shelfFilter(pending);
    return facts.filter((fact) => matchesFacts(fact, filter)).length;
  }, [facts, pending]);

  const bounds = useMemo(() => {
    let high: number | undefined;
    for (const fact of facts) {
      if (fact.priceMinor <= 0) continue;
      if (high === undefined || fact.priceMinor > high) high = fact.priceMinor;
    }
    return { high };
  }, [facts]);
  const scale = useMemo(() => sliderScale(bounds.high), [bounds.high]);

  const noun = draft.kind ? KIND_NOUN[draft.kind] : { one: "place", many: "places" };

  // Naira, because that is what the control holds. It becomes kobo the moment
  // it is shown or stored, and never before.
  const minInNaira = nairaOf(draft.minNaira);
  const maxInNaira = nairaOf(draft.maxNaira);
  const sliderMin = Math.min(Math.max(minInNaira ?? scale.floor, scale.floor), scale.ceiling);
  const sliderMax = Math.max(Math.min(maxInNaira ?? scale.ceiling, scale.ceiling), scale.floor);

  function apply() {
    router.push(toShelfHref(pending));
    setOpen(false);
  }

  function clearAll() {
    const cleared = clearedShelf(query);
    setDraft(draftFrom(cleared));
    router.push(toShelfHref(cleared));
    setOpen(false);
  }

  function pickKind(value: ListingKind | "all") {
    setDraft((current) => {
      const { kind: _was, ...rest } = current;
      return value === "all" ? rest : { ...rest, kind: value };
    });
  }

  function pickMarket(value: Market) {
    setDraft((current) => {
      const { intent: _wasIntent, kind: _wasKind, ...rest } = current;
      const wasShortlet = current.kind === "shortlet";
      const standing = wasShortlet ? "shortlet" : current.intent;
      /* Tapping the market you are already in clears it, which is how every
         other group in this sheet behaves. */
      if (standing === value) return current.kind && !wasShortlet ? { ...rest, kind: current.kind } : rest;
      if (value === "shortlet") return { ...rest, intent: "rent", kind: "shortlet" };
      return current.kind && !wasShortlet
        ? { ...rest, intent: value, kind: current.kind }
        : { ...rest, intent: value };
    });
  }

  function toggleWater(value: WaterSupply) {
    setDraft((current) => ({
      ...current,
      waterSupply: current.waterSupply.includes(value)
        ? current.waterSupply.filter((v) => v !== value)
        : [...current.waterSupply, value],
    }));
  }

  function toggleAmenity(code: string, on: boolean) {
    setDraft((current) => ({
      ...current,
      amenities: on
        ? current.amenities.includes(code)
          ? current.amenities
          : [...current.amenities, code]
        : current.amenities.filter((c) => c !== code),
    }));
  }

  const roomTiles = ROOM_STEPS.map((value) => ({
    value,
    label: value === 0 ? copy.any : `${value}+`,
  }));

  const panel = (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={copy.title}>
      <button
        type="button"
        aria-label={copy.close}
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 bg-[var(--nf-overlay-backdrop)] backdrop-blur-sm"
      />
      <div ref={panelRef} data-testid="filters-drawer" className="nf-filters">
        {/* The grabber of the render. Decoration, not a control: the sheet is
            closed by the X beside it, by the backdrop and by Escape. */}
        <span className="nf-filters__grip" aria-hidden="true" />
        <header className="nf-filters__head">
          <p className="nf-filters__title">{copy.title}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={copy.close}
            className="nf-icon-btn h-11 w-11"
          >
            <UiIcon name="close" size={ICON.inline} />
          </button>
        </header>

        <div className="nf-filters__body">
          <div className="mx-auto max-w-2xl">
            {/* ------------------------------------------- property type */}
            {kindOptions.length > 0 && (
              <Group
                id="filter-kind"
                title={copy.propertyType}
                clearLabel={copy.clear}
                onClear={draft.kind ? () => pickKind("all") : undefined}
              >
                <Tiles
                  columns={3}
                  testPrefix="filter-kind"
                  value={draft.kind ?? "all"}
                  onPick={pickKind}
                  options={[
                    { value: "all" as const, label: copy.all },
                    ...kindOptions.map((kind) => ({ value: kind, label: kindLabel(kind) })),
                  ]}
                />
              </Group>
            )}

            {/* -------------------------------------------------- market */}
            <Group
              id="filter-market"
              title={copy.market}
              clearLabel={copy.clear}
              onClear={
                market
                  ? () =>
                      setDraft((current) => {
                        const { intent: _wasIntent, ...rest } = current;
                        if (current.kind !== "shortlet") return rest;
                        const { kind: _wasKind, ...bare } = rest;
                        return bare;
                      })
                  : undefined
              }
            >
              <Tiles
                columns={3}
                testPrefix="filter-market"
                value={market}
                onPick={pickMarket}
                options={marketOptions}
              />
            </Group>

            {/* --------------------------------------------------- price */}
            <Group
              id="filter-price"
              title={copy.priceRange}
              clearLabel={copy.clear}
              onClear={
                draft.minNaira || draft.maxNaira
                  ? () => setDraft((current) => ({ ...current, minNaira: "", maxNaira: "" }))
                  : undefined
              }
            >
              <div className="nf-range" data-testid="filter-range">
                <span aria-hidden="true" className="nf-range__track" />
                <span
                  aria-hidden="true"
                  className="nf-range__fill"
                  style={{
                    left: `${((sliderMin - scale.floor) / scale.span) * 100}%`,
                    right: `${100 - ((sliderMax - scale.floor) / scale.span) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  aria-label="Minimum price"
                  data-testid="filter-range-min"
                  min={scale.floor}
                  max={scale.ceiling}
                  step={scale.step}
                  value={sliderMin}
                  onChange={(event) => {
                    const next = Math.min(Number(event.target.value), sliderMax - scale.step);
                    setDraft((current) => ({
                      ...current,
                      minNaira: next <= scale.floor ? "" : String(next),
                    }));
                  }}
                  className="nf-range__input"
                />
                <input
                  type="range"
                  aria-label="Maximum price"
                  data-testid="filter-range-max"
                  min={scale.floor}
                  max={scale.ceiling}
                  step={scale.step}
                  value={sliderMax}
                  onChange={(event) => {
                    const next = Math.max(Number(event.target.value), sliderMin + scale.step);
                    setDraft((current) => ({
                      ...current,
                      maxNaira: next >= scale.ceiling ? "" : String(next),
                    }));
                  }}
                  className="nf-range__input"
                />
              </div>
              {/* Money formats from kobo through formatMoney, never from naira. */}
              <div className="nf-filters__range-labels nf-numeric">
                <span>{formatMoney(nairaToKobo(sliderMin), locale)}</span>
                <span>
                  {sliderMax >= scale.ceiling
                    ? `${formatMoney(nairaToKobo(scale.ceiling), locale)}+`
                    : formatMoney(nairaToKobo(sliderMax), locale)}
                </span>
              </div>
              {sliderMax >= scale.ceiling && (
                <p className="nf-filters__hint mt-inline-tight">{copy.noUpperLimit}</p>
              )}
            </Group>

            {/* ------------------------------------------------ bedrooms */}
            <Group
              id="filter-bedrooms"
              title={copy.bedrooms}
              clearLabel={copy.clear}
              onClear={
                draft.bedrooms > 0
                  ? () => setDraft((current) => ({ ...current, bedrooms: 0 }))
                  : undefined
              }
            >
              <Tiles
                columns={5}
                testPrefix="filter-bedrooms"
                value={draft.bedrooms}
                onPick={(value) => setDraft((current) => ({ ...current, bedrooms: value }))}
                options={roomTiles}
              />
            </Group>

            {/* ----------------------------------------------- bathrooms */}
            <Group
              id="filter-bathrooms"
              title={copy.bathrooms}
              clearLabel={copy.clear}
              onClear={
                draft.bathrooms > 0
                  ? () => setDraft((current) => ({ ...current, bathrooms: 0 }))
                  : undefined
              }
            >
              <Tiles
                columns={5}
                testPrefix="filter-bathrooms"
                value={draft.bathrooms}
                onPick={(value) => setDraft((current) => ({ ...current, bathrooms: value }))}
                options={roomTiles}
              />
            </Group>

            {/* ----------------------------------------------- amenities */}
            {amenityOptions.length > 0 && (
              <Group
                id="filter-amenities"
                title={copy.amenities}
                clearLabel={copy.clear}
                onClear={
                  draft.amenities.length > 0
                    ? () => setDraft((current) => ({ ...current, amenities: [] }))
                    : undefined
                }
              >
                <div className="divide-y divide-[var(--nf-divider)]">
                  {amenityOptions.map((code) => (
                    <div key={code} data-testid={`filter-amenity-${code}`}>
                      <SwitchRow
                        icon={AMENITY_ICON[code] ?? "sparkle"}
                        label={amenityLabel(code)}
                        checked={draft.amenities.includes(code)}
                        onChange={(next) => toggleAmenity(code, next)}
                        testId={`filter-amenity-switch-${code}`}
                      />
                    </div>
                  ))}
                </div>
              </Group>
            )}

            {/* ------------------------------------------ light and water */}
            {showUtilities && (
              <Group
                id="filter-utilities"
                title={copy.lightAndWater}
                clearLabel={copy.clear}
                onClear={
                  draft.powerBackup || draft.powerBandA || draft.waterSupply.length > 0
                    ? () =>
                        setDraft((current) => ({
                          ...current,
                          powerBackup: false,
                          powerBandA: false,
                          waterSupply: [],
                        }))
                    : undefined
                }
              >
                <div className="divide-y divide-[var(--nf-divider)]">
                  {utilityOptions.backup && (
                    <SwitchRow
                      icon="bolt"
                      label={copy.backupPower}
                      checked={draft.powerBackup}
                      testId="filter-power-backup"
                      onChange={(next) => setDraft((current) => ({ ...current, powerBackup: next }))}
                    />
                  )}
                  {utilityOptions.bandA && (
                    <SwitchRow
                      icon="bolt"
                      label={copy.bandA}
                      checked={draft.powerBandA}
                      testId="filter-power-band-a"
                      onChange={(next) => setDraft((current) => ({ ...current, powerBandA: next }))}
                    />
                  )}
                </div>
                {utilityOptions.water.length > 0 && (
                  <>
                    <p className="nf-filters__hint mt-sm">{copy.water}</p>
                    <div className="flex flex-wrap gap-xs">
                      {utilityOptions.water.map((value) => {
                        const on = draft.waterSupply.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={on}
                            data-testid={`filter-water-${value.toLowerCase()}`}
                            onClick={() => toggleWater(value)}
                            className="nf-filters__tile"
                          >
                            {WATER_LABEL[value]}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </Group>
            )}

            {/* ------------------------------------------------ trust */}
            <Group
              id="filter-booking"
              title={copy.trust}
              clearLabel={copy.clear}
              onClear={
                draft.instantBook || draft.verifiedOnly
                  ? () =>
                      setDraft((current) => ({
                        ...current,
                        instantBook: false,
                        verifiedOnly: false,
                      }))
                  : undefined
              }
            >
              <div className="divide-y divide-[var(--nf-divider)]">
                <SwitchRow
                  icon="sparkle"
                  label={copy.instant}
                  checked={draft.instantBook}
                  testId="filter-instant"
                  onChange={(next) => setDraft((current) => ({ ...current, instantBook: next }))}
                />
                <SwitchRow
                  icon="verified"
                  label={copy.verifiedOnly}
                  checked={draft.verifiedOnly}
                  testId="filter-verified"
                  onChange={(next) => setDraft((current) => ({ ...current, verifiedOnly: next }))}
                />
              </div>
            </Group>

            {/* ------------------------------------------------ location */}
            <Group
              id="filter-location"
              title={copy.location}
              clearLabel={copy.clear}
              onClear={
                draft.q.trim().length > 0
                  ? () => setDraft((current) => ({ ...current, q: "" }))
                  : undefined
              }
            >
              <label className="nf-filters__row">
                <UiIcon name="location" size={ICON.inline} />
                <span className="sr-only">{copy.location}</span>
                <input
                  type="search"
                  autoComplete="off"
                  data-testid="filter-search"
                  value={draft.q}
                  onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
                  placeholder={copy.locationPlaceholder}
                  className="nf-filters__row-input"
                />
                <UiIcon name="chevron-right" size={16} className="text-[var(--nf-content-muted)]" />
              </label>
            </Group>

            {/* ---------------------------------------------------- sort */}
            {/* Clearing a sort means going back to the order the shelf opens
                in, which is the first entry in SORTS, so the control is live
                exactly when the reader has moved off it. */}
            <Group
              id="filter-sort"
              title={copy.sortBy}
              clearLabel={copy.clear}
              onClear={
                SORTS[0] && draft.sort !== SORTS[0].key
                  ? () => setDraft((current) => ({ ...current, sort: SORTS[0]!.key }))
                  : undefined
              }
            >
              <label className="nf-filters__row">
                <UiIcon name="sliders" size={ICON.inline} />
                <span className="sr-only">{copy.sortBy}</span>
                <select
                  value={draft.sort}
                  data-testid="filter-sort"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, sort: event.target.value as SortKey }))
                  }
                  className="nf-filters__row-select"
                >
                  {SORTS.map((sort) => (
                    <option key={sort.key} value={sort.key}>
                      {sort.label}
                    </option>
                  ))}
                </select>
                <UiIcon name="chevron-down" size={16} className="text-[var(--nf-content-muted)]" />
              </label>
            </Group>
          </div>
        </div>

        <div className="nf-filters__foot">
          <Button variant="secondary" data-testid="filters-clear" onClick={clearAll} full size="lg">
            {copy.reset}
          </Button>
          <Button variant="primary" data-testid="filters-apply" onClick={apply} full size="lg">
            {matchCount === 0
              ? copy.applyNone
              : copy.apply.replace("{count}", formatNumber(matchCount, locale))}
            <span className="sr-only">
              {" "}
              {matchCount === 1 ? noun.one : noun.many}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        data-testid="filters-open"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={activeCount === 0 ? copy.title : `${copy.title}, ${activeCount}`}
        onClick={() => setOpen(true)}
        className="nf-shelf-square relative"
      >
        <UiIcon name="sliders" size={ICON.inline} />
        {activeCount > 0 && (
          <span
            data-testid="filters-count"
            aria-hidden="true"
            className="nf-badge-overlap nf-numeric nf-caption top-[-0.4rem] right-[-0.4rem] min-w-5 justify-center px-2xs py-3xs"
          >
            {activeCount}
          </span>
        )}
      </button>
      {mounted && open ? createPortal(panel, document.body) : null}
    </>
  );
}
