import "@/app/css/share-card.css";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { METER_SEGMENTS, meterBars, meterLevel } from "@/lib/ui/meter";

/**
 * THE SHARE CARD FRAME: one card for every score, share and trust figure on
 * the platform (spec section 10, references 33 and 34; plan item 23).
 *
 * Two frames, the references' two:
 *
 *   plain   (ref 33) a white card, the title left and a tinted chip right,
 *           the meter beside the figure.
 *   tinted  (ref 34) the brand tint as the frame, a chip that is the surface
 *           itself, an optional info button, the meter under the figure.
 *
 * Inside the well, top to bottom, every part optional: an eyebrow line, the
 * big figure, the ten bar meter with its word, up to four checklist lines with
 * round status marks, the honest line, and the stat strip.
 *
 * WHAT IT WILL NOT DRAW, which is most of its job:
 *
 *   - A stat strip with fewer than two cells. The landing's rule: one figure
 *     in a three column box is a box with two empty cells implying figures.
 *   - More than four checklist lines. A fifth is a list, not a card.
 *   - A meter with no word. The bars are a picture of a fact, and the word
 *     (or the count) is the fact.
 *
 * It computes no figure. Every number arrives from a caller that read it from
 * a stored row, and `lib/ui/meter.ts` decides only how many bars a fact
 * lights. A card with nothing true to say passes no `figure` and no `meter`,
 * and says so in its honest line.
 */

export type ShareCheck = {
  /** success = holds; warning = something is missing; pending = not yet. */
  tone: "success" | "warning" | "pending";
  label: string;
};

export type ShareStat = { label: string; value: string };

export type ShareMeter = {
  /** Bars lit, 0 to 10, from `lib/ui/meter.ts`. */
  filled: number;
  /** The fact the bars picture: "High", "9 listings", "12 reviews". Required. */
  word: string;
  /** A quiet word after it: "estimate". */
  qualifier?: string;
  /** Overrides the colour the lit count would pick. */
  level?: "low" | "mid" | "high";
};

function Tick() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M3.2 7.3 5.9 9.9 10.8 4.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bang() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M7 3.4v4.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="7" cy="10.3" r="1.05" fill="currentColor" />
    </svg>
  );
}

const SPOKEN: Record<ShareCheck["tone"], string> = {
  success: "Yes",
  warning: "Missing",
  pending: "Not yet",
};

export function ShareMeterBars({ meter, below }: { meter: ShareMeter; below?: boolean }) {
  const bars = meterBars(meter.filled);
  const level = meter.level ?? meterLevel(meter.filled);
  return (
    <div className="nf-share-card__meter" data-testid="share-card-meter">
      <span
        className="nf-share-card__bars"
        data-level={level}
        role="img"
        aria-label={`${meter.word}: ${Math.max(0, Math.min(METER_SEGMENTS, Math.round(meter.filled)))} of ${METER_SEGMENTS} bars`}
      >
        {bars.map((lit, index) => (
          <span key={index} className="nf-share-card__bar" data-lit={lit ? "" : undefined} />
        ))}
      </span>
      <span className={below ? "nf-share-card__word nf-h4" : "nf-share-card__word"}>
        {meter.word}
        {meter.qualifier ? <span className="nf-share-card__qualifier"> · {meter.qualifier}</span> : null}
      </span>
    </div>
  );
}

