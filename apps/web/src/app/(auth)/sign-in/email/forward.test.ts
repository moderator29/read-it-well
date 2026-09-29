import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

/** B-1: the old second step forwards to the one sign-in screen. */
describe("/sign-in/email", () => {
  async function landing(params: Record<string, string | string[] | undefined>): Promise<string> {
    const { default: Page } = await import("./page");
    try {
      await Page({ searchParams: Promise.resolve(params) });
    } catch (error) {
      return String((error as Error).message).replace(/^REDIRECT:/, "");
    }
    throw new Error("the page did not redirect");
  }

  it("goes to /sign-in with nothing when nothing was carried", async () => {
    expect(await landing({})).toBe("/sign-in");
  });

  it("carries next, email and notice, and marks first run as passed", async () => {
    const to = new URL(await landing({ next: "/wallet", email: "ada@example.com", notice: "signed-out" }), "http://x");
    expect(to.pathname).toBe("/sign-in");
    expect(to.searchParams.get("next")).toBe("/wallet");
    expect(to.searchParams.get("email")).toBe("ada@example.com");
    expect(to.searchParams.get("notice")).toBe("signed-out");
    expect(to.searchParams.get("welcomed")).toBe("1");
  });

  it("drops anything else, and arrays", async () => {
    const to = new URL(await landing({ other: "x", next: ["/a", "/b"] }), "http://x");
    expect([...to.searchParams.keys()]).toEqual([]);
  });
});
