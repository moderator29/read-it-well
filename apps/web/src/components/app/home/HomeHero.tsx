import Link from "next/link";
import type { ListingKind } from "@/lib/listings/types";
import { MediaFrame } from "@/components/app/MediaFrame";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";

/**
 * The hero container, to `GOVERNING-01` screen one and `GOVERNING-09` screen
 * one. One component, because the two sides draw the SAME OBJECT with
 * different content and the moment they are two components they drift.
 *
 * The anatomy, top to bottom, exactly as both renders draw it:
 *
 *   a photographed plate filling the container, corners rounded on the card
 *   rung and the whole thing lit at the top rim;
 *   the PLACE CHIP over the photograph, top left, with its pin;
 *   the headline in heavy display type, two lines on a phone;
 *   one supporting line;
 *   and THE SEARCH FIELD INSIDE THE CONTAINER, with a filter control in its
 *   right end.
 *
 * WHAT THE RENDERS PUT ABOVE THIS AND WHAT SHIPS ABOVE IT ARE DIFFERENT, on
 * the founder's instruction. `GOVERNING-09` drops the greeting and the
 * location selector for a bare place chip; both sides keep them, because they
 * are the reader's own facts and they are the one thing on this screen that
 * cannot be a marketing line. The chip inside the container is in addition to
 * the selector above it, not instead of it: the selector is the control that
 * CHANGES the place, the chip says which place the plate is showing.
 *
 * THE FIELD IS A REAL FORM AND A REAL GET. It writes `?q=` into the address
 * bar of the search screen, which is the whole discovery contract in
 * `lib/listings/search-params.ts`, so a hunt begun here is a link like any
 * other. It needs no JavaScript to work.
 *
 * THE PHOTOGRAPH IS `MediaFrame`'s, which is `next/image` with a `sizes` of
 * the full viewport and `priority`, because this is the first thing above the
 * fold. Nothing is hardcoded as a background image: the stop list forbids
 * shipping an image asset that has not been through the optimiser.
 */
export function HomeHero({
  place,
  title,
  lede,
  searchPlaceholder,
  searchAction,
  filtersHref,
  filtersLabel,
  searchLabel,
  kind,
  id,
}: {
  /** The place the plate is showing, or null when nobody has told us one. */
  place: string | null;
  title: string;
  lede: string;
  searchPlaceholder: string;
  /** Where the field submits: `/search` on the property side, `/stays/search`. */
  searchAction: string;
  /** The filter control's destination, which opens the sheet on arrival. */
  filtersHref: string;
  filtersLabel: string;
  searchLabel: string;
  /** Which scene the plate is photographed from. */
  kind: ListingKind;
  /** The field's id, so the two sides never collide in one document. */
  id: string;
}) {
  return (
    <section className="nf-hero-plate nf-rise nf-rise-3" data-testid="home-hero">
      <MediaFrame hue={2} kind={kind} sizes="100vw" priority scrim />
      <div className="nf-hero-plate__body">
        {/* THE PLACE CHIP. Absent rather than guessed: a chip reading the
            wrong city is worse than no chip, and the selector above already
            carries the answer when there is one. */}
        {place && (
          <p className="nf-hero-plate__chip" data-testid="home-hero-place">
            <UiIcon name="location" size={14} />
            {place}
          </p>
        )}
        <h2 className="nf-hero-plate__title">{title}</h2>
        <p className="nf-hero-plate__lede">{lede}</p>

        <form
          action={searchAction}
          method="get"
          role="search"
          className="nf-hero-plate__search"
          data-testid="home-hero-search"
        >
          <label htmlFor={id} className="sr-only">
            {searchLabel}
          </label>
          <UiIcon name="search" size={ICON.inline} className="nf-hero-plate__glyph" />
          <input
            id={id}
            name="q"
            type="search"
            autoComplete="off"
            placeholder={searchPlaceholder}
            className="nf-hero-plate__input"
          />
          {/* The filter control in the field's right end, as both renders draw
              it. A LINK, not a button: the drawer lives on the search screen
              and opening it from here is a navigation, so it survives with no
              script and the back button walks it. */}
          <Link
            href={filtersHref}
            aria-label={filtersLabel}
            className="nf-hero-plate__filters nf-tap"
            data-testid="home-hero-filters"
          >
            <UiIcon name="sliders" size={18} />
          </Link>
        </form>
      </div>
    </section>
  );
}
