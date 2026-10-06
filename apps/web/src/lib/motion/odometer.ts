/**
 * WHICH DIGITS ROLL WHEN A FIGURE CHANGES (Session 3; north star motion 5,
 * MOTION_SYSTEM.md "Odometer change").
 *
 * A changed figure rolls per digit, and ONLY the digits that changed move:
 * ₦1,250,000 becoming ₦1,260,000 turns one wheel, not seven. The two printed
 * strings are compared right-aligned, because that is how place value lines
 * up: the units of the old figure sit over the units of the new one however
 * many digits either has, so a figure that gains a digit grows on the left.
 *
 * Pure: strings in, cells out, so the rule can be tested without a browser.
 * The component that draws the cells is `components/ui/Odometer.tsx`.
 */
export type OdometerCell = {
  /** The character the cell rests on: the new figure's. */
  char: string;
  /** The character it rolls from, when it rolls. */
  from?: string;
  /** Zero-based position among the ROLLING cells, left to right: the stagger. */
  order?: number;
};

export type OdometerPlan = {
  cells: OdometerCell[];
  /** Up when the figure grew, down when it shrank: digits travel with it. */
  direction: "up" | "down";
};

const DIGIT = /\d/;

/** The number a printed figure holds, ignoring its symbol and separators. */
function magnitude(text: string): number {
  const digits = text.replace(/[^\d]/g, "");
  return digits === "" ? 0 : Number(digits);
}

export function planOdometer(from: string, to: string): OdometerPlan {
  const direction = magnitude(to) >= magnitude(from) ? "up" : "down";
  const offset = from.length - to.length;
  const cells: OdometerCell[] = [];
  let order = 0;
  for (let i = 0; i < to.length; i += 1) {
    const char = to[i]!;
    const j = i + offset;
    const previous = j >= 0 ? from[j] : undefined;
    /*
     * A digit rolls when it changed, or when it is new (the figure gained a
     * place, so it rolls up from blank). A separator, a symbol or a space
     * never rolls: a comma turning into a comma is not a change, and a comma
     * sliding past a digit would read as a glitch.
     */
    if (DIGIT.test(char) && previous !== char) {
      cells.push({ char, from: previous !== undefined && DIGIT.test(previous) ? previous : "", order });
      order += 1;
    } else {
      cells.push({ char });
    }
  }
  return { cells, direction };
}
