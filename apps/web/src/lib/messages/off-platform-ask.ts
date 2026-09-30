import { MONEY_TALK_RE } from "./education";
import { accountNumbersIn } from "./account-moment";

/**
 * THE SCAM SHIELD'S DETECTOR (B12): does a message somebody SENT YOU ask you
 * to pay outside Vallo? Client-safe and pure: no I/O, no logging.
 *
 * ---------------------------------------------------------------------------
 * WHY IT EXISTS BESIDE THE DRAFT WARNING.
 *
 * The composer's safety moment fires on the reader's own draft
 * (`MONEY_TALK_RE` in `education.ts`). The classic rental scam runs the other
 * way: the "agent" writes "pay the inspection fee into this account" or "send
 * the caution to my personal account to hold it". This is how the thread
 * knows, on the RECEIVER's side, that such a message arrived. It starts from
 * the same draft pattern and narrows it, because a warning on every message
 * that says "pay" would teach people to ignore it.
 *
 * ---------------------------------------------------------------------------
 * WHAT COUNTS. An ASK, not a mention. A message matches only when it pairs a
 * payment verb (or the draft pattern's money words) with one of:
 *
 *   account    a ten-digit account number (the same finder as the V-04 card)
 *              next to a payment word or a bank's name;
 *   personal   a destination that is somebody's own account: "my account",
 *              "this account", "personal account", "account number", a
 *              bank's name, "a/c";
 *   app        a payment channel outside the platform: OPay, PalmPay,
 *              Moniepoint, PayPal, crypto, a gift card, POS;
 *   fee        a fee Vallo does not charge: an inspection, viewing, form,
 *              holding or logistics fee, asked for with a verb or an amount;
 *   hold       a caution, deposit or rent paid "to hold it", "to secure it",
 *              "before others" or "before the inspection".
 *
 * WHAT NEVER COUNTS, so the shield stays quiet on ordinary talk:
 *
 *   - a fact about a fee with no ask ("caution is 250k, refundable");
 *   - a denial ("there is no inspection fee", "viewing is free");
 *   - a pointer back to the platform ("you pay on Vallo after the
 *     inspection"), unless the same message also carries a number, a bank or
 *     an outside channel;
 *   - money coming TO the reader ("I have sent your refund to your account");
 *   - a phone number (eleven digits, or +234), which the finder refuses;
 *   - a bank word that is also an English word ("access road", "heritage
 *     estate", "sterling condition") unless it is followed by "bank".
 *
 * The cost of a miss is a transfer nobody can reverse; the cost of a false
 * hit is one calm line under a bubble. The tests pin both lists.
 */

export type OffPlatformReason = "account" | "personal" | "app" | "fee" | "hold";

export type OffPlatformAsk = {
  /** The strongest reason, in the order above. */
  reason: OffPlatformReason;
  /** Every reason that matched, for tests and for the moderation count. */
  reasons: OffPlatformReason[];
};

/* A verb that asks for money to move. `drop` only counts before an amount
   ("drop 20k"), because "drop me a message" is not a payment. */
const PAY_VERB_RE =
  /\b(pay|paying|payment|paid|transfer|transferring|send|sending|deposit|remit|credit|lodge|balance me|make payment)\b|\bdrop\s+(?:the\s+)?(?:₦|n|ngn)?\s?\d/i;

/* An amount written the ways people write it in a chat. */
const AMOUNT_RE = /(?:₦|\bngn\s?|\bn)\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:k|m|naira|thousand|million)\b/i;

/* A destination that is a person's own account. "Your account" is money
   coming to the reader, so it is not here. */
const PERSONAL_DEST_RE = new RegExp(
  [
    String.raw`\b(?:my|our|this|his|her|their|the below|below|following|personal|private|company|business)\s+(?:personal\s+|private\s+|own\s+|bank\s+|opay\s+|palmpay\s+)?(?:account|acct|acc|a\/c|bank account|account details|details|number)\b`,
    String.raw`\b(?:account|acct|a\/c|acc)\s*(?:no\.?|number|num|details|name|#)`,
    String.raw`\binto\s+(?:my|our|this|the)\b`,
    String.raw`\baccount\s+below\b`,
  ].join("|"),
  "i",
);

/* Banks by name, reusing the aliases the V-04 finder knows, minus the ones
   that are ordinary English words: those count only as "<word> bank". */
const BANK_NAME_RE =
  /\b(?:gtb|gtbank|gt bank|guaranty trust|zenith|uba|united bank for africa|first ?bank|fbn|fcmb|union bank|wema|ecobank|stanbic|unity bank|jaiz|providus|kuda|vfd|(?:access|fidelity|sterling|polaris|keystone|heritage|globus|titan|premium ?trust|parallex|optimus|signature|lotus|taj|suntrust)\s+bank)\b/i;

