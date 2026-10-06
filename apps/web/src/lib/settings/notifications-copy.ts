/**
 * The notification matrix's words (R3-14). English-only constants, like
 * `lib/money/copy.ts`; the dictionary keys are in the C2 report as a patch,
 * because `en.ts` is held by another agent this round. Client-safe.
 */
export const MATRIX_TITLE = "What reaches you, and where";
export const MATRIX_CAPTION = "Notifications by event and channel";
export const MATRIX_COL_EVENT = "Event";
export const MATRIX_COL_EMAIL = "Email";
export const MATRIX_COL_PUSH = "Push";
export const MATRIX_NOTE =
  "Bookings, messages and offers also follow the Email switch in the app. Payments always appear in the app, whatever you choose here.";
export const MATRIX_NOT_EMAILED = "Not sent by email";

export const MATRIX_ROWS = {
  bookings: { label: "Bookings", sub: "Requests, confirmations and changes to your stays" },
  messages: { label: "Messages", sub: "New replies from hosts and agents" },
  payments: { label: "Payments", sub: "Payments, refunds, receipts and payouts" },
  savedPriceDrops: { label: "Price drops", sub: "A place you saved comes down in price" },
  marketing: { label: "Ideas and offers", sub: "Occasional highlights. Off unless you turn it on" },
} as const;

export const QUIET_TITLE = "Quiet hours";
export const QUIET_SWITCH = "Hold push notifications overnight";
export const QUIET_SUB = "Held pushes arrive when your quiet hours end. Payments still reach you at once.";
export const QUIET_FROM = "From";
export const QUIET_TO = "Until";
export const QUIET_ZONE = "Lagos time";
export const QUIET_SAVE = "Save quiet hours";

export const MATRIX_SAVED = "Saved";
