import type { CSSProperties, ReactNode } from "react";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { NairaFacePreload } from "@/components/app/NairaFacePreload";
import { HeroBand } from "@/components/ui/HeroBand";
import { HeroFigure } from "@/components/ui/HeroFigure";
import { IconPlate } from "@/components/ui/IconPlate";
import { panelClass } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
/* The payout card's sum rows (`nf-maths`), the stylesheet the page's PayoutList brings. */
import "@/app/css/money-layer.css";

/**
 * THE WAIT ON A MONEY SCREEN IS THE SCREEN, WITH ONLY THE FIGURES MISSING
 * (W2, round 5; CRAFT-PRINCIPLES 2.6, the idea of `AuthWait`).
 *
 * Payouts, receipts, refunds, the crypto payment and the rent payment had no
 * wait of their own, so they inherited the group's: a page header and three
 * generic card rows. Each screen then arrived as something else entirely (a
 * hero figure on a band, a search field and chips, a document of rows), and
 * the money moment opened with the page re-laid under the reader's thumb.
 *
 * So the wait draws the screen. Everything the server does not have to read
 * is drawn for real: the header, the ledes and labels (from the same copy the
 * page uses), the field, the chips, the notes under the list. Only what the
 * read returns (a figure, a date, a row's title) is a slab, and every slab is
 * one line of the very element it stands in for (`Line`, one `lh` tall), so
 * the line it becomes is the same height. The whole of it is `inert`: it
 * cannot be typed into or tapped, and it is out of the accessibility tree,
 * where the one loading state says the screen is loading. The wrapper is
 * `display: contents`, so the page's own layout rules see the same children.
 *
 * What the wait cannot know it does not guess: a signed-out or empty answer
 * replaces the drawn rows, and that one change is the read's to make.
 *
 * And the naira sign's face is sent with the shell (`NairaFacePreload`).
 */
export function MoneyWait({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <LoadingShell label={label} {...(className ? { className } : {})}>
      <NairaFacePreload />
      <div inert className="contents" data-money-wait="">
        {children}
      </div>
    </LoadingShell>
  );
}

/**
 * One line of text that has not arrived, inside the element it stands in
 * for. The box is one `lh` of that element tall, so the line box is the
 * same height whether it holds the slab or the words, and it holds one
 * no-break space, which gives it the text's baseline (a row that lines its
 * label and figure up on the baseline sits the same with either). The bar
 * drawn inside it is the height of the type, not of the line, and in the
 * ink of the text it stands in for (`.nf-skeleton--text`): a quiet line on
 * paper, a lit one on the night hero band, a muted one where the caption
 * will be muted.
 */
export function Line({
  width,
  className,
  center = false,
  inline = false,
  bar,
}: {
  width: string;
  className?: string;
  /** For a centred line (the hero figure): the slab sits on the axis. */
  center?: boolean;
  /** A word inside a sentence the page writes (an amount in a note): the
   *  slab sits in the line box, top to bottom, and the sentence wraps round it. */
  inline?: boolean;
  /** The bar's height when the words are set larger than the line they sit
   *  in (a display figure on a body line); the line box stays the same. */
  bar?: string;
}) {
  const style = { width, ...(center ? { marginInline: "auto" } : {}), ...(bar ? { "--nf-skeleton-bar": bar } : {}) } as CSSProperties;
  return (
    <span
      aria-hidden="true"
      className={[inline ? "inline-block align-top" : "block", "nf-skeleton-line", className ?? ""].filter(Boolean).join(" ")}
      style={style}
    >
      {"\u00a0"}
      <span className="nf-skeleton nf-skeleton--text" />
    </span>
  );
}

/**
 * A button that cannot be pressed yet, at a medium button's height: one
 * line of its label plus the padding and the border `.nf-btn--md` draws,
 * so the action it becomes lands in the same box. A slab rather than the
 * real button, because a Pay button the wait cannot honour is a promise.
 */
