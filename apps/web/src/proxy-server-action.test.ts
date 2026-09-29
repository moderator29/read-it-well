import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

/**
 * SUP-04. On the supply form pages, a server action posted with a dead session
 * reaches the action, which refuses in its own envelope, instead of a redirect
 * to /sign-in that React cannot read and that replaced the form (and its
 * answers) with the route error boundary.
 *
 * Only there. A revalidating action renders the page at the posted address
 * into its response, so a signed-out action POST anywhere else gated still
 * bounces, and every page on the list is shown to check the session itself.
 */
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims: async () => ({ data: null, error: null }) } }),
}));

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
const { proxy, isServerActionRequest, SELF_GUARDING_FORM_PATHS } = await import("./proxy");

const ACTION = { "next-action": "7f00000000000000000000000000000000000000", "content-type": "text/plain" };

function send(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return proxy(new NextRequest(new URL(path, "https://www.vallospaces.com"), init));
}

const bounced = (response: Response) =>
  response.status === 307 && (response.headers.get("location") ?? "").includes("/sign-in");

const APP = join(process.cwd(), "src", "app");
const read = (file: string) => readFileSync(join(APP, file), "utf8");

/** Each listed page, and the line in its own source that checks the session. */
const PAGE_GUARD: Record<string, [file: string, guard: string]> = {
  "/profile/setup/owner": ["(app)/profile/setup/owner/page.tsx", 'await requireSignedInPage("/profile/setup/owner");'],
  "/profile/setup/agent": ["(app)/profile/setup/agent/page.tsx", 'await requireSignedInPage("/profile/setup/agent");'],
  "/profile/setup/professional": ["(app)/profile/setup/[role]/page.tsx", "await requireSignedInPage(`/profile/setup/${role}`);"],
  "/host/apply": ["host/apply/page.tsx", 'if (session.state !== "signed-in") {'],
  "/agent/list": ["agent/list/page.tsx", 'if (context.state === "signed-out" || context.state === "not-agent") {'],
};

describe("a signed-out server action on a form page (SUP-04)", () => {
  it.each([...SELF_GUARDING_FORM_PATHS])("%s: reaches the action instead of a redirect", async (path) => {
    const response = await send(path, { method: "POST", headers: ACTION });
    expect(bounced(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([...SELF_GUARDING_FORM_PATHS])("%s: the page checks the session itself", (path) => {
    const entry = PAGE_GUARD[path];
    expect(entry, `${path} is allowed through but has no guard on record`).toBeDefined();
    const [file, guard] = entry!;
    expect(read(file)).toContain(guard);
  });

  it("allows nothing through that has no guard on record", () => {
    expect([...SELF_GUARDING_FORM_PATHS].sort()).toEqual(Object.keys(PAGE_GUARD).sort());
  });

  it("the professional guard covers only the professional segment", () => {
    expect(read("(app)/profile/setup/[role]/page.tsx")).toContain('const SETUP_ROLES: readonly SetupRole[] = ["professional"]');
  });
});

describe("everywhere else, a signed-out server action is still sent to sign in", () => {
  it.each(["/listing/abc", "/home", "/messages", "/wallet", "/profile", "/profile/setup", "/profile/setup/owner/extra"])(
    "%s bounces",
    async (path) => {
      expect(bounced(await send(path, { method: "POST", headers: ACTION }))).toBe(true);
    },
  );

  it("still sends a signed-out page load of a form page to sign in", async () => {
    expect(bounced(await send("/profile/setup/owner"))).toBe(true);
  });

  it("does not treat a plain POST, or a GET carrying the header, as an action", async () => {
    expect(bounced(await send("/profile/setup/owner", { method: "POST" }))).toBe(true);
    expect(isServerActionRequest(new NextRequest("https://x.test/a", { headers: { "next-action": "1" } }))).toBe(false);
  });

  it("still answers a signed-out API call with 401", async () => {
    const response = await send("/api/push/register", { method: "POST", headers: ACTION });
    expect(response.status).toBe(401);
  });
});