export function ShareCardFrame({
  variant = "plain",
  title,
  chip,
  info,
  eyebrow,
  figure,
  figureUnit,
  figureSize = "xl",
  figureLabel,
  meter,
  checks,
  honest,
  stats,
  foot,
  className,
  testId,
  align = "start",
}: {
  /**
   * `center` sets the figure (and the meter under it) centred in the well:
   * the one headline figure of a screen (section 17, refs 44 and 45), as
   * Price Check's answer. The share image keeps the default.
   */
  align?: "start" | "center";
  variant?: "plain" | "tinted";
  /** The card's name, left of the chip in the plain frame. */
  title?: string;
  /** The tinted chip: a word and a glyph ("Estimate", sparkle). */
  chip?: { label: string; icon?: UiIconName };
  /** The round-cornered info button (tinted frame), as a link or a native tooltip. */
  info?: { label: string; href?: string };
  eyebrow?: string;
  /** The big figure, already formatted. Absent: no figure is drawn. */
  figure?: React.ReactNode;
  figureUnit?: string;
  /** xl is the 88px numeral; lg fits a range of money on a phone. */
  figureSize?: "xl" | "lg";
  /** What the figure is, for a screen reader, when the eyebrow does not say it. */
  figureLabel?: string;
  meter?: ShareMeter;
  checks?: readonly ShareCheck[];
  /** The honest one-liner. Mandatory in spirit whenever the figure is an estimate. */
  honest?: string;
  stats?: readonly ShareStat[];
  /** The foot row under the well: a logo lockup, a date. */
  foot?: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  const below = variant === "tinted";
  const lines = (checks ?? []).slice(0, 4);
  const strip = (stats ?? []).filter((s) => s.value.trim().length > 0).slice(0, 3);
  const hasHead = Boolean(title || chip || info);

  return (
    <section
      className={[
        "nf-share-card",
        variant === "tinted" ? "nf-share-card--tinted" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-meter={below ? "below" : "beside"}
      data-align={align === "center" ? "center" : undefined}
      data-testid={testId ?? "share-card"}
      aria-label={title ?? chip?.label}
    >
      {hasHead && (
        <div className="nf-share-card__head">
          {variant === "tinted" ? (
            chip ? (
              <span className="nf-share-card__chip">
                {chip.icon ? <UiIcon name={chip.icon} size={20} /> : null}
                {chip.label}
              </span>
            ) : (
              <span />
            )
          ) : (
            <h3 className="nf-share-card__title">{title}</h3>
          )}
          {variant === "plain" && chip ? (
            <span className="nf-share-card__chip">
              {chip.icon ? <UiIcon name={chip.icon} size={16} /> : null}
              {chip.label}
            </span>
          ) : null}
          {info ? (
            info.href ? (
              <a className="nf-share-card__info" href={info.href} aria-label={info.label} title={info.label}>
                <UiIcon name="info" size={20} />
              </a>
            ) : (
              <span className="nf-share-card__info" role="img" aria-label={info.label} title={info.label}>
                <UiIcon name="info" size={20} />
              </span>
            )
          ) : null}
        </div>
      )}

      <div className="nf-share-card__well">
        {variant === "tinted" && title ? <p className="nf-share-card__eyebrow">{title}</p> : null}
        {eyebrow ? <p className="nf-share-card__eyebrow">{eyebrow}</p> : null}

        {(figure !== undefined && figure !== null) || meter ? (
          <div className="nf-share-card__lead">
            {figure !== undefined && figure !== null ? (
              <p className="nf-share-card__figure" data-size={figureSize} aria-label={figureLabel}>
                {figure}
                {figureUnit ? <span className="nf-share-card__figure-unit">{figureUnit}</span> : null}
              </p>
            ) : null}
            {meter ? <ShareMeterBars meter={meter} below={below} /> : null}
          </div>
        ) : null}

        {below && honest ? <p className="nf-share-card__honest">{honest}</p> : null}

        {lines.length > 0 ? (
          <ul className="nf-share-card__checks">
            {lines.map((line) => (
              <li key={line.label} className="nf-share-card__check" data-tone={line.tone}>
                <span className="nf-share-card__mark" aria-hidden="true">
                  {line.tone === "success" ? <Tick /> : line.tone === "warning" ? <Bang /> : null}
                </span>
                <span>
                  <span className="sr-only">{SPOKEN[line.tone]}: </span>
                  {line.label}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {!below && honest ? <p className="nf-share-card__honest">{honest}</p> : null}

        {strip.length >= 2 ? (
          <dl className="nf-share-card__stats" data-testid="share-card-stats">
            {strip.map((stat) => (
              <div key={stat.label} className="nf-share-card__stat">
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {foot ? <div className="nf-share-card__foot">{foot}</div> : null}
    </section>
  );
}