export function ButtonWait({ width = "100%", className }: { width?: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={["block nf-skeleton nf-skeleton--text", className ?? ""].filter(Boolean).join(" ")}
      style={{
        width,
        height: "calc(1lh + 2 * var(--nf-space-sm) + 2 * var(--nf-border-width))",
        borderRadius: "var(--nf-radius-button)",
      }}
    />
  );
}

/**
 * `HistoryHero` before its total: the band, the caption and the note are
 * real; the figure is a slab on the figure's own line, sized as the page
 * sizes a seven-figure total (`HistoryHero` measures the printed figure in
 * ems and steps down to `md` past twelve characters; ₦1,000,000.00 is
 * thirteen), which is the common payout total.
 */
export function HeroFigureWait({ caption, sub }: { caption: string; sub: string }) {
  const ems = (10 + 0.6 * 3) * 0.88;
  return (
    <HeroBand as="section" className="nf-history-hero--centred">
      <HeroFigure caption={caption} sub={sub} size="md" ems={ems}>
        <Line width="5.5em" center />
      </HeroFigure>
    </HeroBand>
  );
}

/** A status pill whose word has not arrived: the pill's own height. */
function PillWait() {
  return (
    <StatusPill tone="neutral" className="nf-history-badge">
      <Line width="3.5em" />
    </StatusPill>
  );
}

/**
 * `HistoryList` before its rows: the card, one day's head, and rows built
 * from the row's own classes (the plate, the title and its when-line, the
 * amount over its pill), then the foot line.
 */
export function HistoryListWait({ rows = 3 }: { rows?: number }) {
  return (
    <section className={panelClass({ variant: "card", className: "nf-history-list" })}>
      <div className="nf-history-day">
        <p className="nf-history-day__head nf-overline">
          <Line width="6rem" />
        </p>
        <ul className="nf-history-rows">
          {Array.from({ length: rows }, (_, i) => (
            <li key={i}>
              <div className="nf-history-row">
                <IconPlate size="sm" tone="neutral" className="nf-history-row__tile">
                  {null}
                </IconPlate>
                <span className="min-w-0 flex-1">
                  {/* A place's name in this column wraps to two lines at
                      phone width, measured against the history fixtures. */}
                  <span className="nf-history-row__title">
                    <Line width="100%" />
                    <Line width="50%" />
                  </span>
                  <span className="nf-history-row__when">
                    <Line width="40%" />
                  </span>
                </span>
                <span className="nf-numeric flex shrink-0 flex-col items-end gap-inline-tight text-right">
                  <span className="nf-history-row__amount">
                    <Line width="5.5rem" />
                  </span>
                  <PillWait />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="nf-history-foot">
        <span>
          <Line width="8rem" />
        </span>
      </div>
    </section>
  );
}

/**
 * One `PayoutList` card before its figures: the title and the date are
 * slabs, the four labels of the sum are the page's own words, and each
 * figure is a slab on its own line.
 */
export function PayoutCardWait({ labels, total }: { labels: readonly string[]; total: string }) {
  /* The payout bill as `PayoutList` draws it (reference 8): the head with
     its status word, then the line items on the same card. */
  return (
    <li className="nf-payout">
      <div className="nf-payout__head">
        <div className="min-w-0 flex-1">
          <p className="nf-payout__title">
            <Line width="55%" />
          </p>
          <p className="nf-payout__day">
            <Line width="35%" />
          </p>
        </div>
        <span className="nf-mword">
          <Line width="3.5rem" />
        </span>
      </div>
      <dl className="nf-maths nf-maths--bill nf-maths--inset">
        {labels.map((label) => (
          <div key={label} className="nf-maths__row">
            <dt>{label}</dt>
            <dd>
              <span className="nf-mfig nf-mfig--row">
                <Line width="6rem" />
              </span>
            </dd>
          </div>
        ))}
        <div className="nf-maths__row nf-maths__row--total nf-maths__row--lit">
          <dt>{total}</dt>
          <dd>
            <span className="nf-mfig nf-mfig--row">
              <Line width="6.5rem" />
            </span>
          </dd>
        </div>
      </dl>
    </li>
  );
}
