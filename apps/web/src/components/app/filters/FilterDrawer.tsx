"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatMoney, formatNumber, type Locale } from "@naijafinds/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { matchesFacts, type ListingFacts } from "@/lib/listings/filter";
import {
  KIND_NOUN,
  activeFilterCount,
  clearedFilters,
  koboToNaira,
  nairaToKobo,
  toFilter,
  toSearchHref,
  type DiscoveryQuery,
} from "@/lib/listings/search-params";
import { amenityLabel, sortAmenityCodes } from "./amenities";

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
  minNaira: string;
  maxNaira: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  amenities: string[];
  instantBook: boolean;
  verifiedOnly: boolean;
};

function draftFrom(query: DiscoveryQuery): Draft {
  return {
    q: query.q ?? "",
    minNaira: query.minMinor === undefined ? "" : String(koboToNaira(query.minMinor)),
    maxNaira: query.maxMinor === undefined ? "" : String(koboToNaira(query.maxMinor)),
    bedrooms: query.bedrooms ?? 0,
    bathrooms: query.bathrooms ?? 0,
    guests: query.guests ?? 0,
    amenities: query.amenities,
    instantBook: query.instantBook,
    verifiedOnly: query.verifiedOnly,
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
  };
  const q = draft.q.trim();
  if (q.length > 0) next.q = q;
  if (base.kind) next.kind = base.kind;
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

function Stepper({
  label,
  hint,
  value,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const id = `stepper-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p id={id} className="text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
          {label}
        </p>
        <p className="text-[0.75rem] text-[var(--nf-content-muted)]">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="nf-icon-btn h-11 w-11 disabled:opacity-35"
        >
          <span className="block h-[2px] w-3.5 rounded-full bg-current" aria-hidden="true" />
        </button>
        <output
          aria-labelledby={id}
          className="nf-numeric w-14 text-center text-[0.875rem] font-semibold text-[var(--nf-content-primary)]"
        >
          {value === 0 ? "Any" : `${value}+`}
        </output>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="nf-icon-btn h-11 w-11 disabled:opacity-35"
        >
          <span className="relative block h-3.5 w-3.5" aria-hidden="true">
            <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-current" />
            <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full bg-current" />
          </span>
        </button>
      </div>
    </div>
  );
}

function Switch({
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-4 py-2 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[0.875rem] font-semibold text-[var(--nf-content-primary)]">
          {label}
        </span>
        <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ${
          checked
            ? "border-transparent bg-[var(--nf-brand-primary)]"
            : "border-[var(--nf-border-strong)] bg-[var(--nf-surface-inset)]"
        }`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-[left] duration-200 ${
            checked ? "left-[1.5rem]" : "left-[0.15rem]"
          }`}
        />
      </span>
    </button>
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

  useEffect(() => setMounted(true), []);

  // The address bar is the truth: whenever it moves, the draft follows it, so
  // reopening the drawer after a back navigation never shows a stale choice.
  useEffect(() => setDraft(draftFrom(query)), [query]);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const activeCount = activeFilterCount(query);

  /** Amenities the pool actually has, so no chip promises an empty result. */
  const amenityOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const fact of facts) for (const code of fact.amenities) codes.add(code);
    for (const code of draft.amenities) codes.add(code);
    return sortAmenityCodes([...codes]);
  }, [facts, draft.amenities]);

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

  const noun = query.kind ? KIND_NOUN[query.kind] : { one: "place", many: "places" };
  const period =
    query.kind === "rental"
      ? "per year"
      : query.kind === "restaurant" || query.kind === "experience"
        ? "per guest"
        : query.kind
          ? "per night"
          : "per night, or per year for a rental";

  // Naira, because that is what the control holds. It becomes kobo the moment
  // it is shown or stored, and never before. An empty bound means "no limit",
  // which on the slider is the far end of the track.
  const minInNaira = nairaOf(draft.minNaira);
  const maxInNaira = nairaOf(draft.maxNaira);
  const sliderMin = Math.min(Math.max(minInNaira ?? sliderFloor, sliderFloor), sliderCeiling);
  const sliderMax = Math.max(Math.min(maxInNaira ?? sliderCeiling, sliderCeiling), sliderFloor);

  /* What the search is scoped to, for the field's own placeholder. The area
     the reader typed wins, then the category, then the whole catalogue. */
  const scopeLabel = query.q?.trim() || (query.kind ? KIND_NOUN[query.kind].many : "all places");

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        data-testid="filters-drawer"
        className="absolute inset-0 flex flex-col bg-[var(--nf-surface-primary)]"
      >
        {/* ------------------------------------------------------- header */}
        <header className="nf-glass flex items-center gap-3 border-b border-[var(--nf-border-subtle)] px-4 py-3">
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close filters"
            className="nf-icon-btn h-11 w-11"
          >
            <UiIcon name="arrow-left" size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]">Filters</p>
            <p className="text-[0.75rem] text-[var(--nf-content-muted)]">
              {formatNumber(facts.length, locale)} {facts.length === 1 ? noun.one : noun.many} to
              narrow
            </p>
          </div>
        </header>

        {/* -------------------------------------------------------- body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto grid max-w-2xl gap-4 pb-6">
            {/* ------------------------------------------------- search */}
            {/* Scoped to wherever the reader already is, so the field reads as
                "narrow this" rather than "start again". */}
            <section className="nf-card p-4" aria-labelledby="filter-search">
              <h2
                id="filter-search"
                className="text-[0.875rem] font-bold text-[var(--nf-content-primary)]"
              >
                Search
              </h2>
              <label className="relative mt-3 block">
                <span className="sr-only">{`Search in ${scopeLabel}`}</span>
                <UiIcon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--nf-content-muted)]"
                />
                <input
                  type="search"
                  data-testid="filter-search"
                  value={draft.q}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, q: event.target.value }))
                  }
                  placeholder={`Search in ${scopeLabel}...`}
                  className="nf-field min-h-11 pl-10"
                />
              </label>
            </section>

            {/* -------------------------------------------------- price */}
            <section className="nf-card p-4" aria-labelledby="filter-price">
              <h2
                id="filter-price"
                className="text-[0.875rem] font-bold text-[var(--nf-content-primary)]"
              >
                Price range
              </h2>
              <p className="mt-0.5 text-[0.75rem] text-[var(--nf-content-muted)]">
                Naira {period}.
              </p>

              {/* The two figures the handles are standing on, printed above
                  them, because a slider with no numbers is a guess. Money
                  formats through formatMoney from kobo, never from naira. */}
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <p className="nf-numeric text-[1rem] font-bold text-[var(--nf-content-primary)]">
                  {formatMoney(nairaToKobo(sliderMin), locale)}
                </p>
                <p className="nf-numeric text-[1rem] font-bold text-[var(--nf-content-primary)]">
                  {sliderMax >= sliderCeiling
                    ? `${formatMoney(nairaToKobo(sliderCeiling), locale)}+`
                    : formatMoney(nairaToKobo(sliderMax), locale)}
                </p>
              </div>

              <div className="nf-range mt-2.5" data-testid="filter-range">
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
              <p className="mt-2 text-[0.75rem] text-[var(--nf-content-muted)]">
                Drag either end. At the far right there is no upper limit.
              </p>
            </section>

            {/* ----------------------------------------------- bedrooms */}
            <section className="nf-card p-4" aria-labelledby="filter-bedrooms">
              <h2
                id="filter-bedrooms"
                className="text-[0.875rem] font-bold text-[var(--nf-content-primary)]"
              >
                Bedrooms
              </h2>
              <p className="mt-0.5 text-[0.75rem] text-[var(--nf-content-muted)]">
                At least this many. Tap again to clear.
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
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
            </section>

            {/* -------------------------------------------- more filters */}
            {amenityOptions.length > 0 && (
              <section className="nf-card p-4" aria-labelledby="filter-amenities">
                <h2
                  id="filter-amenities"
                  className="text-[0.875rem] font-bold text-[var(--nf-content-primary)]"
                >
                  More filters
                </h2>
                <p className="mt-0.5 text-[0.75rem] text-[var(--nf-content-muted)]">
                  Pick as many as you like. Every one has to be there.
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {amenityOptions.map((code) => {
                    const on = draft.amenities.includes(code);
                    return (
                      <li key={code}>
                        <button
                          type="button"
                          data-testid={`filter-amenity-${code}`}
                          aria-pressed={on}
                          onClick={() => toggleAmenity(code)}
                          className={`nf-chip min-h-11 ${on ? "nf-chip--active" : ""}`}
                        >
                          {on && <UiIcon name="verified" size={12} />}
                          {amenityLabel(code)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ----------------------------------------------- switches */}
            <section className="nf-card divide-y divide-[var(--nf-border-subtle)] p-4">
              <h2 className="pb-1 text-[0.875rem] font-bold text-[var(--nf-content-primary)]">
                Booking and trust
              </h2>
              <Switch
                label="Instant book"
                hint="Confirmed at once, with no wait for a reply"
                checked={draft.instantBook}
                testId="filter-instant"
                onChange={(next) => setDraft((current) => ({ ...current, instantBook: next }))}
              />
              <Switch
                label="Verified only"
                hint="Our own inventory, checked before it was published"
                checked={draft.verifiedOnly}
                testId="filter-verified"
                onChange={(next) => setDraft((current) => ({ ...current, verifiedOnly: next }))}
              />
            </section>
          </div>
        </div>

        {/* ------------------------------------------------------- footer */}
        {/* Apply is the whole width because it is the whole point. Reset sits
            directly under it, quiet, so it is reachable without ever being
            the thing a thumb lands on by accident. */}
        <div className="nf-glass border-t border-[var(--nf-border-subtle)] px-4 py-3">
          <div className="mx-auto grid max-w-2xl gap-2">
            <button
              type="button"
              data-testid="filters-apply"
              onClick={apply}
              className="nf-btn nf-btn--primary min-h-12 w-full text-[0.9375rem]"
            >
              {matchCount === 0
                ? "No places match yet"
                : `Apply filters, ${formatNumber(matchCount, locale)} ${
                    matchCount === 1 ? noun.one : noun.many
                  }`}
            </button>
            <button
              type="button"
              data-testid="filters-clear"
              onClick={clearAll}
              className="nf-btn nf-btn--ghost min-h-11 w-full text-[0.875rem]"
            >
              Reset
            </button>
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
        <UiIcon name="sliders" size={20} />
        {activeCount > 0 && (
          <span
            data-testid="filters-count"
            aria-hidden="true"
            className="nf-badge-overlap nf-numeric top-[-0.4rem] right-[-0.4rem] min-w-5 justify-center px-1 py-0.5 text-[0.6875rem]"
          >
            {activeCount}
          </span>
        )}
      </button>
      {mounted && open ? createPortal(panel, document.body) : null}
    </>
  );
}
