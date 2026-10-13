/**
 * Paystack webhook deliveries for a restaurant bill, shaped as Paystack sends
 * them (event, data.reference, data.amount in kobo, data.currency, metadata as
 * `payTableBill` writes it). Structural test values only: no real reference,
 * card, email or person. Used by the webhook tests; never sent anywhere.
 */
export const BILL_REFERENCE_FIXTURE = "rm-bill-6f1c2b9e-7d4a-4c1e-9b8a-2d3e4f5a6b7c";
export const BILL_ID_FIXTURE = "0b9e8d7c-6a5b-4c3d-8e2f-1a0b9c8d7e6f";
export const BILL_AMOUNT_FIXTURE = 4_750_000;

export const billChargeSuccess = {
  event: "charge.success",
  data: {
    id: 1,
    domain: "test",
    status: "success",
    reference: BILL_REFERENCE_FIXTURE,
    amount: BILL_AMOUNT_FIXTURE,
    currency: "NGN",
    channel: "card",
    paid_at: "2026-10-13T19:42:10.000Z",
    fees: 71_250,
    customer: { email: "diner@example.invalid" },
    metadata: { kind: "restaurant_bill", bill_id: BILL_ID_FIXTURE, user_id: "8c7b6a59-4e3d-4c2b-9a1f-0e9d8c7b6a59" },
    split: { type: "flat", bearer_type: "subaccount" },
  },
} as const;

export const billChargeFailed = {
  event: "charge.failed",
  data: {
    reference: BILL_REFERENCE_FIXTURE,
    amount: BILL_AMOUNT_FIXTURE,
    currency: "NGN",
    status: "failed",
    gateway_response: "Declined",
    metadata: { kind: "restaurant_bill", bill_id: BILL_ID_FIXTURE },
  },
} as const;
