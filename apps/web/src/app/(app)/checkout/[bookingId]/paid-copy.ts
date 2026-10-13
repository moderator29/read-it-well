import { getDictionary } from "@vallo/i18n";

/**
 * The paid screens' sentences, kept out of `payment-copy.ts` so the client pay
 * panels that import that module never pull the dictionary (W13, measured:
 * 398KB gzipped). Read by `payment-copy.test.ts`, which holds them to V-33.
 */
/*
 * V-33: WHAT A SUCCESS SCREEN MAY SAY ABOUT WHERE THE MONEY WENT.
 *
 * These screens used to tell the payer the agent had been paid. Nothing paid
 * the agent: no payout to a bank exists, and the charge credited nobody. A
 * success screen is read at the most anxious second of the transaction, so it
 * states only what the ledger already proves (the charge is recorded to the
 * kobo) and what the reader should do next. It never claims a payout, and
 * `payment-copy.test.ts` fails if any of these sentences starts to.
 */

/** The rent page when it is opened again after a paid charge. */
export const RENT_PAID_PAGE_CONSEQUENCE = getDictionary("en").checkout.paidRent;

/** The sheet that opens the moment a rent payment confirms. */
export const RENT_PAID_SHEET_CONSEQUENCE = getDictionary("en").checkout.paidRent;

/** The sheet that opens the moment a stay payment confirms. */
export const STAY_PAID_SHEET_CONSEQUENCE = getDictionary("en").checkout.paidStay;
