"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatMoney, formatNumber, type Locale } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { hasBackupPower, matchesFacts, type ListingFacts } from "@/lib/listings/filter";
import { WATER_SOURCES, type ListingKind, type WaterSupply } from "@/lib/listings/types";
import {
  KIND_NOUN,
  KIND_ORDER,
  activeFilterCount,
  clearedFilters,
  kindLabel,
  koboToNaira,
  nairaToKobo,
  toFilter,
  toSearchHref,
  WATER_LABEL,
  type DiscoveryQuery,
} from "@/lib/listings/search-params";
import { amenityLabel, sortAmenityCodes } from "./amenities";
import { ICON } from "@/components/app/Screen";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";

/**
 * The filter control and its drawer.
 *
 * Two things live together here because they are one thing to a traveller: the
 * glass control that sits inside the search bar, and the full-page drawer it
 * opens. House rule, no partial sheets: the drawer owns the whole viewport, so
 * a long filter list never fights the page underneath it for the scroll.
 *
 * Three properties this component is built around:
 *
 * 1. **The URL is the truth.** Nothing is applied to a hidden client store.
 *    Apply pushes a new address and the server re-renders the results; the back
 *    button walks the hunt backwards, and the link can be sent to anyone.
 * 2. **The count is real.** The candidate pool is handed down as plain facts and
 *    counted with `matchesFacts`, the same function the repository and the
 *    partner decorator run on the server. The number on the button is what the
 *    next page will contain, not an estimate.
 * 3. **It is portalled to the body.** The search bar is a backdrop-filter
 *    surface, and a `backdrop-filter` ancestor becomes the containing block for
 *    fixed descendants, which would trap a full-screen overlay inside the
 *    header. `MobileMenu` learned this the hard way; the drawer does not
 *    relearn it.
 */

