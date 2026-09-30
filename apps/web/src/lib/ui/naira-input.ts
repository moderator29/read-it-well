/**
 * NAIRA AS IT IS TYPED (details pass, 30 September 2026).
 *
 * Seventy-seven amount boxes on the platform took bare digits, so "1500000"
 * sat in the field exactly as typed and a missing zero (a rent of ₦150,000
 * instead of ₦1,500,000) was invisible until a total came back wrong. This
 * groups the figure as it is typed, the way it is written and read aloud,
 * and hands the caller the plain figure ("1500000", "1500000.5") to keep and
 * send, which every money parser on the platform already reads
 * (`parseNairaToKobo` takes grouped or plain).
 */

const GROUP = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

export type NairaTyping = {
  /** What the box shows: "1,500,000" or "1,500,000.5". */
  display: string;
  /** What the caller keeps: "1500000" or "1500000.5"; "" when empty. */
  value: string;
};

/** Clean and group whatever arrived (typing, a paste, autofill). */
export function readNairaTyping(raw: string, allowKobo = false): NairaTyping {
  let text = raw.replace(/[^\d.]/g, "");
  let fraction: string | null = null;
  if (allowKobo && text.includes(".")) {
    const at = text.indexOf(".");
    fraction = text.slice(at + 1).replace(/\./g, "").slice(0, 2);
    text = text.slice(0, at);
  } else {
    /* Without kobo a full stop is a slip; everything after it is dropped so
       "1500.00" does not become "150000". */
    text = text.split(".")[0] ?? "";
  }
  const whole = text.replace(/^0+(?=\d)/, "");
  if (whole === "" && fraction === null) return { display: "", value: "" };
  const wholeOrZero = whole === "" ? "0" : whole;
  /* Grouped by hand past 15 digits, where a Number would lose them. */
  const grouped =
    wholeOrZero.length <= 15
      ? GROUP.format(Number(wholeOrZero))
      : wholeOrZero.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const tail = fraction === null ? "" : `.${fraction}`;
  return { display: `${grouped}${tail}`, value: `${wholeOrZero}${tail}` };
}

/**
 * Where the caret belongs after regrouping: after the same count of digits
 * (and the point) that were before it, so a comma appearing ahead of the
 * caret never throws it back a character.
 */
export function caretAfter(display: string, significantBefore: number): number {
  if (significantBefore <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < display.length; i += 1) {
    if (/[\d.]/.test(display[i]!)) seen += 1;
    if (seen === significantBefore) return i + 1;
  }
  return display.length;
}

/** How many digits (and points) sit before a caret in the raw text. */
export function significantBefore(raw: string, caret: number): number {
  return raw.slice(0, caret).replace(/[^\d.]/g, "").length;
}
