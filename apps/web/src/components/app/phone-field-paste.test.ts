import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";
import { maskNational, normalisePhone, readPhone } from "@/lib/phone";

/**
 * UX-12: the phone field had maxlength 12, and browsers clip inserted text
 * to maxlength before any handler runs, so the two most common written forms
 * arrived cut short. This inserts them into the field's real markup in
 * Chromium, as a paste or an autofill does, and checks the whole number
 * reaches the handler and reads as complete.
 *
 * The field is given the length limit PhoneField.tsx itself declares on its
 * input (read from the source, so a limit put back fails here).
 */
const SOURCE = readFileSync(join(__dirname, "PhoneField.tsx"), "utf8");
const INPUT = SOURCE.slice(SOURCE.indexOf("<input"), SOURCE.indexOf("/>", SOURCE.indexOf("<input")));
const LIMIT = /maxLength=\{(\d+)\}/.exec(INPUT)?.[1];
const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));

describe.skipIf(!CHROMIUM && !process.env.CI)("pasting a phone number (real Chromium)", () => {
  let browser: Browser;
  beforeAll(async () => {
    if (!CHROMIUM) throw new Error("CI must have a Chromium to run this check");
    browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  });
  afterAll(async () => {
    await browser?.close();
  });

  it.each(["+234 803 123 4567", "+2348031234567", "0803 123 4567", "08031234567", "+234 (0) 803 123 4567", "+2340803 123 4567"])(
    "keeps all of %s",
    async (pasted) => {
      const html = `<input type="tel" inputmode="tel"${LIMIT ? ` maxlength="${LIMIT}"` : ""}>`;
      const page = await browser.newPage();
      await page.setContent(`<html><body>${html}</body></html>`);
      await page.focus("input[type=tel]");
      await page.keyboard.insertText(pasted);
      const received = await page.$eval("input[type=tel]", (el) => (el as HTMLInputElement).value);
      await page.close();
      expect(maskNational(received)).toBe("803 123 4567");
      expect(readPhone(maskNational(received)).state).not.toBe("incomplete");
    },
  );
});

describe("the country code and the trunk zero together", () => {
  it.each(["+234 (0) 803 123 4567", "+2340803 123 4567", "2340 8031234567"])("reads %s as 803 123 4567", (written) => {
    expect(maskNational(written)).toBe("803 123 4567");
    expect(normalisePhone(written)).toBe("+2348031234567");
    expect(readPhone(written).state).toBe("valid");
  });
});