type Draft = {
  /** The scoped text search, applied with everything else on Apply. */
  q: string;
  /**
   * The market, applied with everything else on Apply.
   *
   * It is in the draft rather than read straight off the address bar because
   * the category is a CONTROL here now: the rail that used to own it sat above
   * the results and navigated on tap, so nothing in this drawer could hold a
   * pending opinion about it. Undefined is every category, which is what
   * tapping the selected one gives back.
   */
  kind?: ListingKind;
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

function draftFrom(query: DiscoveryQuery): Draft {
  return {
    q: query.q ?? "",
    ...(query.kind !== undefined ? { kind: query.kind } : {}),
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

/** Digits only, so a pasted "N 120,000" still lands as 120000. */
function digits(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 9);
}

function nairaOf(value: string): number | undefined {
  const clean = digits(value);
  if (clean.length === 0) return undefined;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A draft, back in the shape the URL and the matcher both understand. */
function queryFrom(base: DiscoveryQuery, draft: Draft): DiscoveryQuery {
  let min = nairaOf(draft.minNaira);
  let max = nairaOf(draft.maxNaira);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

  const next: DiscoveryQuery = {
    sort: base.sort,
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
  // The draft, not `base`. Reading the category off the address bar here was
  // correct while the rail owned it and is a dropped choice now: the drawer's
  // own control would have painted a new category and applied the old one.
  if (draft.kind) next.kind = draft.kind;
  if (min !== undefined) next.minMinor = nairaToKobo(min);
  if (max !== undefined) next.maxMinor = nairaToKobo(max);
  if (draft.bedrooms > 0) next.bedrooms = draft.bedrooms;
  if (draft.bathrooms > 0) next.bathrooms = draft.bathrooms;
  if (draft.guests > 0) next.guests = draft.guests;
  return next;
}

/** The bedroom row, as the reference has it: 1, 2, 3 and "4+". */
const BEDROOM_STEPS: { value: number; label: string }[] = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4+" },
];

/**
 * The slider's own arithmetic, in whole naira.
 *
 * A range control needs a floor, a ceiling and a step, and the honest source
 * for all three is what the pool in front of the reader actually costs. A
 * pool with no prices at all (a partner venue list) still needs a usable
 * control, so it falls back to a bracket wide enough for both markets.
 */
function sliderScale(low: number | undefined, high: number | undefined) {
  const floor = 0;
  const ceiling = high !== undefined && high > 0 ? Math.ceil(koboToNaira(high) / 1000) * 1000 : 5_000_000;
  const span = Math.max(1, ceiling - floor);
  // A hundred stops across the range, rounded to something a person would
  // type, so dragging lands on round numbers rather than on 187,431.
  const raw = Math.max(1, Math.round(span / 100));
  const magnitude = 10 ** Math.max(0, String(Math.floor(raw)).length - 1);
  const step = Math.max(1, Math.round(raw / magnitude) * magnitude);
  void low;
  return { floor, ceiling, span, step };
}

/* ------------------------------------------------------------- small parts */

/**
 * The line under a group's heading that says what the control does.
 *
 * One constant because it was typed out six times at `mt-0.5 text-[0.75rem]`,
 * which is a 2px gap under a heading and 12px type. 2px is not an interval, it
 * is a heading and a sentence touching; a title and its own subtitle are two
 * rows of one object and take the row interval, which is what every other
 * screen on the platform uses for the same pair. 12px was under the readable
 * floor on the copy that explains what each filter actually means.
 */
const HINT = "mt-row nf-caption text-[var(--nf-content-muted)]";

/**
 * One filter group.
 *
 * SEVEN `nf-card`s USED TO SIT HERE, ONE PER GROUP, INSIDE A DRAWER THAT IS
 * ALREADY A FULL-SCREEN SURFACE.
 *
 * Each one carried the card material: a gradient fill, a 14px backdrop blur, a
 * lit rim and rung-1 elevation. Stacked seven deep in a scrolling column that
 * is the "jam-packed" reading exactly, and none of them was a card by the
 * surface language's own definition, which reserves the raised surface for a
 * discrete OBJECT you could pick up and move somewhere else. A price range is
 * not an object, it is a section of a form.
 *
 * What groups them instead is what groups a section anywhere else on the
 * platform: the heading, the air, and ONE hairline where a new subject starts.
 * Seven borders with seven blurs become six lines.
 *
 * The `aria-labelledby` wiring is why this is local rather than `Section` from
 * the screen language: a `<section>` with no accessible name is not announced
 * as a region at all, and `Section` does not forward the id onto its heading.
 */
function Group({
  id,
  title,
  divided = true,
  children,
}: {
  id: string;
  title: string;
  /** Off for the first group, where a rule would be drawn against the header. */
  divided?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={divided ? "nf-hairline pt-block" : undefined}
    >
      <h2 id={id} className="nf-h4 text-[var(--nf-content-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The drawer's switch row.
 *
 * This was the platform's second hand-rolled toggle, and the worse one. It
 * animated the thumb on `left`, which is a LAYOUT property: the browser reflows
 * the row on every frame of the 200ms travel instead of compositing a
 * transform. The thumb was `bg-white` with a `ring-black/10`, two raw literals
 * in a codebase whose token file opens by forbidding them, and white is simply
 * the wrong colour on the light theme. The `Switch` primitive fixes all three
 * and carries the 44pt hit region.
 *
 * What is kept here is genuinely this file's job: the drawer's own label
 * typography, and the `data-testid`. The id sits on a span wrapping the control
 * rather than on the control itself, because the primitive does not forward
 * unknown props - the element is still the switch's own box, so a click on it
 * lands on the switch.
 *
 * One deliberate change: the whole row used to be the button, so tapping the
 * label toggled. It now behaves like every other switch row on the platform -
 * the control is the control - which is what makes the label selectable text
 * rather than a trap.
 */
function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  testId,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex min-h-11 w-full items-center justify-between gap-md py-xs text-left">
      <span className="min-w-0">
        <span className="block nf-body-sm font-semibold text-[var(--nf-content-primary)]">
          {label}
        </span>
        <span className="block nf-caption text-[var(--nf-content-muted)]">{hint}</span>
      </span>
      <span data-testid={testId} className="shrink-0">
        <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ drawer */

export function FilterDrawer({
  query,
  facts,
  locale,
  openOnMount = false,
}: {
  query: DiscoveryQuery;
  /** Open immediately, for arrivals from ?filters=open. */
  openOnMount?: boolean;
  /** The candidate pool: this text and category, before any structured bound. */
  facts: ListingFacts[];
  locale: Locale;
}) {
  const router = useRouter();
  // A link from a surface with no pool (landing, home) arrives with
  // ?filters=open, so the drawer opens where the bounds are real.
  const [open, setOpen] = useState(openOnMount);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(query));
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  // The address bar is the truth: whenever it moves, the draft follows it, so
  // reopening the drawer after a back navigation never shows a stale choice.
  useEffect(() => setDraft(draftFrom(query)), [query]);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  useOverlay({ open, onClose: close, panelRef, autoFocus: false });

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  const activeCount = activeFilterCount(query);

  /**
   * The markets this pool actually holds, so no category promises nothing.
   *
   * Same rule the amenity and water controls below already follow, and the
   * rail it replaces did not: the rail drew twelve fixed objects, one of them
   * `experience`, which `KIND_BY_PROPERTY_TYPE` in the repository cannot even
   * produce, so a category that could never return a single place had a
   * permanent seat above the results.
   *
   * The reader's own choice is kept in the list whatever the pool says,
   * because a control that vanishes while it is switched on leaves an applied
   * category with nothing to turn it off.
   */
  const kindOptions = useMemo(() => {
    const present = new Set<ListingKind>();
    for (const fact of facts) present.add(fact.kind);
    if (draft.kind) present.add(draft.kind);
    return KIND_ORDER.filter((kind) => present.has(kind));
  }, [facts, draft.kind]);

  /** Amenities the pool actually has, so no chip promises an empty result. */
  const amenityOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const fact of facts) for (const code of fact.amenities) codes.add(code);
    for (const code of draft.amenities) codes.add(code);
    return sortAmenityCodes([...codes]);
  }, [facts, draft.amenities]);

  /**
   * What this pool can honestly be asked about light and water.
   *
   * A filter nobody's listing can satisfy is a dead end with a nice control on
   * it, and these three are strict by design: a host who never answered is
   * excluded, and the seed catalogue and partner stock never answer at all. So
   * each control appears only when the pool holds at least one place it could
   * return, and the water chips list only the sources actually present. This
   * is the same rule the amenity chips above already follow, for the same
   * reason.
   *
   * A choice the reader has already made is always kept in the list even if
   * nothing carries it, because a control that vanishes while switched on
   * leaves an active filter with no way to turn it off.
   */
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
    return {
      backup,
      bandA,
      water: WATER_SOURCES.filter((value) => water.has(value)),
    };
  }, [facts, draft.powerBackup, draft.powerBandA, draft.waterSupply]);

  const showUtilities =
    utilityOptions.backup || utilityOptions.bandA || utilityOptions.water.length > 0;

  const pending = useMemo(() => queryFrom(query, draft), [query, draft]);
  const matchCount = useMemo(() => {
    const filter = toFilter(pending);
    return facts.filter((fact) => matchesFacts(fact, filter)).length;
  }, [facts, pending]);

  /** Honest placeholders: what this pool actually costs, in whole naira. */
  const bounds = useMemo(() => {
    let low: number | undefined;
    let high: number | undefined;
    for (const fact of facts) {
      if (fact.priceMinor <= 0) continue;
      if (low === undefined || fact.priceMinor < low) low = fact.priceMinor;
      if (high === undefined || fact.priceMinor > high) high = fact.priceMinor;
    }
    return { low, high };
  }, [facts]);

  /* The slider works in whole naira because that is what a person reads on
     it. Everything crossing a boundary is kobo: the labels format from kobo
     and the applied query stores kobo. */
  const scale = useMemo(() => sliderScale(bounds.low, bounds.high), [bounds.low, bounds.high]);
  const sliderFloor = scale.floor;
  const sliderCeiling = scale.ceiling;
  const sliderSpan = scale.span;
  const sliderStep = scale.step;

  /*
   * Every one of these follows the DRAFT category, not the applied one.
   *
   * The noun on the Apply button, the price period and the search field's own
   * scope all describe what the pending filter set is about. Left on
   * `query.kind` they would have gone on saying "hotels, per night" while the
   * reader looked at a shortlet selection they had not applied yet, which is
   * the button lying about the thing it is counting.
   */
  const noun = draft.kind ? KIND_NOUN[draft.kind] : { one: "place", many: "places" };
  const period =
    draft.kind === "rental"
      ? "per year"
      : draft.kind === "restaurant" || draft.kind === "experience"
        ? "per guest"
        : draft.kind
          ? "per night"
          : "per night, or per year for a rental";

  /* What the pool holds in the drafted category, for the header's count. The
     pool spans every category now, so `facts.length` would report the whole
     catalogue under a category noun. */
  const inKind = useMemo(
    () => (draft.kind ? facts.filter((fact) => fact.kind === draft.kind).length : facts.length),
    [facts, draft.kind],
  );

  // Naira, because that is what the control holds. It becomes kobo the moment
  // it is shown or stored, and never before. An empty bound means "no limit",
  // which on the slider is the far end of the track.
  const minInNaira = nairaOf(draft.minNaira);
  const maxInNaira = nairaOf(draft.maxNaira);
  const sliderMin = Math.min(Math.max(minInNaira ?? sliderFloor, sliderFloor), sliderCeiling);
  const sliderMax = Math.max(Math.min(maxInNaira ?? sliderCeiling, sliderCeiling), sliderFloor);

  /* What the search is scoped to, for the field's own placeholder. The area
     the reader typed wins, then the category, then the whole catalogue. */
  const scopeLabel = draft.q.trim() || (draft.kind ? KIND_NOUN[draft.kind].many : "all places");

  function apply() {
    router.push(toSearchHref(pending));
    setOpen(false);
  }

  function clearAll() {
    const cleared = clearedFilters(query);
    setDraft(draftFrom(cleared));
    router.push(toSearchHref(cleared));
    setOpen(false);
  }

  /* Tapping the selected market clears it rather than dead-ending on it, which
     is the one behaviour the rail had that a person actually relied on. */
  function toggleKind(value: ListingKind) {
    setDraft((current) => {
      const { kind: _was, ...rest } = current;
      return current.kind === value ? rest : { ...rest, kind: value };
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

  function toggleAmenity(code: string) {
    setDraft((current) => ({
      ...current,
      amenities: current.amenities.includes(code)
        ? current.amenities.filter((c) => c !== code)
        : [...current.amenities, code],
    }));
  }

  const panel = (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Filters">
      <button
        type="button"
        aria-label="Close filters"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 bg-[var(--nf-overlay-backdrop)] backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        data-testid="filters-drawer"
        className="absolute inset-0 flex flex-col bg-[var(--nf-surface-primary)]"
      >
        {/* ------------------------------------------------------- header */}
        <header className="nf-glass flex items-center gap-row border-b border-[var(--nf-border-subtle)] px-gutter py-row">
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close filters"
            className="nf-icon-btn h-11 w-11"
          >
            <UiIcon name="arrow-left" size={ICON.inline} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="nf-body font-bold text-[var(--nf-content-primary)]">Filters</p>
            {/* The count follows the drafted category, so switching market in
                the control below re-reads the pool the reader is narrowing. */}
            <p className="nf-caption text-[var(--nf-content-muted)]">
              {formatNumber(inKind, locale)} {inKind === 1 ? noun.one : noun.many} to narrow
            </p>
          </div>
        </header>

        {/* -------------------------------------------------------- body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-gutter py-block">
          <div className="nf-stack nf-stack--block mx-auto max-w-2xl">
            {/* ----------------------------------------------- category */}
            {/*
              THE CATEGORY LIVES HERE NOW, AND THE RAIL ABOVE THE RESULTS IS
              GONE.

              It was the last sub-navigation on the platform: twelve objects in
              a horizontal scroller pinned under the search bar, taking a row of
              a phone screen on every search whether or not anybody wanted to
              change market. It could not simply be deleted, because it was the
              only category control there was and deleting it would have deleted
              the function.

              Drawn as segments rather than as the rail's objects because that
              is what a choice inside this drawer already looks like: the
              bedroom row directly below is the same control, and one of a set
              with tap-again-to-clear is the same behaviour the rail had. Two
              up on a phone so every market is readable at once rather than half
              of them living off the right edge, which was the rail's other
              fault.
            */}
            {kindOptions.length > 1 && (
              <Group id="filter-kind" title="Category" divided={false}>
                <p className={HINT}>What kind of place. Tap again to clear.</p>
                <div className="mt-heading grid grid-cols-2 gap-xs sm:grid-cols-3">
                  {kindOptions.map((kind) => {
                    const on = draft.kind === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        aria-pressed={on}
                        data-testid={`filter-kind-${kind}`}
                        onClick={() => toggleKind(kind)}
                        className={`nf-segment min-h-11 ${on ? "nf-segment--on" : ""}`}
                      >
                        {kindLabel(kind)}
                      </button>
                    );
                  })}
                </div>
              </Group>
            )}

            {/* ------------------------------------------------- search */}
            {/* Scoped to wherever the reader already is, so the field reads as
                "narrow this" rather than "start again". */}
            <Group id="filter-search-group" title="Search" divided={kindOptions.length > 1}>
              {/* The fourth hand-rolled search bar, each at its own icon size
                  and its own left padding. `clearable` is new here and matters
                  most in a drawer: the scoped text is applied on Apply, so a
                  reader who changes their mind needs to empty it before the
                  count on the button means anything. */}
              <TextField
                className="mt-heading"
                label={`Search in ${scopeLabel}`}
                hideLabel
                type="search"
                leadingIcon="search"
                clearable="Clear the search"
                onClear={() => setDraft((current) => ({ ...current, q: "" }))}
                data-testid="filter-search"
                value={draft.q}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, q: event.target.value }))
                }
                placeholder={`Search in ${scopeLabel}...`}
              />
            </Group>

            {/* -------------------------------------------------- price */}
            <Group id="filter-price" title="Price range">
              <p className={HINT}>Naira {period}.</p>

              {/* The two figures the handles are standing on, printed above
                  them, because a slider with no numbers is a guess. Money
                  formats through formatMoney from kobo, never from naira. */}
              <div className="mt-heading flex items-baseline justify-between gap-row">
                <p className="nf-numeric nf-body font-bold text-[var(--nf-content-primary)]">
                  {formatMoney(nairaToKobo(sliderMin), locale)}
                </p>
                <p className="nf-numeric nf-body font-bold text-[var(--nf-content-primary)]">
                  {sliderMax >= sliderCeiling
                    ? `${formatMoney(nairaToKobo(sliderCeiling), locale)}+`
                    : formatMoney(nairaToKobo(sliderMax), locale)}
                </p>
              </div>

              <div className="nf-range mt-group" data-testid="filter-range">
                <span aria-hidden="true" className="nf-range__track" />
                <span
                  aria-hidden="true"
                  className="nf-range__fill"
                  style={{
                    left: `${((sliderMin - sliderFloor) / sliderSpan) * 100}%`,
                    right: `${100 - ((sliderMax - sliderFloor) / sliderSpan) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  aria-label="Minimum price"
                  data-testid="filter-range-min"
                  min={sliderFloor}
                  max={sliderCeiling}
                  step={sliderStep}
                  value={sliderMin}
                  onChange={(event) => {
                    const next = Math.min(Number(event.target.value), sliderMax - sliderStep);
                    setDraft((current) => ({
                      ...current,
                      minNaira: next <= sliderFloor ? "" : String(next),
                    }));
                  }}
                  className="nf-range__input"
                />
                <input
                  type="range"
                  aria-label="Maximum price"
                  data-testid="filter-range-max"
                  min={sliderFloor}
                  max={sliderCeiling}
                  step={sliderStep}
                  value={sliderMax}
                  onChange={(event) => {
                    const next = Math.max(Number(event.target.value), sliderMin + sliderStep);
                    setDraft((current) => ({
                      ...current,
                      maxNaira: next >= sliderCeiling ? "" : String(next),
                    }));
                  }}
                  className="nf-range__input"
                />
              </div>
              <p className="mt-row nf-caption text-[var(--nf-content-muted)]">
                Drag either end. At the far right there is no upper limit.
              </p>
            </Group>

            {/* ----------------------------------------------- bedrooms */}
            <Group id="filter-bedrooms" title="Bedrooms">
              <p className={HINT}>At least this many. Tap again to clear.</p>
              <div className="mt-heading grid grid-cols-4 gap-xs">
                {BEDROOM_STEPS.map((step) => {
                  const on = draft.bedrooms === step.value;
                  return (
                    <button
                      key={step.value}
                      type="button"
                      aria-pressed={on}
                      data-testid={`filter-bedrooms-${step.value}`}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          bedrooms: current.bedrooms === step.value ? 0 : step.value,
                        }))
                      }
                      className={`nf-segment min-h-11 ${on ? "nf-segment--on" : ""}`}
                    >
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </Group>

            {/* -------------------------------------------- more filters */}
            {amenityOptions.length > 0 && (
              <Group id="filter-amenities" title="More filters">
                <p className={HINT}>Pick as many as you like. Every one has to be there.</p>
                {/*
                  Wrapping, not a rail: every amenity has to be readable at
                  once, so this stays a `flex-wrap` list rather than becoming a
                  `ChipRow` that hides half of them off-screen.

                  `behaviour="filter"` keeps the `aria-pressed` these already
                  announced - each amenity toggles independently, they are not
                  one choice out of a set. `min-h-11` is gone because inflating
                  the box was the wrong fix for the 44pt floor; the primitive
                  paints at 36px and overflows an invisible target instead.
                  The `data-testid` moves to the `li`, which wraps the chip
                  exactly, because the primitive forwards no unknown props.
                */}
                <ul className="mt-heading flex flex-wrap gap-xs">
                  {amenityOptions.map((code) => {
                    const on = draft.amenities.includes(code);
                    return (
                      <li key={code} data-testid={`filter-amenity-${code}`}>
                        <Chip
                          size="sm"
                          behaviour="filter"
                          selected={on}
                          icon={on ? "verified" : undefined}
                          onSelectedChange={() => toggleAmenity(code)}
                        >
                          {amenityLabel(code)}
                        </Chip>
                      </li>
                    );
                  })}
                </ul>
              </Group>
            )}

            {/* --------------------------------------- light and water */}
            {/*
              Above Booking and trust on purpose. Instant book and a verified
              badge matter; whether there will be light and water when you
              arrive decides whether the rest of the search was worth doing,
              and no competitor here asks it structurally. It sits below price
              and bedrooms only because those are what a person types first.

              Every control in this section is strict: a place whose host has
              not answered is not offered to somebody who asked. That is why
              the whole section is conditional on the pool holding an answer,
              and why the copy says "the host has answered" rather than
              implying an absence is a no.
            */}
            {showUtilities && (
              <Group id="filter-utilities" title="Light and water">
                <p className={HINT}>
                  Only places where the host has answered. Somewhere that has not said is
                  left out rather than assumed.
                </p>

                <div className="mt-group divide-y divide-[var(--nf-divider)]">
                  {utilityOptions.backup && (
                    <SwitchRow
                      label="Backup power"
                      hint="A generator, an inverter or solar, on top of the grid"
                      checked={draft.powerBackup}
                      testId="filter-power-backup"
                      onChange={(next) =>
                        setDraft((current) => ({ ...current, powerBackup: next }))
                      }
                    />
                  )}
                  {utilityOptions.bandA && (
                    <SwitchRow
                      label="Band A feeder"
                      hint="The top grid band, which is what the disco bills for"
                      checked={draft.powerBandA}
                      testId="filter-power-band-a"
                      onChange={(next) =>
                        setDraft((current) => ({ ...current, powerBandA: next }))
                      }
                    />
                  )}
                </div>

                {utilityOptions.water.length > 0 && (
                  <>
                    <h3 className="mt-block nf-body-sm font-semibold text-[var(--nf-content-primary)]">
                      Where the water comes from
                    </h3>
                    <p className={HINT}>
                      Pick any that would do. Water comes from one place, so these widen
                      the search rather than narrowing it.
                    </p>
                    <ul className="mt-heading flex flex-wrap gap-xs">
                      {utilityOptions.water.map((value) => {
                        const on = draft.waterSupply.includes(value);
                        return (
                          <li key={value} data-testid={`filter-water-${value.toLowerCase()}`}>
                            <Chip
                              size="sm"
                              behaviour="filter"
                              selected={on}
                              icon={on ? "verified" : undefined}
                              onSelectedChange={() => toggleWater(value)}
                            >
                              {WATER_LABEL[value]}
                            </Chip>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </Group>
            )}

            {/* ----------------------------------------------- switches */}
            <Group id="filter-booking" title="Booking and trust">
              <div className="mt-group divide-y divide-[var(--nf-divider)]">
              <SwitchRow
                label="Instant book"
                hint="Confirmed at once, with no wait for a reply"
                checked={draft.instantBook}
                testId="filter-instant"
                onChange={(next) => setDraft((current) => ({ ...current, instantBook: next }))}
              />
              <SwitchRow
                label="Verified only"
                hint="Our own inventory, checked before it was published"
                checked={draft.verifiedOnly}
                testId="filter-verified"
                onChange={(next) => setDraft((current) => ({ ...current, verifiedOnly: next }))}
              />
              </div>
            </Group>
          </div>
        </div>

        {/* ------------------------------------------------------- footer */}
        {/* Apply is the whole width because it is the whole point. Reset sits
            directly under it, quiet, so it is reachable without ever being
            the thing a thumb lands on by accident. */}
        <div className="nf-glass border-t border-[var(--nf-border-subtle)] px-gutter py-row">
          <div className="mx-auto grid max-w-2xl gap-xs">
            <Button
              variant="primary"
              data-testid="filters-apply"
              onClick={apply}
              full
              className="min-h-12 nf-body"
            >
              {matchCount === 0
                ? "No places match yet"
                : `Apply filters, ${formatNumber(matchCount, locale)} ${
                    matchCount === 1 ? noun.one : noun.many
                  }`}
            </Button>
            <Button
              variant="ghost"
              data-testid="filters-clear"
              onClick={clearAll}
              full
              className="min-h-11 nf-body-sm"
            >
              Reset
            </Button>
          </div>
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
        aria-label={
          activeCount === 0 ? "Filters" : `Filters, ${activeCount} active`
        }
        onClick={() => setOpen(true)}
        className="nf-icon-btn nf-icon-btn--square relative h-[3.25rem] w-[3.25rem] shrink-0"
      >
        <UiIcon name="sliders" size={ICON.inline} />
        {activeCount > 0 && (
          <span
            data-testid="filters-count"
            aria-hidden="true"
            /* 0.6875rem, which is 11px, was below the readable floor on the one
               number that tells somebody the results are already narrowed.
               `nf-caption` is the quietest tier that still reads. */
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
