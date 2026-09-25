import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The four drawn phone screens of the journey (Track M, second pass).
 *
 * DRAWN, NOT PHOTOGRAPHED, AND NOT A SCREENSHOT. Each is a handful of
 * elements in the product's own vocabulary: a search field, two listing
 * rows, a calendar, an agreement with two ticks, a payment that goes one way.
 * The bars stand for text on purpose, so the drawing never shows a price, a
 * name or an address that could be read as a real one. The few words drawn
 * are labels (`landingRooms.journey.screen`), and the one money phrase is
 * the inspection-fee headline from `lib/money/copy.ts`, passed in.
 *
 * Purely decorative: every screen is `aria-hidden`; the chapter beside it
 * carries the words.
 */
export type JourneyScreenKey = "find" | "inspect" | "agree" | "move";

type Labels = {
  search: string;
  inspection: string;
  booked: string;
  noFee: string;
  agreement: string;
  you: string;
  owner: string;
  approved: string;
  paid: string;
  theirBank: string;
  keys: string;
};

export function JourneyScreen({ step, labels }: { step: JourneyScreenKey; labels: Labels }) {
  return (
    <div className={`nf-jscreen nf-jscreen--${step}`} aria-hidden="true">
      <div className="nf-jscreen__bar">
        <span />
        <span />
      </div>
      {step === "find" && (
        <div className="nf-jscreen__body">
          <div className="nf-jscreen__search">
            <UiIcon name="search" size={16} />
            <span>{labels.search}</span>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="nf-jscreen__row" style={{ "--row-i": i } as React.CSSProperties}>
              <span className="nf-jscreen__thumb" data-hue={i} />
              <span className="nf-jscreen__lines">
                <i style={{ width: "72%" }} />
                <i style={{ width: "46%" }} />
                <b style={{ width: "38%" }} />
              </span>
            </div>
          ))}
        </div>
      )}
      {step === "inspect" && (
        <div className="nf-jscreen__body">
          <div className="nf-jscreen__label">
            <UiIcon name="calendar-booking" size={16} />
            {labels.inspection}
          </div>
          <div className="nf-jscreen__cal">
            {Array.from({ length: 21 }, (_, i) => (
              <span key={i} data-on={i === 11 ? "true" : undefined} />
            ))}
          </div>
          <div className="nf-jscreen__chip nf-jscreen__chip--ok">
            <UiIcon name="check" size={16} />
            {labels.booked}
          </div>
          <div className="nf-jscreen__chip">{labels.noFee}</div>
        </div>
      )}
      {step === "agree" && (
        <div className="nf-jscreen__body">
          <div className="nf-jscreen__doc">
            <div className="nf-jscreen__label">
              <UiIcon name="document" size={16} />
              {labels.agreement}
            </div>
            <span className="nf-jscreen__lines">
              <i style={{ width: "90%" }} />
              <i style={{ width: "82%" }} />
              <i style={{ width: "64%" }} />
            </span>
            <div className="nf-jscreen__signs">
              <span data-i="0">
                <UiIcon name="check" size={16} />
                {labels.you}
              </span>
              <span data-i="1">
                <UiIcon name="check" size={16} />
                {labels.owner}
              </span>
            </div>
          </div>
          <div className="nf-jscreen__stamp">
            <UiIcon name="verified" size={16} />
            {labels.approved}
          </div>
        </div>
      )}
      {step === "move" && (
        <div className="nf-jscreen__body">
          <div className="nf-jscreen__pay">
            <span className="nf-jscreen__paid">
              <UiIcon name="check" size={16} />
              {labels.paid}
            </span>
            <span className="nf-jscreen__flow">
              <i />
            </span>
            <span className="nf-jscreen__bank">
              <UiIcon name="wallet" size={16} />
              {labels.theirBank}
            </span>
          </div>
          <div className="nf-jscreen__keys">
            <UiIcon name="key" size={28} />
            <span>{labels.keys}</span>
          </div>
        </div>
      )}
    </div>
  );
}
