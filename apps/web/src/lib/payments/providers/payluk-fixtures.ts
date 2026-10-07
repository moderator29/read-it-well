/**
 * PAYLUK ESCROW, RECORDED FROM THE DOCUMENTED CONTRACT (D77).
 *
 * Every answer here is written field for field from Payluk's own examples in
 * docs/payments/payluk-source/ (create-escrow, verify-payment-token,
 * pay-escrow-buy, buyer-confirm-payment-standard, list-escrow-transactions,
 * concepts_webhooks), re-cut for one 500,000 naira rent held for a lister. The
 * envelope is `{ status, message, data }`; amounts are naira, as Payluk writes
 * them (the human `message` strings are shortened; nothing reads them).
 * These are NOT captures from Payluk staging: no key has reached Vallo yet. The day `PAYLUK_TEST_SECRET_KEY` arrives, the same lifecycle is run
 * against staging and any field that differs is corrected here first.
 *
 * Test and preview data only: nothing in a request path imports this file.
 */

export const FIXTURE_KEY = "sk_test_fixture_0000000000000000";

export type FixtureEscrowInput = {
  /** Vallo's reference line, as `referenceLine(reference)` writes it into `description`. */
  description: string;
  /** Naira, as Payluk writes it. */
  amount: number;
  fee?: number;
  whoPays?: "buyer" | "seller" | "both";
};

const ESCROW_ID = "6a3cdafc734e96016b227367";
const TOKEN = "PY_TIrNY1CD3836";
const PAYMENT_ID = "6a3cdafd734e96016b22736b";

function escrowRecord(input: FixtureEscrowInput, status: string, state: string, extra: Record<string, unknown> = {}) {
  return {
    id: ESCROW_ID,
    amount: input.amount,
    purpose: "Rent",
    description: input.description,
    whoPays: input.whoPays ?? "seller",
    imageUrl: null,
    fee: input.fee ?? input.amount * 0.02,
    additionalFee: 0,
    paymentToken: TOKEN,
    paidAt: null as string | null,
    status,
    state,
    logs: [],
    channel: "API",
    dispute: null,
    settlementType: "STANDARD",
    milestones: null,
    totalQuantity: 1,
    maxDelivery: 7,
    deliveryTimeline: "days",
    environment: "test",
    merchantId: 4242,
    createdAt: "2026-10-07T09:00:00.000Z",
    updatedAt: "2026-10-07T09:00:00.000Z",
    ...extra,
  };
}

export const PAYLUK_FIXTURE_IDS = { escrowId: ESCROW_ID, paymentToken: TOKEN, paymentId: PAYMENT_ID };

/** `POST /v1/escrow/create`, 201. */
export function createdAnswer(input: FixtureEscrowInput) {
  return { status: 201, message: "Escrow created successfully", data: escrowRecord(input, "PENDING", "AWAITING_PAYMENT") };
}

/** `GET /v1/escrow/verify/{token}`, 200, before the renter has paid. */
export function verifiedUnpaidAnswer(input: FixtureEscrowInput) {
  return { status: 200, message: "Escrow resolved", data: escrowRecord(input, "PENDING", "AWAITING_PAYMENT", { isSeller: false }) };
}

/** `POST /v1/payment/escrow` from the renter's Payluk balance, 200. */
export function fundedAnswer(input: FixtureEscrowInput & { reference: string; owed: number }) {
  return {
    status: 200,
    message: "Escrow funded",
    data: {
      id: PAYMENT_ID,
      amount: input.owed,
      reference: input.reference,
      fee: 0,
      transactionType: "escrow",
      currency: "NGN",
      transferDetails: null,
      cardId: null,
      walletDetails: null,
      blockchainDetails: null,
      withdrawalDetails: null,
      escrowDetails: {
        beneficiary: { name: "Probe Lister", phone: "08000000000" },
        description: input.description,
        amount: input.amount,
        fee: input.fee ?? input.amount * 0.02,
        paymentToken: TOKEN,
        purpose: "Rent",
        channel: "API",
        callbackUrl: null,
      },
      metadata: null,
      status: "success",
      creditType: "debit",
      createdAt: "2026-10-07T09:05:00.000Z",
      updatedAt: "2026-10-07T09:05:01.000Z",
    },
  };
}

/** `POST /v1/escrow/confirm-payment/{id}` as the buyer, 200. */
export function confirmedAnswer(input: FixtureEscrowInput) {
  return {
    status: 200,
    message: "Escrow updated successfully",
    data: escrowRecord(input, "COMPLETED", "CLOSED", { paidAt: "1791363900", completedAt: "2026-10-07T10:00:00.000Z" }),
  };
}

/** `GET /v1/escrow/transactions?type=sales`, 200: the read-back by reference. */
export function listedAnswer(input: FixtureEscrowInput) {
  return {
    status: 200,
    message: "Transaction fetched successfully",
    data: { data: [escrowRecord(input, "PENDING", "AWAITING_PAYMENT")], total: 1, page: 1, limit: 20 },
  };
}

/** The escrow webhook envelope, as concepts_webhooks shows it. */
export function escrowWebhook(event: "escrow.created" | "escrow.ongoing" | "escrow.completed", input: FixtureEscrowInput) {
  const shape = {
    "escrow.created": ["PENDING", "AWAITING_PAYMENT", {}],
    "escrow.ongoing": ["ONGOING", "OPENED", { paidAt: "1791363900", paymentId: PAYMENT_ID }],
    "escrow.completed": ["COMPLETED", "CLOSED", { paidAt: "1791363900", paymentId: PAYMENT_ID, completedAt: "2026-10-07T10:00:00.000Z" }],
  } as const;
  const [status, state, extra] = shape[event];
  return { event, data: escrowRecord(input, status, state, extra), timestamp: "2026-10-07T10:00:00.000Z" };
}
