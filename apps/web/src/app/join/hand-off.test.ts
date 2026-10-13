import { describe, expect, it } from "vitest";
import { INVITE_COOKIE } from "@/lib/referral/code";
import { inviteHandOff } from "./hand-off";

const at = (path: string) => new Request(`https://vallo.test${path}`);

describe("an invite link goes through the one onboarding (7 October 2026)", () => {
  it("keeps a well formed code in a first-party cookie and hands over to the sign-up door", () => {
    const res = inviteHandOff(at("/join/k7m2qx"), "k7m2qx");
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/sign-up");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const cookie = res.cookies.get(INVITE_COOKIE);
    expect(cookie?.value).toBe("K7M2QX");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });

  it("drops a code that is not one, and still reaches sign-up", () => {
    const res = inviteHandOff(at("/join/nope"), "nope");
    expect(new URL(res.headers.get("location")!).pathname).toBe("/sign-up");
    expect(res.cookies.get(INVITE_COOKIE)).toBeUndefined();
  });

  it("renders no get-started screen of its own: the link is a route, not a page", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), "src", "app", "join", "[code]");
    expect(existsSync(join(dir, "page.tsx"))).toBe(false);
    expect(existsSync(join(dir, "route.ts"))).toBe(true);
  });
});
