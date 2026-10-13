import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { RECENT_LISTINGS_KEY } from "./memory";
import { RECENT_FLAG_ATTRIBUTE, RECENT_FLAG_SCRIPT, RECENT_LISTINGS_STORAGE_KEY } from "./recent-flag";

/** Run the head script against a fake page, and say whether it marked the root. */
function marked(stored: string | null | "throws"): boolean {
  const attributes = new Set<string>();
  const sandbox = {
    localStorage: {
      getItem: () => {
        if (stored === "throws") throw new Error("storage refused");
        return stored;
      },
    },
    document: { documentElement: { setAttribute: (name: string) => attributes.add(name) } },
    JSON,
    Array,
  };
  runInNewContext(RECENT_FLAG_SCRIPT, sandbox);
  return attributes.has(RECENT_FLAG_ATTRIBUTE);
}

describe("the Recently viewed row holds its height open before it exists", () => {
  it("reads the very key the row reads", () => {
    expect(RECENT_LISTINGS_STORAGE_KEY).toBe(RECENT_LISTINGS_KEY);
    expect(RECENT_FLAG_SCRIPT).toContain(`'${RECENT_LISTINGS_KEY}'`);
  });

  it("marks the root only when the phone remembers a listing, and never throws", () => {
    expect(marked(JSON.stringify([{ id: "a", title: "A", place: "Lekki" }]))).toBe(true);
    expect(marked(null)).toBe(false);
    expect(marked("[]")).toBe(false);
    expect(marked("{}")).toBe(false);
    expect(marked("not json")).toBe(false);
    expect(marked("throws")).toBe(false);
  });

  it("is set in the head, before paint, with the page's nonce", () => {
    const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
    expect(layout).toContain("__html: RECENT_FLAG_SCRIPT");
    const at = layout.indexOf("__html: RECENT_FLAG_SCRIPT");
    expect(layout.slice(Math.max(0, at - 160), at)).toContain("nonce={nonce}");
  });

  it("the stylesheet reserves the row's height only when flagged, and the row always renders its slot", () => {
    const css = readFileSync(new URL("../../app/css/member-loop.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.nf-lookback-slot\s*\{\s*display:\s*none;/);
    expect(css).toMatch(/:root\[data-recent-listings\] \.nf-lookback-slot:not\(\[data-filled\]\):not\(\[data-empty\]\)\s*\{[^}]*min-height:/);
    const row = readFileSync(new URL("../../components/app/home/LookedAtRecently.tsx", import.meta.url), "utf8");
    expect(row).toContain('className="nf-lookback-slot"');
    expect(row).not.toMatch(/if \(entries\.length === 0\) return null/);
  });

  it("the store keeps the root's mark true while the app stays open", () => {
    const memory = readFileSync(new URL("./memory.ts", import.meta.url), "utf8");
    expect(memory).toContain("syncRecentFlag(readRecentListings().length)");
  });
});
