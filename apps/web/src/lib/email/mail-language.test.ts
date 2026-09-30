import { describe, expect, it } from "vitest";

import { getDictionary, LOCALES, reviewStateOf, type Locale } from "@vallo/i18n";
import { mailEn } from "@vallo/i18n/mail";

import { REFUND_ROUTE } from "../money/copy";
import { mailLanguageOf } from "./mail-language";
import * as messages from "./messages";
import { PREHEADER_MAX, SUBJECT_MAX } from "./render";

/**
 * MAIL IN THE MEMBER'S OWN LANGUAGE (A11), held from both sides.
 *
 * English must come out exactly as it did before the words moved into the
 * dictionary, which `messages.test.ts` and `shell.test.ts` already pin
 * against the English fixtures. This file holds the other side: every
 * localized builder, in every language, still fits the lock screen, fills
 * every placeholder, and says the security line in English too.
 */

const LISTING = "Ocean Breeze two bedroom flat, Lekki Phase 1";

function catalogue(locale: Locale) {
  const language = mailLanguageOf(locale);
  return [
    messages.verificationCode({ ...language, name: "Ada", code: "482 913", expiresInMinutes: 10 }),
    messages.passwordReset({
      ...language,
      name: "Ada",
      resetUrl: "https://vallospaces.com/auth/reset?token=abc",
      code: "12345678",
      codeUrl: "https://vallospaces.com/forgot-password/code",
      expiresInMinutes: 30,
    }),
    messages.passwordChanged({ ...language, name: "Ada", date: "2026-09-22", time: "14:05" }),
    messages.newDeviceSignIn({ ...language, name: null }),
    messages.newDeviceSignIn({
      ...language,
      name: "Ada",
      date: "2026-09-22",
      time: "14:05",
      device: "Chrome on Windows",
      place: "Abuja, Nigeria",
    }),
    messages.bookingConfirmed({
      ...language,
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
      nights: 4,
      totalMinor: 30_000_000,
      arriving: { name: "Nkem Obi", phone: "+2348012345678" },
      access: { estateName: "Ocean Breeze Estate", accessCode: "4471" },
    }),
    messages.bookingCancelled({
      ...language,
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-05",
    }),
    messages.bookingRefunded({
      ...language,
      guestName: "Ada",
      listingTitle: LISTING,
      checkIn: "2026-09-01",
      checkOut: "2026-09-04",
      paidMinor: 30_000_000,
      refundMinor: 15_000_000,
      retainedMinor: 15_000_000,
      reasonLine: "You cancelled inside 72 hours of check in, so half of what you paid comes back.",
      reference: "NF-RFD-2Q7X",
    }),
  ];
}

describe("mail language", () => {
  it("English is the empty answer, so an English builder is untouched", () => {
    expect(mailLanguageOf("en")).toEqual({});
    expect(mailLanguageOf(undefined)).toEqual({});
    expect(mailLanguageOf("fr")).toEqual({});
    expect(mailLanguageOf(42)).toEqual({});
  });

  it("an English member gets byte for byte the English mail", () => {
    const plain = catalogue("en");
    const explicit = [
      messages.verificationCode({ locale: "en", copy: mailEn, name: "Ada", code: "482 913", expiresInMinutes: 10 }),
    ];
    expect(explicit[0]).toEqual(plain[0]);
  });

  it("the refund route in the dictionary is the published one, word for word", () => {
    expect(mailEn.bookingRefunded.refundRoute).toBe(REFUND_ROUTE);
  });

  it.each(LOCALES.filter((l) => l !== "en"))("%s mail is marked as needing native review", (locale) => {
    expect(mailLanguageOf(locale).copy).toBe(getDictionary(locale).mail);
    expect(reviewStateOf(locale, "mail.common.hello")).not.toBe("reviewed");
  });

  describe.each(LOCALES)("%s", (locale) => {
    const sent = catalogue(locale);

    it("fits the lock screen: subject and preheader inside their limits", () => {
      for (const message of sent) {
        expect(message.subject.length, message.subject).toBeLessThanOrEqual(SUBJECT_MAX);
        expect(message.preheader.length, message.preheader).toBeLessThanOrEqual(PREHEADER_MAX);
      }
    });

    it("fills every placeholder and carries no em dash", () => {
      for (const message of sent) {
        for (const part of [message.subject, message.preheader, message.text]) {
          expect(part, part).not.toMatch(/\{\w+\}/);
          expect(part).not.toContain("—");
        }
      }
    });

    it("says each security notice in English as well, and only outside English", () => {
      const [code, reset, changed, device] = sent;
      const pairs = [
        [code, mailEn.verificationCode.securityInEnglish],
        [reset, mailEn.passwordReset.securityInEnglish],
        [changed, mailEn.passwordChanged.securityInEnglish],
        [device, mailEn.newDeviceSignIn.securityInEnglish],
      ] as const;
      for (const [message, line] of pairs) {
        const flat = (message?.text ?? "").replace(/\s+/g, " ");
        if (locale === "en") expect(flat).not.toContain(line);
        else expect(flat).toContain(line);
      }
    });
  });

  it("a translated email is actually in that language", () => {
    const [code] = catalogue("ha");
    expect(code?.subject).toBe("482 913 ita ce lambar Vallo ɗinka");
  });
});
