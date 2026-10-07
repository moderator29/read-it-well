import type { ReactNode } from "react";
import type { Locale } from "@vallo/i18n/core";
import { formatKoboExact } from "@/components/app/money/money";
import { spokenMoney } from "@/lib/money/spoken";
import { UiIcon } from "@/design-system/icons/UiIcon";
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

export type MomentTone = "done" | "waiting" | "problem" | "neutral";

/* A scalloped seal, twelve soft lobes on a circle (the success screen the
   founder sent with the Plasma set). Computed once, in a 48 unit box. */
const SCALLOP = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r = 21 + 2.2 * Math.cos(12 * a);
    pts.push(`${(24 + r * Math.cos(a)).toFixed(2)},${(24 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
})();

/**
 * The payoff badge (D74): a scalloped seal in the success colour with a
 * check, and four sparkles that open out once around it. Under reduced
 * motion, Calm, Off and save-data it is simply there.
 */
export function SuccessBadge() {
  return (
    <span className="nf-mbadge" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="nf-mbadge__seal">
        <path d={SCALLOP} />
      </svg>
      <UiIcon name="check" size={26} className="nf-mbadge__check" />
      <span className="nf-mbadge__spark" data-at="1" />
      <span className="nf-mbadge__spark" data-at="2" />
      <span className="nf-mbadge__spark" data-at="3" />
      <span className="nf-mbadge__spark" data-at="4" />
    </span>
  );
}

/** The dot alone: a green check, a breathing ring, a red mark, a quiet ring. */
export function MomentDot({ tone, live = false, size = "md" }: { tone: MomentTone; live?: boolean; size?: "sm" | "md" | "lg" }) {
  if (tone === "done" && size === "lg") return <SuccessBadge />;
  return (
    <span className={`nf-mdot nf-mdot--${size}`} data-tone={tone} data-live={live ? "true" : undefined} aria-hidden="true">
      {tone === "done" ? <UiIcon name="check" size={size === "lg" ? 26 : size === "md" ? 18 : 12} /> : null}
      {tone === "problem" ? <UiIcon name="close" size={size === "lg" ? 24 : size === "md" ? 16 : 11} /> : null}
      {tone === "waiting" ? <span className="nf-mdot__core" /> : null}
    </span>
  );
}

/**
 * The head of a payoff or a status screen (reference 7): the dot, the title,
 * one line. `align="center"` for a moment, `start` inside a card.
 */
export function MoneyMoment({
  tone,
  title,
  line,
  live = false,
  align = "center",
  as: Heading = "h2",
  id,
  children,
  testId,
}: {
  tone: MomentTone;
  title: ReactNode;
  line?: ReactNode;
  /** True only while the thing it describes is genuinely still moving. */
  live?: boolean;
  align?: "center" | "start";
  as?: "h1" | "h2" | "h3";
  id?: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="nf-moment" data-align={align} data-tone={tone} data-testid={testId}>
      <MomentDot tone={tone} live={live} size="lg" />
      <Heading id={id} className="nf-moment__title">
        {title}
      </Heading>
      {line ? <p className="nf-moment__line">{line}</p> : null}
      {children}
    </div>
  );
}

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
