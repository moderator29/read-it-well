import { UiIcon } from "@/design-system/icons/UiIcon";
import { EXAMPLE_STATEMENT } from "@/lib/listings/syndication";
import { ICON } from "@/components/app/Screen";

/**
 * THE DISCLOSURE ON AN EXAMPLE LISTING.
 *
 * 42 rows in the catalogue describe properties that do not exist. Everything a
 * machine could do with them has been sealed off: they are out of the sitemap,
 * they emit no JSON-LD, their pages are noindex and no email can carry one. The
 * hole this closes is the only one that was left, and it is the one that
 * matters most: NOTHING ON SCREEN TOLD A PERSON. A reader saw a card with a
 * real Lagos area and a real naira price, and the sentence that says otherwise
 * existed only in Open Graph metadata, which is written for crawlers and read
 * by nobody.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A COMPONENT AND NOT A LINE OF MARKUP IN TWO PLACES
 *
 * It has to appear on the card and on the page, and the two must say exactly
 * the same thing. A disclosure that is worded one way in a grid and another way
 * on the detail screen is a disclosure somebody can argue with. So there is one
 * component, and it renders `EXAMPLE_STATEMENT` from `lib/listings/syndication`
 * rather than holding a string of its own: the sentence is written once, in the
 * module that already uses it for metadata, and the card, the page and the
 * crawler are reading the same characters.
 *
 * ---------------------------------------------------------------------------
 * THE DRAWING, AND EVERY DECISION IN IT IS AN HONESTY DECISION
 *
 * IT IS NOT A BADGE. The obvious shape here is a pill in the corner of the
 * photograph, next to where the verified tick goes, and it would be wrong. A
 * small filled pill on a property card is the visual grammar of "Featured",
 * "Superhost", "Instant book": every pill a reader has ever seen in that
 * position was an endorsement. Drawing a warning in the costume of a promotion
 * is worse than drawing nothing, because it is read as a positive at a glance
 * and only contradicts itself if somebody stops to read it.
 *
 * So it is a full-width band with a rule down its leading edge, which is the
 * shape of a notice in every interface, and it sits in the card's body above
 * the price rather than on the photograph.
 *
 * IT IS BODY-SIZED, NOT CAPTION-SIZED. `nf-body-sm` at full content contrast.
 * The temptation on a card is to shrink it to 11px so it does not disturb the
 * composition; a disclosure nobody can read is decoration. It is the most
 * important sentence on the card and it is set larger than the facts row under
 * it.
 *
 * NOTHING IS HIDDEN BEHIND ANYTHING. No hover, no tooltip, no info button, no
 * accordion, no truncation. The whole sentence is in the document, at all
 * times, on every surface that renders a card.
 *
 * NO ACTION. There is deliberately no button and no link. The database refuses
 * every transaction against these rows, so any control here would be an offer
 * the platform cannot honour, and the sentence's own last clause is the only
 * thing there is to say.
 *
 * BOTH THEMES BY TOKEN. `--nf-state-warning` and `--nf-state-warning-surface`
 * are defined in the dark palette and redefined in the light one, so the band
 * is a translucent wash over whatever surface it lands on in either. Nothing
 * here names a colour.
 */
export function ExampleNotice({
  /** `card` is the compact band inside a listing card; `page` is the detail
      screen's own, which sits above the fold and is set a step larger. */
  variant = "card",
  className,
}: {
  variant?: "card" | "page";
  className?: string;
}) {
  const page = variant === "page";
  return (
    <p
      data-testid="example-notice"
      /*
       * `role="note"`, not `alert` and not `status`. An alert interrupts and a
       * status announces on change; this is neither. It is a standing fact
       * about the thing being described, and it is in the reading order
       * directly before the price, so a screen reader meets it at the same
       * point in the card a sighted reader does.
       */
      role="note"
      className={`flex items-start gap-inline rounded-[var(--nf-radius-sm)] border-l-[3px] border-[var(--nf-state-warning)] bg-[var(--nf-state-warning-surface)] ${
        page ? "nf-body p-card-sm" : "nf-body-sm p-inline"
      } font-medium leading-snug text-[var(--nf-content-primary)] ${className ?? ""}`}
    >
      <UiIcon
        name="info"
        size={page ? ICON.row : ICON.inline}
        className="mt-3xs shrink-0 text-[var(--nf-state-warning)]"
      />
      <span>{EXAMPLE_STATEMENT}</span>
    </p>
  );
}
