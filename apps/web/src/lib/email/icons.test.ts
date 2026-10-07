import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EVERY_MESSAGE } from "./fixtures";
import {
  EMAIL_GLYPHS,
  EMAIL_GLYPH_SIZE,
  EMAIL_OBJECTS,
  EMAIL_OBJECT_SIZE,
  EMAIL_PLAN,
  FAMILY,
  emailGlyphPath,
  emailObjectFor,
  emailObjectPath,
  emailRegisterOf,
  type EmailGlyph,
  type EmailKind,
} from "./icons";
import { sortEmailImages } from "./images";
import { heroMarkHtml, siteUrl } from "./render";

/**
 * The Tier B object every email carries above its headline, and the line
 * glyphs in its rows (`icons.ts`; rewritten by W9 on 6 October 2026, when
 * the glossy first-rollout marks gave way to the founder's Tier B set).
 *
 * What is checked: every object an email can carry is a PNG pair of the
 * promised size, made from a Tier B source that exists; every glyph is a PNG
 * at 3x; every message names an object and a family; the money and document
 * families are paper; every rendered message carries at most one object,
 * sized, with its family word as alt, from the site origin, above its
 * headline; and its row glyphs are decorative.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(HERE, "..", "..", "..", "public");
const onDisk = (path: string) => join(PUBLIC, path);

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("the email object files", () => {
  it.each([...EMAIL_OBJECTS])("%s is a 128px PNG with a 256px twin, from a Tier B source", (name) => {
    const one = onDisk(emailObjectPath(name));
    const two = one.replace(/\.png$/, "@2x.png");
    expect(existsSync(one)).toBe(true);
    expect(existsSync(two)).toBe(true);
    expect(pngSize(one)).toEqual({ width: EMAIL_OBJECT_SIZE * 2, height: EMAIL_OBJECT_SIZE * 2 });
    expect(pngSize(two)).toEqual({ width: EMAIL_OBJECT_SIZE * 4, height: EMAIL_OBJECT_SIZE * 4 });
    /* Provenance: the PNG is a copy of a founder-approved symbol, never a new drawing. */
    expect(existsSync(onDisk(`/brand/tier-b/${name}@2x.webp`))).toBe(true);
  });

  it.each(Object.keys(EMAIL_GLYPHS) as EmailGlyph[])("glyph %s is a PNG at three times its drawn size", (glyph) => {
    const file = onDisk(emailGlyphPath(glyph));
    expect(existsSync(file)).toBe(true);
    expect(pngSize(file)).toEqual({ width: EMAIL_GLYPH_SIZE * 3, height: EMAIL_GLYPH_SIZE * 3 });
  });
});

describe("the plan", () => {
  const kinds = Object.keys(EMAIL_PLAN) as EmailKind[];

  it.each(kinds)("%s carries an object that is on disk, and a family", (kind) => {
    const object = emailObjectFor(kind);
    expect(object).not.toBeNull();
    expect(EMAIL_OBJECTS).toContain(object);
    expect(FAMILY[EMAIL_PLAN[kind].family]).toBeTruthy();
  });

  it("draws money and documents as paper, and notification mail as the shell", () => {
    expect(emailRegisterOf("paymentReceipt")).toBe("paper");
    expect(emailRegisterOf("bookingRefunded")).toBe("paper");
    expect(emailRegisterOf("agreementApproved")).toBe("paper");
    expect(emailRegisterOf("cryptoPayment")).toBe("paper");
    expect(emailRegisterOf("newEnquiry")).toBe("shell");
    expect(emailRegisterOf("verificationCode")).toBe("shell");
  });

  it("draws nothing for a message it does not know", () => {
    expect(emailObjectFor("nope" as EmailKind)).toBeNull();
    expect(heroMarkHtml("nope" as EmailKind)).toBe("");
  });
});

describe("every rendered message", () => {
  it.each(EVERY_MESSAGE)("$name carries the lockup and at most one Tier B object, named by its family", ({ message }) => {
    const images = sortEmailImages(message.html);
    expect(images.lockup).not.toBeNull();
    expect(images.object.length).toBeLessThanOrEqual(1);
    for (const object of images.object) {
      const src = /\bsrc="([^"]+)"/.exec(object)?.[1] ?? "";
      expect(src.startsWith(`${siteUrl()}/brand/email/objects/`)).toBe(true);
      expect(src.endsWith(".png")).toBe(true);
      expect(existsSync(onDisk(src.slice(siteUrl().length)))).toBe(true);
      // Sized, so a blocked image keeps its box; its alt is the family word.
      expect(object).toContain(`width="${EMAIL_OBJECT_SIZE}"`);
      expect(object).toContain(`height="${EMAIL_OBJECT_SIZE}"`);
      const alt = /\balt="([^"]*)"/.exec(object)?.[1];
      expect(Object.values(FAMILY).map((f) => f.alt)).toContain(alt);
      expect(object).toContain('border="0"');
      expect(object).toContain("display:block");
      // Above the headline, never after it.
      const h1 = message.html.indexOf("<h1");
      expect(h1).toBeGreaterThan(-1);
      expect(message.html.indexOf(object)).toBeLessThan(h1);
    }
    for (const glyph of images.glyphs) {
      expect(glyph).toContain('alt=""');
      const src = /\bsrc="([^"]+)"/.exec(glyph)?.[1] ?? "";
      expect(existsSync(onDisk(src.slice(siteUrl().length)))).toBe(true);
    }
  });

  it("gives every message an object today", () => {
    const withObject = EVERY_MESSAGE.filter(({ message }) => sortEmailImages(message.html).object.length === 1);
    expect(withObject.length).toBe(EVERY_MESSAGE.length);
  });

  it.each(EVERY_MESSAGE)("$name keeps its inbox line first", ({ message }) => {
    // The preheader stays the first thing in the body: the object sits in the
    // card, after it, so the lock-screen line is unchanged.
    const body = message.html.slice(message.html.indexOf("<body"));
    expect(body.indexOf('<span style="display:none')).toBeLessThan(body.indexOf("<img"));
  });
});

describe("the Supabase auth templates", () => {
  const TEMPLATES = join(HERE, "..", "..", "..", "..", "..", "supabase", "templates");
  const names = ["confirmation", "email-change", "invite", "magic-link", "recovery"];

  it.each(names)("%s carries one 3D mark that exists, from the site URL", (name) => {
    const html = readFileSync(join(TEMPLATES, `${name}.html`), "utf8");
    const marks = (html.match(/<img\b[^>]*>/g) ?? []).filter((img) => img.includes("/brand/3d/email/"));
    expect(marks).toHaveLength(1);
    const mark = marks[0]!;
    const path = /src="\{\{ \.SiteURL \}\}([^"]+)"/.exec(mark)?.[1] ?? "";
    expect(existsSync(onDisk(path))).toBe(true);
    expect(mark).toContain(`width="${EMAIL_OBJECT_SIZE}"`);
    expect(mark).toContain('alt=""');
  });
});
