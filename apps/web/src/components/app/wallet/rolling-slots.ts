/**
 * The slots of a rolling figure, keyed by position from the RIGHT.
 *
 * A digit's identity is how many digits sit to its right, so "5" typed after
 * "12" keeps the 1 and the 2 where they are and slides a new units digit in,
 * and 999 to 1,000 rolls the three nines over rather than replacing them. A
 * separator is keyed the same way, by the digits to its right, which is where
 * a locale's grouping puts it. `fromLeft` is the stagger order for digits.
 *
 * Pure, so it is tested rather than trusted. See `RollingAmount`.
 */
export type RollingSlot = {
  key: string;
  ch: string;
  digit: boolean;
  /** Digit index from the left, for the entrance stagger. 0 for separators. */
  fromLeft: number;
};

export function rollingSlots(figure: string): RollingSlot[] {
  const chars = figure.split("");
  const slots: RollingSlot[] = [];
  let digitsToRight = 0;
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    const ch = chars[i] ?? "";
    const digit = ch >= "0" && ch <= "9";
    slots.unshift({ key: digit ? `d${digitsToRight}` : `s${digitsToRight}`, ch, digit, fromLeft: 0 });
    if (digit) digitsToRight += 1;
  }
  let fromLeft = 0;
  for (const slot of slots) {
    if (slot.digit) {
      slot.fromLeft = fromLeft;
      fromLeft += 1;
    }
  }
  return slots;
}
