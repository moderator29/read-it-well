/**
 * Session 3's copy for the move-in ledger, bookings, receipts and email surfaces (W9).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 */
export const experienceMoneyEn = {
  /* The receipt (components/app/money/receipt-model.ts): the words the
     on-screen receipt and the receipt email share, so the two read the same. */
  receipt: {
    kind: "Receipt",
    confirmations: "Confirmations",
    /* Reference 7082's two rows, each shown only once it is a fact. */
    payment: "Payment",
    booking: "Booking",
    confirmed: "Confirmed",
    /* The length of the stay is its own fact, beside Guests. */
    nights: "Nights",
  },
  /* The move-in ledger on its document sheet (reference 7073). */
  ledger: {
    /* The way on from a home that cannot take an inspection request. Said
       about the search, never about the home, so it labels nothing (D24). */
    similar: "See similar homes nearby",
  },
  /* /bookings and /bookings/[id] (reference 7071). */
  bookings: {
    receiptTitle: "Your receipt",
  },
  /* The share split as named rows (/rent/share/[id]). */
  share: {
    yours: "Your share",
    total: "Move-in total",
    due: "Move-in",
  },
  /* The receipt email (lib/email/receipt.ts). */
  email: {
    openReceipt: "Open the receipt",
    footerWhy: "You are receiving this because you paid for a stay on Vallo.",
  },
};
