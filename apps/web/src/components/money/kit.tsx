import type { ReactNode } from "react";
import type { Locale } from "@vallo/i18n/core";
import { formatKoboExact } from "@/components/app/money/money";
import { spokenMoney } from "@/lib/money/spoken";
import { LogoMark } from "@/design-system/brand/Logo";
import type { StatusTone } from "@/components/ui/StatusPill";
import "@/app/css/money-layer.css";

/**
 * THE MONEY KIT (PREMIUM-STANDARD references 4, 5, 7 and 8; D72). The few
 * shapes every money surface is drawn from, so a balance, a receipt, a payout
 * and a checkout read as one product:
 *
 *   MoneyFigure   the big figure: the naira sign quiet and raised, the whole
 *                 naira in full ink, the kobo set smaller (reference 4's
 *                 "6,420.00"). Tabular, never counted: it states money.
 *   MoneyCard     the money card (handoff A.9): a glass object with the shape
 *                 and weight of a bank card, the hero of a balance surface.
 *   MoneyMoment   the payoff and status head: a small dot (a green check, a
 *                 breathing ring, a red mark), a title and one line.
 *   StatusWord    reference 4's small status word under an amount (PAID,
 *                 PROCESSING), a word and a dot, never colour alone.
 *   MoneyStrip    reference 8's header strip: up to three figures with tiny
 *                 labels, the third may be the accent.
 *
 * Server-safe and presentational. Every figure is handed in by a caller that
 * read it; nothing here adds, rounds or invents one.
 */

/* ------------------------------------------------------------ the figure */

/** Splits a formatted whole ("₦2,450,000", "-₦50") into its sign, symbol and digits. */
export function figureParts(whole: string): { minus: string; symbol: string; digits: string } {
  const m = /^(-?)([^\d-]*)(.*)$/u.exec(whole);
  if (!m) return { minus: "", symbol: "", digits: whole };
  return { minus: m[1] ?? "", symbol: (m[2] ?? "").trim(), digits: m[3] ?? "" };
}

export type FigureSize = "hero" | "lg" | "md" | "row";

export function MoneyFigure({
  minor,
  locale,
  currency = "NGN",
  size = "hero",
  sign,
  kobo = "always",
  className,
  testId,
}: {
  minor: number;
  locale: Locale;
  currency?: string;
  size?: FigureSize;
  /** A movement's direction, printed before the symbol. The caller also says it in words. */
  sign?: "+" | "-";
  /** `always` for a stated record (a receipt, a balance); `auto` drops ".00" (a row, ONE-PRODUCT). */
  kobo?: "always" | "auto";
  className?: string;
  testId?: string;
}) {
  const { whole, kobo: fraction } = formatKoboExact(minor, locale);
  const { minus, symbol, digits } = figureParts(whole);
  const showKobo = kobo === "always" || fraction !== ".00";
  const lead = sign ?? (minus ? "-" : "");
  return (
    <span className={["nf-mfig nf-numeric", `nf-mfig--${size}`, className ?? ""].filter(Boolean).join(" ")} data-money="" data-testid={testId}>
      <span aria-hidden="true" className="nf-mfig__print">
        {lead ? <span className="nf-mfig__sign">{lead === "-" ? "−" : "+"}</span> : null}
        {symbol ? <span className="nf-mfig__cur">{symbol}</span> : null}
        <span className="nf-mfig__whole">{digits}</span>
        {showKobo ? <span className="nf-mfig__kobo">{fraction}</span> : null}
      </span>
      <span className="sr-only">
        {lead === "+" ? "plus " : lead === "-" ? "minus " : ""}
        {spokenMoney(Math.abs(minor), locale, currency)}
      </span>
    </span>
  );
}

/**
 * A figure already formatted once by a model (a receipt's `figure`), drawn
 * the same way: the kobo after the last point set smaller. Text in, text out;
 * nothing is parsed into a number.
 */
