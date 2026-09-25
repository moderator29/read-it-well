import { beforeEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({ admin: true, ingested: 0, why: "upload" as string }));
vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: async () => (seam.admin ? { state: "admin", user: { id: "staff-1" } } : { state: "not-admin" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/site", () => ({ siteUrl: () => "https://www.vallospaces.com" }));
vi.mock("@/lib/supabase/service", () => ({ getAdminClient: () => ({}) }));
vi.mock("@/lib/compliance/sanctions/ingest", () => ({
  ingestList: async () => {
    seam.ingested += 1;
    return { state: "waiting", versionId: "v1", entries: 3, why: seam.why };
  },
}));

const upload = (origin: string | null, bytes = 10) => {
  const form = new FormData();
  form.set("source", "un");
  form.set("file", new File(["x".repeat(bytes)], "list.xml"));
  const request = new Request("https://www.vallospaces.com/api/compliance/sanctions-upload", { method: "POST", body: form });
  const headers = new Headers(request.headers);
  if (origin) headers.set("origin", origin);
  headers.set("content-length", String(bytes + 300));
  return new Request(request, { headers });
};

beforeEach(() => {
  seam.admin = true;
  seam.ingested = 0;
  seam.why = "upload";
});

describe("POST /api/compliance/sanctions-upload (SCUML items 8, 9)", () => {
  it("refuses another site's origin, or none, before reading anything", async () => {
    const { POST } = await import("./route");
    expect((await POST(upload("https://evil.example"))).status).toBe(403);
    expect((await POST(upload(null))).status).toBe(403);
    expect(seam.ingested).toBe(0);
  });

  it("refuses a non-staff caller, and loads a staff upload inactive", async () => {
    const { POST } = await import("./route");
    seam.admin = false;
    expect((await POST(upload("https://www.vallospaces.com"))).status).toBe(403);
    seam.admin = true;
    const response = await POST(upload("https://www.vallospaces.com"));
    expect(await response.json()).toEqual({ ok: true, message: "waiting:3" });
    expect(seam.ingested).toBe(1);
  });

  it("answers incomplete, not waiting, for a file that cannot prove it is whole", async () => {
    const { POST } = await import("./route");
    seam.why = "unverified";
    const response = await POST(upload("https://www.vallospaces.com"));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, error: "incomplete" });
  });
});
