import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * OPS-11: the landing's catalogue is read once per five minutes per
 * instance, through a client with no session.
 */
const seam = vi.hoisted(() => ({ reads: 0, clients: [] as unknown[], sessionless: [] as boolean[] }));

vi.mock("server-only", () => ({}));
vi.mock("../supabase/env", () => ({
  isSupabaseConfigured: () => true,
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon",
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, _key: string, options: { auth?: { persistSession?: boolean } }) => {
    seam.sessionless.push(options?.auth?.persistSession === false);
    return { anon: true };
  },
}));
vi.mock("./supabase-repository", () => ({
  SupabaseListingRepository: class {
    constructor(private readonly connect: () => Promise<unknown>) {}
    async recommended() {
      seam.clients.push(await this.connect());
      seam.reads += 1;
      return [{ id: "f" }];
    }
    async search() {
      seam.reads += 1;
      return [{ id: "a" }, { id: "b" }];
    }
  },
}));

const { landingCatalogue, clearLandingCatalogue } = await import("./landing-catalogue");

describe("the landing's shared catalogue read", () => {
  beforeEach(() => {
    clearLandingCatalogue();
    seam.reads = 0;
    seam.clients = [];
    seam.sessionless = [];
  });

  it("reads once and serves every visitor from that read", async () => {
    const first = await landingCatalogue();
    const second = await landingCatalogue();
    expect(first?.catalogue).toHaveLength(2);
    expect(second).toBe(first);
    expect(seam.reads).toBe(2);
  });

  it("reads through a client with no session, so it is what a stranger sees", async () => {
    await landingCatalogue();
    expect(seam.sessionless).toEqual([true]);
  });

  it("the landing page takes it, not a per-request read", async () => {
    const { readFileSync } = await import("node:fs");
    const body = readFileSync("src/components/site/landing/LandingBody.tsx", "utf8");
    expect(body).toContain("landingCatalogue()");
  });
});
