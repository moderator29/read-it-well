import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

/**
 * SUP-04. A server action posted with a dead session reaches the action, which
 * refuses in its own envelope, instead of being redirected to /sign-in, which
 * React cannot read and which replaced the form (and its answers) with the
 * route error boundary. A page load and an API call with no session are
 * refused exactly as before.
 */
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
const { proxy, isServerActionRequest } = await import("./proxy");

function send(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return proxy(new NextRequest(new URL(path, "https://www.vallospaces.com"), init));
}

const bounced = (response: Response) =>
  response.status === 307 && (response.headers.get("location") ?? "").includes("/sign-in");

describe("a server action with no session (SUP-04)", () => {
  it("reaches the action instead of a redirect to sign-in", async () => {
    const response = await send("/profile/setup/owner", {
      method: "POST",
      headers: { "next-action": "7f00000000000000000000000000000000000000", "content-type": "text/plain" },
    });
    expect(bounced(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("still sends a signed-out page load to sign in", async () => {
    expect(bounced(await send("/profile/setup/owner"))).toBe(true);
  });

  it("does not treat a plain POST, or a GET carrying the header, as an action", async () => {
    expect(bounced(await send("/profile/setup/owner", { method: "POST" }))).toBe(true);
    expect(isServerActionRequest(new NextRequest("https://x.test/a", { headers: { "next-action": "1" } }))).toBe(false);
  });

  it("still answers a signed-out API call with 401", async () => {
    const response = await send("/api/push/register", { method: "POST", headers: { "next-action": "1" } });
    expect(response.status).toBe(401);
  });
});
