import { describe, expect, it } from "vitest";
import { chargeAskedToSaveCard, saveCardMetadata, toPaymentMethod } from "./methods";
import { readAuthorization } from "./paystack";

/**
 * The saved-card seam, the half that lives in TypeScript.
 *
 * The rule the webhook applies is small and easy to get quietly wrong in
 * either direction: a card must be filed when, and only when, the checkout
 * asked for it AND the processor says the token is reusable. Both halves are
 * pinned here, including the stringified-metadata quirk that turns `true`
 * into `"true"` on some deliveries, and the shape of the authorization object
 * as Paystack actually sends it. What this file does not prove is the insert
 * policy, which is the database's: payment_methods has no client insert
 * policy, and that was verified against the live database with a rolled-back
 * probe rather than pretended at here.
 */

const AUTHORIZATION = {
  authorization_code: "AUTH_8dfhjjdt",
  bin: "408408",
  last4: "4081",
  exp_month: "12",
  exp_year: "2030",
  channel: "card",
  card_type: "visa ",
  bank: "TEST BANK",
  country_code: "NG",
  brand: "visa",
  reusable: true,
  signature: "SIG_uSYN4fv1adlAuoij8QXh",
};

describe("chargeAskedToSaveCard", () => {
  it("is true for the boolean the checkout sets", () => {
    expect(chargeAskedToSaveCard({ save_card: true, user_id: "u" })).toBe(true);
  });

  it("survives the stringified metadata quirk", () => {
    expect(chargeAskedToSaveCard(JSON.stringify({ save_card: true }))).toBe(true);
    expect(chargeAskedToSaveCard({ save_card: "true" })).toBe(true);
  });

  it("is false when nobody asked, whatever else the metadata says", () => {
    expect(chargeAskedToSaveCard({ user_id: "u", purpose: "wallet_fund" })).toBe(false);
    expect(chargeAskedToSaveCard({ save_card: false })).toBe(false);
    expect(chargeAskedToSaveCard({ save_card: "yes" })).toBe(false);
    expect(chargeAskedToSaveCard(null)).toBe(false);
    expect(chargeAskedToSaveCard("not json")).toBe(false);
  });
});

describe("saveCardMetadata", () => {
  it("adds the one flag and keeps everything else", () => {
    expect(saveCardMetadata({ user_id: "u", purpose: "card-setup" })).toEqual({
      user_id: "u",
      purpose: "card-setup",
      save_card: true,
    });
  });
});

describe("readAuthorization", () => {
  it("reads the object as Paystack sends it, trimming and typing the facts", () => {
    expect(readAuthorization(AUTHORIZATION)).toEqual({
      authorizationCode: "AUTH_8dfhjjdt",
      signature: "SIG_uSYN4fv1adlAuoij8QXh",
      cardType: "visa",
      last4: "4081",
      expMonth: 12,
      expYear: 2030,
      bin: "408408",
      bank: "TEST BANK",
      channel: "card",
      reusable: true,
    });
  });

  it("treats anything but the literal true as not reusable", () => {
    expect(readAuthorization({ ...AUTHORIZATION, reusable: "true" })?.reusable).toBe(false);
    expect(readAuthorization({ ...AUTHORIZATION, reusable: undefined })?.reusable).toBe(false);
  });

  it("is null without the two facts that make a row possible", () => {
    expect(readAuthorization({ ...AUTHORIZATION, signature: "" })).toBeNull();
    expect(readAuthorization({ ...AUTHORIZATION, authorization_code: undefined })).toBeNull();
    expect(readAuthorization(null)).toBeNull();
    expect(readAuthorization([])).toBeNull();
    expect(readAuthorization("AUTH_x")).toBeNull();
  });

  it("never carries a card number, whatever the payload holds", () => {
    const read = readAuthorization({ ...AUTHORIZATION, pan: "4084084084084081" });
    expect(read).not.toBeNull();
    expect(JSON.stringify(read)).not.toContain("4084084084084081");
  });
});

describe("toPaymentMethod", () => {
  it("shows the display facts and nothing that could charge the card", () => {
    const shown = toPaymentMethod({
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "u",
      provider: "paystack",
      authorization_code: "AUTH_secret",
      signature: "SIG_secret",
      card_type: "visa",
      last4: "4081",
      exp_month: 12,
      exp_year: 2030,
      bin: "408408",
      bank: "TEST BANK",
      channel: "card",
      reusable: true,
      is_default: true,
      email_used: "someone@example.com",
      deleted_at: null,
      created_at: "2026-09-18T08:00:00Z",
      updated_at: "2026-09-18T08:00:00Z",
    });
    expect(shown).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      cardType: "visa",
      last4: "4081",
      expMonth: 12,
      expYear: 2030,
      bank: "TEST BANK",
      reusable: true,
      isDefault: true,
      createdAt: "2026-09-18T08:00:00Z",
    });
    const serialised = JSON.stringify(shown);
    expect(serialised).not.toContain("AUTH_secret");
    expect(serialised).not.toContain("SIG_secret");
    expect(serialised).not.toContain("someone@example.com");
  });
});
