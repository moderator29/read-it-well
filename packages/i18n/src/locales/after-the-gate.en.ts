/**
 * AFTER THE GATE, in English. The money records that begin once somebody has
 * paid: the frozen quote, the terms a stay was priced under, the date a refund
 * is due, and the routes a large payment can actually take.
 *
 * Its own module for the reason `price-check.en.ts` gives: `en.ts` is written
 * by several workers in the same hour, and a namespace in its own file costs
 * the contested file one import and one line. Other locales fall back to
 * English for every key here until a translator reaches it.
 *
 * Placeholders are `{name}` and are filled by the caller. Every figure is
 * rendered by `formatMoney` before it arrives; every date by `formatMoneyDate`.
 * Nothing here says "guaranteed", "verified" or "secure", because nothing here
 * has the column that would prove it.
 */
export const afterTheGateEn = {
  quote: {
    /** On the inspection card and the pay page, once the lister has said yes. */
    frozen: "Move-in quoted at {amount} on {date}. This is the figure you will be charged.",
    frozenShort: "Quoted at {amount} on {date}",
    /** The pay page before any quote exists: the listing's figure as it stands. */
    notYetFrozen: "This is the listing's figure today. It is frozen as your quote when the lister accepts your inspection.",
  },
  remainder: {
    line: "Not broken down by the lister",
    note: "Ask what this is before you pay.",
    /** Wizard gate, beside the stated total. */
    gate: "Your stated total is {amount} more than the parts you listed. Name what the {amount} is for in the fee boxes, or remove it from the total.",
    gateShort: "Itemise the total",
  },
  cancel: {
    heading: "Cancelling this stay",
    nonRefundable: "Non-refundable: nothing back if you cancel",
    freeUntil: "Free to cancel until {date}",
    /** The platform schedule's intro, without claiming it is the same everywhere. */
    intro: "Before you pay, you can let a hold go at any time and nothing is taken. Once a stay is paid for, these are the terms it was priced under, and they do not change after you pay.",
    windowUntil: "Until {until}",
    windowBetween: "{from} to {until}",
    windowFrom: "From {from}",
    everything: "Everything back",
    share: "{percent}% back",
    nothing: "Nothing back",
    back: "{amount} back to you",
    measured: "Hours are measured to check-in at {hour} Lagos time.",
    refundsTo: "Refunds go to your Vallo wallet and are due there within five Nigerian business days of the decision. Your booking shows the exact date.",
    frozenAt: "These terms were fixed when you paid on {date}.",
    /** Stay page: two rates at once, when the cheapest is non-refundable. */
    bothRates: "{cheap} non-refundable, {flex} free cancellation until {date}",
    bookNowRefundable: "Book now picks the cheapest rate you can cancel for free.",
    bookNowCheapest: "Book now picks the cheapest rate, which is non-refundable.",
  },
  refund: {
    heading: "Your refund",
    dueBy: "Due in your wallet by {date}",
    landed: "In your wallet {date}",
    landedLate: "In your wallet {date}, after its due date of {due}",
    overdue: "Was due in your wallet by {date}. A refund past its due date raises an alert on the operations desk within the hour.",
    nothingOwed: "Nothing was due back under the terms this stay was paid under.",
    amount: "{amount} back",
    retained: "{amount} kept under the terms",
    unavailable: "We could not read your refund just now. It is unchanged; try again in a minute.",
  },
  pay: {
    /** When the charge is above the large-payment threshold. */
    largeLead: "Pay by bank transfer",
    largeNote: "Most Nigerian cards cannot pay {amount} in one go. A bank transfer can.",
    walletTooLarge: "The wallet moves up to {limit} at a time, so it is not offered for {amount}.",
  },
  admin: {
    dueSoonTitle: "Refunds due within 24 hours",
    dueSoonEmpty: "No refund is due in the next 24 hours.",
    overdueTitle: "Refunds past their due date",
    overdueEmpty: "No refund is past its due date.",
    dueAt: "Due {date}",
    unavailable: "The refund clock could not be read just now.",
  },
};
