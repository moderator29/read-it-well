/**
 * WHAT A RENTER OR GUEST IS SHOWN: THE ADVERTISED PRICE, AND NOTHING ELSE.
 *
 * D51, whoPays = seller. The lister bears Vallo's fee on both rails, so the
 * person paying sees exactly the price the listing advertised: no fee line, no
 * footnote, no asterisk. Every line on a guest's checkout is the lister's own
 * figure (the nights, a cleaning charge the lister set).
 *
 * A booking row that carries a guest-side fee (`service_fee_minor > 0`)
 * contradicts that rule, and is refused rather than drawn: hiding the line
 * would charge somebody more than the lines say, and showing it would put a
 * Vallo fee on the guest's side. Neither is honest, so the checkout does not
 * * open, and the caller says so in its own words.
 *
 * Integer kobo throughout. Client-safe and pure.
 */

export type GuestChargeLine = { label: string; minor: number };

export type GuestChargeInput = {
  /** Price per night times nights, the lister's figure. */
  subtotalMinor: number;
  subtotalLabel: string;
  cleaningMinor: number;
  cleaningLabel: string;
  /** A guest-side fee. Must be zero under D51. */
  serviceFeeMinor: number;
  totalMinor: number;
};

export type GuestCharge =
  | { state: "ok"; lines: GuestChargeLine[]; totalMinor: number }
  /** A guest-side fee is on the row: never drawn, never charged. */
  | { state: "refused"; reason: "guest-fee" };

export function guestCharge(input: GuestChargeInput): GuestCharge {
  if (input.serviceFeeMinor !== 0) return { state: "refused", reason: "guest-fee" };
  const lines: GuestChargeLine[] = [{ label: input.subtotalLabel, minor: input.subtotalMinor }];
  if (input.cleaningMinor > 0) lines.push({ label: input.cleaningLabel, minor: input.cleaningMinor });
  return { state: "ok", lines, totalMinor: input.totalMinor };
}
