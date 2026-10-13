import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The six step professional application, against a fake client that records
 * every write. A second application while one is open is refused before
 * anything is written, and a document path is the caller's own folder and
 * nothing reached through it.
 */

const USER = "957b3bd2-cce3-425d-bba9-5cd876ca3d62";
type Call = { table: string; op: string; payload?: unknown };

const seam = vi.hoisted(() => ({
  calls: [] as Call[],
  open: null as { reference: string } | null,
}));

function fakeClient() {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: USER, email: "ada@example.com" } } }) },
    from(table: string) {
      const call: Call = { table, op: "select" };
      seam.calls.push(call);
      const result = () => {
        if (table === "agent_applications" && call.op === "select") return { data: seam.open, error: null };
        if (table === "agent_applications" && call.op === "insert") {
          return { data: { id: "app-1", reference: "VL-AGT-10021" }, error: null };
        }
        if (table === "states") return { data: { code: "LA" }, error: null };
        return { data: null, error: null };
      };
      const chain: Record<string, unknown> = {};
      chain.insert = (payload: unknown) => {
        call.op = "insert";
        call.payload = payload;
        return chain;
      };
      for (const op of ["select", "eq", "in", "order", "limit"] as const) chain[op] = () => chain;
      chain.maybeSingle = () => Promise.resolve(result());
      chain.single = () => Promise.resolve(result());
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve);
      return chain;
    },
  };
}

vi.mock("../supabase/server", () => ({ createClient: () => Promise.resolve(fakeClient()) }));
vi.mock("../supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("../actions/session", () => ({
  accountSetupOwed: () => Promise.resolve(false),
  SETUP_OWED_MESSAGE: "finish setting up",
}));

const { submitAgentApplication } = await import("./application");

function form(documents: { kind: string; path: string }[]): FormData {
  const data = new FormData();
  const fields: Record<string, string> = {
    agentType: "business",
    firstName: "Ada",
    lastName: "Obi",
    phone: "0803 123 4567",
    idType: "NIN",
    idNumber: "12345678901",
    businessName: "Obi Homes",
    rcNumber: "RC 123456",
    state: "Lagos",
    city: "Ikeja",
    address: "1 Allen Avenue",
    bankName: "Access Bank",
    accountNumber: "0123456789",
    accountName: "Ada Obi",
    agreeTerms: "on",
  };
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  data.set("documents", JSON.stringify(documents));
  return data;
}

const MANIFEST = [
  { kind: "idFront", path: `${USER}/b/idFront-1.jpg` },
  { kind: "idBack", path: `${USER}/b/idBack-1.jpg` },
  { kind: "registration", path: `${USER}/b/registration-1.pdf` },
];

const writes = () => seam.calls.filter((c) => c.op !== "select");

beforeEach(() => {
  seam.calls = [];
  seam.open = null;
});

describe("submitAgentApplication", () => {
  it("files the application and its documents", async () => {
    const result = await submitAgentApplication({ ok: false }, form(MANIFEST));
    expect(result.ok).toBe(true);
    expect(result.reference).toBe("VL-AGT-10021");
    expect(writes().map((c) => c.table)).toEqual(["agent_applications", "agent_documents"]);
  });

  it("refuses a second application while one is open, and writes nothing", async () => {
    seam.open = { reference: "VL-AGT-10019" };
    const result = await submitAgentApplication({ ok: false }, form(MANIFEST));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("VL-AGT-10019");
    expect(writes()).toEqual([]);
  });

  it("refuses a document path that climbs out of the caller's folder", async () => {
    const climbing = MANIFEST.map((doc) =>
      doc.kind === "idBack" ? { ...doc, path: `${USER}/../someone-else/idBack.jpg` } : doc,
    );
    const result = await submitAgentApplication({ ok: false }, form(climbing));
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.documents).toBeTruthy();
    expect(writes()).toEqual([]);
  });
});
