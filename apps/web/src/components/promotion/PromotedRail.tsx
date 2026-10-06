import "./promotion.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { railSlots } from "@/lib/promotion/front-door";
import { PromotedSlot, type PromotedSlotInput } from "./PromotedSlot";

/**
 * THE FRONT DOOR'S PROMOTED RAIL, ONE PER CITY (`VALLO_PROMOTION-v2.md`
 * section 11, "Front door inventory").
 *
 * NOT MOUNTED ON A LIVE PAGE. Session 2's inventory read does not exist, so
 * nothing hands a rail its slots yet; it is seen at `/preview/promotion`. The
 * day the read exists, the front door places this beside its organic rails,
 * never among them.
 *
 * WHAT IT KEEPS, each held by `lib/promotion/front-door.test.ts` and
 * `PromotedRail.dom.test.tsx`:
 *   - At most six cards, Everywhere at most two, Featured at most four
 *     (`FRONT_DOOR_RAIL`, through `railSlots`). Never a seventh.
 *   - Paid places only: a slot without a paid slot id is refused, and the rail
 *     is never handed an organic list to pad with, so on a day that is not
 *     sold out it simply shows fewer cards.
 *   - Fewer cards keep the same card width and the same gap: the track is a
 *     fixed column size that does not depend on how many there are, and
 *     nothing stretches to fill the row.
 *   - Each card is a `PromotedSlot`, so every card carries its own label and
 *     the listing's trust marks are the plain card's, unchanged. The rail's
 *     own label is set quiet, in the secondary ink, never the verified tone.
 *   - No paid places at all: no rail.
 */
export function PromotedRail({
  slots,
  locale,
  t,
}: {
  /** Session 2's inventory rows for this city and day, as the read orders them. */
  slots: readonly PromotedSlotInput[];
  locale: Locale;
  t: Dictionary;
}) {
  const { shown } = railSlots(slots);
  const label = t.experienceFeatures.promotion.frontDoor.railTitle.trim();
  if (shown.length === 0 || !label) return null;

  return (
    <section className="nf-promoted-rail" aria-label={t.experienceFeatures.promotion.labelLong} data-testid="promoted-rail">
      <p className="nf-promoted-rail__title">{label}</p>
      <ol className="nf-promoted-rail__track" data-count={shown.length}>
        {shown.map((slot, index) => (
          <li key={String(slot.slotId)} className="nf-promoted-rail__item">
            <PromotedSlot slot={slot} locale={locale} t={t} index={index} />
          </li>
        ))}
      </ol>
    </section>
  );
}
