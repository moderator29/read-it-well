import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ingestList } from "./ingest";
import { configuredSources, uploadSource, urlSource } from "./sources";

const UN = readFileSync(join(__dirname, "fixtures", "un-consolidated.fixture.xml"), "utf8");
const NG = readFileSync(join(__dirname, "fixtures", "nigeria-sanctions.fixture.csv"), "utf8");

/* A recorded fake of the service-role client: versions and entries in memory. */
function fakeAdmin() {
  const versions: { id: string; source: string; sha256: string; activated_at: string | null; entry_count?: number }[] = [];
  const entries: Record<string, unknown>[] = [];
  const chain = (table: string) => {
    const filters: Record<string, unknown> = {};
    let op: "select" | "insert" | "update" | "upsert" = "select";
    let payload: unknown = null;
    const api: Record<string, unknown> = {
      select: () => api,
      eq: (k: string, v: unknown) => ((filters[k] = v), api),
      is: () => api,
      insert: (p: unknown) => ((op = "insert"), (payload = p), api),
      update: (p: unknown) => ((op = "update"), (payload = p), api),
      upsert: (p: unknown) => ((op = "upsert"), (payload = p), api),
      maybeSingle: async () => ({ data: versions.find((v) => v.source === filters.source && v.sha256 === filters.sha256) ?? null, error: null }),
      single: async () => {
        const row = { id: `v${versions.length + 1}`, activated_at: null, ...(payload as object) } as (typeof versions)[number];
        versions.push(row);
        return { data: row, error: null };
      },
      then: (resolve: (v: unknown) => void) => {
        if (table === "sanctions_entries" && op === "upsert") entries.push(...(payload as Record<string, unknown>[]));
        if (table === "sanctions_list_versions" && op === "update") Object.assign(versions.find((v) => v.id === filters.id)!, payload);
        resolve({ data: null, error: null });
      },
    };
    return api;
  };
  return { admin: { from: chain }, versions, entries };
}

describe("loading a list version (SCUML items 8 and 9)", () => {
  it("loads the UN fixture through an upload, activates it, and changes nothing the second time", async () => {
    const { admin, versions, entries } = fakeAdmin();
    expect(await ingestList(admin, uploadSource("un", UN), "staff-1")).toEqual({ state: "loaded", versionId: "v1", entries: 3 });
    expect(versions[0]).toMatchObject({ source: "un", origin: "upload", loaded_by: "staff-1", entry_count: 3 });
    expect(versions[0]!.activated_at).not.toBeNull();
    expect(entries.map((e) => e.reference)).toEqual(["FXi.001", "FXi.002", "FXe.001"]);
    expect(await ingestList(admin, uploadSource("un", UN))).toEqual({ state: "same" });
    expect(versions).toHaveLength(1);
  });

  it("loads the Nigeria fixture through the URL source, with no live fetch", async () => {
    const { admin, versions } = fakeAdmin();
    const fakeFetch = (async () => new Response(NG, { status: 200 })) as unknown as typeof fetch;
    expect(await ingestList(admin, urlSource("ng", "https://lists.example/ng.csv", fakeFetch))).toMatchObject({ state: "loaded", entries: 2 });
    expect(versions[0]).toMatchObject({ source: "ng", origin: "url" });
  });

  it("refuses a file that is not its list, and fails on an unreadable URL, writing nothing", async () => {
    const { admin, versions } = fakeAdmin();
    expect(await ingestList(admin, uploadSource("un", NG))).toEqual({ state: "refused", reason: "not_un_consolidated_list" });
    const down = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    expect(await ingestList(admin, urlSource("un", "https://lists.example/un.xml", down))).toEqual({ state: "failed", reason: "unreadable" });
    expect(versions).toHaveLength(0);
  });

  it("configures a URL source only for an https URL that is set", () => {
    expect(configuredSources({})).toEqual([]);
    expect(configuredSources({ SANCTIONS_UN_URL: "http://insecure" })).toEqual([]);
    expect(configuredSources({ SANCTIONS_UN_URL: "https://un.example/list.xml" }).map((s) => [s.source, s.origin])).toEqual([["un", "url"]]);
  });
});
