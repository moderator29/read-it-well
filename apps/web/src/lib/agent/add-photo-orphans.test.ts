import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A refused photo attach removes the object the browser already uploaded to
 * the public bucket, and never removes an object a photo row still names.
 */

const LISTING_ID = "3b0f1b0e-6f5a-4d1e-9b77-1c2d3e4f5a6b";
const OTHER_LISTING = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const PATH = `user-1/${LISTING_ID}/1f2e3d4c.jpg`;

const state = vi.hoisted(() => ({
  status: "DRAFT" as string,
  positions: [] as number[],
  attached: [] as { id: string }[],
  insertError: null as null | { code: string },
  objects: [] as { name: string; metadata: Record<string, unknown> }[],
  removed: [] as string[][],
  buckets: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../photo-hash/hash-server", () => ({ hashListingPhotos: vi.fn() }));
vi.mock("../images/scrub", () => ({
  SCRUB_REFUSED_MESSAGE: "scrub refused",
  scrubPublicPhoto: vi.fn(async () => ({ ok: true })),
}));

function chain(resolveData: () => unknown, single?: () => unknown) {
  const c: Record<string, unknown> = {};
  let byPath = false;
  for (const step of ["select", "in", "order"]) c[step] = () => c;
  c.eq = (column: string) => {
    if (column === "storage_path") byPath = true;
    return c;
  };
  c.limit = () => c;
  c.maybeSingle = async () => ({ data: single ? single() : resolveData(), error: null });
  c.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: byPath ? state.attached : resolveData(), error: null }).then(resolve);
  return c;
}

vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "user-1" },
    supabase: {
      from: (table: string) => {
        if (table === "agents") return chain(() => ({ id: "agent-1" }));
        if (table === "listings") return chain(() => ({ id: LISTING_ID, status: state.status }));
        if (table === "listing_photos") {
          const c = chain(() => state.positions.map((position, i) => ({ id: `p${i}`, position })));
          c.insert = () => ({
            select: () => ({
              single: async () =>
                state.insertError
                  ? { data: null, error: state.insertError }
                  : { data: { id: "new-photo", position: state.positions.length }, error: null },
            }),
          });
          return c;
        }
        return chain(() => null);
      },
      storage: {
        from: (bucket: string) => ({
          list: async () => ({ data: state.objects, error: null }),
          remove: async (paths: string[]) => {
            state.removed.push(paths);
            state.buckets.push(bucket);
            return { data: null, error: null };
          },
        }),
      },
    },
  }),
}));

const { addPhoto, addVideo } = await import("./listings-actions");

beforeEach(() => {
  state.status = "DRAFT";
  state.positions = [];
  state.attached = [];
  state.insertError = null;
  state.objects = [{ name: "1f2e3d4c.jpg", metadata: { size: 200_000, mimetype: "image/jpeg" } }];
  state.removed = [];
  state.buckets = [];
});

describe("addPhoto on refusal", () => {
  it("attaches a good photo and removes nothing", async () => {
    const result = await addPhoto({ listingId: LISTING_ID, storagePath: PATH, position: 0 });
    expect(result.ok).toBe(true);
    expect(state.removed).toEqual([]);
  });

  it("removes the uploaded object when the listing has gone to review", async () => {
    state.status = "SUBMITTED";
    const result = await addPhoto({ listingId: LISTING_ID, storagePath: PATH });
    expect(result.ok).toBe(false);
    expect(state.removed).toEqual([[PATH]]);
  });

  it("removes the uploaded object at the ten photo ceiling", async () => {
    state.positions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const result = await addPhoto({ listingId: LISTING_ID, storagePath: PATH });
    expect(result.ok).toBe(false);
    expect(state.removed).toEqual([[PATH]]);
  });

  it("removes the uploaded object when the row insert fails", async () => {
    state.insertError = { code: "57014" };
    const result = await addPhoto({ listingId: LISTING_ID, storagePath: PATH });
    expect(result.ok).toBe(false);
    expect(state.removed).toEqual([[PATH]]);
  });

  it("never removes an object a photo row still names", async () => {
    state.status = "SUBMITTED";
    state.attached = [{ id: "existing" }];
    await addPhoto({ listingId: LISTING_ID, storagePath: PATH });
    expect(state.removed).toEqual([]);
  });

  it("never removes an object outside this listing's own folder", async () => {
    state.status = "SUBMITTED";
    await addPhoto({ listingId: LISTING_ID, storagePath: `user-1/${OTHER_LISTING}/1f2e3d4c.jpg` });
    expect(state.removed).toEqual([]);
  });
});

describe("addVideo on refusal", () => {
  const VIDEO = `user-1/${LISTING_ID}/walk.mp4`;
  const POSTER = `user-1/${LISTING_ID}/walk-poster.jpg`;

  it("removes the uploaded walkthrough and its still when the listing has gone to review", async () => {
    state.status = "SUBMITTED";
    const result = await addVideo({ listingId: LISTING_ID, storagePath: VIDEO, posterPath: POSTER });
    expect(result.ok).toBe(false);
    expect(state.removed).toEqual([[VIDEO], [POSTER]]);
    expect(state.buckets).toEqual(["listing-videos", "listing-photos"]);
  });

  it("refuses a still outside the caller's own folder without touching anything", async () => {
    const result = await addVideo({ listingId: LISTING_ID, storagePath: VIDEO, posterPath: `user-2/${LISTING_ID}/x.jpg` });
    expect(result.ok).toBe(false);
    expect(state.removed).toEqual([]);
  });
});
