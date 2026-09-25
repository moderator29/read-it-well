import type { Dictionary } from "@vallo/i18n/core";
import {
  GUARANTEE_SCOPE,
  GUARANTEE_SENTENCE,
  NO_CUSTODY_SENTENCE,
  NO_INSPECTION_FEE,
  PAYMENT_GATE_SENTENCE,
  PAYOUT_ANSWER,
  PRIVATE_FEE_NOTE,
  REFUND_ROUTE,
} from "@/lib/money/copy";

/**
 * EVERY MONEY ANSWER IS A CONSTANT FROM `lib/money/copy.ts`, joined and never
 * reworded. The dictionary carries only the question for these keys
 * (`landingRooms.faq`), so a change to how money works is one edit in one
 * file and the FAQ, the checkout and the help centre move together.
 */
const MONEY_ANSWERS: Record<string, string> = {
  pay: `${PAYMENT_GATE_SENTENCE} ${NO_CUSTODY_SENTENCE}`,
  inspection: `${NO_INSPECTION_FEE} ${PRIVATE_FEE_NOTE}`,
  guarantee: `${GUARANTEE_SENTENCE} ${GUARANTEE_SCOPE}`,
  payout: PAYOUT_ANSWER,
  refund: REFUND_ROUTE,
};

/** The landing FAQ's questions with every answer resolved. */
export function faqItems(t: Dictionary): { key: string; q: string; a: string }[] {
  return t.landingRooms.faq.items
    .map((item) => ({
      key: item.key,
      q: item.q,
      a: MONEY_ANSWERS[item.key] ?? ("a" in item ? (item.a ?? "") : ""),
    }))
    .filter((item) => item.q && item.a);
}