/* Channels outside the platform. OPay, PalmPay and Moniepoint are banks too,
   but "send it to my OPay" is the channel, so they live here. */
const OUTSIDE_APP_RE =
  /\b(?:opay|palm ?pay|moniepoint|chipper(?: ?cash)?|paypal|cash ?app|western union|moneygram|worldremit|remitly|usdt|bitcoin|btc|crypto|gift ?cards?|pos)\b/i;

/* Fees Vallo never charges. Any ask to pay one is a warning. */
const NON_VALLO_FEE_RE =
  /\b(?:inspection|viewing|view|form|holding|commitment|logistics|transport(?:ation)?|registration|site ?visit|showing|appointment)\s+(?:fee|fees|money|charge|charges)\b/i;

/* The fee is being denied, not asked for. */
const FEE_DENIED_RE =
  /\b(?:no|free|never|without|don'?t|do not|doesn'?t|does not|isn'?t|is not|zero|not)\b[^.?!]{0,24}\b(?:inspection|viewing|view|form|holding|commitment|logistics|transport(?:ation)?|registration|site ?visit|showing|appointment)\s+(?:fee|fees|money|charge|charges)\b|\b(?:inspection|viewing)\s+(?:is|are)\s+free\b/i;

/* Money asked for to keep the place. */
const HOLD_MONEY_RE = /\b(?:caution|deposit|down ?payment|part ?payment|holding|rent|agency|agreement|legal|balance|commission)\b/i;
const HOLD_REASON_RE =
  /\b(?:to|so (?:i|we) can|make i|make we)\s+(?:hold|secure|reserve|lock|keep|block|book)\b|\bbefore (?:someone|somebody|others|anybody|another|other people)\b|\bfirst come\b|\bbefore (?:the |your |you )?(?:inspection|viewing|inspect|see)\b|\bwithout (?:inspection|seeing)\b/i;

/* The message points back at Vallo for the money. */
const ON_VALLO_RE =
  /\b(?:on|through|via|in|inside|with|using|from)\s+(?:vallo|the vallo app|the app|the platform|this app|this platform)\b/i;

/* Money coming to the reader, not from them. */
const TO_READER_RE =
  /\b(?:your refund|refund(?:ed)? (?:you|to you|to your)|to your (?:account|bank|acct)|your (?:account|bank|acct) (?:details|number|no))\b/i;

/**
 * Does this message, received from the other side, ask the reader to pay
 * outside Vallo? Null when it does not.
 */
export function offPlatformAsk(body: string | null | undefined): OffPlatformAsk | null {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 6) return null;

  const numbers = accountNumbersIn(text);
  const payWords = PAY_VERB_RE.test(text) || MONEY_TALK_RE.test(text);
  const verb = PAY_VERB_RE.test(text);
  const bank = BANK_NAME_RE.test(text);
  const app = OUTSIDE_APP_RE.test(text);
  const personal = PERSONAL_DEST_RE.test(text);
  const toReader = TO_READER_RE.test(text);

  const reasons: OffPlatformReason[] = [];

  /* A number next to money words or a bank: the account itself. */
  if (numbers.length > 0 && (payWords || bank || app) && !toReader) reasons.push("account");

  /* A personal destination, or a bank's name, with a payment verb. */
  if (verb && (personal || bank) && !toReader) reasons.push("personal");

  /* An outside channel with a payment verb. */
  if (verb && app && !toReader) reasons.push("app");

  /* A fee Vallo does not charge, asked for (a verb or an amount), not denied. */
  if (NON_VALLO_FEE_RE.test(text) && (verb || AMOUNT_RE.test(text)) && !FEE_DENIED_RE.test(text)) {
    reasons.push("fee");
  }

  /* Caution, deposit or rent, paid to hold the place or before seeing it. */
  if (verb && HOLD_MONEY_RE.test(text) && HOLD_REASON_RE.test(text)) reasons.push("hold");

  if (reasons.length === 0) return null;

  /* "Pay on Vallo after the inspection" is the platform's own advice. It
     stands down only when nothing concrete (a number, a bank, an outside
     channel, a fee Vallo never charges) sits beside it. */
  const concrete = numbers.length > 0 || bank || app || reasons.includes("fee");
  if (ON_VALLO_RE.test(text) && !concrete) return null;

  const order: OffPlatformReason[] = ["account", "fee", "personal", "app", "hold"];
  const sorted = order.filter((r) => reasons.includes(r));
  return { reason: sorted[0]!, reasons: sorted };
}
