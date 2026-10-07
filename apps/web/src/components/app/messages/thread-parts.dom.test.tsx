/**
 * The thread's small parts, mounted for real in Chromium on the product's own
 * thread stylesheet: the attachment row, the quoted reply and the day and unread
 * dividers. The rule they share (north star 15.4) is that each is drawn only
 * from a real row: a missing size is simply absent, a missing name falls back
 * to the type's WORD and never to a made-up file name, a quote whose message is
 * gone says so instead of guessing at its words, and a divider carries its
 * label or its count in words rather than in colour.
 *
 * Fixtures are slot names and the real dictionary; the only numbers are a byte
 * count (a measurement the row would hold) and unread counts of one and
 * several, which is what the plural rule is about.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { axeViolations } from "@/components/ui/ported-test-css";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("app/css/threads.css");

/* A click that records where it would have gone, so the page never leaves. */
const TRAP_LINKS = `
  window.__opened = [];
  document.addEventListener("click", (event) => {
    const a = event.target.closest && event.target.closest("a");
    if (a) { event.preventDefault(); window.__opened.push(a.getAttribute("href")); }
  }, true);
`;
const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

/* ---------------------------------------------------------- AttachmentRow */

type Attach = { url: string; name?: string | null; mime?: string | null; bytes?: number | null };

function attachEntry(rows: Attach[]): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { AttachmentRow } from "@/components/app/messages/AttachmentRow";
    import { mount } from "@/lib/testing/browser-root";
    const copy = getDictionary("en").experienceInbox.thread.attachment;
    mount(
      <div style={{ width: 360, padding: 16, display: "grid", gap: 8 }}>
        {${JSON.stringify(rows)}.map((row, i) => <AttachmentRow key={i} {...row} copy={copy} />)}
      </div>,
    );
  `;
}

describe.skipIf(!hasBrowser && !process.env.CI)("an attachment row", () => {
  it("is one link that opens the file in its own tab, named for what it opens, a 44px Plate with one hairline", async () => {
    const { page, close } = await mountInBrowser({
      entry: attachEntry([{ url: "/files/a-file-slot", name: "A file name slot.pdf", mime: "application/pdf", bytes: 2_000_000 }]),
      css: CSS,
      init: TRAP_LINKS,
    });
    try {
      const row = page.getByTestId("attachment-row");
      expect(await row.count()).toBe(1);
      expect(await row.getAttribute("href")).toBe("/files/a-file-slot");
      expect(await row.getAttribute("target")).toBe("_blank");
      expect(await row.getAttribute("rel")).toBe("noopener noreferrer");
      expect(await row.getAttribute("aria-label")).toBe("Open A file name slot.pdf 2 MB");
      expect(await page.getByRole("link", { name: "Open A file name slot.pdf 2 MB" }).count()).toBe(1);
      expect(await row.getAttribute("data-kind")).toBe("pdf");
      /* Name, then the size as people write it. */
      expect(await row.locator(".nf-attach__name").textContent()).toBe("A file name slot.pdf");
      expect(await row.locator(".nf-attach__size").textContent()).toBe("2 MB");
      /* The shape: Plate radius 14, one hairline, a 44px target. */
      const style = await row.evaluate((el) => {
        const s = getComputedStyle(el);
        return { radius: s.borderTopLeftRadius, border: s.borderTopWidth, h: el.getBoundingClientRect().height };
      });
      expect(style.radius).toBe("14px");
      expect(style.border).toBe("1px");
      expect(style.h).toBeGreaterThanOrEqual(44);
      /* The glyph is decoration; the row is named by its label. */
      expect(await row.locator(".nf-attach__glyph").getAttribute("aria-hidden")).toBe("true");
      /* Keyboard: it is a plain link, so Enter follows it. */
      await row.focus();
      await page.keyboard.press("Enter");
      expect(await opened(page)).toEqual(["/files/a-file-slot"]);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("falls back to the type's word, never a made-up file name, and draws no size it was not given", async () => {
    const { page, close } = await mountInBrowser({
      entry: attachEntry([
        { url: "/files/one", mime: "application/pdf" },
        { url: "/files/two", mime: "audio/ogg", name: "   ", bytes: null },
        { url: "/files/three", mime: "image/jpeg", name: null },
        { url: "/files/four", name: null, mime: null },
      ]),
      css: CSS,
    });
    try {
      const rows = page.getByTestId("attachment-row");
      expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-kind")))).toEqual(["pdf", "voice", "photo", "file"]);
      /* The word of the kind: a PDF and an unknown type are both just a file. */
      expect(await rows.locator(".nf-attach__name").allTextContents()).toEqual(["File", "Voice note", "Photo", "File"]);
      expect(await rows.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")))).toEqual([
        "Open File",
        "Open Voice note",
        "Open Photo",
        "Open File",
      ]);
      expect(await page.locator(".nf-attach__size").count()).toBe(0);
      /* Each kind draws its own glyph. */
      expect(await rows.evaluateAll((els) => els.map((el) => el.querySelectorAll(".nf-attach__glyph svg").length))).toEqual([1, 1, 1, 1]);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("keeps a very long name on one line and inside the row", async () => {
    const { page, close } = await mountInBrowser({
      entry: attachEntry([{ url: "/files/long", name: `${"A long file name slot ".repeat(12)}.docx`, mime: "application/pdf", bytes: 2_000_000 }]),
      css: CSS,
    });
    try {
      const fit = await page.getByTestId("attachment-row").evaluate((el) => {
        const name = el.querySelector(".nf-attach__name") as HTMLElement;
        return {
          rowInside: el.getBoundingClientRect().right <= 360 + 16,
          ellipsed: name.scrollWidth > name.clientWidth,
          oneLine: getComputedStyle(name).whiteSpace === "nowrap",
        };
      });
      expect(fit).toEqual({ rowInside: true, ellipsed: true, oneLine: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      await close();
    }
  });
});

/* ------------------------------------------------------------ QuotedReply */

type Quoted = { id: string; name: string | null; text: string; kind: "text" | "photo" | "voice" | "file" } | null;

function quoteEntry(quoted: Quoted, jump: boolean): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { QuotedReply } from "@/components/app/messages/QuotedReply";
    import { mount } from "@/lib/testing/browser-root";
    const copy = getDictionary("en").experienceInbox.thread.quoted;
    window.__jumps = [];
    mount(
      <div style={{ width: 320, padding: 16 }}>
        <QuotedReply quoted={${JSON.stringify(quoted)}} copy={copy} ${jump ? "onJump={(id) => window.__jumps.push(id)}" : ""} />
      </div>,
    );
  `;
}
const jumps = (page: Page) => page.evaluate(() => (window as unknown as { __jumps: string[] }).__jumps);

