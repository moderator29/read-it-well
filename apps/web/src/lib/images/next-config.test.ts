/**
 * DOC-P2-02: `next.config.ts` compiles a different config depending on
 * NEXT_PUBLIC_SUPABASE_URL, so the config production gets is pinned here
 * rather than trusted to whichever env a build happened to run with.
 *
 *   - URL set    -> the Supabase storage host is in `images.remotePatterns`
 *   - URL absent -> it is not, and the config still loads (seed-catalogue build)
 *   - URL set but unusable -> loading the config THROWS, so a typo in the
 *     deploy's variable is a red build rather than a silently shorter allowlist.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

type RemotePattern = { protocol?: string; hostname: string; pathname?: string };

async function loadConfig(url: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url as string);
  const mod = await import("../../../next.config");
  return mod.default as { images?: { remotePatterns?: RemotePattern[] } };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("next.config images.remotePatterns follows NEXT_PUBLIC_SUPABASE_URL", () => {
  it("allows the project's public storage path when the URL is set", async () => {
    const config = await loadConfig("https://uccixoonmbhrnyczyigt.supabase.co");
    expect(config.images?.remotePatterns).toContainEqual({
      protocol: "https",
      hostname: "uccixoonmbhrnyczyigt.supabase.co",
      pathname: "/storage/v1/object/public/**",
    });
  });

  it("keeps working, without a Supabase entry, when the URL is absent", async () => {
    const config = await loadConfig("");
    const hosts = (config.images?.remotePatterns ?? []).map((p) => p.hostname);
    expect(hosts).toContain("images.unsplash.com");
    expect(hosts.some((h) => h.endsWith("supabase.co"))).toBe(false);
  });

  it("tolerates surrounding whitespace pasted into the variable", async () => {
    const config = await loadConfig("  https://uccixoonmbhrnyczyigt.supabase.co/ \n");
    const hosts = (config.images?.remotePatterns ?? []).map((p) => p.hostname);
    expect(hosts).toContain("uccixoonmbhrnyczyigt.supabase.co");
  });

  it("fails the build on a value that is set but is not a URL", async () => {
    await expect(loadConfig("uccixoonmbhrnyczyigt.supabase.co")).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL is set but is not a URL/);
  });

  it("fails the build on a plain-http project URL", async () => {
    await expect(loadConfig("http://uccixoonmbhrnyczyigt.supabase.co")).rejects.toThrow(/must be https/);
  });
});
