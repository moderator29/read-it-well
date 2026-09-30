import { describe, expect, it } from "vitest";
import { offPlatformAsk } from "./off-platform-ask";

/**
 * B12: the scam shield's detector. Two lists, both pinned: the messages that
 * must raise the shield, and the ordinary talk that must never raise it.
 */

const MUST_MATCH: Array<[string, string]> = [
  ["Pay the inspection fee into this account: 0123456789, GTB", "account"],
  ["0123456789 GTBank, name Adewale Okon", "account"],
  ["Acct no 2034 567 890 Zenith. Send it today", "account"],
  ["Send the caution to my personal account to hold it for you", "personal"],
  ["Kindly transfer the rent to my account and I will send the keys", "personal"],
  ["You can pay into my Opay, I will send you the number", "personal"],
  ["Abeg send the caution to my account make I hold am for you", "personal"],
  ["Please make payment to the account below", "personal"],
  ["Pay to First Bank, I will share the details", "personal"],
  ["Pay with PayPal or USDT, whichever is easier for you", "app"],
  ["Send it through Moniepoint to this number", "personal"],
  ["The inspection fee is 10k, pay before Saturday", "fee"],
  ["Oga pay the inspection money make I come show you", "fee"],
  ["Viewing fee is N5,000, I will send you where to pay", "fee"],
  ["Drop 20k for the form fee", "fee"],
  ["There is logistics fee of 15k for the inspection", "fee"],
  ["Pay the caution now to secure it before others come", "hold"],
  ["Pay part payment before the inspection so nobody takes it", "hold"],
  ["Pay on Vallo later, but first transfer the holding fee to my GTB account 0123456789", "account"],
];

const MUST_NOT_MATCH: string[] = [
  "Hello, is the flat still available?",
  "Yes it is. When would you like to see it?",
  "Caution is 250k and it is refundable at the end of the tenancy.",
  "Rent is 2.5m per year, agency 10 percent, legal 10 percent.",
  "There is no inspection fee. Viewing is free.",
  "Vallo charges no inspection fee, just pick a time.",
  "You pay on Vallo after the inspection, once we both confirm the agreement.",
  "Payment happens through the app after you inspect.",
  "I have sent your refund to your account.",
  "Call me on 08031234567 when you reach the gate.",
  "My number is +234 803 123 4567",
  "The flat is off the access road, close to Heritage estate.",
  "It is in sterling condition, newly painted.",
  "Send me a message when you are close.",
  "Can you send the documents to my email?",
  "The prepaid meter is on the wall by the door.",
  "Is Saturday by 2pm okay for the viewing?",
  "The account for the service charge is managed by the estate.",
  "Drop me a message on Friday.",
  "Please send your account details for the caution refund.",
  "I will transfer you to my colleague who handles viewings.",
  "Payment details will show on Vallo once the agreement is confirmed.",
  "",
  "ok",
];

describe("offPlatformAsk", () => {
  it.each(MUST_MATCH)("raises the shield: %s", (body, reason) => {
    const ask = offPlatformAsk(body);
    expect(ask, body).not.toBeNull();
    expect(ask!.reason).toBe(reason);
  });

  it.each(MUST_NOT_MATCH.map((b) => [b]))("stays quiet: %s", (body) => {
    expect(offPlatformAsk(body)).toBeNull();
  });

  it("lists every reason, strongest first", () => {
    const ask = offPlatformAsk("Transfer the inspection fee to my account 0123456789 at GTB");
    expect(ask?.reasons).toEqual(["account", "fee", "personal"]);
  });

  it("forgives null and whitespace", () => {
    expect(offPlatformAsk(null)).toBeNull();
    expect(offPlatformAsk(undefined)).toBeNull();
    expect(offPlatformAsk("    \n  ")).toBeNull();
  });
});
