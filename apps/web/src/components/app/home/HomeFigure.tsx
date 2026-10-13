import Link from "next/link";
import { CountUp } from "@/components/motion/CountUp";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import "@/app/css/home.css";

/**
 * WHAT HOME LEADS WITH (Session 3, W2; north star 10 B, D4 "the signature is
 * oversized live figures").
 *
 * The north star names three candidates in order: Up next, the saved count,
 * or the area's typical move-in total. Each is drawn only from a real read:
 *
 *   UP NEXT is a list, not a number, and it already streams in under the
 *     band (`UpNext.tsx`), so it is not repeated here.
 *   THE SAVED COUNT is the account's own `saved_items` rows. A count of zero
 *     is not drawn as "0 saved": a figure that leads a screen should be a
 *     fact about somebody's hunt, and nothing yet is better said by the
 *     shelves themselves.
 *   THE AREA'S TYPICAL MOVE-IN TOTAL has no honest read yet. A typical
 *     figure needs a sample floor and an aggregation that Session 2 owns
 *     (request W2-R1 in Session 3's response), and a median this screen
 *     computed from whatever rows it happened to load would be exactly the
 *     invented figure the claims lint exists to stop. So it is not drawn.
 *
 * When there is no figure, nothing is drawn and the greeting leads, which is
 * the generic surface rendered honestly.
 *
 * The figure counts up once on arrival (motion 4, `CountUp`, 620ms `glide`)
 * and rolls on the odometer if it changes. Server-safe: `CountUp` is the only
 * client piece, and the server prints the final number.
 */
export type HomeLeadFigure = { kind: "saved"; count: number };

export function HomeFigure({
  figure,
  copy,
  tag,
}: {
  figure: HomeLeadFigure;
  copy: { savedCaption: string; savedUnitOne: string; savedUnitMany: string; savedOpen: string; savedCompare: string };
  /** BCP 47 tag for the digits (`intlTag` from `@vallo/i18n`). */
  tag: string;
}) {
  const many = figure.count !== 1;
  return (
    <div className="nf-home-figure" data-testid="home-figure" data-figure={figure.kind}>
      <p className="nf-home-figure__caption">{copy.savedCaption}</p>
      <p className="nf-home-figure__line">
        <span className="nf-home-figure__value nf-numeric">
          <CountUp value={figure.count} tag={tag} eager />
        </span>
        <span className="nf-home-figure__unit">{many ? copy.savedUnitMany : copy.savedUnitOne}</span>
      </p>
      <Link href="/saved" className="nf-home-figure__go nf-link-quiet" data-testid="home-figure-open">
        {figure.count >= 2 ? copy.savedCompare : copy.savedOpen}
        <UiIcon name="arrow-right" size={ICON.inline} />
      </Link>
    </div>
  );
}