export function PrintedFigure({ text, size = "hero", className, testId }: { text: string; size?: FigureSize; className?: string; testId?: string }) {
  const dot = text.lastIndexOf(".");
  const hasKobo = dot > 0 && /^\.\d{2}$/.test(text.slice(dot));
  const head = hasKobo ? text.slice(0, dot) : text;
  const { minus, symbol, digits } = figureParts(head);
  return (
    <span className={["nf-mfig nf-numeric", `nf-mfig--${size}`, className ?? ""].filter(Boolean).join(" ")} data-testid={testId}>
      {minus ? <span className="nf-mfig__sign">{minus}</span> : null}
      {symbol ? <span className="nf-mfig__cur">{symbol}</span> : null}
      <span className="nf-mfig__whole">{digits}</span>
      {hasKobo ? <span className="nf-mfig__kobo">{text.slice(dot)}</span> : null}
    </span>
  );
}

/* -------------------------------------------------------- the money card */

/**
 * THE MONEY CARD (handoff A.9: "a premium object with the shape and weight
 * of a physical bank card"). Glass on the raised night surface, a hairline
 * light edge, one brand glow from the corner, the Vallo mark where a bank
 * puts its own. The figure sits where the card number would. `art` is the
 * one 3D object, top right, when the surface wants one.
 */
export function MoneyCard({
  caption,
  figure,
  sub,
  foot,
  art,
  id,
  className,
  testId,
}: {
  caption: ReactNode;
  figure: ReactNode;
  sub?: ReactNode;
  foot?: ReactNode;
  art?: ReactNode;
  id?: string;
  className?: string;
  testId?: string;
}) {
  return (
    <section className={["nf-mcard", className ?? ""].filter(Boolean).join(" ")} aria-labelledby={id} data-testid={testId}>
      <span className="nf-mcard__sheen" aria-hidden="true" />
      <div className="nf-mcard__top">
        <span className="nf-mcard__brand" aria-hidden="true">
          <LogoMark size={22} />
          <span className="nf-mcard__word">VALLO</span>
        </span>
        {art ? <span className="nf-mcard__art">{art}</span> : <span className="nf-mcard__chip" aria-hidden="true" />}
      </div>
      <div className="nf-mcard__body">
        <p id={id} className="nf-mcard__caption">
          {caption}
        </p>
        <p className="nf-mcard__figure">{figure}</p>
        {sub ? <p className="nf-mcard__sub">{sub}</p> : null}
      </div>
      {foot ? <div className="nf-mcard__foot">{foot}</div> : null}
    </section>
  );
}

/* ----------------------------------------------------- the moment's head */

/* The moment, its dot and the payoff badge are the platform's one success
   moment (components/ui/SuccessMoment.tsx); the money kit re-exports them
   under the names the money surfaces already use. */
export { MomentDot, SuccessBadge, Moment as MoneyMoment, type MomentTone } from "@/components/ui/SuccessMoment";
import type { MomentTone } from "@/components/ui/SuccessMoment";

/* ---------------------------------------------------- the status word */

const WORD_TONE: Record<StatusTone, MomentTone> = {
  success: "done",
  warning: "waiting",
  info: "waiting",
  brand: "waiting",
  danger: "problem",
  neutral: "neutral",
};

/** Reference 4's status word under an amount: small, tracked, a dot before it. */
export function StatusWord({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={["nf-mword", className ?? ""].filter(Boolean).join(" ")} data-tone={WORD_TONE[tone]}>
      <span className="nf-mword__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

/* ------------------------------------------------------ the header strip */

/** Reference 8's strip: two or three figures with tiny labels; `accent` lights the last. */
export function MoneyStrip({ items, label }: { items: { label: string; value: ReactNode; accent?: boolean }[]; label: string }) {
  return (
    <dl className="nf-mstrip" aria-label={label} data-count={items.length}>
      {items.map((item) => (
        <div key={item.label} className="nf-mstrip__cell" data-accent={item.accent ? "true" : undefined}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
