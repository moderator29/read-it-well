/**
 * THE CHAT HINTS, ON THE REAL `ThreadView` IN CHROMIUM: the one dismissible
 * card and the quick reply chips above a renter's composer.
 *
 * What is proved here, with the pure rules proved in `lib/messages/hints.test.ts`:
 *   - the renter on a listing thread sees the card and the chips;
 *   - the lister, a direct chat and a thread that already has a quick reply
 *     tray see none;
 *   - a question chip FILLS the composer with the sentence, appends to what is
 *     already typed, focuses the field, and sends nothing;
 *   - the visit chip is a link to `/listing/[id]/visit`;
 *   - dismissing the card hides it and writes the dismissal for that
 *     conversation only;
 *   - the card collapses while the composer has focus (the keyboard is open).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("app/css/threads.css", "app/css/motion.css");

const CONVERSATION = "00000000-0000-4000-8000-00000000c001";
const LISTING = "00000000-0000-4000-8000-00000000d001";

const MESSAGES = [
  { id: "a1", mine: true, body: "Hello, is the flat still available?", timeLabel: "10:24", imageUrl: null },
  { id: "a2", mine: false, body: "Yes it is.", timeLabel: "10:30", imageUrl: null },
];

type Options = {
  role?: "guest" | "host";
  context?: string;
  quick?: boolean;
  gaps?: string[];
  visitOpen?: boolean;
};

const entry = ({ role = "guest", context = "listing", quick = false, gaps = ["power", "water", "moveIn"], visitOpen = false }: Options = {}) => `
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { ThreadView } from "@/app/(app)/messages/[id]/ThreadView";
  const t = getDictionary("en");
  mount(
    <div style={{ height: 900, display: "flex", flexDirection: "column" }}>
      <ThreadView
        sheetCopy={{ unsafe: t.trustVisible.unsafe }}
        live={true}
        conversationId="${CONVERSATION}"
        meId="00000000-0000-4000-8000-000000000001"
        counterpartName="Ada Eze"
        counterpartTier="none"
        listing={null}
        inspected={false}
        context={{ kind: "${context}" }}
        role="${role}"
        threadCopy={t.threads}
        locale="en"
        messages={${JSON.stringify(MESSAGES)}}
        quickReplies={${quick ? JSON.stringify([{ key: "q", label: "A lister reply", text: "Yes." }]) : "[]"}}
        chatHints={{
          data: { gaps: ${JSON.stringify(gaps)}, visitOpen: ${visitOpen}, visitHref: "/listing/${LISTING}/visit" },
          copy: t.chatHints,
        }}
      />
    </div>,
  );
`;

const bubbles = (page: import("playwright-core").Page) => page.locator(".nf-msg").count();

describe.skipIf(!hasBrowser && !process.env.CI)("chat hints on the thread", () => {
  it("draws one card with the first gap and the chips for a renter on a listing thread", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const card = page.getByTestId("chat-hint");
      await card.waitFor();
      expect(await page.getByTestId("chat-hint").count()).toBe(1);
      expect(await card.getAttribute("data-hint")).toBe("power");
      expect(await card.textContent()).toContain("You may want to ask");
      expect(await card.textContent()).toContain("Ask about electricity and backup power");
      /* Up to three chips: the visit first, then the gaps in order. */
      const chips = page.locator("[data-testid^='chat-chip-']");
      expect(await chips.count()).toBe(3);
      expect(await chips.evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")))).toEqual([
        "chat-chip-visit",
        "chat-chip-power",
        "chat-chip-water",
      ]);
    } finally {
      await close();
    }
  });

  it("draws nothing for the lister, in a direct chat, or beside the lister's quick reply tray", async () => {
    for (const options of [{ role: "host" as const }, { context: "direct" }, { context: "reservation" }, { quick: true }]) {
      const { page, close } = await mountInBrowser({ entry: entry(options), css: CSS });
      try {
        await page.locator("#thread-input").waitFor();
        expect(await page.getByTestId("chat-hints").count(), JSON.stringify(options)).toBe(0);
      } finally {
        await close();
      }
    }
  });

  it("draws nothing when no gap is left and a visit is already open", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ gaps: [], visitOpen: true }), css: CSS });
    try {
      await page.locator("#thread-input").waitFor();
      expect(await page.getByTestId("chat-hints").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("a question chip fills the composer, keeps what was typed, focuses the field and sends nothing", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry(),
      css: CSS,
      /* The harness page is not a secure context, where `randomUUID` is absent. */
      init: `if (!crypto.randomUUID) crypto.randomUUID = () => "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2).padEnd(12, "0").slice(0, 12);`,
    });
    try {
      const field = page.locator("#thread-input");
      const before = await bubbles(page);
      await page.getByTestId("chat-chip-water").click();
      expect(await field.inputValue()).toBe(
        "Hello, where does the water come from, and is there a borehole or a tank? Thank you.",
      );
      expect(await field.evaluate((el) => document.activeElement === el)).toBe(true);
      /* A second chip adds to the draft rather than replacing it. */
      await page.getByTestId("chat-chip-power").click();
      expect(await field.inputValue()).toContain("where does the water come from");
      expect(await field.inputValue()).toContain("how many hours of electricity");
      /* The same chip twice adds its sentence once. */
      await page.getByTestId("chat-chip-power").click();
      const text = await field.inputValue();
      expect(text.split("how many hours of electricity").length).toBe(2);
      /* Nothing was sent: no new bubble, and no action reached the server. */
      expect(await bubbles(page)).toBe(before);
      const calls = await page.evaluate(() => ((window as unknown as { __calls?: unknown[][] }).__calls ?? []).map((c) => String(c[0])));
      expect(calls.filter((name) => /send|post|create/i.test(name))).toEqual([]);
      /* The sentence is editable: it is plain text in the field. */
      await field.fill("Hello, edited.");
      expect(await field.inputValue()).toBe("Hello, edited.");
      /* Only the person's own press of send puts a message in the thread. */
      await page.getByRole("button", { name: "Send message" }).click();
      await page.waitForFunction(() => ((window as unknown as { __calls?: unknown[][] }).__calls ?? []).some((c) => c[0] === "sendMessage"));
      const sent = await page.evaluate(() => ((window as unknown as { __calls?: [string, { body?: string }][] }).__calls ?? []).filter((c) => c[0] === "sendMessage").map((c) => c[1]?.body));
      expect(sent).toEqual(["Hello, edited."]);
    } finally {
      await close();
    }
  });

  it("the visit chip goes to the visit flow for this listing", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      const chip = page.getByTestId("chat-chip-visit");
      expect(await chip.getAttribute("href")).toBe(`/listing/${LISTING}/visit`);
      expect((await chip.textContent())?.trim()).toBe("Schedule a visit");
    } finally {
      await close();
    }
  });

  it("offers no visit chip when a visit is open", async () => {
    const { page, close } = await mountInBrowser({ entry: entry({ visitOpen: true }), css: CSS });
    try {
      await page.getByTestId("chat-chip-power").waitFor();
      expect(await page.getByTestId("chat-chip-visit").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("dismissing hides the card, remembers it for this conversation only, and keeps the chips", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await page.getByTestId("chat-hint").waitFor();
      await page.getByTestId("chat-hint-dismiss").click();
      expect(await page.getByTestId("chat-hint").count()).toBe(0);
      expect(await page.locator("[data-testid^='chat-chip-']").count()).toBe(3);
      const stored = await page.evaluate(() => ({
        mine: window.localStorage.getItem("vallo_chat_hints_dismissed:00000000-0000-4000-8000-00000000c001"),
        other: window.localStorage.getItem("vallo_chat_hints_dismissed:00000000-0000-4000-8000-00000000c002"),
      }));
      expect(JSON.parse(stored.mine ?? "[]")).toEqual(["power"]);
      expect(stored.other).toBeNull();
    } finally {
      await close();
    }
  });

  it("does not draw a hint that was dismissed before, and shows the next one instead", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry(),
      css: CSS,
      init: `window.localStorage.setItem("vallo_chat_hints_dismissed:${CONVERSATION}", JSON.stringify(["power"]));`,
    });
    try {
      const card = page.getByTestId("chat-hint");
      await card.waitFor();
      expect(await card.getAttribute("data-hint")).toBe("water");
    } finally {
      await close();
    }
  });

  it("still works when storage throws", async () => {
    const { page, close } = await mountInBrowser({
      entry: entry(),
      css: CSS,
      init: `Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });`,
    });
    try {
      await page.getByTestId("chat-hint").waitFor();
      await page.getByTestId("chat-hint-dismiss").click();
      expect(await page.getByTestId("chat-hint").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("collapses the card while the composer has focus, and brings it back when it loses it", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(), css: CSS });
    try {
      await page.getByTestId("chat-hint").waitFor();
      await page.locator("#thread-input").focus();
      await page.getByTestId("chat-hint").waitFor({ state: "detached" });
      /* The chips stay: they are one 44px row. */
      expect(await page.getByTestId("chat-chip-power").count()).toBe(1);
      await page.locator("#thread-input").blur();
      await page.getByTestId("chat-hint").waitFor();
    } finally {
      await close();
    }
  });
});
