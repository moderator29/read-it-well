import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EVERY_MESSAGE } from "./fixtures";
import {
  EMAIL_ICON_NAMES,
  EMAIL_ICON_PLAN,
  EMAIL_ICON_READY,
  EMAIL_ICON_SIZE,
  emailIconFor,
  emailIconPath,
  type EmailKind,
} from "./icons";
import { heroMarkHtml, siteUrl } from "./render";
import { LOCKUP_PATH } from "./theme";

/**
 * The 3D mark every email carries above its headline (`icons.ts`).
 *
 * What is checked: every file the emails reference exists as a PNG of the
 * size promised; a message never names an object that is not on disk; a new
 * PNG from the 3D rollout lights its messages up (this fails until it is
 * listed); and every rendered message carries at most one mark, sized, with
 * an empty alt, from the site origin, above its headline.
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

describe("the email icon files", () => {
  it.each([...EMAIL_ICON_READY])("%s is a 128 px PNG with a 256 px twin", (name) => {
    const one = onDisk(emailIconPath(name));
    const two = one.replace(/\.png$/, "@2x.png");
    expect(existsSync(one)).toBe(true);
    expect(existsSync(two)).toBe(true);
    expect(pngSize(one)).toEqual({ width: EMAIL_ICON_SIZE * 2, height: EMAIL_ICON_SIZE * 2 });
    expect(pngSize(two)).toEqual({ width: EMAIL_ICON_SIZE * 4, height: EMAIL_ICON_SIZE * 4 });
  });

  it("lights up every object the 3D rollout has delivered", () => {
    /*
     * A PNG on disk that is not in EMAIL_ICON_READY is an object no email
     * shows yet. Adding the name to EMAIL_ICON_READY in icons.ts is the fix.
     */
    const delivered = EMAIL_ICON_NAMES.filter(
      (name) => !EMAIL_ICON_READY.has(name) && existsSync(onDisk(emailIconPath(name))),
    );
    expect(delivered).toEqual([]);
  });
});

describe("the plan", () => {
  const kinds = Object.keys(EMAIL_ICON_PLAN) as EmailKind[];

  it.each(kinds)("%s never points at a file that is not there", (kind) => {
    const plan = EMAIL_ICON_PLAN[kind];
    if (plan.now !== null) expect(EMAIL_ICON_READY.has(plan.now)).toBe(true);
    const drawn = emailIconFor(kind);
    if (drawn !== null) {
      expect(EMAIL_ICON_READY.has(drawn)).toBe(true);
      expect(existsSync(onDisk(emailIconPath(drawn)))).toBe(true);
    }
  });

  it("prefers the object a message wants the moment it is ready", () => {
    expect(emailIconFor("newEnquiry")).toBe("local-talks");
    expect(emailIconFor("reservationConfirmed")).toBe("restaurant");
    const waiting = kinds.filter((k) => !EMAIL_ICON_READY.has(EMAIL_ICON_PLAN[k].want));
    for (const kind of waiting) expect(emailIconFor(kind)).toBe(EMAIL_ICON_PLAN[kind].now);
  });

  it("draws nothing for a message it does not know", () => {
    expect(emailIconFor("nope" as EmailKind)).toBeNull();
    expect(heroMarkHtml("nope" as EmailKind)).toBe("");
  });
});

describe("every rendered message", () => {
  it.each(EVERY_MESSAGE)("$name carries the lockup and at most one decorative 3D mark", ({ message }) => {
    const images = message.html.match(/<img\b[^>]*>/g) ?? [];
    expect(images[0]).toContain(LOCKUP_PATH);
    const marks = images.slice(1);
    expect(marks.length).toBeLessThanOrEqual(1);
    for (const mark of marks) {
      // From the site origin, as a PNG that exists.
      const src = /\bsrc="([^"]+)"/.exec(mark)?.[1] ?? "";
      expect(src.startsWith(`${siteUrl()}/brand/3d/email/`)).toBe(true);
      expect(src.endsWith(".png")).toBe(true);
      expect(existsSync(onDisk(src.slice(siteUrl().length)))).toBe(true);
      // Sized, so a blocked image keeps its box; decorative, so no words.
      expect(mark).toContain(`width="${EMAIL_ICON_SIZE}"`);
      expect(mark).toContain(`height="${EMAIL_ICON_SIZE}"`);
      expect(mark).toContain('alt=""');
      expect(mark).toContain('border="0"');
      expect(mark).toContain("display:block");
      // Above the headline, never after it.
      const h1 = message.html.indexOf("<h1");
      expect(h1).toBeGreaterThan(-1);
      expect(message.html.indexOf(mark)).toBeLessThan(h1);
    }
  });

  it("gives most messages a mark today", () => {
    const withMark = EVERY_MESSAGE.filter(({ message }) => (message.html.match(/<img\b/g) ?? []).length === 2);
    expect(withMark.length).toBeGreaterThan(EVERY_MESSAGE.length / 2);
  });

  it.each(EVERY_MESSAGE)("$name keeps its inbox line first", ({ message }) => {
    // The preheader stays the first thing in the body: the mark sits in the
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
    expect(mark).toContain(`width="${EMAIL_ICON_SIZE}"`);
    expect(mark).toContain('alt=""');
  });
});