describe.skipIf(!hasBrowser && !process.env.CI)("a quoted reply", () => {
  it("says who said it and the words, and reports a tap with the quoted message's id", async () => {
    const { page, close } = await mountInBrowser({
      entry: quoteEntry({ id: "m-slot", name: "Counterpart slot", text: "The quoted words, slot", kind: "text" }, true),
      css: CSS,
    });
    try {
      const quote = page.getByTestId("quoted-reply");
      expect(await quote.evaluate((el) => el.tagName)).toBe("BUTTON");
      expect(await quote.locator(".nf-quote__who").textContent()).toBe("Replying to Counterpart slot");
      expect(await quote.locator(".nf-quote__text").textContent()).toBe("The quoted words, slot");
      expect((await quote.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await quote.click();
      expect(await jumps(page)).toEqual(["m-slot"]);
      /* From the keyboard too, with both Enter and Space. */
      await quote.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      expect(await jumps(page)).toEqual(["m-slot", "m-slot", "m-slot"]);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("names the reader as You when the quoted message is their own, with no name drawn", async () => {
    const { page, close } = await mountInBrowser({
      entry: quoteEntry({ id: "m-slot", name: null, text: "The quoted words, slot", kind: "text" }, true),
      css: CSS,
    });
    try {
      expect(await page.locator(".nf-quote__who").textContent()).toBe("You");
    } finally {
      await close();
    }
  });

  it("names a photo, a voice note or a file by its kind, never by an invented caption", async () => {
    for (const [kind, word] of [
      ["photo", "Photo"],
      ["voice", "Voice note"],
      ["file", "Attachment"],
    ] as const) {
      const { page, close } = await mountInBrowser({ entry: quoteEntry({ id: "m-slot", name: null, text: "  ", kind }, false), css: CSS });
      try {
        expect(await page.locator(".nf-quote__text").textContent(), kind).toBe(word);
      } finally {
        await close();
      }
    }
    /* A text message with no words has nothing to quote: an empty line, not a guess. */
    const { page, close } = await mountInBrowser({ entry: quoteEntry({ id: "m-slot", name: null, text: "", kind: "text" }, false), css: CSS });
    try {
      expect(await page.locator(".nf-quote__text").textContent()).toBe("");
    } finally {
      await close();
    }
  });

  it("says the message is gone, and is not a link, when the quoted message is not in the thread", async () => {
    const { page, close } = await mountInBrowser({ entry: quoteEntry(null, true), css: CSS });
    try {
      const quote = page.getByTestId("quoted-reply");
      expect(await quote.textContent()).toBe("The message you replied to is no longer here");
      expect(await quote.evaluate((el) => el.tagName)).toBe("P");
      expect(await page.locator("button, a, [tabindex]").count()).toBe(0);
      await quote.click();
      expect(await jumps(page)).toEqual([]);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("is not a button when nothing can be jumped to, and keeps to two lines of long words", async () => {
    const long = "A quoted word, slot ".repeat(40);
    const { page, close } = await mountInBrowser({ entry: quoteEntry({ id: "m-slot", name: null, text: long, kind: "text" }, false), css: CSS });
    try {
      const quote = page.getByTestId("quoted-reply");
      expect(await quote.evaluate((el) => el.tagName)).toBe("DIV");
      expect(await page.locator("button").count()).toBe(0);
      const text = page.locator(".nf-quote__text");
      const lines = await text.evaluate((el) => {
        const s = getComputedStyle(el);
        /* One line of this very text, measured, rather than trusting "normal". */
        const one = el.cloneNode(false) as HTMLElement;
        one.textContent = "x";
        one.style.display = "block";
        one.style.setProperty("-webkit-line-clamp", "none");
        el.parentElement!.append(one);
        const line = one.getBoundingClientRect().height;
        one.remove();
        return { clamp: s.webkitLineClamp, shown: Math.round(el.clientHeight / line), overflowing: el.scrollHeight > el.clientHeight };
      });
      expect(lines).toEqual({ clamp: "2", shown: 2, overflowing: true });
    } finally {
      await close();
    }
  });
});

/* -------------------------------------------------------------- dividers */

function dividerEntry(count: number): string {
  return `
    import { getDictionary } from "@vallo/i18n";
    import { DayDivider, UnreadDivider } from "@/components/app/messages/ThreadDividers";
    import { mount } from "@/lib/testing/browser-root";
    const copy = getDictionary("en").experienceInbox.thread;
    mount(
      <div style={{ width: 340, padding: 16 }}>
        <DayDivider label={copy.day.today} />
        <UnreadDivider count={${count}} copy={copy.unreadDivider} locale="en" />
      </div>,
    );
  `;
}

describe.skipIf(!hasBrowser && !process.env.CI)("the thread's dividers", () => {
  it("names the day as a separator with a label, drawn once, flanked by hairlines", async () => {
    const { page, close } = await mountInBrowser({ entry: dividerEntry(1), css: CSS });
    try {
      const day = page.getByRole("separator", { name: "Today" });
      expect(await day.count()).toBe(1);
      /* A screen reader meets the label once: the visible text is hidden from it. */
      expect(await day.locator("span").getAttribute("aria-hidden")).toBe("true");
      expect(await day.locator("span").textContent()).toBe("Today");
      for (const which of ["::before", "::after"]) {
        const rule = await day.evaluate((el, w) => {
          const s = getComputedStyle(el, w);
          return { content: s.content, height: s.height };
        }, which);
        expect(rule).toEqual({ content: '""', height: "1px" });
      }
    } finally {
      await close();
    }
  });

  it("says the unread count in words, with the right plural, as a status the thread can scroll to", async () => {
    for (const [count, words] of [
      [1, "1 unread message"],
      [3, "3 unread messages"],
    ] as const) {
      const { page, close } = await mountInBrowser({ entry: dividerEntry(count), css: CSS });
      try {
        const unread = page.getByRole("status");
        expect(await unread.count()).toBe(1);
        expect(await unread.textContent()).toBe(words);
        expect(await unread.getAttribute("id")).toBe("thread-unread-divider");
        expect(await page.getByTestId("unread-divider").count()).toBe(1);
      } finally {
        await close();
      }
    }
  });

  it("draws the count in the count colour, never red, and never by colour alone", async () => {
    const { page, close } = await mountInBrowser({ entry: dividerEntry(3), css: CSS });
    try {
      const probe = await page.evaluate(() => {
        const text = document.querySelector("[data-testid=unread-divider] > span") as HTMLElement;
        const make = (token: string) => {
          const el = document.createElement("i");
          el.style.background = `var(${token})`;
          document.body.append(el);
          const value = getComputedStyle(el).backgroundColor;
          el.remove();
          return value;
        };
        return {
          fill: getComputedStyle(text).backgroundColor,
          count: make("--nf-count-fill"),
          error: make("--nf-state-error"),
          words: text.textContent,
        };
      });
      expect(probe.fill).toBe(probe.count);
      expect(probe.fill).not.toBe(probe.error);
      expect(probe.words).toBe("3 unread messages");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("has no motion of its own, so reduced motion changes nothing about it", async () => {
    const { page, close } = await mountInBrowser({ entry: dividerEntry(3), css: CSS, reducedMotion: true });
    try {
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      const moving = await page
        .locator("[data-testid=day-divider], [data-testid=unread-divider]")
        .evaluateAll((els) => els.some((el) => getComputedStyle(el).transitionDuration !== "0s" || getComputedStyle(el).animationName !== "none"));
      expect(moving).toBe(false);
    } finally {
      await close();
    }
  });
});
